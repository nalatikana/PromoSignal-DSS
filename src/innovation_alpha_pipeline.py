"""Innovation Alpha pipeline (TRL 5-6)

ใช้ Python ทำงานตามแผน:
1. รับ coefficients/model จากไฟล์ JSON ของระบบ หรือ CSV coefficients จาก STATA
2. อ่าน text สาธารณะของหุ้น SET100 รายไตรมาส แล้วคำนวณ promotion/prevention score
3. ผสมกับ board variables 4 ตัวหลักเพื่อสร้าง Innovation Alpha Score 0-100
4. ทำ quantitative backtest: ซื้อ Top 10 เทียบ SET Index
5. ส่งออก JSON สำหรับหน้าเว็บ หรืออัปเดต out/dss_model.json โดยตรง

ตัวอย่าง:
python src/innovation_alpha_pipeline.py \
  --text-csv data/set100_text.csv \
  --board-csv data/set100_board.csv \
  --returns-csv data/set100_returns.csv \
  --benchmark-csv data/set_index_returns.csv \
  --update-model
"""
from __future__ import annotations

import argparse
import copy
import csv
import json
import math
import statistics
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = ROOT / "out" / "dss_model.json"
DEFAULT_LEXICON = ROOT / "dss_api" / "lexicon.json"

BOARD_MAP = {
    "female_pct": ["female_pct", "pct_female_board"],
    "indep_pct": ["indep_pct", "board_independence"],
    "board_size": ["board_size"],
    "wa_board_tenure": ["wa_board_tenure", "board_tenure"],
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def num(row: dict[str, str], keys: list[str], default: float | None = None) -> float | None:
    for k in keys:
        v = row.get(k)
        if v not in (None, ""):
            return float(v)
    return default


def count_hits(text: str, words: list[str]) -> int:
    low = text.lower()
    return sum(low.count(w.lower()) for w in words)


def text_scores(text: str, lex: dict[str, Any], intensity: float) -> dict[str, float]:
    pro = count_hits(text, lex["promotion"]["th"] + lex["promotion"]["en"])
    pre = count_hits(text, lex["prevention"]["th"] + lex["prevention"]["en"])
    denom = pro + pre or 1
    ratio = (pro - pre) / denom
    return {
        "promotion": round(intensity * (1 + ratio) / 2, 4),
        "prevention": round(intensity * (1 - ratio) / 2, 4),
        "reg_focus_ratio": round(ratio, 4),
        "promotion_hits": pro,
        "prevention_hits": pre,
    }


def pct_of(v: float, arr: list[float]) -> float:
    if v <= arr[0]:
        return 0.0
    if v >= arr[-1]:
        return 100.0
    for i in range(1, len(arr)):
        if v <= arr[i]:
            span = arr[i] - arr[i - 1] or 1.0
            return (i - 1) + (v - arr[i - 1]) / span
    return 100.0


def score_with_model(model: dict[str, Any], row: dict[str, Any], engine_key: str) -> dict[str, float]:
    eng = model["engines"][engine_key]
    center = model["center"]
    lp = eng["intercept"]
    for term in eng["cov_order"]:
        if term == "Intercept":
            continue
        x = 1.0
        for part in term.split(":"):
            key = part[2:] if part.startswith("c_") else part
            x *= float(row.get(key, center.get(key, 0.0))) - center.get(key, 0.0)
        lp += eng["coef"][term] * x
    lp += eng["base_industry"].get(row.get("industry", ""), 0.0)
    lp += eng["base_year"].get(str(row.get("year", "")), 0.0)
    mu = math.exp(lp)
    pct = pct_of(mu, model["universe"][engine_key]["quantiles"])
    return {"model_signal": round(mu, 4), "innovation_alpha_score": round(pct, 1)}


def read_stata_coefficients(path: Path) -> dict[str, float]:
    """อ่าน coefficient CSV จาก STATA ถ้ามี

    รองรับ header: term,coef หรือ variable,coefficient
    ใช้สำหรับตรวจ/ส่งต่อใน output metadata; สูตรหลักยังใช้ model JSON เพื่อรักษา covariance/centering.
    """
    out = {}
    for row in read_csv(path):
        term = row.get("term") or row.get("variable") or row.get("var")
        coef = row.get("coef") or row.get("coefficient") or row.get("b")
        if term and coef not in (None, ""):
            out[term] = float(coef)
    return out


def apply_stata_coefficients(model: dict[str, Any], engine_key: str, coefficients: dict[str, float]) -> dict[str, Any]:
    """แทนค่าสัมประสิทธิ์ใน engine ด้วย CSV ที่ export จาก STATA."""
    eng = model["engines"][engine_key]
    applied: list[str] = []
    unknown: list[str] = []
    for term, coef in coefficients.items():
        clean = term.strip()
        low = clean.lower()
        if low in {"_cons", "cons", "constant", "intercept"}:
            eng["intercept"] = coef
            applied.append(clean)
        elif clean in eng["coef"]:
            eng["coef"][clean] = coef
            applied.append(clean)
        elif clean in eng["cov_order"] and clean != "Intercept":
            eng["coef"][clean] = coef
            applied.append(clean)
        else:
            unknown.append(clean)
    return {"applied": applied, "unknown": unknown}


def build_scores(args: argparse.Namespace, model: dict[str, Any]) -> list[dict[str, Any]]:
    lex = json.loads(args.lexicon.read_text(encoding="utf-8"))
    text_rows = {(r["symbol"], r["period"]): r for r in read_csv(args.text_csv)}
    board_rows = {(r["symbol"], r["period"]): r for r in read_csv(args.board_csv)}
    keys = sorted(set(text_rows) & set(board_rows), key=lambda x: (x[1], x[0]))
    out = []
    for symbol, period in keys:
        t = text_rows[(symbol, period)]
        b = board_rows[(symbol, period)]
        year = int((period or "0")[:4])
        row: dict[str, Any] = {
            "symbol": symbol,
            "period": period,
            "year": year,
            "industry": b.get("industry") or t.get("industry") or "",
        }
        row.update(text_scores(t.get("text", ""), lex, model["liwc"]["intensity_median"]))
        for key, aliases in BOARD_MAP.items():
            row[key] = num(b, aliases, model["center"].get(key, 0.0))
        for key in ["ln_assets", "firm_age", "roa", "de_ratio_w", "pol_tie"]:
            row[key] = num(b, [key], model["center"].get(key, 0.0))
        row.update(score_with_model(model, row, args.engine))
        row["evidence"] = "Public text + board variables"
        row["risk_flag"] = "ตรวจต่อด้วยข่าวล่าสุด สภาพคล่อง และงบการเงิน"
        out.append(row)
    return out


def build_backtest(scores: list[dict[str, Any]], args: argparse.Namespace) -> dict[str, Any]:
    returns = {(r["symbol"], r["period"]): float(r["return_pct"]) / 100 for r in read_csv(args.returns_csv)}
    bench = {r["period"]: float(r["return_pct"]) / 100 for r in read_csv(args.benchmark_csv)}
    periods = sorted({r["period"] for r in scores if r["period"] in bench})
    portfolio_returns = []
    benchmark_returns = []
    folds = []
    eq_p = 100.0
    eq_b = 100.0
    curve_p = []
    curve_b = []
    for period in periods:
        ranked = sorted([r for r in scores if r["period"] == period], key=lambda r: -r["innovation_alpha_score"])
        picked = [r for r in ranked if (r["symbol"], period) in returns][: args.top_n]
        if not picked:
            continue
        pr = statistics.fmean(returns[(r["symbol"], period)] for r in picked)
        br = bench[period]
        portfolio_returns.append(pr)
        benchmark_returns.append(br)
        eq_p *= 1 + pr
        eq_b *= 1 + br
        curve_p.append({"period": period, "value": round(eq_p, 2), "return_pct": round(pr * 100, 2)})
        curve_b.append({"period": period, "value": round(eq_b, 2), "return_pct": round(br * 100, 2)})
        folds.append({
            "period": period,
            "top10_return_pct": round(pr * 100, 2),
            "set_return_pct": round(br * 100, 2),
            "alpha_pct": round((pr - br) * 100, 2),
            "hit": pr > br,
            "n_selected": len(picked),
        })
    if not folds:
        raise SystemExit("ไม่พบรอบ backtest ที่ match กันระหว่าง scores/returns/benchmark")
    total_p = eq_p / 100 - 1
    total_b = eq_b / 100 - 1
    excess = [a - b for a, b in zip(portfolio_returns, benchmark_returns)]
    years = len(portfolio_returns) / 4
    sharpe = 0.0
    if len(portfolio_returns) > 1:
        avg = statistics.fmean(portfolio_returns)
        sd = statistics.stdev(portfolio_returns)
        sharpe = 0.0 if sd == 0 else avg / sd * math.sqrt(4)
    peak = -math.inf
    mdd = 0.0
    for r in curve_p:
        peak = max(peak, r["value"])
        mdd = min(mdd, r["value"] / peak - 1)
    return {
        "period": f"{periods[0]}-{periods[-1]}",
        "rebalance": "quarterly",
        "portfolio": f"Top {args.top_n} Innovation Alpha Score, equal-weight",
        "benchmark": "SET Index",
        "metrics": {
            "portfolio_total_return_pct": round(total_p * 100, 2),
            "set_total_return_pct": round(total_b * 100, 2),
            "alpha_pct": round((total_p - total_b) * 100, 2),
            "portfolio_cagr_pct": round(((1 + total_p) ** (1 / years) - 1) * 100, 2),
            "set_cagr_pct": round(((1 + total_b) ** (1 / years) - 1) * 100, 2),
            "sharpe": round(sharpe, 2),
            "max_drawdown_pct": round(mdd * 100, 2),
            "win_rate_pct": round(sum(1 for r in excess if r > 0) / len(excess) * 100, 2),
        },
        "equity_curve": {"portfolio": curve_p, "benchmark": curve_b},
        "folds": folds,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-json", type=Path, default=DEFAULT_MODEL)
    ap.add_argument("--lexicon", type=Path, default=DEFAULT_LEXICON)
    ap.add_argument("--text-csv", type=Path, required=True)
    ap.add_argument("--board-csv", type=Path, required=True)
    ap.add_argument("--returns-csv", type=Path, required=True)
    ap.add_argument("--benchmark-csv", type=Path, required=True)
    ap.add_argument("--stata-coef-csv", type=Path)
    ap.add_argument("--engine", default="B")
    ap.add_argument("--top-n", type=int, default=10)
    ap.add_argument("--latest-period")
    ap.add_argument("--out-json", type=Path, default=ROOT / "out" / "market_validation.json")
    ap.add_argument("--update-model", action="store_true")
    args = ap.parse_args()

    model = json.loads(args.model_json.read_text(encoding="utf-8"))
    stata_coefficients = read_stata_coefficients(args.stata_coef_csv) if args.stata_coef_csv else {}
    stata_apply_status: dict[str, Any] = {"applied": [], "unknown": []}
    if stata_coefficients:
        model = copy.deepcopy(model)
        stata_apply_status = apply_stata_coefficients(model, args.engine, stata_coefficients)
    scores = build_scores(args, model)
    backtest = build_backtest(scores, args)
    latest_period = args.latest_period or max(r["period"] for r in scores)
    latest = sorted([r for r in scores if r["period"] == latest_period],
                    key=lambda r: -r["innovation_alpha_score"])
    for i, row in enumerate(latest, 1):
        row["rank"] = i

    payload = {
        "schema": "promosignal-market-validation/1",
        "generated": "from_python_pipeline",
        "status": "pipeline_output",
        "data_note": "คำนวณจาก CSV inputs ด้วย src/innovation_alpha_pipeline.py",
        "source": {
            "text_csv": str(args.text_csv),
            "board_csv": str(args.board_csv),
            "returns_csv": str(args.returns_csv),
            "benchmark_csv": str(args.benchmark_csv),
            "stata_coefficients": str(args.stata_coef_csv) if args.stata_coef_csv else None,
        },
        "stata_coefficients_loaded": stata_coefficients,
        "stata_coefficients_apply_status": stata_apply_status,
        "pipeline": [
            "คำนวณ LIWC-style promotion/prevention จาก public text",
            "รวม board variables 4 ตัวหลัก",
            "คำนวณ Innovation Alpha Score 0-100 จาก model coefficients",
            f"เลือก Top {args.top_n} รายไตรมาส",
            "คำนวณ return และเทียบ SET Index",
        ],
        "backtest": backtest,
        "latest": {
            "as_of": latest_period,
            "universe": "SET100/public text universe",
            "top_n": 5,
            "rows": latest[:10],
        },
    }
    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.update_model:
        model["market_validation"] = payload
        args.model_json.write_text(json.dumps(model, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("wrote", args.out_json)


if __name__ == "__main__":
    main()

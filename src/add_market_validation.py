"""เติมข้อมูล market validation สำหรับโหมดคัดหุ้นลงทุน

สคริปต์นี้สร้างโครงข้อมูลที่เว็บต้องใช้สำหรับ:
- TRL 6: backtest พอร์ต Top 10 เทียบ SET Index
- TRL 7: snapshot Top 5 หุ้นนวัตกรรมไตรมาสล่าสุด

ข้อมูลชุดนี้เป็น demo ที่สร้างแบบ deterministic เพื่อให้หน้าเว็บอธิบาย workflow ได้ทันที
และสามารถแทนที่ด้วยผลจาก pipeline Python จริงได้โดยคง schema เดิมไว้
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "out" / "dss_model.json"

SYMBOLS = [
    ("ADVANC", "เทคโนโลยี"),
    ("AOT", "บริการ"),
    ("BDMS", "บริการ"),
    ("BEM", "บริการ"),
    ("BH", "บริการ"),
    ("CPALL", "บริการ"),
    ("CPF", "เกษตรและอุตสาหกรรมอาหาร"),
    ("DELTA", "เทคโนโลยี"),
    ("EA", "ทรัพยากร"),
    ("GULF", "ทรัพยากร"),
    ("HANA", "เทคโนโลยี"),
    ("INTUCH", "เทคโนโลยี"),
    ("ITC", "เกษตรและอุตสาหกรรมอาหาร"),
    ("IVL", "สินค้าอุตสาหกรรม"),
    ("KBANK", "บริการ"),
    ("KCE", "เทคโนโลยี"),
    ("MINT", "บริการ"),
    ("PTT", "ทรัพยากร"),
    ("PTTEP", "ทรัพยากร"),
    ("SCGP", "สินค้าอุตสาหกรรม"),
    ("SCC", "สินค้าอุตสาหกรรม"),
    ("SIRI", "อสังหาริมทรัพย์และก่อสร้าง"),
    ("TIDLOR", "บริการ"),
    ("TRUE", "เทคโนโลยี"),
    ("WHA", "อสังหาริมทรัพย์และก่อสร้าง"),
]


def pct(v: float) -> float:
    return round(v * 100, 2)


def cumulative(returns: list[float]) -> list[dict[str, float | str]]:
    p = 100.0
    out = []
    for q, r in zip(QUARTERS, returns):
        p *= 1 + r
        out.append({"period": q, "value": round(p, 2), "return_pct": pct(r)})
    return out


def annualized(total_return: float, years: float) -> float:
    return (1 + total_return) ** (1 / years) - 1


def max_drawdown(equity: list[dict[str, float | str]]) -> float:
    peak = -math.inf
    worst = 0.0
    for row in equity:
        val = float(row["value"])
        peak = max(peak, val)
        worst = min(worst, val / peak - 1)
    return worst


def sharpe(returns: list[float]) -> float:
    avg = sum(returns) / len(returns)
    var = sum((r - avg) ** 2 for r in returns) / max(1, len(returns) - 1)
    sd = math.sqrt(var)
    return 0.0 if sd == 0 else avg / sd * math.sqrt(4)


random.seed(20260823)
QUARTERS = [f"{y}Q{q}" for y in range(2021, 2025) for q in range(1, 5)]

# Benchmark SET Index: intentionally realistic-looking quarterly swings.
set_returns = [
    0.031,
    0.018,
    -0.042,
    0.025,
    -0.027,
    -0.061,
    0.039,
    0.012,
    -0.015,
    -0.034,
    0.047,
    -0.009,
    0.022,
    -0.028,
    0.036,
    0.019,
]

# Top 10 portfolio: demo alpha stream with imperfect, non-monotonic wins.
top10_returns = [
    0.046,
    0.021,
    -0.028,
    0.041,
    -0.011,
    -0.048,
    0.057,
    0.024,
    0.008,
    -0.022,
    0.063,
    0.004,
    0.039,
    -0.014,
    0.051,
    0.031,
]

top10_eq = cumulative(top10_returns)
set_eq = cumulative(set_returns)
total_top10 = top10_eq[-1]["value"] / 100 - 1
total_set = set_eq[-1]["value"] / 100 - 1
excess = [a - b for a, b in zip(top10_returns, set_returns)]
years = len(QUARTERS) / 4

folds = []
for y in range(2021, 2025):
    idx = [i for i, q in enumerate(QUARTERS) if q.startswith(str(y))]
    pr = sum(top10_returns[i] for i in idx)
    sr = sum(set_returns[i] for i in idx)
    folds.append(
        {
            "period": str(y),
            "top10_return_pct": pct(pr),
            "set_return_pct": pct(sr),
            "alpha_pct": pct(pr - sr),
            "hit": pr > sr,
            "n_selected": 10,
        }
    )

latest_rows = []
for i, (sym, industry) in enumerate(SYMBOLS):
    base = 62 + random.random() * 28
    if sym in {"DELTA", "ADVANC", "GULF", "TRUE", "SCGP"}:
        base += 8
    if industry == "เทคโนโลยี":
        base += 4
    score = min(99.0, base)
    latest_rows.append(
        {
            "rank": 0,
            "symbol": sym,
            "industry": industry,
            "innovation_alpha_score": round(score, 1),
            "model_signal": round(1.0 + score / 38, 2),
            "growth_score": round(55 + random.random() * 39, 1),
            "risk_flag": random.choice(["ปกติ", "ต้องดูงบล่าสุด", "สภาพคล่องสูง", "ผันผวนสูง"]),
            "evidence": random.choice(
                [
                    "One Report + board variables",
                    "Opportunity Day transcript + One Report",
                    "One Report English text + public filings",
                ]
            ),
        }
    )

latest_rows.sort(key=lambda r: r["innovation_alpha_score"], reverse=True)
for rank, row in enumerate(latest_rows, 1):
    row["rank"] = rank

market_validation = {
    "schema": "promosignal-market-validation/1",
    "generated": "2026-08-23",
    "status": "demo_generated",
    "data_note": "ข้อมูล demo สร้างด้วย Python เพื่อสาธิต workflow TRL 6-7; เมื่อนำข้อมูลราคาหุ้น/SET จริงเข้ามาให้แทนที่บล็อกนี้ด้วยผลคำนวณจริง",
    "pipeline": [
        "โหลดคะแนน Innovation Alpha รายไตรมาส",
        "เลือกหุ้น Top 10 ณ วัน rebalance",
        "ถือแบบ equal-weight 1 ไตรมาส",
        "รวมผลตอบแทนและเทียบ SET Index",
        "คำนวณ alpha, Sharpe, max drawdown และ win rate",
    ],
    "backtest": {
        "period": "2021Q1-2024Q4",
        "rebalance": "quarterly",
        "portfolio": "Top 10 Innovation Alpha Score, equal-weight",
        "benchmark": "SET Index",
        "metrics": {
            "portfolio_total_return_pct": pct(total_top10),
            "set_total_return_pct": pct(total_set),
            "alpha_pct": pct(total_top10 - total_set),
            "portfolio_cagr_pct": pct(annualized(total_top10, years)),
            "set_cagr_pct": pct(annualized(total_set, years)),
            "sharpe": round(sharpe(top10_returns), 2),
            "max_drawdown_pct": pct(max_drawdown(top10_eq)),
            "win_rate_pct": pct(sum(1 for r in excess if r > 0) / len(excess)),
        },
        "equity_curve": {"portfolio": top10_eq, "benchmark": set_eq},
        "folds": folds,
    },
    "latest": {
        "as_of": "2026Q2",
        "universe": "SET investable universe demo",
        "top_n": 5,
        "rows": latest_rows[:10],
    },
}


def main() -> None:
    model = json.loads(MODEL.read_text(encoding="utf-8"))
    model["market_validation"] = market_validation
    MODEL.write_text(json.dumps(model, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("updated", MODEL, "market_validation rows", len(latest_rows))


if __name__ == "__main__":
    main()

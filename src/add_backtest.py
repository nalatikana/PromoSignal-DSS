"""เติมผลทดสอบย้อนหลังแบบเลื่อนจุดตั้งต้น (rolling origin) ลงใน out/dss_model.json

เทรนด้วยปี <= t แล้วทดสอบปี t+1 สำหรับ t = 2021, 2022, 2023
วัดผล 4 อย่าง: Spearman · c-index · MASE (เทียบทายด้วยค่าปีก่อน) · ความครอบคลุมช่วง 90%
และวัด "ส่วนต่างควินไทล์" = ค่าจริงเฉลี่ยของกลุ่มบนสุด ลบ กลุ่มล่างสุด ตามอันดับที่โมเดลทาย
ทั้งหมดเป็นตัวเลขรวม ไม่มีชื่อบริษัทหรือชื่อบุคคล
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy.stats import nbinom, spearmanr

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "dss_model.json"

d = pd.read_csv(ROOT / "data" / "panel_clean.csv").sort_values(["ticker", "year"])
d["oi"] = d["n_partners"]
d["pol_tie"] = (d["peps_bod"].fillna(0) > 0).astype(float)
d["female_pct"] = d["pct_female_board"] * 100.0
d["indep_pct"] = d["board_independence"] * 100.0
d["oi_lag1"] = d.groupby("ticker")["n_partners"].shift(1)

SIM = {
    "A": (["promotion", "female_pct", "pol_tie"],
          ["c_promotion:c_female_pct", "c_promotion:c_pol_tie"]),
    "B": (["promotion", "female_pct", "wa_board_tenure", "indep_pct", "board_size", "pol_tie"], []),
}
CTRL = ["ln_assets", "firm_age", "roa", "de_ratio_w"]
need = sorted(set(sum([v[0] for v in SIM.values()], []) + CTRL + ["oi"]))
dd = d.dropna(subset=need).copy()


def c_index(y, p):
    """สัดส่วนคู่ที่โมเดลเรียงอันดับถูก (นับคู่ที่ค่าจริงต่างกันเท่านั้น)"""
    y, p = np.asarray(y, float), np.asarray(p, float)
    n = len(y)
    ok = tot = 0
    for i in range(n):
        for j in range(i + 1, n):
            if y[i] == y[j]:
                continue
            tot += 1
            if (y[i] > y[j]) == (p[i] > p[j]):
                ok += 1
            elif p[i] == p[j]:
                ok += .5
    return ok / tot if tot else float("nan")


def run(key, cut):
    sim, inter = SIM[key]
    tr = dd[dd.year <= cut].copy()
    te = dd[dd.year == cut + 1].copy()
    if len(te) < 30 or tr.year.nunique() < 2:
        return None
    cen = {c: float(tr[c].mean()) for c in set(sim + CTRL)}
    for c in cen:
        tr["c_" + c] = tr[c] - cen[c]
        te["c_" + c] = te[c] - cen[c]
    terms = ["c_" + v for v in sim] + inter + ["c_" + c for c in CTRL]
    f = "oi ~ " + " + ".join(terms) + " + C(year) + C(industry)"
    m = smf.negativebinomial(f, data=tr).fit(disp=0)

    te2 = te.copy()
    te2["year"] = cut                                     # ปีทดสอบไม่มีใน FE ที่เทรน
    te2 = te2[te2.industry.isin(tr.industry.unique())]
    mu = np.asarray(m.predict(te2), float)
    y = te2["oi"].to_numpy(float)
    alpha = float(m.params["alpha"])

    lag = te2["oi_lag1"].to_numpy(float)
    ok = ~np.isnan(lag)
    mase = (np.abs(y - mu)[ok].mean() / np.abs(y - lag)[ok].mean()) if ok.sum() > 5 else float("nan")

    r = 1 / alpha
    p_ = r / (r + mu)
    lo, hi = nbinom.ppf(.05, r, p_), nbinom.ppf(.95, r, p_)
    cov = float(((y >= lo) & (y <= hi)).mean())

    # ส่วนต่างควินไทล์: เรียงตามค่าที่ทาย แล้วเทียบค่าจริงเฉลี่ยกลุ่มบน–ล่าง
    q = pd.qcut(pd.Series(mu).rank(method="first"), 5, labels=False)
    top, bot = y[q == 4].mean(), y[q == 0].mean()

    return {
        "train_years": [int(tr.year.min()), int(cut)],
        "test_year": int(cut + 1),
        "n_train": int(len(tr)), "n_test": int(len(te2)),
        "spearman": round(float(spearmanr(y, mu).statistic), 4),
        "c_index": round(float(c_index(y, mu)), 4),
        "mase": round(float(mase), 4),
        "pi90_coverage": round(cov, 4),
        "mae": round(float(np.abs(y - mu).mean()), 4),
        "q_top_actual": round(float(top), 3),
        "q_bot_actual": round(float(bot), 3),
        "q_spread": round(float(top - bot), 3),
        "alpha": round(alpha, 4),
    }


M = json.loads(OUT.read_text(encoding="utf-8"))
bt = {}
for key in ("A", "B"):
    rows = [r for cut in (2021, 2022, 2023) if (r := run(key, cut))]
    avg = {k: round(float(np.nanmean([r[k] for r in rows])), 4)
           for k in ("spearman", "c_index", "mase", "pi90_coverage", "mae", "q_spread")}
    bt[key] = {"folds": rows, "avg": avg}
    print(key, json.dumps(avg, ensure_ascii=False))
    for r in rows:
        print("   ", r["train_years"], "->", r["test_year"],
              "sp", r["spearman"], "c", r["c_index"], "mase", r["mase"],
              "cov", r["pi90_coverage"], "spread", r["q_spread"])

M["backtest"] = {
    "design": "rolling origin — เทรนด้วยปี ≤ t ทดสอบปี t+1 (t = 2021, 2022, 2023)",
    "note": "ปีทดสอบไม่มีใน fixed effect ที่เทรน จึงใช้ค่าฐานของปีสุดท้ายที่เทรนแทน — เป็นการทดสอบแบบอนุรักษ์นิยม",
    "engines": bt,
}
OUT.write_text(json.dumps(M, ensure_ascii=False), encoding="utf-8")
print("wrote", OUT, round(OUT.stat().st_size / 1e3, 1), "KB")

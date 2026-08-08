"""ฟิตและส่งออกโมเดล 2 เครื่องยนต์สำหรับ Decision Support System

Engine A — ตามสเปกใน Pitch2.pptx
    E[OI] = exp(b0 + b1·Promo + b2·%Female + b3·PolTie
                + b4·(Promo×%Female) + b5·(Promo×PolTie) + controls)

Engine B — ตามหลักฐานที่รันได้จริง (โครงสร้างบอร์ดที่มีนัยสำคัญ)
    E[OI] = exp(b0 + b1·Promo + b2·%Female + b3·BoardTenure
                + b4·BoardIndep + b5·BoardSize + b6·PolTie + controls)

ส่งออก: สัมประสิทธิ์ · เมทริกซ์ความแปรปรวนร่วม (สำหรับ CI) · ค่าฐานรายอุตสาหกรรม
        · universe สำหรับจัดอันดับ · ช่วงค่าที่พบจริง (กันการคาดการณ์นอกช่วงข้อมูล)
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy.stats import nbinom, spearmanr

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "dss_model.json"
SEED = 20260730

# ---------------------------------------------------------------- ข้อมูล
d = pd.read_csv(ROOT / "data" / "panel_clean.csv").sort_values(["ticker", "year"])

d["oi"] = d["n_partners"]                       # นวัตกรรมเปิด = พันธมิตร / JV / MOU
d["pol_tie"] = (d["peps_bod"].fillna(0) > 0).astype(float)
d["female_pct"] = d["pct_female_board"] * 100.0  # หน่วย %
d["indep_pct"] = d["board_independence"] * 100.0
d["family_pct"] = d["family_bod"] * 100.0
d["oi_lag1"] = d.groupby("ticker")["n_partners"].shift(1)

SIM_A = ["promotion", "female_pct", "pol_tie"]
SIM_B = ["promotion", "female_pct", "wa_board_tenure", "indep_pct", "board_size", "pol_tie"]
CTRL = ["ln_assets", "firm_age", "roa", "de_ratio_w" if "de_ratio_w" in d.columns else "de_ratio"]

need = sorted(set(SIM_A + SIM_B + CTRL + ["oi", "industry", "year"]))  # oi_lag1 ปล่อยว่างได้
dd = d.dropna(subset=[c for c in need if c not in ("industry", "year")]).copy()

# mean-center ตัวแปรที่เข้า interaction เพื่อให้ตีความ main effect ได้ตรง
CENTER = {c: float(dd[c].mean()) for c in set(SIM_A + SIM_B + CTRL)}
for c in CENTER:
    dd["c_" + c] = dd[c] - CENTER[c]


def fit(sim_vars, inter):
    """ฟิต Negative Binomial แล้วคืนค่าที่ DSS ต้องใช้"""
    terms = ["c_" + v for v in sim_vars] + inter + ["c_" + c for c in CTRL]
    f = "oi ~ " + " + ".join(terms) + " + C(year) + C(industry)"
    m = smf.negativebinomial(f, data=dd).fit(disp=0)

    # ชื่อพารามิเตอร์ที่ simulator ต้องใช้ (ไม่รวม FE และ alpha)
    keep = [t for t in terms]
    coef = {t: float(m.params[t]) for t in keep}
    se = {t: float(m.bse[t]) for t in keep}
    pval = {t: float(m.pvalues[t]) for t in keep}

    # เมทริกซ์ความแปรปรวนร่วมของ (intercept + keep) สำหรับคำนวณ CI ฝั่งเบราว์เซอร์
    order = ["Intercept"] + keep
    V = m.cov_params().loc[order, order].values
    # ค่าฐานรายอุตสาหกรรม: intercept + FE ของอุตสาหกรรม (ปีอ้างอิง = ปีล่าสุดที่มี dummy)
    inds = sorted(dd["industry"].dropna().unique())
    years = sorted(dd["year"].unique())
    base_ind, base_year = {}, {}
    for i in inds:
        k = f"C(industry)[T.{i}]"
        base_ind[i] = float(m.params.get(k, 0.0))
    for y in years:
        k = f"C(year)[T.{y}]"
        base_year[int(y)] = float(m.params.get(k, 0.0))

    # ประสิทธิภาพในกลุ่มทดสอบ (out-of-sample) — ซื่อสัตย์กับผู้ใช้
    tr, te = dd[dd.year <= 2022], dd[dd.year > 2022].copy()
    oos = None
    alpha = float(m.params.get("alpha", 1.0))
    if len(te) > 30:
        mt = smf.negativebinomial(f, data=tr).fit(disp=0)
        # ปีทดสอบไม่มีอยู่ในโมเดลที่เทรน → ใช้ผลของปีล่าสุดที่เทรน (ไม่แอบรู้อนาคต)
        te["year"] = int(tr["year"].max())
        pred = np.asarray(mt.predict(te), dtype=float)
        y = te["oi"].to_numpy(dtype=float)
        a_tr = float(mt.params.get("alpha", alpha))

        ss_res = float(((y - pred) ** 2).sum())
        ss_tot = float(((y - tr["oi"].mean()) ** 2).sum())
        mae = float(np.abs(y - pred).mean())

        # MASE — เทียบกับการทำนายแบบ naive (ใช้ค่าปีก่อนของบริษัทเดียวกัน)
        naive = te["oi_lag1"].to_numpy(dtype=float)
        ok = ~np.isnan(naive)
        mase = float(mae / np.abs(y[ok] - naive[ok]).mean()) if ok.sum() > 10 else None

        # ความแม่นของการ "จัดอันดับ" — สำคัญกว่าค่าสัมบูรณ์เมื่อใช้คัดกรอง
        rho = float(spearmanr(pred, y).statistic)
        conc = disc = 0
        for i in range(len(y)):
            dy = y[i + 1:] - y[i]
            dp = pred[i + 1:] - pred[i]
            cmp_ = dy != 0
            conc += int((((dy > 0) & (dp > 0)) | ((dy < 0) & (dp < 0)))[cmp_].sum())
            disc += int((((dy > 0) & (dp < 0)) | ((dy < 0) & (dp > 0)))[cmp_].sum())
        c_index = round((conc + .5 * (conc + disc - conc - disc)) / (conc + disc), 4) if (conc + disc) else None
        c_index = round(conc / (conc + disc), 4) if (conc + disc) else None

        # ช่วงพยากรณ์ 90% ของ "ค่าจริง" ครอบคลุมได้จริงกี่ %
        n_nb = 1.0 / a_tr
        p_nb = n_nb / (n_nb + pred)
        lo90 = nbinom.ppf(.05, n_nb, p_nb)
        hi90 = nbinom.ppf(.95, n_nb, p_nb)
        cover = float(((y >= lo90) & (y <= hi90)).mean())

        oos = {"n_test": int(len(te)), "pseudo_r2": round(1 - ss_res / ss_tot, 4),
               "mae": round(mae, 3),
               "mase": None if mase is None else round(mase, 3),
               "spearman": round(rho, 4), "c_index": c_index,
               "pi90_coverage": round(cover, 4)}

    return {
        "formula": f, "n": int(m.nobs), "pseudo_r2": round(float(m.prsquared), 4),
        "llf": round(float(m.llf), 1), "intercept": float(m.params["Intercept"]),
        "alpha": round(alpha, 4), "n_terms": int(len(m.params)),
        "vars": keep, "coef": coef, "se": se, "p": pval,
        "cov": [[float(x) for x in row] for row in V],
        "cov_order": order,
        "base_industry": base_ind, "base_year": base_year,
        "oos": oos,
    }


ENGINE_A = fit(SIM_A, ["c_promotion:c_female_pct", "c_promotion:c_pol_tie"])
ENGINE_B = fit(SIM_B, [])

# ---------------------------------------------------- universe สำหรับจัดอันดับ
# ให้คะแนนทุกบริษัท-ปีด้วยทั้งสองเครื่องยนต์ แล้วเก็บเฉพาะค่าสถิติ (ไม่มีรหัสบริษัท)
def score_all(eng):
    lp = np.full(len(dd), eng["intercept"])
    for t in eng["vars"]:
        if ":" in t:
            a, b = t.split(":")
            lp = lp + eng["coef"][t] * dd[a].values * dd[b].values
        else:
            lp = lp + eng["coef"][t] * dd[t].values
    lp = lp + dd["industry"].map(eng["base_industry"]).fillna(0).values
    lp = lp + dd["year"].map(eng["base_year"]).fillna(0).values
    return np.exp(lp)


universe = {}
for name, eng in [("A", ENGINE_A), ("B", ENGINE_B)]:
    s = score_all(eng)
    q = np.quantile(s, [i / 100 for i in range(101)])
    universe[name] = {
        "quantiles": [round(float(v), 5) for v in q],
        "mean": round(float(s.mean()), 4), "median": round(float(np.median(s)), 4),
        "quintile_edges": [round(float(v), 5) for v in np.quantile(s, [.2, .4, .6, .8])],
    }

# ค่ากลางรายอุตสาหกรรม สำหรับแสดงเป็นเกณฑ์เทียบ
ind_stats = {}
for i, g in dd.groupby("industry"):
    ind_stats[i] = {
        "n": int(len(g)),
        "oi_median": round(float(g["oi"].median()), 2),
        "oi_mean": round(float(g["oi"].mean()), 3),
        "female_pct_median": round(float(g["female_pct"].median()), 1),
        "indep_pct_median": round(float(g["indep_pct"].median()), 1),
        "tenure_median": round(float(g["wa_board_tenure"].median()), 1),
        "board_size_median": round(float(g["board_size"].median()), 1),
        "promotion_median": round(float(g["promotion"].median()), 3),
    }

# ช่วงค่าที่พบจริง — ใช้เตือนเมื่อผู้ใช้เลื่อน slider ออกนอกช่วงข้อมูล
ranges = {}
for c in sorted(set(SIM_A + SIM_B + CTRL) | {"family_pct", "ceo_tenure", "innov_total"}):
    if c not in dd.columns:
        continue
    s = dd[c].dropna()
    ranges[c] = {"min": round(float(s.min()), 3), "max": round(float(s.max()), 3),
                 "p05": round(float(s.quantile(.05)), 3), "p95": round(float(s.quantile(.95)), 3),
                 "mean": round(float(s.mean()), 3), "median": round(float(s.median()), 3),
                 "sd": round(float(s.std()), 3)}

# สเกล LIWC ในฐานข้อมูล — ใช้แปลงอัตราส่วนคำที่นับได้จากเอกสารกลับเป็นสเกลเดียวกัน
liwc = {
    "promotion_median": round(float(dd["promotion"].median()), 4),
    "prevention_median": round(float(dd["prevention"].median()), 4),
    "intensity_median": round(float((dd["promotion"] + dd["prevention"]).median()), 4),
    "wc_median": round(float(d["word_count"].median()), 1),
    "promotion_q": [round(float(v), 4) for v in dd["promotion"].quantile([i / 100 for i in range(101)])],
}
oi_q = [round(float(v), 3) for v in dd["oi"].quantile([i / 100 for i in range(101)])]

payload = {
    "liwc": liwc,
    "oi_quantiles": oi_q,
    "meta": {
        "built": "2026-08-08", "seed": SEED,
        "n_rows": int(len(dd)), "n_firms": int(dd["ticker"].nunique()),
        "years": [int(y) for y in sorted(dd["year"].unique())],
        "target": "n_partners (พันธมิตร / JV / MOU) = ตัวแทนนวัตกรรมเปิด",
        "model": "Negative Binomial · log link · ควบคุมปีและอุตสาหกรรม",
        "anonymized": True,
        "reconcile_note": {
            "claim": "โมเดลอีกชุดที่ทีมได้รับรายงาน Political × Promotion IRR = 2.09 (p = .005)",
            "our_result": "ทดสอบ 6 สเปกกับ panel_clean.csv ได้ IRR 0.70–0.86 (p = 0.06–0.28) — ทิศทางตรงข้าม",
            "specs_tested": [
                "n_partners + FE ปี/อุตสาหกรรม", "innov_total + FE ปี/อุตสาหกรรม",
                "n_partners + year trend + industry factor", "innov_total + year trend + industry factor",
                "political = นับคน (peps_bod)", "political = สัดส่วนต่อขนาดบอร์ด"],
            "likely_causes": [
                "ตัวแปรตามนิยามต่างกัน (ค่าเฉลี่ยของเขา ~6.7 vs พันธมิตรในชุดนี้ 1.46 · นวัตกรรมรวม 9.24)",
                "α ต่างกัน (ของเขา 0.707 · ของชุดนี้ 0.87–1.13) แปลว่าการกระจายของข้อมูลต่างกัน",
                "จำนวนเทอมต่างกัน (ของเขา 31 · ของชุดนี้ 20) แปลว่ามีตัวควบคุมเพิ่ม",
                "อาจใช้ตัวอย่างหรือการทำความสะอาดข้อมูลคนละชุด"],
            "action": "ต้องเทียบ data dictionary และ do-file กันก่อนสรุป — ระบบนี้ไม่แก้ตัวเลขให้ตรงกันโดยไม่รู้สาเหตุ",
        },
    },
    "center": {k: round(v, 6) for k, v in CENTER.items()},
    "controls": CTRL,
    "engines": {
        "A": {"label": "ตามสเปก Pitch — Promotion × ตัวแปรกำกับ", **ENGINE_A},
        "B": {"label": "ตามหลักฐาน — โครงสร้างคณะกรรมการ", **ENGINE_B},
    },
    "universe": universe,
    "industry": ind_stats,
    "ranges": ranges,
}

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

print(f"wrote {OUT}  {OUT.stat().st_size/1000:.0f} KB")
for k, e in [("A", ENGINE_A), ("B", ENGINE_B)]:
    print(f"\n=== Engine {k} · N={e['n']} · pseudoR2={e['pseudo_r2']} · OOS={e['oos']}")
    for t in e["vars"]:
        star = "***" if e["p"][t] < .01 else "**" if e["p"][t] < .05 else "*" if e["p"][t] < .10 else ""
        print(f"   {t:34s} b={e['coef'][t]:+.5f}  se={e['se'][t]:.5f}  p={e['p'][t]:.3f} {star}")

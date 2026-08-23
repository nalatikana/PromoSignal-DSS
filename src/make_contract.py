"""แปลงโมเดลตั้งต้น (ชุด B) ให้อยู่ในรูปสัญญา promosignal-model/1 เพื่อใช้เป็นตัวอย่างอ้างอิง"""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
M = json.loads((ROOT / "out" / "dss_model.json").read_text(encoding="utf-8"))

META = {
    "promotion": ("Promotion focus (ภาษาเชิงรุก)", "", 0, 2.3, .01, 3, False),
    "female_pct": ("สัดส่วนกรรมการหญิง", "%", 0, 70, 1, 1, False),
    "wa_board_tenure": ("อายุงานเฉลี่ยของบอร์ด", "ปี", 0, 30, .5, 1, False),
    "indep_pct": ("สัดส่วนกรรมการอิสระ", "%", 0, 80, 1, 1, False),
    "board_size": ("ขนาดคณะกรรมการ", "คน", 3, 20, 1, 0, False),
    "pol_tie": ("มีกรรมการเชื่อมโยงการเมือง", "", 0, 1, 1, 0, True),
    "ln_assets": ("ขนาดบริษัท (ln สินทรัพย์)", "", 12, 24, .1, 2, False),
    "firm_age": ("อายุบริษัท", "ปี", 1, 90, 1, 0, False),
    "roa": ("ROA", "%", -30, 40, .1, 2, False),
    "de_ratio_w": ("หนี้สินต่อทุน", "เท่า", 0, 6, .05, 2, False),
}

eng = M["engines"]["B"]
strip = lambda t: ":".join(p.replace("c_", "") for p in t.split(":"))
terms = [strip(t) for t in eng["vars"]]
ctrl = set(M["controls"])

variables = []
for k, (lab, unit, mn, mx, st, dec, isb) in META.items():
    r = M["ranges"].get(k, {})
    variables.append({
        "key": k, "label": lab, "unit": unit,
        "min": mn, "max": mx, "step": st, "dec": dec,
        "center": M["center"][k], "sd": r.get("sd"),
        "control": k in ctrl, "bool": isb,
    })

c = {
    "schema": "promosignal-model/1",
    "name": "ชุดโมเดล B — โครงสร้างคณะกรรมการ (ตัวอย่างอ้างอิง)",
    "key": "Bref",
    "produced_by": "Python 3.11 · statsmodels NegativeBinomial",
    "produced_at": str(date.today()),
    "target": {"var": "n_partners", "label": "จำนวนนวัตกรรมเปิด (พันธมิตร / JV / MOU)",
               "family": "negbin", "link": "log", "scale": "count"},
    "alpha": eng["alpha"],
    "intercept": eng["intercept"],
    "variables": variables,
    "terms": terms,
    "coef": {strip(k): v for k, v in eng["coef"].items()},
    "se": {strip(k): v for k, v in eng["se"].items()},
    "p": {strip(k): v for k, v in eng["p"].items()},
    "vcov": {"order": [strip(t) if t != "Intercept" else "Intercept" for t in eng["cov_order"]],
             "matrix": eng["cov"]},
    "fixed_effects": {"year": eng["base_year"], "industry": eng["base_industry"]},
    "fit": {"n": eng["n"], "n_firms": M["meta"]["n_firms"],
            "pseudo_r2": eng["pseudo_r2"], "llf": eng["llf"]},
    "oos": eng["oos"],
    "reference": M["universe"]["B"],
    "notes": "ไฟล์นี้คือชุดโมเดล B ที่ฝังอยู่ในแอปอยู่แล้ว แปลงเป็นรูปสัญญาเพื่อใช้เป็นตัวอย่าง "
             "ให้ผู้เขียนสคริปต์ R / Stata เทียบรูปแบบ — โหลดเข้าไปแล้วค่าที่ได้ต้องตรงกับชุด B ทุกตำแหน่ง",
}

out = ROOT / "spec" / "example_model.json"
out.write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e3, 1), "KB · terms", len(terms))

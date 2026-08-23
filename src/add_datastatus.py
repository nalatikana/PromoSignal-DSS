"""เติมสถานะความครบถ้วนของข้อมูลลงใน out/dss_model.json (ตัวเลขรวมเท่านั้น ไม่มีชื่อ)"""
import json
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "dss_model.json"
d = pd.read_csv(ROOT / "data" / "panel_clean.csv")

CORE = {
    "promotion": "Promotion focus (ภาษาเชิงรุก)",
    "prevention": "Prevention focus (ภาษาเชิงป้องกัน)",
    "pct_female_board": "สัดส่วนกรรมการหญิง",
    "peps_bod": "กรรมการเชื่อมโยงการเมือง (Political)",
    "security_bod": "กรรมการสายความมั่นคง (Military)",
    "wa_board_tenure": "อายุงานเฉลี่ยของบอร์ด",
    "board_independence": "สัดส่วนกรรมการอิสระ",
    "board_size": "ขนาดคณะกรรมการ",
    "family_bod": "สัดส่วนกรรมการครอบครัว",
    "ceo_tenure": "อายุงาน CEO",
    "n_partners": "จำนวนพันธมิตร / JV / MOU",
    "innov_total": "จำนวนนวัตกรรมรวม",
    "liwc_intensity": "ความเข้มของถ้อยคำ (Wording intensity)",
    "ln_assets": "ขนาดบริษัท (ln สินทรัพย์)",
    "roa": "ROA",
    "de_ratio_w": "หนี้สินต่อทุน",
}
n = len(d)
rows = []
for c, lab in CORE.items():
    miss = int(d[c].isna().sum())
    rows.append({"var": c, "label": lab, "n": n - miss, "missing": miss,
                 "pct": round(100 * miss / n, 1)})

# ครบ 5 ปีกี่บริษัท
def complete(cols):
    ok = d.dropna(subset=cols)
    g = ok.groupby("ticker")["year"].nunique()
    return int((g == 5).sum())

sets = {
    "core8": ["promotion", "pct_female_board", "peps_bod", "wa_board_tenure",
              "board_independence", "board_size", "n_partners", "ln_assets"],
    "core12": ["promotion", "pct_female_board", "peps_bod", "security_bod", "wa_board_tenure",
               "board_independence", "board_size", "family_bod", "ceo_tenure",
               "n_partners", "ln_assets", "roa"],
    "full": list(CORE.keys()),
}
comp = {k: complete(v) for k, v in sets.items()}

# ตรวจความสมเหตุสมผลของ Political / Military
anom = {}
for c in ("peps_bod", "security_bod"):
    s = d[c]
    anom[c] = {
        "n": int(s.notna().sum()), "missing": int(s.isna().sum()),
        "min": float(s.min()), "max": float(s.max()), "mean": round(float(s.mean()), 3),
        "gt_board_size": int((s > d["board_size"]).sum()),
        "negative": int((s < 0).sum()),
        "non_integer": int((s.dropna() % 1 != 0).sum()),
        "dist": {str(int(k)): int(v) for k, v in s.value_counts().sort_index().items()},
    }

M = json.loads(OUT.read_text(encoding="utf-8"))
M["datastatus"] = {
    "n_rows": int(n), "n_firms": int(d["ticker"].nunique()),
    "years": [int(d.year.min()), int(d.year.max())],
    "vars": rows,
    "complete5y": comp,
    "anomaly": anom,
    "validation_target": {
        "records": 420, "firms": 210, "years": 2,
        "purpose": "ชุดตรวจสอบนอกกลุ่มตัวอย่าง (out-of-sample) สำหรับยืนยันความแม่นของโมเดล",
        "done": 0,
    },
}
OUT.write_text(json.dumps(M, ensure_ascii=False), encoding="utf-8")
print(json.dumps(comp, ensure_ascii=False))
for c, a in anom.items():
    print(c, "เกินขนาดบอร์ด", a["gt_board_size"], "ติดลบ", a["negative"],
          "ไม่ใช่จำนวนเต็ม", a["non_integer"], "ขาด", a["missing"])
print("wrote", round(OUT.stat().st_size / 1e3, 1), "KB")

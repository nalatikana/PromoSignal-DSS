# -*- coding: utf-8 -*-
"""สร้าง ois_model.json — ชั้นข้อมูลของเครื่องคำนวณ Signal B สำหรับต้นแบบ
   ตัวเลขอ้างอิง (ตารางที่ 6, 8, 9, 10) มาจากเอกสารสมการ REF928-edit6-20260930
   ฐานอ้างอิงที่ใช้คำนวณ percentile ในต้นแบบคือ snapshot FY2566 (196 firm-years)
   เพราะชุด REF-928 ที่ freeze แล้วเป็นข้อมูลหลังบ้าน """
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ois_core import (B1, DF, DG, DW, DT, G_T, M, CUT, VF, chol, draws,
                      centred, amp_of, signal_b, ois_of, tier_of, quad_of)

ROOT = Path(__file__).resolve().parent.parent
COMPS = json.loads((ROOT / "src" / "prof_data.json").read_text(encoding="utf-8"))["comps"]

# ---- 1. คำนวณ B ของทุกบริษัทในฐานอ้างอิงของต้นแบบ -----------------------------
rows = []
for c in COMPS:
    z = centred(c["promo"], c["fam"], c["pol"], c["fem"], c["ten"])
    a = amp_of(z)
    rows.append(dict(t=c["t"], ind=c["ind"], cP=z["P"], cF=z["F"], cG=z["G"], cW=z["W"],
                     amp=a, B=signal_b(z)))
REF = sorted(r["B"] for r in rows)
REF_IND = {k: sorted(r["B"] for r in rows if r["ind"] == k) for k in range(1, 8)}

# ---- 2. ช่วง 90% ตาม E11 (Krinsky & Robb, 500 ชุด, seed 20261005) ------------
TH = draws()
REFD = []                       # ฐานอ้างอิงที่ให้คะแนนใหม่ด้วย θ^(r) ของแต่ละรอบ
for th in TH:
    REFD.append(sorted(r["cP"] * (th[0] + th[1] * r["cF"] + th[2] * r["cG"] + th[3] * r["cW"])
                       for r in rows))

def band90(r):
    v = []
    for i, th in enumerate(TH):
        b = r["cP"] * (th[0] + th[1] * r["cF"] + th[2] * r["cG"] + th[3] * r["cW"])
        v.append(ois_of(b, REFD[i]))
    v.sort()
    q = lambda p: v[min(int(p * len(v)), len(v) - 1)]
    return [round(q(.05), 1), round(q(.95), 1)]

out_c = {}
for r in rows:
    o = ois_of(r["B"], REF)
    out_c[r["t"]] = dict(
        cP=round(r["cP"], 12), cF=round(r["cF"], 12), cG=round(r["cG"], 12), cW=round(r["cW"], 12),
        amp=round(r["amp"], 12), B=round(r["B"], 12), ois=round(o, 4),
        oisInd=round(ois_of(r["B"], REF_IND[r["ind"]]), 4),
        tier=tier_of(o), quad=quad_of(r["cP"], r["amp"]), band=band90(r))

L = chol(VF)
data = dict(
    version="REF928-edit6-20260930",
    note=("ฐานอ้างอิงของต้นแบบ = snapshot ปีบัญชี 2566 จำนวน %d firm-years; "
          "ฉบับใช้งานจริงต้องให้คะแนนเทียบ REF-928 ที่ freeze แล้ว" % len(rows)),
    par=dict(b1=B1, dF=DF, dG=DG, dW=DW, dT=DT, gT=G_T),
    mean=M, cut=CUT, chol=[[round(x, 10) for x in row] for row in L],
    reps=500, seed=20261005,
    refB=[round(x, 12) for x in REF],
    refInd={str(k): [round(x, 12) for x in v] for k, v in REF_IND.items()},
    nk928=[135, 135, 140, 143, 127, 115, 133],
    co=out_c,
)
(ROOT / "src" / "ois_model.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print("companies", len(out_c), "· size", round((ROOT / "src" / "ois_model.json").stat().st_size / 1024), "KB")
from collections import Counter
print("tier", sorted(Counter(v["tier"] for v in out_c.values()).items()))
print("quad", sorted(Counter(v["quad"] for v in out_c.values()).items()))
print("tier×quad", sorted(Counter((v["tier"], v["quad"]) for v in out_c.values()).items()))
straddle = sum(1 for v in out_c.values() if tier_of(v["band"][0]) != tier_of(v["band"][1]))
print("band คร่อม tier", straddle, "/", len(out_c), "=", round(100 * straddle / len(out_c), 1), "%")

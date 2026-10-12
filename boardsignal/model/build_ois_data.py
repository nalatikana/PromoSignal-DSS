# -*- coding: utf-8 -*-
"""สร้าง src/ois_model.json — ชั้นข้อมูลของเครื่องคำนวณ Signal B สำหรับต้นแบบ (แก้ไขครั้งที่ 2)

ฐานอ้างอิง = ชุด REF-928 ที่ freeze แล้ว (ref/REF928_scored_20261005.csv — 928 firm-years, 209 บริษัท, FY2562–2566)
ช่วง 90%   = ไฟล์ ref/REF928_OIS_band_20261005.csv (Krinsky & Robb 500 ชุดจาก STATA)
ตารางที่ 10 / ตัวเลขมุมช่อง 2×2 / ρ รายอุตสาหกรรม คำนวณซ้ำจากชุดเดียวกันและตรวจกับเอกสารสมการ v2

สิ่งที่ฝังลงไฟล์: ค่าคงที่ของสูตร, ค่าเฉลี่ย, จุดตัด, Cholesky ของ V̂f, ค่า B ของฐานอ้างอิง (เรียงแล้ว ไม่มีชื่อบริษัท),
จุด 928 จุดสำหรับพื้นหลัง 2×2 (ไม่มีชื่อบริษัท), และคะแนนของ 196 บริษัทในภาพปี 2566
*** ข้อมูลชุดนี้เป็นความลับทางการค้า — ฉบับใช้งานจริงต้องย้ายไปหลัง API ฝั่งเซิร์ฟเวอร์ ***

นอกจากนี้สคริปต์นี้ "ล้าง" src/prof_data.json: ลบค่าโมเดลเก่า (means, betas, neutral, refAmp, refPromo, validity)
และคำนวณ amp / dp / ap / ipi ของทุกบริษัทใหม่จากฐาน REF-928
"""
import csv, json, sys
from collections import Counter, defaultdict
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ois_core import (VERSION, B1, DF, DG, DW, DT, G_T, M, CUT, VF, TIER_CUTS, VTH, ZONE, QUAD_NAME,
                      WEAK_EVIDENCE_IND, CRITICAL_MASS_N, chol, draws, centred, amp_of, amp_t1, amp_fe,
                      signal_b, ois_of, tier_of, quad_of, wins, q8)

ROOT = Path(__file__).resolve().parent.parent
REF_DIR = ROOT / "ref"
PROF = ROOT / "src" / "prof_data.json"
DATA = json.loads(PROF.read_text(encoding="utf-8"))
COMPS = DATA["comps"]

TICKER_FIX = {"1": "TRUE"}          # Excel แปลง "True" เป็น boolean ใน REF928 csv (DataDict เตือนไว้)
norm_t = lambda t: TICKER_FIX.get(str(t), str(t)).upper()

# ---- 1. อ่าน REF-928 ที่ให้คะแนนแล้ว ----------------------------------------------------------
ref_rows = []
with (REF_DIR / "REF928_scored_20261005.csv").open(encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        ref_rows.append(dict(
            t=norm_t(r["ticker"]), year=int(r["year"]), ind=int(r["industry_id"]), oi=float(r["open_innov"]),
            P=float(r["ceo_promotion"]), F=float(r["bod_family"]), G=int(float(r["bod_politicalties"])),
            W=float(r["bod_female"]), T=float(r["bod_tenure"]),
            cP=float(r["c_ceo_promotion"]), cF=float(r["c_bod_family"]), cG=float(r["c_bod_politicalties"]),
            cW=float(r["c_bod_female"]), amp=float(r["amp_EG"]), B=float(r["B_EG"]), B_T1=float(r["B_T1"]),
            B_FE=float(r["B_FE"]), OIS=float(r["OIS"]), OIS_ind=float(r["OIS_ind"]), tier=int(r["tier"]),
            quad="ABCD"[int(r["quadrant"]) - 1], regime=r["regime"]))
assert len(ref_rows) == 928, len(ref_rows)

bands = {}
with (REF_DIR / "REF928_OIS_band_20261005.csv").open(encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        bands[(norm_t(r["ticker"]), int(r["year"]))] = [round(float(r["OIS_lo90"]), 1), round(float(r["OIS_hi90"]), 1)]
assert len(bands) == 928

# ---- 2. ตรวจว่าเครื่องคำนวณของเราให้ผลตรงกับ STATA ทุกแถว (parity check) -------------------------
REF_B = sorted(q8(r["B"]) for r in ref_rows)
REF_IND = {k: sorted(q8(r["B"]) for r in ref_rows if r["ind"] == k) for k in range(1, 8)}
REF_T1 = sorted(q8(r["B_T1"]) for r in ref_rows)
REF_P = sorted(q8(wins(r["P"], "P")) for r in ref_rows)
REF_AMP = sorted(q8(r["amp"]) for r in ref_rows)
bad = 0
for r in ref_rows:
    z = centred(r["P"], r["F"], r["G"], r["W"], r["T"])
    b = signal_b(z)
    o = ois_of(b, REF_B)
    if abs(b - r["B"]) > 1e-5 or abs(o - r["OIS"]) > 1e-6 or tier_of(o) != r["tier"] or quad_of(z["P"], amp_of(z)) != r["quad"] \
            or abs(ois_of(b, REF_IND[r["ind"]]) - r["OIS_ind"]) > 1e-6 or abs(z["P"] * amp_t1(z) - r["B_T1"]) > 1e-5:
        bad += 1
print("parity กับ REF928_scored: ผิด", bad, "/ 928 แถว")
assert bad == 0

# ---- 3. ตารางที่ 10 / ตัวเลขมุมช่อง / ρ รายอุตสาหกรรม (คำนวณซ้ำจาก REF-928) ---------------------
tq = defaultdict(list)
for r in ref_rows:
    tq[(r["tier"], r["quad"])].append(r["oi"])
T10 = {f"{t}{q}": [round(sum(v) / len(v), 2), len(v)] for (t, q), v in tq.items()}
qn = defaultdict(list)
for r in ref_rows:
    qn[r["quad"]].append(r["oi"])
QN = {q: [round(sum(v) / len(v), 2), len(v)] for q, v in qn.items()}
NK = [sum(1 for r in ref_rows if r["ind"] == k) for k in range(1, 8)]
print("T10", dict(sorted(T10.items())))
print("QN", dict(sorted(QN.items())), "nk928", NK)
assert T10["1A"] == [14.87, 151] and T10["2A"] == [13.28, 129] and T10["1C"] == [9.46, 81] and T10["2C"] == [7.0, 103]
assert T10["3B"] == [8.15, 86] and T10["4B"] == [8.9, 63] and T10["3D"] == [8.47, 145] and T10["4D"] == [6.88, 169]
# ค่าเดิมที่ hard-code ใน JS (A 14.11 / C 8.03) คลาดเล็กน้อย — ค่าที่คำนวณจาก REF-928 จริงคือ A 14.14 / C 8.04 (n ตรง)
assert [QN[q][1] for q in "ABCD"] == [280, 149, 185, 314]

# ρ รายอุตสาหกรรม (จาก Log_SignalB SECTION 6 matrix IND) — ใช้ตัดสินป้าย "หลักฐานอ่อน" R5
IND_VALID = {1: [135, 0.067, 0.443], 2: [135, 0.047, 0.589], 3: [140, 0.196, 0.020], 4: [143, 0.152, 0.071],
             5: [127, 0.246, 0.005], 6: [115, 0.287, 0.002], 7: [133, 0.193, 0.026]}
REGIME = {}
for r in ref_rows:
    REGIME[str(r["year"])] = r["regime"]
assert REGIME == {"2019": "PASS", "2020": "CAUTION", "2021": "PASS", "2022": "FAIL", "2023": "PASS"}

# ---- 4. จุด 928 จุดสำหรับพื้นหลัง 2×2 (ไม่มีชื่อบริษัท) ------------------------------------------
# [P หลัง winsorise, amp, quadrant, tier, อุตสาหกรรม, ปี, cF, cG, cW] — ใช้วาดพื้นหลังและให้คะแนนฐานใหม่ทุกรอบ Krinsky-Robb
PTS = [[round(wins(r["P"], "P"), 4), round(r["amp"], 6), r["quad"], r["tier"], r["ind"], r["year"],
        round(r["cF"], 6), round(r["cG"], 6), round(r["cW"], 6)] for r in ref_rows]

# ---- 5. ให้คะแนน 196 บริษัทในภาพปี 2566 เทียบฐาน REF-928 และเขียนกลับ prof_data.json -----------
ref23 = {(r["t"], r["year"]): r for r in ref_rows}
out_c, mism = {}, []
for c in COMPS:
    t = norm_t(c["t"])
    rr = ref23.get((t, 2023))
    if rr is not None:
        # prof_data เก็บค่าดิบปัดทศนิยม 3 ตำแหน่ง — แทนด้วยค่า full precision จาก REF-928 (ค่าเดียวกัน ยกเว้นค่าที่ถูก winsorise
        # ซึ่งคงค่าดิบไว้ให้ผู้ใช้เห็น; เครื่องคำนวณ clip ให้เองตาม E2)
        for k, rk in (("fam", "F"), ("fem", "W"), ("ten", "T"), ("promo", "P")):
            if abs(float(c[k]) - rr[rk]) < 0.001:
                c[k] = rr[rk]
        c["pol"] = rr["G"]
    z = centred(c["promo"], c["fam"], c["pol"], c["fem"], c["ten"])
    a = amp_of(z); b = signal_b(z); o = ois_of(b, REF_B)
    bt1 = z["P"] * amp_t1(z); ot1 = ois_of(bt1, REF_T1)
    band = bands.get((t, 2023))
    if rr is None or band is None:
        mism.append(t); continue
    if abs(o - rr["OIS"]) > 1e-3:
        mism.append(f"{t}:OIS {o:.3f} vs {rr['OIS']:.3f}")
    out_c[c["t"]] = dict(
        cP=round(z["P"], 12), cF=round(z["F"], 12), cG=round(z["G"], 12), cW=round(z["W"], 12),
        amp=round(a, 12), B=round(b, 12), ois=round(o, 4), oisInd=round(ois_of(b, REF_IND[c["ind"]]), 4),
        tier=tier_of(o), quad=quad_of(z["P"], a), band=band,
        t1=dict(B=round(bt1, 12), ois=round(ot1, 4), tier=tier_of(ot1), quad=quad_of(z["P"], amp_t1(z))),
        fy=2023, regime=REGIME["2023"])
    # ค่าที่หน้า UI ใช้ตรง ๆ (คำนวณใหม่จากฐาน REF-928 ด้วยนิยาม mid-rank)
    c["amp"] = round(a, 4)
    c["dp"] = round(ois_of(wins(c["promo"], "P"), REF_P), 1)
    c["ap"] = round(ois_of(a, REF_AMP), 1)
    c["ipi"] = round(o)
    for k in ("ipp", "iip"):
        c.pop(k, None)
print("บริษัทที่จับคู่กับ REF FY2566 ไม่ได้/ไม่ตรง:", mism)
assert not mism, mism

for k in ("means", "betas", "neutral", "refAmp", "refPromo", "validity"):
    DATA.pop(k, None)
DATA["panel"]["reference"] = "REF928-edit6-20260930"
DATA["panel"]["snapshot_note"] = "ภาพปี 2566 (196 บริษัท) ใช้แสดงรายชื่อ/เทียบคู่แข่ง; คะแนนทุกตัวเทียบฐาน REF-928"
PROF.write_text(json.dumps(DATA, ensure_ascii=False), encoding="utf-8")

# ---- 6. เขียน ois_model.json ---------------------------------------------------------------------
L = chol(VF)
data = dict(
    version=VERSION,
    note="ฐานอ้างอิง = REF-928 ที่ freeze แล้ว (928 firm-years / 209 บริษัท / FY2562–2566); "
         "ช่วง 90% ของบริษัทในฐานมาจากไฟล์ STATA; ค่าป้อนที่ผู้ใช้แก้จะคำนวณช่วงสดด้วย Krinsky-Robb ชุดเดียวกัน",
    par=dict(b1=B1, dF=DF, dG=DG, dW=DW, dT=DT, gT=G_T),
    mean=M, cut=CUT, chol=[[round(x, 10) for x in row] for row in L],
    reps=500, seed=20261005, tierCuts=list(TIER_CUTS), vth=VTH,
    zone=ZONE, quadName=QUAD_NAME, weakInd=sorted(WEAK_EVIDENCE_IND), critMass=CRITICAL_MASS_N,
    regime=REGIME, indValid=IND_VALID, t10=T10, qn=QN, nk928=NK,
    refB=REF_B,
    refInd={str(k): v for k, v in REF_IND.items()},
    refT1=REF_T1,
    refP=REF_P, refAmp=REF_AMP,
    pts=PTS,
    co=out_c,
)
(ROOT / "src" / "ois_model.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print("companies", len(out_c), "· size", round((ROOT / "src" / "ois_model.json").stat().st_size / 1024), "KB")
print("tier", sorted(Counter(v["tier"] for v in out_c.values()).items()))
print("quad", sorted(Counter(v["quad"] for v in out_c.values()).items()))
straddle = sum(1 for v in out_c.values() if tier_of(v["band"][0]) != tier_of(v["band"][1]))
print("band คร่อม tier", straddle, "/", len(out_c), "=", round(100 * straddle / len(out_c), 1), "%")

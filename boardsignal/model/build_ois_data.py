# -*- coding: utf-8 -*-
"""สร้าง src/ois_model.json — ชั้นข้อมูลของเครื่องคำนวณ Signal B (parameter card REF928-edit9-20261013 · MVP 1)

ฐานอ้างอิง = REF-928 edit9 (ref/REF928_scored_edit9_20261027.dta — ค่า double ตรงตาม STATA; ไม่มีไฟล์ .dta ใช้ .csv แทน
            ซึ่งพิมพ์ไว้ 16 หลัก ทำให้การนับ "เท่ากัน" ของ mid-rank สำหรับบริษัทนอกฐานคลาดได้เล็กน้อย)
ช่วง 90%   = ref/REF928_OIS_band_edit9_20261027.csv (Krinsky & Robb 500 ชุดจาก STATA) สำหรับบริษัทใน REF-928
ไฟล์ทั้งสองเป็นข้อมูล NDA — อยู่ใน ref/ ซึ่ง .gitignore ไว้ ห้าม commit

สิ่งที่ฝังลงไฟล์: ค่าคงที่ของสูตร ค่าเฉลี่ย จุดบีบ Cholesky ของ V̂f, ฐานอ้างอิงที่เรียงแล้ว (B_EG · B_T1 · amp_EG · amp_T1 ·
promotion · B_FULL · รายอุตสาหกรรม — ไม่มีชื่อบริษัท), จุด 928 จุดของพื้นหลัง 2×2 และคะแนนของ 196 บริษัทในภาพปี 2566
*** ข้อมูลชุดนี้เป็นความลับทางการค้า — ฉบับเซิร์ฟเวอร์ตัดออกทั้งหมด (build_v2.py --server) ***

สคริปต์นี้ให้คะแนน 196 บริษัทใน src/prof_data.json ใหม่เทียบ edit9 (amp / dp / ap / ipi) และบันทึกรุ่นไว้ที่ panel.reference
"""
import csv, json, math, sys
from collections import Counter, defaultdict
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ois_core import (VERSION, B1, DF, DG, DW, DT, G_T, SE_DW, M, CUT, VF, TIER_CUTS, VTH, ZONE, QUAD_NAME, DIV, JN_PROMO,
                      JN_PCT, KR_REPS, KR_SEED, FY_STATUS, FIN_IND, WEAK_EVIDENCE_IND, CRITICAL_MASS_N, chol_rounded,
                      centred, amp_of, amp_t1, amp_full, signal_b, ois_of, tier_of, quad_of, wins, draws, kr_q,
                      whatif_multiplier, w_star)

ROOT = Path(__file__).resolve().parent.parent
REF_DIR = ROOT / "ref"
SCORED = "REF928_scored_edit9_20261027"
BAND = "REF928_OIS_band_edit9_20261027.csv"
PROF = ROOT / "src" / "prof_data.json"
DATA = json.loads(PROF.read_text(encoding="utf-8"))
COMPS = DATA["comps"]

TICKER_FIX = {"1": "TRUE"}          # Excel แปลง "True" เป็น 1 ใน REF928 (DataDict เตือนไว้)
norm_t = lambda t: TICKER_FIX.get(str(t), str(t)).upper()


# ---- 1. อ่าน REF-928 edit9 --------------------------------------------------------------------------------
def load_rows():
    dta = REF_DIR / (SCORED + ".dta")
    if dta.exists():
        import pandas as pd
        d = pd.read_stata(dta, convert_categoricals=False)
        recs, src = d.to_dict("records"), "dta"
    else:
        with (REF_DIR / (SCORED + ".csv")).open(encoding="utf-8-sig") as f:
            recs, src = list(csv.DictReader(f)), "csv"
        print("คำเตือน: ไม่พบ .dta — ใช้ .csv (16 หลัก) การนับค่าเท่ากันของบริษัทนอกฐานอาจคลาดจาก STATA")
    rows = []
    for r in recs:
        rows.append(dict(
            t=norm_t(r["ticker"]), year=int(float(r["year"])), ind=int(float(r["industry_id"])), oi=float(r["open_innov"]),
            P=float(r["ceo_promotion"]), F=float(r["bod_family"]), G=int(float(r["bod_politicalties"])),
            W=float(r["bod_female"]), T=float(r["bod_tenure"]),
            cP=float(r["c_ceo_promotion"]), cF=float(r["c_bod_family"]), cG=float(r["c_bod_politicalties"]),
            cW=float(r["c_bod_female"]), cT=float(r["c_bod_tenure"]),
            amp=float(r["amp_EG"]), B=float(r["B_EG"]), B_T1=float(r["B_T1"]), B_FULL=float(r["B_FULL"]),
            B_FE=float(r["B_FE"]), OIS=float(r["OIS"]), OIS_ind=float(r["OIS_ind"]), tier=int(float(r["tier"])),
            quad="ABCD"[int(float(r["quadrant"])) - 1], regime=str(r["regime"]),
            xpct=float(r["ceo_drive_pct"]) if "ceo_drive_pct" in r else None,
            ypct=float(r["board_amp_pct"]) if "board_amp_pct" in r else None))
    return rows, src


ref_rows, SRC = load_rows()
assert len(ref_rows) == 928, len(ref_rows)
# ค่าจาก .csv ใช้ตรวจ parity ซ้ำอีกชั้น (ตามที่ส่งมอบ)
with (REF_DIR / (SCORED + ".csv")).open(encoding="utf-8-sig") as f:
    CSV = {(norm_t(r["ticker"]), int(r["year"])): r for r in csv.DictReader(f)}
assert len(CSV) == 928

bands = {}
with (REF_DIR / BAND).open(encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        bands[(norm_t(r["ticker"]), int(r["year"]))] = [round(float(r["OIS_lo90"]), 1), round(float(r["OIS_hi90"]), 1)]
assert len(bands) == 928

# ---- 2. ฐานอ้างอิงที่เรียงแล้ว — คำนวณจากค่าป้อนด้วยสูตรเดียวกับบริษัทนอกฐาน (ค่าเท่ากันทุกบิตเมื่อค่าป้อนเท่ากัน) ---------
for r in ref_rows:
    z = centred(r["P"], r["F"], r["G"], r["W"], r["T"])
    if SRC == "dta":
        assert z["P"] == r["cP"] and z["F"] == r["cF"] and z["G"] == r["cG"] and z["W"] == r["cW"], (r["t"], r["year"])
    r["z"] = z
    r["my_amp"] = amp_of(z)
    r["my_B"] = z["P"] * r["my_amp"]
    r["my_a1"] = amp_t1(z)
    r["my_B1"] = z["P"] * r["my_a1"]
    r["my_full"] = z["P"] * amp_full(z)
    r["Pw"] = wins(r["P"], "P")

REF_B = sorted(r["my_B"] for r in ref_rows)
REF_IND = {k: sorted(r["my_B"] for r in ref_rows if r["ind"] == k) for k in range(1, 8)}
REF_T1 = sorted(r["my_B1"] for r in ref_rows)
REF_P = sorted(r["Pw"] for r in ref_rows)
REF_AMP = sorted(r["my_amp"] for r in ref_rows)
REF_AMP_T1 = sorted(r["my_a1"] for r in ref_rows)
REF_FULL = sorted(r["my_full"] for r in ref_rows)

# ---- 3. parity กับ STATA ทุกแถว: amp / B ภายใน 1e-6 และ OIS / เปอร์เซ็นไทล์ภายใน 0.05 จุด ------------------------------
bad, worst = [], dict(amp=0.0, B=0.0, OIS=0.0, X=0.0, Y=0.0, csv_amp=0.0, csv_OIS=0.0)
for r in ref_rows:
    o = ois_of(r["my_B"], REF_B)
    x = ois_of(r["Pw"], REF_P)
    y = ois_of(r["my_amp"], REF_AMP)
    c = CSV[(r["t"], r["year"])]
    d = dict(amp=abs(r["my_amp"] - r["amp"]), B=abs(r["my_B"] - r["B"]), OIS=abs(o - r["OIS"]),
             X=abs(x - r["xpct"]) if r["xpct"] is not None else 0.0, Y=abs(y - r["ypct"]) if r["ypct"] is not None else 0.0,
             csv_amp=abs(r["my_amp"] - float(c["amp_EG"])), csv_OIS=abs(o - float(c["OIS"])))
    for k, v in d.items():
        worst[k] = max(worst[k], v)
    if d["amp"] > 1e-6 or d["B"] > 1e-6 or d["OIS"] > 0.05 or d["X"] > 0.05 or d["Y"] > 0.05 or d["csv_amp"] > 1e-6 \
            or d["csv_OIS"] > 0.05 or tier_of(o) != r["tier"] or quad_of(r["z"]["P"], r["my_amp"]) != r["quad"] \
            or abs(ois_of(r["my_B"], REF_IND[r["ind"]]) - r["OIS_ind"]) > 0.05 or abs(r["my_B1"] - r["B_T1"]) > 1e-6 \
            or abs(r["my_full"] - r["B_FULL"]) > 1e-6:
        bad.append((r["t"], r["year"]))
print(f"parity กับ {SCORED}.{SRC} (+ csv): ผิด {len(bad)} / 928 แถว · ค่าคลาดสูงสุด",
      {k: float(f"{v:.3g}") for k, v in worst.items()})
assert not bad, bad[:10]

# ---- 4. ตารางที่ 10 / มุมช่อง / ตัวเลขตรวจของ card ---------------------------------------------------------------------
tq = defaultdict(list)
for r in ref_rows:
    tq[(r["tier"], r["quad"])].append(r["oi"])
T10 = {f"{t}{q}": [round(sum(v) / len(v), 2), len(v)] for (t, q), v in tq.items()}
qn = defaultdict(list)
for r in ref_rows:
    qn[r["quad"]].append(r["oi"])
QN = {q: [round(sum(v) / len(v), 2), len(v)] for q, v in qn.items()}
NK = [sum(1 for r in ref_rows if r["ind"] == k) for k in range(1, 8)]
print("QN", dict(sorted(QN.items())), "nk928", NK)
assert [QN[q][1] for q in "ABCD"] == [280, 149, 185, 314]           # test cases: quadrant_counts_REF928
assert [QN[q][0] for q in "ABCD"] == [14.14, 8.47, 8.04, 7.61]      # paper Table 5
# เส้นแบ่งในหน่วยเปอร์เซ็นไทล์ (card: X 53.8 · Y B_EG 36.0 · Y B_T1 38.3) และ JN gate (P65.7)
xdiv = 100 * sum(1 for r in ref_rows if r["P"] < M["P"]) / 928
ydiv = 100 * sum(1 for r in ref_rows if r["my_amp"] < 0) / 928
ydiv1 = 100 * sum(1 for r in ref_rows if r["my_a1"] < 0) / 928
jnp = 100 * sum(1 for r in ref_rows if r["P"] < JN_PROMO) / 928
print("dividers", round(xdiv, 1), round(ydiv, 1), round(ydiv1, 1), "JN pct", round(jnp, 1))
assert (round(xdiv, 1), round(ydiv, 1), round(ydiv1, 1), round(jnp, 1)) == (DIV["x"], DIV["yEG"], DIV["yT1"], JN_PCT)

IND_VALID = {1: [135, 0.068, 0.436], 2: [135, 0.047, 0.592], 3: [140, 0.196, 0.020], 4: [143, 0.152, 0.070],
             5: [127, 0.246, 0.005], 6: [115, 0.287, 0.002], 7: [133, 0.193, 0.026]}   # Log_SignalB_edit9 SECTION 6
REGIME = {}
for r in ref_rows:
    REGIME[str(r["year"])] = r["regime"]
assert REGIME == {str(k): v for k, v in FY_STATUS.items()}, REGIME

# ---- 5. จุด 928 จุดของพื้นหลัง 2×2 (ไม่มีชื่อบริษัท) — [P หลังบีบ, amp, quad, tier, ind, ปี, cF, cG, cW] ------------------
PTS = [[r["Pw"], r["my_amp"], r["quad"], r["tier"], r["ind"], r["year"], r["z"]["F"], r["z"]["G"], r["z"]["W"]]
       for r in ref_rows]
HIST_W = 0.05
def _hist(vals):
    h = [0] * 20
    for v in vals:
        h[min(19, max(0, int(v / HIST_W + 1e-9)))] += 1
    return h
HIST = dict(w=HIST_W, W=_hist(r["W"] for r in ref_rows), F=_hist(r["F"] for r in ref_rows))

# ---- 6. ให้คะแนน 196 บริษัทในภาพปี 2566 เทียบ edit9 และเขียนกลับ prof_data.json -------------------------------------------
ref23 = {(r["t"], r["year"]): r for r in ref_rows}
out_c, mism = {}, []
for c in COMPS:
    t = norm_t(c["t"])
    rr = ref23.get((t, 2023))
    if rr is None or (t, 2023) not in bands:
        mism.append(t); continue
    # ค่าป้อนของบริษัทใน REF = ค่าเดียวกับฐาน (double) — prof_data เก็บ 3–4 ตำแหน่ง จึงแทนด้วยค่าจริงเมื่อห่างกัน < 0.001
    for k, rk in (("fam", "F"), ("fem", "W"), ("ten", "T"), ("promo", "P")):
        if abs(float(c[k]) - rr[rk]) < 0.001:
            c[k] = rr[rk]
    c["pol"] = rr["G"]
    z = centred(c["promo"], c["fam"], c["pol"], c["fem"], c["ten"])
    a = amp_of(z); b = z["P"] * a; o = ois_of(b, REF_B)
    a1 = amp_t1(z); bt1 = z["P"] * a1; ot1 = ois_of(bt1, REF_T1)
    bfull = z["P"] * amp_full(z); ofull = ois_of(bfull, REF_FULL)
    if abs(o - rr["OIS"]) > 1e-9 or b != rr["my_B"]:
        mism.append(f"{t}:OIS {o:.3f} vs {rr['OIS']:.3f}")
    band = bands[(t, 2023)]
    out_c[c["t"]] = dict(
        cP=z["P"], cF=z["F"], cG=z["G"], cW=z["W"], amp=a, B=b,
        ois=round(o, 4), oisInd=round(ois_of(b, REF_IND[c["ind"]]), 4),
        tier=tier_of(o), quad=quad_of(z["P"], a), band=band,
        t1=dict(B=bt1, ois=round(ot1, 4), tier=tier_of(ot1), quad=quad_of(z["P"], a1),
                ap=round(ois_of(a1, REF_AMP_T1), 1)),
        full=dict(ois=round(ofull, 4), tier=tier_of(ofull)),
        fy=2023, regime=REGIME["2023"])
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
DATA["panel"]["reference"] = VERSION
DATA["panel"]["snapshot_note"] = "ภาพปี 2566 (196 บริษัท) ใช้แสดงรายชื่อ/เทียบคู่แข่ง; คะแนนทุกตัวเทียบฐาน REF-928 edit9"
PROF.write_text(json.dumps(DATA, ensure_ascii=False), encoding="utf-8")

# ---- 7. ตรวจกรณีทดสอบของ DevPack (Client C S0–S4 + B_T1 shadow, Firm K) ด้วยเครื่องคำนวณอ้างอิงตัวนี้ ------------------
KR = draws()
KR_REF = [sorted(r["z"]["P"] * (t[0] + t[1] * r["z"]["F"] + t[2] * r["z"]["G"] + t[3] * r["z"]["W"]) for r in ref_rows)
          for t in KR]
KR_REF1 = [sorted(r["z"]["P"] * (t[0] + t[3] * r["z"]["W"]) for r in ref_rows) for t in KR]


def score(p, f, g, w):
    z = centred(p, f, g, w)
    a = amp_of(z); b = z["P"] * a; a1 = amp_t1(z)
    bd = kr_q(sorted(ois_of(z["P"] * (t[0] + t[1] * z["F"] + t[2] * z["G"] + t[3] * z["W"]), R) for t, R in zip(KR, KR_REF)))
    bd1 = kr_q(sorted(ois_of(z["P"] * (t[0] + t[3] * z["W"]), R) for t, R in zip(KR, KR_REF1)))
    return dict(cP=z["P"], W=wins(w, "W"), amp=a, X=ois_of(wins(p, "P"), REF_P), Y=ois_of(a, REF_AMP), ois=ois_of(b, REF_B),
                band=bd, quad=quad_of(z["P"], a), a1=a1, Y1=ois_of(a1, REF_AMP_T1), o1=ois_of(z["P"] * a1, REF_T1),
                band1=bd1, quad1=quad_of(z["P"], a1))


tc = json.loads((ROOT.parent / ".." / "in" / "mvp1" / "OpenInnoScore_MVP1_DevPack_20261102" / "03_Test_Cases" /
                 "OpenInnoScore_MVP1_test_cases_20261102.json").resolve().read_text(encoding="utf-8")) \
    if (ROOT.parent / ".." / "in").exists() else None
if tc:
    cc = next(x for x in tc["cases"] if x["id"] == "CLIENT_C")
    i = cc["inputs"]; s0 = score(i["promotion"], i["family_share"], i["political_ties"], i["women"] / i["board_size"])
    for sc in cc["expected"]["scenarios"]:
        r = score(i["promotion"], i["family_share"], i["political_ties"], sc["female_share"] if sc["scenario"] == "S4"
                  else {"S0": 2 / 9, "S1": 3 / 9, "S2": 3 / 10, "S3": 3 / 9}[sc["scenario"]])
        dB, mult, mb = whatif_multiplier(r["cP"], r["W"] - s0["W"])
        sh = sc["shadow_B_T1"]
        line = dict(amp=(r["amp"], sc["amp_EG"], .0005), X=(r["X"], sc["X_pct"], .1), Y=(r["Y"], sc["Y_pct"], .1),
                    OIS=(r["ois"], sc["OIS"], .1), Y1=(r["Y1"], sh["Y_pct_T1"], .1), OIS1=(r["o1"], sh["OIS_T1"], .1),
                    amp1=(r["a1"], sh["amp_T1"], .0005))
        if sc["multiplier_vs_S0"]:
            line.update(mult=(mult, sc["multiplier_vs_S0"], .001), mlo=(mb[0], sc["multiplier_band90"][0], .001),
                        mhi=(mb[1], sc["multiplier_band90"][1], .001))
        fails = {k: (round(a, 4), e) for k, (a, e, tol) in line.items() if abs(a - e) > tol + 1e-9}
        assert r["quad"] == sc["quadrant"][0] and r["quad1"] == sh["quadrant_T1"][0], sc["scenario"]
        print(f"Client C {sc['scenario']}: point values OK" if not fails else f"Client C {sc['scenario']}: FAIL {fails}",
              "· band", [round(x, 1) for x in r["band"]], "vs", sc["OIS_band90"],
              "· band T1", [round(x, 1) for x in r["band1"]], "vs", sh["OIS_T1_band90"])
        assert not fails
    ws = w_star(s0["W"], s0["amp"]); assert abs(ws - cc["expected"]["W_star"]) < .0005, ws
    assert abs(M["W"] - B1 / DW - cc["expected"]["W_star_T1"]) < .0005
    fk = next(x for x in tc["cases"] if x["id"] == "FIRM_K")
    i = fk["inputs"]; k0 = score(i["promotion"], i["family_share"], i["political_ties"], i["women"] / i["board_size"])
    k3 = score(i["promotion"], i["family_share"], i["political_ties"], 3 / i["board_size"])
    _, mk, mbk = whatif_multiplier(k0["cP"], k3["W"] - k0["W"])
    e = fk["expected"]
    assert abs(k0["ois"] - e["S0"]["OIS"]) <= .1 and abs(k0["X"] - e["S0"]["X_pct"]) <= .1 and abs(k0["Y"] - e["S0"]["Y_pct"]) <= .1
    assert k0["quad"] == "B" and tier_of(k0["ois"]) == 4 and k3["quad"] == "A"
    assert abs(mk - e["3_of_10"]["multiplier_vs_S0"]) <= .001 and all(abs(a - b) <= .001 for a, b in zip(mbk, e["3_of_10"]["multiplier_band90"]))
    assert abs(w_star(k0["W"], k0["amp"]) - e["W_star"]) < .0005
    print("Firm K: OK · band", [round(x, 1) for x in k0["band"]], "vs", e["S0"]["OIS_band90"])

# ---- 8. เขียน ois_model.json -------------------------------------------------------------------------------------------------
data = dict(
    version=VERSION,
    note="ฐานอ้างอิง = REF-928 edit9 (928 firm-years / 209 บริษัท / FY2019–2023 · Model 3 RE-NB); "
         "ช่วง 90% ของบริษัทในฐานมาจากไฟล์ STATA; ค่าป้อนอื่นคำนวณสดด้วย Krinsky–Robb 500 ชุด (seed 20261026, ตัวสุ่มของระบบ)",
    par=dict(b1=B1, dF=DF, dG=DG, dW=DW, dT=DT, gT=G_T, seW=SE_DW),
    mean=M, cut=CUT, chol=chol_rounded(),
    reps=KR_REPS, seed=KR_SEED, tierCuts=list(TIER_CUTS), vth=VTH,
    zone=ZONE, quadName=QUAD_NAME, weakInd=sorted(WEAK_EVIDENCE_IND), critMass=CRITICAL_MASS_N,
    regime=REGIME, fyStatus={str(k): v for k, v in FY_STATUS.items()}, div=DIV, jn=dict(p=JN_PROMO, pct=JN_PCT),
    finInd=FIN_IND, indValid=IND_VALID, t10=T10, qn=QN, nk928=NK,
    refB=REF_B, refInd={str(k): v for k, v in REF_IND.items()}, refT1=REF_T1,
    refP=REF_P, refAmp=REF_AMP, refAmpT1=REF_AMP_T1, refFull=REF_FULL, hist=HIST,
    pts=PTS, co=out_c,
)
(ROOT / "src" / "ois_model.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print("companies", len(out_c), "· size", round((ROOT / "src" / "ois_model.json").stat().st_size / 1024), "KB")
print("tier", sorted(Counter(v["tier"] for v in out_c.values()).items()))
print("quad", sorted(Counter(v["quad"] for v in out_c.values()).items()))
straddle = sum(1 for v in out_c.values() if tier_of(v["band"][0]) != tier_of(v["band"][1]))
print("band คร่อม tier", straddle, "/", len(out_c), "=", round(100 * straddle / len(out_c), 1), "%")
# KR ของระบบกับไฟล์ band ของ STATA (บริษัทใน REF — ตัวสุ่มคนละชุด): ค่าคลาดเฉลี่ย/สูงสุด
dl = []
for r in ref_rows[::8]:
    z = r["z"]
    bd = kr_q(sorted(ois_of(z["P"] * (t[0] + t[1] * z["F"] + t[2] * z["G"] + t[3] * z["W"]), R) for t, R in zip(KR, KR_REF)))
    sb = bands[(r["t"], r["year"])]
    dl += [abs(bd[0] - sb[0]), abs(bd[1] - sb[1])]
print("KR ระบบ vs STATA band (116 แถว): |Δ| เฉลี่ย", round(sum(dl) / len(dl), 2), "· มัธยฐาน", round(sorted(dl)[len(dl) // 2], 2),
      "· สูงสุด", round(max(dl), 2))

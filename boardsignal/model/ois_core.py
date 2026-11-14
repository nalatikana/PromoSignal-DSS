# -*- coding: utf-8 -*-
"""เครื่องคำนวณอ้างอิง Signal B / OpenInnoScore — parameter card REF928-edit9-20261013 (MVP 1)
   ใช้ตรวจความถูกต้องของชั้นคำนวณฝั่งเบราว์เซอร์/เซิร์ฟเวอร์ และสร้าง src/ois_model.json
   ที่มา: parameters_REF928-edit9-20261013.json (ค่าปัด 7 หลัก) + REF928_scored_edit9_20261027 (.dta/.csv)
          + Log_SignalB_edit9_20261027.log (sb_Vf) + OI_WhatIf_ClientC_OutOfREF_edit9_20261102.do (S0f, sb_whatif, sb_robust,
          sb_clientcheck) — ความลับทางการค้า: ค่าในไฟล์นี้เป็นข้อมูลหลังบ้าน ส่งภายใต้ NDA เท่านั้น ห้ามพิมพ์ลงหน้าจอ/รายงาน
   หมายเหตุความละเอียด: ใช้ double ตรงตาม STATA ทุกตัว (ไม่ปัด q8 แล้ว) เพื่อให้การนับ "เท่ากัน" ของ mid-rank
          ตรงกับ do-file ทั้งแถวในฐานและบริษัทนอกฐาน (เช่น Client C · Y_T1 ที่ 3/10 = P75.5) """
import math

VERSION = "REF928-edit9-20261013"

# 4.2 สัมประสิทธิ์ Model 3 (RE-NB, N 928) — full precision กู้คืนจาก amp_EG / B_FULL / B_FE ของ REF928_scored_edit9 (.dta)
#     ด้วย least squares (error < 1e-15) · ปัดแล้วเท่ากับ parameter card: 0.2104441 / −0.9846957 / 0.4204373 / 3.724704 / −0.0029338
B1, DF, DG, DW = 0.21044406967022883, -0.9846957435130118, 0.42043726242492063, 3.72470443801023
DT = -0.0029338486578205625                 # ประมาณได้แต่ไม่ใช้ (evidence gate) — ใช้เฉพาะ B_FULL (การวิเคราะห์ความไว)
G_T = 0.0
SE_DW = 0.6425795                           # SE ของ δW (card) — ใช้ในช่วง 90% ของตัวคูณ What-if
GW, SE_GW = 0.0661486, 0.2921602            # ผลหลักของสัดส่วนกรรมการหญิง (ใช้คำนวณ JN ใน do-file เท่านั้น)

# สัมประสิทธิ์ FE-Poisson (สูตรทางเลือก B_FE — robustness เท่านั้น)
FE_B1, FE_DF, FE_DG, FE_DW = 0.2640368867068944, -0.9108635136891414, 0.2180196979188176, 4.146289594254922

# 4.1 ค่าเฉลี่ย centring = summarize ของ REF-928 (double เดียวกับ STATA: x − c_x ของทุกแถวเท่ากันหมดทุกบิต)
M = dict(P=0.5709006465517241, F=0.23133111520550648, G=0.6196120689655172, W=0.21586477866214787, T=9.563887607758621)
# S0f · ค่าป้อนถูกบีบเข้าช่วง min–max ของ REF-928 ก่อน centring (ข้อมูล REF ผ่าน winsorise 5/95 แล้ว จึงเท่ากับจุดตัดเดิม)
CUT = dict(P=(0.1037, 1.1500), F=(0.0000, 0.6127), W=(0.0000, 0.5000), T=(2.2000, 19.5200))

# 4.3 covariance ของ (β1, δF, δG, δW) — sb_Vf[1..4,1..4] ใน Log_SignalB_edit9_20261027.log (%10.6f)
VF = [
    [0.006567,  0.000422, -0.001704,  0.003437],
    [0.000422,  0.232100, -0.010067, -0.095648],
    [-0.001704, -0.010067, 0.028884,  0.000428],
    [0.003437, -0.095648,  0.000428,  0.412908],
]

# Krinsky–Robb (card): 500 ชุดของ (b1, bF, bG, bW), seed 20261026, เปอร์เซ็นไทล์ที่ 5–95
KR_REPS, KR_SEED = 500, 20261026
Z90 = 1.6448536269514722                    # invnormal(0.95) — STATA ใช้ค่านี้ในช่วงของตัวคูณ (card เขียน 1.645)

TIER_CUTS = (75.0, 50.0, 25.0)
QUAD_NAME = {"A": "Amplified drive", "B": "Constrained drive",
             "C": "Consistent restraint", "D": "Untapped board"}
ZONE = {"A": "Deliver", "B": "Discipline", "C": "Develop", "D": "Discover"}

# เส้นแบ่ง 4D ในหน่วยเปอร์เซ็นไทล์ (card) · JN gate (G3)
DIV = dict(x=53.8, yEG=36.0, yT1=38.3)
JN_PROMO, JN_PCT = 0.6858, 65.7

IN_DOMAIN_IND = {1, 2, 3, 4, 5, 6, 7}       # R4 / D2: นอกกลุ่มนี้ (กลุ่มธุรกิจการเงิน = 8) → Board Profile เท่านั้น
FIN_IND = 8                                 # ตัวเลือก "กลุ่มธุรกิจการเงิน (Financials)" — REF-928 ไม่มีบริษัทกลุ่มนี้
WEAK_EVIDENCE_IND = {1, 2}                  # R5
CRITICAL_MASS_N = 3                         # Torchia, Calabrò & Huse (2011) — นับคน ไม่ใช่สัดส่วน (D3)

# สถานะปีบัญชี (ตารางที่ 6 / validity do-file) · ปีหลัง 2023 = ยังไม่ตรวจความตรง
FY_STATUS = {2019: "PASS", 2020: "CAUTION", 2021: "PASS", 2022: "FAIL", 2023: "PASS"}
VTH = dict(sp=(0.15, 0.05), auc=(0.60, 0.55), lift=(2.0, 1.3))


def fy_ce(fy):
    """รับปี ค.ศ. หรือ พ.ศ. → ค.ศ."""
    fy = int(fy)
    return fy - 543 if fy > 2400 else fy


def fy_status(fy):
    fy = fy_ce(fy)
    return FY_STATUS.get(fy, "NYV")


def wins(x, k):
    lo, hi = CUT[k]
    return min(max(x, lo), hi)


def clipped(x, k):
    lo, hi = CUT[k]
    return x < lo or x > hi


def centred(P, F, G, W, T=None):
    """E2 + E3 (S0f) — บีบเข้าช่วง min–max แล้วลบค่าเฉลี่ย REF-928 (G เป็น 0/1)"""
    G = 1 if G else 0
    c = dict(P=wins(P, "P") - M["P"], F=wins(F, "F") - M["F"], G=G - M["G"], W=wins(W, "W") - M["W"])
    if T is not None:
        c["T"] = wins(T, "T") - M["T"]
    return c


def amp_of(c, th=None):
    """E4 — amp = b1 + bF·cF + bG·cG + bW·cW (ลำดับการบวกเดียวกับ do-file)"""
    b1, dF, dG, dW = th or (B1, DF, DG, DW)
    return b1 + dF * c["F"] + dG * c["G"] + dW * c["W"]


def amp_t1(c):
    """B_T1 (Robust mode · H1 + H4) — amp_T1 = b1 + bW·cW"""
    return B1 + DW * c["W"]


def amp_full(c):
    return B1 + DF * c["F"] + DG * c["G"] + DW * c["W"] + DT * c["T"]


def amp_fe(c):
    return FE_B1 + FE_DF * c["F"] + FE_DG * c["G"] + FE_DW * c["W"]


def signal_b(c, th=None):
    return c["P"] * amp_of(c, th)


def q8(x):
    """คงชื่อเดิมไว้ — edit9 ใช้ค่าจริงทุกบิต (ไม่ปัด) ตามนิยาม mid-rank ของ do-file"""
    return x


def ois_of(b, ref_sorted):
    """E7 — mid-rank percentile: 100 × [#(ref < b) + 0.5 × #(ref = b)] / n"""
    n = len(ref_sorted)
    lo = _bisect_left(ref_sorted, b)
    hi = _bisect_right(ref_sorted, b)
    return 100.0 * (lo + 0.5 * (hi - lo)) / n


mid_rank = lambda ref_sorted, v: ois_of(v, ref_sorted)


def _bisect_left(a, x):
    lo, hi = 0, len(a)
    while lo < hi:
        m = (lo + hi) // 2
        if a[m] < x: lo = m + 1
        else: hi = m
    return lo


def _bisect_right(a, x):
    lo, hi = 0, len(a)
    while lo < hi:
        m = (lo + hi) // 2
        if a[m] <= x: lo = m + 1
        else: hi = m
    return lo


def tier_of(ois):
    if ois >= TIER_CUTS[0]: return 1
    if ois >= TIER_CUTS[1]: return 2
    if ois >= TIER_CUTS[2]: return 3
    return 4


def quad_of(cP, amp):
    if cP >= 0: return "A" if amp >= 0 else "B"
    return "D" if amp >= 0 else "C"


def in_domain(ind):
    return ind in IN_DOMAIN_IND


def female_n(W, board_size):
    if not board_size:
        return None
    return int(round(W * board_size))


def chol(V):
    n = len(V)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                L[i][j] = math.sqrt(max(V[i][i] - s, 0.0))
            else:
                L[i][j] = (V[i][j] - s) / L[j][j]
    return L


class LCG:
    """ตัวสุ่มแบบกำหนดผลซ้ำได้ (Park–Miller 48271 + Box–Muller) — Python, JS และเซิร์ฟเวอร์ได้ชุดเดียวกันทุกบิต
       หมายเหตุ: STATA drawnorm (mt64 + วิธี rectangle-wedge-tail ของ Knuth) ทำซ้ำนอก STATA ไม่ได้ ชุด θ จึงเป็นคนละชุด
       ช่วง 90% ของบริษัทนอกฐานที่คำนวณสดจึงต่างจาก log ของ STATA ได้ (Monte Carlo ~±2 จุดเปอร์เซ็นไทล์ ที่ 500 ชุด) —
       บริษัทใน REF-928 ใช้ช่วงจากไฟล์ REF928_OIS_band_edit9_20261027 โดยตรง"""
    def __init__(self, seed):
        self.s = seed % 2147483647 or 1

    def u(self):
        self.s = (self.s * 48271) % 2147483647
        return self.s / 2147483647.0

    def n(self):
        u1 = max(self.u(), 1e-12); u2 = self.u()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


def chol_rounded():
    return [[round(x, 10) for x in row] for row in chol(VF)]


def draws(reps=KR_REPS, seed=KR_SEED, L=None):
    """E11 — θ^(r) ~ N(θ̂, V̂f) แบบ Krinsky & Robb (1986) (ลำดับการบวกเดียวกับ JS/เซิร์ฟเวอร์)"""
    L, g, out = L or chol_rounded(), LCG(seed), []
    mu = (B1, DF, DG, DW)
    for _ in range(reps):
        z = [g.n() for _ in range(4)]
        row = []
        for i in range(4):
            acc = 0
            for k in range(i + 1):
                acc = acc + L[i][k] * z[k]
            row.append(mu[i] + acc)
        out.append(tuple(row))
    return out


def kr_q(sorted_vals):
    """ตำแหน่งเปอร์เซ็นไทล์แบบ wi_kr ใน do-file: ois[ceil(.05R)], ois[ceil(.95R)] (นับจาก 1)"""
    R = len(sorted_vals)
    return sorted_vals[max(1, math.ceil(0.05 * R)) - 1], sorted_vals[min(R, math.ceil(0.95 * R)) - 1]


# ---- ฟังก์ชัน MVP 1 (อ้างอิงฝั่ง Python — ตรงกับ window.SCORE_FIRM / MVP_WHATIF และ server/ois_engine.py) ----------------
def whatif_multiplier(cP, dW):
    dB = cP * DW * dW
    lo = cP * dW * (DW - Z90 * SE_DW)
    hi = cP * dW * (DW + Z90 * SE_DW)
    return dB, math.exp(dB), (math.exp(min(lo, hi)), math.exp(max(lo, hi)))


def w_star(W, amp):
    """สัดส่วนกรรมการหญิงที่ amp = 0 (W* = W − amp/bW) — W คือค่าหลังบีบเข้าช่วง"""
    return W - amp / DW

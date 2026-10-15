# -*- coding: utf-8 -*-
"""เครื่องคำนวณอ้างอิง Signal B / OpenInnoScore (REF928-edit6-20260930) — แก้ไขครั้งที่ 2
   ใช้ตรวจความถูกต้องของชั้นคำนวณฝั่งเบราว์เซอร์ และสร้าง src/ois_model.json
   ตัวเลขทุกตัวมาจาก parameter card ที่ freeze แล้ว (DataDict sheet Parameters_REF928
   และ Log_SignalB_20261005.log SECTION 8) — ตรงกับ do-file OI_SignalB_OpenInnoScore_Validity_20261005.do
   ความลับทางการค้า: parameter card และ V̂f เป็นข้อมูลหลังบ้าน ส่งภายใต้ NDA เท่านั้น """
import math

VERSION = "REF928-edit6-20260930"

# 4.2 สัมประสิทธิ์ — ค่า full precision ของ STATA (กู้คืนจาก REF928_scored ด้วย least squares, error < 2e-15)
#     ปัดเศษแล้วเท่ากับ parameter card: 0.2105715 / −0.9841339 / 0.4200338 / 3.7251273 / −0.0029792
B1, DF, DG, DW, DT = 0.21057146120531062, -0.984133947415738, 0.4200338107991572, 3.7251272590068254, -0.002979176650683253
G_T = 0.0                                  # evidence gate — H5 ถูกตัด (p = .856 ทุกคอลัมน์ Table 3)

# สัมประสิทธิ์ FE-Poisson (ใช้เฉพาะสูตรทางเลือก B_FE — ไม่ใช้ใน headline)
FE_B1, FE_DF, FE_DG, FE_DW = 0.2640116497478665, -0.9119330764713862, 0.21793545420404692, 4.147215428227454

# 4.1 ค่าเฉลี่ยหลัง winsorise ของ REF-928 (full precision = X − c_X ใน REF928_scored; ปัดเศษ = SECTION 8 ของ log)
M = dict(P=0.5709006465517241, F=0.2313311152055065, G=0.6196120689655171, W=0.2158647786621479, T=9.563887607758621)
# จุดตัด winsorise 5/95 (G ไม่ winsorise)
CUT = dict(P=(0.1037, 1.1500), F=(0.0000, 0.6127), W=(0.0000, 0.5000), T=(2.2000, 19.5200))

# 4.3 covariance ของ (β1, δF, δG, δW) — ค่าจาก e(V) ของ STATA (sb_Vf[1..4,1..4] ใน Log_SignalB_20261005.log)
VF = [
    [0.006566,  0.000418, -0.001703,  0.003431],
    [0.000418,  0.232068, -0.010046, -0.095671],
    [-0.001703, -0.010046, 0.028880,  0.000440],
    [0.003431, -0.095671,  0.000440,  0.412901],
]

TIER_CUTS = (75.0, 50.0, 25.0)
QUAD_NAME = {"A": "Amplified drive", "B": "Constrained drive",
             "C": "Consistent restraint", "D": "Untapped board"}
# ชื่อโซนบนหน้ารายงาน (Board Strategy Compass) — mapping ที่ใช้ในต้นแบบ รอคุณปูลมยืนยัน
ZONE = {"A": "Deliver", "B": "Discipline", "C": "Develop", "D": "Discover"}

IN_DOMAIN_IND = {1, 2, 3, 4, 5, 6, 7}     # R4: นอกกลุ่มนี้ (เช่น ธนาคาร/การเงิน) = out of domain
WEAK_EVIDENCE_IND = {1, 2}                 # R5: ρ ไม่ต่างจากศูนย์ (ตาราง IND ใน log: ind 4 p = .071 — รอตัดสินใจ)
CRITICAL_MASS_N = 3                        # Table 4: ผลของกรรมการหญิงมีนัยเมื่อ ≥ 3 คน (จำนวนคน ไม่ใช่ %)

# กติกา validity (project rule 24 Aug 2026)
VTH = dict(sp=(0.15, 0.05), auc=(0.60, 0.55), lift=(2.0, 1.3))


def wins(x, k):
    lo, hi = CUT[k]
    return min(max(x, lo), hi)


def clipped(x, k):
    """True ถ้าค่าป้อนอยู่นอกช่วง p5–p95 ของ REF-928 (ถูก clip ก่อนเข้าสูตร — C5)"""
    lo, hi = CUT[k]
    return x < lo or x > hi


def centred(P, F, G, W, T=None):
    """E2 + E3 — winsorise แล้วลบค่าเฉลี่ย REF-928 (G ไม่ winsorise; G ต้องเป็น 0/1)"""
    G = 1 if G else 0
    c = dict(P=wins(P, "P") - M["P"], F=wins(F, "F") - M["F"],
             G=G - M["G"], W=wins(W, "W") - M["W"])
    if T is not None:
        c["T"] = wins(T, "T") - M["T"]
    return c


def amp_of(c, th=None):
    """E4 — ความชันของ promotion focus ภายใต้องค์ประกอบบอร์ดนี้ (B_EG)"""
    b1, dF, dG, dW = th or (B1, DF, DG, DW)
    a = b1 + dF * c["F"] + dG * c["G"] + dW * c["W"]
    if G_T and "T" in c:
        a += G_T * DT * c["T"]
    return a


def amp_t1(c):
    """สูตรทางเลือก B_T1 — ใช้เฉพาะ H1 + H4 (β1 + δW·cW) ตามแนวทาง Pilot Use case 2 (ป้าย Caution)"""
    return B1 + DW * c["W"]


def amp_full(c):
    """สูตรทางเลือก B_FULL — คืนเทอมอายุงาน (δT·cT) ที่ evidence gate ปิดไว้ใน headline
    ใช้เฉพาะการวิเคราะห์ความไว (What-if อายุงาน) — คะแนนหลัก B_EG ไม่เปลี่ยน · ตรงกับคอลัมน์ B_FULL ของ REF928_scored
    (ตรวจแล้วทุกแถว |Δ| < 1e-15)"""
    return B1 + DF * c["F"] + DG * c["G"] + DW * c["W"] + DT * c["T"]


def amp_fe(c):
    """สูตรทางเลือก B_FE — สัมประสิทธิ์ FE-Poisson (robustness)"""
    return FE_B1 + FE_DF * c["F"] + FE_DG * c["G"] + FE_DW * c["W"]


def signal_b(c, th=None):
    """E5 — B = cP × amp"""
    return c["P"] * amp_of(c, th)


Q = 8          # ปัดทศนิยมก่อนจัดอันดับ เพื่อให้แถวที่ "เท่ากัน" ในฐานนับเป็นเท่ากันจริง (ค่าคงที่ปัดเศษ ~1e-8)
q8 = lambda x: round(x, Q)


def ois_of(b, ref_sorted):
    """E7 — mid-rank percentile (0–100): 100 × [#(ref < b) + 0.5 × #(ref = b)] / n
       ref_sorted ต้องผ่าน q8 มาแล้ว"""
    n = len(ref_sorted)
    b = q8(b)
    lo = _bisect_left(ref_sorted, b)
    hi = _bisect_right(ref_sorted, b)
    return 100.0 * (lo + 0.5 * (hi - lo)) / n


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
    """E9 — 1 = บนสุด"""
    if ois >= TIER_CUTS[0]: return 1
    if ois >= TIER_CUTS[1]: return 2
    if ois >= TIER_CUTS[2]: return 3
    return 4


def quad_of(cP, amp):
    """E10"""
    if cP >= 0: return "A" if amp >= 0 else "B"
    return "D" if amp >= 0 else "C"


def in_domain(ind):
    """R4 — ใช้ได้เฉพาะ SET นอกกลุ่มการเงิน อุตสาหกรรม 1–7"""
    return ind in IN_DOMAIN_IND


def female_n(W, board_size):
    """จำนวนกรรมการหญิง = round(ratio × board size) — นิยามเดียวกับ STATA (Table 4 critical mass)"""
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
    """ตัวสุ่มแบบกำหนดผลซ้ำได้ (seed 20261005) เพื่อให้ Python กับ JS ได้ตัวเลขชุดเดียวกัน
       หมายเหตุ: STATA ใช้ drawnorm จึงให้ตัวเลขสุ่มคนละชุด ช่วง 90% ที่คำนวณสดจึงต่างจากไฟล์ band เล็กน้อย
       สำหรับบริษัทใน REF-928 ต้นแบบใช้ช่วงจากไฟล์ REF928_OIS_band โดยตรง"""
    def __init__(self, seed):
        self.s = seed % 2147483647 or 1

    def u(self):
        self.s = (self.s * 48271) % 2147483647
        return self.s / 2147483647.0

    def n(self):                                  # Box–Muller
        u1 = max(self.u(), 1e-12); u2 = self.u()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


def draws(reps=500, seed=20261005):
    """E11 — θ^(r) ~ N(θ̂, V̂f) แบบ Krinsky & Robb (1986)"""
    L, g, out = chol(VF), LCG(seed), []
    mu = (B1, DF, DG, DW)
    for _ in range(reps):
        z = [g.n() for _ in range(4)]
        out.append(tuple(mu[i] + sum(L[i][k] * z[k] for k in range(i + 1)) for i in range(4)))
    return out

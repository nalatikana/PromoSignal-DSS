# -*- coding: utf-8 -*-
"""เครื่องคำนวณอ้างอิง Signal B / OpenInnoScore (REF928-edit6-20260930)
   ใช้ตรวจความถูกต้องของชั้นคำนวณฝั่งเบราว์เซอร์ — ตัวเลขทุกตัวมาจาก
   SignalB_OpenInnoScore_Equations_Workflow_20261005_v2 หัวข้อ 4
   ความลับทางการค้า: parameter card และ V̂f เป็นข้อมูลหลังบ้าน """
import math

# 4.2 สัมประสิทธิ์
B1, DF, DG, DW, DT = 0.2105715, -0.9841339, 0.4200338, 3.725127, -0.0029792
G_T = 0.0                                  # evidence gate — H5 ถูกตัด

# 4.1 ค่าเฉลี่ยหลัง winsorise ของ REF-928
M = dict(P=0.570901, F=0.231331, G=0.619612, W=0.215865, T=9.563888)
# จุดตัด winsorise 5/95 (G ไม่ winsorise)
CUT = dict(P=(0.1037, 1.1500), F=(0.0000, 0.6127), W=(0.0000, 0.5000), T=(2.2000, 19.5200))

# 4.3 covariance ของ (β1, δF, δG, δW)
VF = [
    [0.006566,  0.000418, -0.001703,  0.003431],
    [0.000418,  0.232069, -0.010046, -0.095670],
    [-0.001703, -0.010046, 0.028880,  0.000441],
    [0.003431, -0.095670,  0.000441,  0.412898],
]

TIER_CUTS = (75.0, 50.0, 25.0)
QUAD_NAME = {"A": "Amplified drive", "B": "Constrained drive",
             "C": "Consistent restraint", "D": "Untapped board"}
# ชื่อโซนบนหน้ารายงาน (Board Strategy Compass)
ZONE = {"A": "Deliver", "B": "Discipline", "C": "Develop", "D": "Discover"}


def wins(x, k):
    lo, hi = CUT[k]
    return min(max(x, lo), hi)


def centred(P, F, G, W, T=None):
    """E2 + E3 — winsorise แล้วลบค่าเฉลี่ย REF-928 (G ไม่ winsorise)"""
    c = dict(P=wins(P, "P") - M["P"], F=wins(F, "F") - M["F"],
             G=G - M["G"], W=wins(W, "W") - M["W"])
    if T is not None:
        c["T"] = wins(T, "T") - M["T"]
    return c


def amp_of(c, th=None):
    """E4 — ความชันของ promotion focus ภายใต้องค์ประกอบบอร์ดนี้"""
    b1, dF, dG, dW = th or (B1, DF, DG, DW)
    a = b1 + dF * c["F"] + dG * c["G"] + dW * c["W"]
    if G_T and "T" in c:
        a += G_T * DT * c["T"]
    return a


def signal_b(c, th=None):
    """E5 — B = cP × amp"""
    return c["P"] * amp_of(c, th)


def ois_of(b, ref_sorted):
    """E7 — mid-rank percentile (0–100)"""
    n = len(ref_sorted)
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
    """ตัวสุ่มแบบกำหนดผลซ้ำได้ (seed 20261005) เพื่อให้ Python กับ JS ได้ตัวเลขชุดเดียวกัน"""
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

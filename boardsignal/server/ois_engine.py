# -*- coding: utf-8 -*-
"""ชั้นคำนวณฝั่งเซิร์ฟเวอร์ของ OpenInnoScore (Signal B) — ส่วนที่เป็นความลับทางการค้า

ใช้ร่วมกันโดย
  * server/app.py      — ตอบ /api/amp และ /api/band
  * build_v2.py --server — คำนวณค่าตั้งต้น (seed) ของ 196 บริษัทฝังลงไฟล์ HTML ฉบับเซิร์ฟเวอร์

สูตรทุกบรรทัดเขียนให้ลำดับการคำนวณทศนิยมตรงกับฝั่งเบราว์เซอร์โหมดออฟไลน์ (src/v2_app.js ส่วนที่ 1)
เพื่อให้ผลลัพธ์ตรงกันระดับ bit:
  ampOf  = b1 + dF·cF + dG·cG + dW·cW
  ampT1  = b1 + dW·cW
  band90 = Krinsky–Robb 500 ชุด (LCG seed 20261005, Cholesky ปัด 10 ตำแหน่งเหมือน OIS.chol)
Pure Python (ไม่ต้องใช้ numpy) — สร้างตารางอ้างอิง 500 × 928 ครั้งเดียวตอนเริ่ม (~0.5 วินาที)
"""
import bisect
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "model"))
import ois_core as K  # noqa: E402  (พารามิเตอร์ลับอยู่ที่นี่เท่านั้น)

M, CUT = K.M, K.CUT
MU = (K.B1, K.DF, K.DG, K.DW)
assert K.G_T == 0.0, "ฝั่ง JS ไม่ได้ใส่ δT — ถ้าเปิด evidence gate ต้องแก้ทั้งสองฝั่ง"


def wins(x, k):
    lo, hi = CUT[k]
    return min(max(x, lo), hi)


def cen(P, F, G, W):
    """เหมือน cen() ใน v2_app.js"""
    return (wins(P, "P") - M["P"], wins(F, "F") - M["F"], (1 if G else 0) - M["G"], wins(W, "W") - M["W"])


def amp_of(fam, pol, fem):
    _, F, G, W = cen(0, fam, pol, fem)
    return K.B1 + K.DF * F + K.DG * G + K.DW * W


def amp_t1(fem):
    _, _, _, W = cen(0, 0, 0, fem)
    return K.B1 + K.DW * W


def _js_round(x):
    """Math.round ของ JavaScript (ปัด .5 ขึ้นเสมอ)"""
    return math.floor(x + 0.5)


def _mid_rank(sorted_ref, v):
    lo = bisect.bisect_left(sorted_ref, v)
    hi = bisect.bisect_right(sorted_ref, v)
    return 100 * (lo + .5 * (hi - lo)) / len(sorted_ref)


class KR:
    """E11 · Krinsky & Robb — สร้างชุด θ^(r) และฐานอ้างอิงที่ให้คะแนนใหม่ทุกชุด (ตรงกับ KR / krRef ฝั่ง JS)"""

    def __init__(self, pts, reps=500, seed=20261005):
        # Cholesky ปัด 10 ตำแหน่งเหมือน OIS.chol ที่ build_ois_data.py ฝังไว้ (ฝั่ง JS โหมดออฟไลน์ใช้ค่านี้)
        L = [[round(x, 10) for x in row] for row in K.chol(K.VF)]
        s = seed % 2147483647 or 1

        def u():
            nonlocal s
            s = (s * 48271) % 2147483647
            return s / 2147483647

        def nrm():
            a = max(u(), 1e-12); b = u()
            return math.sqrt(-2 * math.log(a)) * math.cos(2 * math.pi * b)

        self.th = []
        for _ in range(reps):
            z = [nrm(), nrm(), nrm(), nrm()]
            row = []
            for i in range(4):
                acc = 0
                for k in range(i + 1):
                    acc = acc + L[i][k] * z[k]
                row.append(MU[i] + acc)
            self.th.append(tuple(row))
        zs = [(p[0] - M["P"], p[6], p[7], p[8]) for p in pts]
        self.ref = []
        for t0, t1, t2, t3 in self.th:
            self.ref.append(sorted(P * (t0 + t1 * F + t2 * G + t3 * W) for P, F, G, W in zs))

    def band90(self, promo, fam, pol, fem):
        P, F, G, W = cen(promo, fam, pol, fem)
        out = []
        for (t0, t1, t2, t3), R in zip(self.th, self.ref):
            out.append(_mid_rank(R, P * (t0 + t1 * F + t2 * G + t3 * W)))
        out.sort()
        n = len(out)
        q = lambda p: out[min(math.floor(p * n), n - 1)]
        return [_js_round(q(.05) * 10) / 10, _js_round(q(.95) * 10) / 10]


def load_model(root=ROOT):
    """อ่าน src/ois_model.json (ฉบับเต็ม — อยู่ใน repo ส่วนตัวเท่านั้น ไม่เคยถูกส่งให้เบราว์เซอร์ในโหมดเซิร์ฟเวอร์)"""
    d = json.loads((root / "src" / "ois_model.json").read_text(encoding="utf-8"))
    # ตรวจว่า ois_core กับไฟล์ที่ฝังในโหมดออฟไลน์เป็นชุดเดียวกัน — ถ้าไม่ตรง ผลจะต่างจากไฟล์ออฟไลน์
    assert d["version"] == K.VERSION, (d["version"], K.VERSION)
    assert d["par"]["b1"] == K.B1 and d["par"]["dW"] == K.DW and d["mean"] == M
    assert d["chol"] == [[round(x, 10) for x in row] for row in K.chol(K.VF)]
    return d

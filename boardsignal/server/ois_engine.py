# -*- coding: utf-8 -*-
"""ชั้นคำนวณฝั่งเซิร์ฟเวอร์ของ OpenInnoScore (Signal B) — ส่วนที่เป็นความลับทางการค้า

ใช้ร่วมกันโดย
  * server/app.py        — /api/score (ผลลัพธ์ระดับเปอร์เซ็นไทล์เท่านั้น) และ /api/admin/trace/{ticker} (ผู้ดูแลเท่านั้น)
  * build_v2.py --server — คำนวณค่าที่แสดงของ 196 บริษัทและจุดพื้นหลังแบบเปอร์เซ็นไทล์ฝังลงไฟล์ HTML ฉบับเซิร์ฟเวอร์

บันทึกพารามิเตอร์ (parameter record) = ไฟล์ ois_model.json ฉบับเต็ม (par · mean · cut · chol · ฐานอ้างอิง)
  * ค่าเริ่มต้น src/ois_model.json · เปลี่ยนได้ด้วย env OIS_MODEL_PATH (ดู server/README_DEPLOY.md หัวข้อ "เปลี่ยนบันทึกพารามิเตอร์")
  * รหัสรุ่น (record_id) = version ในไฟล์ + sha256 12 ตัวแรกของไฟล์ — แสดงใน /api/health และหน้า System log
  * ถ้า version ตรงกับ model/ois_core.py จะตรวจซ้ำว่าค่าในไฟล์ตรงกับค่าคงที่ใน ois_core (กันไฟล์ผิดชุด)

สูตรทุกบรรทัดเขียนให้ลำดับการคำนวณทศนิยมตรงกับฝั่งเบราว์เซอร์โหมดออฟไลน์ (src/v2_app.js ส่วนที่ 1)
เพื่อให้ผลลัพธ์ตรงกันระดับ bit ก่อนปัดเศษ:
  amp    = b1 + dF·cF + dG·cG + dW·cW            (B_EG · δT ปิดด้วย evidence gate)
  ampT1  = b1 + dW·cW                             (B_T1 · shadow)
  ampFull= b1 + dF·cF + dG·cG + dW·cW + dT·cT     (B_FULL · การวิเคราะห์ความไวของอายุงานเท่านั้น)
  band90 = Krinsky–Robb 500 ชุด (LCG seed 20261026 ตาม card edit9, Cholesky ตามที่บันทึกในไฟล์ · ตำแหน่ง ceil(.05R)/ceil(.95R) แบบ wi_kr)
  mid-rank ใช้ค่า double ตรงตาม STATA (ไม่ปัด q8 แล้ว · edit9) — ตรงกับ do-file ทั้งบริษัทในฐานและนอกฐาน
ไม่ส่ง "ระยะเทียบเท่าสัดส่วนกรรมการหญิง" (amp/δW) ออกไป — เป็นฟังก์ชันเชิงเส้นของค่าป้อนที่ถอดอัตราส่วนสัมประสิทธิ์ได้

จุดเรียกสองชั้น (แก้ไขครั้งที่ 2.5 · ภาคผนวก ง ใหม่-2 / ง-4):
  score_public(it)  — ใช้โดย POST /api/score เท่านั้น · รับเฉพาะ {ticker, fem_count, bsize, ten, variant} ของบริษัทที่มีอยู่แล้ว
                      ค่าป้อนอื่น (promo · fam · pol · ind) อ่านจากค่าที่เก็บของบริษัทนั้นบนเซิร์ฟเวอร์ · ค่าป้อนอยู่บนกริดหยาบ
                      (bsize 5–25 จำนวนเต็ม · fem_count 0..bsize · ten 0–40 ทีละ 0.5) · ผลไม่มีเครื่องหมาย csg/asg และไม่มีธง clip
                      (quadrant ยังส่งเพราะแสดงบนหน้าจอ) — การค้นแบบแบ่งครึ่งบน promo/fam/pol จึงทำไม่ได้
  score_record(it)  — ภายในเซิร์ฟเวอร์เท่านั้น (เช่น server/data_api.py ให้คะแนนบริษัท-ปีใหม่) · รับค่าป้อนเต็มชุด
                      {promo | {"pct": dp}, fam, pol, fem, ten, ind, band, full} · ห้ามต่อเข้ากับ endpoint สาธารณะโดยตรง
                      (score = ชื่อเดิมของ score_record — คงไว้ให้โค้ดเดิมเรียกได้)
ผลที่ส่งให้เบราว์เซอร์ปัดหยาบ: OIS 1 ตำแหน่ง · เปอร์เซ็นไทล์ amp / CEO Promotion Focus เป็นจำนวนเต็ม — ไม่มี amp/cP/B ดิบ
Pure Python (ไม่ต้องใช้ numpy) — สร้างตารางอ้างอิง 500 × 928 ครั้งเดียวตอนเริ่ม (~0.5 วินาที)
"""
import bisect
import hashlib
import json
import math
import os
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "model"))
import ois_core as K  # noqa: E402  (ใช้ตรวจความสอดคล้องของบันทึกพารามิเตอร์เท่านั้น)

assert K.G_T == 0.0, "ฝั่ง JS ไม่ได้ใส่ δT ใน headline — ถ้าเปิด evidence gate ต้องแก้ทั้งสองฝั่ง"

# ---- ค่าคงที่ระดับโมดูล (คงไว้ให้โค้ดเดิมเรียกได้ — ใช้ชุดเดียวกับ ois_core) --------------------------------
M, CUT = K.M, K.CUT
MU = (K.B1, K.DF, K.DG, K.DW)


def jround(x):
    """Math.round ของ JavaScript (ปัด .5 ขึ้นเสมอ)"""
    return math.floor(x + 0.5)


_js_round = jround


def r1(x):
    return jround(x * 10) / 10


def q8(b):
    """คงชื่อเดิม — edit9 ไม่ปัดแล้ว (เท่ากับ q8 ฝั่ง JS ซึ่งเป็น identity)"""
    return b


def q6(x):
    """ปัด 6 ตำแหน่ง (ความละเอียดของ cF/cW ในจุดอ้างอิง) — ใช้กับเปอร์เซ็นไทล์ขององค์ประกอบบอร์ด (od)"""
    return jround(x * 1e6) / 1e6


def _mid_rank(sorted_ref, v):
    lo = bisect.bisect_left(sorted_ref, v)
    hi = bisect.bisect_right(sorted_ref, v)
    return 100 * (lo + .5 * (hi - lo)) / len(sorted_ref)


def wins(x, k, cut=CUT):
    if k not in cut:
        return x
    lo, hi = cut[k]
    return min(max(x, lo), hi)


def cen(P, F, G, W, mean=M, cut=CUT):
    """เหมือน cen() ใน v2_app.js"""
    return (wins(P, "P", cut) - mean["P"], wins(F, "F", cut) - mean["F"], (1 if G else 0) - mean["G"],
            wins(W, "W", cut) - mean["W"])


def amp_of(fam, pol, fem):
    _, F, G, W = cen(0, fam, pol, fem)
    return K.B1 + K.DF * F + K.DG * G + K.DW * W


def amp_t1(fem):
    _, _, _, W = cen(0, 0, 0, fem)
    return K.B1 + K.DW * W


class KR:
    """E11 · Krinsky & Robb — สร้างชุด θ^(r) และฐานอ้างอิงที่ให้คะแนนใหม่ทุกชุด (ตรงกับ KR / krRef ฝั่ง JS)
    pts = จุดอ้างอิงจากไฟล์ฉบับเต็ม [P_w, amp, quad, tier, ind, year, cF, cG, cW]"""

    def __init__(self, pts, reps=K.KR_REPS, seed=K.KR_SEED, chol=None, mu=MU, mean=M, cut=CUT):
        L = chol or K.chol_rounded()
        self.mean, self.cut = mean, cut
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
                row.append(mu[i] + acc)
            self.th.append(tuple(row))
        zs = [(p[0] - mean["P"], p[6], p[7], p[8]) for p in pts]
        self.ref, self.ref1 = [], []
        for t0, t1, t2, t3 in self.th:
            self.ref.append(sorted(P * (t0 + t1 * F + t2 * G + t3 * W) for P, F, G, W in zs))
            self.ref1.append(sorted(P * (t0 + t3 * W) for P, F, G, W in zs))

    def band_raw(self, P, F, G, W, t1=False):
        """ช่วง 90% จากค่าที่ centre แล้ว — ตำแหน่งแบบ wi_kr / wi_kr_t1 ของ do-file (ไม่ปัด)"""
        out = []
        if t1:
            for (t0, _, _, t3), R in zip(self.th, self.ref1):
                out.append(_mid_rank(R, P * (t0 + t3 * W)))
        else:
            for (t0, t1_, t2, t3), R in zip(self.th, self.ref):
                out.append(_mid_rank(R, P * (t0 + t1_ * F + t2 * G + t3 * W)))
        out.sort()
        return list(K.kr_q(out))

    def band90(self, promo, fam, pol, fem):
        P, F, G, W = cen(promo, fam, pol, fem, self.mean, self.cut)
        lo, hi = self.band_raw(P, F, G, W)
        return [jround(lo * 10) / 10, jround(hi * 10) / 10]


def model_path(root=ROOT):
    p = os.environ.get("OIS_MODEL_PATH")
    return Path(p) if p else root / "src" / "ois_model.json"


def load_model(root=ROOT, path=None):
    """อ่านบันทึกพารามิเตอร์ (ois_model.json ฉบับเต็ม — อยู่ใน repo ส่วนตัวเท่านั้น ไม่เคยถูกส่งให้เบราว์เซอร์ในโหมดเซิร์ฟเวอร์)"""
    path = Path(path) if path else model_path(root)
    raw = path.read_bytes()
    d = json.loads(raw.decode("utf-8"))
    for k in ("version", "par", "mean", "cut", "chol", "refB", "refInd", "refT1", "refP", "refAmp", "refAmpT1", "pts", "co"):
        assert k in d, f"บันทึกพารามิเตอร์ไม่มีคีย์ {k}"
    if d["version"] == K.VERSION:
        # รุ่นเดียวกับ ois_core — ต้องตรงทุกตัว (กันไฟล์ที่ถูกแก้มือหรือ build จากคนละชุด)
        assert d["par"]["b1"] == K.B1 and d["par"]["dW"] == K.DW and d["mean"] == M, "par/mean ไม่ตรง ois_core"
        assert d["chol"] == K.chol_rounded(), "chol ไม่ตรง ois_core"
        assert d.get("seed") == K.KR_SEED and d["par"].get("seW") == K.SE_DW, "seed/SE ไม่ตรง ois_core"
    d["_record_id"] = f'{d["version"]}#{hashlib.sha256(raw).hexdigest()[:12]}'
    d["_path"] = str(path)
    return d


# ---- เครื่องคำนวณหลัก ------------------------------------------------------------------------------------
TOKEN_MEAN = "mean"


class Engine:
    """คำนวณผลลัพธ์จากค่าป้อน — ทุกค่าที่ส่งออกนอกเซิร์ฟเวอร์ผ่าน score() ซึ่งปัดหยาบแล้ว
    trace() คืนทุกขั้นพร้อมค่าในบันทึกพารามิเตอร์ (ใช้กับ endpoint ผู้ดูแลเท่านั้น)"""

    def __init__(self, model, comps=None, kr=True):
        self.m = model
        p = model["par"]
        self.b1, self.dF, self.dG, self.dW = p["b1"], p["dF"], p["dG"], p["dW"]
        self.dT, self.gT = p.get("dT", 0.0), p.get("gT", 0.0)
        self.mean, self.cut = model["mean"], {k: tuple(v) for k, v in model["cut"].items()}
        self.version, self.record_id = model["version"], model.get("_record_id", model["version"])
        self.refB, self.refT1, self.refP, self.refAmp = model["refB"], model["refT1"], model["refP"], model["refAmp"]
        self.refInd = {int(k): v for k, v in model["refInd"].items()}
        self.refFull = model.get("refFull")
        self.tierCuts = model.get("tierCuts") or [75, 50, 25]
        self.regime = {str(k): v for k, v in (model.get("regime") or {}).items()}
        self.weak = set(model.get("weakInd") or [1, 2])
        self.crit = model.get("critMass") or 3
        self.co = model["co"]
        self.refAmpT1 = model["refAmpT1"]
        self.seW = p.get("seW", K.SE_DW)
        self.jn = model.get("jn") or {"p": K.JN_PROMO, "pct": K.JN_PCT}
        self.div = model.get("div") or dict(K.DIV)
        self.kr = KR(model["pts"], model.get("reps", K.KR_REPS), model.get("seed", K.KR_SEED), model["chol"],
                     (self.b1, self.dF, self.dG, self.dW), self.mean, self.cut) if kr else None
        # ตำแหน่งเปอร์เซ็นไทล์ของเส้นแบ่ง (amp = 0 และ cP = 0) — เป็นเปอร์เซ็นไทล์ ไม่ใช่ค่าในบันทึกพารามิเตอร์
        self.zA = r1(_mid_rank(self.refAmp, q8(0.0)))
        self.zP = r1(_mid_rank(self.refP, q8(wins(self.mean["P"], "P", self.cut))))
        self.comps = {c["t"]: c for c in (comps or [])}
        self._dlv = self._deliver_targets()

    # -- ชั้นสูตร (ลำดับเหมือน v2_app.js) --
    def w(self, x, k):
        return wins(x, k, self.cut)

    def cen(self, P, F, G, W, T=None):
        c = (self.w(P, "P") - self.mean["P"], self.w(F, "F") - self.mean["F"], (1 if G else 0) - self.mean["G"],
             self.w(W, "W") - self.mean["W"])
        return c + ((self.w(T, "T") - self.mean["T"]) if T is not None else 0.0,)

    def amp(self, fam, pol, fem):
        _, F, G, W, _ = self.cen(0, fam, pol, fem)
        return self.b1 + self.dF * F + self.dG * G + self.dW * W

    def amp_t1(self, fem):
        _, _, _, W, _ = self.cen(0, 0, 0, fem)
        return self.b1 + self.dW * W

    def amp_full(self, fam, pol, fem, ten):
        _, F, G, W, T = self.cen(0, fam, pol, fem, ten)
        return self.b1 + self.dF * F + self.dG * G + self.dW * W + self.dT * T

    def cp(self, promo):
        return self.w(promo, "P") - self.mean["P"]

    def ois(self, b):
        return _mid_rank(self.refB, q8(b))

    def ois_ind(self, b, ind):
        return _mid_rank(self.refInd.get(int(ind), self.refB) if ind is not None else self.refB, q8(b))

    def amp_pct(self, a):
        return jround(_mid_rank(self.refAmp, q8(a)) * 10) / 10

    def promo_pct(self, p):
        return jround(_mid_rank(self.refP, q8(self.w(p, "P"))) * 10) / 10

    def tier(self, o):
        a, b, c = self.tierCuts
        return 1 if o >= a else 2 if o >= b else 3 if o >= c else 4

    @staticmethod
    def quad(cP, amp):
        return ("A" if amp >= 0 else "B") if cP >= 0 else ("D" if amp >= 0 else "C")

    def promo_at_pct(self, dp, inv=False):
        """promoAtPct (inv=False) / promoInv (inv=True) ของ v2_app.js — ค่าดิบจากฐานอ้างอิง (ไม่ส่งออก)"""
        a, n = self.refP, len(self.refP)
        i = jround(dp / 100 * (n - 1)) if inv else jround(dp / 100 * n) - 1
        return a[min(max(i, 0), n - 1)]

    def clipped(self, x, k):
        lo, hi = self.cut[k]
        return x < lo or x > hi

    # -- ค่าป้อน --
    def resolve(self, it):
        """แปลงค่าป้อนจากเบราว์เซอร์: ตัวเลข · "mean" (ค่าเฉลี่ยฐานอ้างอิง — ใช้กับบริษัทสมมติของแผนภาพน้ำตก) ·
        {"pct": dp} (CEO Promotion Focus ที่เปอร์เซ็นไทล์ dp — ตัวเลื่อน What-if)"""
        def num(v, k, lo=-1e3, hi=1e3):
            if v is None:
                return None
            if v == TOKEN_MEAN:
                return self.mean[k]
            v = float(v)
            if not math.isfinite(v) or v < lo or v > hi:
                raise ValueError(f"{k} อยู่นอกช่วงที่รับได้")
            return v
        out = {}
        p = it.get("promo")
        if isinstance(p, dict):
            dp = float(p.get("pct"))
            if not math.isfinite(dp) or dp < -1 or dp > 101:
                raise ValueError("pct อยู่นอกช่วง")
            out["promo"] = self.promo_at_pct(dp, bool(p.get("inv")))
        else:
            out["promo"] = num(p, "P")
        out["fam"] = num(it.get("fam"), "F")
        g = it.get("pol")
        # pol "mean" = OM.G ฝั่ง JS ซึ่งเป็นค่าจริง (truthy) → cen() แปลงเป็น 1 เหมือนกัน
        out["pol"] = (1 if self.mean["G"] else 0) if g == TOKEN_MEAN else (1 if g else 0) if g is not None else None
        out["fem"] = num(it.get("fem"), "W")
        out["ten"] = num(it.get("ten"), "T")
        ind = it.get("ind")
        out["ind"] = int(ind) if ind not in (None, "") else None
        return out

    # -- ผลลัพธ์ภายในเซิร์ฟเวอร์ (ค่าป้อนเต็มชุด) — ห้ามต่อกับ endpoint สาธารณะ (ใช้ score_public) --
    def score_record(self, it):
        """ให้คะแนนค่าป้อนเต็มชุดหนึ่งชุด (บริษัท-ปีใหม่ของ data_api ฯลฯ) — คืนผลปัดหยาบเหมือนเดิม รวม csg/asg/clip
        ซึ่งใช้ภายในเซิร์ฟเวอร์ได้ แต่ห้ามส่งต่อให้เบราว์เซอร์ตามค่าป้อนที่ผู้ใช้เลือกเอง (ดู score_public)"""
        v = self.resolve(it)
        promo, fam, pol, fem, ten, ind = v["promo"], v["fam"], v["pol"], v["fem"], v["ten"], v["ind"]
        out, clip = {}, []
        has_board = fem is not None
        if promo is not None:
            cP = self.cp(promo)
            out["dp"] = jround(self.promo_pct(promo))
            out["csg"] = 1 if cP >= 0 else -1
            if self.clipped(promo, "P"):
                clip.append("P")
        if has_board:
            fam = fam if fam is not None else 0.0
            a = self.amp(fam, pol, fem)
            out["ap"] = jround(self.amp_pct(a))
            out["asg"] = 1 if a >= 0 else -1
            if self.clipped(fam, "F"):
                clip.append("F")
            if self.clipped(fem, "W"):
                clip.append("W")
            if ten is not None and self.clipped(ten, "T"):
                clip.append("T")
        if promo is not None and has_board:
            cP = self.cp(promo)
            b = cP * a
            o = self.ois(b)
            out.update(ois=r1(o), ipi=jround(o), tier=self.tier(o), quad=self.quad(cP, a))
            if ind is not None:
                oi = self.ois_ind(b, ind)
                out.update(oisInd=r1(oi), iip=jround(oi))
            a1 = self.amp_t1(fem)
            o1 = _mid_rank(self.refT1, q8(cP * a1))
            out["t1"] = {"ois": r1(o1), "tier": self.tier(o1), "quad": self.quad(cP, a1)}
            if it.get("full") and self.refFull is not None:
                tv = ten if ten is not None else self.mean["T"]
                bf = cP * self.amp_full(fam, pol, fem, tv)
                of = _mid_rank(self.refFull, q8(bf))
                out["full"] = {"ois": r1(of), "ipi": jround(of), "tier": self.tier(of)}
            if it.get("band") and self.kr is not None:
                out["band"] = self.kr.band90(promo, fam, pol, fem)
        out["clip"] = clip
        return out

    score = score_record     # ชื่อเดิม (ภายในเซิร์ฟเวอร์เท่านั้น)

    # -- ค่าป้อนสาธารณะ (POST /api/score) --
    PUBLIC_KEYS = ("ticker", "fem_count", "bsize", "ten", "variant")
    PUBLIC_OUT = ("ois", "ipi", "tier", "quad", "ap", "dp", "oisInd", "iip", "t1", "band")

    @staticmethod
    def _int_in(v, lo, hi, name):
        if isinstance(v, bool) or v is None:
            raise ValueError(f"{name} ต้องเป็นจำนวนเต็ม")
        x = float(v)
        if not math.isfinite(x):
            raise ValueError(f"{name} ต้องเป็นจำนวนเต็ม")
        return int(min(max(jround(x), lo), hi))

    def public_inputs(self, it):
        """ตรวจและบังคับค่าป้อนสาธารณะให้อยู่บนกริด → (ticker, fem, ten, variant, fem_count, bsize)
        fem_count/bsize ต้องมาคู่กัน (ไม่ส่งทั้งคู่ = ใช้สัดส่วนกรรมการหญิงที่เก็บไว้ของบริษัท) · ten ไม่ส่ง = ค่าที่เก็บไว้"""
        extra = sorted(set(it) - set(self.PUBLIC_KEYS))
        if extra:
            raise ValueError("รับเฉพาะ ticker, fem_count, bsize, ten, variant (ไม่รับ " + ", ".join(map(str, extra))[:80] + ")")
        t = str(it.get("ticker") or "").strip()[:16]
        t = t if t in self.comps else t.upper()          # ชื่อย่อบางตัวมีตัวพิมพ์เล็ก (เช่น True)
        c = self.comps.get(t)
        if not c or t not in self.co:
            raise ValueError("ไม่พบบริษัท")
        variant = str(it.get("variant") or "eg").lower()
        if variant not in ("eg", "full"):
            raise ValueError("variant ต้องเป็น eg หรือ full")
        fc, bs = it.get("fem_count"), it.get("bsize")
        if fc is None and bs is None:
            fem = c["fem"]
        elif fc is None or bs is None:
            raise ValueError("fem_count และ bsize ต้องส่งคู่กัน")
        else:
            bs = self._int_in(bs, 5, 25, "bsize")
            fc = self._int_in(fc, 0, bs, "fem_count")
            fem = fc / bs
        ten = it.get("ten")
        if ten is None:
            ten = c.get("ten")
        else:
            if isinstance(ten, bool):
                raise ValueError("ten ต้องเป็นตัวเลข")
            x = float(ten)
            if not math.isfinite(x):
                raise ValueError("ten ต้องเป็นตัวเลข")
            ten = min(max(jround(x * 2) / 2, 0.0), 40.0)
        return t, fem, ten, variant, fc, bs

    def score_public(self, it):
        """POST /api/score — บริษัทที่มีอยู่แล้วเท่านั้น · ปรับได้เฉพาะจำนวนกรรมการหญิง (กับขนาดบอร์ด) และอายุงาน (B_FULL)
        คืนเฉพาะค่าที่หน้าจอแสดง: OIS · ipi · tier · quadrant · ap · dp · OIS ในอุตสาหกรรม · B_T1 · ช่วง 90% (+ full)
        ไม่มี csg / asg / clip (ภาคผนวก ง ใหม่-2: ใช้ค้นแบบแบ่งครึ่งหาค่าเฉลี่ย centring และจุดตัดได้)"""
        t, fem, ten, variant, _, _ = self.public_inputs(it)
        c = self.comps[t]
        r = self.score_record({"promo": c["promo"], "fam": c["fam"], "pol": c["pol"], "fem": fem, "ten": ten,
                               "ind": c.get("ind"), "band": 1, "full": variant == "full"})
        out = {k: r[k] for k in self.PUBLIC_OUT if k in r}
        o = self.co[t]
        if fem == c["fem"] and o.get("band"):
            out["band"] = [r1(o["band"][0]), r1(o["band"][1])]   # ค่าจริงของบริษัท → ช่วงจากไฟล์ STATA (ตรงกับ OIS.co)
        out["t1"] = {k: out["t1"][k] for k in ("ois", "tier", "quad")} if "t1" in out else None
        if variant == "full":
            out["full"] = r.get("full")
        return out

    def od(self, it):
        """โหมดนอกกลุ่มอ้างอิง: เปอร์เซ็นไทล์ของสัดส่วนกรรมการหญิง / ครอบครัว เทียบ REF-928 (จำนวนเต็ม)
        ปัดทั้งฐานและค่าป้อนก่อนจัดอันดับ (ภาคผนวก ง-40: fam = 0 ต้องนับเท่ากับ 264 แถวที่เป็น 0 → ≈ 14 ไม่ใช่ 0)
        จุดอ้างอิงเก็บ cF/cW ไว้ 6 ตำแหน่ง ค่าดิบที่ได้จาก cF + mean จึงมีเศษ ~1e-7 ซึ่ง q8 ปัดไม่หมด → ใช้ q6 (ความละเอียดของข้อมูล)
        ให้ตรงกับ odCalc ใน v2_pilot.js
        รับ {fem_count, fam_count, bsize} (จำนวนคน · bsize 1–30) หรือสัดส่วน {fem, fam} ที่ถูกปัดลงกริด 1/bsize ไม่ได้ → ปัด 2 ตำแหน่ง"""
        if "bsize" in it:
            bs = self._int_in(it.get("bsize"), 1, 30, "bsize")
            fem = self._int_in(it.get("fem_count") or 0, 0, bs, "fem_count") / bs
            fam = self._int_in(it.get("fam_count") or 0, 0, bs, "fam_count") / bs
        else:
            fem, fam = round(float(it.get("fem") or 0), 2), round(float(it.get("fam") or 0), 2)
            if not (0 <= fem <= 1 and 0 <= fam <= 1):
                raise ValueError("สัดส่วนต้องอยู่ระหว่าง 0–1")
        if not hasattr(self, "_odW"):
            self._odW = sorted(q6(p[8] + self.mean["W"]) for p in self.m["pts"])
            self._odF = sorted(q6(p[6] + self.mean["F"]) for p in self.m["pts"])
        return {"femP": jround(_mid_rank(self._odW, q6(fem))), "famP": jround(_mid_rank(self._odF, q6(fam)))}

    # -- ค่าแสดงผลของ 196 บริษัท (ฝังในไฟล์ฉบับเซิร์ฟเวอร์) --
    def firm_display(self, c):
        o = self.co.get(c["t"])
        if not o:
            return None
        amp = o["amp"]
        out = {"ois": r1(o["ois"]), "oisInd": r1(o["oisInd"]), "ipi": jround(o["ois"]), "iip": jround(o["oisInd"]),
               "tier": o["tier"], "quad": o["quad"], "band": [r1(o["band"][0]), r1(o["band"][1])],
               "ap": jround(self.amp_pct(amp)), "dp": jround(self.promo_pct(c["promo"])),
               "fy": o.get("fy"),
               "t1": {"ois": r1(o["t1"]["ois"]), "tier": o["t1"]["tier"], "quad": o["t1"]["quad"]},
               "clip": [k for k, kk in (("promo", "P"), ("fam", "F"), ("fem", "W")) if self.clipped(c[k], kk)]}
        out["clip"] = [{"promo": "P", "fam": "F", "fem": "W"}[k] for k in out["clip"]]
        if o.get("full"):
            out["full"] = {"ois": r1(o["full"]["ois"]), "ipi": jround(o["full"]["ois"]), "tier": o["full"]["tier"]}
        return out

    def _deliver_targets(self):
        """จุดอ้างอิงเชิงเปรียบเทียบของ Grid — นิยามเดียวกับฉบับออฟไลน์ (gxRefPoint ใน v2_strategy.js):
        มัธยฐาน (P_w, amp) ของจุด REF-928 ในช่อง A ของอุตสาหกรรมเดียวกัน · ถ้าน้อยกว่า 5 จุด ใช้ช่อง A ทั้งฐาน (scope "all")
        n = จำนวนบริษัท-ปีที่ใช้จริง (ตรงกับที่การ์ดพิมพ์) · คีย์ "all" = ช่อง A ทั้งฐาน"""
        pts = self.m["pts"]
        A_all = [p for p in pts if p[2] == "A"]

        def ref_of(sel, scope):
            P = statistics.median(p[0] for p in sel)
            A = statistics.median(p[1] for p in sel)
            o = self.ois((self.w(P, "P") - self.mean["P"]) * A)
            return {"P": P, "amp": A, "ipi": jround(o), "n": len(sel), "scope": scope,
                    "dp": self.promo_pct(P), "ap": self.amp_pct(A)}
        out = {"all": ref_of(A_all, "all")}
        for ind in sorted({p[4] for p in pts} | {c.get("ind") for c in self.comps.values() if c.get("ind") is not None}):
            sel = [p for p in A_all if p[4] == ind]
            out[ind] = ref_of(sel, "ind") if len(sel) >= 5 else dict(out["all"])
        return out

    def deliver_display(self):
        """จุดอ้างอิงช่อง A (Deliver) ต่ออุตสาหกรรม + "all" ในรูปเปอร์เซ็นไทล์ (ไม่มีค่าดิบ):
        dp / ap = เปอร์เซ็นไทล์ (1 ตำแหน่ง — ห้ามผ่าน promoPct/ampPct ซ้ำฝั่งเบราว์เซอร์) · ipi · n · scope ("ind" | "all")"""
        return {str(k): {"dp": v["dp"], "ap": v["ap"], "ipi": v["ipi"], "n": v["n"], "scope": v["scope"]}
                for k, v in self._dlv.items()}

    def ref_points(self):
        """จุดพื้นหลัง 928 จุดแบบเปอร์เซ็นไทล์: [P pct, amp pct − zA (เส้นแบ่ง amp = 0 อยู่ที่ 0), quad, tier, ind, year]"""
        out = []
        for p in self.m["pts"]:
            pp = r1(_mid_rank(self.refP, q8(p[0])))
            ap = r1(_mid_rank(self.refAmp, q8(p[1])))
            a = r1(ap - self.zA)
            if p[1] >= 0 and a <= 0:
                a = 0.1
            if p[1] < 0 and a >= 0:
                a = -0.1
            out.append([pp, a, p[2], p[3], p[4], p[5]])
        return out

    # -- ตรวจการคำนวณรายบริษัท (ผู้ดูแลเท่านั้น — มีค่าในบันทึกพารามิเตอร์) --
    def trace(self, ticker):
        c = self.comps.get(ticker)
        o = self.co.get(ticker)
        if not c:
            return None
        P, F, G, W, T = c["promo"], c["fam"], c["pol"], c["fem"], c.get("ten")
        cP, cF, cG, cW, cT = self.cen(P, F, G, W, T if T is not None else self.mean["T"])
        a = self.b1 + self.dF * cF + self.dG * cG + self.dW * cW
        b = cP * a
        lo = bisect.bisect_left(self.refB, q8(b)); hi = bisect.bisect_right(self.refB, q8(b))
        oi = self.ois(b)
        ind = c.get("ind")
        oii = self.ois_ind(b, ind)
        tier, quad = self.tier(oi), self.quad(cP, a)
        band = o["band"] if o else self.kr.band90(P, F, G, W)
        band_src = "ไฟล์ STATA REF928_OIS_band (บริษัทในฐานอ้างอิง)" if o else "Krinsky–Robb 500 ชุด (คำนวณสด)"
        fy = (o or {}).get("fy") or 2023
        reg = self.regime.get(str(fy))
        a_full = a + self.dT * cT
        steps = [
            {"k": "inputs", "h": "1 · ค่าป้อน (ข้อมูลสาธารณะ ปีบัญชี %d)" % fy,
             "v": {"promo": P, "fam": F, "pol": G, "fem": W, "ten": T, "ind": ind}},
            {"k": "wins", "h": "2 · winsorise 5/95 (E2) — political ties ไม่ winsorise",
             "p": {"cut": {k: list(v) for k, v in self.cut.items()}},
             "v": {"P_w": self.w(P, "P"), "F_w": self.w(F, "F"), "W_w": self.w(W, "W"),
                   "T_w": self.w(T, "T") if T is not None else None,
                   "clipped": [k for k, x in (("P", P), ("F", F), ("W", W)) if self.clipped(x, k)]}},
            {"k": "centre", "h": "3 · mean-centring เทียบค่าเฉลี่ย REF-928 (E3)", "p": {"mean": dict(self.mean)},
             "v": {"cP": cP, "cF": cF, "cG": cG, "cW": cW, "cT": cT}},
            {"k": "amp", "h": "4 · Board Amplification Signal amp = β1 + δF·cF + δG·cG + δW·cW (E4 · δT ปิดด้วย g_T = 0)",
             "p": {"b1": self.b1, "dF": self.dF, "dG": self.dG, "dW": self.dW, "dT": self.dT, "gT": self.gT},
             "v": {"terms": {"b1": self.b1, "dF·cF": self.dF * cF, "dG·cG": self.dG * cG, "dW·cW": self.dW * cW},
                   "amp": a, "amp_pct": self.amp_pct(a), "amp_full_sensitivity": a_full}},
            {"k": "B", "h": "5 · Signal B = cP × amp (E5)", "v": {"B": b, "B_q8": q8(b)}},
            {"k": "pct", "h": "6 · mid-rank percentile เทียบ REF-928 (E7)",
             "v": {"n": len(self.refB), "n_less": lo, "n_equal": hi - lo, "OIS": oi, "OIS_ind": oii,
                   "promo_pct": self.promo_pct(P)}},
            {"k": "tier", "h": "7 · tier (E9) / quadrant (E10) / ช่วง 90% (E11)",
             "p": {"tierCuts": list(self.tierCuts)},
             "v": {"tier": tier, "quad": quad, "band": band, "band_source": band_src,
                   "tier_uncertain": self.tier(band[0]) != self.tier(band[1])}},
            {"k": "flags", "h": "8 · regime (R3) · ป้ายเตือน · ธงสัญญาณ OI (E13)",
             "v": {"fy": fy, "regime": reg, "weak_industry": ind in self.weak, "amp_le_0": a <= 0,
                   "flag": quad == "A" and band[0] >= 50 and reg != "FAIL"}},
        ]
        check = None
        if o:
            check = {"stored_ois": o["ois"], "stored_tier": o["tier"], "stored_quad": o["quad"],
                     "match": abs(round(oi, 4) - o["ois"]) < 1e-6 and tier == o["tier"] and quad == o["quad"]}
        return {"ticker": ticker, "name": c.get("n"), "record": self.record_id, "version": self.version,
                "steps": steps, "check": check}

    # ======================================================================================================
    # MVP 1 (edit9) · SCORE_FIRM / MVP_WHATIF — ตรรกะเดียวกับ window.SCORE_FIRM / window.MVP_WHATIF ใน src/v2_app.js
    # ตรงกับ do-file OI_WhatIf_ClientC_OutOfREF_edit9 (sb_whatif · sb_robust · sb_clientcheck) และ test cases 2 พ.ย. 2569
    # public=True (endpoint /api/mvp/*) — ตัด cP / amp / B / dB ดิบออก · ปัดเปอร์เซ็นไทล์ 1 ตำแหน่ง · ตัวคูณ 3 ตำแหน่ง · W* 3 ตำแหน่ง
    # ======================================================================================================
    QN_FULL = {"A": "A Deliver", "B": "B Discipline", "C": "C Develop", "D": "D Discover"}
    MVP_IN_KEYS = ("ticker", "promotion", "family_share", "political_ties", "female_share", "industry", "fiscal_year",
                   "board_size", "women")
    WHATIF_KEYS = ("base", "board_size", "women_now", "women_target", "target_share", "mode")

    @staticmethod
    def _fnum(v, name, lo, hi):
        if isinstance(v, bool) or v is None or v == "":
            raise ValueError(f"{name} ต้องเป็นตัวเลข")
        x = float(v)
        if not math.isfinite(x) or x < lo or x > hi:
            raise ValueError(f"{name} อยู่นอกช่วง {lo}–{hi}")
        return x

    @staticmethod
    def _inum(v, name, lo, hi):
        if isinstance(v, bool) or v is None or v == "":
            raise ValueError(f"{name} ต้องเป็นจำนวนเต็ม")
        x = float(v)
        if not math.isfinite(x) or x != int(x) or x < lo or x > hi:
            raise ValueError(f"{name} ต้องเป็นจำนวนเต็ม {lo}–{hi}")
        return int(x)

    def mvp_inputs(self, inp):
        """ตรวจค่าป้อนของ SCORE_FIRM → dict ที่ normalize แล้ว (ticker ของบริษัทที่มีอยู่ = ค่าที่เก็บไว้ + ค่าที่ส่งมาทับ)"""
        if not isinstance(inp, dict):
            raise ValueError("ค่าป้อนต้องเป็น object")
        extra = sorted(set(inp) - set(self.MVP_IN_KEYS))
        if extra:
            raise ValueError("ไม่รับคีย์ " + ", ".join(map(str, extra))[:80])
        base, ticker = {}, None
        if inp.get("ticker") not in (None, ""):
            t = str(inp["ticker"]).strip()[:16]
            t = t if t in self.comps else t.upper()
            c = self.comps.get(t)
            if not c:
                raise ValueError("ไม่พบบริษัท")
            ticker = t
            base = {"promotion": c["promo"], "family_share": c["fam"], "political_ties": c["pol"],
                    "female_share": c["fem"], "industry": c.get("ind"),
                    "fiscal_year": (self.co.get(t) or {}).get("fy") or 2023, "board_size": c.get("bsize")}
        g = lambda k: inp[k] if inp.get(k) not in (None, "") else base.get(k)
        bs = g("board_size")
        bs = self._inum(bs, "board_size", 1, 40) if bs not in (None, "") else None
        fem = inp.get("female_share")
        if fem in (None, "") and inp.get("women") not in (None, "") and bs:
            fem = self._inum(inp["women"], "women", 0, bs) / bs
        if fem in (None, ""):
            fem = base.get("female_share")
        out = dict(ticker=ticker,
                   promotion=self._fnum(g("promotion"), "promotion", 0, 10),
                   family_share=self._fnum(g("family_share"), "family_share", 0, 1),
                   political_ties=self._inum(1 if g("political_ties") is True else 0 if g("political_ties") is False
                                             else g("political_ties"), "political_ties", 0, 1),
                   female_share=self._fnum(fem, "female_share", 0, 1),
                   industry=self._inum(g("industry"), "industry", 1, 8),
                   fiscal_year=K.fy_ce(self._inum(g("fiscal_year") or 2023, "fiscal_year", 1990, 2700)),
                   board_size=bs)
        out["stored"] = bool(ticker and out["female_share"] == base.get("female_share")
                             and out["promotion"] == base.get("promotion") and out["family_share"] == base.get("family_share")
                             and out["political_ties"] == base.get("political_ties"))
        return out

    def fy_status(self, fy):
        code = K.fy_status(fy)
        y = K.fy_ce(fy)
        lab = {"PASS": ("PASS", "ผ่าน (PASS)"), "CAUTION": ("CAUTION", "ควรระวัง (CAUTION)"), "FAIL": ("FAIL", "ไม่ผ่าน (FAIL)"),
               "NYV": ("Not yet validated", "ยังไม่ตรวจความตรง")}[code]
        return {"code": code, "fy": y, "label_en": lab[0], "label_th": lab[1],
                "rule_en": f"FY{y} letter → outcome {y + 1} · {lab[0]}",
                "rule_th": f"สารปีบัญชี {y} → ผลลัพธ์ปี {y + 1} · {lab[1]}",
                "whatIfAllowed": code != "FAIL", "readingAllowed": code != "FAIL"}

    def _score_core(self, v):
        """คะแนนเต็มชุด (ภายใน) — ค่าดิบ + เปอร์เซ็นไทล์ (ยังไม่ปัด)"""
        P, F, G, W, _ = self.cen(v["promotion"], v["family_share"], v["political_ties"], v["female_share"])
        a = self.b1 + self.dF * F + self.dG * G + self.dW * W
        b = P * a
        a1 = self.b1 + self.dW * W
        b1 = P * a1
        o, o1 = _mid_rank(self.refB, b), _mid_rank(self.refT1, b1)
        t, row = v.get("ticker"), None
        if t and v.get("stored") and self.co.get(t, {}).get("band"):
            bd, src = list(self.co[t]["band"]), "stata"
        else:
            bd, src = self.kr.band_raw(P, F, G, W) if self.kr else [float("nan")] * 2, "kr"
        bd1 = self.kr.band_raw(P, F, G, W, t1=True) if self.kr else [float("nan")] * 2
        Pw, Fw, Ww = self.w(v["promotion"], "P"), self.w(v["family_share"], "F"), self.w(v["female_share"], "W")
        return dict(cP=P, W=Ww, amp=a, B=b, X=_mid_rank(self.refP, Pw), Y=_mid_rank(self.refAmp, a), ois=o, band=bd,
                    band_src=src, quad=self.quad(P, a), a1=a1, B1=b1, Y1=_mid_rank(self.refAmpT1, a1), o1=o1, band1=bd1,
                    quad1=self.quad(P, a1),
                    clamped={"promotion": self.clipped(v["promotion"], "P"), "family_share": self.clipped(v["family_share"], "F"),
                             "female_share": self.clipped(v["female_share"], "W")})

    def _pack(self, r, public):
        tu = lambda bd: self.tier(bd[0]) != self.tier(bd[1])
        out = {"X": r1(r["X"]), "Y": r1(r["Y"]), "quad": r["quad"], "quad_name": self.QN_FULL[r["quad"]],
               "ois": r1(r["ois"]), "band90": [r1(r["band"][0]), r1(r["band"][1])], "band_source": r["band_src"],
               "tier": self.tier(r["ois"]), "tier_uncertain": tu(r["band"]),
               "female_share": round(r["W"], 6),
               "t1": {"Y": r1(r["Y1"]), "quad": r["quad1"], "quad_name": self.QN_FULL[r["quad1"]], "ois": r1(r["o1"]),
                      "band90": [r1(r["band1"][0]), r1(r["band1"][1])], "tier": self.tier(r["o1"]),
                      "tier_uncertain": tu(r["band1"]), "chip": "CAUTION"},
               "clamped": dict(r["clamped"])}
        if not public:
            out.update(cP=r["cP"], amp=r["amp"], B=r["B"])
            out["t1"]["amp"] = r["a1"]
            out["_raw"] = {"X": r["X"], "Y": r["Y"], "ois": r["ois"], "band90": list(r["band"]), "Y1": r["Y1"],
                           "ois1": r["o1"], "band1": list(r["band1"])}
        return out

    def mvp_score(self, inp, public=True):
        """SCORE_FIRM — ให้คะแนนบริษัทหนึ่งชุดเทียบ REF-928 edit9 ที่ freeze แล้ว (ไม่เพิ่มเข้าฐาน)"""
        try:
            v = self.mvp_inputs(inp)
        except (TypeError, ValueError) as e:
            return {"ok": False, "error": str(e)}
        fys = self.fy_status(v["fiscal_year"])
        if v["industry"] not in K.IN_DOMAIN_IND:
            return {"ok": False, "error": "board_profile_only", "group": 5, "provides": "board_profile",
                    "reason": "Financials / outside industries 1–7 → Board Profile only (D2, R4)", "fyStatus": fys,
                    "version": self.version}
        r = self._score_core(v)
        out = {"ok": True, "version": self.version, "fyStatus": fys,
               "in_reference": bool(v["ticker"] and v["ticker"] in self.co), "added_to_REF928": False,
               "inputs": {k: v[k] for k in ("ticker", "promotion", "family_share", "political_ties", "female_share",
                                            "industry", "fiscal_year", "board_size")}}
        out.update(self._pack(r, public))
        return out

    def mvp_whatif(self, req, public=True):
        """MVP_WHATIF — What-if สัดส่วนกรรมการหญิงพร้อม guardrails G1–G6 (เฉพาะ W เปลี่ยน)"""
        fail = lambda msg, **k: dict({"ok": False, "error": msg, "version": self.version}, **k)
        if not isinstance(req, dict):
            return fail("ค่าป้อนต้องเป็น object")
        extra = sorted(set(req) - set(self.WHATIF_KEYS))
        if extra:
            return fail("ไม่รับคีย์ " + ", ".join(map(str, extra))[:80])
        base = req.get("base")
        base = {"ticker": base} if isinstance(base, str) else dict(base or {})
        bs = req.get("board_size")
        if bs in (None, ""):
            return fail("board_size_required", gate={"D4": False})
        try:
            N = self._inum(bs, "board_size", 3, 40)
        except ValueError as e:
            return fail(str(e), gate={"D4": False})
        base.pop("women", None)
        base["board_size"] = N
        if base.get("female_share") in (None, "") and req.get("women_now") not in (None, "") and not base.get("ticker"):
            try:
                base["female_share"] = self._inum(req["women_now"], "women_now", 0, N) / N
            except ValueError as e:
                return fail(str(e))
        try:
            v = self.mvp_inputs(base)
        except (TypeError, ValueError) as e:
            return fail(str(e))
        try:
            k = req.get("women_now")
            k = self._inum(k, "women_now", 0, N) if k not in (None, "") else int(jround(v["female_share"] * N))
            mode = str(req.get("mode") or "replace").lower()
            if mode not in ("replace", "add_seat"):
                raise ValueError("mode ต้องเป็น replace หรือ add_seat")
            ts = req.get("target_share")
            if req.get("women_target") not in (None, ""):
                kt = self._inum(req["women_target"], "women_target", 0, 80)
                if kt < k:
                    return fail("G2: increase only — women_target must be ≥ women_now", gate={"G2": False})
                N2 = N + (kt - k) if mode == "add_seat" else N
                if kt > N2:
                    raise ValueError("women_target เกินขนาดบอร์ด")
                w2 = kt / N2
            elif ts not in (None, ""):
                w2 = self._fnum(ts, "target_share", 0, 1)
                kt, N2 = None, N
                if w2 < k / N:
                    return fail("G2: increase only — target_share must be ≥ current share", gate={"G2": False})
            else:
                raise ValueError("ต้องระบุ women_target หรือ target_share")
        except (TypeError, ValueError) as e:
            return fail(str(e))
        if w2 > 0.5 + 1e-12:
            return fail("G4: target share must be ≤ 50%", gate={"G4": False})
        fys = self.fy_status(v["fiscal_year"])
        if v["industry"] not in K.IN_DOMAIN_IND:
            return fail("board_profile_only", group=5, provides="board_profile", fyStatus=fys)
        v0 = dict(v, female_share=k / N)
        v0["stored"] = bool(v.get("stored") and abs(k / N - v["female_share"]) < 1e-12)
        if v0["stored"]:
            v0["female_share"] = v["female_share"]
        v1 = dict(v, female_share=w2, stored=False)
        c0, c1 = self._score_core(v0), self._score_core(v1)
        Pw = self.w(v["promotion"], "P")
        jn_pass = Pw >= self.jn["p"]
        suspended = fys["code"] == "FAIL"
        withheld = (not jn_pass) and not suspended
        dW = c1["W"] - c0["W"]
        dB, mult, mb = K.whatif_multiplier(c0["cP"], dW)
        ws = c0["W"] - c0["amp"] / self.dW
        ws1 = c0["W"] - c0["a1"] / self.dW
        gate = {"G1": {"pass": True, "rule": "female share only (tenure, family, political ties fixed)"},
                "G2": {"pass": True, "rule": "increase only"},
                "G3": {"pass": jn_pass, "rule": f"promotion ≥ {self.jn['p']} (P{self.jn['pct']})",
                       "bound_promotion": self.jn["p"], "bound_pct": self.jn["pct"]},
                "G4": {"pass": True, "rule": "targets ≤ 50%"},
                "G5": {"pass": not suspended, "rule": "What-if suspended in FAIL years", "fy": fys["code"]},
                "G6": {"pass": True, "rule": "relational wording"},
                "jn_pass": jn_pass, "promotion_pct": r1(c0["X"]), "bound_pct": self.jn["pct"],
                "reason": ("G5: FY status FAIL — normal reading withheld, What-if suspended (R3)" if suspended else
                           "G3: promotion below the Johnson–Neyman bound — score change withheld" if withheld else "all gates pass")}
        out = {"ok": True, "version": self.version, "mode": mode, "board_size": N, "board_size_sim": N2,
               "women_now": k, "women_target": kt, "target_share": round(w2, 6), "fyStatus": fys, "gate": gate,
               "withheld": withheld, "suspended": suspended,
               "cur": self._pack(c0, public), "sim": None if suspended else self._pack(c1, public),
               "dW": round(dW, 6) if public else dW,
               "W_star": round(ws, 3) if public else ws, "W_star_headcount": max(0, math.ceil(ws * N - 1e-9)),
               "W_star_headcount_exact": round(ws * N, 2),
               "W_star_T1": round(ws1, 3) if public else ws1, "W_star_T1_headcount": max(0, math.ceil(ws1 * N - 1e-9)),
               "dB": None, "multiplier": None, "multiplier_band90": None, "sentence_en": None, "sentence_th": None}
        if suspended:
            out["message_en"] = f"FY{fys['fy']} status FAIL: normal reading withheld and What-if suspended (R3, G5)."
            out["message_th"] = f"ปีบัญชี {fys['fy']} สถานะ FAIL: งดการอ่านตามปกติและระงับ What-if (R3, G5)"
            return out
        if withheld:
            for key in ("ois", "band90", "tier", "tier_uncertain", "band_source"):
                out["sim"][key] = None
            for key in ("ois", "band90", "tier", "tier_uncertain"):
                out["sim"]["t1"][key] = None
            out["message_en"] = "Score change withheld (G3) — board-amplification movement only"
            out["message_th"] = "งดแสดงการเปลี่ยนแปลงของคะแนน (G3) — แสดงเฉพาะการเคลื่อนของ board amplification"
            return out
        out.update(dB=round(dB, 4) if public else dB, multiplier=round(mult, 3) if public else mult,
                   multiplier_band90=[round(mb[0], 3), round(mb[1], 3)] if public else [mb[0], mb[1]])
        out["sentence_en"], out["sentence_th"] = self.g6_sentence(w2, mult, mb)
        return out

    @staticmethod
    def g6_sentence(w2, mult, mb):
        sh = jround(w2 * 1000) / 10
        shs = (str(int(sh)) if sh == int(sh) else f"{sh:.1f}") + "%"
        pc = lambda m: jround(abs(m - 1) * 100)
        if abs(mult - 1) < 5e-4:
            return (f"In the reference data, a board with {shs} women and this level of CEO drive is associated with about the same "
                    f"expected open-innovation activity as the current board, other factors held constant.",
                    f"ในข้อมูลอ้างอิง โครงสร้างที่มีกรรมการหญิง {shs} ร่วมกับแรงขับ CEO ระดับนี้ สัมพันธ์กับจำนวนกิจกรรมนวัตกรรมแบบเปิด"
                    f"ที่คาดหมายใกล้เคียงโครงสร้างปัจจุบัน เมื่อปัจจัยอื่นคงที่ — เป็นความสัมพันธ์ ไม่ใช่การพยากรณ์")
        up = mult >= 1
        lo, hi = (mb[0], mb[1]) if up else (mb[1], mb[0])
        en = (f"In the reference data, a board with {shs} women and this level of CEO drive is associated with about "
              f"{pc(mult)}% {'more' if up else 'less'} expected open-innovation activity (90% range {pc(lo)}%–{pc(hi)}%), "
              f"other factors held constant.")
        th = (f"ในข้อมูลอ้างอิง โครงสร้างที่มีกรรมการหญิง {shs} ร่วมกับแรงขับ CEO ระดับนี้ สัมพันธ์กับจำนวนกิจกรรมนวัตกรรมแบบเปิด"
              f"ที่คาดหมาย{'สูงกว่า' if up else 'ต่ำกว่า'}โครงสร้างปัจจุบันประมาณ {pc(mult)}% (ช่วง 90%: {pc(lo)}% ถึง {pc(hi)}%) "
              f"เมื่อปัจจัยอื่นคงที่ — เป็นความสัมพันธ์ ไม่ใช่การพยากรณ์")
        return en, th


def load_comps(root=ROOT):
    return json.loads((root / "src" / "prof_data.json").read_text(encoding="utf-8"))["comps"]

# -*- coding: utf-8 -*-
"""ข้อมูลหลายปี · การแยกข้อมูลผู้ใช้ · การอนุมัติโดยผู้ดูแล · Validity คำนวณใหม่

หลักการ (บทความ §4.3 DP2 — ฐานอ้างอิงตรึง):
  * ข้อมูลปีใหม่ถูก "ให้คะแนนเทียบ" ฐานอ้างอิง REF-928 ที่ตรึงไว้ทันที — ไม่เคยถูกนำไปขยับฐานอ้างอิง
  * ความเที่ยงตรง (validity) คำนวณใหม่บน "ชุดประเมิน" = ปีอ้างอิงของบทความ + ปีใหม่ที่ผู้ดูแลอนุมัติแล้วและมีผลลัพธ์ปีถัดไป
  * การตรึงฐานใหม่ (re-freeze) เป็นเหตุการณ์ที่ตั้งใจและมีเวอร์ชัน — ระบบบันทึกได้เพียง "ข้อเสนอ" ไม่ทำเอง

การแยกข้อมูล: รายการที่ผู้ใช้ส่ง (status = pending/rejected/withdrawn) เห็นเฉพาะเจ้าของ (และผู้ดูแล)
  เมื่อผู้ดูแลอนุมัติ (approved) จึงเข้าสู่ชุดข้อมูลหลักที่ผู้ใช้ทุกคนเห็น

ไฟล์อ้างอิงรายแถว REF928_scored (NDA) อัปโหลดได้โดยผู้ดูแลเท่านั้น เก็บข้างไฟล์ฐานข้อมูล (โฟลเดอร์ private/)
  ไม่ถูกส่งกลับให้เบราว์เซอร์ทั้งไฟล์ — ผู้ใช้ได้เฉพาะค่าสรุปรายบริษัท (ปี, OIS, tier, quadrant, verdict ของปี)
  และสถิติ validity รายปี

การเก็บไฟล์ที่ผู้ใช้อัปโหลด (โหมดเซิร์ฟเวอร์):
  * สาร CEO (.txt): เก็บข้อความไม่เกิน 100 KB เพื่อให้ผู้ดูแลอ่านทวนตอนอนุมัติได้ + จำนวนคำ + SHA-256
  * แบบ 56-1 One Report (.pdf/.txt): เก็บเฉพาะชื่อไฟล์ ขนาด ชนิด SHA-256 จำนวนหน้า/คำ — ไม่เก็บตัวไฟล์
    (ไฟล์ใหญ่ เซิร์ฟเวอร์ทดสอบมีพื้นที่ 1 GB และตัวเลขที่ใช้ถูกคีย์ลงฟอร์มแล้ว — ผู้ดูแลใช้ SHA-256 ยืนยันว่าเป็นไฟล์เดียวกัน)

ไม่เชื่อค่าที่เบราว์เซอร์คำนวณ: ต้องส่งข้อความสาร CEO · เซิร์ฟเวอร์นับคำเอง (count_words = กติกาสำรองของ window.countWords:
  อักขระไทย ÷ 5 + token ละติน/ตัวเลข — เซิร์ฟเวอร์ไม่มีตัวตัดคำไทย) และคำนวณเปอร์เซ็นไทล์ภาษาเชิงรุกเองจาก server/lexicon.json
  (สกัดจาก src/lex.js + TILT_ANCHOR ด้วย  python3 -m server.data_api --build-lexicon · ทดสอบว่าตรงกับต้นฉบับใน test_data_api)
  ค่าจากเบราว์เซอร์เก็บไว้เทียบเท่านั้น (words_client / dp_client) · ไม่มี lexicon.json → ติดธง client_unverified ให้ผู้ดูแลเห็น

สิทธิ์ (ตรวจบนเซิร์ฟเวอร์ ผ่าน app.require_plan): /api/data/validity และ /api/data/refreeze (GET) = Pro ขึ้นไป หรือผู้ดูแล
  /api/data/history: ผู้ดูแล · Pro ขึ้นไป (ทุกบริษัท — เซิร์ฟเวอร์ไม่รู้เครดิตปลดล็อกรายบริษัทของ Pro ซึ่งยังอยู่ในเบราว์เซอร์)
  · Basic: เฉพาะ "บริษัทของตน" + บริษัทที่ตนเคยส่งข้อมูล
  ข้อจำกัดที่ต้องรู้: เซิร์ฟเวอร์ไม่มีข้อมูลจริงว่าใครเป็นของบริษัทใด — "บริษัทของตน" คือค่าแรกที่เบราว์เซอร์ประกาศใน header X-OIS-Own
  (บริษัทที่ผู้ใช้เลือกตอนเข้าใช้) ซึ่งถูกตรึงกับบัญชีในตาราง data_own และบันทึกใน data_log (own_declare) — ผู้ใช้เลือกบริษัทใดก็ได้
  ในครั้งแรก แต่เปลี่ยนเองภายหลังไม่ได้ (ผู้ดูแลลบแถวใน data_own) · PLAN_SOURCE=client = ระดับมาจาก header ของเบราว์เซอร์ (ช่วงทดสอบ)
"""
import csv
import io
import json
import math
import os
import re
import sys
import threading
import time
from pathlib import Path

try:
    from starlette.requests import Request
    from starlette.responses import JSONResponse
    from starlette.routing import Route
except Exception:  # noqa: BLE001  ให้ทดสอบส่วนสถิติได้โดยไม่ต้องมี starlette
    Request = JSONResponse = Route = None

ROOT = Path(__file__).resolve().parent.parent
MIN_WORDS = 2000
MIN_N_VALIDITY = 30
MAX_CEO_TEXT = 100 * 1024
MAX_REF_BYTES = 5 * 1024 * 1024
REF_COLS = ("ticker", "year", "open_innov", "B_EG", "OIS", "tier", "quadrant", "regime")
QUAD_NUM = {"1": "A", "2": "B", "3": "C", "4": "D"}

# เกณฑ์ตัดสินที่กำหนดล่วงหน้า (บทความ §3.3 · do-file Section 5 · บันทึก 24 ส.ค. 2026)
VTH = {"sp": (0.15, 0.05), "auc": (0.60, 0.55), "lift": (2.0, 1.3)}

# ตารางที่ 3 ของบทความ (ใช้เมื่อเซิร์ฟเวอร์ยังไม่มีไฟล์อ้างอิงรายแถว)
PAPER = {
    2019: dict(n=209, sp=0.311, p="<0.001", auc=0.686, ci=[0.608, 0.764], lift=4.39, v="PASS"),
    2020: dict(n=155, sp=0.120, p="0.14", auc=0.590, ci=[0.492, 0.688], lift=1.66, v="CAUTION"),
    2021: dict(n=181, sp=0.207, p="0.005", auc=0.624, ci=[0.539, 0.709], lift=3.70, v="PASS"),
    2022: dict(n=187, sp=-0.003, p="0.96", auc=0.494, ci=[0.407, 0.581], lift=1.34, v="FAIL"),
    2023: dict(n=196, sp=0.214, p="0.003", auc=0.659, ci=[0.582, 0.737], lift=4.11, v="PASS"),
}
PAPER_POOLED = dict(n=928, sp=0.179, p="<0.001", auc=0.614, ci=[0.575, 0.652], lift=2.38, v="PASS")


# ============================================================================ สถิติ (pure Python)
def rank_avg(x):
    """อันดับแบบเฉลี่ยเมื่อค่าเท่ากัน (1..n)"""
    idx = sorted(range(len(x)), key=lambda i: x[i])
    r = [0.0] * len(x)
    i = 0
    while i < len(idx):
        j = i
        while j + 1 < len(idx) and x[idx[j + 1]] == x[idx[i]]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            r[idx[k]] = avg
        i = j + 1
    return r


def pearson(a, b):
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    sab = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    saa = sum((x - ma) ** 2 for x in a)
    sbb = sum((y - mb) ** 2 for y in b)
    if saa <= 0 or sbb <= 0:
        return None
    return sab / math.sqrt(saa * sbb)


def _betacf(a, b, x):
    """continued fraction ของ incomplete beta (Numerical Recipes 6.4)"""
    qab, qap, qam = a + b, a + 1, a - 1
    c, d = 1.0, 1 - qab * x / qap
    d = 1 / (d if abs(d) > 1e-300 else 1e-300)
    h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        d = 1 / (d if abs(d) > 1e-300 else 1e-300)
        c = 1 + aa / c if abs(c) > 1e-300 else 1 + aa / 1e-300
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        d = 1 / (d if abs(d) > 1e-300 else 1e-300)
        c = 1 + aa / c if abs(c) > 1e-300 else 1 + aa / 1e-300
        de = d * c
        h *= de
        if abs(de - 1) < 1e-14:
            break
    return h


def betainc(a, b, x):
    """regularized incomplete beta I_x(a, b)"""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    lb = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x)
    if x < (a + 1) / (a + b + 2):
        return math.exp(lb) * _betacf(a, b, x) / a
    return 1 - math.exp(lb) * _betacf(b, a, 1 - x) / b


def t_p_two_sided(t, df):
    return betainc(df / 2, 0.5, df / (df + t * t))


def spearman(s, y):
    """ρ = Pearson ของอันดับเฉลี่ย · p สองทางจาก t = ρ√((n−2)/(1−ρ²)) ที่ df = n−2 (แบบเดียวกับ Stata spearman)"""
    n = len(s)
    if n < 3:
        return None, None
    rho = pearson(rank_avg(s), rank_avg(y))
    if rho is None:
        return None, None
    if abs(rho) >= 1:
        return rho, 0.0
    t = rho * math.sqrt((n - 2) / (1 - rho * rho))
    return rho, t_p_two_sided(t, n - 2)


def pctile_stata(x, p):
    """_pctile ของ Stata (นิยามปริยาย): P = n·p/100 · ถ้า P เป็นจำนวนเต็ม = เฉลี่ย x(P), x(P+1) · ไม่ใช่ = x(⌊P⌋+1)"""
    v = sorted(x)
    n = len(v)
    P = n * p / 100.0
    if abs(P - round(P)) < 1e-9:
        k = int(round(P))
        if k <= 0:
            return v[0]
        if k >= n:
            return v[-1]
        return (v[k - 1] + v[k]) / 2
    return v[min(int(math.floor(P)), n - 1)]


def top_tercile(y):
    """กลุ่มบวก = ผลลัพธ์ ≥ เปอร์เซ็นไทล์ 66.667 (นับค่าที่เท่ากับจุดตัดเป็นกลุ่มบน — แบบเดียวกับ do-file)"""
    cut = pctile_stata(y, 66.667)
    return [1 if v >= cut else 0 for v in y], cut


def auc_mw(s, lab):
    """AUC = U / (n1·n0) ของ Mann–Whitney (คู่ที่คะแนนเท่ากันนับครึ่ง) — เท่ากับ roctab ของ Stata"""
    n1 = sum(lab)
    n0 = len(lab) - n1
    if n1 == 0 or n0 == 0:
        return None, n1, n0
    r = rank_avg(s)
    r1 = sum(ri for ri, l in zip(r, lab) if l)
    u = r1 - n1 * (n1 + 1) / 2
    return u / (n1 * n0), n1, n0


def hanley_mcneil(a, n1, n0):
    """SE ของ AUC ตาม Hanley & McNeil (1982): Q1 = A/(2−A), Q2 = 2A²/(1+A)"""
    if a is None or not n1 or not n0:
        return None
    q1, q2 = a / (2 - a), 2 * a * a / (1 + a)
    var = (a * (1 - a) + (n1 - 1) * (q1 - a * a) + (n0 - 1) * (q2 - a * a)) / (n1 * n0)
    return math.sqrt(max(var, 0.0))


def decile_lift(s, y):
    """xtile ของ Stata nq(10): จุดตัด = _pctile ที่ 10,20,…,90 · กลุ่ม i = ค่าแรกที่ s ≤ จุดตัด (ค่าเท่ากันอยู่กลุ่มเดียวกัน)
    lift = ค่าเฉลี่ยผลลัพธ์ของเดไซล์ 10 ÷ เดไซล์ 1"""
    cuts = [pctile_stata(s, 10 * i) for i in range(1, 10)]
    top, bot = [], []
    for v, o in zip(s, y):
        d = next((i for i, c in enumerate(cuts) if v <= c), 9)
        if d == 9:
            top.append(o)
        elif d == 0:
            bot.append(o)
    if not top or not bot:
        return None, None, None
    mt, mb = sum(top) / len(top), sum(bot) / len(bot)
    if mb == 0:
        return (math.inf if mt > 0 else None), mt, mb
    return mt / mb, mt, mb


def grade(v, th):
    if v is None:
        return None
    return "pass" if v >= th[0] else "caution" if v >= th[1] else "fail"


def verdict(sp, auc, lift):
    """ตกข้อใดต่ำกว่าระดับระวัง → FAIL · ผ่านครบสามข้อ → PASS · นอกนั้น CAUTION"""
    g = [grade(sp, VTH["sp"]), grade(auc, VTH["auc"]), grade(lift, VTH["lift"])]
    if None in g:
        return None
    if "fail" in g:
        return "FAIL"
    return "PASS" if g.count("pass") == 3 else "CAUTION"


def validity_stats(s, y):
    """ชุดสถิติครบหนึ่งแถว: n, ρ, p, AUC, CI (Hanley–McNeil), lift, verdict"""
    n = len(s)
    rho, p = spearman(s, y)
    lab, cut = top_tercile(y) if n else ([], None)
    a, n1, n0 = auc_mw(s, lab) if n else (None, 0, 0)
    se = hanley_mcneil(a, n1, n0)
    lift, mt, mb = decile_lift(s, y) if n >= 10 else (None, None, None)
    ci = [max(0.0, a - 1.96 * se), min(1.0, a + 1.96 * se)] if se is not None else None
    return {"n": n, "sp": rho, "p": p, "auc": a, "se": se, "ci": ci, "n_top": n1, "cut": cut,
            "lift": (None if lift is None or lift == math.inf else lift), "lift_inf": lift == math.inf,
            "d10": mt, "d1": mb,
            "v": verdict(rho, a, (1e9 if lift == math.inf else lift))}


# ============================================================================ นับคำ · พจนานุกรมภาษาเชิงรุก (คำนวณซ้ำบนเซิร์ฟเวอร์ — ไม่เชื่อค่าจากเบราว์เซอร์)
_TH = re.compile("[\u0E00-\u0E7F]")
_THRUN = re.compile("[\u0E00-\u0E7F]+")
_ALNUM = re.compile("[A-Za-z0-9]")
TH_CHARS_PER_WORD = 5
WORD_RULE = "เซิร์ฟเวอร์: อักขระไทย ÷ 5 (ปัดเศษ) + คำที่คั่นด้วยช่องว่างซึ่งมีตัวอักษร/ตัวเลข"


def count_words(t):
    """ตัวนับคำของเซิร์ฟเวอร์ = กติกาของ window.countWords (v2_app.js) เมื่อไม่มีตัวตัดคำภาษาไทย:
    ช่วงอักษรไทยนับเป็น จำนวนอักขระไทย ÷ 5 (ปัดเศษแบบ Math.round) · ส่วนที่เหลือนับ token ที่คั่นด้วยช่องว่างและมีตัวอักษร/ตัวเลข
    เซิร์ฟเวอร์ไม่มี Intl.Segmenter จึงใช้กติกาสำรองนี้เสมอ — เบราว์เซอร์ที่มีตัวตัดคำอาจนับได้ต่างกันเล็กน้อย
    ระบบเก็บทั้งสองค่า (words = ของเซิร์ฟเวอร์ ใช้ตัดสินเกณฑ์ · words_client = ของเบราว์เซอร์ ใช้เทียบ)"""
    t = str(t or "")
    if not t.strip():
        return 0
    th = sum(len(r) for r in _THRUN.findall(t))
    latin = sum(1 for w in _THRUN.sub(" ", t).split() if _ALNUM.search(w))
    return int(math.floor(th / TH_CHARS_PER_WORD + 0.5)) + latin


count_words_server = count_words


LEXICON_PATH = Path(__file__).resolve().parent / "lexicon.json"
_lex = {}


def build_lexicon(root=ROOT):
    """สกัดพจนานุกรม LEX (src/lex.js) และจุดยึด TILT_ANCHOR (src/v2_app.js) เป็น JSON ด้วย node — ใช้ตอน build/ทดสอบ
    รัน:  python3 -m server.data_api --build-lexicon"""
    import hashlib
    import subprocess
    lex_js = (root / "src" / "lex.js").read_text(encoding="utf-8")
    app_js = (root / "src" / "v2_app.js").read_text(encoding="utf-8")
    js = lex_js + "\nprocess.stdout.write(JSON.stringify({promotion: LEX.promotion.th.concat(LEX.promotion.en), " \
         "prevention: LEX.prevention.th.concat(LEX.prevention.en)}));"
    out = subprocess.run(["node", "-e", js], capture_output=True, check=True, timeout=60).stdout.decode("utf-8")
    d = json.loads(out)
    m = re.search(r"const TILT_ANCHOR\s*=\s*(\[[^;]*\]);", app_js)
    if not m:
        raise ValueError("ไม่พบ TILT_ANCHOR ใน src/v2_app.js")
    d["tilt_anchor"] = json.loads(re.sub(r"(?<![\d])\.(\d)", r"0.\1", m.group(1)))
    d["source"] = {"lex_js_sha256": hashlib.sha256(lex_js.encode("utf-8")).hexdigest(), "files": ["src/lex.js", "src/v2_app.js:TILT_ANCHOR"]}
    return d


def lexicon():
    """พจนานุกรมที่สกัดไว้ (server/lexicon.json) · ไม่มีไฟล์ → None (ระบบติดธงว่าค่าภาษามาจากเบราว์เซอร์ ไม่ได้ตรวจซ้ำ)"""
    if "d" not in _lex:
        try:
            _lex["d"] = json.loads(LEXICON_PATH.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            _lex["d"] = None
    return _lex["d"]


def _hits(low, words):
    n = 0
    for w in words:
        k = w.lower()
        if k:
            n += low.count(k)          # ไม่ซ้อนทับ — ตรงกับ indexOf(k, i + k.length) ของ hits() ใน v2_app.js
    return n


def _tilt_to_pct(x, A):
    if x <= A[0][0]:
        return A[0][1]
    if x >= A[-1][0]:
        return A[-1][1]
    for i in range(1, len(A)):
        if x <= A[i][0]:
            (x0, y0), (x1, y1) = A[i - 1], A[i]
            return int(_js_round(y0 + (y1 - y0) * (x - x0) / (x1 - x0)))
    return 50


def analyse_text(text, lex=None):
    """คำนวณเปอร์เซ็นไทล์ภาษาเชิงรุก (dp) จากข้อความสาร CEO ด้วยพจนานุกรมเดียวกับเบราว์เซอร์ (analyseText ใน v2_app.js)"""
    lex = lex or lexicon()
    if not lex:
        return None
    low = (text or "").lower()
    pro, pre = _hits(low, lex["promotion"]), _hits(low, lex["prevention"])
    tot = pro + pre
    tilt = pro / tot if tot else .5
    return {"pro": pro, "pre": pre, "tilt": tilt, "dp": _tilt_to_pct(tilt, lex["tilt_anchor"])}


# ============================================================================ ฐานข้อมูล (ใช้ตัวเชื่อมต่อเดียวกับ server/db.py)
def _app():
    m = sys.modules.get(f"{__package__}.app") if __package__ else None
    return m or sys.modules.get("server.app") or sys.modules.get("app")


_tables_ok = set()
_tlock = threading.Lock()


def _db():
    A = _app()
    d = A.DBX if A is not None else __import__("server.db", fromlist=["get_db"]).get_db()
    key = (id(d), getattr(d, "path", ""))
    if key not in _tables_ok:
        with _tlock:
            if key not in _tables_ok:
                pk = "BIGSERIAL PRIMARY KEY" if d.kind == "postgres" else "INTEGER PRIMARY KEY AUTOINCREMENT"
                for q in (
                    f"""CREATE TABLE IF NOT EXISTS data_records (
                          id {pk}, owner_id INTEGER NOT NULL, owner_label TEXT, ticker TEXT NOT NULL, fy INTEGER NOT NULL,
                          status TEXT NOT NULL, payload TEXT NOT NULL, score TEXT, created TEXT NOT NULL, updated TEXT,
                          reviewer_id INTEGER, reviewer_label TEXT, reviewed TEXT, review_comment TEXT)""",
                    "CREATE INDEX IF NOT EXISTS ix_dr_owner ON data_records(owner_id, status)",
                    "CREATE INDEX IF NOT EXISTS ix_dr_status ON data_records(status, ticker, fy)",
                    f"""CREATE TABLE IF NOT EXISTS data_log (
                          id {pk}, record_id INTEGER, actor_id INTEGER, actor_label TEXT, action TEXT NOT NULL,
                          comment TEXT, created TEXT NOT NULL)""",
                    f"""CREATE TABLE IF NOT EXISTS data_own (
                          owner_id INTEGER PRIMARY KEY, ticker TEXT NOT NULL, created TEXT NOT NULL)""",
                    f"""CREATE TABLE IF NOT EXISTS data_refreeze (
                          id {pk}, actor_id INTEGER, actor_label TEXT, comment TEXT, snapshot TEXT, created TEXT NOT NULL)""",
                ):
                    d._exec(q)
                _tables_ok.add(key)
    return d


def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _ref_dir():
    d = _db()
    base = Path(os.environ.get("DATA_DIR") or (Path(d.path).parent if d.kind == "sqlite" else ROOT / "data"))
    p = base / "private"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _ref_path():
    return _ref_dir() / "REF928_scored.csv"


# ============================================================================ ฐานอ้างอิงรายแถว (NDA) — อ่านในหน่วยความจำ ไม่ส่งออก
_ref_cache = {"mtime": None, "rows": None}


def parse_ref_csv(text):
    """ตรวจหัวตารางและแปลงแถว → list ของ {ticker, fy, y, B, ois, tier, quad, regime}; ผิดรูปแบบ → ValueError"""
    rd = csv.DictReader(io.StringIO(text))
    cols = set(rd.fieldnames or [])
    miss = [c for c in REF_COLS if c not in cols]
    if miss:
        raise ValueError("ไฟล์ขาดคอลัมน์: " + ", ".join(miss))
    out = []
    for i, r in enumerate(rd):
        if i > 20000:
            raise ValueError("แถวมากเกินไป")
        try:
            out.append({"ticker": str(r["ticker"]).strip().upper()[:16], "fy": int(float(r["year"])),
                        "y": float(r["open_innov"]), "B": float(r["B_EG"]), "ois": float(r["OIS"]),
                        "tier": int(float(r["tier"])), "quad": QUAD_NUM.get(str(r["quadrant"]).strip(), str(r["quadrant"]).strip()[:1]),
                        "regime": (r.get("regime") or "").strip().upper()[:8] or None})
        except (TypeError, ValueError) as e:
            raise ValueError(f"แถวที่ {i + 2} อ่านค่าไม่ได้ ({type(e).__name__})")
    if not out:
        raise ValueError("ไฟล์ว่าง")
    return out


def load_ref(path=None):
    p = Path(path) if path else _ref_path()
    if not p.exists():
        return None
    mt = p.stat().st_mtime
    if path is None and _ref_cache["mtime"] == mt:
        return _ref_cache["rows"]
    rows = parse_ref_csv(p.read_text(encoding="utf-8-sig"))
    if path is None:
        _ref_cache.update(mtime=mt, rows=rows)
    return rows


# ============================================================================ คะแนน (เทียบฐานอ้างอิงที่ตรึงไว้ — ใช้ฟังก์ชันสาธารณะของ ois_engine)
_prof = {}


def _comps():
    if "comps" not in _prof:
        try:
            d = json.loads((ROOT / "src" / "prof_data.json").read_text(encoding="utf-8"))
            _prof["comps"] = {c["t"]: c for c in d["comps"]}
            _prof["ind"] = d.get("ind", {})
        except Exception:  # noqa: BLE001
            _prof["comps"], _prof["ind"] = {}, {}
    return _prof["comps"]


def _js_round(x):
    return math.floor(x + 0.5)


def _q8(b):
    return _js_round(b * 1e8) / 1e8


def _mid_rank(sorted_ref, v):
    import bisect
    lo, hi = bisect.bisect_left(sorted_ref, v), bisect.bisect_right(sorted_ref, v)
    return 100 * (lo + .5 * (hi - lo)) / len(sorted_ref)


def promo_at_pct(dp, ref_p):
    """ย้อนเปอร์เซ็นไทล์ภาษาเป็นค่า promotion ดิบ (ตรงกับ promoAtPct ใน v2_app.js)"""
    n = len(ref_p)
    return ref_p[min(max(_js_round(dp / 100 * n) - 1, 0), n - 1)]


def _score_inputs(promo_spec, fam, pol, fem, ten, ind, fy, band=True):
    """ให้คะแนนหนึ่งชุดค่าป้อนเทียบ REF-928 ที่ตรึงไว้ ผ่าน ois_engine (Engine.score ถ้ามี — ไม่แก้ ois_engine)
    promo_spec = ค่าดิบ (float) หรือ {"pct": dp} · คืน (ผลที่แสดงได้, B ดิบสำหรับ validity ฝั่งเซิร์ฟเวอร์เท่านั้น)"""
    A = _app()
    eng = getattr(A, "ENGINE", None)
    if eng is not None:
        it = {"promo": promo_spec, "fam": fam, "pol": pol, "fem": fem, "ten": ten, "ind": ind, "band": band}
        out = (getattr(eng, "score_record", None) or eng.score)(it)     # ตัวให้คะแนนภายใน (ค่าป้อนเต็มชุด) — ไม่ใช่ /api/score สาธารณะ
        promo = eng.resolve(it)["promo"]
        cP, a = eng.cp(promo), eng.amp(fam, pol, fem)
        return {"ois": out.get("ois"), "ois_ind": out.get("oisInd"), "tier": out.get("tier"), "quad": out.get("quad"),
                "band": out.get("band"), "dp": out.get("dp"), "regime": eng.regime.get(str(fy)), "ref": eng.version,
                "record_id": getattr(eng, "record_id", eng.version)}, cP * a
    # เซิร์ฟเวอร์รุ่นก่อน Engine: ใช้ฟังก์ชันระดับโมดูลของ ois_engine + KR ของ app
    E, M = A.E, A.MODEL
    promo = promo_at_pct(float(promo_spec["pct"]), M["refP"]) if isinstance(promo_spec, dict) else float(promo_spec)
    amp = E.amp_of(fam, pol, fem)
    cP = E.wins(promo, "P") - E.M["P"]
    B = cP * amp
    ois = _mid_rank(M["refB"], _q8(B))
    cuts = M.get("tierCuts") or [75, 50, 25]
    ref_ind = (M.get("refInd") or {}).get(str(ind))
    return {"ois": _js_round(ois * 10) / 10, "ois_ind": _js_round(_mid_rank(ref_ind, _q8(B)) * 10) / 10 if ref_ind else None,
            "tier": 1 if ois >= cuts[0] else 2 if ois >= cuts[1] else 3 if ois >= cuts[2] else 4,
            "quad": ("A" if amp >= 0 else "B") if cP >= 0 else ("D" if amp >= 0 else "C"),
            "band": A.KR.band90(promo, fam, pol, fem) if band and hasattr(A, "KR") else None,
            "dp": None, "regime": (M.get("regime") or {}).get(str(fy)), "ref": M.get("version"), "record_id": M.get("version")}, B


def score_record(p):
    """คำนวณ OIS / tier / band / quadrant / regime ของหนึ่งบริษัท-ปี เทียบ REF-928 ที่ตรึงไว้ (ไม่แตะฐานอ้างอิง)
    ค่าดิบ (B) เก็บในคีย์ _B สำหรับคำนวณ validity บนเซิร์ฟเวอร์เท่านั้น — _pub() ตัดออกก่อนส่งให้เบราว์เซอร์"""
    liwc = p.get("liwc")
    spec = float(liwc) if liwc is not None else {"pct": float(p["dp"])}
    sc, B = _score_inputs(spec, float(p["fam"]), 1 if p.get("pol") else 0, float(p["fem"]), float(p["ten"]), p.get("ind"), p["fy"])
    sc.update(promo_src="liwc" if liwc is not None else "lexicon", frozen=True, scored=_now(), _B=B)
    return sc


# ============================================================================ ตรวจคุณภาพข้อมูล
def _f(x, lo, hi, name, ints=False):
    try:
        v = float(x)
    except (TypeError, ValueError):
        raise ValueError(f"{name}: ต้องเป็นตัวเลข")
    if not math.isfinite(v) or v < lo or v > hi:
        raise ValueError(f"{name}: ต้องอยู่ระหว่าง {lo}–{hi}")
    if ints and abs(v - round(v)) > 1e-9:
        raise ValueError(f"{name}: ต้องเป็นจำนวนเต็ม")
    return int(round(v)) if ints else v


def clean_payload(b):
    """ตรวจและทำความสะอาดคำขอ — ค่านอกช่วงถูกปฏิเสธ (ไม่ clip เงียบ ๆ)"""
    if not isinstance(b, dict):
        raise ValueError("รูปแบบคำขอไม่ถูกต้อง")
    t = str(b.get("ticker") or "").strip().upper()[:16]
    if not t or not all(ch.isalnum() or ch in "-._&" for ch in t):
        raise ValueError("ticker ไม่ถูกต้อง")
    fy = _f(b.get("fy"), 2010, 2040, "ปีบัญชี (ค.ศ.)", True)
    bs = _f(b.get("bsize"), 3, 30, "จำนวนกรรมการ", True)
    nf = _f(b.get("nfem"), 0, bs, "จำนวนกรรมการหญิง", True)
    nm = _f(b.get("nfam"), 0, bs, "จำนวนกรรมการครอบครัว", True)
    ten = _f(b.get("ten"), 0, 40, "อายุงานเฉลี่ย")
    comps = _comps()
    ind = b.get("ind")
    if t in comps:
        ind = comps[t]["ind"]
    ind = _f(ind, 1, 7, "กลุ่มอุตสาหกรรม", True)
    ceo = b.get("ceo") if isinstance(b.get("ceo"), dict) else {}
    text = ceo.get("text") if isinstance(ceo.get("text"), str) else None
    if text is not None and len(text.encode("utf-8")) > MAX_CEO_TEXT:
        text = text.encode("utf-8")[:MAX_CEO_TEXT].decode("utf-8", "ignore")
    fname = str(ceo.get("filename") or "")[:160]
    if fname and not fname.lower().endswith(".txt"):
        raise ValueError("สาร CEO ต้องเป็นไฟล์ .txt เท่านั้น")
    # ไม่เชื่อจำนวนคำ/ค่าภาษาที่เบราว์เซอร์คำนวณ: ต้องส่งข้อความ แล้วเซิร์ฟเวอร์นับและคำนวณซ้ำเอง (ค่าจากเบราว์เซอร์เก็บไว้เทียบเท่านั้น)
    if text is None or not text.strip():
        raise ValueError("ต้องส่งข้อความสาร CEO (.txt) — เซิร์ฟเวอร์นับคำและคำนวณค่าภาษาเชิงรุกจากข้อความเอง")
    w_cl = ceo.get("words")
    w_cl = int(w_cl) if isinstance(w_cl, (int, float)) and not isinstance(w_cl, bool) and math.isfinite(w_cl) and 0 <= w_cl <= 1e7 else None
    words = count_words_server(text)
    if words < MIN_WORDS:
        raise ValueError(f"สาร CEO มี {words:,} คำตามตัวนับของเซิร์ฟเวอร์ (อักขระไทย ÷ 5 + คำภาษาอังกฤษ/ตัวเลข"
                         + (f" · เบราว์เซอร์นับได้ {w_cl:,} คำ" if w_cl is not None else "") + f") — ต้องมีอย่างน้อย {MIN_WORDS:,} คำ")
    liwc = b.get("liwc")
    liwc = None if liwc in (None, "") else _f(liwc, 0, 20, "ค่า LIWC-22 promotion")
    dp_in = ceo.get("dp", b.get("dp"))
    dp_cl = None if dp_in in (None, "") else _f(dp_in, 0, 100, "เปอร์เซ็นไทล์ภาษาเชิงรุก")
    an = analyse_text(text)
    if an is not None:
        dp, dp_src, pro, pre = an["dp"], "server", an["pro"], an["pre"]
    else:   # ไม่มี server/lexicon.json — รับค่าของเบราว์เซอร์แต่ติดธง "ยังไม่ได้ตรวจ" ให้ผู้ดูแลเห็นก่อนอนุมัติ
        dp, dp_src = dp_cl, "client_unverified"
        pro = ceo.get("pro") if isinstance(ceo.get("pro"), int) else None
        pre = ceo.get("pre") if isinstance(ceo.get("pre"), int) else None
    r = b.get("r561") if isinstance(b.get("r561"), dict) else None
    r561 = None
    if r and r.get("filename"):
        rn = str(r["filename"])[:160]
        if not rn.lower().endswith((".pdf", ".txt")):
            raise ValueError("แบบ 56-1 One Report รับเฉพาะ .pdf หรือ .txt")
        r561 = {"filename": rn, "type": "pdf" if rn.lower().endswith(".pdf") else "txt",
                "size": _f(r.get("size", 0), 0, 5e8, "ขนาดไฟล์", True),
                "sha256": re.sub(r"[^0-9a-f]", "", str(r.get("sha256") or "").lower())[:64] or None,
                "pages": None if r.get("pages") in (None, "") else _f(r.get("pages"), 0, 5000, "จำนวนหน้า", True),
                "words": None if r.get("words") in (None, "") else _f(r.get("words"), 0, 5e6, "จำนวนคำ 56-1", True)}
    oi = b.get("oi_next")
    oi = None if oi in (None, "") else _f(oi, 0, 1000, "จำนวนกิจกรรม open innovation ปีถัดไป", True)
    name = str(b.get("name") or (comps.get(t) or {}).get("n") or "")[:160]
    return {"ticker": t, "name": name, "new_ticker": t not in comps, "ind": ind, "fy": fy, "bsize": bs, "nfem": nf,
            "nfam": nm, "fem": nf / bs, "fam": nm / bs, "pol": 1 if b.get("pol") else 0, "ten": ten, "liwc": liwc, "dp": dp,
            "dp_src": dp_src,
            "ceo": {"filename": fname, "words": words, "words_client": w_cl, "words_rule": WORD_RULE,
                    "sha256": re.sub(r"[^0-9a-f]", "", str(ceo.get("sha256") or "").lower())[:64] or None,
                    "pro": pro, "pre": pre, "dp": dp, "dp_client": dp_cl, "dp_src": dp_src,
                    "pro_client": ceo.get("pro") if isinstance(ceo.get("pro"), int) else None,
                    "pre_client": ceo.get("pre") if isinstance(ceo.get("pre"), int) else None,
                    "text": text, "stored_text": True},
            "r561": r561, "oi_next": oi}


def quality_checks(p, prev_fy=None, dup=False):
    """รายการตรวจคุณภาพที่ผู้ดูแลเห็นก่อนอนุมัติ: [{k, ok: 'ok'|'warn'|'fail', t}]"""
    out = []
    add = lambda k, st, t: out.append({"k": k, "ok": st, "t": t})
    add("สัดส่วนอยู่ในช่วง 0–1", "ok" if 0 <= p["fem"] <= 1 and 0 <= p["fam"] <= 1 else "fail",
        f"กรรมการหญิง {p['fem']:.3f} · กรรมการครอบครัว {p['fam']:.3f}")
    add("จำนวนคนไม่เกินขนาดบอร์ด", "ok" if p["nfem"] <= p["bsize"] and p["nfam"] <= p["bsize"] else "fail",
        f"หญิง {p['nfem']} · ครอบครัว {p['nfam']} · บอร์ด {p['bsize']} คน")
    add("อายุงานเฉลี่ย 0–40 ปี", "ok" if 0 <= p["ten"] <= 40 else "fail", f"{p['ten']:.1f} ปี")
    ceo = p.get("ceo") or {}
    w, wc = ceo.get("words") or 0, ceo.get("words_client")
    add("สาร CEO ≥ 2,000 คำ", "ok" if w >= MIN_WORDS else "fail",
        f"{w:,} คำ (นับบนเซิร์ฟเวอร์)" + (f" · เบราว์เซอร์นับได้ {wc:,} คำ" if isinstance(wc, int) else ""))
    src = ceo.get("dp_src")
    if src:
        dc, ds = ceo.get("dp_client"), ceo.get("dp")
        if src == "server":
            same = dc is None or abs(float(dc) - float(ds)) < 1e-9
            add("ค่าภาษาเชิงรุกคำนวณซ้ำบนเซิร์ฟเวอร์", "ok" if same else "warn",
                f"เปอร์เซ็นไทล์ {ds} (คำเชิงรุก {ceo.get('pro')} · เชิงป้องกัน {ceo.get('pre')})"
                + ("" if same else f" — เบราว์เซอร์ส่งมา {dc} · ใช้ค่าของเซิร์ฟเวอร์"))
        elif src == "client_unverified":
            add("ค่าภาษาเชิงรุกคำนวณซ้ำบนเซิร์ฟเวอร์", "warn",
                f"ค่าจากเบราว์เซอร์ ยังไม่ได้ตรวจ (client-computed, unverified) — เปอร์เซ็นไทล์ {ds} · ผู้ดูแลต้องตรวจทานกับข้อความก่อนอนุมัติ")
    if prev_fy is None:
        add("ลำดับปีบัญชี", "warn", "ยังไม่มีปีก่อนหน้าของบริษัทนี้ในระบบ — ตรวจว่าเป็นบริษัทใหม่จริง")
    elif p["fy"] == prev_fy + 1:
        add("ลำดับปีบัญชี", "ok", f"ต่อจากปี {prev_fy + 543} ({prev_fy})")
    elif p["fy"] <= prev_fy:
        add("ลำดับปีบัญชี", "warn", f"ปี {p['fy'] + 543} ไม่ใหม่กว่าปีล่าสุดที่มีอยู่ ({prev_fy + 543}) — เป็นการแก้ข้อมูลย้อนหลัง?")
    else:
        add("ลำดับปีบัญชี", "warn", f"เว้นช่วง {p['fy'] - prev_fy - 1} ปี จากปีล่าสุด ({prev_fy + 543})")
    if dup:
        add("ซ้ำกับข้อมูลที่อนุมัติแล้ว", "warn", "มีบริษัท-ปีนี้ในชุดข้อมูลหลักแล้ว — การอนุมัติจะเพิ่มอีกแถว")
    add("ที่มาของค่า promotion", "ok" if p.get("liwc") is not None else "warn",
        "LIWC-22 (ผู้ใช้กรอก)" if p.get("liwc") is not None else "ค่าประมาณจากพจนานุกรมเปิด — เทียบฐานได้โดยประมาณ")
    add("แบบ 56-1 One Report", "ok" if p.get("r561") else "warn", p["r561"]["filename"] if p.get("r561") else "ไม่ได้แนบ")
    add("ผลลัพธ์ปีถัดไป (สำหรับ validity)", "ok" if p.get("oi_next") is not None else "warn",
        f"{p['oi_next']} รายการ" if p.get("oi_next") is not None else "ไม่มี — แถวนี้ไม่เข้าชุดประเมิน validity")
    return out


# ============================================================================ ตัวช่วยแถว
def _dec(r):
    for k in ("payload", "score"):
        if isinstance(r.get(k), str):
            try:
                r[k] = json.loads(r[k])
            except ValueError:
                r[k] = None
    return r


def _pub(r, uid, admin, with_text=False):
    """แถวที่ส่งให้เบราว์เซอร์ — ไม่เปิดเผยตัวตนเจ้าของต่อผู้ใช้อื่น และไม่ส่งข้อความสาร CEO เว้นแต่ผู้ดูแลขอดู"""
    p = dict(r["payload"] or {})
    ceo = dict(p.get("ceo") or {})
    txt = ceo.pop("text", None)
    if with_text and txt:
        ceo["preview"] = txt[:1500]
    p["ceo"] = ceo
    mine = r["owner_id"] == uid
    sc = {k: v for k, v in (r["score"] or {}).items() if not k.startswith("_")}   # ไม่ส่งค่าดิบ (B) ออกนอกเซิร์ฟเวอร์
    return {"id": r["id"], "ticker": r["ticker"], "fy": r["fy"], "status": r["status"], "payload": p, "score": sc,
            "created": r["created"], "reviewed": r.get("reviewed"), "review_comment": r.get("review_comment") if (mine or admin) else None,
            "reviewer": r.get("reviewer_label") if r["status"] in ("approved", "rejected") else None,
            "mine": mine, "owner": r.get("owner_label") if (mine or admin) else None}


def _rows(where="1=1", args=()):
    return [_dec(r) for r in _db()._exec(f"SELECT * FROM data_records WHERE {where} ORDER BY fy, id", args, fetch="all")]


def _log(rid, s, action, comment=None):
    A = _app()
    _db()._exec("INSERT INTO data_log (record_id, actor_id, actor_label, action, comment, created) VALUES (?, ?, ?, ?, ?, ?)",
                (rid, A.uid_of(s), _label(s), action, (comment or "")[:500], _now()))


def _label(s):
    return (s.get("email") or s.get("u") or s.get("name") or "owner")[:120]


def _prev_fy(ticker, fy, exclude_id=None):
    """ปีล่าสุดที่มีอยู่ก่อนปีนี้: ข้อมูลอนุมัติ → ชุดปัจจุบัน FY2023 (prof_data) → ไฟล์อ้างอิง"""
    yrs = [r["fy"] for r in _rows("status = 'approved' AND ticker = ?", (ticker,)) if r["id"] != exclude_id]
    if ticker in _comps():
        yrs.append(2023)
    try:
        ref = load_ref()
    except ValueError:
        ref = None
    if ref:
        yrs += [x["fy"] for x in ref if x["ticker"] == ticker]
    before = [y for y in yrs if y < fy]
    return (max(before) if before else None), (fy in yrs)


def _prev_values(ticker, fy, exclude_id=None):
    """ค่าของปีก่อนหน้าสำหรับตารางเทียบ (diff) — ข้อมูลอนุมัติล่าสุดก่อนปีนี้ ไม่มีก็ใช้ชุดปัจจุบัน FY2023"""
    prev = [r for r in _rows("status = 'approved' AND ticker = ? AND fy < ?", (ticker, fy)) if r["id"] != exclude_id]
    if prev:
        r = prev[-1]
        p, sc = r["payload"], r["score"] or {}
        return {"src": f"ข้อมูลอนุมัติแล้ว ปี {r['fy'] + 543}", "fy": r["fy"], "bsize": p.get("bsize"), "fem": p.get("fem"),
                "fam": p.get("fam"), "pol": p.get("pol"), "ten": p.get("ten"), "ois": sc.get("ois"), "tier": sc.get("tier"),
                "quad": sc.get("quad")}
    c = _comps().get(ticker)
    if c and fy > 2023 and all(isinstance(c.get(k), (int, float)) for k in ("promo", "fam", "fem")):
        sc, _ = _score_inputs(c["promo"], c["fam"], c.get("pol") or 0, c["fem"], c.get("ten"), c.get("ind"), 2023, band=False)
        return {"src": "ชุดข้อมูลปัจจุบัน ปี 2566", "fy": 2023, "bsize": c.get("bsize"), "fem": c["fem"], "fam": c["fam"],
                "pol": c.get("pol"), "ten": c.get("ten"), "ois": sc["ois"], "tier": sc["tier"], "quad": sc["quad"]}
    return None


# ============================================================================ Validity (คำนวณใหม่เมื่อฐานข้อมูลเปลี่ยน · แคชไว้)
_vcache = {"key": None, "val": None}
_vlock = threading.Lock()


def _fmt_p(p):
    if p is None:
        return None
    return "<0.001" if p < 0.001 else f"{p:.3f}" if p < 0.1 else f"{p:.2f}"


def _row(stats, **kw):
    st = dict(stats)
    st["p_txt"] = _fmt_p(st.get("p"))
    st.update(kw)
    return st


def compute_validity(ref_rows=None, approved=None):
    """ชุดประเมิน = ปีอ้างอิง (ไฟล์อ้างอิงรายแถว ถ้ามี — ไม่มีก็ใช้ตารางที่ 3 ของบทความ) + ปีใหม่ที่อนุมัติแล้วและมีผลลัพธ์ปีถัดไป"""
    rows, out_years = [], []
    src = "ref_csv" if ref_rows else "paper"
    if ref_rows:
        by = {}
        for r in ref_rows:
            by.setdefault(r["fy"], []).append(r)
        for fy in sorted(by):
            g = by[fy]
            st = validity_stats([x["B"] for x in g], [x["y"] for x in g])
            pp = PAPER.get(fy)
            out_years.append(_row(st, fy=fy, src="ref_csv", label="งานวิจัย (คำนวณจากไฟล์อ้างอิง)",
                                  paper=pp, match=_match(st, pp)))
        pooled_ref = _row(validity_stats([x["B"] for x in ref_rows], [x["y"] for x in ref_rows]),
                          fy="pooled", src="ref_csv", label="รวมปีอ้างอิง", paper=PAPER_POOLED)
        pooled_ref["match"] = _match(pooled_ref, PAPER_POOLED)
    else:
        for fy, pp in sorted(PAPER.items()):
            out_years.append(dict(fy=fy, src="paper", label="ค่าตามบทความ", n=pp["n"], sp=pp["sp"], p=None, p_txt=pp["p"],
                                  auc=pp["auc"], ci=pp["ci"], lift=pp["lift"], v=pp["v"], ci_method="DeLong (บทความ)"))
        pooled_ref = dict(fy="pooled", src="paper", label="รวมปีอ้างอิง (ค่าตามบทความ)", n=928, sp=.179, p_txt="<0.001",
                          auc=.614, ci=[.575, .652], lift=2.38, v="PASS", ci_method="DeLong (บทความ)")
    new_by = {}
    for r in approved or []:
        p, sc = r["payload"] or {}, r["score"] or {}
        b = sc.get("_B", sc.get("B"))
        if p.get("oi_next") is None or b is None:
            continue
        new_by.setdefault(r["fy"], []).append((b, float(p["oi_next"])))
    new_rows = []
    for fy in sorted(new_by):
        g = new_by[fy]
        if len(g) < MIN_N_VALIDITY:
            out_years.append(dict(fy=fy, src="approved", label="ข้อมูลผู้ใช้ที่อนุมัติแล้ว", n=len(g), insufficient=True))
        else:
            out_years.append(_row(validity_stats([a for a, _ in g], [b for _, b in g]), fy=fy, src="approved",
                                  label="ข้อมูลผู้ใช้ที่อนุมัติแล้ว"))
        new_rows += g
    pooled_all = None
    if new_rows and len(new_rows) >= MIN_N_VALIDITY:
        if ref_rows:
            s = [x["B"] for x in ref_rows] + [a for a, _ in new_rows]
            y = [x["y"] for x in ref_rows] + [b for _, b in new_rows]
            pooled_all = _row(validity_stats(s, y), fy="pooled_all", src="mixed", label="รวมปีอ้างอิง + ปีใหม่")
        else:
            pooled_all = _row(validity_stats([a for a, _ in new_rows], [b for _, b in new_rows]), fy="pooled_new",
                              src="approved", label="รวมเฉพาะปีใหม่ที่อนุมัติ")
    n_appr = len(approved or [])
    return {"source": src, "years": out_years, "pooled_ref": pooled_ref, "pooled_all": pooled_all,
            "n_new_with_outcome": len(new_rows), "n_approved": n_appr, "min_n": MIN_N_VALIDITY,
            "thresholds": {k: list(v) for k, v in VTH.items()}, "frozen_reference": _ref_version(),
            "computed": _now(), "ci_method": "Hanley–McNeil (1982) ±1.96·SE"}


def _ref_version():
    A = _app()
    eng = getattr(A, "ENGINE", None) if A is not None else None
    if eng is not None:
        return getattr(eng, "record_id", None) or eng.version
    return (A.MODEL.get("version") if A is not None else None) or "REF928-edit6-20260930"


def _match(st, pp, tol=0.005):
    if not pp:
        return None
    d = {"sp": abs((st["sp"] or 0) - pp["sp"]), "auc": abs((st["auc"] or 0) - pp["auc"]),
         "lift": abs((st["lift"] or 0) - pp["lift"])}
    # บทความปัด lift 2 ตำแหน่ง ρ/AUC 3 ตำแหน่ง → ยอมรับ ±0.005 ทุกตัว
    return {"ok": all(v <= tol for v in d.values()) and st["v"] == pp["v"], "diff": {k: round(v, 4) for k, v in d.items()}}


def _vkey():
    r = _db()._exec("SELECT COUNT(*) AS n, MAX(reviewed) AS m, MAX(id) AS i FROM data_records WHERE status = 'approved'", fetch="one") or {}
    p = _ref_path()
    return (r.get("n"), r.get("m"), r.get("i"), p.stat().st_mtime if p.exists() else None)


def validity_cached(force=False):
    with _vlock:
        k = _vkey()
        if force or _vcache["key"] != k:
            try:
                ref = load_ref()
            except ValueError:
                ref = None
            _vcache["val"] = compute_validity(ref, _rows("status = 'approved'"))
            _vcache["key"] = k
        return _vcache["val"]


# ============================================================================ HTTP
def _guard(req, admin=False):
    A = _app()
    return A.require_admin(req) if admin else A.require(req)


PLAN_RANK = {"free": 0, "pro": 1, "max": 2}


def _plan_of(req, s):
    """ระดับสิทธิ์ที่เซิร์ฟเวอร์รับรอง (ไม่ใช่ค่าที่เบราว์เซอร์เลือก): ใช้ app.require_plan ถ้ามี ไม่งั้นอ่านจากบัญชี (users.plan)
    · PLAN_SOURCE=client (ช่วงทดสอบที่ผู้ใช้เลือกระดับเอง) → เซิร์ฟเวอร์ไม่รู้ระดับจริง จึงถือเป็น Basic (ปลอดภัยไว้ก่อน)"""
    A = _app()
    if A.is_admin(s):
        return "admin"
    u = A.DBX.get_user(A.uid_of(s)) or {}
    p = A._plan_for(u) if hasattr(A, "_plan_for") else u.get("plan")
    return p if p in PLAN_RANK else "free"


def _plan_ok(req, s, min_plan="pro"):
    A = _app()
    if A.is_admin(s):
        return True
    rp = getattr(A, "require_plan", None)
    if callable(rp):
        r = rp(req, min_plan)
        err = r[1] if isinstance(r, tuple) else r
        return err is None
    return PLAN_RANK.get(_plan_of(req, s), 0) >= PLAN_RANK[min_plan]


def _own_of(uid):
    r = _db()._exec("SELECT ticker FROM data_own WHERE owner_id = ?", (uid,), fetch="one")
    return (r or {}).get("ticker")


def _declare_own(s, uid, ticker):
    """บริษัทของผู้ใช้ Basic: ค่าแรกที่เบราว์เซอร์ประกาศ (header X-OIS-Own ซึ่งมาจากบริษัทที่เลือกตอนเข้าใช้) ถูกตรึงกับบัญชี
    และบันทึกใน data_log · เปลี่ยนภายหลังไม่ได้ด้วยตัวเอง (ผู้ดูแลลบแถวใน data_own) — กันการวนเปลี่ยน header เพื่อดูบริษัทอื่น"""
    try:
        _db()._exec("INSERT INTO data_own (owner_id, ticker, created) VALUES (?, ?, ?)", (uid, ticker, _now()))
    except Exception:  # noqa: BLE001  มีแล้ว (คำขอพร้อมกัน)
        return _own_of(uid)
    _log(None, s, "own_declare", ticker)
    _app().DBX.event(uid, "data_own_declare", {"ticker": ticker})
    return ticker


def _clean_tk(t):
    t = str(t or "").strip().upper()[:16]
    return t if t and all(ch.isalnum() or ch in "-._&" for ch in t) else None


def history_access(req, s, ticker):
    """ใครดูประวัติรายบริษัทได้ (ตรงกับ canSeeCo ฝั่งเบราว์เซอร์เท่าที่เซิร์ฟเวอร์รู้):
    ผู้ดูแล · Pro ขึ้นไป (เซิร์ฟเวอร์ไม่รู้เครดิตปลดล็อกรายบริษัทของ Pro ซึ่งอยู่ในเบราว์เซอร์ จึงเปิดทุกบริษัทให้ Pro)
    · Basic: บริษัทของตนที่ประกาศและตรึงไว้ หรือบริษัทที่ตนเคยส่งข้อมูลเอง · คืน (ok, เหตุผล, บริษัทของตน)"""
    A = _app()
    uid = A.uid_of(s)
    if A.is_admin(s):
        return True, "admin", None
    if _plan_ok(req, s, "pro"):
        return True, "plan", None
    own = _own_of(uid)
    hdr = _clean_tk(req.headers.get("x-ois-own"))
    if own is None and hdr:
        own = _declare_own(s, uid, hdr)
    if own and ticker == own:
        return True, "own", own
    if _db()._exec("SELECT id FROM data_records WHERE owner_id = ? AND ticker = ? LIMIT 1", (uid, ticker), fetch="one"):
        return True, "uploaded", own
    return False, "plan", own


def _ok(body, status=200):
    A = _app()
    return A.secure(JSONResponse(body, status_code=status))


async def _body(req, limit=256 * 1024):
    raw = await req.body()
    if len(raw) > limit:
        raise ValueError(f"ข้อมูลใหญ่เกิน {limit // 1024} KB")
    return json.loads(raw.decode("utf-8") or "{}")


rec_limiter_hits = {}


def _rate_ok(uid, limit=60, window=3600):
    now, q = time.monotonic(), rec_limiter_hits.setdefault(uid, [])
    q[:] = [t for t in q if now - t < window]
    if len(q) >= limit:
        return False
    q.append(now)
    return True


async def records_create(req):
    A = _app()
    s, err = _guard(req)
    if err:
        return err
    try:
        p = clean_payload(await _body(req))
    except (ValueError, KeyError) as e:
        return A.jerr(400, error=str(e))
    uid = A.uid_of(s)
    if not _rate_ok(uid):
        return A.jerr(429, error="ส่งข้อมูลบ่อยเกินไป — รอสักครู่")
    if p["dp"] is None and p["liwc"] is None:
        return A.jerr(400, error="ต้องมีค่าภาษาเชิงรุกจากสาร CEO หรือค่า LIWC-22")
    sc = score_record(p)
    t = _now()
    rid = _db()._insert("""INSERT INTO data_records (owner_id, owner_label, ticker, fy, status, payload, score, created, updated)
                           VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)""",
                        (uid, _label(s), p["ticker"], p["fy"], json.dumps(p, ensure_ascii=False), json.dumps(sc), t, t))
    _log(rid, s, "submit", f"{p['ticker']} ปี {p['fy'] + 543}")
    A.DBX.event(uid, "data_submit", {"id": rid, "ticker": p["ticker"], "fy": p["fy"]})
    r = _rows("id = ?", (rid,))[0]
    return _ok({"ok": True, "record": _pub(r, uid, False)})


async def records_list(req):
    A = _app()
    s, err = _guard(req)
    if err:
        return err
    uid, adm = A.uid_of(s), A.is_admin(s)
    mine = req.query_params.get("mine") in ("1", "true")
    t = str(req.query_params.get("ticker") or "").strip().upper()[:16]
    if mine:
        rows = _rows("owner_id = ?", (uid,))
    else:
        rows = _rows("status = 'approved' OR owner_id = ?", (uid,))
        if not adm and not _plan_ok(req, s, "pro"):       # Basic: ข้อมูลอนุมัติเฉพาะบริษัทของตน + รายการของตนเอง (กติกาเดียวกับ /api/data/history)
            own = _own_of(uid)
            rows = [r for r in rows if r["owner_id"] == uid or (own and r["ticker"] == own)]
    if t:
        rows = [r for r in rows if r["ticker"] == t]
    return _ok({"items": [_pub(r, uid, adm) for r in rows]})


async def records_withdraw(req):
    A = _app()
    s, err = _guard(req)
    if err:
        return err
    rid = int(req.path_params["rid"])
    uid = A.uid_of(s)
    r = _rows("id = ?", (rid,))
    if not r or r[0]["owner_id"] != uid:
        return A.jerr(404, error="ไม่พบรายการ")
    if r[0]["status"] != "pending":
        return A.jerr(409, error="ถอนได้เฉพาะรายการที่รออนุมัติ")
    _db()._exec("UPDATE data_records SET status = 'withdrawn', updated = ? WHERE id = ?", (_now(), rid))
    _log(rid, s, "withdraw")
    return _ok({"ok": True})


def _pending_item(r, uid):
    p = r["payload"]
    prev_fy, dup = _prev_fy(r["ticker"], r["fy"], r["id"])
    it = _pub(r, uid, True, with_text=True)
    it["checks"] = quality_checks(p, prev_fy, dup)
    it["prev"] = _prev_values(r["ticker"], r["fy"], r["id"])
    return it


async def admin_pending(req):
    A = _app()
    s, err = _guard(req, admin=True)
    if err:
        return err
    uid = A.uid_of(s)
    items = [_pending_item(r, uid) for r in _rows("status = 'pending'")]
    return _ok({"items": items, "log": _db()._exec("SELECT * FROM data_log ORDER BY id DESC LIMIT 200", fetch="all")})


async def admin_log(req):
    s, err = _guard(req, admin=True)
    if err:
        return err
    return _ok({"log": _db()._exec("SELECT * FROM data_log ORDER BY id DESC LIMIT 500", fetch="all")})


async def _review(req, action):
    A = _app()
    s, err = _guard(req, admin=True)
    if err:
        return err
    rid = int(req.path_params["rid"])
    try:
        body = await _body(req, 16 * 1024)
    except ValueError as e:
        return A.jerr(400, error=str(e))
    comment = str((body or {}).get("comment") or "").strip()[:500]
    if action == "reject" and not comment:
        return A.jerr(400, error="การไม่อนุมัติต้องระบุเหตุผล")
    r = _rows("id = ?", (rid,))
    if not r:
        return A.jerr(404, error="ไม่พบรายการ")
    if r[0]["status"] != "pending":
        return A.jerr(409, error="รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ")
    st = "approved" if action == "approve" else "rejected"
    t = _now()
    _db()._exec("""UPDATE data_records SET status = ?, reviewer_id = ?, reviewer_label = ?, reviewed = ?, review_comment = ?, updated = ?
                   WHERE id = ?""", (st, A.uid_of(s), _label(s), t, comment, t, rid))
    _log(rid, s, action, comment)
    A.DBX.event(A.uid_of(s), "data_" + action, {"id": rid})
    v = validity_cached(force=True) if st == "approved" else None      # คำนวณ validity ใหม่ทันทีที่ชุดข้อมูลหลักเปลี่ยน
    return _ok({"ok": True, "status": st, "validity_computed": v["computed"] if v else None})


async def approve(req):
    return await _review(req, "approve")


async def reject(req):
    return await _review(req, "reject")


async def history(req):
    """ประวัติรายบริษัท: ค่าสรุปจากไฟล์อ้างอิง (ไม่มีค่าป้อน/ผลลัพธ์รายแถว) + ข้อมูลอนุมัติ + รายการของผู้ใช้เอง"""
    A = _app()
    s, err = _guard(req)
    if err:
        return err
    uid, adm = A.uid_of(s), A.is_admin(s)
    t = str(req.query_params.get("ticker") or "").strip().upper()[:16]
    if not t:
        return A.jerr(400, error="ต้องระบุ ticker")
    ok, why, own = history_access(req, s, t)
    if not ok:
        A.DBX.event(uid, "data_history_denied", {"ticker": t})
        return A.jerr(403, error="ประวัติของบริษัทนี้เป็นสิทธิ์ระดับ Pro ขึ้นไป — ระดับ Basic ดูได้เฉพาะบริษัทของตน"
                      + (f" ({own})" if own else "") + " และบริษัทที่ตนส่งข้อมูลเอง", locked=True, own=own)
    try:
        ref = load_ref()
    except ValueError:
        ref = None
    research = [{"fy": x["fy"], "ois": round(x["ois"], 1), "tier": x["tier"], "quad": x["quad"], "regime": x["regime"]}
                for x in (ref or []) if x["ticker"] == t]
    recs = [r for r in _rows("ticker = ? AND (status = 'approved' OR owner_id = ?)", (t, uid))]
    return _ok({"ticker": t, "access": why, "reference_present": ref is not None, "research": sorted(research, key=lambda x: x["fy"]),
                "records": [_pub(r, uid, adm) for r in recs]})


PRO_LOCK = "ตาราง validity รายปีเป็นสิทธิ์ระดับ Pro ขึ้นไป (เหมือนตารางหลักของหน้าหลักฐานความแม่น)"


async def validity(req):
    A = _app()
    s, err = _guard(req)
    if err:
        return err
    if not _plan_ok(req, s, "pro"):
        return A.jerr(403, error=PRO_LOCK, locked=True)
    return _ok(validity_cached())


async def reference_status(req):
    s, err = _guard(req)
    if err:
        return err
    p = _ref_path()
    if not p.exists():
        return _ok({"present": False})
    try:
        ref = load_ref()
    except ValueError as e:
        return _ok({"present": True, "valid": False, "error": str(e)})
    years = sorted({x["fy"] for x in ref})
    return _ok({"present": True, "valid": True, "n": len(ref), "firms": len({x["ticker"] for x in ref}), "years": years,
                "uploaded": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(p.stat().st_mtime))})


async def reference_upload(req):
    """ผู้ดูแลอัปโหลดไฟล์ REF928_scored (NDA) ไปเก็บข้างฐานข้อมูล — ตอบกลับเฉพาะจำนวนแถวและผลเทียบบทความ"""
    A = _app()
    s, err = _guard(req, admin=True)
    if err:
        return err
    ct = req.headers.get("content-type", "")
    try:
        if ct.startswith("multipart/form-data"):
            form = await req.form()
            f = form.get("file")
            if f is None or not hasattr(f, "read"):
                return A.jerr(400, error="ไม่พบไฟล์ (field = file)")
            raw = await f.read()
        else:
            raw = await req.body()
        if len(raw) > MAX_REF_BYTES:
            return A.jerr(413, error="ไฟล์ใหญ่เกิน 5 MB")
        text = raw.decode("utf-8-sig")
        rows = parse_ref_csv(text)
    except (ValueError, UnicodeDecodeError) as e:
        return A.jerr(400, error=f"ไฟล์ไม่ถูกต้อง: {e}")
    p = _ref_path()
    tmp = p.with_suffix(".tmp")
    tmp.write_text(text, encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    os.replace(tmp, p)
    _ref_cache.update(mtime=None, rows=None)
    _log(None, s, "reference_upload", f"{len(rows)} แถว")
    A.DBX.event(A.uid_of(s), "data_reference_upload", {"n": len(rows)})
    v = validity_cached(force=True)
    rep = [{"fy": y["fy"], "match": y.get("match")} for y in v["years"] if y["src"] == "ref_csv"]
    return _ok({"ok": True, "n": len(rows), "firms": len({x["ticker"] for x in rows}),
                "years": sorted({x["fy"] for x in rows}), "reproduced": rep,
                "pooled_match": v["pooled_ref"].get("match")})


async def refreeze_list(req):
    A = _app()
    s, err = _guard(req)
    if err:
        return err
    if not _plan_ok(req, s, "pro"):
        return A.jerr(403, error=PRO_LOCK, locked=True)
    return _ok({"items": _db()._exec("SELECT id, actor_label, comment, snapshot, created FROM data_refreeze ORDER BY id DESC LIMIT 50", fetch="all")})


async def refreeze_propose(req):
    """บันทึก "ข้อเสนอ" ตรึงฐานอ้างอิงใหม่ — ไม่เปลี่ยนฐานอ้างอิงที่ใช้ให้คะแนน (DP2)"""
    A = _app()
    s, err = _guard(req, admin=True)
    if err:
        return err
    try:
        body = await _body(req, 16 * 1024)
    except ValueError as e:
        return A.jerr(400, error=str(e))
    comment = str((body or {}).get("comment") or "").strip()[:1000]
    v = validity_cached()
    snap = {"frozen_reference": v["frozen_reference"], "n_approved": v["n_approved"],
            "n_new_with_outcome": v["n_new_with_outcome"], "source": v["source"],
            "years": [{k: y.get(k) for k in ("fy", "n", "sp", "auc", "lift", "v", "src")} for y in v["years"]],
            "applied": False}
    rid = _db()._insert("INSERT INTO data_refreeze (actor_id, actor_label, comment, snapshot, created) VALUES (?, ?, ?, ?, ?)",
                        (A.uid_of(s), _label(s), comment, json.dumps(snap, ensure_ascii=False), _now()))
    _log(None, s, "refreeze_proposal", comment or "(ไม่มีหมายเหตุ)")
    return _ok({"ok": True, "id": rid, "applied": False})


ROUTES = [] if Route is None else [
    Route("/api/data/records", records_create, methods=["POST"]),
    Route("/api/data/records", records_list, methods=["GET"]),
    Route("/api/data/records/{rid:int}/withdraw", records_withdraw, methods=["POST"]),
    Route("/api/data/records/{rid:int}/approve", approve, methods=["POST"]),
    Route("/api/data/records/{rid:int}/reject", reject, methods=["POST"]),
    Route("/api/data/pending", admin_pending, methods=["GET"]),
    Route("/api/data/log", admin_log, methods=["GET"]),
    Route("/api/data/history", history, methods=["GET"]),
    Route("/api/data/validity", validity, methods=["GET"]),
    Route("/api/data/reference", reference_upload, methods=["POST"]),
    Route("/api/data/reference", reference_status, methods=["GET"]),
    Route("/api/data/refreeze", refreeze_propose, methods=["POST"]),
    Route("/api/data/refreeze", refreeze_list, methods=["GET"]),
]


if __name__ == "__main__":
    if "--build-lexicon" in sys.argv[1:]:
        d = build_lexicon()
        LEXICON_PATH.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"{LEXICON_PATH}: promotion {len(d['promotion'])} · prevention {len(d['prevention'])} · anchors {len(d['tilt_anchor'])}")

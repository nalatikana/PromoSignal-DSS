# -*- coding: utf-8 -*-
"""OpenInnoScore™ · เซิร์ฟเวอร์ส่วนตัว (Render.com)

  uvicorn server.app:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips '*'

ตัวแปรแวดล้อม (ตั้งใน Render → Environment — ห้ามใส่ในโค้ด)
  APP_PASSWORD        รหัสผ่านหลัก (จำเป็น; ไม่ตั้ง = เซิร์ฟเวอร์ไม่ยอมเริ่ม ยกเว้น ALLOW_NO_PASSWORD=1 สำหรับทดสอบในเครื่อง)
  APP_USERS           บัญชีเพิ่ม "ชื่อ1:รหัส1,ชื่อ2:รหัส2" (ไม่บังคับ)
  SECRET_KEY          กุญแจเซ็นคุกกี้ (Render สร้างให้อัตโนมัติจาก render.yaml)
  SESSION_HOURS       อายุการเข้าสู่ระบบ (ค่าเริ่มต้น 12 ชั่วโมง)
  API_ITEMS_PER_MIN   โควตาจำนวนค่าป้อนที่คำนวณได้ต่อผู้ใช้ต่อนาที (ค่าเริ่มต้น 1200)
  AMP_DECIMALS        จำนวนทศนิยมของ amp ที่ส่งกลับ (ค่าเริ่มต้น 6)
  ANTHROPIC_API_KEY / ANTHROPIC_MODEL   เปิด /api/llm ด้วย Claude
  OPENAI_API_KEY / OPENAI_MODEL         เปิด /api/llm ด้วย OpenAI (ใช้เมื่อไม่มี key ของ Anthropic หรือ LLM_PROVIDER=openai)
  OCR_PROVIDER / OCR_API_KEY / OCR_ENDPOINT   เปิด /api/ocr (ดู ocr_adapter)
"""
import asyncio
import hashlib
import hmac
import json
import logging
import math
import os
import secrets
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from pathlib import Path

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.requests import Request
from starlette.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response
from starlette.routing import Route

from . import ois_engine as E

ROOT = Path(__file__).resolve().parent.parent          # = โฟลเดอร์ boardsignal/ ใน PromoSignal-DSS
HTML = ROOT / "out" / "OpenInnoScore_server.html"
LOGO = ROOT / "src" / "brandsrc" / "ois_mark_96.png"
log = logging.getLogger("ois")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

# ------------------------------------------------------------------ การตั้งค่า
env = os.environ.get
ALLOW_NO_PASSWORD = env("ALLOW_NO_PASSWORD") == "1"
USERS = {}
for pair in (env("APP_USERS") or "").split(","):
    if ":" in pair:
        u, p = pair.split(":", 1)
        if u.strip() and p:
            USERS[u.strip()] = p
APP_PASSWORD = env("APP_PASSWORD") or ""
if not APP_PASSWORD and not USERS and not ALLOW_NO_PASSWORD:
    raise SystemExit("ต้องตั้ง APP_PASSWORD (หรือ APP_USERS) ก่อนเริ่มเซิร์ฟเวอร์ — ทดสอบในเครื่องใช้ ALLOW_NO_PASSWORD=1")
SECRET_KEY = env("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_urlsafe(32)
    log.warning("ไม่ได้ตั้ง SECRET_KEY — สุ่มกุญแจชั่วคราว (ทุกคนต้องเข้าสู่ระบบใหม่เมื่อเซิร์ฟเวอร์รีสตาร์ต)")
SESSION_SEC = int(float(env("SESSION_HOURS") or 12) * 3600)
ITEMS_PER_MIN = int(env("API_ITEMS_PER_MIN") or 1200)
AMP_DEC = int(env("AMP_DECIMALS") or 6)
MAX_ITEMS = 64
COOKIE = "ois_session"
signer = URLSafeTimedSerializer(SECRET_KEY, salt="ois-session")

# ------------------------------------------------------------------ โมเดล (โหลดครั้งเดียว)
MODEL = E.load_model(ROOT)
KR = E.KR(MODEL["pts"], MODEL["reps"], MODEL["seed"])
VERSION = MODEL["version"]
log.info("model %s loaded · KR draws=%d", VERSION, len(KR.th))


# ------------------------------------------------------------------ ตัวช่วย
def client_ip(req: Request) -> str:
    return req.client.host if req.client else "?"


def is_local(req: Request) -> bool:
    return (req.url.hostname or "") in ("localhost", "127.0.0.1", "::1")


def session_of(req: Request):
    tok = req.cookies.get(COOKIE)
    if not tok:
        return None
    try:
        return signer.loads(tok, max_age=SESSION_SEC)
    except (BadSignature, SignatureExpired):
        return None


def sid_hash(s) -> str:
    return hashlib.sha256((s or {}).get("sid", "").encode()).hexdigest()[:8]


SEC_HEADERS = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",          # no-referrer ทำให้ Chrome ส่ง Origin: null ตอน POST ฟอร์ม
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    # ไฟล์เดียวที่ฝัง script/style ไว้ในหน้า จึงต้องอนุญาต inline · ห้ามเชื่อมต่อออกนอกโดเมนนี้
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; "
                               "img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; "
                               "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
}


def secure(resp: Response, no_store=True) -> Response:
    for k, v in SEC_HEADERS.items():
        resp.headers[k] = v
    if no_store:
        resp.headers["Cache-Control"] = "no-store"
    return resp


def jerr(status, **body):
    return secure(JSONResponse(body, status_code=status))


class Limiter:
    """หน้าต่างเลื่อนแบบง่ายในหน่วยความจำ (เซิร์ฟเวอร์เดียว — พอสำหรับต้นแบบ)"""

    def __init__(self, limit, window):
        self.limit, self.window, self.hits = limit, window, defaultdict(deque)

    def allow(self, key, n=1):
        now, q = time.monotonic(), self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) + n > self.limit:
            return False
        q.extend([now] * n)
        return True


login_limiter = Limiter(10, 15 * 60)          # 10 ครั้ง / 15 นาที / IP
item_limiter = Limiter(ITEMS_PER_MIN, 60)
llm_limiter = Limiter(30, 3600)
ocr_limiter = Limiter(20, 3600)


def same_origin(req: Request) -> bool:
    """กัน CSRF ชั้นที่สอง (คุกกี้เป็น SameSite=Lax อยู่แล้ว)"""
    o = req.headers.get("origin")
    if not o:
        return True
    host = req.headers.get("host", "")
    return o.split("://", 1)[-1] == host


def require(req: Request):
    s = session_of(req)
    if not s:
        return None, jerr(401, error="ต้องเข้าสู่ระบบ")
    if req.method == "POST" and not same_origin(req):
        return None, jerr(403, error="origin ไม่ถูกต้อง")
    return s, None


# ------------------------------------------------------------------ หน้าเข้าสู่ระบบ
def login_page(msg="", user=""):
    need_user = bool(USERS)
    esc = lambda x: str(x).replace("&", "&amp;").replace("<", "&lt;").replace('"', "&quot;")
    return f"""<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>เข้าสู่ระบบ · OpenInnoScore</title><link rel="icon" href="/logo.png">
<style>
:root{{--bg:#f3f6fa;--card:#fff;--ink:#0f2340;--ink2:#51607a;--line:#d5dbe5;--acc:#1f5fbf;--err:#b42318}}
@media (prefers-color-scheme:dark){{:root{{--bg:#0d1626;--card:#14213a;--ink:#e8eef8;--ink2:#9fb0cc;--line:#2a3a58;--acc:#6aa3ff;--err:#ff8a7a}}}}
*{{box-sizing:border-box}}body{{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);
font:15px/1.6 Sarabun,"Noto Sans Thai",system-ui,sans-serif;padding:16px}}
.c{{width:100%;max-width:380px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px 24px}}
.b{{display:flex;gap:10px;align-items:center;margin-bottom:6px}}.b img{{width:36px;height:36px}}
h1{{font-size:18px;margin:0}}p.s{{margin:0 0 18px;color:var(--ink2);font-size:13px}}
label{{display:block;font-size:13px;color:var(--ink2);margin:12px 0 4px}}
input{{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink);font:inherit}}
button{{margin-top:18px;width:100%;padding:11px;border:0;border-radius:8px;background:var(--acc);color:#fff;font:inherit;font-weight:600;cursor:pointer}}
.e{{color:var(--err);font-size:13px;margin-top:10px}}.f{{margin-top:16px;font-size:12px;color:var(--ink2)}}
</style></head><body><form class="c" method="post" action="/login" autocomplete="on">
<div class="b"><img src="/logo.png" alt=""><h1>OpenInnoScore™ · ต้นแบบส่วนตัว</h1></div>
<p class="s">สำหรับผู้ได้รับเชิญภายใต้ข้อตกลงรักษาความลับ (NDA) เท่านั้น</p>
<label for="u">ชื่อผู้ใช้{"" if need_user else " (ไม่บังคับ)"}</label>
<input id="u" name="username" value="{esc(user)}" autocomplete="username"{" required" if need_user else ""}>
<label for="p">รหัสผ่าน</label><input id="p" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">เข้าสู่ระบบ</button>{f'<div class="e" role="alert">{esc(msg)}</div>' if msg else ""}
<div class="f">ผลลัพธ์ทุกตัวเป็นความสัมพันธ์เชิงสถิติ ไม่ใช่การพยากรณ์ผลการดำเนินงาน</div>
</form></body></html>"""


def check_login(user, pw):
    user = (user or "").strip()[:64]
    if user in USERS and hmac.compare_digest(USERS[user].encode(), pw.encode()):
        return user
    if APP_PASSWORD and hmac.compare_digest(APP_PASSWORD.encode(), pw.encode()):
        return user or "owner"
    if ALLOW_NO_PASSWORD and not APP_PASSWORD and not USERS:
        return user or "dev"
    return None


async def login(req: Request):
    if req.method == "GET":
        if session_of(req):
            return RedirectResponse("/", 303)
        return secure(HTMLResponse(login_page()))
    ip = client_ip(req)
    if not login_limiter.allow(ip):
        log.warning("login rate-limited")
        return secure(HTMLResponse(login_page("พยายามเข้าสู่ระบบบ่อยเกินไป — โปรดรอ 15 นาที"), status_code=429))
    if not same_origin(req):
        return secure(HTMLResponse(login_page("คำขอไม่ถูกต้อง"), status_code=403))
    form = await req.form()
    user = check_login(str(form.get("username") or ""), str(form.get("password") or ""))
    if not user:
        await asyncio.sleep(0.6)                      # ชะลอการเดารหัส
        log.info("login failed")
        return secure(HTMLResponse(login_page("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", str(form.get("username") or "")), status_code=401))
    sess = {"u": user, "sid": secrets.token_hex(8), "t": int(time.time())}
    resp = RedirectResponse("/", 303)
    resp.set_cookie(COOKIE, signer.dumps(sess), max_age=SESSION_SEC, httponly=True, samesite="lax",
                    secure=not is_local(req), path="/")
    log.info("login ok session=%s", sid_hash(sess))
    return secure(resp)


async def logout(req: Request):
    resp = RedirectResponse("/login", 303)
    resp.delete_cookie(COOKIE, path="/")
    return secure(resp)


async def index(req: Request):
    if not session_of(req):
        return secure(RedirectResponse("/login", 303))
    if not HTML.exists():
        return secure(HTMLResponse("ยังไม่ได้ build — รัน python build_v2.py --server", status_code=503))
    return secure(FileResponse(HTML, media_type="text/html; charset=utf-8"))


async def logo(req: Request):
    return secure(FileResponse(LOGO, media_type="image/png"), no_store=False) if LOGO.exists() else Response(status_code=404)


async def health(req: Request):
    return secure(JSONResponse({"ok": True, "version": VERSION}))


# ------------------------------------------------------------------ API ของโมเดล
def _num(x, lo=-1e3, hi=1e3):
    v = float(x)
    if not math.isfinite(v) or v < lo or v > hi:
        raise ValueError("ค่าป้อนไม่อยู่ในช่วงที่รับได้")
    return v


async def _items(req: Request, s):
    try:
        body = await req.json()
        items = body.get("items")
        assert isinstance(items, list) and 0 < len(items) <= MAX_ITEMS
    except Exception:
        return None, jerr(400, error=f"รูปแบบคำขอไม่ถูกต้อง (items 1–{MAX_ITEMS} รายการ)")
    if not item_limiter.allow(s["sid"], len(items)):
        log.warning("api rate-limited session=%s", sid_hash(s))
        return None, jerr(429, error="เรียกบ่อยเกินไป — รอสักครู่")
    return items, None


async def api_amp(req: Request):
    s, err = require(req)
    if err:
        return err
    items, err = await _items(req, s)
    if err:
        return err
    try:
        amp, t1 = [], []
        for it in items:
            fam, fem, pol = _num(it.get("fam", 0)), _num(it["fem"]), 1 if it.get("pol") else 0
            amp.append(round(E.amp_of(fam, pol, fem), AMP_DEC))
            t1.append(round(E.amp_t1(fem), AMP_DEC))
    except (KeyError, TypeError, ValueError) as e:
        return jerr(400, error=f"ค่าป้อนไม่ถูกต้อง: {e}")
    log.info("amp n=%d session=%s", len(items), sid_hash(s))
    return secure(JSONResponse({"amp": amp, "ampT1": t1}))


async def api_band(req: Request):
    s, err = require(req)
    if err:
        return err
    items, err = await _items(req, s)
    if err:
        return err
    try:
        vals = [(_num(it["promo"]), _num(it.get("fam", 0)), 1 if it.get("pol") else 0, _num(it["fem"])) for it in items]
    except (KeyError, TypeError, ValueError) as e:
        return jerr(400, error=f"ค่าป้อนไม่ถูกต้อง: {e}")
    band = await asyncio.to_thread(lambda: [KR.band90(*v) for v in vals])   # ~1 ms/รายการ
    log.info("band n=%d session=%s", len(items), sid_hash(s))
    return secure(JSONResponse({"band": band}))


# ------------------------------------------------------------------ AI (LLM) — เปิดเมื่อมี API key ใน env เท่านั้น
def llm_provider():
    want = (env("LLM_PROVIDER") or "").lower()
    if want == "openai" and env("OPENAI_API_KEY"):
        return "openai"
    if env("ANTHROPIC_API_KEY"):
        return "anthropic"
    if env("OPENAI_API_KEY"):
        return "openai"
    return None


SYSTEM_PROMPT = (
    "คุณเป็นผู้ช่วยเขียนเอกสารสำหรับคณะกรรมการบริษัทจดทะเบียนไทย ในระบบ OpenInnoScore™ (Signal B)\n"
    "กติกาบังคับ:\n"
    "1) ใช้ภาษาไทยทางการ กระชับ\n"
    "2) ตัวเลขทุกตัวเป็น 'ความสัมพันธ์เชิงสถิติกับฐานอ้างอิง REF-928' ไม่ใช่เหตุและผล ไม่ใช่การพยากรณ์ "
    "ห้ามใช้คำว่า 'ทำให้', 'ส่งผลให้', 'การันตี' ให้ใช้ 'สัมพันธ์กับ', 'สอดคล้องกับ' แทน\n"
    "3) ห้ามคาดเดาหรือกล่าวถึงสัมประสิทธิ์ สูตร หรือวิธีคำนวณภายใน — ใช้เฉพาะผลลัพธ์ที่ให้มาเท่านั้น\n"
    "4) ไม่แนะนำการลงทุน และไม่ให้คำแนะนำเกี่ยวกับบุคคลรายใดรายหนึ่ง\n"
    "5) ถ้าข้อมูลไม่พอ ให้บอกว่าข้อมูลไม่พอ ห้ามแต่งตัวเลขเพิ่ม"
)
TASKS = {
    "board_brief": "สรุปผล OpenInnoScore ของบริษัทนี้เป็นบันทึกสั้นสำหรับวาระประชุมคณะกรรมการ (ไม่เกิน 180 คำ) "
                   "ระบุ tier, โซน, ช่วงความไม่แน่นอน และประเด็นหารือ 3 ข้อ",
    "explain_score": "อธิบายความหมายของคะแนนและโซนนี้ให้กรรมการที่ไม่ใช่นักสถิติเข้าใจ (ไม่เกิน 150 คำ)",
    "whatif_summary": "สรุปผลการจำลอง What-if: เปรียบเทียบค่าเดิมกับค่าที่จำลอง ระบุว่าเป็นความสัมพันธ์ตามสูตร ไม่ใช่ผลที่จะเกิดจริง (ไม่เกิน 150 คำ)",
    "draft_directive": "ร่างข้อสั่งการ/ประเด็นติดตามของคณะกรรมการ 3–5 ข้อ จากผลลัพธ์นี้ แต่ละข้อมีผู้รับผิดชอบ (ตำแหน่ง) และกรอบเวลา",
    "t561_rewrite": "เรียบเรียงร่างข้อความใน payload.text ให้เป็นภาษาทางการตามโครงสร้างแบบ 56-1 One Report ส่วนที่ 2 ข้อ 7–8 "
                    "โดยปฏิบัติตาม payload.rules ทุกข้อ ห้ามเพิ่มข้อเท็จจริง ตัวเลข หรือชื่อบริษัท/บุคคล ห้ามอ้างคะแนนเป็นหลักฐานประสิทธิผลของคณะกรรมการ",
    "peer_note": "สรุปการเปรียบเทียบกับบริษัทในกลุ่มเดียวกันจากผลลัพธ์ที่ให้มา (ไม่เกิน 150 คำ)",
}
SECRET_KEYS = {"par", "chol", "b1", "dF", "dG", "dW", "dT", "beta", "betas", "delta", "coef", "coefficients", "vcov", "V"}


def _scrub(x, depth=0):
    """ตัด key ที่อาจเป็นสูตรออกจาก payload ก่อนส่งให้ผู้ให้บริการ AI ภายนอก (กันความผิดพลาดของฝั่ง UI)"""
    if depth > 6:
        return None
    if isinstance(x, dict):
        return {str(k)[:64]: _scrub(v, depth + 1) for k, v in list(x.items())[:80] if str(k) not in SECRET_KEYS}
    if isinstance(x, list):
        return [_scrub(v, depth + 1) for v in x[:80]]
    if isinstance(x, str):
        return x[:2000]
    return x


def _http_json(url, headers, body, timeout=60):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers=dict(headers, **{"content-type": "application/json"}))
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def call_llm(provider, task, payload):
    user = f"งาน: {TASKS[task]}\n\nผลลัพธ์จากระบบ (JSON):\n{json.dumps(payload, ensure_ascii=False)[:12000]}"
    if provider == "anthropic":
        r = _http_json("https://api.anthropic.com/v1/messages",
                       {"x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01"},
                       {"model": env("ANTHROPIC_MODEL") or "claude-sonnet-5-5", "max_tokens": 1200,
                        "system": SYSTEM_PROMPT, "messages": [{"role": "user", "content": user}]})
        return "".join(b.get("text", "") for b in r.get("content", []) if b.get("type") == "text")
    r = _http_json("https://api.openai.com/v1/chat/completions",
                   {"authorization": f"Bearer {env('OPENAI_API_KEY')}"},
                   {"model": env("OPENAI_MODEL") or "gpt-4o-mini", "max_tokens": 1200,
                    "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]})
    return r["choices"][0]["message"]["content"]


async def api_llm(req: Request):
    s, err = require(req)
    if err:
        return err
    prov = llm_provider()
    if not prov:
        return jerr(503, enabled=False, reason="ยังไม่ได้ตั้งค่า API key")
    try:
        body = await req.json()
        task, payload = body.get("task"), body.get("payload") or {}
    except Exception:
        return jerr(400, error="รูปแบบคำขอไม่ถูกต้อง")
    if task not in TASKS:
        return jerr(400, error="task ไม่รองรับ", tasks=sorted(TASKS))
    if not llm_limiter.allow(s["sid"]):
        return jerr(429, error="ใช้ AI ครบโควตาชั่วโมงนี้แล้ว")
    try:
        text = await asyncio.to_thread(call_llm, prov, task, _scrub(payload))
    except urllib.error.HTTPError as e:
        log.warning("llm %s http %s", prov, e.code)
        return jerr(502, enabled=True, error=f"ผู้ให้บริการ AI ตอบ {e.code}")
    except Exception as e:  # noqa: BLE001
        log.warning("llm %s error %s", prov, type(e).__name__)
        return jerr(502, enabled=True, error="เรียกผู้ให้บริการ AI ไม่สำเร็จ")
    log.info("llm task=%s provider=%s session=%s", task, prov, sid_hash(s))
    return secure(JSONResponse({"enabled": True, "provider": prov, "text": text}))


# ------------------------------------------------------------------ OCR — เปิดเมื่อมี OCR_PROVIDER + OCR_API_KEY
def ocr_enabled():
    return bool(env("OCR_PROVIDER") and env("OCR_API_KEY"))


def ocr_adapter(provider: str, pdf: bytes, filename: str) -> str:
    """แปลง PDF (เช่น แบบ 56-1 One Report ที่เป็นภาพสแกน) เป็นข้อความ — คืน text

    TODO(เจ้าของระบบ): เลือกผู้ให้บริการ OCR แล้วเขียนตัวแปลงเฉพาะเจ้าที่นี่ เพราะแต่ละเจ้ารับ/ส่งข้อมูลไม่เหมือนกัน
    (เช่น Google Document AI, Azure Document Intelligence, AWS Textract, หรือ OCR ภาษาไทยในประเทศ)
    โค้ดนี้ไม่เดารูปแบบ API ของบริการที่มีค่าใช้จ่าย — มีให้เพียงตัวแปลงกลาง "generic_http":
      OCR_PROVIDER=generic_http · OCR_ENDPOINT=https://… · OCR_API_KEY=…
      ส่ง multipart/form-data ช่อง "file" พร้อม header Authorization: Bearer <OCR_API_KEY>
      และคาดหวังคำตอบเป็น JSON {"text": "..."}  (เหมาะกับบริการ OCR ที่ตั้งเองหรือ proxy ที่แปลงรูปแบบให้แล้ว)
    """
    if provider == "generic_http":
        url = env("OCR_ENDPOINT")
        if not url:
            raise RuntimeError("ต้องตั้ง OCR_ENDPOINT สำหรับ generic_http")
        boundary = "----ois" + secrets.token_hex(12)
        body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
                f"Content-Type: application/pdf\r\n\r\n").encode() + pdf + f"\r\n--{boundary}--\r\n".encode()
        req = urllib.request.Request(url, data=body, method="POST", headers={
            "Authorization": f"Bearer {env('OCR_API_KEY')}", "Content-Type": f"multipart/form-data; boundary={boundary}"})
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode()).get("text", "")
    raise NotImplementedError(f"ยังไม่มีตัวแปลงสำหรับ OCR_PROVIDER={provider!r} — เพิ่มใน server/app.py: ocr_adapter()")


async def api_ocr(req: Request):
    s, err = require(req)
    if err:
        return err
    if not ocr_enabled():
        return jerr(503, enabled=False, reason="ยังไม่ได้ตั้งค่า API key")
    if not ocr_limiter.allow(s["sid"]):
        return jerr(429, error="ใช้ OCR ครบโควตาชั่วโมงนี้แล้ว")
    form = await req.form(max_files=1, max_fields=4, max_part_size=25 * 1024 * 1024)
    f = form.get("file")
    if f is None or not hasattr(f, "read"):
        return jerr(400, error="ต้องแนบไฟล์ PDF ในช่อง file")
    data = await f.read()
    if len(data) > 25 * 1024 * 1024 or not data.startswith(b"%PDF"):
        return jerr(400, error="รับเฉพาะไฟล์ PDF ไม่เกิน 25 MB")
    name = "".join(ch for ch in (f.filename or "upload.pdf") if ch.isalnum() or ch in "._-")[:80] or "upload.pdf"
    try:
        text = await asyncio.to_thread(ocr_adapter, env("OCR_PROVIDER"), data, name)
    except NotImplementedError as e:
        return jerr(501, enabled=True, error=str(e))
    except Exception as e:  # noqa: BLE001
        log.warning("ocr error %s", type(e).__name__)
        return jerr(502, enabled=True, error="เรียกบริการ OCR ไม่สำเร็จ")
    log.info("ocr bytes=%d session=%s", len(data), sid_hash(s))
    return secure(JSONResponse({"enabled": True, "text": text}))


async def api_integrations(req: Request):
    s, err = require(req)
    if err:
        return err
    p = llm_provider()
    return secure(JSONResponse({"llm": bool(p), "anthropic": p == "anthropic", "openai": p == "openai",
                                "ocr": ocr_enabled()}))


async def not_found(req: Request, exc):
    return jerr(404, error="ไม่พบ")


# ไม่มีการ mount โฟลเดอร์ใดเป็น static — src/, model/, ref/ จึงไม่มีทางถูกส่งออกไป
app = Starlette(
    routes=[
        Route("/", index),
        Route("/login", login, methods=["GET", "POST"]),
        Route("/logout", logout, methods=["GET", "POST"]),
        Route("/logo.png", logo),
        Route("/api/health", health),
        Route("/api/amp", api_amp, methods=["POST"]),
        Route("/api/band", api_band, methods=["POST"]),
        Route("/api/llm", api_llm, methods=["POST"]),
        Route("/api/ocr", api_ocr, methods=["POST"]),
        Route("/api/integrations", api_integrations),
    ],
    middleware=[Middleware(GZipMiddleware, minimum_size=1024)],
    exception_handlers={404: not_found},
)

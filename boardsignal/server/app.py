# -*- coding: utf-8 -*-
"""OpenInnoScore™ · เซิร์ฟเวอร์ส่วนตัว (Render.com)

  uvicorn server.app:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips '*'

ตัวแปรแวดล้อม (ตั้งใน Render → Environment — ห้ามใส่ในโค้ด) · ตารางเต็มอยู่ใน server/README_DEPLOY.md
  APP_PASSWORD        รหัสผ่านหลัก (ไม่บังคับเมื่อเปิด Google Sign-in; ถ้าไม่มีวิธีเข้าสู่ระบบเลย เซิร์ฟเวอร์ไม่ยอมเริ่ม
                      ยกเว้น ALLOW_NO_PASSWORD=1 สำหรับทดสอบในเครื่อง)
  APP_USERS           บัญชีเพิ่ม "ชื่อ1:รหัส1,ชื่อ2:รหัส2" (ไม่บังคับ)
  ADMIN_USER          ชื่อบัญชีรหัสผ่านที่เป็นผู้ดูแล — เข้าสู่ระบบได้ด้วย ADMIN_PASSWORD เท่านั้น
  ADMIN_PASSWORD      รหัสผ่านของ ADMIN_USER (บังคับ — ถ้าไม่ตั้ง ADMIN_USER เข้าสู่ระบบด้วยรหัสผ่านไม่ได้เลย) ·
                      APP_PASSWORD และรหัสใน APP_USERS ใช้กับชื่อ ADMIN_USER ไม่ได้ (ภาคผนวก ง: รหัสร่วมต้องไม่ให้สิทธิ์ผู้ดูแล)
  ADMIN_EMAILS        อีเมล Google ของผู้ดูแล คั่นด้วย ,
  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   เปิด "เข้าสู่ระบบด้วย Google" (OAuth 2.0 Authorization Code)
  ALLOWED_EMAILS      อีเมล/โดเมนที่อนุญาต เช่น "a@x.com,@company.co.th" · ALLOW_ANY_GOOGLE=1 = อนุญาตทุกบัญชีที่ยืนยันอีเมลแล้ว
  PUBLIC_URL          URL สาธารณะ เช่น https://openinnoscore.onrender.com (ใช้สร้าง redirect URI ของ Google)
  API_TOKENS          token สำหรับ /api/v1 (MCP / GPT Action) คั่นด้วย ,
  DB_PATH             ไฟล์ SQLite (ค่าเริ่มต้น ./data/ois.db · Render: /var/data/ois.db) · DATABASE_URL = PostgreSQL (ทางเลือก)
  SECRET_KEY          กุญแจเซ็นคุกกี้ (Render สร้างให้อัตโนมัติจาก render.yaml)
  SESSION_HOURS       อายุการเข้าสู่ระบบ (ค่าเริ่มต้น 12 ชั่วโมง)
  API_ITEMS_PER_MIN   โควตาจำนวนค่าป้อนที่ /api/score คำนวณได้ต่อ session ต่อนาที (ค่าเริ่มต้น 3000)
  API_ITEMS_PER_DAY   โควตาจำนวนค่าป้อนต่อบัญชีต่อวัน (ค่าเริ่มต้น 30000) — ลดโอกาสถอดสูตรด้วยการยิงคำขอจำนวนมาก
                      โควตาต่อนาทีและต่อวันนับทั้งต่อบัญชีและต่อ IP (สร้างชื่อใหม่ด้วย APP_PASSWORD ไม่ได้โควตาเพิ่ม)
  PLAN_SOURCE         server (ค่าเริ่มต้น — ระดับสิทธิ์จากบัญชีบนเซิร์ฟเวอร์) | client (ช่วงทดสอบ — ใช้ระดับที่เบราว์เซอร์ประกาศ
                      ใน header X-OIS-Plan และบันทึก log) · DEFAULT_PLAN = แผนเริ่มต้นของบัญชีที่ยังไม่ถูกตั้ง (free/pro/max)
  OIS_MODEL_PATH      ไฟล์บันทึกพารามิเตอร์ (ois_model.json ฉบับเต็ม) ถ้าไม่ตั้ง = src/ois_model.json (ดู README_DEPLOY.md)
  ANTHROPIC_API_KEY / ANTHROPIC_MODEL   เปิด /api/llm ด้วย Claude
  OPENAI_API_KEY / OPENAI_MODEL         เปิด /api/llm ด้วย OpenAI (ใช้เมื่อไม่มี key ของ Anthropic หรือ LLM_PROVIDER=openai
                                        หรือคำขอระบุ provider="openai")
  OCR_PROVIDER / OCR_API_KEY / OCR_ENDPOINT   เปิด /api/ocr (ดู ocr_adapter)
  OIS_FRAMEWORK=starlette   บังคับใช้ Starlette แม้ติดตั้ง FastAPI ได้ (ค่าเริ่มต้น: FastAPI ถ้ามี)
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
import urllib.parse
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

from . import auth_google as G
from . import db as D
from . import ois_engine as E
from .public_api import Outputs, openapi_spec

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
GOOGLE_ON = G.configured()
PASSWORD_ON = bool(APP_PASSWORD or USERS or ALLOW_NO_PASSWORD)
if not APP_PASSWORD and not USERS and not GOOGLE_ON and not ALLOW_NO_PASSWORD:
    raise SystemExit("ต้องตั้ง APP_PASSWORD (หรือ APP_USERS หรือ GOOGLE_CLIENT_ID/SECRET) ก่อนเริ่มเซิร์ฟเวอร์ — ทดสอบในเครื่องใช้ ALLOW_NO_PASSWORD=1")
_csv = lambda k: [x.strip() for x in (env(k) or "").split(",") if x.strip()]
ADMIN_EMAILS = {x.lower() for x in _csv("ADMIN_EMAILS")}
ADMIN_USER = (env("ADMIN_USER") or "").strip()
ADMIN_PASSWORD = env("ADMIN_PASSWORD") or ""
if ADMIN_USER and not ADMIN_PASSWORD:
    log.warning("ตั้ง ADMIN_USER แต่ไม่ได้ตั้ง ADMIN_PASSWORD — บัญชีผู้ดูแลแบบรหัสผ่านถูกปิด (ใช้ ADMIN_EMAILS + Google แทนได้)")
API_TOKENS = [x for x in _csv("API_TOKENS") if len(x) >= 16]
if len(API_TOKENS) < len(_csv("API_TOKENS")):
    log.warning("API_TOKENS บางตัวสั้นกว่า 16 ตัวอักษร — ไม่ถูกใช้")
SECRET_KEY = env("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_urlsafe(32)
    log.warning("ไม่ได้ตั้ง SECRET_KEY — สุ่มกุญแจชั่วคราว (ทุกคนต้องเข้าสู่ระบบใหม่เมื่อเซิร์ฟเวอร์รีสตาร์ต)")
SESSION_SEC = int(float(env("SESSION_HOURS") or 12) * 3600)
ITEMS_PER_MIN = int(env("API_ITEMS_PER_MIN") or 3000)
ITEMS_PER_DAY = int(env("API_ITEMS_PER_DAY") or 30000)
MAX_ITEMS = 64
COOKIE = "ois_session"
signer = URLSafeTimedSerializer(SECRET_KEY, salt="ois-session")

# ------------------------------------------------------------------ โมเดล (โหลดครั้งเดียว)
MODEL = E.load_model(ROOT)
ENGINE = E.Engine(MODEL, E.load_comps(ROOT))
VERSION = MODEL["version"]
RECORD_ID = ENGINE.record_id                # รุ่นของบันทึกพารามิเตอร์ (version#sha256) — แสดงใน /api/health และหน้า System log
log.info("parameter record %s loaded from %s · KR draws=%d", RECORD_ID, MODEL["_path"], len(ENGINE.kr.th))
OUT = Outputs(ROOT)                       # ผลลัพธ์ที่คำนวณไว้แล้ว (ไม่มีสูตร) สำหรับ /api/v1
DBX = D.get_db()


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


def allow_all(pairs, n=1):
    """ตรวจหลายตัวจำกัด (limiter, key) พร้อมกัน — นับเพิ่มเฉพาะเมื่อผ่านทุกตัว (บัญชี + IP ไม่นับซ้ำเมื่อถูกปฏิเสธ)"""
    now = time.monotonic()
    for lim, key in pairs:
        q = lim.hits[key]
        while q and now - q[0] > lim.window:
            q.popleft()
        if len(q) + n > lim.limit:
            return False
    for lim, key in pairs:
        lim.hits[key].extend([now] * n)
    return True


login_limiter = Limiter(10, 15 * 60)          # 10 ครั้ง / 15 นาที / IP
item_limiter = Limiter(ITEMS_PER_MIN, 60)         # ต่อ session และต่อ IP
day_limiter = Limiter(ITEMS_PER_DAY, 24 * 3600)   # ต่อบัญชี (uid) และต่อ IP — ล็อกอินใหม่/ชื่อใหม่ไม่ได้โควตาเพิ่ม
trace_limiter = Limiter(120, 3600)
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


# ------------------------------------------------------------------ หน้าเข้าสู่ระบบ (สองภาษา · ภาษาอังกฤษเป็นค่าเริ่มต้น)
# ภาษา: ?lang=th|en (จำในคุกกี้ ois_lang) → คุกกี้ → en · ฟอร์มส่งภาษาไปกับ POST (ช่องซ่อน) · ไม่กระทบการตรวจสิทธิ์ใด ๆ
LANG_COOKIE = "ois_lang"
LOGIN_TXT = {
    "en": {"title": "Sign in · OpenInnoScore", "h1": "OpenInnoScore™ · Private prototype",
           "sub": "For invited users under a non-disclosure agreement (NDA) only.", "google": "Sign in with Google",
           "or": "or use a password", "user": "Username", "opt": " (optional)", "pw": "Password", "btn": "Sign in",
           "foot": "All results are statistical associations, not forecasts of business performance.", "langs": "Language"},
    "th": {"title": "เข้าสู่ระบบ · OpenInnoScore", "h1": "OpenInnoScore™ · ต้นแบบส่วนตัว",
           "sub": "สำหรับผู้ได้รับเชิญภายใต้ข้อตกลงรักษาความลับ (NDA) เท่านั้น", "google": "เข้าสู่ระบบด้วย Google",
           "or": "หรือใช้รหัสผ่าน", "user": "ชื่อผู้ใช้", "opt": " (ไม่บังคับ)", "pw": "รหัสผ่าน", "btn": "เข้าสู่ระบบ",
           "foot": "ผลลัพธ์ทุกตัวเป็นความสัมพันธ์เชิงสถิติ ไม่ใช่การพยากรณ์ผลการดำเนินงาน", "langs": "ภาษา"},
}
LOGIN_MSG = {   # รหัสข้อความ → (อังกฤษ, ไทย) · {email} เติมตอนแสดง
    "rate": ("Too many attempts — please wait 15 minutes.", "พยายามเข้าสู่ระบบบ่อยเกินไป — โปรดรอ 15 นาที"),
    "bad_request": ("Invalid request.", "คำขอไม่ถูกต้อง"),
    "pw_off": ("Password sign-in is disabled — use Google.", "ปิดการเข้าสู่ระบบด้วยรหัสผ่าน — ใช้ Google"),
    "wrong": ("Wrong username or password.", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"),
    "g_expired": ("The request expired or is invalid — click Sign in with Google again.", "หมดเวลาหรือคำขอไม่ถูกต้อง — กดเข้าสู่ระบบด้วย Google อีกครั้ง"),
    "g_cancel": ("Google sign-in was cancelled.", "ยกเลิกการเข้าสู่ระบบด้วย Google"),
    "g_state": ("OAuth state mismatch — click Sign in with Google again.", "state ไม่ตรงกัน — กดเข้าสู่ระบบด้วย Google อีกครั้ง"),
    "g_fail": ("Could not reach Google — please try again.", "ติดต่อ Google ไม่สำเร็จ — ลองใหม่อีกครั้ง"),
    "g_unverified": ("This Google account has no verified email.", "บัญชี Google นี้ยังไม่ได้ยืนยันอีเมล"),
    "g_denied": ("The account {email} has not been invited — contact the administrator.", "บัญชี {email} ยังไม่ได้รับเชิญ — ติดต่อผู้ดูแลระบบ"),
}


def login_lang(req: Request, form=None):
    """→ (ภาษา, ต้องบันทึกคุกกี้หรือไม่) · รับเฉพาะ en/th"""
    q = str(req.query_params.get("lang") or (form.get("lang") if form is not None else "") or "").strip().lower()
    if q in LOGIN_TXT:
        return q, q != req.cookies.get(LANG_COOKIE)
    c = str(req.cookies.get(LANG_COOKIE) or "").lower()
    return (c if c in LOGIN_TXT else "en"), False


def login_resp(req: Request, msg="", user="", status=200, form=None, **fmt):
    """หน้าเข้าสู่ระบบในภาษาที่ผู้ใช้เลือก · msg = รหัสใน LOGIN_MSG"""
    lang, remember = login_lang(req, form)
    resp = HTMLResponse(login_page(msg, user, lang, **fmt), status_code=status)
    if remember:
        resp.set_cookie(LANG_COOKIE, lang, max_age=365 * 86400, httponly=True, samesite="lax", secure=not is_local(req), path="/")
    return secure(resp)


def login_page(msg="", user="", lang="en", **fmt):
    lang = lang if lang in LOGIN_TXT else "en"
    L, need_user = LOGIN_TXT[lang], bool(USERS)
    if msg in LOGIN_MSG:
        msg = LOGIN_MSG[msg][0 if lang == "en" else 1].format(**{k: str(v) for k, v in fmt.items()})
    sw = " · ".join(f'<b aria-current="true">{k.upper()}</b>' if k == lang else f'<a href="/login?lang={k}" hreflang="{k}">{k.upper()}</a>'
                    for k in ("en", "th"))
    google = ('<a class="g" href="/auth/google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">'
              '<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/>'
              '<path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/>'
              '<path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/>'
              '<path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>'
              f'<span>{L["google"]}</span></a>') if GOOGLE_ON else ""
    sep = f'<div class="or"><span>{L["or"]}</span></div>' if GOOGLE_ON and PASSWORD_ON else ""
    esc = lambda x: str(x).replace("&", "&amp;").replace("<", "&lt;").replace('"', "&quot;")
    return f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>{L['title']}</title><link rel="icon" href="/logo.png">
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
a.g{{display:flex;gap:10px;align-items:center;justify-content:center;width:100%;padding:10px;border:1px solid var(--line);
border-radius:8px;color:var(--ink);text-decoration:none;font-weight:600;background:var(--card)}}a.g:hover{{border-color:var(--acc)}}
.or{{display:flex;align-items:center;gap:8px;margin:18px 0 2px;color:var(--ink2);font-size:12px}}
.or:before,.or:after{{content:"";flex:1;border-top:1px solid var(--line)}}
.lg{{display:flex;justify-content:flex-end;gap:6px;font-size:12px;color:var(--ink2);margin:-14px -8px 4px 0}}.lg a{{color:var(--acc)}}
</style></head><body><form class="c" method="post" action="/login" autocomplete="on">
<div class="lg" role="group" aria-label="{L['langs']}">{sw}</div><input type="hidden" name="lang" value="{lang}">
<div class="b"><img src="/logo.png" alt=""><h1>{L['h1']}</h1></div>
<p class="s">{L['sub']}</p>
{google}{sep}{f'''<label for="u">{L["user"]}{"" if need_user else L["opt"]}</label>
<input id="u" name="username" value="{esc(user)}" autocomplete="username"{" required" if need_user else ""}>
<label for="p">{L["pw"]}</label><input id="p" name="password" type="password" autocomplete="current-password" required{"" if GOOGLE_ON else " autofocus"}>
<button type="submit">{L["btn"]}</button>''' if PASSWORD_ON else ""}{f'<div class="e" role="alert">{esc(msg)}</div>' if msg else ""}
<div class="f">{L['foot']}</div>
</form></body></html>"""


def _eq(a, b):
    return hmac.compare_digest(str(a).encode(), str(b).encode())


def check_login(user, pw):
    """ลำดับการตรวจ (ภาคผนวก ง: ผู้รู้ APP_PASSWORD ต้องไม่ได้สิทธิ์ผู้ดูแล)
    1) ชื่อ = ADMIN_USER → ต้องตรง ADMIN_PASSWORD เท่านั้น (ไม่ตั้ง ADMIN_PASSWORD = เข้าไม่ได้) · APP_USERS/APP_PASSWORD ใช้ไม่ได้
    2) ชื่ออยู่ใน APP_USERS → ใช้รหัสของบัญชีนั้นเท่านั้น (APP_PASSWORD สวมชื่อบัญชีที่มีรหัสเฉพาะไม่ได้)
    3) APP_PASSWORD (รหัสร่วม) → ชื่อที่พิมพ์ (เว้นว่าง = owner)
    4) ALLOW_NO_PASSWORD (ทดสอบในเครื่อง ไม่มีรหัสใดตั้งไว้) → ชื่อที่พิมพ์ (เว้นว่าง = dev) — ยกเว้นชื่อ ADMIN_USER"""
    user = (user or "").strip()[:64]
    pw = pw or ""
    if ADMIN_USER and (user or "owner") == ADMIN_USER:
        return ADMIN_USER if ADMIN_PASSWORD and _eq(ADMIN_PASSWORD, pw) else None
    if user in USERS:
        return user if _eq(USERS[user], pw) else None
    if APP_PASSWORD and _eq(APP_PASSWORD, pw):
        return user or "owner"
    if ALLOW_NO_PASSWORD and not APP_PASSWORD and not USERS:
        name = user or "dev"
        return None if ADMIN_USER and name == ADMIN_USER else name
    return None


async def login(req: Request):
    if req.method == "GET":
        if session_of(req):
            return RedirectResponse("/", 303)
        return login_resp(req)
    ip = client_ip(req)
    if not login_limiter.allow(ip):
        log.warning("login rate-limited")
        return login_resp(req, "rate", status=429)
    if not same_origin(req):
        return login_resp(req, "bad_request", status=403)
    if not PASSWORD_ON:
        return login_resp(req, "pw_off", status=403)
    form = await req.form()
    user = check_login(str(form.get("username") or ""), str(form.get("password") or ""))
    if not user:
        await asyncio.sleep(0.6)                      # ชะลอการเดารหัส
        log.info("login failed")
        DBX.event(None, "login_failed", {"provider": "password"})
        return login_resp(req, "wrong", str(form.get("username") or ""), status=401, form=form)
    return start_session(req, provider="password", user=user)


def role_for(provider, user=None, email=None):
    if provider == "google" and email and email.lower() in ADMIN_EMAILS:
        return "admin"
    if provider == "password" and ADMIN_USER and ADMIN_PASSWORD and user == ADMIN_USER:
        return "admin"
    return "user"


def start_session(req: Request, provider, user=None, email=None, name=None):
    """สร้าง session หลังยืนยันตัวตนสำเร็จ (ทั้งรหัสผ่านและ Google) + บันทึกผู้ใช้ลงฐานข้อมูล"""
    role = role_for(provider, user, email)
    key = email.lower() if provider == "google" else f"pw:{user}"
    u = DBX.upsert_user(key, name or user or email, provider, role)
    sess = {"u": user or email, "sid": secrets.token_hex(8), "t": int(time.time()), "uid": u["id"],
            "email": email.lower() if email else None, "name": (name or user or email or "")[:120],
            "role": role, "provider": provider}
    DBX.event(u["id"], "login", {"provider": provider})
    resp = RedirectResponse("/", 303)
    resp.set_cookie(COOKIE, signer.dumps(sess), max_age=SESSION_SEC, httponly=True, samesite="lax",
                    secure=not is_local(req), path="/")
    resp.delete_cookie(OAUTH_COOKIE, path="/")
    log.info("login ok provider=%s session=%s", provider, sid_hash(sess))
    return secure(resp)


def is_admin(s):
    """คำนวณจาก env ทุกครั้ง (ถอดสิทธิ์ผู้ดูแลได้ทันทีโดยไม่ต้องรอ session หมดอายุ)"""
    if not s:
        return False
    prov = s.get("provider") or "password"
    return role_for(prov, s.get("u"), s.get("email")) == "admin"


def uid_of(s):
    """session รุ่นเก่า (ก่อนมีฐานข้อมูล) ไม่มี uid → สร้างผู้ใช้ให้ครั้งแรกที่ต้องใช้"""
    if s.get("uid"):
        return s["uid"]
    u = DBX.upsert_user(f"pw:{s.get('u') or 'owner'}", s.get("u"), "password", role_for("password", s.get("u")))
    s["uid"] = u["id"]
    return u["id"]


# ------------------------------------------------------------------ Google Sign-in
OAUTH_COOKIE = "ois_oauth"
oauth_signer = URLSafeTimedSerializer(SECRET_KEY, salt="ois-oauth")


def public_base(req: Request) -> str:
    """PUBLIC_URL ถ้าตั้งไว้ ไม่เช่นนั้นใช้ scheme/host ของคำขอ (uvicorn --proxy-headers แปลง X-Forwarded-Proto ให้แล้ว)"""
    pu = (env("PUBLIC_URL") or "").rstrip("/")
    if pu:
        return pu
    host = req.headers.get("x-forwarded-host") or req.headers.get("host") or (req.url.netloc or "localhost")
    proto = (req.headers.get("x-forwarded-proto") or req.url.scheme or "http").split(",")[0].strip()
    return f"{proto}://{host}"


async def auth_google(req: Request):
    if not GOOGLE_ON:
        return jerr(404, error="ไม่ได้เปิด Google Sign-in")
    if not login_limiter.allow("g:" + client_ip(req)):
        return login_resp(req, "rate", status=429)
    state, nonce = secrets.token_urlsafe(24), secrets.token_urlsafe(24)
    redirect_uri = public_base(req) + "/auth/google/callback"
    resp = RedirectResponse(G.auth_url(redirect_uri, state, nonce), 303)
    resp.set_cookie(OAUTH_COOKIE, oauth_signer.dumps({"s": state, "n": nonce, "r": redirect_uri}), max_age=600,
                    httponly=True, samesite="lax", secure=not is_local(req), path="/")
    return secure(resp)


async def auth_google_callback(req: Request):
    if not GOOGLE_ON:
        return jerr(404, error="ไม่ได้เปิด Google Sign-in")
    fail = lambda msg, code=400, **kw: login_resp(req, msg, status=code, **kw)
    try:
        st = oauth_signer.loads(req.cookies.get(OAUTH_COOKIE) or "", max_age=600)
    except (BadSignature, SignatureExpired):
        return fail("g_expired")
    qp = req.query_params
    if qp.get("error"):
        return fail("g_cancel")
    if not qp.get("code") or not hmac.compare_digest(str(qp.get("state") or ""), st["s"]):
        DBX.event(None, "login_failed", {"provider": "google", "reason": "state"})
        return fail("g_state")
    try:
        tok = await asyncio.to_thread(G.exchange_code, qp["code"], st["r"])
        claims = G.id_token_claims(tok.get("id_token") or "")
        if claims and (claims.get("nonce") != st["n"] or claims.get("aud") not in (None, env("GOOGLE_CLIENT_ID"))):
            raise ValueError("nonce/aud")
        info = await asyncio.to_thread(G.userinfo, tok["access_token"])
    except Exception as e:  # noqa: BLE001
        log.warning("google oauth error %s", type(e).__name__)
        DBX.event(None, "login_failed", {"provider": "google", "reason": type(e).__name__})
        return fail("g_fail", 502)
    email = (info.get("email") or "").strip().lower()
    if not info.get("email_verified") or not email:
        return fail("g_unverified", 403)
    if not G.email_allowed(email, ADMIN_EMAILS):
        DBX.event(None, "login_denied", {"provider": "google", "domain": email.split("@")[-1]})
        return fail("g_denied", 403, email=email)
    return start_session(req, provider="google", email=email, name=info.get("name") or email)


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
    return secure(JSONResponse({"ok": True, "version": VERSION, "record": RECORD_ID, "framework": FRAMEWORK}))


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
        assert isinstance(items, list) and 0 < len(items) <= MAX_ITEMS and all(isinstance(x, dict) for x in items)
    except Exception:
        return None, jerr(400, error=f"รูปแบบคำขอไม่ถูกต้อง (items 1–{MAX_ITEMS} รายการ)")
    ip = "ip:" + client_ip(req)
    if not allow_all([(item_limiter, s["sid"]), (item_limiter, ip)], len(items)):
        log.warning("api rate-limited session=%s", sid_hash(s))
        return None, jerr(429, error="เรียกบ่อยเกินไป — รอสักครู่")
    if not allow_all([(day_limiter, f"u{uid_of(s)}"), (day_limiter, ip)], len(items)):
        log.warning("api daily quota session=%s", sid_hash(s))
        DBX.event(uid_of(s), "score_quota", {"n": len(items)})
        return None, jerr(429, error="ใช้โควตาการคำนวณของวันนี้ครบแล้ว — ติดต่อผู้ดูแลระบบ")
    return items, None


async def api_score(req: Request):
    """POST {items:[{ticker, fem_count?, bsize?, ten?, variant?}]} → {record, items:[…]}
    ภาคผนวก ง ใหม-2 / ง-4 (แก้ไขครั้งที่ 2.5): รับเฉพาะบริษัทที่มีอยู่แล้ว (ticker) และปรับได้สองตัวแปรตาม What-if
      · กรรมการหญิงเป็นจำนวนคน fem_count กับขนาดบอร์ด bsize (จำนวนเต็ม 5–25 · fem_count 0..bsize) — ส่งคู่กัน หรือไม่ส่งทั้งคู่
      · อายุงานเฉลี่ย ten (0–40 ทีละ 0.5 · มีผลเฉพาะ variant "full" = การวิเคราะห์ความไว B_FULL)
      ค่าป้อนอื่น (CEO Promotion Focus · กรรมการครอบครัว · political ties · อุตสาหกรรม) อ่านจากค่าที่เก็บของบริษัทบนเซิร์ฟเวอร์
      ค่านอกช่วงถูกบีบเข้าช่วง · คีย์อื่นถูกปฏิเสธ (400)
    ผลลัพธ์ = ค่าที่หน้าจอแสดงเท่านั้น: OIS / OIS ในอุตสาหกรรม / ช่วง 90% (1 ตำแหน่ง) · ipi · tier · quadrant · ap / dp (จำนวนเต็ม) ·
      B_T1 (ois/tier/quad) · full (เมื่อ variant = full) — ไม่มี amp / cP / B ดิบ ไม่มีเครื่องหมาย csg/asg และไม่มีธง clip
    การให้คะแนนบริษัท-ปีใหม่ (ค่าป้อนเต็มชุด) ทำภายในเซิร์ฟเวอร์ผ่าน ENGINE.score_record() เท่านั้น (server/data_api.py)"""
    s, err = require(req)
    if err:
        return err
    items, err = await _items(req, s)
    if err:
        return err
    try:
        out = await asyncio.to_thread(lambda: [ENGINE.score_public(it) for it in items])
    except (KeyError, TypeError, ValueError) as e:
        return jerr(400, error=f"ค่าป้อนไม่ถูกต้อง: {e}")
    nf = sum(1 for it in items if str(it.get("variant") or "").lower() == "full")
    nfem = sum(1 for it in items if it.get("fem_count") is not None)
    DBX.event(uid_of(s), "score", {"n": len(items), "full": nf, "fem": nfem,
                                   "tickers": sorted({str(it.get("ticker"))[:16] for it in items})[:8]})
    log.info("score n=%d full=%d session=%s", len(items), nf, sid_hash(s))
    return secure(JSONResponse({"record": RECORD_ID, "items": out}))


async def api_outdomain(req: Request):
    """POST {fem_count, fam_count, bsize} → {femP, famP} · โหมดนอกกลุ่มอ้างอิง (ธนาคาร/การเงิน) — เปอร์เซ็นไทล์ของสัดส่วน
    องค์ประกอบบอร์ดเทียบการกระจายของ REF-928 (ข้อมูลเชิงพรรณนา ไม่ใช่คะแนน · ไม่เกี่ยวกับสัมประสิทธิ์) · นับโควตาเหมือน /api/score"""
    s, err = require(req)
    if err:
        return err
    try:
        body = await req.json()
        assert isinstance(body, dict)
    except Exception:  # noqa: BLE001
        return jerr(400, error="รูปแบบคำขอไม่ถูกต้อง")
    ip = "ip:" + client_ip(req)
    if not allow_all([(item_limiter, s["sid"]), (item_limiter, ip), (day_limiter, f"u{uid_of(s)}"), (day_limiter, ip)]):
        return jerr(429, error="เรียกบ่อยเกินไป — รอสักครู่")
    try:
        r = ENGINE.od({k: body.get(k) for k in ("fem_count", "fam_count", "bsize") if k in body} if "bsize" in body
                      else {"fem": body.get("fem"), "fam": body.get("fam")})
    except (TypeError, ValueError) as e:
        return jerr(400, error=f"ค่าป้อนไม่ถูกต้อง: {e}")
    return secure(JSONResponse(r))


async def api_gone(req: Request):
    """/api/amp และ /api/band (รุ่นก่อน) คืน amp ดิบทศนิยม 6 ตำแหน่ง — ปิดแล้ว เพราะถอดสัมประสิทธิ์ได้ (ภาคผนวก ง)"""
    return jerr(410, error="เลิกใช้แล้ว — ใช้ POST /api/score (ผลลัพธ์ระดับเปอร์เซ็นไทล์)")


# ------------------------------------------------------------------ AI (LLM) — เปิดเมื่อมี API key ใน env เท่านั้น
def llm_providers():
    return [p for p, k in (("anthropic", "ANTHROPIC_API_KEY"), ("openai", "OPENAI_API_KEY")) if env(k)]


def llm_provider(requested=None):
    """requested (จากคำขอ) → LLM_PROVIDER (env) → Anthropic → OpenAI · เลือกได้เฉพาะเจ้าที่มี key จริง"""
    have = llm_providers()
    for want in ((requested or "").lower(), (env("LLM_PROVIDER") or "").lower()):
        if want in have:
            return want
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
    try:
        body = await req.json()
        task, payload = body.get("task"), body.get("payload") or {}
        requested = body.get("provider")
    except Exception:
        return jerr(400, error="รูปแบบคำขอไม่ถูกต้อง")
    if requested not in (None, "", "anthropic", "openai"):
        return jerr(400, error="provider ต้องเป็น anthropic หรือ openai")
    prov = llm_provider(requested)
    if not prov:
        return jerr(503, enabled=False, reason="ยังไม่ได้ตั้งค่า API key")
    if task not in TASKS:
        return jerr(400, error="task ไม่รองรับ", tasks=sorted(TASKS))
    if not llm_limiter.allow(s["sid"]):
        return jerr(429, error="ใช้ AI ครบโควตาชั่วโมงนี้แล้ว")
    try:
        text = await asyncio.to_thread(call_llm, prov, task, _scrub(payload))
    except urllib.error.HTTPError as e:
        log.warning("llm %s http %s", prov, e.code)
        DBX.event(uid_of(s), "llm_error", {"task": task, "provider": prov, "http": e.code})
        return jerr(502, enabled=True, error=f"ผู้ให้บริการ AI ตอบ {e.code}")
    except Exception as e:  # noqa: BLE001
        log.warning("llm %s error %s", prov, type(e).__name__)
        DBX.event(uid_of(s), "llm_error", {"task": task, "provider": prov, "err": type(e).__name__})
        return jerr(502, enabled=True, error="เรียกผู้ให้บริการ AI ไม่สำเร็จ")
    log.info("llm task=%s provider=%s session=%s", task, prov, sid_hash(s))
    DBX.event(uid_of(s), "llm", {"task": task, "provider": prov, "requested": requested or None})
    return secure(JSONResponse({"enabled": True, "provider": prov, "requested": requested or None, "text": text}))


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
    p, have = llm_provider(), llm_providers()
    return secure(JSONResponse({"llm": bool(p), "anthropic": p == "anthropic", "openai": p == "openai",
                                "providers": have, "default_provider": p, "ocr": ocr_enabled(),
                                "google": GOOGLE_ON, "db": await asyncio.to_thread(DBX.ping), "admin": is_admin(s),
                                "record": RECORD_ID}))


# ------------------------------------------------------------------ ผู้ใช้ / ผลแบบสอบถาม (ฐานข้อมูลกลาง)
MAX_PAYLOAD = 64 * 1024
resp_limiter = Limiter(120, 3600)          # 120 รายการ / ชั่วโมง / ผู้ใช้
api_limiter = Limiter(600, 3600)           # /api/v1: 600 ครั้ง / ชั่วโมง / token
DICT_TEXT_KEYS = {"text", "words", "terms", "entries", "list", "raw", "content", "dict", "dictionary"}


def _clean_ticker(t):
    t = str(t or "").strip().upper()[:16]
    return t if t and all(ch.isalnum() or ch in "-._&" for ch in t) else None


def _plan_for(u):
    """ระดับสิทธิ์ที่ส่งให้เบราว์เซอร์ · PLAN_SOURCE=client (ช่วงทดสอบผู้ใช้/สาธิต) → None ให้ผู้ใช้เลือกเองที่หน้าเข้าใช้งาน
    · ค่าเริ่มต้น server → ใช้ค่าของบัญชี (ผู้ดูแลตั้งได้) ถ้าบัญชียังไม่เคยถูกตั้งค่า ใช้ DEFAULT_PLAN (free/pro/max)"""
    if (env("PLAN_SOURCE") or "server").lower() == "client":
        return None
    p = u.get("plan")
    if (not p or p == "free") and (env("DEFAULT_PLAN") or "").lower() in ("pro", "max") and not u.get("plan_set"):
        return env("DEFAULT_PLAN").lower()
    return p or "free"


PLAN_RANK = {"free": 0, "pro": 1, "max": 2}
PLAN_HEADER = "x-ois-plan"


def plan_source():
    return (env("PLAN_SOURCE") or "server").lower()


def effective_plan(req: Request, s):
    """ระดับสิทธิ์ที่ใช้ตรวจฝั่งเซิร์ฟเวอร์ → (plan, source)
    PLAN_SOURCE=server (ค่าเริ่มต้น): แผนของบัญชี (_plan_for) · header ของเบราว์เซอร์ถูกละเลย
    PLAN_SOURCE=client (ช่วงทดสอบ): ใช้แผนที่เบราว์เซอร์ประกาศใน header X-OIS-Plan (ไม่มี/ไม่ถูกต้อง = free) และบันทึก log
      — ไม่ใช่การบังคับสิทธิ์จริง ใช้เพื่อให้ endpoint ทำงานตามระดับที่ผู้ทดสอบเลือกเท่านั้น"""
    u = DBX.get_user(uid_of(s)) or {}
    p = _plan_for(u)
    if p is not None:
        return (p if p in PLAN_RANK else "free"), "server"
    raw = (req.headers.get(PLAN_HEADER) or "").strip().lower()
    p = raw if raw in PLAN_RANK else "free"
    log.info("plan declared by client plan=%s raw=%s session=%s path=%s", p, raw[:12] or "-", sid_hash(s), req.url.path)
    return p, "client"


def require_plan(req: Request, min_plan):
    """ตัวช่วยบังคับระดับสิทธิ์ฝั่งเซิร์ฟเวอร์สำหรับ endpoint ของโมดูลอื่น → (session, error_response)
        from . import app as A
        s, err = A.require_plan(req, "pro")
        if err: return err
    ผู้ดูแลระบบผ่านทุกระดับ · ไม่ผ่าน → 403 {error, need, plan, plan_source} และบันทึก event plan_denied
    หมายเหตุ: เครดิต (token) ยังนับฝั่งเบราว์เซอร์ (localStorage) — เซิร์ฟเวอร์ไม่มีบัญชีเครดิต (เฟส 2: Payment API) ·
    require_plan ตรวจเฉพาะระดับแผน ไม่หักเครดิต"""
    s, err = require(req)
    if err:
        return None, err
    need = str(min_plan or "free").lower()
    if need not in PLAN_RANK:
        raise ValueError(f"min_plan ต้องเป็น {', '.join(PLAN_RANK)}")
    if is_admin(s):
        return s, None
    p, src = effective_plan(req, s)
    if PLAN_RANK[p] < PLAN_RANK[need]:
        DBX.event(uid_of(s), "plan_denied", {"path": req.url.path, "need": need, "plan": p, "src": src})
        return None, jerr(403, error="ระดับสิทธิ์ไม่พอสำหรับฟังก์ชันนี้", need=need, plan=p, plan_source=src)
    s = dict(s, plan=p, plan_source=src)
    return s, None


async def api_me(req: Request):
    s, err = require(req)
    if err:
        return err
    u = DBX.get_user(uid_of(s)) or {}
    return secure(JSONResponse({"email": s.get("email"), "name": s.get("name") or s.get("u"),
                                "role": "admin" if is_admin(s) else "user",
                                "provider": s.get("provider") or "password",
                                "plan": _plan_for(u), "record": RECORD_ID}))


async def api_responses(req: Request):
    s, err = require(req)
    if err:
        return err
    raw = await req.body()
    if len(raw) > MAX_PAYLOAD:
        return jerr(413, error=f"ข้อมูลใหญ่เกิน {MAX_PAYLOAD // 1024} KB")
    try:
        body = json.loads(raw.decode("utf-8"))
        kind, payload = body.get("kind"), body.get("payload")
    except Exception:  # noqa: BLE001
        return jerr(400, error="รูปแบบคำขอไม่ถูกต้อง (JSON)")
    if kind not in D.KINDS:
        return jerr(400, error="kind ไม่รองรับ", kinds=list(D.KINDS))
    if not isinstance(payload, (dict, list)):
        return jerr(400, error="payload ต้องเป็น object หรือ array")
    if kind == "dict" and isinstance(payload, dict):
        # พจนานุกรมของผู้ใช้: เก็บเฉพาะข้อมูลสรุป (meta) — ไม่เก็บรายการคำหรือข้อความต้นฉบับ
        payload = {k: v for k, v in payload.items() if str(k).lower() not in DICT_TEXT_KEYS
                   and not (isinstance(v, str) and len(v) > 200) and not isinstance(v, list)}
    uid = uid_of(s)
    if not resp_limiter.allow(f"u{uid}"):
        return jerr(429, error="ส่งข้อมูลบ่อยเกินไป — รอสักครู่")
    if kind == "survey" and isinstance(payload, dict):
        # กลุ่ม A/B มาจากเซิร์ฟเวอร์เท่านั้น — ค่าที่เบราว์เซอร์ส่งมาเก็บไว้ใน arm_client เพื่อตรวจสอบย้อนหลัง
        arm, _ = await asyncio.to_thread(survey_arm_assign, uid)
        if payload.get("arm") != arm:
            payload = dict(payload, arm_client=payload.get("arm"))
        payload = dict(payload, arm=arm, arm_src="server")
    cid = str(body.get("client_id") or "")[:64] or None
    rid = DBX.add_response(uid, kind, payload, _clean_ticker(body.get("ticker")), cid)
    DBX.event(uid, "submit", {"kind": kind, "id": rid})
    return secure(JSONResponse({"ok": True, "id": rid, "kind": kind}))


async def api_responses_mine(req: Request):
    s, err = require(req)
    if err:
        return err
    kind = req.query_params.get("kind") or None
    if kind and kind not in D.KINDS:
        return jerr(400, error="kind ไม่รองรับ", kinds=list(D.KINDS))
    return secure(JSONResponse({"items": DBX.mine(uid_of(s), kind)}))


SURVEY_ARMS = ("grid", "table")


def survey_arm_counts():
    """นับจากตารางการจัดกลุ่มที่เซิร์ฟเวอร์ออกให้ (หนึ่งแถวต่อบัญชี) — แถว survey ที่เบราว์เซอร์ส่งมาไม่ถูกนับ จึงเอียงตัวนับไม่ได้"""
    c = {a: 0 for a in SURVEY_ARMS}
    for a, n in DBX.survey_arm_counts().items():
        if a in c:
            c[a] += n
    return c


def survey_arm_assign(uid):
    """กลุ่มของผู้ใช้ (ออกครั้งเดียวต่อบัญชีแล้วเก็บถาวร) · จัดแบบสมดุล: กลุ่มที่มีคนน้อยกว่า · เท่ากันแล้วสลับตามลำดับ (คู่ = grid)"""
    a = DBX.survey_arm_of(uid)
    if a:
        return a, False
    c = survey_arm_counts()
    g, t = c["grid"], c["table"]
    arm = ("grid" if g < t else "table") if g != t else ("grid" if (g + t) % 2 == 0 else "table")
    return DBX.survey_arm_set(uid, arm), True


async def survey_arms(req: Request):
    """GET → {grid, table, arm, assigned} · จำนวนผู้ที่ได้รับการจัดกลุ่ม A/B (grid / table) ต่อกลุ่ม และกลุ่มของผู้ใช้คนนี้
    ภาคผนวก ง-24: เซิร์ฟเวอร์เป็นผู้จัดกลุ่มและเก็บถาวรต่อบัญชี (ตาราง survey_arms) — ตัวนับมาจากตารางนี้เท่านั้น
    ?assign=0 = ดูอย่างเดียว ไม่จัดกลุ่มให้"""
    s, err = require(req)
    if err:
        return err
    uid = uid_of(s)
    if (req.query_params.get("assign") or "1") == "0":
        arm, new = DBX.survey_arm_of(uid), False
    else:
        arm, new = await asyncio.to_thread(survey_arm_assign, uid)
        if new:
            DBX.event(uid, "survey_arm", {"arm": arm})
    return secure(JSONResponse(dict(survey_arm_counts(), arm=arm, assigned=new)))


def require_admin(req: Request):
    s, err = require(req)
    if err:
        return None, err
    if not is_admin(s):
        return None, jerr(403, error="เฉพาะผู้ดูแลระบบ")
    return s, None


async def admin_responses(req: Request):
    s, err = require_admin(req)
    if err:
        return err
    kind = req.query_params.get("kind") or None
    if kind and kind not in D.KINDS:
        return jerr(400, error="kind ไม่รองรับ", kinds=list(D.KINDS))
    fmt = (req.query_params.get("format") or "json").lower()
    rows = DBX.responses(kind)
    DBX.event(uid_of(s), "admin_export", {"kind": kind, "format": fmt, "n": len(rows)})
    if fmt == "csv":
        name = f"ois_{kind or 'all'}_{time.strftime('%Y%m%d')}.csv"
        return secure(Response(D.to_csv(rows), media_type="text/csv; charset=utf-8",
                               headers={"Content-Disposition": f'attachment; filename="{name}"'}))
    return secure(JSONResponse({"items": rows, "n": len(rows)}))


async def admin_summary(req: Request):
    s, err = require_admin(req)
    if err:
        return err
    return secure(JSONResponse(DBX.summary()))


async def admin_users(req: Request):
    s, err = require_admin(req)
    if err:
        return err
    return secure(JSONResponse({"users": DBX.users()}))


async def admin_user_plan(req: Request):
    """GET → {id, plan} · POST {plan: free|pro|max} → ตั้งแผนของผู้ใช้ (ฝั่งเซิร์ฟเวอร์เป็นแหล่งจริงของสิทธิ์ในโหมดเซิร์ฟเวอร์)"""
    s, err = require_admin(req)
    if err:
        return err
    try:
        uid = int(req.path_params["uid"])
    except (KeyError, ValueError):
        return jerr(400, error="id ไม่ถูกต้อง")
    u = DBX.get_user(uid)
    if not u:
        return jerr(404, error="ไม่พบผู้ใช้")
    if req.method == "POST":
        try:
            plan = (await req.json()).get("plan")
            u = DBX.set_plan(uid, plan)
        except Exception:  # noqa: BLE001
            return jerr(400, error="plan ต้องเป็น free | pro | max", plans=list(D.PLANS))
        DBX.event(uid_of(s), "admin_plan", {"user": uid, "plan": plan})
    return secure(JSONResponse({"id": u["id"], "email": u["email"], "plan": u.get("plan") or "free"}))


async def admin_trace(req: Request):
    """ตรวจการคำนวณรายบริษัท ทีละขั้นพร้อมค่าในบันทึกพารามิเตอร์ — ผู้ดูแล/อาจารย์เท่านั้น และบันทึกทุกครั้ง"""
    s, err = require_admin(req)
    if err:
        return err
    t = _clean_ticker(req.path_params.get("ticker"))
    if not trace_limiter.allow(f"u{uid_of(s)}"):
        return jerr(429, error="เรียกบ่อยเกินไป")
    tr = ENGINE.trace(t) if t else None
    DBX.event(uid_of(s), "admin_trace", {"ticker": t, "found": bool(tr), "record": RECORD_ID})
    log.info("admin trace ticker=%s session=%s", t, sid_hash(s))
    if not tr:
        return jerr(404, error="ไม่พบบริษัท")
    return secure(JSONResponse(tr))


async def admin_events(req: Request):
    s, err = require_admin(req)
    if err:
        return err
    return secure(JSONResponse({"events": DBX.events(min(int(req.query_params.get("limit") or 200), 2000))}))


async def admin_backup(req: Request):
    """ดาวน์โหลดสำเนาไฟล์ SQLite ทั้งก้อน (สำรองข้อมูล) — ใช้ sqlite3 backup API จึงได้ไฟล์ที่สอดคล้องแม้มีคนเขียนอยู่"""
    s, err = require_admin(req)
    if err:
        return err
    if DBX.kind != "sqlite":
        return jerr(400, error="ฐานข้อมูลเป็น PostgreSQL — สำรองด้วย pg_dump / ระบบ backup ของผู้ให้บริการ")
    import sqlite3
    import tempfile
    tmp = Path(tempfile.mkdtemp()) / f"ois_backup_{time.strftime('%Y%m%d_%H%M%S')}.db"

    def _copy():
        dst = sqlite3.connect(str(tmp))
        with DBX.lock:
            DBX.conn.backup(dst)
        dst.close()
    await asyncio.to_thread(_copy)
    DBX.event(uid_of(s), "admin_backup", {"bytes": tmp.stat().st_size})
    return secure(FileResponse(tmp, media_type="application/octet-stream", filename=tmp.name))


# ------------------------------------------------------------------ /api/v1 — ผลลัพธ์เท่านั้น สำหรับ AI agent (DP6)
def token_ok(req: Request):
    h = req.headers.get("authorization") or ""
    if not h.lower().startswith("bearer "):
        return None
    tok = h[7:].strip().encode()
    for t in API_TOKENS:
        if hmac.compare_digest(t.encode(), tok):
            return "tok:" + hashlib.sha256(t.encode()).hexdigest()[:8]
    return None


def require_api(req: Request):
    """Bearer token (API_TOKENS) หรือ session ของผู้ที่เข้าสู่ระบบแล้ว → (คีย์ผู้เรียก, uid|None, error)"""
    who = token_ok(req)
    uid = None
    if not who:
        if req.headers.get("authorization"):
            return None, None, jerr(401, error="token ไม่ถูกต้อง")
        s = session_of(req)
        if not s:
            return None, None, jerr(401, error="ต้องใช้ Authorization: Bearer <token> หรือเข้าสู่ระบบ")
        uid, who = uid_of(s), "sess:" + sid_hash(s)
    if not api_limiter.allow(who):
        return None, None, jerr(429, error="เรียกบ่อยเกินไป (600 ครั้ง/ชั่วโมง)")
    return who, uid, None


def v1_json(req, who, uid, body, status=200):
    DBX.event(uid, "api_v1", {"path": req.url.path, "q": str(req.url.query)[:200], "who": who, "status": status})
    r = secure(JSONResponse(body, status_code=status))
    r.headers["X-OIS-Reference"] = VERSION
    return r


async def v1_companies(req: Request):
    who, uid, err = require_api(req)
    if err:
        return err
    ind = req.query_params.get("industry")
    return v1_json(req, who, uid, {"reference": VERSION, "industries": OUT.industries(),
                                   "companies": OUT.companies(ind), "disclaimer": D_DISC})


async def v1_company(req: Request):
    who, uid, err = require_api(req)
    if err:
        return err
    c = OUT.company(req.path_params["ticker"])
    if not c:
        return v1_json(req, who, uid, {"error": "ไม่พบบริษัท", "ticker": req.path_params["ticker"][:16]}, 404)
    return v1_json(req, who, uid, c)


async def v1_questions(req: Request):
    who, uid, err = require_api(req)
    if err:
        return err
    uc = (req.query_params.get("usecase") or "board").lower()
    q = OUT.board_questions(req.path_params["ticker"], uc)
    if q is None:
        return v1_json(req, who, uid, {"error": "ไม่พบบริษัท", "ticker": req.path_params["ticker"][:16]}, 404)
    if q.get("error"):
        return v1_json(req, who, uid, {"error": "usecase ไม่รองรับ", "allowed": q["allowed"]}, 400)
    return v1_json(req, who, uid, q)


async def openapi_json(req: Request):
    """OpenAPI 3.1 ของ /api/v1 — ต้องมี token หรือเป็นผู้ดูแลระบบ"""
    if not token_ok(req) and not is_admin(session_of(req)):
        return jerr(401, error="ต้องใช้ token หรือสิทธิ์ผู้ดูแลระบบ")
    return secure(JSONResponse(openapi_spec(public_base(req))))


D_DISC = "ผลลัพธ์เท่านั้น — ไม่มีสูตร สัมประสิทธิ์ หรือข้อมูลรายแถวของฐานอ้างอิง"


async def not_found(req: Request, exc):
    return jerr(404, error="ไม่พบ")


# ไม่มีการ mount โฟลเดอร์ใดเป็น static — src/, model/, ref/ จึงไม่มีทางถูกส่งออกไป
ROUTES = [
    Route("/", index),
    Route("/login", login, methods=["GET", "POST"]),
    Route("/logout", logout, methods=["GET", "POST"]),
    Route("/auth/google", auth_google),
    Route("/auth/google/callback", auth_google_callback),
    Route("/logo.png", logo),
    Route("/api/health", health),
    Route("/favicon.ico", lambda req: Response(status_code=204)),
    Route("/api/score", api_score, methods=["POST"]),
    Route("/api/outdomain", api_outdomain, methods=["POST"]),
    Route("/api/amp", api_gone, methods=["GET", "POST"]),
    Route("/api/band", api_gone, methods=["GET", "POST"]),
    Route("/api/llm", api_llm, methods=["POST"]),
    Route("/api/ocr", api_ocr, methods=["POST"]),
    Route("/api/integrations", api_integrations),
    Route("/api/me", api_me),
    Route("/api/responses", api_responses, methods=["POST"]),
    Route("/api/responses/mine", api_responses_mine),
    Route("/api/survey/arms", survey_arms),
    Route("/api/admin/responses", admin_responses),
    Route("/api/admin/summary", admin_summary),
    Route("/api/admin/users", admin_users),
    Route("/api/admin/users/{uid}/plan", admin_user_plan, methods=["GET", "POST"]),
    Route("/api/admin/trace/{ticker}", admin_trace),
    Route("/api/admin/events", admin_events),
    Route("/api/admin/backup", admin_backup),
    Route("/api/v1/companies", v1_companies),
    Route("/api/v1/companies/{ticker}", v1_company),
    Route("/api/v1/companies/{ticker}/board-questions", v1_questions),
    Route("/api/openapi.json", openapi_json),
]
def _ext_routes():
    """เส้นทางจากโมดูลเสริม: report_api (รายงานเทมเพลตด้วย Claude API) · data_api (ข้อมูลหลายปี + อนุมัติ + Validity)"""
    import importlib
    out = []
    for name in ("report_api", "data_api"):
        for qual in ([f"{__package__}.{name}"] if __package__ else []) + [name]:
            try:
                m = importlib.import_module(qual)
            except ModuleNotFoundError as e:
                if e.name in (qual, name):
                    continue
                raise
            out += list(getattr(m, "ROUTES", []))
            break
    return out


ROUTES += _ext_routes()
MIDDLEWARE = [Middleware(GZipMiddleware, minimum_size=1024)]
HANDLERS = {404: not_found}
FRAMEWORK = "starlette"


def build_app():
    """FastAPI (ตามขอบเขตงาน) เมื่อติดตั้งได้ · ไม่ได้ → Starlette (แกนเดียวกัน เส้นทางและพฤติกรรมเหมือนกันทุกจุด)
    ปิด /docs /redoc /openapi.json อัตโนมัติของ FastAPI — สเปกของ API สาธารณะอยู่ที่ /api/openapi.json (ต้องมีสิทธิ์)"""
    global FRAMEWORK
    if (env("OIS_FRAMEWORK") or "").lower() != "starlette":
        try:
            from fastapi import FastAPI
            a = FastAPI(title="OpenInnoScore API", version=VERSION, routes=list(ROUTES), middleware=MIDDLEWARE,
                        exception_handlers=HANDLERS, docs_url=None, redoc_url=None, openapi_url=None)
            FRAMEWORK = "fastapi"
            log.info("framework: FastAPI")
            return a
        except ImportError:
            log.info("ไม่ได้ติดตั้ง FastAPI — ใช้ Starlette")
        except Exception as e:  # noqa: BLE001
            log.warning("สร้างแอปด้วย FastAPI ไม่สำเร็จ (%s: %s) — ใช้ Starlette", type(e).__name__, e)
    FRAMEWORK = "starlette"
    return Starlette(routes=ROUTES, middleware=MIDDLEWARE, exception_handlers=HANDLERS)


app = build_app()

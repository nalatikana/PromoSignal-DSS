# -*- coding: utf-8 -*-
"""Google Sign-in (OpenID Connect, OAuth 2.0 Authorization Code flow) — ใช้ urllib ของ Python ไม่ต้องติดตั้งไลบรารีเพิ่ม

ขั้นตอน
  1. /auth/google           สุ่ม state + nonce เก็บในคุกกี้ที่เซ็นแล้ว (อายุ 10 นาที) → redirect ไป Google
  2. /auth/google/callback  ตรวจ state → แลก code เป็น token ที่ GOOGLE_TOKEN_URL (server-to-server, client secret)
                            → อ่าน userinfo ด้วย access token → ต้อง email_verified → ตรวจ allowlist → สร้าง session
ตัวแปร GOOGLE_AUTH_URL / GOOGLE_TOKEN_URL / GOOGLE_USERINFO_URL ใช้แทนที่ปลายทางของ Google ได้ — มีไว้สำหรับการทดสอบเท่านั้น
"""
import base64
import json
import os
import urllib.parse
import urllib.request

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
SCOPE = "openid email profile"


def env(k, d=""):
    return os.environ.get(k) or d


def configured():
    return bool(env("GOOGLE_CLIENT_ID") and env("GOOGLE_CLIENT_SECRET"))


def auth_url(redirect_uri, state, nonce):
    q = {"client_id": env("GOOGLE_CLIENT_ID"), "redirect_uri": redirect_uri, "response_type": "code",
         "scope": SCOPE, "state": state, "nonce": nonce, "prompt": "select_account", "access_type": "online"}
    return env("GOOGLE_AUTH_URL", AUTH_URL) + "?" + urllib.parse.urlencode(q)


def exchange_code(code, redirect_uri, timeout=15):
    body = urllib.parse.urlencode({"code": code, "client_id": env("GOOGLE_CLIENT_ID"),
                                   "client_secret": env("GOOGLE_CLIENT_SECRET"), "redirect_uri": redirect_uri,
                                   "grant_type": "authorization_code"}).encode()
    req = urllib.request.Request(env("GOOGLE_TOKEN_URL", TOKEN_URL), data=body, method="POST",
                                 headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def userinfo(access_token, timeout=15):
    req = urllib.request.Request(env("GOOGLE_USERINFO_URL", USERINFO_URL),
                                 headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def id_token_claims(id_token):
    """อ่าน payload ของ id_token (ไม่ตรวจลายเซ็น — token ได้มาโดยตรงจาก token endpoint ผ่าน TLS ตาม OIDC Core 3.1.3.7)
    ใช้ตรวจ nonce / aud เท่านั้น"""
    try:
        part = id_token.split(".")[1]
        part += "=" * (-len(part) % 4)
        return json.loads(base64.urlsafe_b64decode(part.encode()).decode())
    except Exception:  # noqa: BLE001
        return {}


def email_allowed(email, admin_emails=()):
    """ALLOW_ANY_GOOGLE=1 → ทุกบัญชีที่ยืนยันอีเมลแล้ว · ALLOWED_EMAILS = รายชื่ออีเมลหรือ "@โดเมน" · ผู้ดูแลผ่านเสมอ
    ไม่ได้ตั้งทั้งสองค่า → อนุญาตเฉพาะ ADMIN_EMAILS (ค่าเริ่มต้นที่ปลอดภัย)"""
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        return False
    if email in admin_emails:
        return True
    if env("ALLOW_ANY_GOOGLE") == "1":
        return True
    domain = "@" + email.split("@", 1)[1]
    for a in (x.strip().lower() for x in env("ALLOWED_EMAILS").split(",")):
        if a and (a == email or (a.startswith("@") and a == domain)):
            return True
    return False

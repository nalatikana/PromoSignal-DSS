# -*- coding: utf-8 -*-
"""ทดสอบ Google Sign-in ทั้งเส้นทางด้วยผู้ให้บริการปลอม (http.server ในเธรด) — ไม่ต่อ Google จริง
ผู้ให้บริการปลอมทำหน้าที่ 3 ปลายทาง: /auth (redirect กลับพร้อม code) · /token · /userinfo
เซิร์ฟเวอร์ถูกชี้ไปที่ปลอมด้วย GOOGLE_AUTH_URL / GOOGLE_TOKEN_URL / GOOGLE_USERINFO_URL (ใช้เพื่อทดสอบเท่านั้น)
รัน:  python3 server/tests/test_google.py"""
import base64
import json
import sys
import tempfile
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from server.tests._util import Client, Server, free_port  # noqa: E402

STATE = {"email": "tester@pilot.example", "verified": True, "codes": {}, "token_calls": []}


def b64(d):
    return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")


class Fake(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = dict(urllib.parse.parse_qsl(u.query))
        if u.path == "/auth":
            assert q["client_id"] == "cid-123" and q["response_type"] == "code" and "openid" in q["scope"]
            assert q["prompt"] == "select_account"
            code = "code-" + q["state"][:6]
            STATE["codes"][code] = {"nonce": q["nonce"], "redirect_uri": q["redirect_uri"], "email": STATE["email"],
                                    "verified": STATE["verified"]}
            loc = q["redirect_uri"] + "?" + urllib.parse.urlencode({"code": code, "state": q["state"]})
            self.send_response(302)
            self.send_header("Location", loc)
            self.end_headers()
            return
        if u.path == "/userinfo":
            tok = (self.headers.get("Authorization") or "")[7:]
            info = STATE["codes"].get(tok.replace("at-", ""))
            if not info:
                return self._json(401, {"error": "invalid_token"})
            return self._json(200, {"sub": "1", "email": info["email"], "email_verified": info["verified"], "name": "ผู้ทดสอบ"})
        self._json(404, {})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        form = dict(urllib.parse.parse_qsl(self.rfile.read(n).decode()))
        STATE["token_calls"].append(form)
        info = STATE["codes"].get(form.get("code"))
        if (self.path != "/token" or not info or form.get("client_secret") != "sec-456"
                or form.get("redirect_uri") != info["redirect_uri"] or form.get("grant_type") != "authorization_code"):
            return self._json(400, {"error": "invalid_grant"})
        idt = "x." + b64({"aud": "cid-123", "nonce": info["nonce"], "email": info["email"]}) + ".sig"
        self._json(200, {"access_token": "at-" + form["code"], "id_token": idt, "token_type": "Bearer"})


def run():
    fp = free_port()
    fake = HTTPServer(("127.0.0.1", fp), Fake)
    threading.Thread(target=fake.serve_forever, daemon=True).start()
    fb = f"http://127.0.0.1:{fp}"
    tmp = Path(tempfile.mkdtemp())
    env = {"GOOGLE_CLIENT_ID": "cid-123", "GOOGLE_CLIENT_SECRET": "sec-456", "SECRET_KEY": "s",
           "GOOGLE_AUTH_URL": fb + "/auth", "GOOGLE_TOKEN_URL": fb + "/token", "GOOGLE_USERINFO_URL": fb + "/userinfo",
           "ALLOWED_EMAILS": "@pilot.example,solo@other.example", "ADMIN_EMAILS": "boss@pilot.example",
           "DB_PATH": str(tmp / "g.db")}                                   # ไม่มี APP_PASSWORD — Google อย่างเดียว
    srv = Server(env, log_path=tmp / "g.log")
    try:
        # หน้าเข้าสู่ระบบมีปุ่ม Google และไม่มีช่องรหัสผ่าน
        c = Client(srv.base)
        st, _, b = c.req("GET", "/login")
        html = b.decode()
        assert st == 200 and 'href="/auth/google"' in html and "เข้าสู่ระบบด้วย Google" in html and 'name="password"' not in html
        st, _, _ = c.req("POST", "/login", form={"username": "x", "password": "y"})
        assert st == 403
        # 1) อีเมลในโดเมนที่อนุญาต → เข้าได้ role=user
        st, h, b = c.req("GET", "/auth/google")
        assert st == 200 and b"OIS_SERVER" in b, (st, b[:300])
        st, me = c.json("GET", "/api/me")
        assert me == {"email": "tester@pilot.example", "name": "ผู้ทดสอบ", "role": "user", "provider": "google"}, me
        assert STATE["token_calls"][-1]["redirect_uri"] == srv.base + "/auth/google/callback"
        st, r = c.json("POST", "/api/responses", data={"kind": "feedback", "payload": {"text": "ok"}})
        assert st == 200
        # 2) ผู้ดูแล
        STATE["email"] = "boss@pilot.example"
        a = Client(srv.base)
        a.req("GET", "/auth/google")
        st, me = a.json("GET", "/api/me")
        assert me["role"] == "admin", me
        st, us = a.json("GET", "/api/admin/users")
        assert {u["email"] for u in us["users"]} == {"tester@pilot.example", "boss@pilot.example"}, us
        # 3) อีเมลนอก allowlist → 403
        STATE["email"] = "stranger@gmail.com"
        x = Client(srv.base)
        st, _, b = x.req("GET", "/auth/google")
        assert st == 403 and "ยังไม่ได้รับเชิญ" in b.decode(), (st, b[:200])
        st, _ = x.json("GET", "/api/me")
        assert st == 401
        # 4) อีเมลยังไม่ยืนยัน → 403
        STATE.update(email="solo@other.example", verified=False)
        y = Client(srv.base)
        st, _, b = y.req("GET", "/auth/google")
        assert st == 403 and "ยืนยันอีเมล" in b.decode()
        STATE["verified"] = True
        # 5) state ปลอม / ไม่มีคุกกี้ state → ปฏิเสธ
        z = Client(srv.base, follow=False)
        st, h, _ = z.req("GET", "/auth/google")
        assert st == 303 and h["location"].startswith(fb + "/auth?")
        st, _, b = z.req("GET", "/auth/google/callback?code=code-xxx&state=forged")
        assert st == 400 and "state" in b.decode()
        st, _, _ = Client(srv.base).req("GET", "/auth/google/callback?code=c&state=s")
        assert st == 400
        # 6) ยกเลิกที่หน้า Google
        st, _, _ = z.req("GET", "/auth/google/callback?error=access_denied")
        assert st == 400
        # 7) nonce ไม่ตรง → ปฏิเสธ (แก้ nonce ในผู้ให้บริการปลอม)
        w = Client(srv.base, follow=False)
        st, h, _ = w.req("GET", "/auth/google")
        q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(h["location"]).query))
        code = "code-" + q["state"][:6]
        STATE["codes"][code] = {"nonce": "WRONG", "redirect_uri": q["redirect_uri"], "email": "solo@other.example", "verified": True}
        st, _, b = w.req("GET", f"/auth/google/callback?code={code}&state={urllib.parse.quote(q['state'])}")
        assert st == 502, (st, b[:200])
        # 8) อีเมลรายตัวใน allowlist ผ่าน
        v = Client(srv.base)
        st, _, _ = v.req("GET", "/auth/google")
        st, me = v.json("GET", "/api/me")
        assert me["email"] == "solo@other.example", me
        # admin เห็นเหตุการณ์ login_denied
        st, ev = a.json("GET", "/api/admin/events")
        assert any(e["kind"] == "login_denied" for e in ev["events"])
    finally:
        srv.stop()
        fake.shutdown()
    print("test_google: ALL PASS")


def test_google_flow():
    run()


if __name__ == "__main__":
    run()

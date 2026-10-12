# -*- coding: utf-8 -*-
"""ตัวช่วยทดสอบ: เปิด uvicorn จริงเป็น subprocess (ไม่ต้องใช้ httpx/TestClient) + HTTP client ที่จำคุกกี้ได้"""
import http.cookiejar
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


class Server:
    def __init__(self, env, port=None, log_path=None):
        self.port = port or free_port()
        self.base = f"http://127.0.0.1:{self.port}"
        e = {k: v for k, v in os.environ.items() if not k.startswith(("APP_", "GOOGLE_", "ADMIN_", "API_TOKENS", "ALLOW"))}
        e.update(env)
        self.log = open(log_path or os.devnull, "ab")
        self.p = subprocess.Popen([sys.executable, "-m", "uvicorn", "server.app:app", "--port", str(self.port),
                                   "--host", "127.0.0.1"], cwd=str(ROOT), env=e, stdout=self.log, stderr=self.log)
        for _ in range(100):
            try:
                urllib.request.urlopen(self.base + "/api/health", timeout=1).read()
                return
            except Exception:  # noqa: BLE001
                if self.p.poll() is not None:
                    raise RuntimeError("uvicorn exited")
                time.sleep(0.1)
        raise RuntimeError("server did not start")

    def stop(self):
        self.p.terminate()
        try:
            self.p.wait(10)
        except subprocess.TimeoutExpired:
            self.p.kill()
        self.log.close()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


class Client:
    def __init__(self, base, follow=True):
        self.base = base
        self.jar = http.cookiejar.CookieJar()
        h = [urllib.request.HTTPCookieProcessor(self.jar)]
        if not follow:
            h.append(NoRedirect())
        self.op = urllib.request.build_opener(*h)

    def req(self, method, path, data=None, headers=None, form=None):
        hd = dict(headers or {})
        body = None
        if form is not None:
            body = urllib.parse.urlencode(form).encode()
            hd["Content-Type"] = "application/x-www-form-urlencoded"
        elif data is not None:
            body = data if isinstance(data, bytes) else json.dumps(data).encode()
            hd["Content-Type"] = "application/json"
        url = path if path.startswith("http") else self.base + path
        r = urllib.request.Request(url, data=body, method=method, headers=hd)
        try:
            with self.op.open(r, timeout=30) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read()

    def json(self, method, path, **kw):
        st, h, b = self.req(method, path, **kw)
        try:
            return st, json.loads(b.decode("utf-8"))
        except ValueError:
            return st, b

    def login(self, username, password):
        return self.req("POST", "/login", form={"username": username, "password": password})

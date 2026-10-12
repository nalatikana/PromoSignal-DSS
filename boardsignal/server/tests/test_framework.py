# -*- coding: utf-8 -*-
"""ตรวจทางเลือก FastAPI ↔ Starlette ของ build_app()
FastAPI ติดตั้งในเครื่องทดสอบไม่ได้ จึงใช้โมดูล fastapi "จำลอง" (subclass ของ Starlette ที่รับพารามิเตอร์ชุดเดียวกับ FastAPI)
เพื่อทดสอบแค่ว่าเส้นทางโค้ดเลือกถูก — ไม่ได้ทดสอบ FastAPI ตัวจริง"""
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STUB_OK = '''
from starlette.applications import Starlette
class FastAPI(Starlette):
    def __init__(self, *, title=None, version=None, routes=None, middleware=None, exception_handlers=None,
                 docs_url="/docs", redoc_url="/redoc", openapi_url="/openapi.json", **kw):
        assert docs_url is None and redoc_url is None and openapi_url is None
        super().__init__(routes=routes, middleware=middleware, exception_handlers=exception_handlers)
'''
STUB_BAD = "class FastAPI:\n    def __init__(self, **kw):\n        raise TypeError('boom')\n"
CHECK = ("import server.app as a, sys; r=[x.path for x in a.app.routes]; "
         "assert '/api/v1/companies/{ticker}' in r and '/auth/google/callback' in r; print(a.FRAMEWORK)")


def run_with(stub, extra=None):
    d = Path(tempfile.mkdtemp())
    if stub:
        (d / "fastapi").mkdir()
        (d / "fastapi" / "__init__.py").write_text(stub)
    env = {"PATH": "/usr/bin:/bin", "PYTHONPATH": str(d), "APP_PASSWORD": "x", "SECRET_KEY": "x", "DB_PATH": str(d / "x.db")}
    env.update(extra or {})
    p = subprocess.run([sys.executable, "-c", CHECK], cwd=str(ROOT), env=env, capture_output=True, text=True)
    assert p.returncode == 0, p.stderr[-800:]
    return p.stdout.strip().splitlines()[-1], p.stderr


def test_framework_selection():
    fw, _ = run_with(STUB_OK)
    assert fw == "fastapi", fw
    fw, err = run_with(STUB_BAD)
    assert fw == "starlette" and "TypeError" in err, (fw, err[-300:])
    fw, _ = run_with(STUB_OK, {"OIS_FRAMEWORK": "starlette"})
    assert fw == "starlette"
    fw, _ = run_with(None)
    assert fw in ("starlette", "fastapi")
    print("test_framework_selection: PASS")


if __name__ == "__main__":
    test_framework_selection()

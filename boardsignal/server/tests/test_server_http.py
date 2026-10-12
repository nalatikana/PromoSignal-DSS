# -*- coding: utf-8 -*-
"""ทดสอบเซิร์ฟเวอร์จริงผ่าน HTTP: ฐานข้อมูลกลาง, สิทธิ์ผู้ดูแล, CSV, /api/v1, openapi, การเก็บข้อมูลข้ามการรีสตาร์ต
รัน:  python3 server/tests/test_server_http.py      (หรือ python3 -m pytest server/tests ถ้ามี pytest)"""
import csv
import io
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from server.tests._util import Client, Server  # noqa: E402

TOKEN = "tok_test_0123456789abcdef"


def env_for(db):
    return {"APP_USERS": "admin:adminpw,alice:alicepw", "APP_PASSWORD": "test", "ADMIN_USER": "admin",
            "SECRET_KEY": "test-secret", "DB_PATH": db, "API_TOKENS": TOKEN + ",short"}


def test_all():
    tmp = Path(tempfile.mkdtemp())
    db = str(tmp / "ois.db")
    srv = Server(env_for(db), log_path=tmp / "srv.log")
    try:
        base = srv.base
        anon = Client(base)
        st, _ = anon.json("POST", "/api/responses", data={"kind": "survey", "payload": {}})
        assert st == 401, st
        # ---- ผู้ใช้ทั่วไป
        alice = Client(base)
        st, h, b = alice.login("alice", "alicepw")
        assert st == 200 and b"OIS_SERVER" in b, (st, b[:200])
        st, me = alice.json("GET", "/api/me")
        assert st == 200 and me["role"] == "user" and me["provider"] == "password" and me["name"] == "alice", me
        st, r = alice.json("POST", "/api/responses", data={"kind": "survey", "ticker": "gulf",
                                                            "payload": {"sus1": 4, "sus2": 2, "tam_pu1": 6, "note": "ใช้ง่าย", "nested": {"a": 1}}})
        assert st == 200 and r["ok"] and r["id"] > 0, r
        st, r = alice.json("POST", "/api/responses", data={"kind": "rfq", "payload": {"p1": 5, "formula": "=cmd|' /C calc'!A0"}})
        assert st == 200, r
        st, r = alice.json("POST", "/api/responses", data={"kind": "dict", "payload": {"name": "พจนานุกรม A", "n_words": 120, "words": ["a", "b"], "text": "ลับ"}})
        assert st == 200, r
        st, r = alice.json("POST", "/api/responses", data={"kind": "hack", "payload": {}})
        assert st == 400, r
        st, r = alice.json("POST", "/api/responses", data={"kind": "survey", "payload": "x"})
        assert st == 400, r
        st, r = alice.json("POST", "/api/responses", data={"kind": "survey", "payload": {"x": "a" * 70000}})
        assert st == 413, (st, r)
        st, r = alice.json("POST", "/api/responses", data={"kind": "survey", "payload": {}},
                           headers={"Origin": "http://evil.example"})
        assert st == 403, (st, r)
        st, mine = alice.json("GET", "/api/responses/mine?kind=survey")
        assert st == 200 and len(mine["items"]) == 1 and mine["items"][0]["ticker"] == "GULF", mine
        assert mine["items"][0]["payload"]["note"] == "ใช้ง่าย"
        st, mine = alice.json("GET", "/api/responses/mine?kind=dict")
        assert "words" not in mine["items"][0]["payload"] and "text" not in mine["items"][0]["payload"], mine
        assert mine["items"][0]["payload"]["n_words"] == 120
        for path in ("/api/admin/summary", "/api/admin/users", "/api/admin/responses?format=csv", "/api/admin/backup", "/api/openapi.json"):
            st, _, _ = alice.req("GET", path)
            assert st in (403, 401), (path, st)
        # ---- ผู้ดูแล
        adm = Client(base)
        adm.login("admin", "adminpw")
        st, me = adm.json("GET", "/api/me")
        assert me["role"] == "admin", me
        st, sm = adm.json("GET", "/api/admin/summary")
        assert st == 200 and sm["responses"]["survey"]["total"] == 1 and sm["responses"]["rfq"]["total"] == 1 and sm["users"] >= 2, sm
        st, us = adm.json("GET", "/api/admin/users")
        assert any(u["email"] == "pw:alice" and u["n_responses"] == 3 for u in us["users"]), us
        st, h, b = adm.req("GET", "/api/admin/responses?kind=survey&format=csv")
        assert st == 200 and h["content-type"].startswith("text/csv") and b.startswith("﻿".encode()), h
        rows = list(csv.DictReader(io.StringIO(b.decode("utf-8-sig"))))
        assert rows[0]["payload.sus1"] == "4" and rows[0]["payload.note"] == "ใช้ง่าย" and rows[0]["email"] == "pw:alice", rows
        assert json.loads(rows[0]["payload.nested"]) == {"a": 1}
        st, h, b = adm.req("GET", "/api/admin/responses?kind=rfq&format=csv")
        rows = list(csv.DictReader(io.StringIO(b.decode("utf-8-sig"))))
        assert rows[0]["payload.formula"].startswith("'="), rows          # กัน formula injection
        st, js = adm.json("GET", "/api/admin/responses?format=json")
        assert js["n"] == 3
        st, h, b = adm.req("GET", "/api/admin/backup")
        assert st == 200 and b[:15] == b"SQLite format 3", b[:20]
        st, spec = adm.json("GET", "/api/openapi.json")
        assert st == 200 and spec["openapi"].startswith("3.1") and "/api/v1/companies/{ticker}" in spec["paths"]
        # ---- /api/v1
        api = Client(base)
        st, r = api.json("GET", "/api/v1/companies")
        assert st == 401, r
        st, r = api.json("GET", "/api/v1/companies", headers={"Authorization": "Bearer wrong-token-xxxxxxxx"})
        assert st == 401, r
        st, r = api.json("GET", "/api/v1/companies", headers={"Authorization": "Bearer short"})
        assert st == 401, r                                               # token สั้นเกินถูกตัดทิ้ง
        H = {"Authorization": "Bearer " + TOKEN}
        st, r = api.json("GET", "/api/v1/companies", headers=H)
        assert st == 200 and len(r["companies"]) == 196, (st, len(r.get("companies", [])))
        st, r = api.json("GET", "/api/v1/companies?industry=3", headers=H)
        assert st == 200 and r["companies"] and all(c["industry_id"] == 3 for c in r["companies"])
        st, c = api.json("GET", "/api/v1/companies/gulf", headers=H)
        assert st == 200 and c["ticker"] == "GULF" and c["quadrant"] in "ABCD" and c["regime"] == "PASS", c
        assert isinstance(c["ois"], float) and len(c["band90"]) == 2 and c["status_message"]
        dumped = json.dumps(c)
        for bad in ("cP", "cF", "cW", "\"amp\"", "\"B\"", "par", "chol", "3.7251", "0.21057"):
            assert bad not in dumped, bad                                  # ไม่มีค่าภายใน/สัมประสิทธิ์
        st, q = api.json("GET", "/api/v1/companies/GULF/board-questions?usecase=credit", headers=H)
        assert st == 200 and len(q["questions"]) == 3 and q["usecase"] == "credit", q
        st, q = api.json("GET", "/api/v1/companies/GULF/board-questions?usecase=xx", headers=H)
        assert st == 400
        st, q = api.json("GET", "/api/v1/companies/NOPE", headers=H)
        assert st == 404
        st, spec = api.json("GET", "/api/openapi.json", headers=H)
        assert st == 200
        st, r = alice.json("GET", "/api/v1/companies/GULF")                 # session ก็ใช้ได้
        assert st == 200
        # LLM: provider ไม่ถูกต้อง → 400 · ไม่มี key → 503
        st, r = alice.json("POST", "/api/llm", data={"task": "board_brief", "payload": {}, "provider": "x"})
        assert st == 400, r
        st, r = alice.json("POST", "/api/llm", data={"task": "board_brief", "payload": {}, "provider": "openai"})
        assert st == 503, r
        st, ev = adm.json("GET", "/api/admin/events?limit=500")
        kinds = {e["kind"] for e in ev["events"]}
        assert {"login", "submit", "api_v1", "admin_export"} <= kinds, kinds
    finally:
        srv.stop()
    # ---- รีสตาร์ตแล้วข้อมูลยังอยู่
    srv = Server(env_for(db), log_path=tmp / "srv2.log")
    try:
        adm = Client(srv.base)
        adm.login("admin", "adminpw")
        st, sm = adm.json("GET", "/api/admin/summary")
        assert sm["responses_total"] == 3 and sm["responses"]["survey"]["total"] == 1, sm
        alice = Client(srv.base)
        alice.login("alice", "alicepw")
        st, mine = alice.json("GET", "/api/responses/mine")
        assert len(mine["items"]) == 3, mine
    finally:
        srv.stop()
    print("test_server_http: ALL PASS")


def test_startup_requires_auth():
    import subprocess
    from server.tests._util import ROOT
    env = {"PATH": "/usr/bin:/bin", "SECRET_KEY": "x", "DB_PATH": tempfile.mkdtemp() + "/x.db"}
    p = subprocess.run([sys.executable, "-c", "import server.app"], cwd=str(ROOT), env=env, capture_output=True, text=True)
    assert p.returncode != 0 and "APP_PASSWORD" in (p.stderr + p.stdout)
    env.update(GOOGLE_CLIENT_ID="cid", GOOGLE_CLIENT_SECRET="sec")       # Google อย่างเดียวก็เริ่มได้
    p = subprocess.run([sys.executable, "-c", "import server.app"], cwd=str(ROOT), env=env, capture_output=True, text=True)
    assert p.returncode == 0, p.stderr[-500:]
    print("test_startup_requires_auth: PASS")


if __name__ == "__main__":
    test_startup_requires_auth()
    test_all()

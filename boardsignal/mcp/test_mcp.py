# -*- coding: utf-8 -*-
"""ทดสอบ MCP server: เปิดเซิร์ฟเวอร์ OpenInnoScore (uvicorn) ชั่วคราว แล้วเรียก ois_mcp.py ผ่าน stdio
รัน (จากโฟลเดอร์ที่มี server/):  python3 mcp/test_mcp.py
หรือทดสอบกับเซิร์ฟเวอร์ที่รันอยู่แล้ว:  OIS_URL=http://127.0.0.1:8765 OIS_TOKEN=... python3 mcp/test_mcp.py"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))


class Mcp:
    def __init__(self, env):
        self.p = subprocess.Popen([sys.executable, str(HERE / "ois_mcp.py")], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                  env=dict(os.environ, **env), text=True, encoding="utf-8")
        self.n = 0

    def call(self, method, params=None, note=False):
        msg = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            msg["params"] = params
        if not note:
            self.n += 1
            msg["id"] = self.n
        self.p.stdin.write(json.dumps(msg) + "\n")
        self.p.stdin.flush()
        if note:
            return None
        r = json.loads(self.p.stdout.readline())
        assert r["id"] == self.n, r
        return r

    def close(self):
        self.p.stdin.close()
        self.p.wait(10)


def run(url, token):
    m = Mcp({"OIS_URL": url, "OIS_TOKEN": token})
    try:
        r = m.call("initialize", {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "t", "version": "0"}})
        assert r["result"]["protocolVersion"] == "2025-06-18" and "tools" in r["result"]["capabilities"], r
        m.call("notifications/initialized", note=True)
        assert m.call("ping")["result"] == {}
        tools = m.call("tools/list")["result"]["tools"]
        names = {t["name"] for t in tools}
        assert names == {"list_companies", "get_company_signal", "get_board_questions", "draft_561_outline"}, names
        assert all("outputs only" in t["description"] for t in tools)
        r = m.call("tools/call", {"name": "list_companies", "arguments": {"industry": "3"}})["result"]
        assert not r["isError"] and r["structuredContent"]["companies"], r
        r = m.call("tools/call", {"name": "get_company_signal", "arguments": {"ticker": "GULF"}})["result"]
        assert not r["isError"], r
        sc = r["structuredContent"]
        assert sc["ticker"] == "GULF" and sc["quadrant"] in "ABCD" and sc["status_message"] and len(sc["wording_rules"]) == 8, sc
        for bad in ("cP", "\"amp\"", "chol", "3.7251"):
            assert bad not in r["content"][0]["text"], bad
        r = m.call("tools/call", {"name": "get_board_questions", "arguments": {"ticker": "GULF", "usecase": "investor"}})["result"]
        assert len(r["structuredContent"]["questions"]) == 3
        r = m.call("tools/call", {"name": "draft_561_outline", "arguments": {"ticker": "GULF", "actions": [
            {"action": "อนุมัตินโยบายความร่วมมือกับพันธมิตรภายนอก เทียบกับ PTG", "status": "completed", "approved": True, "owner": "คณะกรรมการบริหารความเสี่ยง"},
            {"action": "จัดอบรมกรรมการเรื่องนวัตกรรม ซึ่งทำให้บอร์ดเข้าใจมากขึ้น", "status": "completed", "approved": True},
            {"action": "ศึกษาการลงทุน CVC", "status": "planned", "approved": False},
            {"action": "ตั้งคณะทำงาน", "status": "completed", "approved": False}]}})["result"]
        o = r["structuredContent"]
        acts = o["sections"][2]["bullets"]
        assert len(acts) == 2 and "PTG" not in json.dumps(acts, ensure_ascii=False) and "[บริษัทอื่น]" in acts[0], acts
        assert len(o["excluded_actions"]) == 2 and o["wording_warnings"][0]["causal_words"] == ["ทำให้"], o
        assert any("quadrant" in b for b in o["sections"][1]["bullets"])
        r = m.call("tools/call", {"name": "get_company_signal", "arguments": {"ticker": "NOPE"}})["result"]
        assert r["isError"] and "404" in r["content"][0]["text"], r
        r = m.call("tools/call", {"name": "get_company_signal", "arguments": {}})["result"]
        assert r["isError"]
        assert m.call("nope/method")["error"]["code"] == -32601
    finally:
        m.close()
    # token ผิด → isError ไม่ล้ม
    m = Mcp({"OIS_URL": url, "OIS_TOKEN": "wrong-token-000000000"})
    try:
        m.call("initialize", {"protocolVersion": "2099-01-01"})
        r = m.call("tools/call", {"name": "list_companies", "arguments": {}})["result"]
        assert r["isError"] and "401" in r["content"][0]["text"], r
    finally:
        m.close()
    print("test_mcp: ALL PASS")


def test_mcp():
    if os.environ.get("OIS_URL") and os.environ.get("OIS_TOKEN"):
        return run(os.environ["OIS_URL"], os.environ["OIS_TOKEN"])
    from server.tests._util import Server
    tok = "tok_mcp_test_0123456789"
    srv = Server({"APP_PASSWORD": "x", "SECRET_KEY": "x", "API_TOKENS": tok, "DB_PATH": tempfile.mkdtemp() + "/m.db"})
    try:
        run(srv.base, tok)
    finally:
        srv.stop()


if __name__ == "__main__":
    test_mcp()

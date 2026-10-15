# -*- coding: utf-8 -*-
"""ทดสอบ AI Report Studio (server/report_api.py) กับเซิร์ฟเวอร์ Anthropic จำลองในเครื่อง — ไม่เรียก Claude จริง
รัน:  python3 server/tests/test_report_api.py      (หรือ python3 -m pytest server/tests/test_report_api.py)

ตรวจ: ทะเบียนเทมเพลตฝั่งเซิร์ฟเวอร์ = ฉบับฝังใน src/v2_ai.js · การนับคำ/ตัดคำ/แกะ JSON · preview (กติกาครบ ไม่มีตัวเลขสูตร)
      · generate (cache_control ทั้งสองชั้น · แกะ code fence · เรียงหัวข้อ · ตัดจำนวนคำ · คำเตือนเหตุ-ผล/หัวข้อหาย/key แปลก)
      · 503 เมื่อไม่มี key · 400/401/413 · _scrub ตัด key ที่เป็นสูตรก่อนส่งออก
      · สิทธิ์ตามแผนฝั่งเซิร์ฟเวอร์ (403): Basic ใช้ไม่ได้ · Pro ใช้เทมเพลต Pro · Pro Max ใช้ทุกเทมเพลต (PLAN_SOURCE=server และ client)"""
import http.server
import json
import re
import sys
import tempfile
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from server import report_api as R  # noqa: E402
from server.tests._util import Client, Server, free_port  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SECRETS = ["0.2105", "3.725", "0.420", "-0.984", "0.2640", "4.147", "0.5709", "0.2313", "0.6196", "0.2158", "9.5638"]

PAYLOAD = {
    "company": {"ticker": "PTG", "name": "พีทีจี เอ็นเนอยี", "industry": "ทรัพยากร", "fiscal_year": 2023, "fiscal_year_be": 2566, "in_domain": True},
    "score": {"openinnoscore": 95.9, "band90": [89.3, 98.3], "tier": 1, "tier_uncertain": False, "industry_quartile": "Q1"},
    "quadrant": {"code": "A", "name": "Deliver", "label": "A Amplified drive", "description": "…"},
    "status": {"message": "สัญญาณ open innovation: เด่น", "group_mean_oi": 14.9, "group_n": 151},
    "regime": {"fiscal_year": 2023, "verdict": "PASS", "withhold_reading": False},
    "chips": [], "flags": {"oi_flag": True, "weak_industry": False},
    "board_context": {"female_pct": 20, "family_pct": 0, "political_ties": 1, "avg_tenure_years": 9.5},
    "discussion": {"questions": ["คำถาม 1?"], "evidence_to_check": ["เอกสาร 1"]},
    "use_case": {"id": "board"},
}
LONG = "คณะกรรมการ " * 120
REPLY = {"sections": [
    {"key": "purpose", "heading": "วัตถุประสงค์ของวาระ", "body": "นำเสนอผลการคัดกรองเพื่อหารือ"},
    {"key": "position", "heading": "ตำแหน่งของบริษัท", "body": "OpenInnoScore 95.9 · Tier 1 · quadrant Deliver — บอร์ดชุดนี้ทำให้นวัตกรรมเพิ่มขึ้น"},
    {"key": "limits", "heading": "สิ่งที่ผลนี้บอกได้", "body": LONG},
    {"key": "discussion_points", "heading": "ประเด็นหารือ", "body": "1. คำถาม 1?"},
    {"key": "options", "heading": "ทางเลือก", "body": "- ทางเลือก ก\n- ทางเลือก ข\nคณะกรรมการเป็นผู้ตัดสินใจ"},
    {"key": "bogus", "heading": "x", "body": "x"}], "notes": ["ไม่มีข้อมูลเอกสารเพิ่มเติม"]}


class Fake(http.server.BaseHTTPRequestHandler):
    """Anthropic Messages API จำลอง — เก็บคำขอล่าสุดไว้ตรวจ และตอบข้อความสำเร็จรูป"""
    last = None
    mode = "ok"

    def do_POST(self):  # noqa: N802
        n = int(self.headers.get("content-length") or 0)
        Fake.last = {"path": self.path, "headers": {k.lower(): v for k, v in self.headers.items()}, "body": json.loads(self.rfile.read(n).decode())}
        if Fake.mode == "500":
            self.send_response(500)
            self.end_headers()
            return
        text = "Here is the report:\n```json\n" + json.dumps(REPLY, ensure_ascii=False) + "\n```" if Fake.mode == "ok" else "ขออภัย ไม่สามารถทำได้"
        out = {"id": "msg_fake", "type": "message", "role": "assistant", "model": "claude-fake-1",
               "content": [{"type": "text", "text": text}], "stop_reason": "end_turn",
               "usage": {"input_tokens": 812, "output_tokens": 640, "cache_read_input_tokens": 1500, "cache_creation_input_tokens": 0}}
        b = json.dumps(out, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):
        pass


def start_fake():
    port = free_port()
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), Fake)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{port}"


def test_registry_identical_to_client():
    js = (ROOT / "src" / "v2_ai.js").read_text(encoding="utf-8")
    m = re.search(r"/\*AI_REG_BEGIN\*/(.*?)/\*AI_REG_END\*/", js, re.S)
    assert m, "ไม่พบ AI_REG ใน src/v2_ai.js"
    assert json.loads(m.group(1)) == R.registry(), "ทะเบียนเทมเพลตใน src/v2_ai.js ต่างจาก server/report_templates.json"


def test_registry_shape():
    reg = R.registry()
    assert len(reg["templates"]) >= 8
    ids = [r["id"] for r in reg["system"]["rules"]]
    assert ids[:8] == [f"R{i}" for i in range(1, 9)] and {"F1", "F2", "F3", "F4", "F5", "F6"} <= set(ids)
    for t in reg["templates"]:
        assert {"id", "name_th", "name_en", "audience", "language", "purpose", "sections", "inputs", "rules", "tier"} <= set(t), t["id"]
        assert t["tier"] in ("pro", "max") and t["sections"] and t["inputs"][0] == "company"
        for s in t["sections"]:
            assert R.KEY_RX.match(s["key"]) and 20 <= s["max_words"] <= 800 and s["heading_th"] and s["heading_en"]
    for c in reg["checks"]:
        for p in c["patterns"]:
            re.compile(p, re.I)
    blob = json.dumps(reg, ensure_ascii=False)
    assert not [s for s in SECRETS if s in blob]


def test_words_parse_checks():
    assert R.words("the board 12.5") == 3 and R.words("กรรมการ") == 2
    t, cut = R.truncate("word " * 50, 10)
    assert cut and R.words(t) <= 11 and t.endswith("…")
    o, e = R.parse_output('Sure!\n```json\n{"sections":[{"key":"a","body":"x } y \\" {"}],"notes":[]}\n```\nthanks')
    assert e is None and o["sections"][0]["body"] == 'x } y " {'
    assert R.parse_output("no json here")[0] is None
    tpl = R.template("board_memo")
    w = R.check_text(tpl, {}, PAYLOAD, [{"key": "position", "heading": "h", "body": "ผลนี้ทำให้บริษัทดีขึ้น และมีความน่าจะเป็น 80% · β 0.3725"}])
    kinds = {x["check"] for x in w}
    assert {"causal", "probability", "coefficient"} <= kinds, w
    # ถ้อยคำปฏิเสธไม่ถูกนับ (เช่น "ไม่ใช่ความน่าจะเป็น") · คำถามที่มี "ควร" ไม่ใช่การชี้นำ
    w = R.check_text(tpl, {}, PAYLOAD, [{"key": "position", "heading": "h", "body": "Deliver — คะแนนนี้ไม่ใช่ความน่าจะเป็น\nบอร์ดควรทบทวนหรือไม่?"}])
    assert not [x for x in w if x["check"] in ("probability", "directive")], w
    # ชื่อ peer หลุดในเทมเพลตที่ต้องปิดชื่อ
    w = R.check_text(R.template("peer_note"), {}, PAYLOAD, [{"key": "comparison", "heading": "h", "body": "PTG เทียบ PTT และ BCP"}])
    assert any(x["check"] == "peer_name" and "BCP" in x["msg"] for x in w), w
    # 56-1: ห้ามอ้างคะแนน
    w = R.check_text(R.template("t561_governance"), {}, {"company": PAYLOAD["company"]}, [{"key": "s7_process", "heading": "h", "body": "บริษัทอยู่ Tier 1 ของ OpenInnoScore"}])
    assert any(x["check"] == "score_mention" for x in w), w
    # ระดับรายงาน: R8 / R3
    p2 = dict(PAYLOAD, score=dict(PAYLOAD["score"], tier_uncertain=True), regime={"verdict": "FAIL"})
    w = R.check_text(tpl, {}, p2, [{"key": "position", "heading": "h", "body": "Deliver"}])
    assert {"R8", "R3"} <= {x["check"] for x in w}, w


def test_assembly_overrides():
    tpl = R.template("board_memo")
    ov, e = R._clean_overrides(tpl, {"sections": [{"key": "only_one", "heading_th": "หัวข้อเดียว", "heading_en": "One", "instruction": "Do X", "max_words": 50}], "anonymise": False})
    assert e is None
    pr = R.assemble(tpl, "EN", "plain", ov, PAYLOAD)
    assert 'key="only_one" · heading="One" · max_words=50' in pr["system"][1] and "Output language: English" in pr["system"][1]
    assert "may be named" in pr["system"][1] and "Plain language" in pr["system"][1]
    assert R._clean_overrides(tpl, {"sections": [{"key": "Bad Key", "max_words": 50}]})[1]
    assert R._clean_overrides(tpl, {"sections": [{"key": "a", "max_words": 5}]})[1]
    # 56-1 ปิดชื่อ peer เสมอ
    assert "anonymised" in R.template_text(R.template("t561_governance"), "TH", "formal", {"anonymise": False})


def test_http():
    tmp = Path(tempfile.mkdtemp())
    httpd, fake = start_fake()
    base_env = {"APP_PASSWORD": "test", "SECRET_KEY": "s", "DB_PATH": str(tmp / "a.db"), "DEFAULT_PLAN": "pro"}
    srv = Server(dict(base_env, ANTHROPIC_API_KEY="dummy-key", ANTHROPIC_BASE_URL=fake, ANTHROPIC_MODEL="claude-test",
                      OPENAI_API_KEY=""), log_path=tmp / "srv.log")
    try:
        anon = Client(srv.base)
        st, _ = anon.json("GET", "/api/report/templates")
        assert st == 401
        c = Client(srv.base)
        st, _, _ = c.login("", "test")
        assert st == 200, st
        st, t = c.json("GET", "/api/report/templates")
        assert st == 200 and t["enabled"] and t["provider"] == "anthropic" and t["model"] == "claude-test" and len(t["templates"]) >= 8, t
        body = {"template_id": "board_memo", "payload": PAYLOAD, "lang": "TH"}
        # preview: ไม่เรียก AI · มีกติกาครบ · ไม่มีตัวเลขของสูตร
        Fake.last = None
        st, pv = c.json("POST", "/api/report/preview", data=body)
        assert st == 200 and Fake.last is None, (st, pv)
        sysa = pv["system"][0]
        assert all(f"R{i} — " in sysa for i in range(1, 9)) and "F4 — " in sysa and "OUTPUT CONTRACT" in sysa
        assert "TEMPLATE board_memo" in pv["system"][1] and '"ticker": "PTG"' in pv["user"]
        assert pv == dict(pv, system=R.assemble(R.template("board_memo"), "TH", "formal", {}, PAYLOAD)["system"])
        allp = "\n".join(pv["system"]) + pv["user"]
        assert not [s for s in SECRETS if s in allp]
        # generate
        st, g = c.json("POST", "/api/report/generate", data=dict(body, payload=dict(PAYLOAD, par={"b1": 1}, chol=[1])))
        assert st == 200, (st, g)
        req = Fake.last
        assert req["path"] == "/v1/messages" and req["headers"].get("x-api-key") == "dummy-key"
        assert req["headers"].get("anthropic-version") == "2023-06-01"
        sb = req["body"]["system"]
        assert len(sb) == 2 and all(b["cache_control"] == {"type": "ephemeral"} for b in sb), sb
        assert req["body"]["model"] == "claude-test" and '"par"' not in req["body"]["messages"][0]["content"]
        assert '"chol"' not in req["body"]["messages"][0]["content"]
        keys = [s["key"] for s in g["sections"]]
        assert keys == [s["key"] for s in R.template("board_memo")["sections"]], keys
        w = {(x["section"], x["check"]) for x in g["warnings"]}
        assert ("position", "causal") in w and ("limits", "max_words") in w and ("next_info", "missing") in w, w
        assert (None, "unknown_key") in w, w
        lim = next(s for s in g["sections"] if s["key"] == "limits")
        assert R.words(lim["body"]) <= 121 and lim["body"].endswith("…")
        assert g["usage"] == {"input_tokens": 812, "output_tokens": 640, "cache_read": 1500, "cache_write": 0}
        assert g["model"] == "claude-fake-1" and g["provider"] == "anthropic" and g["notes"] == ["ไม่มีข้อมูลเอกสารเพิ่มเติม"]
        # regenerate one section
        st, g1 = c.json("POST", "/api/report/generate", data=dict(body, section="position"))
        assert st == 200 and [s["key"] for s in g1["sections"]] == ["position"] and 'key "position"' in Fake.last["body"]["messages"][0]["content"]
        # overrides ผ่านเข้า template block
        ov = {"sections": [{"key": "purpose", "heading_th": "วัตถุประสงค์ใหม่", "heading_en": "P", "instruction": "Short", "max_words": 40}]}
        st, pv2 = c.json("POST", "/api/report/preview", data=dict(body, overrides=ov))
        assert st == 200 and "วัตถุประสงค์ใหม่" in pv2["system"][1] and "max_words=40" in pv2["system"][1]
        # ข้อผิดพลาด
        assert c.json("POST", "/api/report/generate", data=dict(body, template_id="nope"))[0] == 400
        assert c.json("POST", "/api/report/generate", data=dict(body, section="nope"))[0] == 400
        assert c.json("POST", "/api/report/preview", data=dict(body, overrides={"sections": [{"key": "x", "max_words": 2}]}))[0] == 400
        assert c.json("POST", "/api/report/generate", data=dict(body, payload={"company": {}, "x": "ก" * 12000}))[0] == 413
        assert c.json("POST", "/api/report/generate", data=dict(body, payload=[1]))[0] == 400
        assert c.json("POST", "/api/report/generate", data=body, headers={"Origin": "http://evil.example"})[0] == 403
        Fake.mode = "bad"
        st, e = c.json("POST", "/api/report/generate", data=body)
        assert st == 502 and "raw" in e, (st, e)
        Fake.mode = "500"
        st, e = c.json("POST", "/api/report/generate", data=body)
        assert st == 502 and "500" in e["error"], (st, e)
        Fake.mode = "ok"
        log = (tmp / "srv.log").read_text(encoding="utf-8", errors="ignore")
        assert "template=board_memo" in log and "คณะกรรมการ คณะ" not in log
    finally:
        srv.stop()
    # ไม่มี key → 503 · preview ยังใช้ได้
    srv = Server(dict(base_env, DB_PATH=str(tmp / "b.db"), ANTHROPIC_API_KEY="", OPENAI_API_KEY=""), log_path=tmp / "srv2.log")
    try:
        c = Client(srv.base)
        c.login("", "test")
        st, t = c.json("GET", "/api/report/templates")
        assert st == 200 and t["enabled"] is False and t["provider"] is None
        st, e = c.json("POST", "/api/report/generate", data={"template_id": "diagnostic", "payload": PAYLOAD})
        assert st == 503 and e["enabled"] is False, (st, e)
        assert c.json("POST", "/api/report/preview", data={"template_id": "diagnostic", "payload": PAYLOAD})[0] == 200
    finally:
        srv.stop()
        httpd.shutdown()


def test_plan_helpers():
    assert R.tpl_plan(R.template("bank_rm")) == "max" and R.tpl_plan(R.template("investor_questions")) == "max"
    assert all(R.tpl_plan(t) == "pro" for t in R.registry()["templates"] if t["id"] not in ("bank_rm", "investor_questions"))


def test_plan_enforcement():
    """บังคับสิทธิ์ฝั่งเซิร์ฟเวอร์ — หน้าเว็บล็อกแล้วก็จริง แต่คำขอตรงถึง /api/report/* ต้องถูกปฏิเสธด้วย 403"""
    tmp = Path(tempfile.mkdtemp())
    httpd, fake = start_fake()
    env = {"APP_USERS": "alice:alicepw", "ADMIN_USER": "admin", "ADMIN_PASSWORD": "adminpw", "APP_PASSWORD": "test", "SECRET_KEY": "s",
           "ANTHROPIC_API_KEY": "dummy-key", "ANTHROPIC_BASE_URL": fake, "ANTHROPIC_MODEL": "claude-test", "OPENAI_API_KEY": ""}
    pro = {"template_id": "board_memo", "payload": PAYLOAD, "lang": "TH"}
    mx = dict(pro, template_id="bank_rm")
    # (1) PLAN_SOURCE=server (ค่าเริ่มต้น) — แผนของบัญชีที่ผู้ดูแลตั้ง
    srv = Server(dict(env, DB_PATH=str(tmp / "p.db")), log_path=tmp / "p.log")
    try:
        adm, al = Client(srv.base), Client(srv.base)
        assert adm.login("admin", "adminpw")[0] == 200 and al.login("alice", "alicepw")[0] == 200
        st, users = adm.json("GET", "/api/admin/users")
        uid = next(u["id"] for u in users["users"] if "alice" in str(u.get("email")) + str(u.get("name")))
        Fake.last = None
        st, e = al.json("POST", "/api/report/generate", data=pro)
        assert st == 403 and e.get("need") == "pro" and Fake.last is None, (st, e)          # Basic → 403 ไม่เรียก AI
        assert al.json("POST", "/api/report/preview", data=pro)[0] == 403
        assert al.json("GET", "/api/report/templates")[0] == 200                                # ทะเบียนอ่านได้ (อยู่ในหน้าเว็บอยู่แล้ว)
        assert adm.json("POST", f"/api/admin/users/{uid}/plan", data={"plan": "pro"})[0] == 200
        assert al.json("POST", "/api/report/generate", data=pro)[0] == 200                     # Pro → เทมเพลต Pro ได้
        Fake.last = None
        st, e = al.json("POST", "/api/report/generate", data=mx)
        assert st == 403 and e.get("need") == "max" and Fake.last is None, (st, e)          # Pro → Pro Max 403
        st, e = al.json("POST", "/api/report/generate", data=dict(mx, template_id="investor_questions"))
        assert st == 403, (st, e)
        assert al.json("POST", "/api/report/preview", data=mx)[0] == 200                       # preview ต้องการแค่ Pro (ไม่เรียก AI)
        # header ที่ไคลเอนต์ปลอมขึ้นไม่มีผลในโหมด server
        assert al.json("POST", "/api/report/generate", data=mx, headers={"X-OIS-Plan": "max"})[0] == 403
        assert adm.json("POST", f"/api/admin/users/{uid}/plan", data={"plan": "max"})[0] == 200
        st, g = al.json("POST", "/api/report/generate", data=mx)
        assert st == 200 and g["template_id"] == "bank_rm", (st, g)                              # Pro Max → ได้
        assert adm.json("POST", f"/api/admin/users/{uid}/plan", data={"plan": "free"})[0] == 200
        assert adm.json("POST", "/api/report/generate", data=mx)[0] == 200                      # ผู้ดูแลผ่านทุกระดับ
        assert al.json("POST", "/api/report/generate", data=pro)[0] == 403
    finally:
        srv.stop()
    # (2) PLAN_SOURCE=client — แผนที่ไคลเอนต์ประกาศใน header X-OIS-Plan (ช่วงทดสอบผู้ใช้/สาธิต)
    srv = Server(dict(env, DB_PATH=str(tmp / "c.db"), PLAN_SOURCE="client"), log_path=tmp / "c.log")
    try:
        c = Client(srv.base)
        assert c.login("alice", "alicepw")[0] == 200
        assert c.json("POST", "/api/report/generate", data=pro)[0] == 403                     # ไม่มี header = Basic
        assert c.json("POST", "/api/report/generate", data=pro, headers={"X-OIS-Plan": "free"})[0] == 403
        assert c.json("POST", "/api/report/generate", data=pro, headers={"X-OIS-Plan": "pro"})[0] == 200
        st, e = c.json("POST", "/api/report/generate", data=mx, headers={"X-OIS-Plan": "pro"})
        assert st == 403, (st, e)
        assert c.json("POST", "/api/report/generate", data=mx, headers={"X-OIS-Plan": "max"})[0] == 200
    finally:
        srv.stop()
        httpd.shutdown()


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("ok", name)
    print("ALL OK")

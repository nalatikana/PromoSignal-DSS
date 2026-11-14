# -*- coding: utf-8 -*-
"""ทดสอบ /api/score (DP6 — ผลลัพธ์ระดับเปอร์เซ็นไทล์เท่านั้น · รับเฉพาะ ticker/fem_count/bsize/ten/variant) ·
/api/amp, /api/band ปิดแล้ว (410) · การค้นแบบแบ่งครึ่งรุ่นเดิมทำไม่ได้ (test_probe_blocked) ·
ตรวจการคำนวณรายบริษัท (ผู้ดูแลเท่านั้น) · แผนผู้ใช้ฝั่งเซิร์ฟเวอร์ · การนับกลุ่ม A/B
รัน:  python3 server/tests/test_score_api.py      (หรือ python3 -m pytest server/tests)"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from server.tests._util import Client, Server  # noqa: E402
from server import ois_engine as E  # noqa: E402

RAW_KEYS = {"amp", "cP", "cF", "cG", "cW", "B", "ampT1", "mean", "cut", "par"}


def test_engine_parity():
    """ค่าที่ Engine ส่งออกของ 196 บริษัทตรงกับค่าในบันทึก (co) และค่าที่ firm_display ฝังในไฟล์ฉบับเซิร์ฟเวอร์"""
    m = E.load_model()
    eng = E.Engine(m, E.load_comps())
    n = 0
    for c in E.load_comps():
        o = m["co"].get(c["t"])
        if not o:
            continue
        r = eng.score_record({"promo": c["promo"], "fam": c["fam"], "pol": c["pol"], "fem": c["fem"], "ten": c["ten"],
                       "ind": c["ind"], "full": 1})
        d = eng.firm_display(c)
        assert r["ois"] == d["ois"] == E.r1(o["ois"]), (c["t"], r["ois"], o["ois"])
        assert r["tier"] == o["tier"] and r["quad"] == o["quad"] and r["oisInd"] == d["oisInd"]
        assert r["ap"] == d["ap"] and r["dp"] == d["dp"] and r["t1"] == d["t1"] and r["full"]["ois"] == d["full"]["ois"]
        assert not (RAW_KEYS & set(r)) and "feq0" not in r, set(r)
        n += 1
    assert n == 196, n
    tr = eng.trace("PTG")
    assert tr["check"]["match"] and tr["record"].startswith(m["version"] + "#")
    print("test_engine_parity: PASS", n, "บริษัท")


def test_score_http():
    tmp = Path(tempfile.mkdtemp())
    srv = Server({"APP_USERS": "alice:alicepw", "APP_PASSWORD": "test", "ADMIN_USER": "admin", "ADMIN_PASSWORD": "adminpw",
                  "SECRET_KEY": "t", "DB_PATH": str(tmp / "ois.db"), "API_ITEMS_PER_DAY": "150"}, log_path=tmp / "srv.log")
    try:
        anon = Client(srv.base)
        st, _ = anon.json("POST", "/api/score", data={"items": [{"ticker": "PTG"}]})
        assert st == 401
        alice = Client(srv.base)
        alice.login("alice", "alicepw")
        st, r = alice.json("POST", "/api/score", data={"items": [
            {"ticker": "PTG"}, {"ticker": "ptg", "fem_count": 3, "bsize": 11, "ten": 9.5, "variant": "full"},
            {"ticker": "PTG", "fem_count": 99, "bsize": 400}]})
        assert st == 200, (st, r)
        own, a, clamped = r["items"]
        assert r["record"].startswith("REF928")
        assert own["ois"] == 95.9 and own["band"] == [88.6, 98.0], own                  # ค่าจริง = ค่าในไฟล์ (ช่วงจาก STATA edit9)
        assert isinstance(a["ap"], int) and isinstance(a["dp"], int) and a["ois"] == round(a["ois"], 1)
        assert a["tier"] in (1, 2, 3, 4) and a["quad"] in "ABCD" and len(a["band"]) == 2 and "oisInd" in a and "full" in a
        assert set(a) <= {"ois", "ipi", "tier", "quad", "ap", "dp", "oisInd", "iip", "t1", "band", "full"}, set(a)
        assert clamped["ap"] >= a["ap"]                                                   # 99/400 → บีบเป็น 25/25
        for it in r["items"]:
            assert not (RAW_KEYS & set(it)) and not ({"csg", "asg", "clip"} & set(it)), it
        dumped = json.dumps(r)
        for bad in ("0.5709", "0.2313", "0.6196", "0.2159", "0.1037", "0.6127", "3.7247", "0.21044", "0.64257"):
            assert bad not in dumped, bad
        # ค่าป้อนรุ่นเดิม (promo/fam/pol/fem/od/"mean"/{pct}) และบริษัทที่ไม่มี → 400
        for bad in ({"promo": 0.5, "fem": .3}, {"ticker": "PTG", "promo": 0.5}, {"ticker": "PTG", "fam": .2},
                    {"ticker": "PTG", "pol": 0}, {"ticker": "PTG", "fem": .3}, {"od": {"fem": .3, "fam": .1}},
                    {"ticker": "NOPE"}, {"ticker": "PTG", "fem_count": 2}, {"ticker": "PTG", "variant": "t1"},
                    {"ticker": "PTG", "fem_count": True, "bsize": 10}):
            st, rr = alice.json("POST", "/api/score", data={"items": [bad]})
            assert st == 400, (bad, st, rr)
        st, r = alice.json("POST", "/api/score", data={"items": [{"ticker": "PTG"}] * 65})
        assert st == 400
        # โหมดนอกกลุ่มอ้างอิง: endpoint แยก · ปัดก่อนจัดอันดับ (fam = 0 → ≈ 14 ไม่ใช่ 0)
        st, od = alice.json("POST", "/api/outdomain", data={"fem_count": 0, "fam_count": 0, "bsize": 12})
        assert st == 200 and od == {"femP": 4, "famP": 14}, od
        # โควตารายวัน (ตั้งไว้ 150 ในการทดสอบ — นับต่อบัญชีและต่อ IP)
        st, r = alice.json("POST", "/api/score", data={"items": [{"ticker": "PTG", "fem_count": i % 6, "bsize": 12} for i in range(64)]})
        assert st == 200
        st, r = alice.json("POST", "/api/score", data={"items": [{"ticker": "PTG"}] * 64})
        st, r = alice.json("POST", "/api/score", data={"items": [{"ticker": "PTG"}] * 64})
        assert st == 429, (st, r)
        # รุ่นเก่าปิดแล้ว
        for path in ("/api/amp", "/api/band"):
            st, r = alice.json("POST", path, data={"items": [{"fem": .3, "promo": .5}]})
            assert st == 410, (path, st)
        # trace / plan เฉพาะผู้ดูแล
        st, _ = alice.json("GET", "/api/admin/trace/PTG")
        assert st == 403
        st, me = alice.json("GET", "/api/me")
        assert me["plan"] == "free" and me["record"].startswith("REF928"), me
        adm = Client(srv.base)
        adm.login("admin", "adminpw")
        st, tr = adm.json("GET", "/api/admin/trace/ptg")
        assert st == 200 and tr["ticker"] == "PTG" and tr["check"]["match"], tr
        assert tr["steps"][3]["p"]["dW"] > 0 and "mean" in tr["steps"][2]["p"]
        st, _ = adm.json("GET", "/api/admin/trace/NOPE")
        assert st == 404
        st, us = adm.json("GET", "/api/admin/users")
        uid = next(u["id"] for u in us["users"] if u["email"] == "pw:alice")
        assert next(u for u in us["users"] if u["id"] == uid)["plan"] == "free"
        st, r = adm.json("POST", f"/api/admin/users/{uid}/plan", data={"plan": "max"})
        assert st == 200 and r["plan"] == "max", r
        st, r = adm.json("POST", f"/api/admin/users/{uid}/plan", data={"plan": "gold"})
        assert st == 400
        st, r = alice.json("POST", f"/api/admin/users/{uid}/plan", data={"plan": "max"})
        assert st == 403
        st, me = alice.json("GET", "/api/me")
        assert me["plan"] == "max", me
        # A/B: เซิร์ฟเวอร์จัดกลุ่มและเก็บถาวรต่อบัญชี · แถว survey ที่ส่งปลอมไม่เพิ่มตัวนับ และ arm ถูกแทนด้วยกลุ่มของเซิร์ฟเวอร์
        st, arms = alice.json("GET", "/api/survey/arms")
        assert st == 200 and arms["arm"] == "grid" and arms["grid"] == 1 and arms["table"] == 0, arms
        for _ in range(5):
            alice.json("POST", "/api/responses", data={"kind": "survey", "payload": {"arm": "table", "sus": {}, "tam": {}}})
        st, arms2 = alice.json("GET", "/api/survey/arms")
        assert arms2["grid"] == 1 and arms2["table"] == 0 and arms2["arm"] == "grid", arms2
        st, mine = alice.json("GET", "/api/responses/mine?kind=survey")
        p0 = mine["items"][0]["payload"]
        assert p0["arm"] == "grid" and p0["arm_src"] == "server" and p0["arm_client"] == "table", p0
        st, arms3 = adm.json("GET", "/api/survey/arms")
        assert arms3["arm"] == "table" and arms3["grid"] == 1 and arms3["table"] == 1, arms3   # ผู้ใช้ถัดไปได้กลุ่มที่น้อยกว่า
        st, ev = adm.json("GET", "/api/admin/events?limit=500")
        kinds = {e["kind"] for e in ev["events"]}
        assert {"score", "score_quota", "admin_trace", "admin_plan", "survey_arm"} <= kinds, kinds
        st, h = alice.json("GET", "/api/integrations")
        assert h["db"] is True
    finally:
        srv.stop()
    print("test_score_http: ALL PASS")


def test_probe_blocked():
    """การโจมตีแบบเดิม (ภาคผนวก ง ใหม่-2): ค้นแบบแบ่งครึ่งบน promo ผ่านเครื่องหมาย csg / ธง clip เพื่อหาค่าเฉลี่ย centring
    และจุดตัด p95 ของ P — ตอนนี้ (1) ส่ง promo ไม่ได้ (400) (2) ผลไม่มี csg/asg/clip (3) ค่าป้อนที่ส่งได้อยู่บนกริดหยาบ
    (fem = k/b, b 5–25 · ten ทีละ 0.5) จึงไม่มีตัวแปรต่อเนื่องให้แบ่งครึ่ง · (4) CEO Promotion Focus ของทุกคำขอคือค่าของบริษัท
    ทดสอบระดับ Engine (ไม่ต้องเปิดเซิร์ฟเวอร์) ด้วยคำขอเดียวกับที่ endpoint ใช้"""
    m = E.load_model()
    eng = E.Engine(m, E.load_comps(), kr=False)
    # (1) พยายามส่ง promo / fam / pol / fem ต่อเนื่อง → ปฏิเสธทุกแบบ
    for k, v in (("promo", 0.57), ("promo", {"pct": 50}), ("fam", 0.23), ("pol", 1), ("fem", 0.2158), ("ind", 3), ("band", 1)):
        try:
            eng.score_public({"ticker": "PTG", k: v})
            raise AssertionError(f"รับคีย์ {k}")
        except ValueError:
            pass
    # (2) bisection บนตัวแปรเดียวที่ปรับได้ (fem_count/bsize) — ผลแต่ละจุดไม่มีเครื่องหมาย/ธง และค่าป้อนจริงเป็นจำนวนจำกัด
    seen, distinct_fem = set(), set()
    for bs in range(1, 40):
        for fc in range(-3, bs + 4):
            r = eng.score_public({"ticker": "PTG", "fem_count": fc, "bsize": bs})
            assert not ({"csg", "asg", "clip", "amp", "cP", "B"} & set(r)), r
            seen.add(json.dumps(r, sort_keys=True))
            distinct_fem.add((min(max(fc, 0), min(max(bs, 5), 25)), min(max(bs, 5), 25)))
    fracs = {round(k / b, 12) for k, b in distinct_fem}
    assert len(fracs) <= 201, len(fracs)                 # กริด k/b (b 5–25) = ลำดับ Farey F25 ≤ 201 สัดส่วน — ไม่ใช่ตัวแปรต่อเนื่อง
    # (3) ค่าเฉลี่ย centring ของ P ไม่อยู่ในพื้นที่ที่ถามได้: ทุกคำขอของ PTG ใช้ dp ของ PTG เท่ากันหมด
    dps = {json.loads(x)["dp"] for x in seen}
    assert dps == {eng.firm_display(dict(eng.comps["PTG"], t="PTG"))["dp"]}, dps
    # (4) ten บนกริด 0.5 และบีบเข้า 0–40
    _, _, ten, _, _, _ = eng.public_inputs({"ticker": "PTG", "ten": 9.26})
    assert ten == 9.5
    _, _, ten, _, _, _ = eng.public_inputs({"ticker": "PTG", "ten": 1e6})
    assert ten == 40.0
    print("test_probe_blocked: PASS ·", len(seen), "ผลลัพธ์ต่างกันจาก", len(fracs), "สัดส่วนบนกริด")


LEAK = ("0.5709", "0.2313", "0.6196", "0.2158", "0.2159", "3.7247", "0.21044", "0.98469", "0.42043", "0.64257", "0.1037", "0.6127")
PUBLIC_RAW = {"cP", "amp", "B", "_raw", "par", "mean", "cut", "chol", "seW"}


def _walk_keys(x, acc):
    if isinstance(x, dict):
        for k, v in x.items():
            acc.add(k)
            _walk_keys(v, acc)
    elif isinstance(x, list):
        for v in x:
            _walk_keys(v, acc)
    return acc


def test_mvp_http():
    """POST /api/mvp/score_firm · /api/mvp/whatif (MVP 1 · edit9): ค่าตามกรณีทดสอบ · guardrails · allow-list · ไม่มีค่าดิบ"""
    tmp = Path(tempfile.mkdtemp())
    srv = Server({"APP_USERS": "bob:bobpw", "ADMIN_USER": "admin", "ADMIN_PASSWORD": "adminpw", "SECRET_KEY": "t",
                  "DB_PATH": str(tmp / "ois.db")}, log_path=tmp / "srv.log")
    try:
        anon = Client(srv.base)
        st, _ = anon.json("POST", "/api/mvp/score_firm", data={"promotion": .72})
        assert st == 401
        bob = Client(srv.base)
        bob.login("bob", "bobpw")
        cc = {"promotion": .72, "family_share": .25, "political_ties": 0, "industry": 5, "fiscal_year": 2024}
        st, r = bob.json("POST", "/api/mvp/score_firm", data=dict(cc, women=2, board_size=9))
        assert st == 200 and r["ok"] and r["version"] == "REF928-edit9-20261013", r
        assert (r["X"], r["Y"], r["quad"], r["ois"], r["tier"], r["tier_uncertain"]) == (68.1, 31.6, "B", 45.3, 3, True), r
        assert (r["t1"]["Y"], r["t1"]["quad"], r["t1"]["ois"], r["t1"]["chip"]) == (62.4, "A", 67.1, "CAUTION"), r["t1"]
        assert r["fyStatus"]["code"] == "NYV" and r["added_to_REF928"] is False
        st, w = bob.json("POST", "/api/mvp/whatif", data={"base": cc, "board_size": 9, "women_now": 2, "women_target": 3})
        assert st == 200 and w["ok"] and not w["withheld"], w
        assert w["multiplier"] == 1.064 and w["multiplier_band90"] == [1.045, 1.082] and w["W_star"] == 0.234, w
        assert w["W_star_headcount"] == 3 and w["W_star_T1"] == 0.159 and w["sim"]["quad"] == "A" and w["sim"]["ois"] == 73.2
        st, k = bob.json("POST", "/api/mvp/whatif", data={"base": {"promotion": .85, "family_share": .3, "political_ties": 0,
                         "industry": 6, "fiscal_year": 2023}, "board_size": 10, "women_now": 1, "women_target": 3})
        assert k["multiplier"] == 1.231 and k["multiplier_band90"] == [1.161, 1.306] and k["sim"]["quad"] == "A", k
        assert "23% more" in k["sentence_en"] and "16%–31%" in k["sentence_en"], k["sentence_en"]
        st, b = bob.json("POST", "/api/mvp/whatif", data={"base": "BTS", "board_size": 11, "women_now": 2, "women_target": 3})
        assert st == 200 and b["withheld"] and b["multiplier"] is None and b["sim"]["ois"] is None and b["sim"]["Y"] > b["cur"]["Y"], b
        assert b["message_en"] == "Score change withheld (G3) — board-amplification movement only"
        st, t = bob.json("POST", "/api/mvp/whatif", data={"base": "TSTH", "board_size": 8, "women_now": 1, "women_target": 2})
        assert t["W_star"] == 0.168 and t["W_star_headcount"] == 2, t
        st, d4 = bob.json("POST", "/api/mvp/whatif", data={"base": "TSTH", "women_now": 1, "women_target": 2})
        assert st == 200 and d4["ok"] is False and d4["error"] == "board_size_required", d4
        st, g2 = bob.json("POST", "/api/mvp/whatif", data={"base": cc, "board_size": 9, "women_now": 2, "women_target": 1})
        assert g2["ok"] is False and g2["error"].startswith("G2"), g2
        st, g4 = bob.json("POST", "/api/mvp/whatif", data={"base": cc, "board_size": 9, "women_now": 2, "women_target": 5})
        assert g4["ok"] is False and g4["error"].startswith("G4"), g4
        st, g5 = bob.json("POST", "/api/mvp/whatif", data={"base": dict(cc, fiscal_year=2565), "board_size": 9, "women_now": 2,
                          "women_target": 3})
        assert g5["suspended"] and g5["sim"] is None and g5["fyStatus"]["code"] == "FAIL" and g5["multiplier"] is None, g5
        st, fin = bob.json("POST", "/api/mvp/score_firm", data=dict(cc, industry=8, female_share=.2))
        assert st == 200 and fin["ok"] is False and fin["provides"] == "board_profile", fin
        for bad in ({"promotion": .7, "amp": 1}, dict(cc, female_share=2), dict(cc, female_share=.2, political_ties=3), [1, 2]):
            st, rr = bob.json("POST", "/api/mvp/score_firm", data=bad)
            assert st == 400 and rr["ok"] is False, (bad, st, rr)
        st, rr = bob.json("POST", "/api/mvp/whatif", data={"base": cc, "board_size": 9, "women_now": 2, "women_target": 3, "x": 1})
        assert st == 400
        for out in (r, w, k, b, t):
            keys = _walk_keys(out, set())
            assert not (PUBLIC_RAW & keys), PUBLIC_RAW & keys
            dumped = json.dumps(out)
            for bad in LEAK:
                assert bad not in dumped, bad
        st, ev = Client(srv.base).json("GET", "/api/health")
        assert ev["record"].startswith("REF928-edit9-20261013#")
    finally:
        srv.stop()
    print("test_mvp_http: ALL PASS")


if __name__ == "__main__":
    test_engine_parity()
    test_mvp_http()
    test_probe_blocked()
    test_score_http()

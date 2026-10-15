# -*- coding: utf-8 -*-
"""ทดสอบ server/data_api.py: สถิติ validity (เทียบตัวคำนวณอ้างอิงแบบตรงไปตรงมาที่เขียนในไฟล์นี้ ไม่ใช้ scipy),
การทำซ้ำตารางที่ 3 ของบทความจากไฟล์อ้างอิง (ถ้ามีในเครื่อง) และเซิร์ฟเวอร์จริง (แยกข้อมูลผู้ใช้ · อนุมัติ · สิทธิ์ผู้ดูแล · ไฟล์อ้างอิง)
รัน:  python3 server/tests/test_data_api.py      (หรือ python3 -m pytest server/tests/test_data_api.py)"""
import json
import math
import random
import sys
import tempfile
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from server import data_api as D  # noqa: E402
from server.tests._util import Client, Server  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
REF_CSV = ROOT / "ref" / "REF928_scored_20261005.csv"


# ============================================================================ ตัวคำนวณอ้างอิง (ตรงไปตรงมา ช้าแต่ตรวจง่าย)
def naive_ranks(x):
    """อันดับเฉลี่ย = จำนวนที่น้อยกว่า + (จำนวนที่เท่ากัน + 1) / 2"""
    return [sum(1 for w in x if w < v) + (sum(1 for w in x if w == v) + 1) / 2 for v in x]


def naive_spearman(s, y):
    a, b = naive_ranks(s), naive_ranks(y)
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    cov = sum((p - ma) * (q - mb) for p, q in zip(a, b))
    return cov / math.sqrt(sum((p - ma) ** 2 for p in a) * sum((q - mb) ** 2 for q in b))


def naive_auc(s, lab):
    pos = [v for v, l in zip(s, lab) if l]
    neg = [v for v, l in zip(s, lab) if not l]
    wins = sum(1.0 if p > q else 0.5 if p == q else 0.0 for p in pos for q in neg)
    return wins / (len(pos) * len(neg))


def naive_t_p(rho, n, steps=200000):
    """p สองทางของ t (df = n−2) ด้วยการอินทิเกรตความหนาแน่นแบบ Simpson (ไม่ใช้ incomplete beta)"""
    df = n - 2
    t = abs(rho) * math.sqrt(df / (1 - rho * rho))
    c = math.exp(math.lgamma((df + 1) / 2) - math.lgamma(df / 2)) / math.sqrt(df * math.pi)
    f = lambda x: c * (1 + x * x / df) ** (-(df + 1) / 2)
    h = t / steps
    acc = f(0) + f(t) + sum((4 if i % 2 else 2) * f(i * h) for i in range(1, steps))
    return 2 * (0.5 - acc * h / 3)


def naive_lift(s, y):
    """เดไซล์แบบ xtile เขียนตรงตามคำจำกัดความ: จุดตัด p10…p90 (นิยาม _pctile) · กลุ่ม = จุดตัดแรกที่ค่า ≤ จุดตัด"""
    v = sorted(s)
    n = len(v)

    def pct(p):
        P = n * p / 100
        if P == int(P):
            return (v[int(P) - 1] + v[int(P)]) / 2
        return v[int(P)]
    cuts = [pct(10 * k) for k in range(1, 10)]
    grp = []
    for x in s:
        g = 10
        for k, c in enumerate(cuts, 1):
            if x <= c:
                g = k
                break
        grp.append(g)
    top = [o for o, g in zip(y, grp) if g == 10]
    bot = [o for o, g in zip(y, grp) if g == 1]
    return (sum(top) / len(top)) / (sum(bot) / len(bot))


def naive_hm(a, n1, n0):
    q1, q2 = a / (2 - a), 2 * a * a / (1 + a)
    return math.sqrt((a * (1 - a) + (n1 - 1) * (q1 - a * a) + (n0 - 1) * (q2 - a * a)) / (n1 * n0))


def _data(seed, n, ties=True):
    rnd = random.Random(seed)
    s = [round(rnd.gauss(0, 1), 1 if ties else 6) for _ in range(n)]
    y = [max(0, int(round(2 + 1.5 * v + rnd.gauss(0, 2)))) for v in s]
    return s, y


# ============================================================================ 1 · สถิติ
def test_statistics_against_naive():
    for seed, n in ((1, 40), (2, 157), (3, 209), (4, 61)):
        s, y = _data(seed, n)
        st = D.validity_stats(s, y)
        assert abs(st["sp"] - naive_spearman(s, y)) < 1e-12, (seed, st["sp"])
        lab, cut = D.top_tercile(y)
        assert abs(st["auc"] - naive_auc(s, lab)) < 1e-12
        assert abs(st["se"] - naive_hm(st["auc"], sum(lab), n - sum(lab))) < 1e-12
        assert abs(st["lift"] - naive_lift(s, y)) < 1e-12
        assert abs(st["p"] - naive_t_p(st["sp"], n)) < 1e-6, (st["p"], naive_t_p(st["sp"], n))
        assert st["ci"][0] < st["auc"] < st["ci"][1]
    # กรณีชัดเจน
    s = list(range(30))
    st = D.validity_stats(s, [v * 2 for v in s])
    assert st["sp"] == 1.0 and st["p"] == 0.0 and st["auc"] == 1.0
    assert D.spearman([1, 2, 3, 4], [1, 1, 1, 1]) == (None, None)
    # นิยามเปอร์เซ็นไทล์แบบ Stata
    assert D.pctile_stata([1, 2, 3, 4], 50) == 2.5 and D.pctile_stata([1, 2, 3, 4, 5], 50) == 3
    assert D.pctile_stata(list(range(1, 11)), 66.667) == 7


def test_verdict_rule():
    assert D.verdict(.311, .686, 4.39) == "PASS"
    assert D.verdict(.120, .590, 1.66) == "CAUTION"
    assert D.verdict(-.003, .494, 1.34) == "FAIL"
    assert D.verdict(.15, .60, 2.0) == "PASS"           # ขอบเกณฑ์ผ่าน
    assert D.verdict(.05, .55, 1.3) == "CAUTION"        # ขอบเกณฑ์ระวัง
    assert D.verdict(.2, .7, 1.29) == "FAIL"            # ข้อเดียวต่ำกว่าระวัง → FAIL


def test_word_counter_matches_js_rule():
    assert D.count_words("We will grow and expand") == 5
    assert D.count_words("ก" * 9) == 2                  # 9/5 = 1.8 → 2 คำ (Math.round)
    assert D.count_words("ก" * 12) == 2                 # 12/5 = 2.4 → 2 คำ
    assert D.count_words("") == 0 and D.count_words("  \n") == 0
    assert D.count_words("ปี 2566 รายได้ 1,234 ล้านบาท — growth") == 3 + 3   # ไทย 15 อักขระ → 3 · "2566" "1,234" "growth" (ไม่นับ "—")


def test_reproduce_paper_table3():
    """ถ้ามีไฟล์อ้างอิงในเครื่อง: ρ / AUC / lift รายปีและรวม ต้องตรงตารางที่ 3 ภายใน ±0.005 และ verdict ต้องตรง"""
    if not REF_CSV.exists():
        print("SKIP reproduce: ไม่มี", REF_CSV)
        return
    ref = D.load_ref(REF_CSV)
    assert len(ref) == 928
    v = D.compute_validity(ref, [])
    assert v["source"] == "ref_csv"
    rows = v["years"] + [v["pooled_ref"]]
    for r in rows:
        pp = D.PAPER.get(r["fy"]) if r["fy"] != "pooled" else D.PAPER_POOLED
        assert r["n"] == pp["n"], (r["fy"], r["n"])
        for k in ("sp", "auc", "lift"):
            assert abs(r[k] - pp[k]) <= 0.005, (r["fy"], k, r[k], pp[k])
        assert r["v"] == pp["v"], (r["fy"], r["v"])
        assert r["match"]["ok"]
        print(f"  reproduce {r['fy']}: rho {r['sp']:.4f} ({pp['sp']}) auc {r['auc']:.4f} ({pp['auc']}) lift {r['lift']:.3f} ({pp['lift']}) "
              f"p {r['p_txt']} ({pp['p']}) HM-CI [{r['ci'][0]:.3f}, {r['ci'][1]:.3f}] vs DeLong {pp['ci']} {r['v']}")


def test_compute_validity_new_years():
    recs = []
    rnd = random.Random(9)
    for i in range(34):
        b = rnd.gauss(0, .2)
        recs.append({"fy": 2025, "payload": {"oi_next": max(0, int(5 + 20 * b + rnd.gauss(0, 2)))}, "score": {"_B": b}})
    for i in range(5):
        recs.append({"fy": 2024, "payload": {"oi_next": 3}, "score": {"_B": .1 * i}})
    recs.append({"fy": 2024, "payload": {"oi_next": None}, "score": {"_B": .3}})
    v = D.compute_validity(None, recs)
    by = {r["fy"]: r for r in v["years"]}
    assert by[2019]["src"] == "paper" and by[2019]["sp"] == .311
    assert by[2024]["insufficient"] and by[2024]["n"] == 5
    assert by[2025]["n"] == 34 and by[2025]["sp"] is not None and by[2025]["v"] in ("PASS", "CAUTION", "FAIL")
    assert v["pooled_all"]["n"] == 39 and v["n_new_with_outcome"] == 39


# ============================================================================ 2 · เซิร์ฟเวอร์จริง
LONG = " ".join(["We will grow innovate and expand into new markets while we protect safety"] * 160)   # 2,080 คำ
SHORT = " ".join(["We will grow"] * 100)


def rec(ticker="PTG", fy=2024, text=LONG, **kw):
    b = {"ticker": ticker, "fy": fy, "bsize": 12, "nfem": 3, "nfam": 2, "pol": 1, "ten": 8.5,
         "ceo": {"filename": "ceo.txt", "text": text, "dp": 70, "pro": 10, "pre": 5}, "oi_next": 6,
         "r561": {"filename": "one_report.pdf", "size": 123456, "pages": 210, "sha256": "ab" * 32}}
    b.update(kw)
    return b


def raw_post(cl, path, body, headers):
    """POST แบบกำหนด Content-Type เอง (Client.req ของ _util บังคับเป็น application/json เมื่อส่ง bytes)"""
    import urllib.error
    import urllib.request
    r = urllib.request.Request(cl.base + path, data=body, method="POST", headers=headers)
    try:
        with cl.op.open(r, timeout=30) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def multipart(field, filename, data):
    bd = "----ois" + uuid.uuid4().hex
    body = (f"--{bd}\r\nContent-Disposition: form-data; name=\"{field}\"; filename=\"{filename}\"\r\n"
            f"Content-Type: text/csv\r\n\r\n").encode() + data + f"\r\n--{bd}--\r\n".encode()
    return body, {"Content-Type": "multipart/form-data; boundary=" + bd}


def test_server_isolation_and_approval():
    tmp = Path(tempfile.mkdtemp())
    db = str(tmp / "ois.db")
    srv = Server({"APP_USERS": "a:x,b:y,c:z", "ADMIN_USER": "a", "ADMIN_PASSWORD": "x", "APP_PASSWORD": "pw-test", "SECRET_KEY": "k",
                  "DB_PATH": db}, log_path=tmp / "srv.log")
    try:
        A, B, C = Client(srv.base), Client(srv.base), Client(srv.base)
        A.login("a", "x"); B.login("b", "y"); C.login("c", "z")
        anon = Client(srv.base)
        st, _ = anon.json("GET", "/api/data/records")
        assert st == 401
        # ---- ตรวจค่าป้อน
        st, r = B.json("POST", "/api/data/records", data=rec(text=SHORT))
        assert st == 400 and "2,000" in r["error"], r
        st, r = B.json("POST", "/api/data/records", data=rec(ceo={"filename": "ceo.pdf", "text": LONG, "dp": 50}))
        assert st == 400 and ".txt" in r["error"], r
        st, r = B.json("POST", "/api/data/records", data=rec(nfem=13))
        assert st == 400, r
        st, r = B.json("POST", "/api/data/records", data=rec(r561={"filename": "x.docx"}))
        assert st == 400, r
        # ---- B ส่ง → รออนุมัติ เห็นเฉพาะ B
        st, r = B.json("POST", "/api/data/records", data=rec())
        assert st == 200 and r["record"]["status"] == "pending", r
        b_id = r["record"]["id"]
        sc = r["record"]["score"]
        assert 0 <= sc["ois"] <= 100 and sc["tier"] in (1, 2, 3, 4) and sc["quad"] in "ABCD" and sc["promo_src"] == "lexicon"
        assert sc["regime"] is None and sc["frozen"] is True
        assert "_B" not in sc and "text" not in r["record"]["payload"]["ceo"]
        assert r["record"]["payload"]["ceo"]["words"] >= 2000
        st, r = B.json("POST", "/api/data/records", data=rec(fy=2025, liwc=0.9))
        assert st == 200 and r["record"]["score"]["promo_src"] == "liwc"
        b2 = r["record"]["id"]
        st, mine = B.json("GET", "/api/data/records?mine=1")
        assert {x["id"] for x in mine["items"]} == {b_id, b2}
        st, other = C.json("GET", "/api/data/records")
        assert st == 200 and not other["items"], other           # C ไม่เห็นรายการรออนุมัติของ B
        # ---- สิทธิ์ดูประวัติ (Basic): ไม่ได้ประกาศบริษัทของตน → 403 · ประกาศ PTG → ตรึง · เปลี่ยน header ภายหลังไม่ได้ผล
        st, h = C.json("GET", "/api/data/history?ticker=PTG")
        assert st == 403 and h.get("locked"), h
        st, h = C.json("GET", "/api/data/history?ticker=PTG", headers={"X-OIS-Own": "PTG"})
        assert st == 200 and not h["records"] and h["access"] == "own", h
        st, h = C.json("GET", "/api/data/history?ticker=GULF", headers={"X-OIS-Own": "GULF"})
        assert st == 403 and h["own"] == "PTG", h                 # บริษัทของตนถูกตรึงไว้ที่ค่าแรก
        st, h = C.json("GET", "/api/data/history?ticker=PTG")
        assert st == 200, h                                       # ตรึงแล้ว ไม่ต้องส่ง header ซ้ำ
        st, h = B.json("GET", "/api/data/history?ticker=PTG")
        assert st == 200 and len(h["records"]) == 2 and h["access"] == "uploaded", h   # บริษัทที่ตนส่งข้อมูลเอง
        st, h = B.json("GET", "/api/data/history?ticker=GULF")
        assert st == 403, h
        st, h = A.json("GET", "/api/data/history?ticker=GULF")
        assert st == 200 and h["access"] == "admin", h
        # ---- validity / re-freeze เป็นสิทธิ์ Pro (เหมือนตารางหลักของหน้า valid)
        for path in ("/api/data/validity", "/api/data/refreeze"):
            st, r = C.json("GET", path)
            assert st == 403 and r.get("locked"), (path, r)
        # ---- สิทธิ์ผู้ดูแล
        for path in ("/api/data/pending", "/api/data/log"):
            st, _ = C.json("GET", path)
            assert st == 403, path
        st, _ = C.json("POST", f"/api/data/records/{b_id}/approve", data={"comment": "x"})
        assert st == 403
        st, _ = B.json("POST", f"/api/data/records/{b_id}/approve", data={"comment": "self"})
        assert st == 403                                          # เจ้าของอนุมัติเองไม่ได้
        body, hd = multipart("file", "ref.csv", b"ticker,year\n1,2")
        st, _ = raw_post(C, "/api/data/reference", body, hd)
        assert st == 403
        st, _ = C.json("POST", "/api/data/refreeze", data={"comment": "x"})
        assert st == 403
        # ---- ผู้ดูแลตรวจ
        st, p = A.json("GET", "/api/data/pending")
        assert st == 200 and len(p["items"]) == 2, p
        it = [x for x in p["items"] if x["id"] == b_id][0]
        assert it["owner"] == "b" and any(c["k"].startswith("สาร CEO") and c["ok"] == "ok" for c in it["checks"])
        assert any(c["k"] == "ลำดับปีบัญชี" and c["ok"] == "ok" for c in it["checks"]), it["checks"]   # ต่อจาก 2566 (ชุดปัจจุบัน)
        assert it["prev"] and it["prev"]["fy"] == 2023 and it["payload"]["ceo"].get("preview")
        st, r = A.json("POST", f"/api/data/records/{b2}/reject", data={})
        assert st == 400                                          # ไม่อนุมัติต้องมีเหตุผล
        st, r = A.json("POST", f"/api/data/records/{b2}/reject", data={"comment": "ไม่มีเอกสาร LIWC"})
        assert st == 200 and r["status"] == "rejected"
        st, r = A.json("POST", f"/api/data/records/{b_id}/approve", data={"comment": "ตรวจกับ 56-1 แล้ว"})
        assert st == 200 and r["status"] == "approved" and r["validity_computed"], r
        st, r = A.json("POST", f"/api/data/records/{b_id}/approve", data={})
        assert st == 409
        # ---- อนุมัติแล้ว → ทุกคนเห็น · ไม่อนุมัติ → เห็นเฉพาะเจ้าของ
        st, other = C.json("GET", "/api/data/records")
        assert [x["id"] for x in other["items"]] == [b_id] and other["items"][0]["owner"] is None, other
        assert other["items"][0]["review_comment"] is None
        st, h = C.json("GET", "/api/data/history?ticker=PTG")
        assert [x["status"] for x in h["records"]] == ["approved"]
        st, mine = B.json("GET", "/api/data/records?mine=1")
        rj = [x for x in mine["items"] if x["id"] == b2][0]
        assert rj["status"] == "rejected" and rj["review_comment"] == "ไม่มีเอกสาร LIWC"
        st, lg = A.json("GET", "/api/data/log")
        acts = [(x["action"], x["actor_label"]) for x in lg["log"]]
        assert ("approve", "a") in acts and ("reject", "a") in acts and ("submit", "b") in acts, acts
        assert any(x["action"] == "own_declare" and x["comment"] == "PTG" for x in lg["log"]), lg["log"][:5]
        # ---- ผู้ดูแลตั้ง B และ C เป็น Pro → ดู validity และประวัติทุกบริษัทได้
        st, us = A.json("GET", "/api/admin/users")
        for nm in ("b", "c"):
            uid = next(u["id"] for u in us["users"] if u["email"] == "pw:" + nm)
            st, r = A.json("POST", f"/api/admin/users/{uid}/plan", data={"plan": "pro"})
            assert st == 200, r
        st, h = B.json("GET", "/api/data/history?ticker=GULF")
        assert st == 200 and h["access"] == "plan", h
        # ---- validity: ยังไม่มีไฟล์อ้างอิง → ค่าตามบทความ · ปี 2024 n = 1 → ข้อมูลไม่พอ
        st, v = C.json("GET", "/api/data/validity")
        assert v["source"] == "paper" and v["n_approved"] == 1
        y24 = [y for y in v["years"] if y["fy"] == 2024][0]
        assert y24["insufficient"] and y24["n"] == 1
        frozen0 = v["frozen_reference"]
        # ---- เพิ่ม 32 รายการปี 2026 แล้วอนุมัติ → คำนวณจริง
        st, comps = 0, json.loads((ROOT / "src" / "prof_data.json").read_text(encoding="utf-8"))["comps"]
        ids = []
        rnd = random.Random(5)
        for c in comps[:32]:
            st, r = C.json("POST", "/api/data/records", data=rec(ticker=c["t"], fy=2026, oi_next=int(rnd.random() * 15),
                                                               nfem=min(12, round(c["fem"] * 12)), nfam=min(12, round(c["fam"] * 12)),
                                                               pol=c["pol"], ceo={"filename": "c.txt", "text": LONG, "words": 2100, "dp": c["dp"]}))
            assert st == 200, r
            ids.append(r["record"]["id"])
        for i in ids:
            st, _ = A.json("POST", f"/api/data/records/{i}/approve", data={"comment": "ok"})
            assert st == 200
        st, v = B.json("GET", "/api/data/validity")
        y26 = [y for y in v["years"] if y["fy"] == 2026][0]
        assert y26["n"] == 32 and not y26.get("insufficient") and y26["sp"] is not None and y26["v"], y26
        assert v["frozen_reference"] == frozen0                   # อนุมัติข้อมูลไม่เปลี่ยนฐานอ้างอิงที่ใช้ให้คะแนน
        # ---- ไฟล์อ้างอิง (ผู้ดูแลเท่านั้น) · ผู้ใช้ไม่ได้รับข้อมูลรายแถว
        if REF_CSV.exists():
            raw = REF_CSV.read_bytes()
            body, hd = multipart("file", "REF928_scored.csv", raw)
            st, b = raw_post(A, "/api/data/reference", body, hd)
            up = json.loads(b)
            assert st == 200 and up["n"] == 928 and all(x["match"]["ok"] for x in up["reproduced"]) and up["pooled_match"]["ok"], up
            assert (Path(db).parent / "private" / "REF928_scored.csv").exists()
            st, v = C.json("GET", "/api/data/validity")
            assert v["source"] == "ref_csv" and all(y["match"]["ok"] for y in v["years"] if y["src"] == "ref_csv")
            assert v["frozen_reference"] == frozen0
            st, h = C.json("GET", "/api/data/history?ticker=PTG")
            assert h["reference_present"] and h["research"] and set(h["research"][0]) == {"fy", "ois", "tier", "quad", "regime"}, h
            st, rs = C.json("GET", "/api/data/reference")
            assert rs["present"] and rs["n"] == 928
            # ไม่มีส่วนใดของไฟล์ดิบในคำตอบ: ชื่อคอลัมน์ ชื่อบริษัทภาษาไทย ค่า B_EG / ceo_promotion
            secret_bits = ["open_innov", "B_EG", "ceo_promotion", "loo_EG", "บริษัท ทรู คอร์ปอเรชั่น", ".0509296018289776", ".7319"]
            for cl in (C, B):
                for path in ("/api/data/validity", "/api/data/history?ticker=PTG", "/api/data/history?ticker=1",
                             "/api/data/reference", "/api/data/records"):
                    _, _, body_ = cl.req("GET", path)
                    txt = body_.decode("utf-8")
                    leak = [s for s in secret_bits if s in txt]
                    assert not leak, (path, leak)
            st, b = raw_post(A, "/api/data/reference", b"ticker,year\n1,2019\n", {"Content-Type": "text/csv"})
            assert st == 400                                      # ไฟล์ผิดรูปแบบ ไม่ทับไฟล์เดิม
            st, rs = C.json("GET", "/api/data/reference")
            assert rs["n"] == 928
        # ---- ข้อเสนอ re-freeze: บันทึกเท่านั้น
        st, r = A.json("POST", "/api/data/refreeze", data={"comment": "มีปี 2026 ครบ 32 บริษัท"})
        assert st == 200 and r["applied"] is False
        st, lst = C.json("GET", "/api/data/refreeze")
        assert lst["items"] and json.loads(lst["items"][0]["snapshot"])["applied"] is False
        st, v = C.json("GET", "/api/data/validity")
        assert v["frozen_reference"] == frozen0
        # ---- ถอนรายการของตัวเองได้เฉพาะ pending
        st, r = C.json("POST", "/api/data/records", data=rec(ticker="NEWCO1", fy=2024, ind=3, name="บริษัททดสอบ"))
        assert st == 200 and r["record"]["payload"]["new_ticker"], r
        nid = r["record"]["id"]
        st, _ = B.json("POST", f"/api/data/records/{nid}/withdraw")
        assert st == 404                                          # คนอื่นถอนไม่ได้ (และไม่รู้ว่ามีอยู่)
        st, _ = C.json("POST", f"/api/data/records/{nid}/withdraw")
        assert st == 200
        st, r = C.json("POST", "/api/data/records", data=rec(ticker="NEWCO2", fy=2024))
        assert st == 400                                          # บริษัทใหม่ต้องระบุกลุ่มอุตสาหกรรม
    finally:
        srv.stop()


# ============================================================================ 3 · ไม่เชื่อค่าที่เบราว์เซอร์คำนวณ (จำนวนคำ · ค่าภาษาเชิงรุก)
def _node():
    import shutil
    return shutil.which("node")


def _js_analyser():
    """ดึง countWords / hits / TILT_ANCHOR / tiltToPct / analyseText จาก src/v2_app.js + LEX จาก src/lex.js ให้ node รันตรง ๆ
    countWords.seg = null → ใช้กติกาสำรอง (ไม่มีตัวตัดคำไทย) ซึ่งเป็นกติกาเดียวกับเซิร์ฟเวอร์"""
    app = (ROOT / "src" / "v2_app.js").read_text(encoding="utf-8")
    a = app.index("function countWords(")
    a = app.rindex("\n/**", 0, a) if "ตัวนับคำกลาง" in app[max(0, a - 600):a] else a
    b = app.index("/** ไฮไลต์คำที่นับได้")
    return (ROOT / "src" / "lex.js").read_text(encoding="utf-8") + "\nconst window = {};\n" + app[a:b]


THAI_PRO = "บริษัทมุ่งมั่นเติบโตและขยายตลาดด้วยนวัตกรรม สร้างสรรค์โอกาสใหม่ "
THAI_PRE = "บริษัทบริหารความเสี่ยงอย่างรอบคอบ ป้องกันความเสียหาย ปฏิบัติตามกฎระเบียบ "


def test_lexicon_json_matches_js():
    if not _node():
        print("SKIP test_lexicon_json_matches_js (ไม่มี node)")
        return
    built = D.build_lexicon()
    stored = json.loads(D.LEXICON_PATH.read_text(encoding="utf-8"))
    assert built == stored, "server/lexicon.json ไม่ตรงกับ src/lex.js / TILT_ANCHOR — รัน python3 -m server.data_api --build-lexicon"


def test_analyse_text_parity_with_browser():
    """dp ของเซิร์ฟเวอร์ = analyseText(t).dp ของเบราว์เซอร์ทุกข้อความ (ไทย อังกฤษ ปน ตัวพิมพ์ใหญ่ ไม่มีคำในพจนานุกรม)"""
    if not _node():
        print("SKIP test_analyse_text_parity_with_browser (ไม่มี node)")
        return
    import subprocess
    rnd = random.Random(11)
    texts = [THAI_PRO * 40, THAI_PRE * 40, (THAI_PRO + THAI_PRE * 2) * 30, LONG, LONG.upper(), "ไม่มีคำใดเลย " * 50,
             " ".join(rnd.choice([THAI_PRO, THAI_PRE, "We GROW and protect. ", "risk risk opportunity "]) for _ in range(300))]
    js = _js_analyser() + "\nconst T = JSON.parse(require('fs').readFileSync(0, 'utf8'));" \
        "countWords.seg = null; process.stdout.write(JSON.stringify(T.map(t => { const a = analyseText(t); return [a.dp, a.pro.n, a.pre.n, countWords(t)]; })));"
    out = json.loads(subprocess.run(["node", "-e", js], input=json.dumps(texts).encode(), capture_output=True, check=True).stdout)
    for t, (dp, pro, pre, wc) in zip(texts, out):
        a = D.analyse_text(t)
        assert (a["dp"], a["pro"], a["pre"]) == (dp, pro, pre), (t[:40], a, dp, pro, pre)
        assert D.count_words(t) == wc, (t[:40], D.count_words(t), wc)   # = window.countWords เมื่อไม่มีตัวตัดคำไทย


def test_server_word_rule():
    th = "ก" * 9500                                               # 5 อักขระ/คำ → 1,900 คำ (เบราว์เซอร์ที่ตัดคำได้อาจนับได้มากกว่า)
    assert D.count_words_server(th) == 1900
    base = dict(ticker="PTG", fy=2024, bsize=12, nfem=3, nfam=2, ten=8)
    try:
        D.clean_payload(dict(base, ceo={"filename": "c.txt", "text": th, "words": 2111}))
        raise AssertionError("ควรถูกปฏิเสธ")
    except ValueError as e:
        assert "1,900" in str(e) and "2,111" in str(e), e
    try:                                                          # ไม่ส่งข้อความ (อ้างจำนวนคำเอง) → ปฏิเสธ
        D.clean_payload(dict(base, ceo={"filename": "c.txt", "words": 5000, "dp": 99}))
        raise AssertionError("ควรถูกปฏิเสธ")
    except ValueError as e:
        assert "ข้อความ" in str(e), e
    p = D.clean_payload(dict(base, ceo={"filename": "c.txt", "text": THAI_PRE * 150, "words": 99999, "dp": 99, "pro": 500, "pre": 0}))
    assert p["ceo"]["words"] == D.count_words_server(THAI_PRE * 150) and p["ceo"]["words_client"] == 99999
    assert p["dp"] == p["ceo"]["dp"] == D.analyse_text(THAI_PRE * 150)["dp"] and p["ceo"]["dp_client"] == 99 and p["dp_src"] == "server"
    assert p["ceo"]["pro"] == D.analyse_text(THAI_PRE * 150)["pro"] and p["ceo"]["pro_client"] == 500
    chk = {c["k"]: c for c in D.quality_checks(p, 2023)}
    assert chk["ค่าภาษาเชิงรุกคำนวณซ้ำบนเซิร์ฟเวอร์"]["ok"] == "warn" and "99" in chk["ค่าภาษาเชิงรุกคำนวณซ้ำบนเซิร์ฟเวอร์"]["t"]
    assert "เบราว์เซอร์นับได้ 99,999" in chk["สาร CEO ≥ 2,000 คำ"]["t"]
    # ไม่มี lexicon.json → รับค่าเบราว์เซอร์ แต่ติดธง client-computed, unverified
    saved = D._lex.get("d")
    D._lex["d"] = None
    try:
        q = D.clean_payload(dict(base, ceo={"filename": "c.txt", "text": THAI_PRE * 150, "dp": 61}))
        assert q["dp"] == 61 and q["dp_src"] == "client_unverified"
        chk = {c["k"]: c for c in D.quality_checks(q, 2023)}
        assert "unverified" in chk["ค่าภาษาเชิงรุกคำนวณซ้ำบนเซิร์ฟเวอร์"]["t"]
    finally:
        D._lex["d"] = saved


def test_server_ignores_client_dp_and_words():
    tmp = Path(tempfile.mkdtemp())
    srv = Server({"APP_USERS": "a:x,b:y", "ADMIN_USER": "a", "ADMIN_PASSWORD": "x", "APP_PASSWORD": "pw-test", "SECRET_KEY": "k",
                  "DB_PATH": str(tmp / "ois.db")}, log_path=tmp / "srv.log")
    try:
        B = Client(srv.base)
        B.login("b", "y")
        txt = THAI_PRE * 150
        st, r1 = B.json("POST", "/api/data/records", data=rec(text=txt, ceo={"filename": "c.txt", "text": txt, "dp": 1, "words": 2500}))
        st2, r2 = B.json("POST", "/api/data/records", data=rec(fy=2025, ceo={"filename": "c.txt", "text": txt, "dp": 99, "words": 2500}))
        assert st == 200 and st2 == 200, (r1, r2)
        c1, c2 = r1["record"]["payload"]["ceo"], r2["record"]["payload"]["ceo"]
        assert c1["dp"] == c2["dp"] == D.analyse_text(txt)["dp"] and c1["dp_client"] == 1 and c2["dp_client"] == 99
        assert r1["record"]["score"]["ois"] == r2["record"]["score"]["ois"]              # คะแนนไม่ขึ้นกับ dp ที่เบราว์เซอร์ส่ง
        assert c1["words"] == D.count_words_server(txt) and c1["words_client"] == 2500
        assert round(r1["record"]["score"]["ois"], 1) == r1["record"]["score"]["ois"]     # OIS ทศนิยม 1 ตำแหน่ง (เท่ากับออฟไลน์)
        th = "ก" * 9500
        st, r = B.json("POST", "/api/data/records", data=rec(text=th, ceo={"filename": "c.txt", "text": th, "words": 2111, "dp": 50}))
        assert st == 400 and "1,900" in r["error"], r
        st, r = B.json("POST", "/api/data/records", data=rec(ceo={"filename": "c.txt", "words": 9000, "dp": 50}))
        assert st == 400, r
    finally:
        srv.stop()


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("PASS", name)
    print("ALL PASS")

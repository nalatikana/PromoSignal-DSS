# -*- coding: utf-8 -*-
"""API สาธารณะแบบ "ผลลัพธ์เท่านั้น" สำหรับ AI agent (MCP / Claude Skill / GPT Action)

หลัก DP6 (AIP paper): ชั้นผู้ช่วย (assistance layer) เห็นเฉพาะผลลัพธ์ที่คำนวณแล้ว
  · ไม่มีสัมประสิทธิ์ ไม่มี Cholesky/V̂f ไม่มีค่า amp/B ดิบ ไม่มีค่าป้อนรายแถวของฐานอ้างอิง REF-928
  · ตัวเลขทุกตัวปัด 1 ตำแหน่ง
  · ข้อมูลมาจากผลที่คำนวณไว้ล่วงหน้าใน src/ois_model.json (co) + src/prof_data.json (ชื่อ/อุตสาหกรรม)
  · คำถามหารือ 3 ข้อมาจาก server/questions.json (สกัดจาก src/v2_strategy.js ด้วย server/tools/extract_questions.js)
ถ้อยคำแถบสถานะ (ตารางที่ 10) และป้ายเตือนคัดลอกจาก src/v2_app.js (T10_TEXT / verdictOf) — ถ้าแก้ฝั่งหน้าเว็บให้แก้ที่นี่ด้วย
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

T10_TEXT = {
    "1A": "สัญญาณ open innovation: เด่น",
    "2A": "สัญญาณ open innovation: มี",
    "1C": "ไม่ใช่สัญญาณ open innovation · tier สูงเพราะ CEO ระมัดระวังเข้ากับบอร์ด",
    "2C": "ไม่ใช่สัญญาณ open innovation · tier สูงเพราะ CEO ระมัดระวังเข้ากับบอร์ด",
    "3B": "CEO บุก แต่องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุน (ดูสัดส่วนกรรมการหญิงเทียบฐานอ้างอิง)",
    "4B": "CEO บุก แต่องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุน (ดูสัดส่วนกรรมการหญิงเทียบฐานอ้างอิง)",
    "3D": "บอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุน แต่ภาษาของ CEO ยังไม่สะท้อนการบุก",
    "4D": "บอร์ดอยู่ในรูปแบบที่สัมพันธ์กับการหนุน แต่ภาษาของ CEO ยังไม่สะท้อนการบุก",
}
T10_DEFAULT = "สัญญาณใกล้ศูนย์ — ไม่สรุป (B ≈ 0)"
ZONE_TH = {"A": "Deliver — เปลี่ยนโอกาสเป็นผลลัพธ์", "B": "Discipline — เติบโตอย่างมีหลักเกณฑ์",
           "C": "Develop — ทบทวนฐานความพร้อม", "D": "Discover — เปิดมุมมองโอกาส"}
USECASES = ("board", "credit", "search", "investor")
DISCLAIMER = ("ผลลัพธ์เป็นความสัมพันธ์เชิงสถิติกับฐานอ้างอิง REF-928 (928 firm-years, FY2562–2566) ไม่ใช่เหตุและผล "
              "ไม่ใช่การพยากรณ์ และไม่ใช่หลักฐานประสิทธิผลของคณะกรรมการ · API นี้ส่งเฉพาะผลลัพธ์ ไม่มีสูตรหรือสัมประสิทธิ์")


def r1(x):
    return None if x is None else round(float(x) + 0.0, 1)


class Outputs:
    def __init__(self, root=ROOT):
        m = json.loads((root / "src" / "ois_model.json").read_text(encoding="utf-8"))
        p = json.loads((root / "src" / "prof_data.json").read_text(encoding="utf-8"))
        self.version = m["version"]
        self.tier_cuts = m.get("tierCuts") or [75, 50, 25]
        self.regime = {str(k): v for k, v in (m.get("regime") or {}).items()}
        self.quad_name = m.get("quadName") or {}
        self.zone = m.get("zone") or {}
        self.weak = set(m.get("weakInd") or [1, 2])
        self.t10n = m.get("t10") or {}
        self.ind = {int(k): v for k, v in p["ind"].items()}
        self._co = m["co"]
        self._comps = {c["t"]: c for c in p["comps"] if c["t"] in m["co"]}
        q = root / "server" / "questions.json"
        self.questions = json.loads(q.read_text(encoding="utf-8")) if q.exists() else {"usecases": {}}

    def tier_of(self, o):
        a, b, c = self.tier_cuts
        return 1 if o >= a else 2 if o >= b else 3 if o >= c else 4

    def industries(self):
        return [{"id": k, "name": v, "weak_evidence": k in self.weak} for k, v in sorted(self.ind.items())]

    def companies(self, industry=None):
        out = []
        for t, c in self._comps.items():
            if industry not in (None, "") and str(c["ind"]) != str(industry) and self.ind.get(c["ind"]) != industry:
                continue
            out.append({"ticker": t, "name": c["n"], "industry": self.ind.get(c["ind"]), "industry_id": c["ind"],
                        "fy": self._co[t].get("fy")})
        return sorted(out, key=lambda x: x["ticker"])

    def has(self, ticker):
        return (ticker or "").upper() in self._comps

    def company(self, ticker):
        t = (ticker or "").upper()
        c, o = self._comps.get(t), self._co.get(t)
        if not c or not o:
            return None
        in_domain = c["ind"] in self.ind
        band = [r1(o["band"][0]), r1(o["band"][1])]
        fy = o.get("fy") or 2023
        reg = o.get("regime") or self.regime.get(str(fy))
        tier, quad = o.get("tier"), o.get("quad")
        uncertain = self.tier_of(band[0]) != self.tier_of(band[1])
        weak = c["ind"] in self.weak
        chips = []
        if not in_domain:
            chips.append({"key": "out_of_domain", "label": "นอกกลุ่มอ้างอิง — ไม่แสดง tier", "rule": "R4"})
        if uncertain:
            chips.append({"key": "tier_uncertain", "label": "tier ไม่แน่นอน", "detail": "ช่วง 90% คร่อมมากกว่าหนึ่ง tier", "rule": "R8"})
        if reg == "FAIL":
            chips.append({"key": "fail_year", "label": "Caution: ปีนี้ไม่ผ่านเกณฑ์ validity", "detail": f"ปีบัญชี {fy} verdict = FAIL", "rule": "R3"})
        if not reg:
            chips.append({"key": "not_validated", "label": "ยังไม่ได้ validate", "rule": "R3"})
        if weak:
            chips.append({"key": "weak_industry", "label": "หลักฐานอ่อนในอุตสาหกรรมนี้", "detail": "Spearman ไม่ต่างจากศูนย์ในอุตสาหกรรมนี้", "rule": "R5"})
        if o.get("amp") is not None and o["amp"] <= 0:
            chips.append({"key": "board_not_amplifying", "label": "องค์ประกอบบอร์ดไม่อยู่ในรูปแบบที่สัมพันธ์กับการหนุนสัญญาณ",
                          "detail": "ภาษาเชิงรุกของ CEO ไม่สัมพันธ์กับ open innovation ที่สูงขึ้นในบอร์ดลักษณะนี้"})
        status = T10_TEXT.get(f"{tier}{quad}", T10_DEFAULT)
        fail = reg == "FAIL"
        return {
            "ticker": t, "name": c["n"], "industry": self.ind.get(c["ind"]), "industry_id": c["ind"], "fy": fy,
            "ois": None if fail else r1(o["ois"]),
            "ois_industry": None if fail else r1(o.get("oisInd")),
            "tier": tier if in_domain and not fail else None,
            "tier_uncertain": uncertain,
            "band90": None if fail else band,
            "quadrant": quad,
            "quadrant_name": self.quad_name.get(quad),
            "zone": self.zone.get(quad), "zone_th": ZONE_TH.get(quad),
            "regime": reg, "regime_by_fy": self.regime,
            "flag_oi": bool(in_domain and quad == "A" and band[0] >= 50 and not fail),
            "status_message": status,
            "chips": chips,
            "in_domain": in_domain,
            "weak_industry": weak,
            "withheld": fail,
            "reference": self.version,
            "disclaimer": DISCLAIMER,
        }

    def board_questions(self, ticker, usecase="board"):
        co = self.company(ticker)
        if not co:
            return None
        uc = self.questions.get("usecases", {}).get(usecase)
        if not uc:
            return {"error": "usecase", "allowed": list(USECASES)}
        q = uc["quadrants"].get(co["quadrant"]) or {}
        return {"ticker": co["ticker"], "name": co["name"], "usecase": usecase, "audience": uc.get("audience"),
                "quadrant": co["quadrant"], "zone": co["zone"], "zone_th": co["zone_th"],
                "heading": q.get("head"), "focus": q.get("sub"),
                "what_data_shows": q.get("shows"), "what_cannot_be_concluded": q.get("cannot"),
                "questions": q.get("questions", [])[:3], "evidence_to_check": q.get("evidence", []),
                "ask": q.get("ask"), "ask_label": q.get("ask_label"), "note": uc.get("note"),
                "status_message": co["status_message"], "chips": co["chips"],
                "disclaimer": self.questions.get("disclaimer")}


# ------------------------------------------------------------------ OpenAPI 3.1 (เขียนเอง — ตรงกับ integrations/gpt-action/openapi.yaml)
def openapi_spec(server_url="https://YOUR-SERVICE.onrender.com"):
    comp_props = {
        "ticker": {"type": "string"}, "name": {"type": "string"}, "industry": {"type": "string"},
        "industry_id": {"type": "integer"}, "fy": {"type": "integer"},
        "ois": {"type": ["number", "null"], "description": "OpenInnoScore 0–100 (เปอร์เซ็นไทล์เทียบ REF-928) · null เมื่อปีบัญชี FAIL"},
        "ois_industry": {"type": ["number", "null"]},
        "tier": {"type": ["integer", "null"], "description": "1 (บนสุด)–4 · null เมื่อนอกกลุ่มอ้างอิงหรือปี FAIL"},
        "tier_uncertain": {"type": "boolean"},
        "band90": {"type": ["array", "null"], "items": {"type": "number"}},
        "quadrant": {"type": "string", "enum": ["A", "B", "C", "D"]}, "quadrant_name": {"type": "string"},
        "zone": {"type": "string"}, "zone_th": {"type": "string"},
        "regime": {"type": ["string", "null"], "enum": ["PASS", "CAUTION", "FAIL", None]},
        "flag_oi": {"type": "boolean"}, "status_message": {"type": "string"},
        "chips": {"type": "array", "items": {"type": "object"}},
        "in_domain": {"type": "boolean"}, "weak_industry": {"type": "boolean"}, "withheld": {"type": "boolean"},
        "disclaimer": {"type": "string"},
    }
    return {
        "openapi": "3.1.0",
        "info": {"title": "OpenInnoScore Output API", "version": "1.0.0",
                 "description": "ผลลัพธ์ที่คำนวณแล้วของ OpenInnoScore (Signal B) สำหรับ AI agent — ไม่มีสูตร สัมประสิทธิ์ หรือข้อมูลรายแถวของฐานอ้างอิง"},
        "servers": [{"url": server_url}],
        "components": {
            "securitySchemes": {"bearer": {"type": "http", "scheme": "bearer"}},
            "schemas": {
                "CompanyRef": {"type": "object", "properties": {k: comp_props[k] for k in ("ticker", "name", "industry", "industry_id", "fy")}},
                "Company": {"type": "object", "properties": comp_props},
                "BoardQuestions": {"type": "object", "properties": {
                    "ticker": {"type": "string"}, "usecase": {"type": "string"}, "quadrant": {"type": "string"},
                    "heading": {"type": "string"}, "what_data_shows": {"type": "string"},
                    "what_cannot_be_concluded": {"type": "string"},
                    "questions": {"type": "array", "items": {"type": "string"}, "maxItems": 3},
                    "evidence_to_check": {"type": "array", "items": {"type": "string"}},
                    "ask": {"type": "string"}, "status_message": {"type": "string"}, "disclaimer": {"type": "string"}}},
            },
        },
        "security": [{"bearer": []}],
        "paths": {
            "/api/v1/companies": {"get": {
                "operationId": "listCompanies", "summary": "รายชื่อบริษัทในฐาน (ผลลัพธ์เท่านั้น)",
                "parameters": [{"name": "industry", "in": "query", "required": False, "schema": {"type": "string"},
                                "description": "รหัสอุตสาหกรรม 1–7 หรือชื่อภาษาไทย"}],
                "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {
                    "type": "object", "properties": {"companies": {"type": "array", "items": {"$ref": "#/components/schemas/CompanyRef"}},
                                                     "industries": {"type": "array", "items": {"type": "object"}}}}}}},
                              "401": {"description": "ต้องมี token"}}}},
            "/api/v1/companies/{ticker}": {"get": {
                "operationId": "getCompanySignal", "summary": "สัญญาณ OpenInnoScore ของบริษัท: คะแนน tier ช่วง 90% quadrant สถานะ และป้ายเตือน",
                "parameters": [{"name": "ticker", "in": "path", "required": True, "schema": {"type": "string"}}],
                "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Company"}}}},
                              "404": {"description": "ไม่พบบริษัท"}}}},
            "/api/v1/companies/{ticker}/board-questions": {"get": {
                "operationId": "getBoardQuestions", "summary": "คำถามหารือ 3 ข้อของคณะกรรมการตาม quadrant และ use case",
                "parameters": [{"name": "ticker", "in": "path", "required": True, "schema": {"type": "string"}},
                               {"name": "usecase", "in": "query", "required": False,
                                "schema": {"type": "string", "enum": list(USECASES), "default": "board"}}],
                "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/BoardQuestions"}}}},
                              "404": {"description": "ไม่พบบริษัท"}}}},
        },
    }

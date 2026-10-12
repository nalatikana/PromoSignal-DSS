#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""OpenInnoScore MCP server (stdio, JSON-RPC 2.0) — สำหรับ Claude Desktop / Claude Code

หลักการ: AI เห็นเฉพาะ "ผลลัพธ์ที่คำนวณแล้ว" จาก /api/v1 ของเซิร์ฟเวอร์ OpenInnoScore — ไม่มีสูตร ไม่มีสัมประสิทธิ์
ไม่มีข้อมูลรายแถวของฐานอ้างอิง (AIP paper DP6) · ไฟล์นี้ไม่มีโมเดลอยู่ข้างในเลย

ตัวแปรแวดล้อม
  OIS_URL    URL ของเซิร์ฟเวอร์ เช่น https://openinnoscore.onrender.com
  OIS_TOKEN  token หนึ่งตัวจาก API_TOKENS ของเซิร์ฟเวอร์
ใช้ Python มาตรฐานล้วน (ไม่ต้อง pip install) · Python 3.9+
"""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

SERVER_NAME, SERVER_VERSION = "openinnoscore", "1.0.0"
PROTOCOL = "2025-06-18"
SUPPORTED = ("2025-06-18", "2025-03-26", "2024-11-05")
OUTPUT_ONLY = ("คืนค่าเฉพาะผลลัพธ์ที่คำนวณแล้วของ OpenInnoScore (outputs only) — ไม่มีสูตร สัมประสิทธิ์ "
               "หรือข้อมูลรายแถวของฐานอ้างอิง และ AI ไม่สามารถเข้าถึงอัลกอริทึมได้")

WORDING_RULES = [
    "R1 ห้ามแปลงคะแนนเป็นความน่าจะเป็นหรือการพยากรณ์ (ห้ามเขียน 'มีโอกาส xx%')",
    "R2 แสดง quadrant และข้อความสถานะ (status_message) คู่กับคะแนนทุกครั้ง",
    "R3 ปีบัญชีที่ regime = FAIL: ไม่รายงานคะแนน/tier (withheld) ให้ระบุว่าปีนั้นไม่ผ่านเกณฑ์ validity",
    "R4 บริษัทนอกกลุ่มอ้างอิง (in_domain = false): ไม่แสดง tier",
    "R5 อุตสาหกรรมหลักฐานอ่อน (weak_industry = true): ต้องติดป้าย 'หลักฐานอ่อนในอุตสาหกรรมนี้'",
    "R6 ความเป็นกิจการครอบครัวและความสัมพันธ์ทางการเมือง (family / political ties) อ่านได้อย่างเดียว ห้ามใช้เป็นเหตุผลเชิงบวก",
    "R7 ใช้ถ้อยคำเชิงความสัมพันธ์ ('สัมพันธ์กับ', 'สอดคล้องกับ') ห้ามใช้ 'ทำให้', 'ส่งผลให้', 'การันตี'",
    "R8 ถ้าช่วง 90% คร่อมมากกว่าหนึ่ง tier (tier_uncertain = true) ต้องระบุว่า tier ไม่แน่นอน",
]

TOOLS = [
    {"name": "list_companies",
     "title": "รายชื่อบริษัทใน OpenInnoScore",
     "description": "รายชื่อบริษัทจดทะเบียนในฐาน OpenInnoScore (ticker, ชื่อ, อุตสาหกรรม, ปีบัญชี) กรองตามอุตสาหกรรมได้. " + OUTPUT_ONLY,
     "inputSchema": {"type": "object", "properties": {
         "industry": {"type": "string", "description": "รหัสอุตสาหกรรม 1–7 หรือชื่อภาษาไทย (ไม่บังคับ)"}}},
     "annotations": {"readOnlyHint": True, "openWorldHint": False}},
    {"name": "get_company_signal",
     "title": "สัญญาณ OpenInnoScore ของบริษัท",
     "description": "สัญญาณการกำกับดูแลเชิงนวัตกรรมของบริษัท: OpenInnoScore (0–100), tier, ช่วง 90%, quadrant/zone, "
                    "regime ของปีบัญชี, ข้อความสถานะ (ตารางที่ 10) และป้ายเตือน (chips). " + OUTPUT_ONLY +
                    " ต้องรายงานตามกติกาถ้อยคำ R1–R8 ที่แนบมาในผลลัพธ์",
     "inputSchema": {"type": "object", "required": ["ticker"], "properties": {
         "ticker": {"type": "string", "description": "ชื่อย่อหลักทรัพย์ เช่น GULF"}}},
     "annotations": {"readOnlyHint": True, "openWorldHint": False}},
    {"name": "get_board_questions",
     "title": "คำถามหารือของคณะกรรมการ",
     "description": "คำถามหารือ 3 ข้อ หลักฐานที่ควรตรวจ และสิ่งที่ยังสรุปไม่ได้ ตาม quadrant ของบริษัทและมุมมองผู้ใช้ "
                    "(board = ประเมินบอร์ดตัวเอง, credit = ธนาคาร/สินเชื่อ, search = สรรหากรรมการ, investor = นักลงทุน). " + OUTPUT_ONLY,
     "inputSchema": {"type": "object", "required": ["ticker"], "properties": {
         "ticker": {"type": "string"},
         "usecase": {"type": "string", "enum": ["board", "credit", "search", "investor"], "default": "board"}}},
     "annotations": {"readOnlyHint": True, "openWorldHint": False}},
    {"name": "draft_561_outline",
     "title": "โครงร่าง 56-1 One Report ส่วนที่ 2 ข้อ 7–8",
     "description": "สร้างโครงร่างเนื้อหาการกำกับดูแลเชิงนวัตกรรมของคณะกรรมการสำหรับแบบ 56-1 One Report ส่วนที่ 2 ข้อ 7–8 "
                    "จากผลลัพธ์ของ OpenInnoScore + รายการการดำเนินการที่ผู้ใช้ให้มา. กติกา: ใช้เฉพาะการดำเนินการที่ "
                    "status = completed และ approved = true, ไม่ระบุชื่อบริษัทอื่น (peer), ไม่อ้างคะแนนเป็นหลักฐานประสิทธิผล"
                    "ของคณะกรรมการ, ใช้ถ้อยคำเชิงความสัมพันธ์. " + OUTPUT_ONLY,
     "inputSchema": {"type": "object", "required": ["ticker"], "properties": {
         "ticker": {"type": "string"},
         "fiscal_year": {"type": "integer", "description": "ปีของรายงาน (ค.ศ.) ไม่บังคับ"},
         "actions": {"type": "array", "description": "การดำเนินการของคณะกรรมการในปีนั้น", "items": {
             "type": "object", "required": ["action"], "properties": {
                 "action": {"type": "string"}, "status": {"type": "string", "description": "completed | in_progress | planned"},
                 "approved": {"type": "boolean", "description": "ผ่านการอนุมัติของคณะกรรมการแล้วหรือไม่"},
                 "date": {"type": "string"}, "owner": {"type": "string", "description": "ตำแหน่ง/คณะกรรมการชุดย่อย"}}}},
         "usecase": {"type": "string", "enum": ["board", "credit", "search", "investor"], "default": "board"}}},
     "annotations": {"readOnlyHint": True, "openWorldHint": False}},
]


# ------------------------------------------------------------------ เรียก API ของเซิร์ฟเวอร์
class ApiError(Exception):
    pass


def api(path, **query):
    base = (os.environ.get("OIS_URL") or "").rstrip("/")
    tok = os.environ.get("OIS_TOKEN") or ""
    if not base or not tok:
        raise ApiError("ยังไม่ได้ตั้ง OIS_URL และ OIS_TOKEN ในค่าตั้งของ MCP server")
    q = {k: v for k, v in query.items() if v not in (None, "")}
    url = base + path + ("?" + urllib.parse.urlencode(q) if q else "")
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + tok, "Accept": "application/json",
                                               "User-Agent": "ois-mcp/" + SERVER_VERSION})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode("utf-8")).get("error")
        except Exception:  # noqa: BLE001
            msg = None
        raise ApiError(f"เซิร์ฟเวอร์ตอบ {e.code}: {msg or e.reason}")
    except urllib.error.URLError as e:
        raise ApiError(f"เชื่อมต่อ {base} ไม่ได้: {e.reason}")


def tk(t):
    t = str(t or "").strip().upper()
    if not re.fullmatch(r"[A-Z0-9.\-&]{1,16}", t):
        raise ApiError("ticker ไม่ถูกต้อง")
    return urllib.parse.quote(t, safe="")


# ------------------------------------------------------------------ เครื่องมือ
def list_companies(industry=None):
    return api("/api/v1/companies", industry=industry)


def get_company_signal(ticker):
    c = api("/api/v1/companies/" + tk(ticker))
    c["wording_rules"] = WORDING_RULES
    return c


def get_board_questions(ticker, usecase="board"):
    return api(f"/api/v1/companies/{tk(ticker)}/board-questions", usecase=usecase or "board")


def _redact_peers(text, own, comps):
    """ลบชื่อ/ชื่อย่อของบริษัทอื่นในฐานออกจากข้อความที่ผู้ใช้ให้มา (กติกา: ไม่ระบุชื่อ peer)"""
    out = text
    for c in comps:
        if c["ticker"] == own:
            continue
        if c.get("name") and len(c["name"]) >= 4 and c["name"] in out:
            out = out.replace(c["name"], "[บริษัทอื่น]")
        if len(c["ticker"]) >= 2:
            out = re.sub(r"(?<![A-Za-z0-9])" + re.escape(c["ticker"]) + r"(?![A-Za-z0-9])", "[บริษัทอื่น]", out)
    return out


CAUSAL = ("ส่งผลให้", "ทำให้", "การันตี", "พิสูจน์ว่า", "รับประกัน")


def _causal_words(text):
    """คำเชิงเหตุผล (R7) ในข้อความของผู้ใช้ — ไม่แก้ให้อัตโนมัติ (เสี่ยงผิดความหมาย) แต่แจ้งให้ผู้เขียนปรับ"""
    return [w for w in CAUSAL if w in text]


def draft_561_outline(ticker, actions=None, usecase="board", fiscal_year=None):
    c = get_company_signal(ticker)
    q = get_board_questions(ticker, usecase)
    comps = list_companies().get("companies", [])
    kept, excluded, warnings = [], [], []
    for a in actions or []:
        if not isinstance(a, dict) or not str(a.get("action") or "").strip():
            continue
        st = str(a.get("status") or "").strip().lower()
        if st not in ("completed", "done", "แล้วเสร็จ") or a.get("approved") is not True:
            excluded.append({"action": _redact_peers(str(a["action"])[:200], c["ticker"], comps),
                             "reason": "ยังไม่แล้วเสร็จ" if st not in ("completed", "done", "แล้วเสร็จ") else "ยังไม่ได้รับอนุมัติจากคณะกรรมการ"})
            continue
        txt = _redact_peers(str(a["action"])[:500], c["ticker"], comps)
        if _causal_words(txt):
            warnings.append({"action": txt[:120], "causal_words": _causal_words(txt),
                             "fix": "เปลี่ยนเป็นถ้อยคำเชิงความสัมพันธ์ เช่น 'สัมพันธ์กับ' / 'สอดคล้องกับ' (R7)"})
        kept.append({"action": txt, "date": a.get("date"), "owner": a.get("owner")})
    withheld = c.get("withheld") or c.get("regime") == "FAIL"
    signal_lines = [f"ตำแหน่งบน Board Strategy Compass: quadrant {c['quadrant']} ({c.get('quadrant_name')}) · โซน {c.get('zone_th')}",
                    f"ข้อความสถานะ: {c['status_message']}"]
    if withheld:
        signal_lines.append(f"ปีบัญชี {c.get('fy')} ไม่ผ่านเกณฑ์ validity (regime = FAIL) — ไม่รายงานคะแนนและ tier ของปีนี้ (R3)")
    else:
        sc = f"OpenInnoScore {c['ois']} (ช่วง 90%: {c['band90'][0]}–{c['band90'][1]})"
        if c.get("in_domain") and c.get("tier"):
            sc += f" · tier {c['tier']}" + (" (tier ไม่แน่นอน — ช่วง 90% คร่อมมากกว่าหนึ่ง tier)" if c.get("tier_uncertain") else "")
        elif not c.get("in_domain"):
            sc += " · นอกกลุ่มอ้างอิง ไม่แสดง tier (R4)"
        signal_lines.append(sc + " — เป็นตำแหน่งเชิงสัมพัทธ์เทียบฐานอ้างอิง REF-928 ไม่ใช่การพยากรณ์")
    if c.get("weak_industry"):
        signal_lines.append("หลักฐานอ่อนในอุตสาหกรรมนี้ (R5) — ควรอ่านผลอย่างระมัดระวัง")
    for ch in c.get("chips", []):
        if ch.get("key") not in ("tier_uncertain", "weak_industry", "fail_year"):
            signal_lines.append("ข้อควรระวัง: " + ch["label"])
    outline = {
        "document": "แบบ 56-1 One Report · ส่วนที่ 2 การกำกับดูแลกิจการ",
        "company": {"ticker": c["ticker"], "name": c["name"], "industry": c.get("industry")},
        "fiscal_year": fiscal_year or c.get("fy"),
        "sections": [
            {"no": "7", "title": "โครงสร้างการกำกับดูแลกิจการ — บทบาทของคณะกรรมการต่อการกำกับดูแลนวัตกรรม",
             "guidance": "บรรยายข้อเท็จจริงจากบริษัท: องค์ประกอบคณะกรรมการ คณะกรรมการชุดย่อยที่รับผิดชอบกลยุทธ์/นวัตกรรม "
                         "และกฎบัตรที่เกี่ยวข้อง · ห้ามใช้คะแนน OpenInnoScore เป็นหลักฐานว่าคณะกรรมการมีประสิทธิผล",
             "fill_from": ["กฎบัตรคณะกรรมการ", "skill matrix", "รายชื่อคณะกรรมการชุดย่อย"],
             "bullets": []},
            {"no": "8.1", "title": "ผลการปฏิบัติหน้าที่ของคณะกรรมการ — การประเมินตนเองและประเด็นพัฒนาด้านนวัตกรรม",
             "guidance": "นำเสนอผล OpenInnoScore เป็น 'ข้อมูลประกอบการประเมินตนเองระดับคณะ' พร้อม quadrant และข้อความสถานะเสมอ "
                         "ใช้ถ้อยคำเชิงความสัมพันธ์ ไม่ประเมินกรรมการรายบุคคล",
             "bullets": signal_lines,
             "what_cannot_be_concluded": q.get("what_cannot_be_concluded")},
            {"no": "8.1 (ต่อ)", "title": "การดำเนินการที่แล้วเสร็จและได้รับอนุมัติจากคณะกรรมการในรอบปี",
             "guidance": "รายงานเฉพาะสิ่งที่ทำแล้วเสร็จและผ่านการอนุมัติ — ไม่รายงานแผนหรือสิ่งที่อยู่ระหว่างดำเนินการเป็นผลงาน",
             "bullets": [k["action"] + (f" ({k['owner']})" if k.get("owner") else "") + (f" · {k['date']}" if k.get("date") else "") for k in kept]
                        or ["(ยังไม่มีการดำเนินการที่แล้วเสร็จและได้รับอนุมัติ — ไม่ควรเขียนส่วนนี้)"]},
            {"no": "8.x", "title": "ประเด็นที่คณะกรรมการจะหารือ/ติดตามในรอบถัดไป",
             "guidance": "เป็นประเด็นสำหรับหารือ ไม่ใช่ข้อสรุปว่าบริษัทมีปัญหา",
             "bullets": q.get("questions", []), "evidence_to_check": q.get("evidence_to_check", [])},
            {"no": "หมายเหตุ", "title": "ข้อจำกัดของข้อมูล",
             "bullets": [c.get("disclaimer"), q.get("disclaimer")]},
        ],
        "rules_applied": WORDING_RULES + [
            "ใช้เฉพาะการดำเนินการที่ status = completed และ approved = true",
            "ไม่ระบุชื่อบริษัทอื่น (peer) — ชื่อในข้อความที่ให้มาถูกแทนด้วย [บริษัทอื่น]",
            "ไม่อ้างคะแนนเป็นหลักฐานประสิทธิผลของคณะกรรมการ",
        ],
        "excluded_actions": excluded,
        "wording_warnings": warnings,
        "source": {"reference": c.get("reference"), "usecase": usecase},
    }
    return outline


HANDLERS = {
    "list_companies": lambda a: list_companies(a.get("industry")),
    "get_company_signal": lambda a: get_company_signal(a["ticker"]),
    "get_board_questions": lambda a: get_board_questions(a["ticker"], a.get("usecase") or "board"),
    "draft_561_outline": lambda a: draft_561_outline(a["ticker"], a.get("actions"), a.get("usecase") or "board",
                                                     a.get("fiscal_year")),
}


# ------------------------------------------------------------------ JSON-RPC 2.0 / MCP
def handle(msg):
    """คืน dict ตอบกลับ หรือ None สำหรับ notification"""
    mid, method, params = msg.get("id"), msg.get("method"), msg.get("params") or {}
    is_note = "id" not in msg
    ok = lambda result: {"jsonrpc": "2.0", "id": mid, "result": result}
    err = lambda code, m: {"jsonrpc": "2.0", "id": mid, "error": {"code": code, "message": m}}
    if method == "initialize":
        want = params.get("protocolVersion")
        return ok({"protocolVersion": want if want in SUPPORTED else PROTOCOL,
                   "capabilities": {"tools": {"listChanged": False}},
                   "serverInfo": {"name": SERVER_NAME, "title": "OpenInnoScore (outputs only)", "version": SERVER_VERSION},
                   "instructions": "เครื่องมือทั้งหมดคืนเฉพาะผลลัพธ์ของ OpenInnoScore ไม่มีสูตร · เขียนรายงานตามกติกา R1–R8: "
                                   + " | ".join(WORDING_RULES)})
    if is_note:
        return None                                        # notifications/initialized, cancelled ฯลฯ
    if method == "ping":
        return ok({})
    if method == "tools/list":
        return ok({"tools": TOOLS})
    if method == "tools/call":
        name, args = params.get("name"), params.get("arguments") or {}
        if name not in HANDLERS:
            return err(-32602, f"ไม่รู้จักเครื่องมือ {name}")
        try:
            data = HANDLERS[name](args)
        except (ApiError, KeyError) as e:
            text = f"ข้อผิดพลาด: {e}" if isinstance(e, ApiError) else f"ขาดพารามิเตอร์ {e}"
            return ok({"content": [{"type": "text", "text": text}], "isError": True})
        return ok({"content": [{"type": "text", "text": json.dumps(data, ensure_ascii=False, indent=1)}],
                   "structuredContent": data if isinstance(data, dict) else {"items": data}, "isError": False})
    if method in ("resources/list", "prompts/list"):
        return ok({method.split("/")[0]: []})
    return err(-32601, f"ไม่รองรับ method {method}")


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError:
            out = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}
        else:
            batch = msg if isinstance(msg, list) else [msg]
            res = [r for r in (handle(m) for m in batch if isinstance(m, dict)) if r is not None]
            out = (res if isinstance(msg, list) else (res[0] if res else None))
        if out:
            sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()

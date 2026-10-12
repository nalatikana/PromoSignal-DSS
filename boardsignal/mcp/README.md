# OpenInnoScore MCP server · เชื่อม Claude เข้ากับผลลัพธ์ของ OpenInnoScore

`ois_mcp.py` เป็น MCP server แบบ stdio (Python มาตรฐานล้วน ไม่ต้อง `pip install`) ให้ Claude Desktop / Claude Code
ดึง **ผลลัพธ์ที่คำนวณแล้ว** จากเซิร์ฟเวอร์ OpenInnoScore ไปเขียนรายงานและข้อเสนอเชิงกลยุทธ์

> AI ไม่เข้าถึงอัลกอริทึม: ไฟล์นี้ไม่มีโมเดลอยู่ข้างใน และเรียกได้เฉพาะ `/api/v1` ของเซิร์ฟเวอร์
> ซึ่งส่งเฉพาะคะแนน tier ช่วง 90% quadrant สถานะ และป้ายเตือน — ไม่มีสูตร สัมประสิทธิ์ หรือข้อมูลรายแถวของฐานอ้างอิง

## เครื่องมือ (tools)

| ชื่อ | ทำอะไร |
|---|---|
| `list_companies` | รายชื่อบริษัท (กรองตามอุตสาหกรรม 1–7 ได้) |
| `get_company_signal` | OpenInnoScore, tier, ช่วง 90%, quadrant/zone, regime ของปี, ข้อความสถานะ, ป้ายเตือน + กติกาถ้อยคำ R1–R8 |
| `get_board_questions` | คำถามหารือ 3 ข้อ + หลักฐานที่ควรตรวจ ตาม quadrant และมุมมอง (`board` / `credit` / `search` / `investor`) |
| `draft_561_outline` | โครงร่างแบบ 56-1 One Report ส่วนที่ 2 ข้อ 7–8: ใช้เฉพาะการดำเนินการที่ `status=completed` และ `approved=true`, ลบชื่อบริษัทอื่น, ไม่อ้างคะแนนเป็นหลักฐานประสิทธิผล, แจ้งคำเชิงเหตุผล |

## สิ่งที่ต้องมี

1. เซิร์ฟเวอร์ OpenInnoScore บน Render ที่ตั้ง `API_TOKENS` แล้ว (ดู `server/README_DEPLOY.md` ข้อ “MCP / GPT”)
2. Python 3.9 ขึ้นไปบนเครื่องที่ใช้ Claude
3. คัดลอกไฟล์ `mcp/ois_mcp.py` ไปไว้ในเครื่อง เช่น `/Users/<ชื่อ>/ois/ois_mcp.py` หรือ `C:\ois\ois_mcp.py`

## Claude Desktop

เปิด Claude Desktop → Settings → Developer → **Edit Config** (ไฟล์ `claude_desktop_config.json`
— macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`) แล้วเพิ่ม:

```json
{
  "mcpServers": {
    "openinnoscore": {
      "command": "python3",
      "args": ["/Users/<ชื่อ>/ois/ois_mcp.py"],
      "env": {
        "OIS_URL": "https://openinnoscore.onrender.com",
        "OIS_TOKEN": "<token หนึ่งตัวจาก API_TOKENS>"
      }
    }
  }
}
```

Windows ใช้ `"command": "python"` และ path แบบ `"C:\\ois\\ois_mcp.py"` · บันทึกแล้ว **ปิด-เปิด Claude Desktop ใหม่**
จะเห็นเครื่องมือ openinnoscore ในเมนูเครื่องมือของช่องแชท

## Claude Code

```bash
claude mcp add openinnoscore \
  -e OIS_URL=https://openinnoscore.onrender.com \
  -e OIS_TOKEN=<token> \
  -- python3 /path/to/ois_mcp.py
claude mcp list          # ตรวจว่าเชื่อมได้
```

ใช้คู่กับ Skill `integrations/claude-skill/openinnoscore-561/` (คัดลอกโฟลเดอร์ไปที่ `~/.claude/skills/`
หรือ `.claude/skills/` ของโปรเจกต์ / อัปโหลดเป็น Skill ใน claude.ai) เพื่อให้ Claude เขียนตามกติกา R1–R8 อัตโนมัติ

## ChatGPT

ChatGPT ใช้ **GPT Action** แทน MCP แบบ stdio — ดู `integrations/gpt-action/INSTRUCTIONS.md` และ `openapi.yaml`

## ตัวอย่างคำสั่ง

- “ดึงสัญญาณ OpenInnoScore ของ GULF แล้วสรุปให้กรรมการที่ไม่ใช่นักสถิติ”
- “ร่างโครงร่าง 56-1 ส่วนที่ 2 ข้อ 7–8 ของ GULF ปี 2025 จากรายการการดำเนินการนี้: …”
- “ขอคำถามหารือสำหรับ RM ฝ่ายสินเชื่อของบริษัท PTG”

## ทดสอบ

```bash
python3 mcp/test_mcp.py                              # เปิดเซิร์ฟเวอร์ชั่วคราวในเครื่องแล้วทดสอบทุกเครื่องมือ
OIS_URL=https://… OIS_TOKEN=… python3 mcp/test_mcp.py   # ทดสอบกับเซิร์ฟเวอร์จริง
```

## ความปลอดภัย

- token ให้สิทธิ์อ่านผลลัพธ์ของทุกบริษัท — แจกเฉพาะผู้ลงนาม NDA · เพิกถอน = ลบออกจาก `API_TOKENS` บน Render
- ทุกการเรียกถูกบันทึกในตาราง `events` (ผู้ดูแลดูได้ที่ `/api/admin/events`) · จำกัด 600 ครั้ง/ชั่วโมง/token
- ข้อความที่ Claude ได้รับจะถูกส่งต่อให้ผู้ให้บริการ AI ตามนโยบายของบัญชี Claude ที่ใช้

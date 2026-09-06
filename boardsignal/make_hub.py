"""หน้าเลือกเวอร์ชัน — คงโครงสามการ์ดของคุณแอ๋มไว้ เปลี่ยนฟอนต์เป็น Kanit และแก้ลิงก์ให้ถูกต้อง"""
from pathlib import Path
ROOT = Path(__file__).resolve().parent
SHARED = ROOT.parent / "src"
FONT = (SHARED / "kanit_font.css").read_text(encoding="utf-8")

CSS = """
:root{--ink:#12202f;--ink-2:#4a5b6e;--ink-3:#7f8f9f;--line:#dde5ed;--bg:#f4f7fa;--panel:#fff;
 --navy:#0f2233;--navy-2:#1b3a57;--brand:#0f8f6d;--brand-soft:#e4f5ef;--brand-line:#b4e3d3;--blue:#2563c9;
 --shadow:0 1px 2px rgba(15,34,51,.05),0 16px 40px rgba(15,34,51,.07)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
 font-family:Kanit,system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;font-weight:300;line-height:1.7}
b,strong{font-weight:500}
.wrap{max-width:1120px;margin:0 auto;padding:54px 24px 64px}
.brand{display:flex;gap:6px;align-items:center;margin-bottom:22px}
.brand span{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:600}
h1{font-size:30px;font-weight:500;letter-spacing:-.03em;margin:0 0 8px;line-height:1.28}
.sub{color:var(--ink-2);font-size:14.5px;margin:0 0 30px;max-width:82ch}
.grid{display:grid;grid-template-columns:1.12fr 1fr 1fr;gap:16px;align-items:stretch}
@media(max-width:980px){.grid{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px 23px;
 box-shadow:var(--shadow);display:flex;flex-direction:column}
.card.current{border-color:var(--brand-line);box-shadow:0 1px 2px rgba(15,34,51,.05),0 20px 52px rgba(15,143,109,.16)}
.tag{font-size:10px;letter-spacing:.15em;text-transform:uppercase;font-weight:500;margin-bottom:9px}
h2{font-size:19.5px;font-weight:500;margin:0 0 7px;letter-spacing:-.02em}
.card p{font-size:13.2px;color:var(--ink-2);margin:0 0 12px}
ul{margin:0 0 18px;padding-left:19px;font-size:12.6px;color:var(--ink-2)}
li{margin:4px 0}
.row{margin-top:auto;display:flex;gap:8px;flex-wrap:wrap}
a.btn{text-decoration:none;padding:9px 16px;border-radius:10px;font-size:13.2px;white-space:nowrap;
 border:1px solid var(--line);background:var(--panel);color:var(--ink)}
a.btn:hover{border-color:var(--ink-3)}
a.p{background:var(--brand);border-color:var(--brand);color:#fff}
a.b{background:var(--blue);border-color:var(--blue);color:#fff}
a.d{background:var(--navy);border-color:var(--navy);color:#fff}
a.s{background:#f2f6fa}
.strip{margin-top:22px;background:var(--brand-soft);border:1px solid var(--brand-line);border-radius:14px;
 padding:16px 19px;font-size:13px;color:var(--ink-2);line-height:1.75}
.strip b{color:var(--ink)}
.strip ol{margin:7px 0 0;padding-left:20px}
footer{margin-top:30px;padding-top:18px;border-top:1px solid var(--line);font-size:11.4px;color:var(--ink-3);line-height:1.75}
"""

BODY = """
<div class="wrap">
  <div class="brand"><span style="background:#0f8f6d">AN</span><span style="background:#2563c9">RC</span></div>
  <h1>เลือกเวอร์ชันต้นแบบที่ต้องการเปิด</h1>
  <p class="sub">เก็บทุกเวอร์ชันไว้ให้เทียบก่อน–หลังได้ · <b>แก้ไขครั้งที่ 1</b> คือเวอร์ชันที่จัดหน้าใหม่ตาม comment อาจารย์
    ให้ผู้ใช้ที่ไม่ใช่ทีม dev เข้าใจได้ทันที โดยยังใช้โมเดลและข้อมูลชุดเดิม 209 บริษัท 928 บริษัท-ปี (2562–2566)</p>

  <div class="grid">
    <div class="card current">
      <div class="tag" style="color:var(--brand)">เวอร์ชันที่แนะนำให้เปิดก่อน</div>
      <h2>Revision 1 — แก้ไขครั้งที่ 1</h2>
      <p>Workspace เดียวเรียงตามลำดับงานจริงของ Search Firm และ IOD — <b>Upload → Insights → Recommendation</b>
        อัปโหลดเอกสารได้จริง แก้ค่าที่ระบบอ่านผิดได้ทุกช่อง แล้วคะแนนทั้งหน้าคำนวณใหม่ทันที</p>
      <ul>
        <li>3 Zones — Document Intelligence · Insight Generator · Board Refresh</li>
        <li>บริบทบริษัทค้างด้านบนตลอด · สลับ EN / TH · โหมดนำเสนอ</li>
        <li>ระบบ token — บริษัทตัวเองฟรี · เทียบคู่แข่งและรายงานอุตสาหกรรมใช้ token</li>
        <li>ออก Candidate Brief และ Board Memo เป็น A4 ได้ทันที</li>
      </ul>
      <div class="row"><a class="btn p" href="./revision-1/">เปิด Revision 1</a>
        <a class="btn s" href="./revision-1/spec.html">สเปกและแผนงาน</a></div>
    </div>

    <div class="card">
      <div class="tag" style="color:var(--blue)">ต้นแบบเชิงพาณิชย์</div>
      <h2>Board Signal</h2>
      <p>ชั้นวิเคราะห์เต็มรูปแบบ — เป็นแกนคำนวณเดียวกับ Revision 1 แต่เปิดเครื่องมือให้ครบทุกตัวสำหรับนักวิเคราะห์</p>
      <ul>
        <li>เมทริกซ์ 2×2 · What-if Studio · เทียบคู่แข่ง 1 + 3</li>
        <li>แผนภาพน้ำตก · พอร์ตลงทุน · โหมดที่ประชุม · บันทึกหน้าเดียว</li>
        <li>ใช้ดูว่าฟีเจอร์ไหนควรยกเข้ามาใน Revision ถัดไป</li>
      </ul>
      <div class="row"><a class="btn b" href="./boardsignal/">เปิด Board Signal</a>
        <a class="btn s" href="./boardsignal/requirements.html">เอกสารสรุป</a></div>
    </div>

    <div class="card">
      <div class="tag" style="color:var(--ink-3)">เก็บไว้เทียบ</div>
      <h2>เวอร์ชันเดิม — PromoSignal DSS</h2>
      <p>หน้าเดิมก่อน comment ครั้งที่ 1 ยังเปิดได้ครบ ไม่ถูกทับด้วย Revision 1 · ใช้ดูย้อนหลังและเทียบก่อน–หลัง</p>
      <ul>
        <li>flow อัปโหลด · ชุดโมเดล A / B · dashboard เดิม</li>
        <li>คู่มือการใช้งานฉบับเดิม</li>
        <li>ตัวเลขและโมเดลชุดเดียวกับทุกเวอร์ชัน</li>
      </ul>
      <div class="row"><a class="btn d" href="./">เปิดเวอร์ชันเดิม</a>
        <a class="btn s" href="./#p-howto">คู่มือเดิม</a></div>
    </div>
  </div>

  <div class="strip">
    <b>Revision 1 แก้อะไรจากร่างที่วางไว้</b>
    <ol>
      <li>เปลี่ยนจากหน้าอธิบายการออกแบบ ให้เป็น <b>ต้นแบบที่กดใช้งานได้จริง</b> — อัปโหลดเอกสาร แก้ค่า แล้วดูคะแนนขยับ</li>
      <li>ตัวเลขตัวอย่างทั้งหมดถูกแทนด้วย <b>ค่าจริงของบริษัทนั้น</b> จึงไม่ขัดกันเองเมื่อเปิดสองเวอร์ชันเทียบกัน</li>
      <li>ตาราง Validity แก้จาก “Strong ทั้งแถว” เป็น <b>ค่าที่คำนวณได้จริง</b> รวมปี 2565 ที่สัญญาณหายไปทั้งปี</li>
      <li>เนื้อหาสเปก MVP · Phase II · Tech Stack ย้ายไปหน้าเอกสารแยก เพื่อให้หน้าต้นแบบเหลือแต่ของที่กดได้</li>
    </ol>
  </div>

  <footer>ต้นแบบเพื่อการสาธิตและการนำเสนอ · ไม่ใช่ระบบ production · ไม่มีบัญชีผู้ใช้จริงและไม่เชื่อมข้อมูลสด ·
    เอกสารที่อัปโหลดถูกอ่านในเบราว์เซอร์เท่านั้น ไม่ถูกส่งออกไปที่เซิร์ฟเวอร์ใด ·
    ผลลัพธ์เป็นความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่ความสัมพันธ์เชิงสาเหตุ และไม่คงที่ทุกปี ·
    ไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน · ห้ามนำไปใช้ให้คะแนนรายบุคคล</footer>
</div>
"""

html = f"""<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AN·RC — เลือกเวอร์ชันต้นแบบ</title>
<style>{FONT}</style><style>{CSS}</style></head><body>{BODY}</body></html>"""
out = ROOT / "out" / "hub.html"
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

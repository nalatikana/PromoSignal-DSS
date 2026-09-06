"""สร้างหน้าเอกสารสเปกและหน้าเลือกเวอร์ชันของ OpenInnoScore™ เป็นไฟล์ HTML เดียว"""
from pathlib import Path
ROOT = Path(__file__).resolve().parent
SHARED = ROOT.parent / "src"
rd = lambda p: Path(p).read_text(encoding="utf-8")
FONT = rd(SHARED / "sarabun_font.css")
MARK = rd(ROOT / "src" / "logo_mark.svg")
MARK_D = rd(ROOT / "src" / "logo_mark_dark.svg")
sized = lambda svg, n: svg.replace('width="120" height="120"', f'width="{n}" height="{n}"')

BASE = """
:root{--navy:#1F2B37;--navy-2:#2E4257;--blue:#4F76F6;--blue-2:#3559D9;--mint:#77F2A1;--mint-ink:#0E8C4E;
 --ink:#1F2B37;--ink-2:#4E5F71;--ink-3:#8393A4;--line:#DEE6EE;--line-2:#EDF2F7;--bg:#F5F8FB;--panel:#fff;--panel-2:#F2F6FA;
 --ok:#0E8C4E;--ok-bg:#E7FBEF;--ok-line:#A8E9C4;--warn:#B26B00;--warn-bg:#FDF3E0;--warn-line:#F0DCB4;
 --crit:#C0392F;--crit-bg:#FBECEB;--crit-line:#F2CDC9;--blue-soft:#EBF0FE;--blue-line:#C2D2FC;
 --shadow:0 1px 2px rgba(31,43,55,.05),0 14px 38px rgba(31,43,55,.07)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
 font-family:Sarabun,"TH SarabunPSK","Leelawadee UI",system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;
 font-weight:300;font-size:15.5px;line-height:1.72}
b,strong{font-weight:600}
code{font-family:ui-monospace,Menlo,monospace;font-size:.92em;background:var(--panel-2);border:1px solid var(--line);
 border-radius:5px;padding:0 5px}
header{background:linear-gradient(152deg,var(--navy),var(--navy-2));color:#fff;padding:34px 24px 34px}
header .inner{max-width:1060px;margin:0 auto}
.brandrow{display:flex;align-items:center;gap:11px;margin-bottom:18px}
.brandrow .bn{font-size:19px;font-weight:600;line-height:1.1}
.brandrow .bs{font-size:12px;color:#9FB6CC}
.eyebrow{font-size:10.6px;letter-spacing:.16em;text-transform:uppercase;color:var(--mint);font-weight:600;margin-bottom:8px}
h1{font-size:29px;font-weight:600;letter-spacing:-.025em;margin:0 0 9px;line-height:1.32}
header p{margin:0;color:#B9CADA;font-size:14.5px;max-width:82ch}
.hbtns{margin-top:18px;display:flex;gap:9px;flex-wrap:wrap}
.hb{text-decoration:none;font-size:13.4px;padding:8px 15px;border-radius:10px;border:1px solid rgba(255,255,255,.24);color:#DCE8F2}
.hb:hover{background:rgba(255,255,255,.09)}
.hb.p{background:var(--blue);border-color:var(--blue);color:#fff}
.wrap{max-width:1060px;margin:0 auto;padding:26px 24px 60px}
h2{font-size:21px;font-weight:600;letter-spacing:-.02em;margin:40px 0 4px;padding-top:22px;border-top:2px solid var(--line)}
h2:first-of-type{border-top:0;padding-top:0;margin-top:0}
h3{font-size:15.5px;font-weight:600;margin:0 0 6px}
p{margin:9px 0}
.lead{font-size:14.8px;color:var(--ink-2);margin:4px 0 16px;max-width:84ch}
ul,ol{margin:8px 0;padding-left:20px}li{margin:4px 0;font-size:13.8px;color:var(--ink-2)}
li b{color:var(--ink)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow)}
.card p{font-size:13.6px;color:var(--ink-2);margin:0 0 10px}
.card table{box-shadow:none;border-radius:0;font-size:13px}
.grid{display:grid;gap:14px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}
@media(max-width:860px){.g2,.g3{grid-template-columns:1fr}}
.tw{overflow-x:auto;margin:13px 0}
table{width:100%;border-collapse:collapse;font-size:13.2px;background:var(--panel);border-radius:12px;overflow:hidden;box-shadow:var(--shadow)}
th{text-align:left;font-weight:600;font-size:10.6px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);
 padding:9px 11px;border-bottom:1.5px solid var(--line);background:#FAFCFE;white-space:nowrap}
td{padding:9px 11px;border-bottom:1px solid var(--line-2);vertical-align:top;color:var(--ink-2)}
td b{color:var(--ink)}
tbody tr:last-child td{border-bottom:0}
tr.bad td{background:var(--crit-bg)}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.pill{display:inline-block;font-size:10.8px;font-weight:400;padding:2px 9px;border-radius:99px;white-space:nowrap;border:1px solid transparent}
.pill.ok{background:var(--ok-bg);color:var(--ok);border-color:var(--ok-line)}
.pill.warn{background:var(--warn-bg);color:var(--warn);border-color:var(--warn-line)}
.pill.crit{background:var(--crit-bg);color:var(--crit);border-color:var(--crit-line)}
.pill.blue{background:var(--blue-soft);color:var(--blue-2);border-color:var(--blue-line)}
.note{border-radius:12px;padding:13px 16px;font-size:13px;line-height:1.74;color:var(--ink-2);background:var(--panel-2);
 border:1px solid var(--line);margin:14px 0}
.note b{color:var(--ink)}
.note.ok{background:var(--ok-bg);border-color:var(--ok-line)}
.note.warn{background:var(--warn-bg);border-color:var(--warn-line)}
.note.crit{background:var(--crit-bg);border-color:var(--crit-line)}
.note.brand{background:var(--blue-soft);border-color:var(--blue-line)}
.markrow{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
.markrow svg{width:104px;height:104px;flex:none}
.markrow table{flex:1;min-width:260px}
.steps{display:grid;gap:8px;margin:13px 0}
.st{display:grid;grid-template-columns:30px 1fr;gap:11px;align-items:center;background:var(--panel);
 border:1px solid var(--line);border-radius:11px;padding:9px 13px;font-size:13.6px;color:var(--ink-2)}
.st span{width:26px;height:26px;border-radius:8px;background:var(--blue-soft);color:var(--blue-2);
 display:grid;place-items:center;font-size:12px;font-weight:600}
footer{max-width:1060px;margin:32px auto 0;padding:18px 24px 40px;border-top:1px solid var(--line);
 font-size:11.6px;color:var(--ink-3);line-height:1.78}
@media print{body{background:#fff}.card,table{box-shadow:none}h2{page-break-after:avoid}
 .card,table,.note{page-break-inside:avoid}header{background:#1F2B37!important;-webkit-print-color-adjust:exact}}
"""

# ---------------------------------------------------------------- หน้าสเปก
BODY = rd(ROOT / "src" / "ois_spec_body.html")
BODY = BODY.replace('<span id="hdrLogo"></span>', sized(MARK_D, 44))
BODY = BODY.replace('<span id="specLogo"></span>', sized(MARK, 104))
spec = f"""<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenInnoScore™ — สเปกและแผนงาน Prototype Phase I</title>
<style>{FONT}</style><style>{BASE}</style></head><body>{BODY}</body></html>"""
(ROOT / "out" / "OpenInnoScore_Spec.html").write_text(spec, encoding="utf-8")

# ---------------------------------------------------------------- หน้าเลือกเวอร์ชัน
HUB_CSS = """
.hwrap{max-width:1140px;margin:0 auto;padding:52px 24px 64px}
.hbrand{display:flex;align-items:center;gap:12px;margin-bottom:22px}
.hbrand .bn{font-size:20px;font-weight:600;letter-spacing:-.02em;line-height:1.1}
.hbrand .bs{font-size:12.4px;color:var(--ink-3)}
.hsub{color:var(--ink-2);font-size:14.8px;margin:0 0 30px;max-width:84ch}
.cards{display:grid;grid-template-columns:1.14fr 1fr 1fr;gap:16px;align-items:stretch}
@media(max-width:1000px){.cards{grid-template-columns:1fr}}
.vc{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px 23px;box-shadow:var(--shadow);
 display:flex;flex-direction:column}
.vc.cur{border-color:var(--blue-line);box-shadow:0 1px 2px rgba(31,43,55,.05),0 20px 52px rgba(79,118,246,.16)}
.tag{font-size:10.2px;letter-spacing:.15em;text-transform:uppercase;font-weight:600;margin-bottom:9px}
.vc h2{font-size:19.5px;font-weight:600;margin:0 0 7px;letter-spacing:-.02em;padding:0;border:0}
.vc p{font-size:13.4px;color:var(--ink-2);margin:0 0 12px}
.vc ul{margin:0 0 18px;padding-left:19px;font-size:12.8px;color:var(--ink-2)}
.row{margin-top:auto;display:flex;gap:8px;flex-wrap:wrap}
a.btn{text-decoration:none;padding:9px 16px;border-radius:10px;font-size:13.4px;white-space:nowrap;
 border:1px solid var(--line);background:var(--panel);color:var(--ink)}
a.btn:hover{border-color:var(--ink-3)}
a.p{background:var(--blue);border-color:var(--blue);color:#fff}
a.d{background:var(--navy);border-color:var(--navy);color:#fff}
a.s{background:var(--panel-2)}
.strip{margin-top:22px;background:var(--blue-soft);border:1px solid var(--blue-line);border-radius:14px;
 padding:16px 19px;font-size:13.4px;color:var(--ink-2);line-height:1.78}
.strip b{color:var(--ink)}
.strip ol{margin:7px 0 0;padding-left:20px}
"""
HUB_BODY = """
<div class="hwrap">
  <div class="hbrand">__LOGO__
    <div><div class="bn">OpenInnoScore<sup style="font-size:10px">™</sup></div>
      <div class="bs">CEO Regulatory Focus × Board Composition Assessment</div></div></div>
  <h1 style="font-size:30px;font-weight:600;letter-spacing:-.03em;margin:0 0 8px">เลือกเวอร์ชันต้นแบบที่ต้องการเปิด</h1>
  <p class="hsub">เก็บทุกเวอร์ชันไว้ให้เทียบก่อน–หลังได้ ไม่มีอันไหนถูกลบ ·
    <b>แก้ไขครั้งที่ 1</b> คือ OpenInnoScore™ ที่จัดหน้าใหม่ตามเอกสารสรุปแนวทางการแก้ไขลงวันที่ 27 สิงหาคม 2569
    โดยยังใช้โมเดลและข้อมูลชุดเดิม 209 บริษัท 928 บริษัท-ปี (2562–2566)</p>

  <div class="cards">
    <div class="vc cur">
      <div class="tag" style="color:var(--blue)">เวอร์ชันที่แนะนำให้เปิดก่อน</div>
      <h2>OpenInnoScore™ — แก้ไขครั้งที่ 1</h2>
      <p>Workspace เดียวเรียงตามลำดับงานจริง <b>Upload → Insights → Recommendation</b>
        พร้อมแท็บ What-if Studio · อัปโหลดเอกสารได้จริง แก้ค่าที่ระบบอ่านผิดได้ทุกช่อง แล้วคะแนนทั้งหน้าคำนวณใหม่ทันที</p>
      <ul>
        <li>3 Zones — Document Intelligence · Insight Generator · Board Refresh Engine</li>
        <li>เลือกโทนข้อความ 4 แบบ — Investor · Board · Search Firm · IOD · สลับ EN / TH</li>
        <li>What-if Studio พร้อมฉากทัศน์สำเร็จรูป 5 แบบ และแผนภาพส่วนร่วม</li>
        <li>ระบบ token — บริษัทตัวเองฟรี · เทียบคู่แข่งและรายงานอุตสาหกรรมใช้ token</li>
        <li>Validity remark สองระดับตามกติกาในเอกสาร</li>
      </ul>
      <div class="row"><a class="btn p" href="./revision-1/">เปิด OpenInnoScore</a>
        <a class="btn s" href="./revision-1/spec.html">สเปกและแผนงาน</a>
        <a class="btn s" href="./revision-1/previous.html">รุ่นก่อนปรับ</a></div>
    </div>

    <div class="vc">
      <div class="tag" style="color:var(--ink-3)">ต้นแบบเชิงพาณิชย์</div>
      <h2>Board Signal</h2>
      <p>ชั้นวิเคราะห์เต็มรูปแบบ ใช้แกนคำนวณเดียวกับ OpenInnoScore แต่เปิดเครื่องมือครบทุกตัวสำหรับนักวิเคราะห์</p>
      <ul>
        <li>เมทริกซ์ 2×2 · What-if Studio · เทียบคู่แข่ง 1 + 3</li>
        <li>แผนภาพน้ำตก · พอร์ตลงทุน · โหมดที่ประชุม · บันทึกหน้าเดียว</li>
        <li>ใช้ดูว่าฟีเจอร์ไหนควรยกเข้ามาในรอบถัดไป</li>
      </ul>
      <div class="row"><a class="btn d" href="./boardsignal/">เปิด Board Signal</a>
        <a class="btn s" href="./boardsignal/requirements.html">เอกสารสรุป</a></div>
    </div>

    <div class="vc">
      <div class="tag" style="color:var(--ink-3)">เก็บไว้เทียบ</div>
      <h2>เวอร์ชันเดิม — PromoSignal DSS</h2>
      <p>หน้าเดิมก่อน comment ครั้งที่ 1 ยังเปิดได้ครบ ไม่ถูกทับ · ใช้ดูย้อนหลังและเทียบก่อน–หลัง</p>
      <ul>
        <li>flow อัปโหลด · ชุดโมเดล A / B · dashboard เดิม</li>
        <li>คู่มือการใช้งานฉบับเดิม</li>
        <li>ตัวเลขและโมเดลชุดเดียวกับทุกเวอร์ชัน</li>
      </ul>
      <div class="row"><a class="btn s" href="./">เปิดเวอร์ชันเดิม</a>
        <a class="btn s" href="./#p-howto">คู่มือเดิม</a></div>
    </div>
  </div>

  <div class="strip">
    <b>แก้ไขครั้งที่ 1 เปลี่ยนอะไรบ้าง</b>
    <ol>
      <li>ตั้งชื่อและตัวตนใหม่เป็น <b>OpenInnoScore™</b> พร้อมโทนสีตาม palette และฟอนต์ Sarabun ฝังในไฟล์</li>
      <li>เครื่องหมายวงกลมสื่อ <b>Moderation Analysis</b> ชัดขึ้น — ความหนาของเส้นเชื่อมแปรตามขนาดสัมประสิทธิ์จริง</li>
      <li>Zone A ได้การ์ดสรุป 4 ใบ · CEO text preview พับได้ · Confidence ทุกช่อง · แก้ค่าเองได้ทุกช่อง</li>
      <li>Zone B ได้ <b>Tone Selector</b> · ผลต่อคะแนนรายการ์ด · ปุ่ม Copy / Add to Report · ส่วน Evidence · Peer context strip</li>
      <li>Zone C ได้ Action type · Feasibility · คำค้นโปรไฟล์ · <b>Constraint toggles · Time horizon · Priority mode</b></li>
      <li>เพิ่ม <b>What-if Studio</b> เป็นแท็บแยก พร้อมฉากทัศน์สำเร็จรูป 5 แบบและแผนภาพส่วนร่วม</li>
      <li>Validity เปลี่ยนมาใช้ <b>เกณฑ์ตามเอกสาร</b> — ผลจริงคือ “Use result with cautious” เพราะ Spearman ปี 2565 ติดลบ</li>
    </ol>
  </div>

  <footer style="margin-top:26px">ต้นแบบเพื่อการสาธิตและการนำเสนอ · ไม่ใช่ระบบ production ·
    เอกสารที่อัปโหลดถูกอ่านในเบราว์เซอร์เท่านั้น ไม่ถูกส่งออกไปที่เซิร์ฟเวอร์ใด ·
    ผลลัพธ์เป็นความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่ความสัมพันธ์เชิงสาเหตุ และไม่คงที่ทุกปี ·
    ไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน · ห้ามนำไปใช้ให้คะแนนรายบุคคล</footer>
</div>
"""
hub = f"""<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenInnoScore™ — เลือกเวอร์ชันต้นแบบ</title>
<style>{FONT}</style><style>{BASE}{HUB_CSS}</style></head><body>{HUB_BODY.replace("__LOGO__", sized(MARK, 46))}</body></html>"""
(ROOT / "out" / "hub.html").write_text(hub, encoding="utf-8")
for f in ["OpenInnoScore_Spec.html", "hub.html"]:
    p = ROOT / "out" / f
    print("wrote", p, round(p.stat().st_size / 1e6, 2), "MB")

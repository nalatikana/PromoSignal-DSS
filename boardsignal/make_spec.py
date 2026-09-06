"""สร้างหน้าเอกสารสเปกของ Revision 1 เป็นไฟล์ HTML เดียว (พิมพ์เป็น PDF ได้)"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SHARED = ROOT.parent / "src"
rd = lambda p: Path(p).read_text(encoding="utf-8")

CSS = """
:root{--ink:#12202f;--ink-2:#4a5b6e;--ink-3:#7f8f9f;--line:#dde5ed;--line-2:#eef2f6;--bg:#f4f7fa;--panel:#fff;
 --navy:#0f2233;--navy-2:#1b3a57;--brand:#0f8f6d;--blue:#2563c9;
 --ok:#0a8a48;--ok-bg:#e6f5ec;--warn:#8a6300;--warn-bg:#fdf3e0;--crit:#c0392f;--crit-bg:#fbeceb;--mute-bg:#eef2f6;
 --shadow:0 1px 2px rgba(15,34,51,.05),0 12px 34px rgba(15,34,51,.06)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Kanit,system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;
 font-weight:300;font-size:14.5px;line-height:1.72}
b,strong{font-weight:500}
.wrap{max-width:1020px;margin:0 auto;padding:0 24px 60px}
header{background:linear-gradient(150deg,var(--navy),var(--navy-2));color:#fff;padding:42px 24px 36px;margin-bottom:26px}
header .inner{max-width:1020px;margin:0 auto}
.eyebrow{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#7fd8bd;font-weight:500;margin-bottom:9px}
h1{font-size:29px;font-weight:500;letter-spacing:-.03em;margin:0 0 9px;line-height:1.3}
header p{margin:0;color:#b0c4d8;font-size:14px;max-width:78ch}
.hbtns{margin-top:18px;display:flex;gap:9px;flex-wrap:wrap}
.hb{text-decoration:none;font-size:13px;padding:8px 15px;border-radius:10px;border:1px solid rgba(255,255,255,.24);color:#dce8f2}
.hb:hover{background:rgba(255,255,255,.09)}
.hb.p{background:var(--brand);border-color:var(--brand);color:#fff}
h2{font-size:21px;font-weight:500;letter-spacing:-.025em;margin:40px 0 4px;padding-top:22px;border-top:2px solid var(--line)}
h2:first-of-type{border-top:0;padding-top:0;margin-top:0}
h3{font-size:15.5px;font-weight:500;margin:0 0 6px}
p{margin:9px 0}
.lead{font-size:14.5px;color:var(--ink-2);margin:4px 0 16px;max-width:80ch}
ul,ol{margin:8px 0;padding-left:20px}li{margin:4px 0;font-size:13.4px;color:var(--ink-2)}
li b{color:var(--ink)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow)}
.card p{font-size:13.2px;color:var(--ink-2);margin:0 0 10px}
.grid{display:grid;gap:14px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}
@media(max-width:820px){.g2,.g3{grid-template-columns:1fr}}
.tw{overflow-x:auto;margin:13px 0}
table{width:100%;border-collapse:collapse;font-size:13px;background:var(--panel);border-radius:12px;overflow:hidden;
 box-shadow:var(--shadow)}
.card table{box-shadow:none;border-radius:0}
th{text-align:left;font-weight:500;font-size:10.4px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);
 padding:9px 11px;border-bottom:1.5px solid var(--line);background:#fafbfd;white-space:nowrap}
td{padding:9px 11px;border-bottom:1px solid var(--line-2);vertical-align:top;color:var(--ink-2)}
td b{color:var(--ink)}
tbody tr:last-child td{border-bottom:0}
tr.bad td{background:var(--crit-bg)}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.pill{display:inline-block;font-size:10.5px;font-weight:400;padding:2px 9px;border-radius:99px;white-space:nowrap;border:1px solid transparent}
.pill.ok{background:var(--ok-bg);color:var(--ok);border-color:#bde3cb}
.pill.warn{background:var(--warn-bg);color:var(--warn);border-color:#f0dcb4}
.pill.crit{background:var(--crit-bg);color:var(--crit);border-color:#f2cdc9}
.note{border-radius:12px;padding:13px 16px;font-size:12.8px;line-height:1.72;color:var(--ink-2);background:var(--mute-bg);
 border:1px solid var(--line);margin:14px 0}
.note b{color:var(--ink)}
.note.ok{background:var(--ok-bg);border-color:#bde3cb}
.note.warn{background:var(--warn-bg);border-color:#f0dcb4}
.note.crit{background:var(--crit-bg);border-color:#f2cdc9}
.note.brand{background:#e4f5ef;border-color:#b4e3d3}
footer{max-width:1020px;margin:32px auto 0;padding:18px 24px 40px;border-top:1px solid var(--line);
 font-size:11.2px;color:var(--ink-3);line-height:1.75}
@media print{body{background:#fff}.card,table{box-shadow:none}h2{page-break-after:avoid}
 .card,table,.note{page-break-inside:avoid}header{background:#0f2233!important;-webkit-print-color-adjust:exact}}
"""

BODY = rd(ROOT / "src" / "spec_body.html")
html = f"""<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PromoSignal DSS — Revision 1 · สเปกและแผนงาน</title>
<style>{rd(SHARED / 'kanit_font.css')}</style><style>{CSS}</style></head><body>{BODY}</body></html>"""
out = ROOT / "out" / "Revision1_Spec.html"
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

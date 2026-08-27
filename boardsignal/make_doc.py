"""สร้างเอกสารสรุปความต้องการ + ตารางเทียบ เป็นไฟล์ HTML ไฟล์เดียว (พิมพ์เป็น PDF ได้)"""
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SH = Path("/tmp/bq")
FONT = (ROOT / "src" / "kanit_font.css").read_text(encoding="utf-8")
img = lambda n: "data:image/jpeg;base64," + base64.b64encode((SH / f"{n}.jpg").read_bytes()).decode()
FLOW = "data:image/png;base64," + base64.b64encode(
    (ROOT / "out" / "BoardSignal_UserFlow_small.png").read_bytes()).decode()

BODY = Path(ROOT / "src" / "doc_body.html").read_text(encoding="utf-8")
for k, n in [("__IMG_LOGIN__", "sh-login"), ("__IMG_FIT__", "sh-fit"), ("__IMG_MATRIX__", "sh-matrix"),
             ("__IMG_PAYWALL__", "sh-paywall"), ("__IMG_PEER__", "sh-peer"),
             ("__IMG_STUDIO__", "sh-studio"), ("__IMG_BILLING__", "sh-billing"),
             ("__IMG_WF__", "sh-wf"), ("__IMG_UPSIDE__", "sh-upside"), ("__IMG_PORT__", "sh-port"),
             ("__IMG_IC__", "sh-ic"), ("__IMG_MEMO__", "sh-memo")]:
    BODY = BODY.replace(k, img(n))
BODY = BODY.replace("__IMG_FLOW__", FLOW)
assert "__IMG_" not in BODY, "ยังมีภาพที่ยังไม่ฝัง"

CSS = """
:root{--ink:#0e1726;--ink2:#44536b;--ink3:#8a97ab;--line:#e2e7ef;--bg:#f4f6fa;--panel:#fff;
 --brand:#1b4dd8;--accent:#f0a500;--ok:#0ca30c;--warn:#fab219;--crit:#d03b3b;--s1:#2a78d6;--s3:#1baf7a;}
*{box-sizing:border-box}
body{margin:0;font-family:Kanit,system-ui,sans-serif;font-weight:300;font-size:14.5px;line-height:1.72;
 color:var(--ink);background:var(--bg)}
.wrap{max-width:1000px;margin:0 auto;padding:0 26px 70px}
header{background:linear-gradient(150deg,#0c1a33,#12306e);color:#fff;padding:46px 26px 40px;margin-bottom:30px}
header .inner{max-width:1000px;margin:0 auto}
h1{font-size:31px;font-weight:500;letter-spacing:-.03em;margin:0 0 8px;line-height:1.28}
header p{margin:0;color:#a9bcd8;font-size:14px;max-width:74ch}
h2{font-size:22px;font-weight:500;letter-spacing:-.025em;margin:44px 0 4px;padding-top:22px;border-top:2px solid var(--line)}
h2:first-of-type{border-top:0;padding-top:0}
h3{font-size:16px;font-weight:500;margin:26px 0 6px}
h4{font-size:13.5px;font-weight:500;margin:18px 0 4px}
p{margin:9px 0}
.lead{font-size:15.5px;color:var(--ink2);margin:4px 0 18px;max-width:78ch}
.eyebrow{font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--brand);font-weight:500}
b,strong{font-weight:500}
ul,ol{margin:9px 0;padding-left:22px}li{margin:4px 0}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px 23px;margin:16px 0;
 box-shadow:0 1px 2px rgba(14,23,38,.04),0 8px 26px rgba(14,23,38,.05)}
.tw{overflow-x:auto;margin:14px 0}
table{width:100%;border-collapse:collapse;font-size:13px;background:var(--panel);border-radius:12px;overflow:hidden}
th{text-align:left;font-weight:500;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink3);
 padding:10px 12px;border-bottom:1.5px solid var(--line);background:#fafbfd;white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr:last-child td{border-bottom:0}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.yes{color:var(--ok);font-weight:500}.no{color:var(--ink3)}.part{color:var(--warn)}
.note{border-radius:11px;padding:13px 16px;font-size:12.8px;line-height:1.7;color:var(--ink2);background:#eef2f8;margin:14px 0}
.note b{color:var(--ink)}
.note.ok{background:#e9f7ee}.note.warn{background:#fdf4e3}.note.crit{background:#fbeceb}.note.brand{background:#eaf0fd}
.pill{display:inline-block;font-size:10.5px;font-weight:500;padding:2px 9px;border-radius:99px;white-space:nowrap}
.pill.must{background:#fbeceb;color:#a32b2b}.pill.should{background:#fdf4e3;color:#8a6300}
.pill.could{background:#eef2f8;color:#44536b}.pill.cut{background:#e9f7ee;color:#0a7d0a}
figure{margin:18px 0}
figure img{width:100%;border-radius:12px;border:1px solid var(--line);display:block;box-shadow:0 2px 20px rgba(14,23,38,.09)}
figcaption{font-size:11.5px;color:var(--ink3);margin-top:7px;line-height:1.6}
.grid{display:grid;gap:14px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}
@media(max-width:820px){.g2,.g3{grid-template-columns:1fr}}
.sw{height:44px;border-radius:9px;display:flex;overflow:hidden;margin-bottom:8px}
.sw i{flex:1}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.kpi .v{font-size:26px;font-weight:500;letter-spacing:-.03em;line-height:1.15}
.kpi .k{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3)}
.kpi .u{font-size:11.5px;color:var(--ink2);margin-top:2px}
footer{max-width:1000px;margin:40px auto 0;padding:20px 26px 40px;border-top:1px solid var(--line);
 font-size:11.5px;color:var(--ink3);line-height:1.7}
@media print{body{background:#fff}.card,figure img{box-shadow:none}h2{page-break-after:avoid}
 figure,table,.card{page-break-inside:avoid}header{background:#0c1a33!important;-webkit-print-color-adjust:exact}}
"""

html = f"""<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Board Signal — สรุปความต้องการและฟีเจอร์ต้นแบบ</title>
<style>{FONT}</style><style>{CSS}</style></head><body>{BODY}</body></html>"""

out = ROOT / "out" / "BoardSignal_Requirements.html"
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

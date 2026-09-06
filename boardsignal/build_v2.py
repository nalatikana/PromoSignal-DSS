"""ประกอบ OpenInnoScore™ (แก้ไขครั้งที่ 1) เป็นไฟล์ HTML เดียว
   ต่อยอดจากซอร์สของ Board Signal เวอร์ชันแรก (commit e434271) โดยไม่แตะไฟล์ต้นฉบับ"""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SHARED = ROOT.parent / "src"
rd = lambda p: Path(p).read_text(encoding="utf-8")
b64png = lambda p: "data:image/png;base64," + base64.b64encode(Path(p).read_bytes()).decode()

html = rd(ROOT / "src" / "v2.html")
parts = {
    "/*__FONT__*/": rd(SHARED / "sarabun_font.css"),
    "/*__THEME__*/": rd(ROOT / "src" / "v2_theme.css"),
    "/*__PDFWORKER__*/": rd(SHARED / "vendor" / "pdf.worker.min.js"),
    "/*__PDFJS__*/": rd(SHARED / "vendor" / "pdf.min.js"),
    "/*__DATA__*/": json.dumps(json.loads(rd(ROOT / "src" / "prof_data.json")), ensure_ascii=False),
    "/*__LOGO__*/": json.dumps(b64png(ROOT / "src" / "brandsrc" / "ois_mark_256.png")),
    "/*__LOGO_LOCKUP__*/": json.dumps(b64png(ROOT / "src" / "brandsrc" / "ois_lockup_480.png")),
    "/*__LOGO_SMALL__*/": json.dumps(b64png(ROOT / "src" / "brandsrc" / "ois_mark_96.png")),
    "/*__LEX__*/": rd(ROOT / "src" / "lex.js"),
    "/*__APP__*/": rd(ROOT / "src" / "v2_app.js"),
    "/*__INVEST__*/": rd(ROOT / "src" / "v2_invest.js"),
}
for k, v in parts.items():
    assert k in html, f"ไม่พบ placeholder {k}"
    assert "</script" not in v or k in ("/*__PDFJS__*/", "/*__PDFWORKER__*/"), f"{k} มี </script"
    html = html.replace(k, v, 1)

out = ROOT / "out" / "OpenInnoScore_v2.html"
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

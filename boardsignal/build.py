"""ประกอบ Board Signal เป็นไฟล์ HTML เดียว"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
rd = lambda p: Path(p).read_text(encoding="utf-8")

html = rd(ROOT / "src" / "app.html")
parts = {
    "/*__FONT__*/": rd(ROOT / "src" / "kanit_font.css"),
    "/*__THEME__*/": rd(ROOT / "src" / "theme.css"),
    "/*__PDFWORKER__*/": rd(ROOT / "src" / "vendor" / "pdf.worker.min.js"),
    "/*__PDFJS__*/": rd(ROOT / "src" / "vendor" / "pdf.min.js"),
    "/*__DATA__*/": json.dumps(json.loads(rd(ROOT / "src" / "prof_data.json")), ensure_ascii=False),
    "/*__LEX__*/": rd(ROOT / "src" / "lex.js"),
    "/*__APP__*/": rd(ROOT / "src" / "app.js"),
    "/*__INVEST__*/": rd(ROOT / "src" / "invest.js"),
}
for k, v in parts.items():
    assert k in html, f"ไม่พบ placeholder {k}"
    assert "</script" not in v or k in ("/*__PDFJS__*/", "/*__PDFWORKER__*/"), f"{k} มี </script"
    html = html.replace(k, v, 1)

out = ROOT / "out" / "BoardSignal.html"
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

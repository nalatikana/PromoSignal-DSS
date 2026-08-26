"""ประกอบ Board Signal เป็นไฟล์ HTML ไฟล์เดียว → docs/boardsignal/index.html

ใช้ฟอนต์ Kanit และไลบรารี pdf.js ร่วมกับโปรเจกต์ PromoSignal ที่อยู่ใน src/ ของ repo
จึงไม่ต้องเก็บไฟล์เดียวกันสองชุด

    python3 boardsignal/build.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent          # boardsignal/
REPO = HERE.parent                              # รากของ repo
SHARED = REPO / "src"                           # ฟอนต์และ vendor ที่ใช้ร่วมกัน
rd = lambda p: Path(p).read_text(encoding="utf-8")

html = rd(HERE / "src" / "app.html")
parts = {
    "/*__FONT__*/": rd(SHARED / "kanit_font.css"),
    "/*__THEME__*/": rd(HERE / "src" / "theme.css"),
    "/*__PDFWORKER__*/": rd(SHARED / "vendor" / "pdf.worker.min.js"),
    "/*__PDFJS__*/": rd(SHARED / "vendor" / "pdf.min.js"),
    "/*__DATA__*/": json.dumps(json.loads(rd(HERE / "src" / "prof_data.json")), ensure_ascii=False),
    "/*__LEX__*/": rd(HERE / "src" / "lex.js"),
    "/*__APP__*/": rd(HERE / "src" / "app.js"),
}
for k, v in parts.items():
    assert k in html, f"ไม่พบ placeholder {k}"
    html = html.replace(k, v, 1)

out = REPO / "docs" / "boardsignal" / "index.html"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print("wrote", out.relative_to(REPO), round(out.stat().st_size / 1e6, 2), "MB")

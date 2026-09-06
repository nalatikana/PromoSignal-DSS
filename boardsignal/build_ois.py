"""ประกอบ OpenInnoScore™ เป็นไฟล์ HTML เดียว
   ชั้นคำนวณตัดมาจาก boardsignal/src/app.js + invest.js ตอนบิลด์ ไม่เขียนสูตรใหม่"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SHARED = ROOT.parent / "src"
rd = lambda p: Path(p).read_text(encoding="utf-8")

APP = rd(ROOT / "src" / "app.js")
INV = rd(ROOT / "src" / "invest.js")

def cut(src, start, end, label):
    i = src.index(start) if start else 0
    j = src.index(end, i) if end else len(src)
    out = src[i:j]
    assert len(out) > 200, f"ชิ้นส่วน {label} สั้นผิดปกติ"
    return out

CORE = "\n".join([
    "/* ===== ชั้นข้อมูลและคณิตศาสตร์ — ตัดจาก boardsignal/src/app.js ตอนบิลด์ ===== */",
    cut(APP, None, "/* ---------------------------------------------------------------- 2 · สถานะ */", "app-core"),
    "/* ===== เครื่องนับคำภาษา CEO — ตัดจาก app.js ===== */",
    cut(APP, "function countWords(t) {", "function renderCeoOut(", "lex-core"),
    cut(APP, "async function readFileText(f) {", "/* ============", "reader"),
    "/* ===== ชั้นวิเคราะห์เชิงลงทุน — ตัดจาก boardsignal/src/invest.js ===== */",
    cut(INV, "/* ---------------------------------------------------------------- เครื่องมือสถิติ */",
        "/* ============================================================================\n   ส่วนแสดงผล", "invest-core"),
])

html = rd(ROOT / "src" / "ois.html")
parts = {
    "/*__FONT__*/": rd(SHARED / "sarabun_font.css"),
    "/*__CSS__*/": rd(ROOT / "src" / "ois.css"),
    "/*__PDFWORKER__*/": rd(SHARED / "vendor" / "pdf.worker.min.js"),
    "/*__PDFJS__*/": rd(SHARED / "vendor" / "pdf.min.js"),
    "/*__DATA__*/": json.dumps(json.loads(rd(ROOT / "src" / "prof_data.json")), ensure_ascii=False),
    "/*__LOGO__*/": json.dumps(rd(ROOT / "src" / "logo_mark.svg"), ensure_ascii=False),
    "/*__LOGO_DARK__*/": json.dumps(rd(ROOT / "src" / "logo_mark_dark.svg"), ensure_ascii=False),
    "/*__LEX__*/": rd(ROOT / "src" / "lex.js"),
    "/*__CORE__*/": CORE,
    "/*__APP__*/": rd(ROOT / "src" / "ois.js"),
}
for k, v in parts.items():
    assert k in html, f"ไม่พบ placeholder {k}"
    assert "</script" not in v or k in ("/*__PDFJS__*/", "/*__PDFWORKER__*/"), f"{k} มี </script"
    html = html.replace(k, v, 1)

out = ROOT / "out" / "OpenInnoScore.html"
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

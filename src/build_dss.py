"""ประกอบ Decision Support System เป็นไฟล์ HTML เดียวแบบ self-contained"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VEND = ROOT / "src" / "vendor"
rd = lambda p: Path(p).read_text(encoding="utf-8")

html = rd(ROOT / "src" / "dss_template.html")
parts = {
    "/*__FONT__*/": rd(ROOT / "src" / "kanit_font.css"),
    "/*__PDFJS__*/": rd(VEND / "pdf.min.js"),
    "/*__PDFWORKER__*/": rd(VEND / "pdf.worker.min.js"),
    "/*__FFLATE__*/": rd(VEND / "fflate.min.js"),
    "/*__MODEL__*/": rd(ROOT / "out" / "dss_model.json"),
    "/*__LEX__*/": rd(ROOT / "src" / "ingest_lexicon.js"),
    "/*__APP__*/": rd(ROOT / "src" / "dss_app.js"),
}
for k, v in parts.items():
    assert k in html, f"ไม่พบ placeholder {k}"
    html = html.replace(k, v)

out = ROOT / "out" / "PromoSignal_DSS.html"
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

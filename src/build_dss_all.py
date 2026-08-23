"""ประกอบ DSS + เอกสารทั้งสองฉบับเป็นไฟล์ HTML เดียว (ลิงก์เดียว)

เพิ่มแท็บ "ขั้นตอนใช้งาน" และ "ระบบทำงานอย่างไร" เข้าไปในแถบเดียวกับขั้นที่ 1–3
CSS ของเอกสารถูกจำกัดขอบเขต (scope) ด้วย .docpane เพื่อไม่ให้ชนกับสไตล์ของตัวระบบ
"""
import base64
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VEND = ROOT / "src" / "vendor"
SHOTS = Path("/tmp/ws")
rd = lambda p: Path(p).read_text(encoding="utf-8")

# ---------------------------------------------------------------- 1. ตัวระบบ
html = rd(ROOT / "src" / "dss_template.html")
for k, v in {
    "/*__FONT__*/": rd(ROOT / "src" / "kanit_font.css"),
    "/*__PDFJS__*/": rd(VEND / "pdf.min.js"),
    "/*__PDFWORKER__*/": rd(VEND / "pdf.worker.min.js"),
    "/*__FFLATE__*/": rd(VEND / "fflate.min.js"),
    "/*__MODEL__*/": rd(ROOT / "out" / "dss_model.json"),
    "/*__LEX__*/": rd(ROOT / "src" / "ingest_lexicon.js"),
    "/*__APP__*/": rd(ROOT / "src" / "dss_app.js"),
}.items():
    assert k in html, f"ไม่พบ placeholder {k}"
    html = html.replace(k, v)


# ---------------------------------------------------------------- 2. เครื่องมือ
def scope_css(css: str, sel: str) -> str:
    """เติม prefix ให้ทุก selector เพื่อจำกัดขอบเขตไว้ในกล่องเดียว

    ข้าม :root และ @font-face (ตัวระบบประกาศไว้แล้ว) · แปลง body/* เป็น prefix
    · เข้าไปจัดการภายใน @media ด้วย
    """
    out, i, n = [], 0, len(css)
    while i < n:
        if css[i] == "@":
            j = css.index("{", i)
            at = css[i:j].strip()
            depth, k = 1, j + 1
            while depth:
                if css[k] == "{":
                    depth += 1
                elif css[k] == "}":
                    depth -= 1
                k += 1
            body = css[j + 1:k - 1]
            if at.startswith("@media"):
                out.append(f"{at}{{{scope_css(body, sel)}}}")
            # @font-face / @import / อื่น ๆ ตัดทิ้ง (ตัวระบบมีอยู่แล้ว)
            i = k
            continue
        j = css.find("{", i)
        if j == -1:
            break
        k = css.index("}", j)
        raw, decl = css[i:j].strip(), css[j + 1:k].strip()
        i = k + 1
        if not raw or not decl:
            continue
        parts = []
        for s in raw.split(","):
            s = s.strip()
            if not s or s.startswith(":root"):
                continue
            if s in ("*", "body", "html"):
                parts.append(sel)
            elif s.startswith(("body ", "html ")):
                parts.append(f"{sel} {s.split(' ', 1)[1]}")
            else:
                parts.append(f"{sel} {s}")
        if parts:
            out.append(f"{', '.join(parts)}{{{decl}}}")
    return "".join(out)


def load_doc(src: str, embed_images: bool) -> tuple[str, str]:
    """คืน (css ที่ scope แล้ว, เนื้อหา body) ของเอกสารหนึ่งฉบับ"""
    s = rd(ROOT / "src" / src)
    if embed_images:
        for m in sorted(set(re.findall(r"__IMG_([a-z0-9_]+)__", s))):
            f = SHOTS / f"{m}.jpg"
            w = Image.open(f).width // 2
            s = s.replace(
                f'<img src="__IMG_{m}__"',
                f'<img style="max-width:{w}px" src="data:image/jpeg;base64,'
                f'{base64.b64encode(f.read_bytes()).decode()}"')
    assert "__IMG_" not in s, f"{src}: ยังมีภาพที่ยังไม่ฝัง"

    styles = re.findall(r"<style>(.*?)</style>", s, re.S)
    css = scope_css(styles[-1], ".docpane")          # ก้อนแรกคือฟอนต์ ข้ามไป

    body = re.search(r"<body>(.*)</body>", s, re.S).group(1)
    body = re.sub(r"<header>.*?</header>", "", body, flags=re.S)   # ตัดหัวเรื่องเดิม
    body = re.sub(r"<footer>.*?</footer>", "", body, flags=re.S)   # ตัดท้ายเรื่องเดิม
    body = re.sub(r'<div class="docnav">.*?</div>', "", body, flags=re.S)
    return css, body.strip()


# ---------------------------------------------------------------- 3. เอกสาร
DOCS = [
    ("howto", "คู่มือ", "ขั้นตอนใช้งาน", "walkthrough.html", True,
     "โยนไฟล์ PDF เข้าไปแล้วทำอะไรต่อ",
     "ขั้นตอนใช้งานจริงทีละหน้าจอ พร้อมภาพประกอบ — เน้นว่าอะไรที่ระบบทำให้อัตโนมัติ และอะไรที่คุณต้องกรอกเอง"),
    ("guide", "คู่มือ", "ระบบทำงานอย่างไร", "explainer.html", False,
     "ระบบนี้ทำงานอย่างไร",
     "คู่มือทำความเข้าใจฉบับอธิบายทีละขั้น สำหรับเตรียมนำเสนอ — ไม่ต้องมีพื้นสถิติมาก่อน ทุกศัพท์เทคนิคมีคำแปลเป็นภาษาคน"),
]

tabs, panes, css_all = [], [], []
for pid, kicker, label, src, imgs, title, dek in DOCS:
    css, body = load_doc(src, imgs)
    css_all.append(css)
    tabs.append(f'<button class="step" role="tab" aria-selected="false" data-p="{pid}">'
                f'<span class="n">{kicker}</span><span class="t">{label}</span></button>')
    panes.append(
        f'<section class="pane" id="p-{pid}">\n'
        f'  <div class="kicker">{kicker}</div>\n'
        f'  <h2 class="sechead">{title}</h2>\n'
        f'  <p class="secsub">{dek}</p>\n'
        f'  <div class="docpane">{body}</div>\n'
        f'</section>')

# ---------------------------------------------------------------- 4. ประกอบ
EXTRA = """
/* ---------- กล่องเอกสารที่ฝังอยู่ในระบบ ---------- */
.docpane{max-width:1000px}
.docpane .wrap{max-width:100%;margin:0;padding:0}
.docpane a{color:var(--azure)}
.steps .step{min-width:150px}
"""
html = html.replace("</style></head>", EXTRA + "".join(css_all) + "</style></head>", 1)
html = html.replace('</nav>', "\n    " + "\n    ".join(tabs) + "\n  </nav>", 1)
html = html.replace("<footer>", "\n".join(panes) + "\n\n<footer>", 1)

# ------------------------------------- 5. ส่วนต่อขยาย v2 + ไฟล์สเปกที่ดาวน์โหลดได้
# ต้องทำเป็นขั้นสุดท้าย และผูกกับ </body> ตัวสุดท้ายของไฟล์
# เพราะ dss_app.js มี "</body>" อยู่ในสตริงที่ใช้สร้างรายงาน HTML
import json as _json

SPEC = ROOT / "spec"
spec_files = {
    "example": rd(SPEC / "example_model.json"),
    "R": rd(SPEC / "export_model.R"),
    "do": rd(SPEC / "export_model.do"),
    "schema": rd(SPEC / "model_contract.schema.json"),
}
for k, v in spec_files.items():
    assert "</script" not in v, f"ไฟล์สเปก {k} มี </script อยู่ภายใน จะทำให้ HTML แตก"
v2 = ("const SPEC_FILES = " + _json.dumps(spec_files, ensure_ascii=False) + ";\n"
      + rd(ROOT / "src" / "dss_v2.js"))
assert "</script" not in v2, "dss_v2.js มี </script อยู่ภายใน"

i = html.rindex("</body>")
html = html[:i] + "<script>" + v2 + "</script>\n" + html[i:]

out = ROOT / "out" / "PromoSignal_DSS.html"
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

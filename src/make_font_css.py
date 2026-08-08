"""สร้าง CSS @font-face ของ Kanit แบบฝัง base64 (self-contained)"""
import base64
from pathlib import Path

SRC = Path("/tmp/kanit/package/files")
OUT = Path(__file__).resolve().parents[1] / "src" / "kanit_font.css"

RANGES = {
    "thai": "U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC",
    "latin": ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,"
              "U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"),
}
WEIGHTS = [400, 500, 600]

parts = []
total = 0
for w in WEIGHTS:
    for sub, rng in RANGES.items():
        f = SRC / f"kanit-{sub}-{w}-normal.woff2"
        b = f.read_bytes()
        total += len(b)
        parts.append(
            "@font-face{font-family:'Kanit';font-style:normal;font-weight:%d;font-display:swap;"
            "src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}"
            % (w, base64.b64encode(b).decode(), rng))

OUT.write_text("\n".join(parts), encoding="utf-8")
print(f"เขียน {OUT.name} — ฟอนต์ดิบ {total/1024:.0f} KB -> css {OUT.stat().st_size/1024:.0f} KB")

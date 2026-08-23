from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
docs = ROOT / "docs" / "index.html"
html = docs.read_text(encoding="utf-8")

model = (ROOT / "out" / "dss_model.json").read_text(encoding="utf-8")
html = re.sub(
    r"<script>const M = .*?</script>",
    "<script>const M = " + model + ";</script>",
    html,
    count=1,
    flags=re.S,
)

spec_dir = ROOT / "spec"
spec_files = {
    "example": (spec_dir / "example_model.json").read_text(encoding="utf-8"),
    "R": (spec_dir / "export_model.R").read_text(encoding="utf-8"),
    "do": (spec_dir / "export_model.do").read_text(encoding="utf-8"),
    "schema": (spec_dir / "model_contract.schema.json").read_text(encoding="utf-8"),
}
v2 = "const SPEC_FILES = " + json.dumps(spec_files, ensure_ascii=False) + ";\n"
v2 += (ROOT / "src" / "dss_v2.js").read_text(encoding="utf-8")
if "</script" in v2:
    raise SystemExit("embedded script contains </script")

start = html.rindex("<script>const SPEC_FILES = ")
end = html.index("</script>", start) + len("</script>")
html = html[:start] + "<script>" + v2 + "</script>" + html[end:]

docs.write_text(html, encoding="utf-8")
print("synced", docs)

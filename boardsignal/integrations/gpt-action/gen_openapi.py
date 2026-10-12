# -*- coding: utf-8 -*-
"""สร้าง integrations/gpt-action/openapi.yaml จาก server/public_api.py (แหล่งเดียวกับ /api/openapi.json)
ใช้:  python3 integrations/gpt-action/gen_openapi.py [https://YOUR-SERVICE.onrender.com]"""
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from server.public_api import openapi_spec  # noqa: E402

class NoAlias(yaml.SafeDumper):
    def ignore_aliases(self, data):          # GPT Builder ไม่ชอบ anchor/alias ของ YAML
        return True


url = sys.argv[1] if len(sys.argv) > 1 else "https://YOUR-SERVICE.onrender.com"
head = ("# OpenInnoScore Output API — สำหรับ Custom GPT (Actions) · สร้างจาก server/public_api.py ด้วย gen_openapi.py\n"
        "# แก้ servers.url เป็น URL ของบริการบน Render · Authentication ใน GPT Builder: API Key → Bearer\n")
out = Path(__file__).with_name("openapi.yaml")
out.write_text(head + yaml.dump(openapi_spec(url), Dumper=NoAlias, allow_unicode=True, sort_keys=False, width=120), encoding="utf-8")
print("wrote", out)

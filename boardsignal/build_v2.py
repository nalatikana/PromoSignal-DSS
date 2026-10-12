"""ประกอบ OpenInnoScore™ (แก้ไขครั้งที่ 2) เป็นไฟล์ HTML เดียว
   ต่อยอดจากซอร์สของ Board Signal เวอร์ชันแรก (commit e434271) โดยไม่แตะไฟล์ต้นฉบับ"""
import base64
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# --server = ฉบับสำหรับ Render: ตัดสัมประสิทธิ์/Cholesky ออกจากไฟล์ HTML (ไปคำนวณที่ server/app.py แทน)
SERVER = "--server" in sys.argv[1:]
SHARED = ROOT / "src"  # ไฟล์ร่วม (ฟอนต์, pdf.js) อยู่ในโฟลเดอร์ src ของ repo นี้; ใน PromoSignal-DSS ชี้ไป ../src ได้
if not (SHARED / "sarabun_font.css").exists():
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
    "/*__OIS__*/": None,  # เติมด้านล่าง (ต่างกันระหว่างโหมดออฟไลน์กับโหมดเซิร์ฟเวอร์)
    "/*__LOGO__*/": json.dumps(b64png(ROOT / "src" / "brandsrc" / "ois_mark_256.png")),
    "/*__LOGO_LOCKUP__*/": json.dumps(b64png(ROOT / "src" / "brandsrc" / "ois_lockup_480.png")),
    "/*__LOGO_SMALL__*/": json.dumps(b64png(ROOT / "src" / "brandsrc" / "ois_mark_96.png")),
    "/*__LEX__*/": rd(ROOT / "src" / "lex.js"),
    "/*__APP__*/": (rd(ROOT / "src" / "v2_remote.js") + "\n" if SERVER else "") + rd(ROOT / "src" / "v2_app.js"),
    "/*__INVEST__*/": rd(ROOT / "src" / "v2_invest.js"),
    "/*__STRATEGY__*/": rd(ROOT / "src" / "v2_strategy.js"),
    "/*__PILOT__*/": rd(ROOT / "src" / "v2_pilot.js"),
    "/*__REPORTS__*/": rd(ROOT / "src" / "v2_reports.js"),
    "/*__TIERS__*/": rd(ROOT / "src" / "v2_tiers.js"),
    "/*__ASSESS__*/": rd(ROOT / "src" / "v2_assess.js"),
    "/*__MVP__*/": rd(ROOT / "src" / "v2_mvp.js"),
}
OIS_FULL = json.loads(rd(ROOT / "src" / "ois_model.json"))


def server_ois(d):
    """ois_model.json ฉบับไม่มีสูตร — ตัด par / chol และตัดความเชื่อมโยงระหว่างค่าป้อนกับ amp ของจุดอ้างอิง"""
    sys.path.insert(0, str(ROOT / "server"))
    import ois_engine as E
    E.load_model(ROOT)                      # ตรวจว่า ois_core ตรงกับ ois_model.json
    kr = E.KR(d["pts"], d["reps"], d["seed"])
    d = dict(d)
    d.pop("par"); d.pop("chol")
    d["server"] = True
    d["note"] = "ฉบับเซิร์ฟเวอร์: สูตรและ V̂f อยู่บนเซิร์ฟเวอร์เท่านั้น — เบราว์เซอร์ได้รับเฉพาะผลลัพธ์"
    # pts: [P_w, amp, quad, tier, ind, year] + คอลัมน์ cF/cG/cW ที่ "เรียงแยกกันทีละคอลัมน์"
    # คงการกระจายของฐานอ้างอิง (ฮิสโตแกรมในโหมดนอกกลุ่มอ้างอิงยังถูก) แต่แถวไม่ผูกกับ amp อีกต่อไป
    # จึงถอดสัมประสิทธิ์ด้วย regression จาก 928 จุดไม่ได้
    cols = [sorted(p[i] for p in d["pts"]) for i in (6, 7, 8)]
    d["pts"] = [p[:6] + [cols[0][j], cols[1][j], cols[2][j]] for j, p in enumerate(d["pts"])]
    # ค่าตั้งต้นของแคชฝั่งเบราว์เซอร์: amp, ampT1, ช่วง 90% (KR) ของค่าป้อนฐานของแต่ละบริษัท
    # (ให้หน้าแรกแสดงผลได้ทันทีโดยไม่ต้องรอเซิร์ฟเวอร์ และตรงกับที่โหมดออฟไลน์คำนวณสด)
    sv = {}
    for c in json.loads(rd(ROOT / "src" / "prof_data.json"))["comps"]:
        if not all(isinstance(c.get(k), (int, float)) for k in ("promo", "fam", "fem")):
            continue
        sv[c["t"]] = [E.amp_of(c["fam"], c.get("pol"), c["fem"]), E.amp_t1(c["fem"]),
                      *E.KR.band90(kr, c["promo"], c["fam"], c.get("pol"), c["fem"])]
    d["sv"] = sv
    return d


parts["/*__OIS__*/"] = json.dumps(server_ois(OIS_FULL) if SERVER else OIS_FULL, ensure_ascii=False)
for k, v in parts.items():
    assert k in html, f"ไม่พบ placeholder {k}"
    assert "</script" not in v or k in ("/*__PDFJS__*/", "/*__PDFWORKER__*/"), f"{k} มี </script"
    html = html.replace(k, v, 1)

if SERVER:
    # ด่านสุดท้าย: ไฟล์ HTML ฉบับเซิร์ฟเวอร์ต้องไม่มีตัวเลขของสูตรหลุดไปแม้แต่ตัวเดียว
    import re
    sys.path.insert(0, str(ROOT / "model"))
    import ois_core as K
    # หมายเหตุ: "0.2105" เฉย ๆ ชนกับค่า promo ของบริษัทหนึ่งใน prof_data โดยบังเอิญ จึงตรวจที่ 5 ตำแหน่ง
    secrets = ["0.21057", "3.7251", "0.42003", "0.98413", "0.26401", "4.14721", "0.91193", "0.21793", "0.0029791"]
    secrets += [repr(x) for x in (K.B1, K.DF, K.DG, K.DW, K.DT, K.FE_B1, K.FE_DF, K.FE_DG, K.FE_DW)]
    secrets += [f"{abs(x):.6f}".rstrip("0") for row in K.VF for x in row if x]          # V̂f
    secrets += [f"{abs(x):.8f}" for row in K.chol(K.VF) for x in row if abs(x) > 1e-9]  # Cholesky
    leak = [t for t in secrets if t in html]
    assert not leak, f"ไฟล์ฉบับเซิร์ฟเวอร์มีตัวเลขของสูตรหลุด: {leak}"
    assert not re.search(r'"chol"|"par"\s*:', html), "ไฟล์ฉบับเซิร์ฟเวอร์ยังมี par/chol"
    assert '"server": true' in html or '"server":true' in html

out = ROOT / "out" / ("OpenInnoScore_server.html" if SERVER else "OpenInnoScore_v2.html")
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

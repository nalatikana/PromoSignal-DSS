"""ประกอบ OpenInnoScore™ (แก้ไขครั้งที่ 2) เป็นไฟล์ HTML เดียว
   ต่อยอดจากซอร์สของ Board Signal เวอร์ชันแรก (commit e434271) โดยไม่แตะไฟล์ต้นฉบับ"""
import base64
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# --server = ฉบับสำหรับ Render: ตัดบันทึกพารามิเตอร์ทั้งหมด (สัมประสิทธิ์ · Cholesky · ค่าเฉลี่ย · จุดตัด · ฐานอ้างอิงดิบ · amp/cP รายบริษัท)
#            ออกจากไฟล์ HTML — ค่าป้อนใหม่คำนวณที่ /api/score ของ server/app.py
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
    "/*__AI__*/": rd(ROOT / "src" / "v2_ai.js"),
    "/*__DATAMOD__*/": rd(ROOT / "src" / "v2_data.js"),
    # ชั้นแปลภาษาอังกฤษ: พจนานุกรม src/i18n/en.json ({ไทย: English}) ฝังเข้า v2_i18n.js แทน placeholder ในไฟล์นั้น
    "/*__I18N__*/": rd(ROOT / "src" / "v2_i18n.js").replace(
        "/*__I18NDICT__*/{}", json.dumps(json.loads(rd(ROOT / "src" / "i18n" / "en.json")), ensure_ascii=False).replace("</", "<\\/"), 1),
}
OIS_FULL = json.loads(rd(ROOT / "src" / "ois_model.json"))
PROF = json.loads(rd(ROOT / "src" / "prof_data.json"))

# คีย์ที่ฉบับเซิร์ฟเวอร์ได้รับ — นอกนั้นตัดทิ้งทั้งหมด (allow-list ไม่ใช่ deny-list: คีย์ใหม่ใน ois_model.json จะไม่หลุดไปเอง)
SERVER_KEEP = ("version", "tierCuts", "vth", "zone", "quadName", "weakInd", "critMass", "regime", "indValid",
               "t10", "qn", "nk928", "hist")


def server_ois(d):
    """ois_model.json ฉบับไม่มีบันทึกพารามิเตอร์ (DP6)
    ตัด: par · chol · mean (ค่าเฉลี่ย centring) · cut (จุดตัด p5/p95) · ฐานอ้างอิงดิบ (refB/refInd/refT1/refP/refAmp/refFull)
         · amp / cP / cF / cG / cW / B รายบริษัท · คอลัมน์ P_w / amp / cF / cG / cW ของจุดอ้างอิง
    เหลือ: ค่าที่แสดงบนหน้าจอเท่านั้น — OIS (1 ตำแหน่ง) · tier · quadrant · ช่วง 90% (1 ตำแหน่ง) · เปอร์เซ็นไทล์ amp และ
         CEO Promotion Focus (จำนวนเต็ม) · ป้าย clip ของค่าที่เก็บไว้ · จุดพื้นหลังเป็นเปอร์เซ็นไทล์ · ตำแหน่งเปอร์เซ็นไทล์ของเส้นแบ่ง (zA, zP)
         · จุดอ้างอิงช่อง A (dlv: dp/ap/ipi/n/scope ต่ออุตสาหกรรม + all — นิยามเดียวกับฉบับออฟไลน์)
         (ไม่มีเครื่องหมาย csg/asg แยก — quadrant ที่แสดงอยู่แล้วบอกเครื่องหมาย)
    What-if (กรรมการหญิง/อายุงานของบริษัทที่มีอยู่) คำนวณที่ /api/score · บริษัท-ปีใหม่คำนวณใน server/data_api.py"""
    sys.path.insert(0, str(ROOT / "server"))
    import ois_engine as E
    eng = E.Engine(E.load_model(ROOT), PROF["comps"], kr=False)   # ตรวจว่า ois_core ตรงกับ ois_model.json
    o = {k: d[k] for k in SERVER_KEEP if k in d}
    o.update(server=True, record=eng.record_id, zA=eng.zA, zP=eng.zP,
             note="ฉบับเซิร์ฟเวอร์: บันทึกพารามิเตอร์ (สัมประสิทธิ์ ค่าเฉลี่ย จุดตัด V̂f ฐานอ้างอิงดิบ) อยู่บนเซิร์ฟเวอร์เท่านั้น — "
                  "เบราว์เซอร์ได้รับเฉพาะผลลัพธ์ระดับเปอร์เซ็นไทล์",
             pts=eng.ref_points(), dlv=eng.deliver_display(),
             co={c["t"]: eng.firm_display(c) for c in PROF["comps"] if c["t"] in d["co"]})
    return o


def server_data(p):
    """prof_data.json ฉบับเซิร์ฟเวอร์ — ตัด amp ดิบ (4 ตำแหน่ง) ของบริษัทและค่าเฉลี่ย amp รายอุตสาหกรรม
    ซึ่งเมื่อจับคู่กับค่าป้อนจะถอดสัมประสิทธิ์ได้ · ap/dp/ipi ย้ายไปอยู่ใน OIS.co (ค่าจากเซิร์ฟเวอร์)"""
    p = json.loads(json.dumps(p))
    for c in p["comps"]:
        for k in ("amp", "ap", "dp", "ipi"):
            c.pop(k, None)
    for v in p.get("indstats", {}).values():
        v.pop("amp", None)
    return p


parts["/*__DATA__*/"] = json.dumps(server_data(PROF) if SERVER else PROF, ensure_ascii=False)
parts["/*__OIS__*/"] = json.dumps(server_ois(OIS_FULL) if SERVER else OIS_FULL, ensure_ascii=False)
for k, v in parts.items():
    assert k in html, f"ไม่พบ placeholder {k}"
    assert "</script" not in v or k in ("/*__PDFJS__*/", "/*__PDFWORKER__*/"), f"{k} มี </script"
    html = html.replace(k, v, 1)

if SERVER:
    # ด่านสุดท้าย: ไฟล์ HTML ฉบับเซิร์ฟเวอร์ต้องไม่มีตัวเลขของบันทึกพารามิเตอร์หลุดไปแม้แต่ตัวเดียว
    import re
    sys.path.insert(0, str(ROOT / "model"))
    import ois_core as K
    # สัมประสิทธิ์ (ปัด 4–5 ตำแหน่ง และ full precision) — "0.2105" เฉย ๆ ชนกับค่า promo ของบริษัทหนึ่งโดยบังเอิญ จึงตรวจที่ 5 ตำแหน่ง
    secrets = ["0.21057", "3.7251", "0.42003", "0.98413", "0.26401", "4.14721", "0.91193", "0.21793", "0.0029791"]
    secrets += [repr(x) for x in (K.B1, K.DF, K.DG, K.DW, K.DT, K.FE_B1, K.FE_DF, K.FE_DG, K.FE_DW)]
    secrets += [f"{abs(x):.6f}".rstrip("0") for row in K.VF for x in row if x]          # V̂f
    secrets += [f"{abs(x):.8f}" for row in K.chol(K.VF) for x in row if abs(x) > 1e-9]  # Cholesky
    # ค่าเฉลี่ย centring (4 หลักนัยสำคัญ ทั้งรูปทศนิยมและร้อยละ) และจุดตัด p5/p95 ที่ไม่ใช่ตัวเลขกลม ๆ
    # (จุดตัด 0 / 0.5 / 1.15 / 2.2 เป็นสตริงทั่วไปที่ปรากฏใน CSS/ข้อความ จึงตรวจด้วยรูปแบบ "cut" และ allow-list ของ OIS แทน)
    sig4 = lambda x: f"{x:.4g}"
    secrets += [sig4(v) for v in K.M.values()] + [sig4(v * 100) for k, v in K.M.items() if k != "T"]
    secrets += [repr(v) for v in K.M.values()]
    secrets += [f"{x:.4f}" for lo_hi in K.CUT.values() for x in lo_hi if x not in (0, 0.5, 1.15)] + ["19.52"]
    # ค่าดิบรายบริษัท/รายแถว: amp, cP, B ของ 196 บริษัท และ amp / B ของฐานอ้างอิง 928 แถว (6 ตำแหน่งขึ้นไป)
    raw = []
    for o in OIS_FULL["co"].values():
        raw += [o["amp"], o["cP"], o["B"], o["cF"], o["cW"]]
    raw += OIS_FULL["refAmp"] + OIS_FULL["refB"] + OIS_FULL.get("refFull", [])
    secrets += sorted({f"{abs(x):.6f}" for x in raw if abs(x) > 1e-4})
    leak = sorted({t for t in secrets if t in html})
    assert not leak, f"ไฟล์ฉบับเซิร์ฟเวอร์มีตัวเลขของบันทึกพารามิเตอร์/ค่าดิบหลุด: {leak[:12]} (รวม {len(leak)})"
    # amp ดิบ 4 ตำแหน่งที่ prof_data เคยฝังไว้ (เช่น "amp": -0.7492)
    assert not re.search(r'"amp"\s*:\s*-?\d', html), "ไฟล์ฉบับเซิร์ฟเวอร์ยังมี amp ดิบใน DATA/OIS"
    assert not re.search(r'"(chol|par|mean|cut|refB|refInd|refT1|refP|refAmp|refFull|sv|cP|cF|cG|cW|csg|asg)"\s*:\s*[-\d\[{]', html), \
        "ไฟล์ฉบับเซิร์ฟเวอร์ยังมีคีย์ของบันทึกพารามิเตอร์ (par/chol/mean/cut/ref*/cP…)"
    assert '"server": true' in html or '"server":true' in html
    print("leak check: OK ·", len(secrets), "สตริงที่ตรวจ")

out = ROOT / "out" / ("OpenInnoScore_server.html" if SERVER else "OpenInnoScore_v2.html")
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB")

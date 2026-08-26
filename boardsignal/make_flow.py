"""แผนภาพ User Flow — จัดกริดใหม่ให้ไม่มีข้อความทับซ้อน

กติกาการวางที่ทำให้ไม่ทับกัน
  1. ช่องซ้าย x = 48–252 สงวนไว้ให้ชื่อเลนเท่านั้น ไม่มีกล่องหรือเส้นเชื่อมเข้ามา
  2. กล่องทุกใบวางบนคอลัมน์ 5 ช่องคงที่ เริ่มที่ x = 270
  3. เส้นเชื่อมเดินได้เฉพาะแนวคอลัมน์และแนวบัสที่กำหนดไว้
  4. ป้ายมุมขวาบนของกล่องกันพื้นที่ให้ก่อน แล้วค่อยตัดบรรทัดหัวข้อตามที่เหลือ
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
FONT = (REPO / "src" / "kanit_font.css").read_text(encoding="utf-8")

W, H = 1680, 1210
C = dict(ink="#0e1726", ink2="#44536b", ink3="#8a97ab", line="#dfe5ee",
         brand="#1b4dd8", nav="#0c1a33", ok="#0ca30c", warn="#fab219",
         accent="#f0a500", crit="#d03b3b", bg="#f4f6fa")

GUT_L, GUT_R = 48, 252          # ช่องซ้ายสงวนไว้ให้ชื่อเลน
COLS = [270, 547, 824, 1101, 1378]
CW = 253
cx = lambda i: COLS[i] + CW / 2

out = []
add = out.append
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
# ความกว้างโดยประมาณต่ออักขระ (ฟอนต์ Kanit น้ำหนัก 300–500)
CHW = {500: 0.545, 300: 0.515}


def tw(s, size, weight=300):
    return len(s) * size * CHW.get(weight, .52)


def txt(x, y, s, size=13, fill=None, weight=300, anchor="start"):
    add(f'<text x="{x:.0f}" y="{y:.0f}" font-size="{size}" font-weight="{weight}" '
        f'fill="{fill or C["ink"]}" text-anchor="{anchor}">{esc(s)}</text>')


def wrap(x, y, s, size, fill, weight, maxw, lh, anchor="start"):
    """ตัดบรรทัดตามความกว้างจริงเป็นพิกเซล ไม่ใช่จำนวนอักขระ"""
    words, line, lines = s.split(" "), "", []
    for w in words:
        t = (line + " " + w).strip()
        if tw(t, size, weight) > maxw and line:
            lines.append(line); line = w
        else:
            line = t
    if line:
        lines.append(line)
    for i, l in enumerate(lines):
        txt(x, y + i * lh, l, size, fill, weight, anchor)
    return len(lines) * lh


def box(col, y, title, sub="", h=92, fill="#fff", stroke=None, tcol=None,
        badge=None, bcol=None, span=1, dash=False):
    x = COLS[col]
    w = CW if span == 1 else COLS[col + span - 1] + CW - x
    ds = ' stroke-dasharray="7 5"' if dash else ""
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" '
        f'stroke="{stroke or C["line"]}" stroke-width="1.6"{ds}/>')
    # ป้ายมุมขวาบน — กันพื้นที่ก่อน แล้วค่อยตัดหัวข้อตามที่เหลือ
    reserved = 0
    if badge:
        bw = tw(badge, 10.5, 500) + 18
        add(f'<rect x="{x + w - bw - 13:.0f}" y="{y + 12}" width="{bw:.0f}" height="20" rx="10" '
            f'fill="{bcol or C["accent"]}" opacity=".15"/>')
        txt(x + w - bw / 2 - 13, y + 26, badge, 10.5, bcol or "#8a6300", 500, "middle")
        reserved = bw + 22
    used = wrap(x + 15, y + 28, title, 13.5, tcol or C["ink"], 500, w - 30 - reserved, 18)
    if sub:
        wrap(x + 15, y + 28 + used + 4, sub, 11.3, C["ink2"], 300, w - 30, 15)


def dia(x, y, w, h, label, col=None):
    col = col or C["warn"]
    add(f'<path d="M{x} {y-h/2} L{x+w/2} {y} L{x} {y+h/2} L{x-w/2} {y} Z" '
        f'fill="#fff" stroke="{col}" stroke-width="2"/>')
    n = wrap(x, y - 4, label, 12.5, C["ink"], 500, w - 46, 16, "middle")
    if n > 16:                                   # สองบรรทัด — เลื่อนขึ้นให้อยู่กลางรูป
        out.pop(); out.pop()
        wrap(x, y - 12, label, 12.5, C["ink"], 500, w - 46, 16, "middle")


def line(d, col=None, arrow=True, dash=False):
    mk = ""
    if arrow:
        mk = ' marker-end="url(#arg)"' if col == C["ok"] else ' marker-end="url(#ar)"'
    ds = ' stroke-dasharray="6 5"' if dash else ""
    add(f'<path d="{d}" stroke="{col or C["ink3"]}" stroke-width="2" fill="none"{mk}{ds}/>')


def tag(x, y, s, col=None):
    """ป้ายบนเส้น — วาดพื้นหลังทึบก่อน เพื่อไม่ให้ตัวอักษรทับเส้น"""
    w = tw(s, 10.5, 400) + 14
    add(f'<rect x="{x-w/2:.0f}" y="{y-13}" width="{w:.0f}" height="19" rx="9.5" fill="{C["bg"]}"/>')
    txt(x, y, s, 10.5, col or C["ink2"], 400, "middle")


# ---------------------------------------------------------------- พื้นหลัง
add(f'<rect width="{W}" height="{H}" fill="{C["bg"]}"/>')
add('<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" '
    f'markerHeight="6.5" orient="auto"><path d="M0 0 10 5 0 10z" fill="{C["ink3"]}"/></marker>'
    f'<marker id="arg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" '
    f'markerHeight="6.5" orient="auto"><path d="M0 0 10 5 0 10z" fill="{C["ok"]}"/></marker></defs>')

txt(48, 54, "Board Signal — เส้นทางการใช้งานและจุดเก็บค่าบริการ", 25, C["ink"], 500)
txt(48, 80, "User Flow · ต้นแบบเดือนกันยายน 2569 · ผู้ใช้ใหม่ → ทดลองฟรี → จุดตัดเครดิต → ชำระเงิน → รายงานฉบับเต็ม",
    13, C["ink2"])

LANES = [
    (116, 130, "#eef3fd", "1 · เข้าสู่ระบบ", "ยืนยันตัวตนผ่าน Google ไม่เก็บรหัสผ่าน"),
    (286, 144, "#eefaf4", "2 · ทดลองใช้ฟรี", "เปิดให้ประเมินก่อนจ่าย เพื่อสร้างความเชื่อมั่นในตัวเลข"),
    (556, 240, "#fef6e9", "3 · จุดตัดเครดิตและการชำระเงิน", "จุดที่รายได้เกิดขึ้น"),
    (856, 124, "#f4f1fb", "4 · ผลลัพธ์ที่ผู้ใช้ได้รับ", "สิ่งที่ผู้ใช้เอาไปใช้ต่อในงานจริง"),
]
for y, h, fill, name, sub in LANES:
    add(f'<rect x="{GUT_L}" y="{y}" width="{W - 96}" height="{h}" rx="16" fill="{fill}"/>')
    txt(GUT_L + 18, y + 30, name, 12.5, C["ink"], 500)
    wrap(GUT_L + 18, y + 50, sub, 10.6, C["ink3"], 300, GUT_R - GUT_L - 26, 16)

# ---------------------------------------------------------------- เลน 1
Y1 = 140
box(0, Y1, "เข้าสู่ระบบด้วย Google", "OAuth 2.0 · เก็บเฉพาะอีเมลและรหัสผู้ใช้", 86, stroke=C["brand"])
box(1, Y1, "สร้างบัญชีอัตโนมัติ", "ผู้ใช้ใหม่ได้เครดิตทดลองใช้ 3 ครั้ง", 86, stroke=C["ok"], badge="ฟรี 3", bcol=C["ok"])
box(2, Y1, "เลือกอุตสาหกรรมและบริษัท", "ค้นจาก 196 บริษัทจดทะเบียน 7 กลุ่ม", 86)
box(3, Y1, "ผู้ใช้เดิมกลับเข้าระบบ", "เครดิตและสิทธิ์ที่ซื้อไว้ยังอยู่ครบ", 86)
for i in range(3):
    line(f"M{COLS[i]+CW} {Y1+43} H{COLS[i+1]-6}")

# เชื่อมลงเลน 2 — เดินเป็นมุมฉากผ่านช่องว่างระหว่างเลน ไม่ตัดผ่านชื่อเลน
line(f"M{cx(2)} {Y1+86} V262 H{cx(0)} V294")

# ---------------------------------------------------------------- เลน 2
Y2 = 300
box(0, Y2, "เมทริกซ์ 2×2", "ดูตำแหน่งบริษัทในสี่โซน และคะแนนเป้าหมายที่ต้องได้", 110,
    stroke=C["ok"], badge="ฟรีเสมอ", bcol=C["ok"])
box(1, Y2, "หลักฐานความแม่น", "AUC · สหสัมพันธ์รายปี · ข้อจำกัดที่ต้องรู้ก่อนซื้อ", 110,
    stroke=C["ok"], badge="ฟรีเสมอ", bcol=C["ok"])
box(2, Y2, "รายงานวินิจฉัยบริษัทแรก", "IPI · องค์ประกอบบอร์ด · ข้อเสนอแนะรายบริษัท", 110,
    stroke=C["ok"], badge="ฟรี 1 บริษัท", bcol=C["ok"])
box(3, Y2, "ตัวอย่างแบบเบลอ", "เห็นโครงรายงานที่ยังไม่ปลดล็อก เพื่อให้รู้ว่าจ่ายแล้วได้อะไร", 110,
    stroke=C["warn"], badge="ตัวอย่าง", bcol="#8a6300")
box(4, Y2, "ทำไมต้องให้ลองฟรี", "เครื่องมือประเภทนี้ขายความน่าเชื่อถือ ถ้าไม่ให้ตรวจตัวเลขก่อน ผู้ซื้อจะไม่กล้าจ่าย",
    110, fill=C["bg"], stroke=C["ink3"], dash=True)
for i in range(3):
    line(f"M{COLS[i]+CW} {Y2+55} H{COLS[i+1]-6}")

# ---------------------------------------------------------------- จุดตัดสินใจ
dia(cx(3), 476, 224, 74, "อยากดูมากกว่านี้ไหม")
line(f"M{cx(3)} {Y2+110} V437", arrow=True)

# บัสแยกสายไปยังสี่ฟีเจอร์ที่คิดเครดิต — วางไว้ในช่องว่างระหว่างเลน 2 กับ 3
BUS = 534
line(f"M{cx(3)} 513 V{BUS}", arrow=False)
line(f"M{cx(0)} {BUS} H{cx(3)}", arrow=False)
for i in range(4):
    line(f"M{cx(i)} {BUS} V{570-6}")

# ---------------------------------------------------------------- เลน 3
Y3, BH3 = 576, 104
box(0, Y3, "รายงานบริษัทเพิ่มเติม", "บริษัทที่ 2 ขึ้นไป · ปลดล็อกแล้วดูซ้ำได้ไม่จำกัด", BH3, stroke=C["accent"], badge="1 เครดิต")
box(1, Y3, "เทียบคู่แข่ง 3 ราย", "เปลี่ยนคู่แข่งได้ไม่จำกัดหลังปลดล็อก", BH3, stroke=C["accent"], badge="1 เครดิต")
box(2, Y3, "What-if Studio", "จำลองบอร์ด + ตรวจภาษา CEO จากเอกสารจริง", BH3, stroke=C["accent"], badge="1 เครดิต")
box(3, Y3, "ภาพรวมทั้งอุตสาหกรรม", "ทุกบริษัทในกลุ่ม + ส่งออกไฟล์ CSV", BH3, stroke=C["brand"],
    badge="5 เครดิต", bcol=C["brand"])

# ตรวจเครดิตและเติมเงิน อยู่คอลัมน์ที่ 5 — ไม่มีป้ายบนเส้นช่วงสั้น ๆ เพื่อกันตัวอักษรทับกัน
DY = Y3 + 52
dia(cx(4), DY, 232, 74, "เครดิตพอไหม")
line(f"M{COLS[3]+CW} {DY} H{cx(4)-116-6}")
PAY = Y3 + 124
box(4, PAY, "หน้าแพ็กเกจเครดิต",
    "5 / 15 / 40 เครดิต · พร้อมเพย์หรือบัตร · เติมแล้วกลับไปปลดล็อกได้ทันที",
    86, stroke=C["crit"])
line(f"M{cx(4)} {DY+37} V{PAY-6}", col=C["crit"])
tag(cx(4) + 46, PAY - 12, "ไม่พอ", C["crit"])
# เติมเสร็จแล้วกลับไปที่บัสแยกสาย — เดินอ้อมขอบขวานอกแนวกล่อง จึงไม่มีอะไรทับกัน
line(f"M{COLS[4]+CW} {PAY+43} H{COLS[4]+CW+20} V{BUS} H{cx(3)+10}", col=C["ok"])

# ---------------------------------------------------------------- เลน 4
Y4 = 872
for i in range(4):
    line(f"M{cx(i)} {Y3+BH3} V{Y4-6}")
box(0, Y4, "รายงานฉบับเต็มบนหน้าจอ", "อ่านได้ทันที ไม่ต้องรอไฟล์", 92)
box(1, Y4, "ตารางเทียบคู่แข่ง", "รูปแบบเดียวกับการเทียบแผนประกัน", 92)
box(2, Y4, "ฉากทัศน์การปรับบอร์ด", "ตัวเลขเป้าหมายที่เอาเข้าที่ประชุมได้", 92)
box(3, Y4, "ไฟล์ CSV และรายงานพิมพ์", "เอาไปทำสไลด์หรือแนบวาระประชุมต่อ", 92)
box(4, Y4, "กลับมาใช้ซ้ำ", "สิทธิ์ที่ปลดล็อกแล้วไม่หมดอายุ ผู้ใช้จึงกลับมาเปิดซ้ำได้ตลอด", 92, fill="#fff")
line(f"M{COLS[3]+CW} {Y4+46} H{COLS[4]-6}")

# ---------------------------------------------------------------- สรุปด้านล่าง
YS = 1024
add(f'<rect x="{GUT_L}" y="{YS}" width="{W - 96}" height="140" rx="16" fill="{C["nav"]}"/>')
txt(GUT_L + 26, YS + 34, "หลักคิดของโมเดลรายได้", 15, "#fff", 500)
NOTES = [
    ("ให้ตรวจสอบก่อนจ่าย", "เมทริกซ์และหลักฐานความแม่นเปิดฟรีเสมอ ผู้ซื้อจึงประเมินคุณภาพได้ก่อนควักเงิน"),
    ("จ่ายตามที่ใช้จริง", "ตัดเครดิตรายครั้ง ไม่มีค่าสมาชิกรายเดือน เพราะผู้ใช้ทำงานเป็นดีลเป็นรอบประชุม"),
    ("ปลดล็อกแล้วอยู่ตลอด", "ลดความรู้สึกเสี่ยงตอนกดจ่าย และทำให้ผู้ใช้กลับมาเปิดซ้ำ"),
    ("ขายเป็นชุดได้", "ภาพรวมอุตสาหกรรมราคาสูงกว่า เป็นทางขึ้นราคาโดยไม่ต้องเปลี่ยนโครงระบบ"),
]
for i, (h, d) in enumerate(NOTES):
    x = GUT_L + 26 + i * 384
    txt(x, YS + 66, "◇ " + h, 12.5, "#fff", 500)
    wrap(x, YS + 88, d, 10.8, "#a9bcd8", 300, 348, 15)

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
       f'font-family="Kanit, sans-serif"><style>{FONT}</style>' + "".join(out) + '</svg>')
OUT = REPO / "docs" / "boardsignal"
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "userflow.svg").write_text(svg, encoding="utf-8")
print("wrote svg", round(len(svg) / 1e3, 1), "KB")

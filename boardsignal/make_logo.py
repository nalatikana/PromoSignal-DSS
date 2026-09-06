"""สร้างเครื่องหมายการค้า OpenInnoScore เป็น SVG
   ความหมายของภาพผูกกับโมเดลจริง — ความหนาของเส้นและขนาดจุดมาจากขนาดสัมประสิทธิ์ moderation
"""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
B = json.loads((ROOT / "src" / "prof_data.json").read_text(encoding="utf-8"))["betas"]

NAVY, BLUE, MINT, LINE = "#1F2B37", "#4F76F6", "#77F2A1", "#C9D6E5"
CX = CY = 60.0
R_RING, R_NODE = 47.0, 26.5

# ปัจจัยโครงสร้างคณะกรรมการ 4 ตัว — มุมวางรอบจุดศูนย์กลาง
FACTORS = [
    ("fem", "pXfem", 225),   # บนซ้าย  กรรมการหญิง — สัมประสิทธิ์แรงที่สุด
    ("pol", "pXpol", 315),   # บนขวา   กรรมการสายนโยบาย
    ("ten", "pXten", 45),    # ล่างขวา อายุงานเฉลี่ย — แรงน้อยที่สุด
    ("fam", "pXfam", 135),   # ล่างซ้าย กรรมการครอบครัว
]
MX = max(abs(B[k]) for _, k, _ in FACTORS)

def pt(a, r, cx=CX, cy=CY):
    t = math.radians(a)
    return cx + r * math.cos(t), cy + r * math.sin(t)

def arc(a0, a1, r, cx=CX, cy=CY):
    x0, y0 = pt(a0, r, cx, cy); x1, y1 = pt(a1, r, cx, cy)
    large = 1 if (a1 - a0) % 360 > 180 else 0
    return f"M{x0:.2f} {y0:.2f} A{r} {r} 0 {large} 1 {x1:.2f} {y1:.2f}"

def mark(dark=False):
    """เครื่องหมายวงกลม — คืนเป็นสตริง SVG ชั้นใน
       dark=True ใช้บนพื้นเข้ม โดยเปลี่ยนเฉพาะส่วนที่เป็นสีน้ำเงินเข้มให้เป็นสีอ่อน"""
    ink = "#E7EEF6" if dark else NAVY
    hole = NAVY if dark else "#FFFFFF"
    s = []
    s.append(f'<path d="{arc(160, 330, R_RING)}" fill="none" stroke="{ink}" stroke-width="7" stroke-linecap="round"/>')
    s.append(f'<path d="{arc(333, 40, R_RING)}" fill="none" stroke="{BLUE}" stroke-width="7" stroke-linecap="round"/>')
    # เส้นเชื่อม — ความหนาแปรตามขนาดสัมประสิทธิ์ moderation
    for key, bk, ang in FACTORS:
        t = math.sqrt(abs(B[bk]) / MX)
        x, y = pt(ang, R_NODE)
        s.append(f'<line x1="{CX}" y1="{CY}" x2="{x:.2f}" y2="{y:.2f}" stroke="{BLUE}" '
                 f'stroke-width="{1.0 + 3.4 * t:.2f}" stroke-linecap="round" opacity="{0.42 + 0.58 * t:.2f}"/>')
    # จุดปัจจัย — ขนาดแปรตามขนาดสัมประสิทธิ์เช่นกัน
    for key, bk, ang in FACTORS:
        t = math.sqrt(abs(B[bk]) / MX)
        x, y = pt(ang, R_NODE)
        s.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{3.9 + 3.3 * t:.2f}" fill="{BLUE}"/>')
    # จุดศูนย์กลาง = CEO Regulatory Focus
    s.append(f'<circle cx="{CX}" cy="{CY}" r="9.6" fill="{hole}"/>')
    s.append(f'<circle cx="{CX}" cy="{CY}" r="7.6" fill="{ink}"/>')
    # ลูกศรมิ้นต์ = ผลลัพธ์ Open Innovation ที่เกิดจากความสัมพันธ์นี้
    RA, A0, A1 = 36.5, 155.0, 27.0
    x0, y0 = pt(A0, RA)
    x1, y1 = pt(A1, RA)
    t = math.radians(A1)
    dx, dy = math.sin(t), -math.cos(t)                 # ทิศการเคลื่อนที่ตอนปลายส่วนโค้ง
    px, py = -dy, dx                                   # เวกเตอร์ตั้งฉาก
    ex, ey = x1 - dx * 3.2, y1 - dy * 3.2              # หดส่วนโค้งเข้ามาไม่ให้ทะลุหัวลูกศร
    tipx, tipy = x1 + dx * 8.4, y1 + dy * 8.4
    b1 = (ex + px * 5.6, ey + py * 5.6)
    b2 = (ex - px * 5.6, ey - py * 5.6)
    s.append(f'<path d="M{x0:.2f} {y0:.2f} A{RA} {RA} 0 0 0 {ex:.2f} {ey:.2f}" fill="none" '
             f'stroke="{MINT}" stroke-width="5.2" stroke-linecap="round"/>')
    s.append(f'<path d="M{tipx:.2f} {tipy:.2f} L{b1[0]:.2f} {b1[1]:.2f} L{b2[0]:.2f} {b2[1]:.2f} Z" fill="{MINT}"/>')
    return "\n  ".join(s)

def wrap(inner, label="OpenInnoScore"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"\n'
            f'  role="img" aria-label="OpenInnoScore — CEO Regulatory Focus moderated by Board Composition">\n'
            f'  <title>{label}</title>\n  {inner}\n</svg>')

(ROOT / "src" / "logo_mark.svg").write_text(wrap(mark()), encoding="utf-8")
(ROOT / "src" / "logo_mark_dark.svg").write_text(wrap(mark(dark=True)), encoding="utf-8")

LOCKUP = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 176" width="640" height="176"
  role="img" aria-label="OpenInnoScore — CEO Regulatory Focus x Board Composition Assessment">
  <g transform="translate(4,28)">{mark()}</g>
  <g font-family="Sarabun,system-ui,sans-serif">
    <text x="150" y="72" font-size="42" font-weight="600" fill="{NAVY}" letter-spacing="-1">OpenInnoScore<tspan font-size="18" dy="-14">&#8482;</tspan></text>
    <text x="152" y="100" font-size="15" font-weight="400" fill="{BLUE}">CEO Regulatory Focus &#215; Board Composition Assessment</text>
    <line x1="152" y1="114" x2="612" y2="114" stroke="{LINE}" stroke-width="1"/>
    <text x="152" y="134" font-size="14.5" font-weight="300" fill="#5A6B7D">&#3623;&#3633;&#3604;&#3649;&#3609;&#3623;&#3650;&#3609;&#3657;&#3617; Open Innovation &#3592;&#3634;&#3585; CEO Focus &#3649;&#3621;&#3632;&#3650;&#3588;&#3619;&#3591;&#3626;&#3619;&#3657;&#3634;&#3591;&#3588;&#3603;&#3632;&#3585;&#3619;&#3619;&#3617;&#3585;&#3634;&#3619;</text>
  </g>
</svg>'''
(ROOT / "src" / "logo_lockup.svg").write_text(LOCKUP, encoding="utf-8")
print("wrote logo_mark.svg + logo_lockup.svg")
for key, bk, ang in FACTORS:
    print(f"  {key:4s} beta={B[bk]:+.4f}  width={1.0 + 3.4 * math.sqrt(abs(B[bk]) / MX):.2f}")

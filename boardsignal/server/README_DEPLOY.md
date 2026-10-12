# OpenInnoScore™ · คู่มือติดตั้งเซิร์ฟเวอร์ส่วนตัวบน Render.com

เอกสารนี้อธิบายวิธีเปิดต้นแบบ OpenInnoScore เป็นเว็บไซต์ส่วนตัวที่ต้องเข้าสู่ระบบก่อนใช้งาน
โดย **สูตรคำนวณ (สัมประสิทธิ์ β1 / δF / δG / δW / δT, สัมประสิทธิ์ FE และ covariance / Cholesky) อยู่บนเซิร์ฟเวอร์เท่านั้น**
เบราว์เซอร์ของผู้ใช้ได้รับเฉพาะผลลัพธ์

---

## 1. ภาพรวม

| ส่วน | ไฟล์ | หน้าที่ |
|---|---|---|
| หน้าเว็บฉบับเซิร์ฟเวอร์ | `out/OpenInnoScore_server.html` (สร้างตอน deploy ด้วย `python build_v2.py --server`) | หน้าเดียวกับต้นแบบ แต่ไม่มีสูตรฝังอยู่ ค่า amp / ช่วง 90% ถามจากเซิร์ฟเวอร์ |
| เซิร์ฟเวอร์ | `server/app.py` | หน้าเข้าสู่ระบบ, ส่งหน้าเว็บ, API คำนวณ, API สำหรับ AI และ OCR |
| ชั้นคำนวณลับ | `server/ois_engine.py` + `model/ois_core.py` | สูตร Signal B และ Krinsky–Robb (ผลตรงกับฉบับออฟไลน์) |
| ค่าตั้ง Render | `render.yaml` | สร้างบริการบน Render อัตโนมัติ (Blueprint) |

ไฟล์ออฟไลน์เดิม (`python build_v2.py` → `out/OpenInnoScore_v2.html`) ยังทำงานเหมือนเดิมทุกอย่าง และ **ยังมีสูตรฝังอยู่** (ดูข้อ 8)

---

## 2. เตรียม GitHub (ทำครั้งเดียว)

1. เปิด repo `PromoSignal-DSS` บน GitHub → **Settings → General → Danger Zone → Change repository visibility → Make private**
2. ตรวจว่าใน repo มีไฟล์เหล่านี้ (อยู่ในโฟลเดอร์ `boardsignal/`):
   `build_v2.py`, `src/` (รวม `ois_model.json`, `prof_data.json`), `model/ois_core.py`, `server/`
   ไม่ต้องมีโฟลเดอร์ `ref/` (ไฟล์ CSV ของ STATA) — การ build ไม่ใช้
3. **ย้าย / คัดลอก `render.yaml` ไปไว้ที่รากของ repo** (ระดับเดียวกับโฟลเดอร์ `boardsignal/`)
   Render อ่าน Blueprint จากรากของ repo ไฟล์นี้ตั้ง `rootDir: boardsignal` ไว้แล้ว
   - ถ้าในหน้า Blueprint ของ Render มีช่องให้ระบุตำแหน่งไฟล์ Blueprint ก็ใส่ `boardsignal/render.yaml` แทนการย้ายได้
   - ถ้าแยก `boardsignal/` ออกเป็น repo ของตัวเอง ให้ลบบรรทัด `rootDir: boardsignal` ออก
   - ไฟล์ร่วม (ฟอนต์ Sarabun, pdf.js) ถ้าไม่อยู่ใน `boardsignal/src` ตัว build จะไปหาใน `../src` ให้เอง

---

## 3. สร้างบริการบน Render

1. สมัคร / เข้าสู่ระบบ https://render.com (ใช้บัญชี GitHub ได้)
2. **New → Blueprint** → **Connect GitHub** → อนุญาตให้ Render เห็น repo `PromoSignal-DSS` (เลือกเฉพาะ repo นี้ได้)
3. เลือก repo → Render อ่าน `render.yaml` แล้วแสดงบริการชื่อ `openinnoscore`
4. Render จะถามค่าตัวแปรที่ตั้ง `sync: false` ไว้:
   - **APP_PASSWORD** — ใส่รหัสผ่านที่ต้องการ (ยาว ≥ 12 ตัวอักษร) **จำเป็น**
   - APP_USERS, ANTHROPIC_API_KEY, OPENAI_API_KEY, OCR_PROVIDER, OCR_API_KEY — เว้นว่างได้
   - SECRET_KEY — Render สุ่มให้อัตโนมัติ ไม่ต้องใส่
5. กด **Apply** → รอ build ~2–4 นาที (ดู log ได้ในหน้า Events / Logs)
   ถ้าเห็นบรรทัด `wrote …/OpenInnoScore_server.html` และ `model REF928-… loaded` แปลว่าผ่าน
6. ได้ URL แบบ `https://openinnoscore.onrender.com` (หรือชื่อใกล้เคียง) → เปิดแล้วจะเจอหน้า
   “OpenInnoScore™ · ต้นแบบส่วนตัว” ให้ใส่รหัสผ่าน
7. (ไม่บังคับ) ผูกโดเมนของตัวเอง: Settings → Custom Domains

ตรวจสุขภาพระบบได้ที่ `https://<URL>/api/health` (ไม่ต้องเข้าสู่ระบบ — ตอบเพียง `{"ok":true,"version":…}`)

ทุกครั้งที่ push ขึ้น GitHub Render จะ build ใหม่อัตโนมัติ (`autoDeploy: true`)

---

## 4. เพิ่มผู้ใช้

- ผู้ใช้คนเดียว: ใช้ **APP_PASSWORD** อย่างเดียว (ช่องชื่อผู้ใช้เว้นว่างได้)
- หลายคน: Render → บริการ → **Environment** → เพิ่ม `APP_USERS` เช่น
  `pooloom:รหัสของคุณปูลม,board1:รหัสกรรมการ1` (คั่นแต่ละคนด้วย `,` และชื่อกับรหัสด้วย `:`)
  เมื่อมี APP_USERS หน้าเข้าสู่ระบบจะบังคับกรอกชื่อผู้ใช้ (APP_PASSWORD ยังใช้ได้คู่กัน)
- บันทึกแล้ว Render จะรีสตาร์ตเอง (~30 วินาที) · ถอนสิทธิ์ = ลบชื่อออกจาก APP_USERS
- อยากให้ทุกคนต้องเข้าสู่ระบบใหม่ทันที: เปลี่ยนค่า `SECRET_KEY`
- อายุการเข้าสู่ระบบเริ่มต้น 12 ชั่วโมง (ปรับด้วย `SESSION_HOURS`)

---

## 5. เปิดใช้ AI และ OCR (เมื่อพร้อม)

ฟีเจอร์เหล่านี้ **ปิดอยู่จนกว่าจะใส่ API key** ใน Render → Environment (ห้ามใส่ key ในโค้ดหรือใน GitHub)

| ฟีเจอร์ | ตัวแปร | หมายเหตุ |
|---|---|---|
| AI ด้วย Claude | `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL` ถ้าต้องการเปลี่ยนรุ่น ค่าเริ่มต้น `claude-sonnet-5-5`) | สมัครที่ console.anthropic.com |
| AI ด้วย OpenAI | `OPENAI_API_KEY` (+ `OPENAI_MODEL`, ค่าเริ่มต้น `gpt-4o-mini`) | ถ้ามีทั้งสองเจ้า ระบบใช้ Claude ก่อน ตั้ง `LLM_PROVIDER=openai` เพื่อสลับ |
| OCR (PDF สแกน) | `OCR_PROVIDER`, `OCR_API_KEY` (+ `OCR_ENDPOINT`) | ต้องเลือกผู้ให้บริการและเขียนตัวแปลงใน `server/app.py` → `ocr_adapter()` ก่อน (มีตัวแปลงกลาง `generic_http` ให้) |

- ข้อความที่ส่งไปผู้ให้บริการ AI = เทมเพลตภาษาไทยฝั่งเซิร์ฟเวอร์ + **ผลลัพธ์** ที่หน้าเว็บส่งมาเท่านั้น
  เซิร์ฟเวอร์ตัดฟิลด์ที่ชื่อเหมือนสัมประสิทธิ์ทิ้งอีกชั้นหนึ่ง และไม่เคยใส่สูตรลงในข้อความ
- งานที่รองรับ (`task`): `board_brief`, `explain_score`, `whatif_summary`, `draft_directive`, `peer_note`
- โควตา: AI 30 ครั้ง/ชั่วโมง/ผู้ใช้ · OCR 20 ไฟล์/ชั่วโมง/ผู้ใช้ (ไฟล์ละไม่เกิน 25 MB)
- หน้าเว็บเรียกผ่าน `window.OIS_API.llm(task, payload)`, `OIS_API.ocr(file)`, `OIS_API.integrations()`
  (`integrations()` ตอบเพียง true/false ว่าเปิดอะไรอยู่)

---

## 6. ค่าใช้จ่าย (ราคาโดยประมาณ ตรวจหน้า Pricing ของ Render อีกครั้งก่อนตัดสินใจ)

| แผน | ราคา | ข้อสังเกต |
|---|---|---|
| **Starter** (ค่าใน render.yaml) | ~7 USD / เดือน | เปิดตลอด เหมาะกับการนำเสนอลูกค้า |
| Free | 0 | **หลับหลังไม่มีคนใช้ 15 นาที** เปิดครั้งถัดไปต้องรอ ~1 นาที · ทุกคนต้องเข้าสู่ระบบใหม่ถ้าไม่ได้ตั้ง SECRET_KEY คงที่ |

ค่า AI / OCR คิดแยกตามการใช้งานจริงจากผู้ให้บริการแต่ละเจ้า

---

## 7. ความปลอดภัย — สิ่งที่ทำแล้ว

- ไฟล์ HTML ฉบับเซิร์ฟเวอร์ **ไม่มี** `par`, `chol` และตัวเลขสัมประสิทธิ์ใด ๆ — build ตรวจซ้ำทุกครั้ง ถ้าพบจะหยุด build
- จุดอ้างอิง 928 จุด: คอลัมน์ค่าบอร์ด (cF/cG/cW) ถูกเรียงแยกทีละคอลัมน์ จึงไม่ผูกกับ amp ของแต่ละแถว (ถอดสูตรด้วย regression จากจุดเหล่านี้ไม่ได้)
- ทุกหน้าและทุก API (ยกเว้น `/api/health`) ต้องเข้าสู่ระบบ · คุกกี้เซ็นด้วย SECRET_KEY, HttpOnly, SameSite=Lax, Secure บน HTTPS
- จำกัดการเดารหัส 10 ครั้ง / 15 นาที / IP · จำกัดการคำนวณ 1,200 ค่าป้อน / นาที / ผู้ใช้ (ปรับด้วย `API_ITEMS_PER_MIN`) และไม่เกิน 64 รายการต่อคำขอ
- บันทึก log เฉพาะจำนวนรายการและรหัส session แบบ hash (ไม่มีชื่อ อีเมล หรือค่าป้อน)
- ไม่มีการเปิดโฟลเดอร์ `src/`, `model/`, `ref/` ให้ดาวน์โหลด · header ความปลอดภัย (X-Frame-Options DENY, CSP, no-store)

## 8. ข้อจำกัดที่ต้องบอกตรง ๆ

1. **ผู้ที่เข้าสู่ระบบแล้วยังประมาณสูตรได้** — สูตรเป็นเส้นตรง ผู้ใช้ที่ตั้งใจสามารถลองป้อนค่าใน What-if หลายชุด
   หรือนำค่า amp ของ 196 บริษัทที่แสดงบนหน้าจอมาคำนวณย้อนกลับ (regression) จนได้ค่าใกล้เคียงสัมประสิทธิ์
   มาตรการที่ใช้คือ “จำกัดคนเข้าถึง + จำกัดความถี่ + เก็บ log” ไม่ใช่การปิดได้ 100% — ให้สิทธิ์เฉพาะผู้ที่ลงนาม NDA
2. **ไฟล์ออฟไลน์ `OpenInnoScore_v2.html` ยังมีสูตรฝังอยู่ครบ** (รวม Cholesky) — ห้ามส่งไฟล์นี้ให้ผู้ที่ไม่ได้ลงนาม NDA
   และอย่าเปิดเป็น GitHub Pages สาธารณะ
3. ข้อมูลอ้างอิง (`src/ois_model.json`) อยู่ใน repo — ความลับขึ้นกับการตั้ง repo เป็น Private และการจำกัดสิทธิ์ผู้ร่วมงาน GitHub
4. ตัวจำกัดความถี่เก็บในหน่วยความจำ (เครื่องเดียว) — รีสตาร์ตแล้วนับใหม่ ถ้าขยายเป็นหลายเครื่องต้องย้ายไปใช้ Redis
5. ระหว่างรอเซิร์ฟเวอร์ (โดยทั่วไป < 0.2 วินาที) หน้าจอแสดงค่าชั่วคราวจากค่าป้อนที่ใกล้ที่สุด พร้อมป้าย
   “กำลังคำนวณบนเซิร์ฟเวอร์…” ที่มุมขวาล่าง แล้วอัปเดตเป็นค่าจริงเอง
6. amp ที่ส่งกลับปัด 6 ตำแหน่ง (`AMP_DECIMALS`) — ต่างจากฉบับออฟไลน์ไม่เกิน 5×10⁻⁷ (ไม่กระทบ tier / quadrant)

---

## 9. ทดสอบในเครื่องก่อน push

```bash
cd boardsignal
pip install -r server/requirements.txt
python build_v2.py --server            # สร้าง out/OpenInnoScore_server.html (และตรวจว่าไม่มีสูตรหลุด)
APP_PASSWORD=test SECRET_KEY=dev uvicorn server.app:app --port 8000
# เปิด http://localhost:8000  → หน้าเข้าสู่ระบบ → รหัส test
```

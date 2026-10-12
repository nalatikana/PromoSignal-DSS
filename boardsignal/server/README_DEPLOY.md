# OpenInnoScore™ · คู่มือติดตั้งเซิร์ฟเวอร์ส่วนตัวบน Render.com

เอกสารนี้อธิบายวิธีเปิดต้นแบบ OpenInnoScore เป็นเว็บแอป (Prototype-SaaS สำหรับผู้ทดสอบ 40 คน — Technology Acceptance Testing)
ที่ต้องเข้าสู่ระบบก่อนใช้งาน โดย **สูตรคำนวณ (สัมประสิทธิ์ β1 / δF / δG / δW / δT, สัมประสิทธิ์ FE และ covariance / Cholesky)
อยู่บนเซิร์ฟเวอร์เท่านั้น** เบราว์เซอร์ของผู้ใช้และ AI agent ได้รับเฉพาะผลลัพธ์

---

## 1. ภาพรวม

| ส่วน | ไฟล์ | หน้าที่ |
|---|---|---|
| Frontend | `out/OpenInnoScore_server.html` (สร้างตอน deploy ด้วย `python build_v2.py --server`) | หน้าเดียวกับต้นแบบ แต่ไม่มีสูตรฝังอยู่ ค่า amp / ช่วง 90% ถามจากเซิร์ฟเวอร์ · `window.OIS_API` ส่งคำตอบแบบสอบถามเข้าฐานข้อมูลกลาง |
| Backend | `server/app.py` (FastAPI ถ้าติดตั้งได้ ไม่เช่นนั้น Starlette — แกนเดียวกัน) | เข้าสู่ระบบ (Google / รหัสผ่าน), API คำนวณ, ฐานข้อมูลกลาง, API สำหรับ AI agent, AI/OCR |
| Compute (ลับ) | `server/ois_engine.py` + `model/ois_core.py` | สูตร Signal B และ Krinsky–Robb (ผลตรงกับฉบับออฟไลน์) |
| Database | `server/db.py` | SQLite บน persistent disk (ค่าเริ่มต้น) หรือ PostgreSQL (`DATABASE_URL`) |
| Google Sign-in | `server/auth_google.py` | OAuth 2.0 / OpenID Connect (ไลบรารีมาตรฐานของ Python) |
| API ผลลัพธ์สำหรับ AI | `server/public_api.py`, `server/questions.json` | `/api/v1/…` — คะแนน tier quadrant สถานะ คำถามหารือ (ไม่มีสูตร) |
| Agentic AI | `mcp/ois_mcp.py`, `integrations/claude-skill/…`, `integrations/gpt-action/…` | MCP สำหรับ Claude, Skill เขียน 56-1, GPT Action สำหรับ ChatGPT |
| ค่าตั้ง Render | `render.yaml` | Blueprint: บริการเว็บ + disk 1 GB + ตัวแปรแวดล้อม |

ไฟล์ออฟไลน์เดิม (`python build_v2.py` → `out/OpenInnoScore_v2.html`) ยังทำงานเหมือนเดิมทุกอย่าง และ **ยังมีสูตรฝังอยู่** (ดูข้อ 13)
ฉบับออฟไลน์ไม่มี `window.OIS_API` จึงเก็บคำตอบไว้ใน localStorage ของเครื่องเท่านั้น

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

---

## 3. สร้าง OAuth client ของ Google (สำหรับ “เข้าสู่ระบบด้วย Google”)

ทำก่อนข้อ 4 เพราะต้องใช้ Client ID / Secret · ถ้ายังไม่พร้อม ข้ามไปใช้ `APP_PASSWORD` ก่อนแล้วกลับมาเพิ่มทีหลังได้

1. เปิด https://console.cloud.google.com → เลือก/สร้าง Project (เช่น `openinnoscore`)
2. **APIs & Services → OAuth consent screen** (บางบัญชีเรียกว่า *Google Auth Platform → Branding / Audience*)
   - User type: **External** · App name: OpenInnoScore · อีเมลติดต่อ: อีเมลผู้ดูแล
   - Scopes: ใช้แค่ `openid`, `email`, `profile` (ไม่ต้องขอ scope อ่อนไหว → ไม่ต้องผ่านการตรวจของ Google)
   - Publishing status: คงไว้ที่ **Testing** แล้วเพิ่ม **Test users** = อีเมล Google ของผู้ทดสอบทั้ง 40 คน
     (โหมด Testing รับ test users ได้สูงสุด 100 บัญชี — พอสำหรับ 40 คน และมีเพียงบัญชีในรายการเท่านั้นที่เข้าสู่ระบบได้)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application** · Name: OpenInnoScore Render
   - **Authorized redirect URIs**: `https://<ชื่อบริการ>.onrender.com/auth/google/callback`
     (ถ้าผูกโดเมนเอง ให้เพิ่ม `https://<โดเมน>/auth/google/callback` ด้วย · ทดสอบในเครื่องเพิ่ม `http://localhost:8000/auth/google/callback`)
   - กด Create → คัดลอก **Client ID** และ **Client secret**
4. ใน Render ตั้ง `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_URL=https://<ชื่อบริการ>.onrender.com` (ไม่มี `/` ท้าย)
5. กำหนดว่าใครเข้าได้ (ฝั่งเซิร์ฟเวอร์ — ตรวจซ้ำอีกชั้นนอกจาก Test users ของ Google):
   - `ALLOWED_EMAILS=a@gmail.com,b@company.co.th,@university.ac.th` (อีเมลรายคน หรือ `@โดเมน` ทั้งโดเมน)
   - หรือ `ALLOW_ANY_GOOGLE=1` = ทุกบัญชีที่ Google ยืนยันอีเมลแล้ว (ใช้คู่กับโหมด Testing ของ Google ที่จำกัด test users อยู่แล้ว)
   - ไม่ตั้งทั้งสองค่า = เข้าได้เฉพาะ `ADMIN_EMAILS`
   - `ADMIN_EMAILS=pooloom@gmail.com` = ผู้ดูแล (ดูสรุป / ส่งออกผล / สำรองข้อมูล)

เซิร์ฟเวอร์ใช้ OAuth 2.0 Authorization Code flow: สุ่ม `state` + `nonce` → Google → แลก code ฝั่งเซิร์ฟเวอร์ด้วย client secret
→ อ่าน userinfo → ต้อง `email_verified` → ตรวจรายชื่อ → สร้าง session (คุกกี้เซ็นแล้ว HttpOnly)

---

## 4. สร้างบริการบน Render

1. สมัคร / เข้าสู่ระบบ https://render.com (ใช้บัญชี GitHub ได้)
2. **New → Blueprint** → **Connect GitHub** → อนุญาตให้ Render เห็น repo `PromoSignal-DSS` (เลือกเฉพาะ repo นี้ได้)
3. เลือก repo → Render อ่าน `render.yaml` แล้วแสดงบริการชื่อ `openinnoscore` พร้อม disk `ois-data` (1 GB ที่ `/var/data`)
4. Render จะถามค่าตัวแปรที่ตั้ง `sync: false` ไว้ (ดูตารางข้อ 5) — **ต้องมีอย่างน้อยหนึ่งวิธีเข้าสู่ระบบ**
   (Google หรือ `APP_PASSWORD`/`APP_USERS`) ไม่เช่นนั้นเซิร์ฟเวอร์จะไม่ยอมเริ่ม
5. กด **Apply** → รอ build ~2–4 นาที (ดู log ได้ในหน้า Events / Logs)
   ถ้าเห็น `wrote …/OpenInnoScore_server.html`, `model REF928-… loaded`, `database: sqlite /var/data/ois.db`
   และ `framework: FastAPI` แปลว่าผ่าน
6. ได้ URL แบบ `https://openinnoscore.onrender.com` → ตั้ง `PUBLIC_URL` ให้ตรง แล้วเพิ่ม redirect URI นี้ใน Google (ข้อ 3)
7. (ไม่บังคับ) ผูกโดเมนของตัวเอง: Settings → Custom Domains (แล้วแก้ `PUBLIC_URL` และ redirect URI ตาม)

ตรวจสุขภาพระบบได้ที่ `https://<URL>/api/health` (ไม่ต้องเข้าสู่ระบบ — ตอบ `{"ok":true,"version":…,"framework":…}`)
ทุกครั้งที่ push ขึ้น GitHub Render จะ build ใหม่อัตโนมัติ (`autoDeploy: true`) — ข้อมูลใน disk ไม่หาย
(แต่เมื่อมี disk Render จะหยุดเครื่องเก่าก่อนเปิดเครื่องใหม่ จึงมีช่วงเว็บไม่ตอบสั้น ๆ ระหว่าง deploy)

---

## 5. ตัวแปรแวดล้อมทั้งหมด

| ตัวแปร | จำเป็น | ความหมาย |
|---|---|---|
| `SECRET_KEY` | ✓ (Render สุ่มให้) | กุญแจเซ็นคุกกี้ · เปลี่ยน = ทุกคนต้องเข้าสู่ระบบใหม่ |
| `DB_PATH` | ✓ (ตั้งใน render.yaml) | ไฟล์ SQLite — `/var/data/ois.db` บน disk ถาวร (ในเครื่องค่าเริ่มต้น `./data/ois.db`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | อย่างน้อยหนึ่งวิธี | เปิดปุ่ม “เข้าสู่ระบบด้วย Google” |
| `PUBLIC_URL` | แนะนำเมื่อใช้ Google | URL สาธารณะ ใช้สร้าง redirect URI (ไม่ตั้ง = อ่านจาก header ของคำขอ) |
| `ALLOWED_EMAILS` | – | อีเมล/`@โดเมน` ที่เข้าด้วย Google ได้ |
| `ALLOW_ANY_GOOGLE` | – | `1` = ทุกบัญชี Google ที่ยืนยันอีเมลแล้ว |
| `ADMIN_EMAILS` | – | อีเมล Google ของผู้ดูแล |
| `APP_PASSWORD` | อย่างน้อยหนึ่งวิธี | รหัสผ่านหลัก (ช่องชื่อเว้นว่างได้ → บัญชีชื่อ `owner`) |
| `APP_USERS` | – | บัญชีรหัสผ่านเพิ่ม `ชื่อ1:รหัส1,ชื่อ2:รหัส2` |
| `ADMIN_USER` | – | ชื่อบัญชีรหัสผ่านที่เป็นผู้ดูแล (เช่น `owner`) |
| `API_TOKENS` | – | token ของ `/api/v1` สำหรับ MCP / GPT Action (ยาว ≥ 16 ตัวอักษร คั่นด้วย `,`) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | – | AI ด้วย Claude (รุ่นเริ่มต้น `claude-sonnet-5-5`) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | – | AI ด้วย OpenAI (รุ่นเริ่มต้น `gpt-4o-mini`) |
| `LLM_PROVIDER` | – | `openai` = ใช้ OpenAI เป็นค่าเริ่มต้นเมื่อมีทั้งสองเจ้า |
| `OCR_PROVIDER` / `OCR_API_KEY` / `OCR_ENDPOINT` | – | OCR ของ PDF สแกน (ดู `ocr_adapter()`) |
| `DATABASE_URL` | – | `postgres://…` = ใช้ PostgreSQL แทน SQLite (ต้องเปิด `psycopg` ใน requirements) |
| `SESSION_HOURS`, `API_ITEMS_PER_MIN`, `AMP_DECIMALS` | – | อายุ session (12), โควตาคำนวณ (1200/นาที), ทศนิยม amp (6) |
| `OIS_FRAMEWORK` | – | `starlette` = บังคับไม่ใช้ FastAPI (ใช้แก้ปัญหาชั่วคราว) |
| `ALLOW_NO_PASSWORD` | – | `1` = ไม่ต้องมีวิธีเข้าสู่ระบบ (ทดสอบในเครื่องเท่านั้น ห้ามใช้บน Render) |

---

## 6. เพิ่มผู้ใช้ / ผู้ดูแล

- **ผู้ทดสอบ 40 คน (แนะนำ)**: ใช้ Google — เพิ่มอีเมลใน Test users ของ Google (ข้อ 3) และใน `ALLOWED_EMAILS`
  ทุกคนถูกบันทึกในตาราง `users` อัตโนมัติเมื่อเข้าสู่ระบบครั้งแรก
- **บัญชีรหัสผ่าน**: `APP_PASSWORD` (คนเดียว) หรือ `APP_USERS=pooloom:รหัส1,board1:รหัส2` — ใช้เป็นทางสำรองหรือบัญชีผู้ดูแล
- **ผู้ดูแล** = อีเมลใน `ADMIN_EMAILS` หรือบัญชีรหัสผ่านชื่อ `ADMIN_USER` · ตรวจสิทธิ์ใหม่ทุกคำขอ (ถอดสิทธิ์มีผลทันที)
- บันทึก Environment แล้ว Render จะรีสตาร์ตเอง (~30 วินาที) · ถอนสิทธิ์ = ลบชื่อ/อีเมลออก
- อยากให้ทุกคนต้องเข้าสู่ระบบใหม่ทันที: เปลี่ยนค่า `SECRET_KEY`

---

## 7. ฐานข้อมูลกลาง — เก็บผลของผู้ทดสอบ

ก่อนหน้านี้คำตอบอยู่ใน localStorage ของแต่ละเบราว์เซอร์ ฉบับเซิร์ฟเวอร์ส่งเข้าฐานข้อมูลกลางผ่าน `OIS_API.submit(kind, payload, ticker)`

| ตาราง | เก็บอะไร |
|---|---|
| `users` | id, email, ชื่อ, ช่องทาง (google/password), role, วันที่สร้าง, เข้าสู่ระบบล่าสุด |
| `responses` | id, user_id, `kind`, ticker, payload (JSON), วันที่, client_id |
| `events` | audit log: เข้าสู่ระบบ/ถูกปฏิเสธ, ส่งคำตอบ, เรียก `/api/v1`, เรียก AI, ส่งออกข้อมูล |

`kind` ที่รับ: `survey` (แบบสอบถาม Pilot รวม SUS/TAM) · `rfq` (CEO Regulatory Focus Questionnaire) · `bodset` (ประเมินตนเองของคณะกรรมการ)
· `bod_oi` (OI-1..6) · `approval` (ขั้นตอนอนุมัติ 56-1) · `dict` (ข้อมูลสรุปของพจนานุกรม — เซิร์ฟเวอร์ตัดรายการคำ/ข้อความทิ้ง) · `feedback`
payload ไม่เกิน 64 KB · 120 รายการ/ชั่วโมง/ผู้ใช้

| API | สิทธิ์ | ใช้ทำอะไร |
|---|---|---|
| `POST /api/responses` | ผู้ใช้ | ส่งคำตอบ `{kind, ticker?, payload, client_id?}` |
| `GET /api/responses/mine?kind=` | ผู้ใช้ | ดูคำตอบของตัวเอง |
| `GET /api/me` | ผู้ใช้ | `{email, name, role, provider}` |
| `GET /api/admin/summary` | ผู้ดูแล | จำนวนคำตอบต่อ kind, จำนวนผู้ใช้, 7 วันล่าสุด |
| `GET /api/admin/users` | ผู้ดูแล | รายชื่อผู้ใช้ + จำนวนคำตอบ |
| `GET /api/admin/responses?kind=&format=csv` | ผู้ดูแล | **ส่งออก CSV** (หรือ `format=json`) |
| `GET /api/admin/events?limit=` | ผู้ดูแล | audit log |
| `GET /api/admin/backup` | ผู้ดูแล | ดาวน์โหลดไฟล์ฐานข้อมูล SQLite ทั้งก้อน |

### ส่งออกผลไปวิเคราะห์ (Excel / SPSS / R)

1. เข้าสู่ระบบด้วยบัญชีผู้ดูแล แล้วเปิด `https://<URL>/api/admin/responses?kind=survey&format=csv` (เปลี่ยน `kind` ตามต้องการ ไม่ใส่ = ทุกชนิด)
2. ไฟล์เป็น CSV แบบ UTF-8 มี BOM — ดับเบิลคลิกเปิดใน Excel ภาษาไทยไม่เพี้ยน
3. คอลัมน์: `id, kind, ticker, created (UTC), client_id, user_id, email, name, provider` ตามด้วย `payload.<ชื่อข้อ>` หนึ่งคอลัมน์ต่อข้อ
   (ค่าที่ซ้อนลึกกว่าหนึ่งชั้นเป็นข้อความ JSON) · ค่าที่ขึ้นต้นด้วย `= + - @` ถูกเติม `'` นำหน้ากันสูตร Excel
4. SPSS: File → Import Data → CSV → Encoding UTF-8 · R: `read.csv(f, fileEncoding = "UTF-8-BOM")`
5. ก่อนส่งข้อมูลให้ผู้อื่น ให้ลบคอลัมน์ `email` / `name` ถ้าไม่จำเป็น (ข้อมูลส่วนบุคคลตาม PDPA)

---

## 8. สำรองข้อมูล

- **Render disk snapshot**: Render ถ่าย snapshot ของ disk วันละครั้งและเก็บอย่างน้อย 7 วัน (Dashboard → Disks → Snapshots → Restore)
  การ restore ย้อนทั้ง disk และข้อมูลหลังจุดนั้นหาย — Render แนะนำให้ฐานข้อมูลที่ติดตั้งเองมี backup ของตัวเองด้วย จึงควรทำข้อถัดไปเสมอ
- **ดาวน์โหลดไฟล์ฐานข้อมูล**: ผู้ดูแลเปิด `https://<URL>/api/admin/backup` → ได้ไฟล์ `ois_backup_YYYYMMDD_HHMMSS.db`
  (สำเนาที่สอดคล้องแม้มีคนใช้อยู่) เปิดดูได้ด้วย DB Browser for SQLite · แนะนำทำทุกสัปดาห์ระหว่างทดสอบ และทุกครั้งก่อนแก้ระบบ
- **กู้คืน**: Render → Shell → อัปโหลดไฟล์แทน `/var/data/ois.db` แล้ว Manual Deploy (หรือ restore snapshot)
- ตรวจสรุปหลังกู้คืน: Render → Shell → `python3 -m server.db`
- ถ้าใช้ PostgreSQL ให้ใช้ระบบ backup ของผู้ให้บริการ / `pg_dump`

### ทางเลือก PostgreSQL

ตั้ง `DATABASE_URL=postgres://…` และเอา `#` หน้า `psycopg[binary]` ใน `server/requirements.txt` ออก — ตารางถูกสร้างอัตโนมัติ
(ส่วนนี้ยังไม่ได้ทดสอบกับฐานข้อมูลจริง ถ้า import psycopg ไม่ได้ ระบบเตือนใน log แล้วกลับไปใช้ SQLite)
**ข้อควรระวัง**: Render Postgres แผน Free หมดอายุ 30 วันหลังสร้าง (มีช่วงผ่อนผัน 14 วันให้อัปเกรด) — ไม่เหมาะกับการเก็บผลวิจัย
ตรวจสอบเงื่อนไขล่าสุดของ Render ก่อนเลือก · สำหรับ 40 ผู้ใช้ SQLite บน disk เพียงพอและถูกกว่า

---

## 9. AI agent: MCP (Claude) และ GPT Action (ChatGPT)

AI เห็นเฉพาะผลลัพธ์ผ่าน `/api/v1` — **ไม่เข้าถึงอัลกอริทึม** (ไม่มีสูตร สัมประสิทธิ์ ค่า amp/B ดิบ หรือข้อมูลรายแถวของ REF-928)

| API (Bearer token หรือ session) | คืนค่า |
|---|---|
| `GET /api/v1/companies?industry=` | รายชื่อบริษัท `{ticker, name, industry, fy}` |
| `GET /api/v1/companies/{ticker}` | `ois, ois_industry, tier, tier_uncertain, band90, quadrant, quadrant_name, zone, regime, flag_oi, status_message, chips, in_domain, weak_industry, withheld` (ปัด 1 ตำแหน่ง) |
| `GET /api/v1/companies/{ticker}/board-questions?usecase=board\|credit\|search\|investor` | คำถามหารือ 3 ข้อ หลักฐานที่ควรตรวจ สิ่งที่ยังสรุปไม่ได้ |
| `GET /api/openapi.json` | สเปก OpenAPI 3.1 (ต้องมี token หรือเป็นผู้ดูแล) |

ขั้นตอน
1. สร้าง token สุ่มยาว เช่น `python3 -c "import secrets;print('ois_'+secrets.token_urlsafe(24))"` — แยกหนึ่งตัวต่อช่องทาง
2. Render → Environment → `API_TOKENS=ois_claude…,ois_gpt…`
3. Claude Desktop / Claude Code: ดู `mcp/README.md` · Skill เขียน 56-1: `integrations/claude-skill/openinnoscore-561/SKILL.md`
4. ChatGPT: ดู `integrations/gpt-action/INSTRUCTIONS.md` (วาง `openapi.yaml` ใน GPT Builder → Actions)
5. ทุกการเรียกบันทึกใน `events` · จำกัด 600 ครั้ง/ชั่วโมง/token · เพิกถอน = ลบ token ออกจาก `API_TOKENS`

คำถามหารือใน `server/questions.json` สกัดจาก `src/v2_strategy.js` — ถ้าแก้ถ้อยคำในหน้าเว็บ ให้รัน
`node server/tools/extract_questions.js` แล้ว commit ไฟล์ json · ข้อความแถบสถานะ (ตารางที่ 10) อยู่ใน `server/public_api.py`

---

## 10. AI และ OCR ภายในหน้าเว็บ

ฟีเจอร์เหล่านี้ **ปิดอยู่จนกว่าจะใส่ API key** ใน Render → Environment (ห้ามใส่ key ในโค้ดหรือใน GitHub)

| ฟีเจอร์ | ตัวแปร | หมายเหตุ |
|---|---|---|
| AI ด้วย Claude | `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`, ค่าเริ่มต้น `claude-sonnet-5-5`) | สมัครที่ console.anthropic.com |
| AI ด้วย OpenAI | `OPENAI_API_KEY` (+ `OPENAI_MODEL`, ค่าเริ่มต้น `gpt-4o-mini`) | ถ้ามีทั้งสองเจ้า ระบบใช้ Claude ก่อน ตั้ง `LLM_PROVIDER=openai` เพื่อสลับ |
| OCR (PDF สแกน) | `OCR_PROVIDER`, `OCR_API_KEY` (+ `OCR_ENDPOINT`) | ต้องเลือกผู้ให้บริการและเขียนตัวแปลงใน `server/app.py` → `ocr_adapter()` ก่อน (มีตัวแปลงกลาง `generic_http` ให้) |

- คำขอ `/api/llm` ระบุ `"provider": "anthropic" | "openai"` ได้ (`OIS_API.llmWith(task, payload, provider)`) —
  ถ้าเจ้านั้นไม่มี key ระบบใช้เจ้าที่มีแทน และตอบกลับว่าใช้เจ้าใด (`provider`)
- ข้อความที่ส่งไปผู้ให้บริการ AI = เทมเพลตภาษาไทยฝั่งเซิร์ฟเวอร์ + **ผลลัพธ์** ที่หน้าเว็บส่งมาเท่านั้น
  เซิร์ฟเวอร์ตัดฟิลด์ที่ชื่อเหมือนสัมประสิทธิ์ทิ้งอีกชั้นหนึ่ง และไม่เคยใส่สูตรลงในข้อความ · ทุกการเรียกบันทึกใน `events`
- งานที่รองรับ (`task`): `board_brief`, `explain_score`, `whatif_summary`, `draft_directive`, `t561_rewrite`, `peer_note`
- โควตา: AI 30 ครั้ง/ชั่วโมง/ผู้ใช้ · OCR 20 ไฟล์/ชั่วโมง/ผู้ใช้ (ไฟล์ละไม่เกิน 25 MB)
- `OIS_API.integrations()` ตอบเพียง true/false ว่าเปิดอะไรอยู่ (รวม `google`, `db`, `admin`)

---

## 11. ค่าใช้จ่าย (ราคาโดยประมาณ ตรวจหน้า Pricing ของ Render อีกครั้งก่อนตัดสินใจ)

| รายการ | ราคา | ข้อสังเกต |
|---|---|---|
| **Web service Starter** (ค่าใน render.yaml) | ~7 USD / เดือน | เปิดตลอด รองรับ 40 ผู้ใช้สบาย |
| **Persistent disk 1 GB** | ~0.25 USD / GB / เดือน | ต้องใช้กับแผนเสียเงิน — แผน Free ต่อ disk ไม่ได้ |
| Free web service | 0 | หลับหลังไม่มีคนใช้ 15 นาที และ **ไม่มี disk** → ข้อมูลผู้ทดสอบหายเมื่อ deploy/รีสตาร์ต ไม่เหมาะกับ MVP1 |
| Render Postgres (ทางเลือก) | Free หมดอายุ 30 วัน · แผนเสียเงินคิดแยก | ตรวจสอบเงื่อนไขล่าสุดของ Render |
| Google Sign-in | 0 | โหมด Testing ของ OAuth consent screen |

ค่า AI / OCR คิดแยกตามการใช้งานจริงจากผู้ให้บริการแต่ละเจ้า · MCP / GPT Action ไม่มีค่าใช้จ่ายฝั่งเซิร์ฟเวอร์เพิ่ม
(ผู้ใช้จ่ายค่าบัญชี Claude / ChatGPT ของตนเอง)

---

## 12. ความปลอดภัย — สิ่งที่ทำแล้ว

- ไฟล์ HTML ฉบับเซิร์ฟเวอร์ **ไม่มี** `par`, `chol` และตัวเลขสัมประสิทธิ์ใด ๆ — build ตรวจซ้ำทุกครั้ง ถ้าพบจะหยุด build
- จุดอ้างอิง 928 จุด: คอลัมน์ค่าบอร์ด (cF/cG/cW) ถูกเรียงแยกทีละคอลัมน์ จึงไม่ผูกกับ amp ของแต่ละแถว
- `/api/v1` ส่งเฉพาะผลลัพธ์ปัด 1 ตำแหน่ง ไม่มี amp/B/cP/cF/cG/cW · ทดสอบอัตโนมัติว่าไม่มีค่าเหล่านี้หลุด
- ทุกหน้าและทุก API (ยกเว้น `/api/health`) ต้องเข้าสู่ระบบหรือมี token · คุกกี้เซ็นด้วย SECRET_KEY, HttpOnly, SameSite=Lax, Secure บน HTTPS
- Google: state + nonce, แลก code ฝั่งเซิร์ฟเวอร์, ต้อง email_verified, รายชื่อที่อนุญาตตรวจฝั่งเซิร์ฟเวอร์
- จำกัดการเดารหัส 10 ครั้ง / 15 นาที / IP · คำนวณ 1,200 ค่าป้อน / นาที / ผู้ใช้ · ส่งคำตอบ 120 / ชั่วโมง · `/api/v1` 600 / ชั่วโมง / token
- API ผู้ดูแลตรวจสิทธิ์ทุกคำขอ (ผู้ใช้ทั่วไปได้ 403) · POST ตรวจ Origin กัน CSRF · CSV กันสูตร Excel
- audit log (`events`) เก็บชนิดเหตุการณ์ ไม่เก็บรหัสผ่าน/token (เก็บ hash 8 ตัวของ token) และไม่เก็บค่าป้อนของการคำนวณ
- ไม่มีการเปิดโฟลเดอร์ `src/`, `model/`, `ref/` ให้ดาวน์โหลด · header ความปลอดภัย (X-Frame-Options DENY, CSP, no-store)
- FastAPI: ปิด `/docs`, `/redoc`, `/openapi.json` อัตโนมัติ — สเปกอยู่ที่ `/api/openapi.json` ซึ่งต้องมีสิทธิ์

## 13. ข้อจำกัดที่ต้องบอกตรง ๆ

1. **ผู้ที่เข้าสู่ระบบแล้วยังประมาณสูตรได้** — สูตรเป็นเส้นตรง ผู้ใช้ที่ตั้งใจสามารถลองป้อนค่าใน What-if หลายชุด
   หรือนำค่า amp ของ 196 บริษัทที่แสดงบนหน้าจอมาคำนวณย้อนกลับจนได้ค่าใกล้เคียงสัมประสิทธิ์
   มาตรการคือ “จำกัดคนเข้าถึง + จำกัดความถี่ + เก็บ log” ไม่ใช่การปิดได้ 100% — ให้สิทธิ์เฉพาะผู้ที่ลงนาม NDA
2. **ไฟล์ออฟไลน์ `OpenInnoScore_v2.html` ยังมีสูตรฝังอยู่ครบ** (รวม Cholesky) — ห้ามส่งไฟล์นี้ให้ผู้ที่ไม่ได้ลงนาม NDA
3. ข้อมูลอ้างอิง (`src/ois_model.json`) อยู่ใน repo — ความลับขึ้นกับการตั้ง repo เป็น Private
4. ตัวจำกัดความถี่เก็บในหน่วยความจำ และ SQLite + disk ใช้ได้กับเครื่องเดียว (Render ไม่ให้ scale หลายเครื่องเมื่อมี disk)
   ถ้าขยายใน Phase 2 ให้ย้ายไป PostgreSQL + Redis
5. ระหว่างรอเซิร์ฟเวอร์ (โดยทั่วไป < 0.2 วินาที) หน้าจอแสดงค่าชั่วคราวจากค่าป้อนที่ใกล้ที่สุด แล้วอัปเดตเป็นค่าจริงเอง
6. amp ที่ส่งกลับปัด 6 ตำแหน่ง (`AMP_DECIMALS`) — ต่างจากฉบับออฟไลน์ไม่เกิน 5×10⁻⁷ (ไม่กระทบ tier / quadrant)
7. FastAPI, PostgreSQL และ Google จริง ยังไม่ได้ทดสอบในสภาพแวดล้อมพัฒนา (ทดสอบด้วย Starlette, SQLite และผู้ให้บริการ Google จำลอง)
   — ตรวจ log บรรทัด `framework: FastAPI` และทดลองเข้าสู่ระบบด้วย Google หนึ่งบัญชีหลัง deploy ครั้งแรก
8. token ของ GPT Action ถูกเก็บโดย OpenAI และใช้ร่วมกันทุกคนที่ใช้ GPT นั้น — ใช้ token แยกต่อช่องทาง

---

## 14. ทดสอบในเครื่องก่อน push

```bash
cd boardsignal
pip install -r server/requirements.txt
python build_v2.py --server            # สร้าง out/OpenInnoScore_server.html (และตรวจว่าไม่มีสูตรหลุด)
APP_PASSWORD=test ADMIN_USER=owner SECRET_KEY=dev API_TOKENS=ois_local_token_123456 uvicorn server.app:app --port 8000
# เปิด http://localhost:8000 → หน้าเข้าสู่ระบบ → เว้นชื่อ ใส่รหัส test (= ผู้ดูแล owner)

# ชุดทดสอบอัตโนมัติ (ไม่ต้องใช้ pytest — แต่รันด้วย pytest ได้ถ้ามี)
python3 server/tests/test_server_http.py   # ฐานข้อมูล สิทธิ์ผู้ดูแล CSV /api/v1 รีสตาร์ตแล้วข้อมูลอยู่
python3 server/tests/test_google.py        # Google Sign-in กับผู้ให้บริการจำลอง
python3 server/tests/test_framework.py     # การเลือก FastAPI ↔ Starlette
python3 mcp/test_mcp.py                    # MCP server ทุกเครื่องมือ
```

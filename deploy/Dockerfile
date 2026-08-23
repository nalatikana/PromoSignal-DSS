# ---------------------------------------------------------------------------
#  PromoSignal DSS — image สำหรับรันบนเซิร์ฟเวอร์ฟรี (Render / Railway / Fly.io)
#  ยังไม่ได้ใช้งานจริง — เตรียมไว้ให้พร้อม deploy เมื่อทีมตัดสินใจย้ายออกจาก static
#
#  build ในเครื่อง:  docker build -f deploy/Dockerfile -t promosignal .
#  รันในเครื่อง:     docker run -p 8000:8000 promosignal
# ---------------------------------------------------------------------------
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# ติดตั้งไลบรารีก่อน เพื่อให้ layer นี้ถูก cache ไว้
COPY dss_api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# โค้ดและไฟล์ที่ระบบต้องใช้ตอนรัน
COPY dss_api/ ./dss_api/
COPY out/dss_model.json ./out/dss_model.json
COPY out/PromoSignal_DSS.html ./out/PromoSignal_DSS.html
COPY spec/ ./spec/

# ห้ามคัดลอกโฟลเดอร์ data/ เข้า image เด็ดขาด — เป็นข้อมูลรายบริษัทที่ปกปิดชื่อไว้
# ระบบต้องการแค่ out/dss_model.json ซึ่งเป็นตัวเลขสรุปเท่านั้น

EXPOSE 8000
# ผู้ให้บริการส่วนใหญ่กำหนดพอร์ตผ่านตัวแปร $PORT จึงต้องอ่านค่าจากตรงนั้น
CMD ["sh", "-c", "uvicorn dss_api.app:app --host 0.0.0.0 --port ${PORT:-8000}"]

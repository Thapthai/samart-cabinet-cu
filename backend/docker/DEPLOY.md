# Deploy Backend ด้วย Docker Compose

## ข้อกำหนดบนเซิร์ฟเวอร์

- Docker และ Docker Compose
- ไฟล์ `.env` ในโฟลเดอร์ `backend/` (ตั้งค่าแล้ว)

## ขั้นตอน Deploy

### 1. อัปโหลดโค้ดไปที่เซิร์ฟเวอร์

```bash
# ตัวอย่าง: clone หรือ scp โปรเจกต์ไปที่เซิร์ฟเวอร์
# จากนั้น cd เข้าโฟลเดอร์ backend
cd /path/to/samart-cabinet-cu-app/backend
```

### 2. ตรวจสอบ .env

ให้มีไฟล์ `backend/.env` และมีตัวแปรอย่างน้อย:

- `DATABASE_URL` (หรือ DATABASE_USER, PASSWORD, NAME, HOST, PORT)
- `JWT_SECRET`
- อื่นๆ ตาม `.env.example`

### 3. Build และรัน

```bash
# จากโฟลเดอร์ backend (ใช้ --env-file .env เพื่อให้ Compose อ่านตัวแปรจาก .env)
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```

- `--build` = build image ใหม่
- `-d` = รันแบบแยกพื้นหลัง (detached)

### 4. ตรวจสอบ

```bash
# ดูสถานะ container
docker compose -f docker/docker-compose.yml ps
```

**หมายเหตุ:** ถ้าโฟลเดอร์ `fonts/` ไม่มีอยู่ ให้สร้างก่อน build (ดูหัวข้อ "ตัวหนังสือในรายงาน PDF ผิดเพี้ยน" ด้านล่าง)

```bash
# ดู log
docker compose -f docker/docker-compose.yml logs -f backend

# ทดสอบ health
curl http://localhost:4000/smart-cabinet-cu/api/v1/health
```

Backend จะ listen ที่ **port 4000**

---

## คำสั่งอื่นที่ใช้บ่อย

```bash
# หยุด
docker compose -f docker/docker-compose.yml down

# Build ใหม่แล้วรันใหม่ (หลัง pull code)
docker compose -f docker/docker-compose.yml --env-file .env up -d --build

# ดู log แบบ realtime
docker compose -f docker/docker-compose.yml logs -f backend
```

---

## ตัวหนังสือในรายงาน PDF ผิดเพี้ยน (ภาษาไทยไม่ขึ้น)

รายงาน PDF (เบิก/เติม/สต๊อกตู้ Weighing ฯลฯ) ใช้ฟอนต์ไทย **TH Sarabun New** ถ้าไม่มีฟอนต์ ตัวหนังสือจะผิดเพี้ยนหรือเป็นกล่อง

### วิธีแก้

1. **ดาวน์โหลดฟอนต์** (ชุดฟอนต์ของรัฐบาลไทย หรือแหล่งที่ให้ใช้ได้ตามลิขสิทธิ์)
  ต้องมีไฟล์:
  - `THSarabunNew.ttf`
  - `THSarabunNew Bold.ttf`
2. **วางไฟล์ในโฟลเดอร์ `backend/fonts/`**
  จากโฟลเดอร์ backend ให้มีโครงแบบนี้:
   (โฟลเดอร์ `backend/fonts/` มีอยู่แล้ว มีไฟล์ `.gitkeep` อยู่ข้างใน)
3. **Build image ใหม่** แล้วรัน container ใหม่:
  ```bash
   cd /path/to/samart-cabinet-cu-app/backend
   docker compose -f docker/docker-compose.yml --env-file .env up -d --build
  ```

หลัง build ใหม่ ฟอนต์จะถูก copy เข้า image และรายงาน PDF จะแสดงภาษาไทยได้ถูกต้อง
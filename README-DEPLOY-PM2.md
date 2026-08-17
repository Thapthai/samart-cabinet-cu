# Deploy ด้วย PM2 (Frontend Next.js + Backend NestJS)

คู่มือนี้สำหรับรัน production บนเซิร์ฟเวอร์ Linux/Windows ที่ติดตั้ง [PM2](https://pm2.keymetrics.io/) และ Node.js แล้ว

## สิ่งที่ต้องมีบนเซิร์ฟเวอร์

- Node.js (เวอร์ชันตามที่โปรเจกต์ใช้)
- `npm` หรือ `pnpm` / `yarn`
- PM2: `npm install -g pm2`
- ฐานข้อมูลที่ backend ต่อได้ (ดู `backend/.env.example`)

---

## ชื่อ process ใน PM2

| ส่วน     | ชื่อใน PM2                   | โฟลเดอร์   |
|----------|------------------------------|------------|
| Frontend | `med-supplies-vtn-next-app`  | `frontend` |
| Backend  | `med-supplies-vtn-backend`   | `backend`  |

---

## 1) Backend (NestJS)

### ตัวแปรสภาพแวดล้อม

สร้าง `backend/.env` หรือ `backend/.env.production` (`.env` จะทับ key ที่ซ้ำใน `.env.production` เมื่อโหลดผ่าน `ecosystem.config.cjs`)

ตัวอย่างสำคัญ (ดูรายละเอียดใน `backend/.env.example`):

- `DATABASE_*` หรือ `DATABASE_URL`
- `PORT` — พอร์ตที่ Nest ฟัง (ให้ตรงกับ reverse proxy เช่น Apache `ProxyPass` ไป `localhost:PORT`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, ฯลฯ
- `CORS_ORIGIN` — รายการ origin ที่อนุญาต **ไม่ใส่ path** คั่นด้วย comma  
  ตัวอย่าง: `https://poseintelligence.co.th,https://www.poseintelligence.co.th`

### ครั้งแรก / อัปเดตโค้ด

**ต้องมี `dist/src/main.js` ก่อน** — มาจาก `nest build` ถ้ายังไม่รัน `npm run build` จะได้ error `Script not found` จาก PM2

```bash
cd backend
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

หรือรวม build ในคำสั่งเดียว: `npm run pm2:start:build`

### คำสั่งที่ใช้บ่อย

```bash
npm run pm2:reload   # หลังแก้ .env — โหลด env ใหม่จาก ecosystem
npm run pm2:logs
npm run pm2:stop
```

หรือใช้ PM2 ตรง ๆ:

```bash
pm2 reload ecosystem.config.cjs --update-env
pm2 logs med-supplies-vtn-backend
```

### หมายเหตุ

- หลังแก้ `.env` อย่าใช้แค่ `pm2 restart med-supplies-vtn-backend` ถ้าต้องการให้ env จากไฟล์อัปเดต — ใช้ `reload … --update-env` หรือ `npm run pm2:reload`
- ไม่มีขั้นตอน “bake env ลง build” แบบ Next — แก้ `PORT` / `CORS_ORIGIN` แล้ว reload มักพอ (ยกเว้นมีการเปลี่ยนที่ต้อง `build` ใหม่จริง ๆ)

---

## 2) Frontend (Next.js)

โฟลเดอร์ **`frontend/`** — PM2 รันคำสั่ง `next start` (ดู `frontend/ecosystem.config.cjs`) หลัง **`npm run build`** เท่านั้น ไม่ใช่ `next dev`

### ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|---------|
| `frontend/ecosystem.config.cjs` | โหลด `.env.production` แล้ว `.env` ส่งเข้า process; พอร์ตเริ่มต้น `7200`; ส่งต่อ `NEXTAUTH_*`, `NEXT_PUBLIC_*`, `BACKEND_API_URL`, Firebase ฯลฯ |
| `frontend/next.config.js` | `basePath` จาก `NEXT_PUBLIC_BASE_PATH`; `output: 'standalone'`; ค่า default ของ `NEXT_PUBLIC_API_URL` ถ้าไม่ตั้ง env ตอน build |
| `frontend/.env.example` | แม่แบบตัวแปร (คัดลอกเป็น `.env` / `.env.production`) |

### ตัวแปรสภาพแวดล้อม

สร้าง **`frontend/.env.production`** และ/หรือ **`frontend/.env`** (ไฟล์ `.env` ทับ key ที่ซ้ำเมื่อโหลดผ่าน ecosystem)

**บังคับ / แนะนำ:**

| ตัวแปร | ความหมาย |
|--------|-----------|
| `NEXTAUTH_SECRET` | Secret ของ NextAuth (สุ่มยาว ๆ ใน production เช่น `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL ที่ผู้ใช้เปิดแอปจริง **ครบ scheme + host + path base** เช่น `https://poseintelligence.co.th/med-supplies` — ต้องตรงกับที่พิมพ์ในเบราว์เซอร์ (อย่าใช้ `http` ถ้าโหลดหน้าเป็น `https`; อย่าสลับ `www` กับ non-`www` กับที่ใช้จริง) |
| `NEXT_PUBLIC_BASE_PATH` | base path ของ Next เช่น `/med-supplies` — ต้องตรงกับ path ที่ reverse proxy ชี้เข้ามา |
| `NEXT_PUBLIC_API_URL` | URL ฐาน API ที่ **เบราว์เซอร์** เรียก (มักผ่านโดเมนเดียวกับหรือ prefix แยก เช่น `https://poseintelligence.co.th/med-supplies-api/api/v1`) **ไม่ใช้** `localhost` ถ้าผู้ใช้เปิดเว็บจากเครื่องอื่น |
| `BACKEND_API_URL` | URL ที่ **Node บนเซิร์ฟเวอร์** เรียก Nest โดยตรง เช่น `http://127.0.0.1:7100/api/smart-cabinet-vn/v1` — ใช้ใน NextAuth (`/api/auth/...`) ตอน login; ถ้าไม่ตั้ง อาจชี้ผิดและได้ 401 |

คีย์ **`NEXT_PUBLIC_*` อื่น** (Firebase ฯลฯ) ใส่ตามที่แอปใช้ — รายการที่ ecosystem ส่งเข้า PM2 อยู่ใน `passthroughKeys` ภายใน `ecosystem.config.cjs`

**ตัวอย่างชุดค่า (ปรับโดเมน/พอร์ตให้ตรงระบบคุณ):**

```env
NEXTAUTH_SECRET=ใส่-secret-ยาว
NEXTAUTH_URL=https://poseintelligence.co.th/med-supplies
NEXT_PUBLIC_BASE_PATH=/med-supplies
NEXT_PUBLIC_API_URL=https://poseintelligence.co.th/med-supplies-api/api/v1
BACKEND_API_URL=http://127.0.0.1:7100/api/smart-cabinet-vn/v1
PORT=7200
```

### สคริปต์ npm (รันจาก `frontend/`)

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run build` | build production (`next build`) — **จำเป็น**หลังดึงโค้ดใหม่หรือแก้ `NEXT_PUBLIC_*` |
| `npm run pm2:start` | `pm2 start ecosystem.config.cjs` |
| `npm run pm2:reload` | `pm2 reload ecosystem.config.cjs --update-env` — ใช้หลังแก้ `.env` (runtime) |
| `npm run pm2:logs` | log ของ `med-supplies-vtn-next-app` |
| `npm run pm2:stop` | หยุด process ชื่อเดียวกับใน ecosystem |

### ครั้งแรก / อัปเดตโค้ด

```bash
cd frontend
npm ci
# ตรวจสอบ .env / .env.production ให้ครบก่อน build
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

`next build` จะอ่าน `.env.production` (และ `.env` ตามลำดับของ Next) สำหรับตัวแปรที่ใช้ตอน build — ค่า **`NEXT_PUBLIC_*`** ที่ฝังใน bundle มาจากช่วง build นี้

### หลังแก้เฉพาะตัวแปร runtime (ไม่ใช่ `NEXT_PUBLIC_*`)

เช่น `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `BACKEND_API_URL`, `PORT`:

```bash
cd frontend
npm run pm2:reload
```

### หลังแก้ `NEXT_PUBLIC_*` หรือ `NEXT_PUBLIC_BASE_PATH`

ค่าเหล่านี้ถูกฝังใน client bundle ตอน **`next build`** — ต้อง build ใหม่แล้วค่อย reload:

```bash
npm run build
npm run pm2:reload
```

### พอร์ตและ reverse proxy

- ค่าเริ่มต้นใน **`ecosystem.config.cjs`**: `PORT=7200` (หรือใส่ `PORT` ใน `.env`)
- ฝั่ง Apache/Nginx มักตั้ง **path** เช่น `/med-supplies` เป็น **reverse proxy** ไป `http://127.0.0.1:7200/med-supplies` (ให้ตรงกับ `NEXT_PUBLIC_BASE_PATH` และพอร์ต PM2)

### หมายเหตุ

- อย่าใช้แค่ `pm2 restart med-supplies-vtn-next-app` ถ้าต้องการให้ค่าจากไฟล์ `.env` อัปเดต — ใช้ **`pm2 reload ecosystem.config.cjs --update-env`** หรือ `npm run pm2:reload`
- ถ้าเข้าแอปได้ทาง IP แต่ login ผิดปกติ ให้ตรวจ **`NEXTAUTH_URL`** และ **`BACKEND_API_URL`** ให้ตรงกับ URL จริงและพอร์ต backend บนเครื่องเดียวกัน

---

## 3) ลำดับ deploy แนะนำ

1. ขึ้น backend ก่อน → ทดสอบ `curl http://127.0.0.1:<PORT>/api/smart-cabinet-vn/v1/...`
2. ตั้ง reverse proxy (Apache/Nginx) ไปที่พอร์ต backend และพอร์ต frontend ตามโครงสร้างจริง
3. ตั้ง `NEXT_PUBLIC_API_URL` / `BACKEND_API_URL` / `NEXTAUTH_URL` ให้สอดคล้องกับ URL จริง
4. `npm run build` ที่ frontend แล้ว `pm2 start` ทั้งสองฝั่ง
5. `pm2 save` และถ้าต้องการเปิดเครื่องแล้วรันอัตโนมัติ: `pm2 startup` แล้วรันคำสั่งที่ PM2 แสดง

---

## 4) ตรวจสอบสถานะ

```bash
pm2 status
pm2 logs med-supplies-vtn-backend --lines 80
pm2 logs med-supplies-vtn-next-app --lines 80
```

---

## 5) ปัญหาที่พบบ่อย

- **`Script not found` / ไม่มี entry (Backend)** — ยังไม่ build; ไฟล์รันคือ `dist/src/main.js` รัน `npm run build` ใน `backend` ก่อน หรือ `npm run pm2:start:build` (ecosystem จะเตือนถ้าไม่มี `dist/src/main.js`)
- **แก้ `.env` แล้วค่าไม่เปลี่ยน** — ใช้ `pm2 reload ecosystem.config.cjs --update-env` ไม่ใช่แค่ `restart` เปล่า ๆ
- **Login NextAuth 401** — ตรวจ `BACKEND_API_URL` ให้ Node บนเครื่องเดียวกับ backend ยิงถึง API ได้ และ `NEXTAUTH_URL` ตรงกับ URL ในเบราว์เซอร์ (https / www ให้สอดคล้อง)
- **CORS ในเบราว์เซอร์** — แก้ที่ backend `CORS_ORIGIN` เป็น origin แบบไม่มี path และรวมทั้ง host ที่หน้าเว็บใช้ (เช่น ทั้ง apex และ `www`)

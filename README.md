# Smart Cabinet CU App

แอปพลิเคชันจัดการตู้ Smart Cabinet และเวชภัณฑ์ (Medical Supplies) สำหรับหน่วยงาน CU — ประกอบด้วย Backend (NestJS) และ Frontend (Next.js)

---

## สารบัญ

- [ภาพรวม](#-ภาพรวม)
- [สถาปัตยกรรม](#-สถาปัตยกรรม)
- [ฟีเจอร์หลัก](#-ฟีเจอร์หลัก)
- [Tech Stack](#-tech-stack)
- [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [Quick Start](#-quick-start)
- [Deployment](#-deployment)
- [API](#-api)
- [ตัวแปรสภาพแวดล้อม](#-ตัวแปรสภาพแวดล้อม)
- [เอกสารเพิ่มเติม](#-เอกสารเพิ่มเติม)

---

## ภาพรวม

**Smart Cabinet CU App** (samart-cabinet-cu-app) เป็นระบบจัดการตู้ Smart Cabinet และเวชภัณฑ์ รองรับ:

- **จัดการตู้ Cabinet** — เชื่อมโยงตู้กับแผนก (Department) และจัดการสต๊อก
- **เวชภัณฑ์และอุปกรณ์** — รายการอุปกรณ์ (Item), หมวดหมู่ (Category), สต๊อกในตู้
- **การเบิก–คืน** — เบิกจากตู้ (Dispense), เติมเข้าตู้ (Return to Cabinet), แจ้งคืนอุปกรณ์ที่ไม่ใช้ (Return)
- **บันทึกการใช้งาน** — บันทึกใช้อุปกรณ์กับคนไข้, สถิติการเบิก/ใช้
- **รายงาน** — รายงาน PDF/Excel (เปรียบเทียบการเบิก–ใช้, สต๊อกตู้, Vending mapping, ยกเลิก Bill ฯลฯ)
- **สิทธิ์และผู้ใช้** — Staff/Admin, บทบาท (Role), สิทธิ์เมนู (Permission), JWT / Firebase / 2FA

---

## สถาปัตยกรรม

ระบบเป็น **Backend เดี่ยว (Monolith)** + **Frontend** ไม่ได้แยกเป็น Microservices หลายตัว

```
┌─────────────────────────────────────────────────┐
│              Client (Web Browser)                │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────┐
│           Frontend (Next.js 15)                  │
│  - React 19 + TypeScript                        │
│  - Tailwind CSS + shadcn/ui (Radix)             │
│  - Next-Auth, Firebase                          │
│  - Port: 3100                                   │
└──────────────────┬──────────────────────────────┘
                   │ REST API
                   ▼
┌─────────────────────────────────────────────────┐
│           Backend (NestJS 11)                    │
│  - Global prefix: /smart-cabinet-cu/api/v1      │
│  - Port: 3000 (หรือตาม env PORT)               │
│  - Modules: Auth, Category, Department, Item,   │
│    MedicalSupplies, Report, Email, Prisma        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│              Database (MySQL)                    │
│  - Prisma ORM                                  │
└─────────────────────────────────────────────────┘
```

---

## ฟีเจอร์หลัก

### การจัดการผู้ใช้และสิทธิ์

- ล็อกอินด้วย JWT, Firebase, Client Credential
- 2FA (TOTP), OTP ทางอีเมล
- Staff User / Role / Permission (เมนูตามบทบาท)
- API Key, Refresh Token

### ตู้ Cabinet และแผนก

- จัดการแผนก (Department) และตู้ Cabinet
- เชื่อมโยงตู้กับแผนก (Cabinet–Department)

### เวชภัณฑ์และอุปกรณ์

- รายการอุปกรณ์ (Item), หมวดหมู่ (Category)
- สต๊อกในตู้, Min/Max
- อัปโหลดข้อมูล

### การเบิกและคืน

- เบิกจากตู้ (Dispense from Cabinet)
- เติมเข้าตู้ (Return to Cabinet)
- แจ้งคืนอุปกรณ์ที่ไม่ใช้งาน (Return)
- บันทึกใช้อุปกรณ์กับคนไข้ (Usage record)

### รายงาน (PDF / Excel)

- เปรียบเทียบการเบิกกับการใช้ (Comparison, Item comparison)
- การใช้ equipment (Equipment usage)
- การจ่าย equipment (Equipment disbursement)
- รายการเบิก (Dispensed items, Dispensed items for patients)
- Vending mapping, Unmapped/Unused dispensed
- ยกเลิก Bill (Cancel bill)
- คืนอุปกรณ์ (Return), คืนเข้าตู้ (Return to cabinet)
- สต๊อกตู้ (Cabinet stock)

### อื่นๆ

- อีเมล (Nodemailer)
- Export Excel (ExcelJS), สร้าง PDF (PDFKit)

---

## Tech Stack

### Backend

- **Framework:** NestJS 11 (Node.js + TypeScript)
- **ORM:** Prisma
- **Database:** MySQL
- **Auth:** JWT (Passport), Firebase Admin, Client Credential, 2FA (otplib, qrcode)
- **Validation:** class-validator, class-transformer
- **อีเมล:** Nodemailer
- **รายงาน:** ExcelJS, PDFKit

### Frontend

- **Framework:** Next.js 15 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI:** shadcn/ui (Radix UI)
- **Auth:** Next-Auth, Firebase
- **Form:** react-hook-form + Zod
- **HTTP:** Axios
- **Toast:** Sonner

### Infrastructure

- **Container:** Docker (Frontend มี Dockerfile + docker-compose)
- **Orchestration:** Kubernetes (K3s) — มี manifest ใน `frontend/k8s`, `backend/k8s`

---

## โครงสร้างโปรเจกต์

```
samart-cabinet-cu-app/
├── backend/                    # Backend (NestJS)
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── auth/               # ล็อกอิน, JWT, Firebase, 2FA, Staff
│   │   ├── category/          # หมวดหมู่
│   │   ├── department/        # แผนก + Cabinet
│   │   ├── item/              # รายการอุปกรณ์/สต๊อก
│   │   ├── medical-supplies/  # เวชภัณฑ์, เบิก, คืน, ใช้กับคนไข้
│   │   ├── report/            # รายงาน PDF/Excel
│   │   ├── email/             # ส่งอีเมล
│   │   ├── prisma/            # Prisma module
│   │   └── utils/             # Date-time ฯลฯ
│   ├── prisma/
│   │   └── schema.prisma
│   ├── docker/                # Docker (compose อาจอ้างอิง frontend)
│   ├── k8s/                   # K8s manifests
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # Frontend (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── staff/         # หน้า Staff (Dashboard, Cabinet, เบิก, คืน, รายงาน, ตั้งค่า)
│   │   │   ├── admin/        # หน้า Admin
│   │   │   └── ...
│   │   ├── components/
│   │   ├── lib/               # api, staffApi, firebase, validations
│   │   ├── types/
│   │   └── hooks/
│   ├── docker/                # Dockerfile, docker-compose
│   ├── k8s/                   # K8s deployment
│   ├── package.json
│   └── .env.example
│
└── README.md                   # ไฟล์นี้
```

---

## Quick Start

### ข้อกำหนด

- Node.js 20+
- MySQL
- (ถ้าใช้ Firebase/Email) ตั้งค่า Firebase และ SMTP ตาม env

### Backend

```bash
cd backend

# ติดตั้ง dependencies
npm install

# ตั้งค่า environment
cp .env.example .env
# แก้ไข .env (DATABASE_URL, JWT_SECRET ฯลฯ)

# สร้าง DB และ migrate
npx prisma migrate dev

# รัน Backend
npm run start:dev
```

Backend จะรันที่ `http://localhost:3000` (หรือตาม `PORT` ใน `.env`)  
Base path ของ API: **`/smart-cabinet-cu/api/v1`**

### Frontend

```bash
cd frontend

# ติดตั้ง dependencies
npm install

# ตั้งค่า environment
cp .env.example .env.local
# แก้ไข NEXT_PUBLIC_API_URL ให้ชี้ไปที่ Backend เช่น
# http://localhost:3000/smart-cabinet-cu/api/v1

# รัน Frontend
npm run dev
```

Frontend จะรันที่ **http://localhost:3100**

### การเข้าใช้

- **Frontend:** http://localhost:3100
- **Backend API:** http://localhost:3000/smart-cabinet-cu/api/v1
- **Health check:** http://localhost:3000/smart-cabinet-cu/api/v1/health

---

## Deployment

### Docker (Frontend)

โฟลเดอร์ `frontend/docker` มี Dockerfile และ docker-compose สำหรับ build และรัน Frontend:

```bash
cd frontend
# สร้าง network ก่อน (ถ้าใช้ external)
docker network create pose-network

cd docker
docker compose up -d
```

ดูรายละเอียดใน [frontend/docker/README.md](frontend/docker/README.md)

### Kubernetes (K3s)

- **Frontend:** ใช้ manifest ใน `frontend/k8s/` (เช่น `frontend-deployment.yaml`)
- **Backend:** ใช้ manifest ใน `backend/k8s/` ถ้ามี deployment สำหรับ Backend

ขั้นตอนคร่าวๆ (Frontend):

```bash
cd frontend
# Build image
docker build -f docker/Dockerfile -t frontend-pose:latest .

# Import เข้า K3s (ถ้าใช้ local image)
docker save frontend-pose:latest | sudo k3s ctr images import -

# Deploy
kubectl create namespace pose-microservices  # ถ้ายังไม่มี
kubectl apply -f k8s/
```

ดู [frontend/k8s/QUICK-DEPLOY-GUIDE.md](frontend/k8s/QUICK-DEPLOY-GUIDE.md) และ [frontend/k8s/README.md](frontend/k8s/README.md)

---

## API

Base URL: **`/smart-cabinet-cu/api/v1`**

### กลุ่มหลัก

| กลุ่ม | Path | ตัวอย่าง |
|--------|------|----------|
| Auth | `/auth` | POST login, register, profile, 2FA, firebase/login, client-credential |
| Category | `/category` | CRUD, tree, slug, children |
| Department | `/department` | CRUD แผนก, CRUD cabinet |
| Item | `/item` | CRUD, upload, stats, by-user, in-cabinet, will-return, minmax |
| Medical Supplies | `/medical-supplies` | CRUD, record-used, record-return, dispense-from-cabinet, return-to-cabinet, รายการเบิก/คืน, cancel-bill ฯลฯ |
| Reports | `/reports` | POST endpoints สำหรับ export Excel/PDF (comparison, equipment-usage, cabinet-stock, return, return-to-cabinet, vending-mapping ฯลฯ) |

รายละเอียด endpoint จริงดูจาก controller ใน `backend/src` (auth, category, department, item, medical-supplies, report).

---

## ตัวแปรสภาพแวดล้อม

### Backend (`.env`)

ดูจาก `backend/.env.example` โดยประมาณ:

```bash
# Database
DATABASE_URL="mysql://user:password@host:port/database_name"
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_NAME=database_name
DATABASE_HOST=localhost
DATABASE_PORT=3306

# Server
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
```

(ถ้ามี Firebase, SMTP ฯลฯ ให้เพิ่มใน `.env` ตามที่ใช้)

### Frontend (`.env.local` / `.env`)

ดูจาก `frontend/.env.example`:

```bash
# API URL (ต้องลงท้ายด้วย base path ของ API)
NEXT_PUBLIC_API_URL=http://localhost:3000/smart-cabinet-cu/api/v1

# Firebase (ถ้าใช้)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ...
```

สำหรับ production (Docker/K8s) ตั้ง `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_BASE_PATH` (ถ้าใช้) ให้ตรงกับ URL จริง

---

## เอกสารเพิ่มเติม

- [frontend/README.md](frontend/README.md) — Frontend
- [frontend/DEPLOYMENT-GUIDE.md](frontend/DEPLOYMENT-GUIDE.md) — คู่มือ deploy Frontend
- [frontend/DOCKER-K8S-SETUP.md](frontend/DOCKER-K8S-SETUP.md) — Docker และ K8s
- [frontend/docker/README.md](frontend/docker/README.md) — Docker ของ Frontend
- [frontend/k8s/README.md](frontend/k8s/README.md) — K8s
- [frontend/k8s/QUICK-DEPLOY-GUIDE.md](frontend/k8s/QUICK-DEPLOY-GUIDE.md) — Deploy แบบเร็ว
- [frontend/k8s/CONFIGURATION.md](frontend/k8s/CONFIGURATION.md) — การตั้งค่า K8s
- [backend/README.md](backend/README.md) — Backend (ถ้ามี)
- [frontend/COMPARISON_REPORT_README.md](frontend/COMPARISON_REPORT_README.md) — รายงานเปรียบเทียบ (ถ้าเกี่ยวข้อง)

---

## License

โปรเจกต์นี้ใช้สัญญาอนุญาต MIT (หรือตามที่กำหนดในโปรเจกต์)

---

**Smart Cabinet CU App** — Backend: NestJS + Prisma (MySQL) | Frontend: Next.js + React

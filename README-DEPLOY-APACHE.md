# Deploy ด้วย Apache 2.4 (reverse proxy → PM2)

คู่มือนี้ตั้ง Apache 2.4 เป็น reverse proxy หน้า PM2 ของโปรเจกต์ **medical-supplies-rajavithi**  
รันแอปด้วย PM2 ก่อน — ดู [README-DEPLOY-PM2.md](README-DEPLOY-PM2.md)

---

## ไฟล์ตัวอย่างใน repo

| ไฟล์ | ใช้เมื่อ |
|------|----------|
| [httpd-apache24.conf.example](httpd-apache24.conf.example) | VirtualHost เต็ม (HTTP→HTTPS + SSL + ProxyPass) |
| [httpd-vhosts.conf.example](httpd-vhosts.conf.example) | ใส่เฉพาะบล็อก path ลงใน VirtualHost ที่มีอยู่แล้ว |

---

## สิ่งที่ต้องมี

- Apache **2.4** พร้อมโมดูล: `proxy`, `proxy_http`, `rewrite`, `headers`, `ssl`
- Backend PM2 ที่พอร์ต **7100** (หรือตาม `PORT` ใน `backend/.env`)
- Frontend PM2 ที่พอร์ต **7200** (หรือตาม `PORT` ใน `frontend/.env`)
- ใบรับรอง SSL (production)

---

## Path และพอร์ต

| ส่วน | URL ภายนอก (ตัวอย่าง) | Proxy ไป |
|------|------------------------|----------|
| Frontend | `https://phc.dyndns.biz/medical-supplies-rajavithi` | `http://127.0.0.1:7200/medical-supplies-rajavithi` |
| API | `https://phc.dyndns.biz/api/medical-supplies-rajavithi/v1/...` | `http://127.0.0.1:7100/api/medical-supplies-rajavithi/v1/...` |

**ลำดับใน config สำคัญ:** กำหนด `/api/medical-supplies-rajavithi/` **ก่อน** `/medical-supplies-rajavithi` เพื่อไม่ให้ API ชน frontend

ถ้า Apache กับ PM2 คนละเครื่อง เปลี่ยน `127.0.0.1` เป็น IP ของแอปเซิร์ฟเวอร์

---

## 1) เปิดโมดูล

### Linux (Debian/Ubuntu)

```bash
sudo a2enmod proxy proxy_http rewrite headers ssl
sudo systemctl reload apache2
```

### Windows (Apache Lounge / XAMPP)

ใน `httpd.conf` ให้มี (และไม่ comment):

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
LoadModule ssl_module modules/mod_ssl.so
```

หลังแก้ config ให้ทดสอบ syntax แล้ว **restart** service (PowerShell รันแบบ Administrator):

```powershell
# ตรวจชื่อ service (มักเป็น Apache2.4)
Get-Service *Apache*

# ทดสอบ config ก่อน (แก้ path ให้ตรงที่ติดตั้ง Apache)
& "C:\Apache24\bin\httpd.exe" -t

# Restart
Restart-Service Apache2.4

# ตรวจสถานะ
Get-Service Apache2.4
```

คำสั่งอื่นที่ใช้บ่อย:

```powershell
Start-Service Apache2.4
Stop-Service Apache2.4
Restart-Service Apache2.4
```

---

## 2) ใส่ config

### แบบ VirtualHost เต็ม

1. คัดลอก `httpd-apache24.conf.example` ไปยังเซิร์ฟเวอร์ เช่น  
   - Linux: `/etc/apache2/sites-available/medical-supplies-rajavithi.conf`  
   - Windows: Include ใน `conf/extra/httpd-vhosts.conf` หรือไฟล์ที่ `httpd.conf` Include อยู่แล้ว  
   - หรือ Include ใน `httpd-vhosts.conf`
2. แก้ `ServerName`, path ใบรับรอง SSL, และ IP/พอร์ต PM2
3. เปิดไซต์แล้ว reload / restart:

```bash
# Debian/Ubuntu ตัวอย่าง
sudo a2ensite medical-supplies-rajavithi.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

```powershell
# Windows — PowerShell (Administrator)
& "C:\Apache24\bin\httpd.exe" -t
Restart-Service Apache2.4
```

### แบบแทรกใน VirtualHost เดิม

คัดลอกเนื้อหาจาก `httpd-vhosts.conf.example` ใส่ใน `<VirtualHost *:443>` ที่มีอยู่แล้ว แล้ว `configtest` + reload (Linux) หรือ `Restart-Service Apache2.4` (Windows)

---

## 3) ตั้งค่า .env ให้ตรงกับ Apache

### Frontend (`frontend/.env` หรือ `.env.production`)

```env
NEXTAUTH_URL=https://phc.dyndns.biz/medical-supplies-rajavithi
NEXT_PUBLIC_BASE_PATH=/medical-supplies-rajavithi
NEXT_PUBLIC_API_URL=https://phc.dyndns.biz/api/medical-supplies-rajavithi/v1
BACKEND_API_URL=http://127.0.0.1:7100/api/medical-supplies-rajavithi/v1
PORT=7200
```

หลังแก้ `NEXT_PUBLIC_*` ต้อง `npm run build` แล้ว `pm2 reload`  
หลังแก้เฉพาะ `NEXTAUTH_*` / `BACKEND_API_URL` ใช้ `npm run pm2:reload` พอ

### Backend (`backend/.env`)

```env
API_NAME=medical-supplies-rajavithi
PORT=7100
CORS_ORIGIN=https://phc.dyndns.biz
```

`CORS_ORIGIN` ใส่เฉพาะ origin (scheme + host) **ไม่ใส่ path**

---

## 4) ตรวจสอบ

```bash
# Backend ตรง ๆ
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:7100/api/medical-supplies-rajavithi/v1/

# ผ่าน Apache (HTTPS)
curl -sS -o /dev/null -w "%{http_code}\n" https://phc.dyndns.biz/api/medical-supplies-rajavithi/v1/
curl -sS -o /dev/null -w "%{http_code}\n" https://phc.dyndns.biz/medical-supplies-rajavithi

# สถานะ PM2
pm2 status
```

เปิดเบราว์เซอร์ที่ `https://<โดเมน>/medical-supplies-rajavithi` แล้วทดสอบ login

---

## 5) ปัญหาที่พบบ่อย

| อาการ | ตรวจอะไร |
|--------|----------|
| 404 ที่ path แอป | `NEXT_PUBLIC_BASE_PATH` ตรงกับ `ProxyPass` หรือยัง; PM2 frontend รันที่พอร์ตที่ config ชี้หรือไม่ |
| API 404 / HTML จาก Next | ลำดับ Location — API ต้องมาก่อน frontend |
| Login / redirect ผิด | `NEXTAUTH_URL` ต้องเป็น URL ที่พิมพ์ในเบราว์เซอร์ (https + path base); มี `X-Forwarded-Proto` / `X-Forwarded-Host` |
| CORS ในเบราว์เซอร์ | `CORS_ORIGIN` รวม host ที่เปิดหน้าเว็บ (ไม่มี path) |
| 502 Bad Gateway | PM2 ล่มหรือพอร์ตผิด — `pm2 status` และ `curl` ไป `127.0.0.1:7100` / `:7200` |
| SSL error | path `SSLCertificateFile` / `SSLCertificateKeyFile` และ `Listen 443` |

---

## ลำดับ deploy แนะนำ

1. Build + `pm2 start` backend และ frontend ([README-DEPLOY-PM2.md](README-DEPLOY-PM2.md))
2. ทดสอบ `curl` ไปพอร์ต local ของทั้งสองฝั่ง
3. ตั้ง Apache ตามไฟล์ตัวอย่าง แล้ว `configtest` + reload (Linux) หรือ `Restart-Service Apache2.4` (Windows)
4. ตั้ง `.env` ให้ตรง URL สาธารณะ → rebuild frontend ถ้าแก้ `NEXT_PUBLIC_*`
5. ทดสอบ HTTPS จากภายนอกและ login

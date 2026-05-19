# ⚡ Quick Deployment Guide - Frontend

คู่มือสำหรับ Deploy และ Update Frontend บน K3s แบบรวดเร็ว

---

## 📋 สารบัญ

1. [🆕 Quick First Deploy](#-quick-first-deploy-ครั้งแรก)
2. [🔄 Quick Update](#-quick-update-อัพเดท)

---

## 🆕 Quick First Deploy (ครั้งแรก)

### **ใช้เมื่อ:**
- ติดตั้งครั้งแรก
- Deployment ยังไม่มีใน K3s
- ต้องการสร้าง deployment ใหม่

### **วิธีใช้:**

```bash
# 1. ไปที่ folder k8s
cd /var/www/app/frontend/k8s

# 2. ให้สิทธิ์ execute (ทำครั้งแรกเท่านั้น)
chmod +x deploy-first-time.sh

# 3. รัน script
./deploy-first-time.sh
```

---

## 🔄 Quick Update (อัพเดท)

### **ใช้เมื่อ:**
- มี deployment อยู่แล้ว
- ต้องการอัพเดทโค้ดใหม่
- แก้ไข bugs หรือเพิ่ม features

### **วิธีใช้:**

```bash
# 1. ไปที่ folder k8s
cd /var/www/app/frontend/k8s

# 2. ให้สิทธิ์ execute (ทำครั้งแรกเท่านั้น)
chmod +x update-service.sh

# 3. รัน script
./update-service.sh
```

---

## ⚙️ Configuration

Scripts จะใช้ค่าเหล่านี้โดยอัตโนมัติ:

```bash
IMAGE_NAME="frontend-pose:latest"
NAMESPACE="pose-microservices"
DEPLOYMENT_NAME="frontend"
API_URL="http://10.11.9.84:3000/api/v1"
```

**ถ้าต้องการเปลี่ยน API URL:**
แก้ไขในไฟล์ script:
- `deploy-first-time.sh` (บรรทัดที่ 21)
- `update-service.sh` (บรรทัดที่ 21)

---

**อัพเดทล่าสุด:** 2025-01-21  
**Version:** 2.0.0


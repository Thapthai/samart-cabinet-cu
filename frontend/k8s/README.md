# 🚀 Frontend K3s/K8s Deployment Guide

This guide covers deploying the POSE Frontend to K3s/K8s.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build & Import](#build--import)
3. [Deploy to K3s](#deploy-to-k3s)
4. [Access Frontend](#access-frontend)
5. [Update & Maintain](#update--maintain)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### **Required**

- ✅ K3s installed and running
- ✅ `kubectl` configured (`KUBECONFIG` set)
- ✅ `pose-microservices` namespace exists
- ✅ Backend services running

### **Verify Prerequisites**

```bash
# Check K3s status
sudo systemctl status k3s

# Check kubectl
kubectl get nodes

# Check namespace
kubectl get namespace pose-microservices

# Check backend services
kubectl get pods -n pose-microservices
```

### **Create Namespace (if not exists)**

หาก namespace `pose-microservices` ยังไม่มี ให้สร้างก่อน:

```bash
# สร้าง namespace
kubectl create namespace pose-microservices

# ตรวจสอบว่าสร้างสำเร็จ
kubectl get namespace pose-microservices

# Expected output:
# NAME                 STATUS   AGE
# pose-microservices   Active   5s
```

**หมายเหตุ:** ถ้า namespace มีอยู่แล้ว คำสั่งจะแสดง error `AlreadyExists` ซึ่งไม่เป็นปัญหา

---

## 🏗️ Build & Import

### **1. Build Docker Image**

```bash
cd /var/www/app/frontend

# Build image with build args (สำคัญ: ต้องส่ง NEXT_PUBLIC_BASE_PATH)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://phc.dyndns.biz/medical-supplies-api/v1/ \
  --build-arg NEXT_PUBLIC_BASE_PATH=/medical-supplies \
  -f docker/Dockerfile \
  -t frontend-pose:latest \
  .

# Alternative: Internal IP (faster, but requires VPN/internal network)
# docker build \
#   --build-arg NEXT_PUBLIC_API_URL=http://10.11.9.84:3000/api/v1 \
#   --build-arg NEXT_PUBLIC_BASE_PATH=/medical-supplies \
#   -f docker/Dockerfile \
#   -t frontend-pose:latest \
#   .
```

**✅ Default Values ใน Dockerfile:**
- `NEXT_PUBLIC_API_URL`: `https://phc.dyndns.biz/medical-supplies-api/v1/`
- `NEXT_PUBLIC_BASE_PATH`: `/medical-supplies`

**💡 หมายเหตุ:** Dockerfile มี default values แล้ว สามารถ build แบบง่ายๆ ได้โดยไม่ต้องส่ง build args (แต่ถ้าต้องการ override ก็ส่ง `--build-arg` ได้)

**Expected Output:**

```
[+] Building 45.3s (18/18) FINISHED
 => [internal] load build definition from Dockerfile
 => [internal] load .dockerignore
 => [deps 1/4] FROM docker.io/library/node:20-alpine
 ...
 => => naming to docker.io/library/frontend-pose:latest
```

### **2. Verify Image**

```bash
# Check if image exists
docker images | grep frontend-pose

# Expected output:
# frontend-pose    latest    abc123def456    2 minutes ago    200MB

# Verify NEXT_PUBLIC_BASE_PATH is set correctly
docker inspect frontend-pose:latest --format='{{range .Config.Env}}{{println .}}{{end}}' | grep NEXT_PUBLIC_BASE_PATH

# Expected output:
# NEXT_PUBLIC_BASE_PATH=/medical-supplies
```

**⚠️ สำคัญ:** ถ้าเห็น `NEXT_PUBLIC_BASE_PATH=` (empty) แสดงว่า build ไม่ถูกต้อง ต้อง rebuild ด้วย `--build-arg`

### **3. Import to K3s**

```bash
# Import image
docker save frontend-pose:latest | sudo k3s ctr images import -

```

**Expected Output:**

```
unpacking docker.io/library/frontend-pose:latest (sha256:...)...done
```

### **4. Verify Import**

```bash
# Check if image is in K3s
sudo k3s ctr images ls | grep frontend-pose

# Expected output:
# docker.io/library/frontend-pose:latest    application/vnd.docker...
```

---

## 🚀 Deploy to K3s

### **1. Review Deployment Configuration**

Edit `k8s/frontend-deployment.yaml` if needed:

```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://10.11.9.84:3000/api" # ⚠️ Update this to your Gateway IP
```

### **2. Deploy**

```bash
# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml
```

**Expected Output:**

```
deployment.apps/frontend created
service/frontend-service created
```

### **3. Verify Deployment**

```bash
# Check pods
kubectl get pods -n pose-microservices -l app=frontend

# Expected output:
# NAME                        READY   STATUS    RESTARTS   AGE
# frontend-xxxxxxxxxx-xxxxx   1/1     Running   0          30s

# Check service
kubectl get svc -n pose-microservices frontend-service

# Expected output:
# NAME               TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
# frontend-service   LoadBalancer   10.43.xxx.xxx   10.11.9.84    80:30100/TCP   30s
```

### **4. Wait for Ready**

```bash
# Watch pod status
kubectl get pods -n pose-microservices -l app=frontend -w

# Wait for STATUS: Running and READY: 1/1
```

---

## 🌐 Access Frontend

### **Method 1: Via NodePort**

```bash
# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# Access frontend
echo "Frontend URL: http://$SERVER_IP:30100"

# Test
curl http://$SERVER_IP:30100
```

### **Method 2: Via LoadBalancer IP**

```bash
# Get LoadBalancer IP
kubectl get svc -n pose-microservices frontend-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Access via LoadBalancer
# http://<LOADBALANCER_IP>
```

### **Method 3: Port Forward (Testing)**

```bash
# Port forward to local machine
kubectl port-forward -n pose-microservices svc/frontend-service 8080:80

# Access via localhost
# http://localhost:8080
```

---

## 🔄 Update & Maintain

### **Update Image**

```bash
# 1. Build image
docker build -f docker/Dockerfile -t frontend-pose:latest .

# 2. Verify image
docker images | grep frontend-pose

# 3. Import to K3s
docker save frontend-pose:latest | sudo k3s ctr images import -

# 4. Verify import
sudo k3s ctr images ls | grep frontend-pose
```

### **Apply Updated Image**

#### **วิธีที่ 1: Delete Pod (Quick)**

```bash
# ลบ pod เก่า K8s จะสร้างใหม่ทันที
kubectl delete pod -n pose-microservices -l app=frontend

# รอ pod ใหม่
kubectl get pods -n pose-microservices -l app=frontend -w
# กด Ctrl+C เมื่อเห็น STATUS: Running และ READY: 1/1
```

#### **วิธีที่ 2: Rollout Restart (แนะนำสำหรับ Production)** ⭐

```bash
# Restart deployment อย่างเป็นระบบ
kubectl rollout restart deployment/frontend -n pose-microservices

# ดู progress
kubectl rollout status deployment/frontend -n pose-microservices

# ตรวจสอบ pod ใหม่
kubectl get pods -n pose-microservices -l app=frontend
```

**ข้อดีของ Rollout Restart:**
- ✅ ทำ rolling update อย่างปลอดภัย
- ✅ สามารถ rollback ได้ถ้ามีปัญหา
- ✅ Zero-downtime (ถ้ามีหลาย replicas)
- ✅ เก็บ revision history ไว้

### **Restart Deployment**

```bash
# Restart deployment
kubectl rollout restart deployment/frontend -n pose-microservices

# Check rollout status
kubectl rollout status deployment/frontend -n pose-microservices
```

### **Scale Deployment**

```bash
# Scale to 2 replicas
kubectl scale deployment/frontend -n pose-microservices --replicas=2

# Verify
kubectl get pods -n pose-microservices -l app=frontend
```

---

## 🔍 Monitoring & Logs

### **View Logs**

```bash
# View logs
kubectl logs -n pose-microservices -l app=frontend -f

# View logs from specific pod
kubectl logs -n pose-microservices <pod-name> -f
```

### **Check Pod Status**

```bash
# Detailed pod info
kubectl describe pod -n pose-microservices -l app=frontend

# Get pod events
kubectl get events -n pose-microservices --field-selector involvedObject.name=<pod-name>
```

### **Resource Usage**

```bash
# Check CPU/Memory usage
kubectl top pods -n pose-microservices -l app=frontend
```

---

## 🐛 Troubleshooting

### **Issue: Pod stuck in Pending**

```bash
# Check pod events
kubectl describe pod -n pose-microservices -l app=frontend

# Common causes:
# - Insufficient resources
# - Image not found
# - Node not ready
```

**Solution:**

```bash
# Check resources
kubectl top nodes

# Reduce resource requests in deployment.yaml
resources:
  requests:
    memory: "64Mi"  # Reduced from 128Mi
    cpu: "50m"      # Reduced from 100m
```

### **Issue: Pod in CrashLoopBackOff**

```bash
# Check logs
kubectl logs -n pose-microservices -l app=frontend --tail=100

# Common causes:
# - Application error
# - Missing environment variables
# - Port already in use
```

**Solution:**

```bash
# Check environment variables
kubectl exec -n pose-microservices <pod-name> -- env | grep NEXT_PUBLIC

# Update and redeploy
kubectl apply -f k8s/frontend-deployment.yaml
```

### **Issue: Cannot access frontend**

```bash
# Check service
kubectl get svc -n pose-microservices frontend-service

# Check endpoints
kubectl get endpoints -n pose-microservices frontend-service

# Test from within cluster
kubectl run -it --rm debug --image=alpine --restart=Never -n pose-microservices -- sh
# Inside pod: wget -qO- http://frontend-service
```

**Solution:**

```bash
# Check if pod is running
kubectl get pods -n pose-microservices -l app=frontend

# Check if service selector matches pod labels
kubectl describe svc -n pose-microservices frontend-service
```

### **Issue: 502 Bad Gateway**

```bash
# Check if backend is accessible
kubectl exec -n pose-microservices -l app=frontend -- sh -c "wget -qO- http://gateway-service.pose-microservices:3000/api"

# Check NEXT_PUBLIC_API_URL
kubectl exec -n pose-microservices -l app=frontend -- env | grep NEXT_PUBLIC_API_URL
```

**Solution:**

```bash
# Update API URL in deployment
# Edit k8s/frontend-deployment.yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://<CORRECT_GATEWAY_IP>:3000/api"

# Apply changes
kubectl apply -f k8s/frontend-deployment.yaml
kubectl rollout restart deployment/frontend -n pose-microservices
```

### **Issue: Image not found in K3s**

```bash
# Check if image exists
sudo k3s ctr images ls | grep frontend-pose

# If not found, rebuild and import
docker build -f docker/Dockerfile -t frontend-pose:latest .
docker save frontend-pose:latest | sudo k3s ctr images import -
```

### **Issue: Out of Memory (OOMKilled)**

```bash
# Check pod status
kubectl describe pod -n pose-microservices -l app=frontend | grep -A 5 "Last State"

# If shows "OOMKilled", increase memory limit
# Edit k8s/frontend-deployment.yaml
resources:
  limits:
    memory: "1Gi"  # Increased from 512Mi
```

---

## 🔐 Configuration

### **Environment Variables**

Edit `k8s/frontend-deployment.yaml`:

```yaml
env:
  - name: NODE_ENV
    value: "production"

  - name: NEXT_PUBLIC_API_URL
    value: "http://10.11.9.84:3000/api" # Backend Gateway URL

  - name: PORT
    value: "3100"
```

### **Resource Limits**

Adjust based on your server capacity:

```yaml
resources:
  requests:
    memory: "128Mi" # Minimum memory
    cpu: "100m" # Minimum CPU (0.1 core)
  limits:
    memory: "512Mi" # Maximum memory
    cpu: "500m" # Maximum CPU (0.5 core)
```

### **Service Configuration**

```yaml
spec:
  type: LoadBalancer # Use NodePort for specific port
  ports:
    - port: 80 # Service port
      targetPort: 3100 # Container port
      nodePort: 30100 # External access port (30000-32767)
```

---

## 📊 Health Checks

The deployment includes health checks:

```yaml
livenessProbe:
  httpGet:
    path: /
    port: 3100
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /
    port: 3100
  initialDelaySeconds: 10
  periodSeconds: 5
```

**Monitor Health:**

```bash
# Check readiness
kubectl get pods -n pose-microservices -l app=frontend

# If not ready, check logs
kubectl logs -n pose-microservices -l app=frontend
```

---

## 🎯 Production Checklist

- [ ] ✅ K3s running and healthy
- [ ] ✅ Backend services deployed and running
- [ ] ✅ Frontend image built
- [ ] ✅ Image imported to K3s
- [ ] ✅ Deployment created
- [ ] ✅ Pod running (READY 1/1)
- [ ] ✅ Service accessible
- [ ] ✅ API calls work (check browser console)
- [ ] ✅ Environment variables correct
- [ ] ✅ Resource limits appropriate
- [ ] ✅ Logs show no errors
- [ ] ✅ Health checks passing

---

## 📚 Quick Commands Reference

```bash
# Build & Deploy
make k8s-build          # Build image
make k8s-import         # Import to K3s
make k8s-deploy         # Deploy to K3s
make full-deploy        # All above steps

# Monitor
make k8s-status         # Show status
make k8s-logs           # View logs

# Maintain
make k8s-restart        # Restart deployment
make k8s-delete         # Delete deployment

# Debug
kubectl get pods -n pose-microservices -l app=frontend
kubectl describe pod -n pose-microservices -l app=frontend
kubectl logs -n pose-microservices -l app=frontend -f
kubectl exec -n pose-microservices -l app=frontend -- sh
```

---

**Happy Deploying! 🚀**

# 🐳 Docker Guide - RetroTrade

## 📁 Cấu trúc Docker files

```
RetroTrade/
├── docker-compose.yml          # Production configuration
├── docker-compose.dev.yml      # Development với hot-reload
├── .dockerignore               # Root ignore file
├── backend/
│   ├── Dockerfile              # Backend multi-stage build
│   └── .dockerignore
└── frontend/
    ├── Dockerfile              # Frontend multi-stage build
    └── .dockerignore
```

---

## 🚀 Hướng dẫn sử dụng

### 1️⃣ Development Mode (Hot-reload)

```bash
# Chạy tất cả services với hot-reload
docker-compose -f docker-compose.dev.yml up

# Chạy ở background
docker-compose -f docker-compose.dev.yml up -d

# Xem logs
docker-compose -f docker-compose.dev.yml logs -f

# Dừng services
docker-compose -f docker-compose.dev.yml down
```

**Services trong development:**
| Service | URL | Mô tả |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Next.js với hot-reload |
| Backend | http://localhost:9999 | Express API với nodemon |
| MongoDB | **MongoDB Atlas** | Sử dụng MONGODB_URI từ backend/.env |

---

### 2️⃣ Production Mode

> ✅ **Không cần tạo file .env mới!** Docker sẽ tự động sử dụng:
> - `backend/.env` - cho Backend
> - `frontend/.env` - cho Frontend

**Build và chạy:**

```bash
# Build images
docker-compose build

# Chạy production
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng
docker-compose down
```

---

## 🔧 Các lệnh hữu ích

### Build riêng từng service

```bash
# Build backend
docker-compose build backend

# Build frontend
docker-compose build frontend
```

### Rebuild không dùng cache

```bash
docker-compose build --no-cache
```

### Xem logs từng service

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Truy cập shell container

```bash
# Backend shell
docker exec -it retrotrade-backend sh

# Frontend shell
docker exec -it retrotrade-frontend sh

# MongoDB shell
docker exec -it retrotrade-mongodb mongosh
```

### Xóa tất cả (reset)

```bash
# Dừng và xóa containers, networks
docker-compose down

# Xóa cả volumes (DATABASE SẼ BỊ XÓA!)
docker-compose down -v

# Xóa images
docker-compose down --rmi all
```

---

## 🌐 Cấu hình Ports

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| Frontend | 3000 | 3000 |
| Backend | 9999 | 9999 |
| MongoDB | **MongoDB Atlas** | Cloud (không cần port local) |

---

## 📝 Environment Variables

### Backend cần các biến:

| Variable | Mô tả | Bắt buộc |
|----------|-------|----------|
| `PORT` | Port server (mặc định: 9999) | ✅ |
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET` | Secret key cho JWT | ✅ |
| `FRONTEND_URL` | URL frontend cho CORS | ✅ |
| `CLOUDINARY_*` | Cloudinary config | ✅ |
| `TWILIO_*` | Twilio SMS config | ⚠️ |
| `PAYOS_*` | Payment gateway | ⚠️ |
| `EMAIL_*` | Email SMTP | ⚠️ |
| `GEMINI_API_KEY` | Gemini AI | ⚠️ |

### Frontend cần các biến:

| Variable | Mô tả | Bắt buộc |
|----------|-------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | ✅ |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io URL | ✅ |

---

## 🐛 Troubleshooting

### 1. Port đã được sử dụng

```bash
# Kiểm tra port
netstat -ano | findstr :3000
netstat -ano | findstr :9999

# Kill process (Windows)
taskkill /PID <PID> /F
```

### 2. MongoDB Atlas connection failed

```bash
# Kiểm tra logs backend
docker-compose logs backend

# Đảm bảo MONGODB_URI trong backend/.env đúng
# Kiểm tra IP của bạn đã được whitelist trong Atlas Network Access
```

### 3. Build failed - Out of memory

```bash
# Tăng Docker memory limit trong Docker Desktop Settings
# Recommended: 4GB RAM minimum
```

### 4. Hot-reload không hoạt động (Windows)

Thêm vào `docker-compose.dev.yml`:
```yaml
environment:
  - WATCHPACK_POLLING=true
  - CHOKIDAR_USEPOLLING=true
```

---

## 🔐 Production Security Tips

1. **Đổi password mặc định** của MongoDB
2. **Không expose** MongoDB port (27017) ra internet
3. Sử dụng **HTTPS** với reverse proxy (nginx)
4. Đặt **JWT_SECRET** đủ mạnh (32+ ký tự)
5. Sử dụng **Docker secrets** cho sensitive data

---

## 📊 Monitoring (Optional)

Thêm Portainer để quản lý Docker:

```bash
docker volume create portainer_data
docker run -d -p 9000:9000 --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

Truy cập: http://localhost:9000


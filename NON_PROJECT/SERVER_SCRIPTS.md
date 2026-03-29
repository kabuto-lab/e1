# 🚀 Escort Platform - Quick Start Scripts

## 📁 Available Batch Files

### 1. **restart-server.bat** (Full Restart)
**What it does:**
- ✅ Stops all Docker containers
- ✅ Kills all Node.js processes
- ✅ Cleans npm cache
- ✅ Restarts Docker containers
- ✅ Waits for services to be ready
- ✅ Shows status report

**When to use:**
- Server is frozen/unresponsive
- After code changes that require restart
- First time setup
- Database connection issues

**How to run:**
```
Double-click: restart-server.bat
```

---

### 2. **start-dev.bat** (Start Development)
**What it does:**
- ✅ Checks if Docker is running
- ✅ Installs dependencies (if needed)
- ✅ Starts Turborepo dev server (backend + frontend)

**When to use:**
- After running `restart-server.bat`
- Daily development start
- When you need to run the apps

**How to run:**
```
Double-click: start-dev.bat
```

---

## 🎯 Typical Workflow

### **First Time Setup:**
```
1. restart-server.bat  ← Setup Docker
2. start-dev.bat       ← Start apps
```

### **Daily Development:**
```
1. start-dev.bat       ← Just start apps
```

### **Server Issues / Frozen:**
```
1. restart-server.bat  ← Full restart
2. start-dev.bat       ← Start fresh
```

---

## 🌐 Access Points After Start

| Service | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3001 |
| Backend API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api/docs |
| MinIO Console | http://localhost:9001 |
| Mailhog (Email) | http://localhost:8025 |
| Static HTML | http://localhost:8000/catalog.html |

---

## 🛑 Stop Everything

### Option 1: Stop Docker Only
```bash
docker-compose -f docker-compose.dev.yml down
```

### Option 2: Kill All Node.js
```bash
taskkill /F /IM node.exe
```

### Option 3: Use restart-server.bat
(This does both automatically)

---

## 📋 Docker Services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache/Sessions |
| MinIO | 9000/9001 | File Storage |
| Mailhog | 8025/1025 | Email Testing |

---

## ⚡ Quick Commands

```bash
# Check Docker status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart specific service
docker-compose -f docker-compose.dev.yml restart postgres

# Database studio
cd packages\db && npx drizzle-kit studio
```

---

## 🐛 Troubleshooting

### Port 5432 Already in Use
```bash
# Stop native PostgreSQL service
sc stop postgresql-x64-18
sc config postgresql-x64-18 start= disabled
```

### Node.js Won't Start
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Clean install
npm run clean && npm install
```

### Docker Won't Start
```bash
# Check Docker Desktop is running
# Restart Docker Desktop if needed
```

---

**Last Updated:** 2026-03-20
**Version:** 1.0.0-dev

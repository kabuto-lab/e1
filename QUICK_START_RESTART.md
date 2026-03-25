# 🚀 QUICK START GUIDE
# Escort Platform - Lovnge
# Full System Restart & Development

## ⚡ ONE-COMMAND START (Recommended)

```bash
# Full restart (clean install, Docker, DB migrations)
.\full-restart.bat

# Then start dev servers
.\start-dev.bat
```

---

## 📋 STEP BY STEP

### Option 1: Complete Fresh Start
```bash
# 1. Full system restart (10-15 minutes)
.\full-restart.bat

# 2. Start development servers
.\start-dev.bat
```

### Option 2: Quick Restart (if already set up)
```bash
# 1. Just restart Docker
docker-compose -f docker-compose.dev.yml restart

# 2. Start servers
.\start-dev.bat
```

### Option 3: Manual Start
```bash
# 1. Start Docker
docker-compose -f docker-compose.dev.yml up -d

# 2. Start Backend (terminal 1)
cd apps\api
npm run start:dev

# 3. Start Frontend (terminal 2)
cd apps\web
npm run dev
```

---

## 🌐 ACCESS POINTS

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3001 | Next.js web app |
| **Dashboard** | http://localhost:3001/dashboard | Admin panel |
| **Backend API** | http://localhost:3000 | NestJS API |
| **Swagger Docs** | http://localhost:3000/api/docs | API documentation |
| **MinIO Console** | http://localhost:9001 | File storage UI |
| **Mailhog** | http://localhost:8025 | Email testing |
| **Drizzle Studio** | `npm run db:studio` | Database UI |

---

## 🔧 COMMON COMMANDS

### Docker
```bash
# Start all containers
docker-compose -f docker-compose.dev.yml up -d

# Stop all containers
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart specific service
docker-compose -f docker-compose.dev.yml restart postgres

# Check status
docker-compose -f docker-compose.dev.yml ps
```

### Database
```bash
cd packages\db

# Generate migration
npm run db:generate

# Push to database
npm run db:push

# Run migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

### Backend
```bash
cd apps\api

# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod

# Lint
npm run lint

# Test
npm run test
```

### Frontend
```bash
cd apps\web

# Development mode
npm run dev

# Production build
npm run build
npm run start

# Lint
npm run lint
```

---

## 🐛 TROUBLESHOOTING

### Port 5432 Already in Use
```bash
# Stop native PostgreSQL service
sc stop postgresql-x64-18
sc config postgresql-x64-18 start= disabled

# Then restart Docker
docker-compose -f docker-compose.dev.yml restart postgres
```

### Node.js Processes Stuck
```bash
# Kill all Node.js processes
taskkill /F /IM node.exe

# Or use the restart script
.\full-restart.bat
```

### Database Connection Failed
```bash
# Check .env has correct credentials
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/companion_db

# Restart PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres

# Re-apply migrations
cd packages\db
npm run db:push
```

### MinIO Connection Failed
```bash
# Check MinIO is running
docker-compose -f docker-compose.dev.yml ps minio

# Restart MinIO
docker-compose -f docker-compose.dev.yml restart minio

# Access console: http://localhost:9001
# Username: companion_minio_admin
# Password: companion_minio_password
```

---

## 📁 PROJECT STRUCTURE

```
ES/
├── full-restart.bat      ← Full system restart
├── start-dev.bat         ← Start dev servers
├── .env                  ← Environment variables
├── docker-compose.dev.yml ← Docker services
│
├── apps/
│   ├── api/              ← NestJS backend
│   │   ├── src/
│   │   │   ├── profiles/ ← NEW: Profiles module
│   │   │   ├── models/
│   │   │   ├── media/
│   │   │   └── ...
│   │   └── package.json
│   │
│   └── web/              ← Next.js frontend
│       ├── app/
│       │   ├── dashboard/ ← NEW: Admin dashboard
│       │   ├── models/
│       │   └── ...
│       ├── components/
│       ├── lib/
│       └── package.json
│
└── packages/
    └── db/               ← Drizzle ORM
        ├── src/schema/
        │   ├── model-profiles.ts
        │   └── media.ts
        └── drizzle/      ← Migrations
```

---

## ✅ VERIFICATION CHECKLIST

After starting, verify:

- [ ] Docker containers running (`docker-compose ps`)
- [ ] Backend accessible (http://localhost:3000/health)
- [ ] Swagger UI (http://localhost:3000/api/docs)
- [ ] Frontend accessible (http://localhost:3001)
- [ ] Dashboard accessible (http://localhost:3001/dashboard)
- [ ] MinIO console (http://localhost:9001)
- [ ] Database connected (check logs)

---

## 🎯 MVP WORKFLOW TEST

1. Open http://localhost:3001/dashboard
2. Click "Добавить модель"
3. Fill in form:
   - Name: "Тестовая Модель"
   - Age: 22
   - etc.
4. Click "Создать и продолжить"
5. Upload a photo (drag & drop)
6. Check photo appears in gallery
7. Click "Продолжить"
8. Verify model appears in list

---

**Last Updated:** 2026-03-20  
**Status:** MVP Complete - Ready for Testing

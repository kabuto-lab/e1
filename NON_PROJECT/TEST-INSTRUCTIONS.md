# 🚀 Quick Test Instructions — Lovnge Platform

**Updated:** 2026-03-21 21:50 MSK

---

## ✅ FIXED ISSUES

### 1. API Versioning ✓
- **Issue:** api-client.ts missing `/v1/` prefix
- **Fix:** Added `API_VERSION = '/v1'` to `lib/api-client.ts`
- **Status:** Working

### 2. Enhanced Error Logging ✓
- **Issue:** Empty error object `{}`
- **Fix:** Added response cloning and detailed logging
- **Status:** Working

### 3. PostgreSQL Connection ✓
- **Issue:** Local PostgreSQL blocking port 5432
- **Fix:** Stopped `postgresql-x64-18` service
- **Status:** Working

### 4. Database Tables Created ✓
- **Issue:** init script failed (users table doesn't exist)
- **Fix:** Removed INSERT statements, Drizzle creates tables
- **Status:** All tables created

### 5. Test Admin Created ✓
- **Email:** admin@lovnge.local
- **Password:** Admin123!
- **Status:** Ready to login

---

## 🔑 TEST CREDENTIALS

### Admin Login
```
URL:      http://localhost:3001/admin-login.html
Email:    admin@lovnge.local
Password: Admin123!
```

---

## 🧪 Testing Steps

### Step 1: Check API Health
```bash
curl http://localhost:3000/v1/health
```

**Expected:**
```json
{"status":"ok","timestamp":"2026-03-21T21:17:27.365Z","uptime":2782.31}
```

### Step 2: Check CORS
```bash
curl -I -X OPTIONS http://localhost:3000/api/models -H "Origin: http://localhost:3001"
```

**Expected:**
```
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
```

### Step 3: Test Admin Login
1. Open: `http://localhost:3001/admin-login.html`
2. Enter: `admin@lovnge.local` / `Admin123!`
3. Click "Войти"
4. **Expected:** Redirect to `admin-dashboard.html` with JWT in localStorage

### Step 4: Verify JWT Token
Open browser DevTools → Application → Local Storage

**Should contain:**
- `accessToken` (JWT, 15min expiry)
- `refreshToken` (JWT, 7d expiry)
- `user` (JSON with role: "admin")

---

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Docker (PostgreSQL, Redis, MinIO) | ✅ Running | 4 containers |
| API (NestJS) | ✅ Running | Port 3000 |
| Web (Next.js) | ⚠️ Check | Port 3001 |
| CORS | ✅ Fixed | All origins allowed |
| Admin Auth | ✅ Fixed | JWT implemented |
| Test Users | ✅ Created | Admin + Client |

---

## 🐛 Known Issues (Remaining)

### P0 — Fix Today
- [ ] **Model Creation Form** — Add error handling UI
- [ ] **Admin Dashboard** — Add API status indicator

### P1 — Fix This Week
- [ ] **JWT Guard** — Replace placeholder with real validation
- [ ] **Roles Guard** — Implement RBAC
- [ ] **Rate Limiting** — Install @nestjs/throttler

---

## 🚀 Quick Commands

### Restart Everything
```bash
cd C:\Users\a\Documents\_DEV\Tran\ES
1START.BAT
```

### Check Docker Logs
```bash
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### Kill All Node Processes
```bash
taskkill /F /IM node.exe
```

### Test Login API Directly
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@lovnge.local\",\"password\":\"Admin123!\"}"
```

---

## 📝 Next Steps

1. **Test admin login** at `http://localhost:3001/admin-login.html`
2. **Verify JWT tokens** in localStorage
3. **Access admin dashboard** (`admin-dashboard.html`)
4. **Create test model** from dashboard

**Report any errors to the chat!**

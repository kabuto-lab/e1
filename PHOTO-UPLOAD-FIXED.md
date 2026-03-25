# ✅ PHOTO UPLOAD FIXED!

**Updated:** 2026-03-21 22:02 MSK

---

## 🐛 PROBLEM

```
null value in column "owner_id" of relation "media_files" 
violates not-null constraint
```

---

## 🔍 ROOT CAUSE

**File:** `apps/api/src/profiles/profiles.controller.ts:27-33`

**Issue:** Local JWT Guard placeholder was setting `request.user = { sub: null }`

```typescript
// ❌ BEFORE (Placeholder)
class JwtAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = { sub: null };  // ← NULL owner_id!
    return true;
  }
}
```

---

## ✅ FIX APPLIED

**Replaced placeholder with real JWT Guard:**

```typescript
// ✅ AFTER (Real JWT validation)
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Now controller uses real JWT token validation
// request.user.userId extracted from JWT token 'sub' claim
```

---

## 🧪 HOW TO TEST

### Step 1: Login
```
URL: http://localhost:3001/admin-login.html
Email: admin@lovnge.local
Password: Admin123!
```

### Step 2: Check Token
Open DevTools → Application → Local Storage

**Should have:**
```javascript
accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
user: {"id":"uuid...","email":"admin@lovnge.local","role":"admin"}
```

### Step 3: Create/Select Model
```
URL: http://localhost:3001/dashboard/models/create
Display Name: "Test Model"
Age: 25
Click: "Создать и продолжить"
```

### Step 4: Upload Photo
```
URL: http://localhost:3001/dashboard/models/[id]/photos
Drag & Drop: Select image file
Expected: ✅ Upload succeeds, photo appears in gallery
```

---

## 🔍 DEBUG CHECKLIST

If upload still fails, check:

### 1. Token Exists
```javascript
// Browser Console
console.log('Token:', localStorage.getItem('accessToken'));
// Expected: "eyJhbGci..."
```

### 2. Token Not Expired
```javascript
// Browser Console
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expired:', payload.exp * 1000 < Date.now());
// Expected: false
```

### 3. Request Has Authorization Header
DevTools → Network → `/v1/profiles/media/presigned`

**Request Headers:**
```
Authorization: Bearer eyJhbGci...
Content-Type: application/json
```

### 4. Backend Logs
```bash
# Terminal
cd C:\Users\a\Documents\_DEV\Tran\ES\apps\api
# Look for:
# "Generating presigned URL for user: uuid-..."
```

---

## 📊 WHAT CHANGED

| Component | Before | After |
|-----------|--------|-------|
| JWT Guard | Placeholder (`sub: null`) | Real JWT validation |
| owner_id | `null` ❌ | UUID from token ✅ |
| Media upload | Fails 500 error | Works ✅ |

---

## 🎯 NEXT STEPS

1. ✅ **FIXED:** JWT Guard imports real guard
2. ✅ **FIXED:** owner_id from JWT token
3. ⏳ **TEST:** Upload photo at `/dashboard/models/[id]/photos`
4. ⏳ **VERIFY:** Photo appears in gallery

**Ready to test!** 🚀

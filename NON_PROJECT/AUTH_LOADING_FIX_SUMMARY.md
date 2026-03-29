# Auth Loading/Flickering Fix - Summary

## Problem
- Infinite spinning loader on `/dashboard`
- Cannot reach admin dashboard
- Redirect loop between ProtectedRoute and login

## Root Causes Identified

### 1. ProtectedRoute Redirect Loop
**File:** `apps/web/components/ProtectedRoute.tsx`

**Problem:** The component was redirecting without a guard against multiple redirect attempts, causing an infinite loop.

**Fix Applied:**
- Added `useRef` to track redirect state (`isRedirecting`)
- Added guard: `if (isRedirecting.current) return;`
- Changed role mismatch behavior: now shows "Access Denied" instead of redirecting to dashboard
- Added `/admin-login` to the list of pages that don't trigger redirect

### 2. AuthProvider Initialization Race Condition
**File:** `apps/web/components/AuthProvider.tsx`

**Problem:** React StrictMode double-mount could cause multiple initialization attempts.

**Fix Applied:**
- Added `useRef` flag (`initAttempted`) to prevent multiple init runs
- Added 2-second timeout safeguard to force `loading = false`
- Enhanced error handling to clear partial auth data
- Added more detailed logging with user role

### 3. Admin Login API Endpoint
**File:** `apps/web/app/admin-login/page.tsx`

**Problem:** Hardcoded `/v1/auth/login` endpoint might not exist.

**Fix Applied:**
- Try `/auth/login` first
- Fallback to `/v1/auth/login` on 404
- Added comprehensive logging
- Better error handling

## Files Modified

1. **apps/web/components/ProtectedRoute.tsx**
   - Added redirect loop prevention
   - Added access denied UI for role mismatches
   
2. **apps/web/components/AuthProvider.tsx**
   - Added initialization guard
   - Added timeout safeguard
   - Enhanced logging

3. **apps/web/app/admin-login/page.tsx**
   - Added endpoint fallback logic
   - Enhanced error logging

4. **apps/web/app/auth-debug/page.tsx** (NEW)
   - Debug page for diagnosing auth issues
   - Access at: http://localhost:3001/auth-debug

## How to Test

### Step 1: Clear Everything
```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Step 2: Check Console Logs
Open http://localhost:3001 and open DevTools (F12)

Expected logs on page load:
```
🔐 AuthProvider: Initializing auth...
🔐 AuthProvider: Token exists: false
🔐 AuthProvider: User exists: false
🔐 AuthProvider: No auth data found
✅ AuthProvider: Initialization complete
📊 AuthProvider render: { user: null, loading: false, initialized: true }
```

### Step 3: Login as Admin
1. Go to http://localhost:3001/admin-login
2. Use credentials: `admin@lovnge.local` / `Admin123!`
3. Watch console logs:
```
🔐 Admin Login: Attempting login for admin@lovnge.local
🔐 Admin Login: Response status 200
🔐 Admin Login: Response data { user: { role: 'admin', ... }, ... }
🔐 Admin Login: Success, redirecting to dashboard
🔐 AuthProvider: Login called for admin@lovnge.local Role: admin
📊 AuthProvider render: { user: 'admin@lovnge.local', role: 'admin', loading: false }
```

### Step 4: Access Dashboard
After login, you should reach `/dashboard` without infinite loading.

Expected console:
```
✅ ProtectedRoute: Access granted to /dashboard
```

### Step 5: Use Debug Page
Go to http://localhost:3001/auth-debug

This page shows:
- Current auth state
- LocalStorage contents
- Token validity
- Quick actions to test scenarios

## Diagnostic Commands

### Check if Admin User Exists in DB
```sql
SELECT id, email_hash, role, status, created_at 
FROM users 
WHERE role = 'admin';
```

If no rows returned, you need to create an admin user.

### Create Admin User (if needed)
Use the registration endpoint or insert directly:
```sql
-- This is an example - use proper password hash
INSERT INTO users (email_hash, password_hash, role, status)
VALUES (
  'hash_of_admin@lovnge.local',
  '$2b$10$hashed_password_here',
  'admin',
  'active'
);
```

## Common Issues & Solutions

### Issue 1: Still seeing infinite loader
**Check:** Console for repeating logs
**Solution:** Look for API 401/403 errors - token might be invalid

### Issue 2: "Access Denied" on dashboard
**Check:** User role in LocalStorage
**Solution:** Your user might not have 'admin' role

### Issue 3: Login fails with 401
**Check:** Backend is running on port 3000
**Solution:** `docker-compose -f docker-compose.dev.yml ps`

### Issue 4: Token format looks wrong
**Check:** Token should be 3 base64 parts separated by dots
**Solution:** Backend JWT configuration might be wrong

## Token Validation

A valid JWT token looks like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwicm9sZSI6ImFkbWluIiwidHlwZSI6ImFjY2VzcyJ9.signature
```

Three parts:
1. Header (base64)
2. Payload (base64) - contains `sub`, `role`, `exp`, `type`
3. Signature

Decode payload at: https://jwt.io or use debug page

## Next Steps if Still Broken

1. **Open browser console** and share the logs
2. **Open network tab** and check:
   - POST to `/auth/login` response
   - Any 401/403 errors
3. **Go to debug page** http://localhost:3001/auth-debug
4. **Check backend logs** for errors

## Quick Reference

| URL | Purpose |
|-----|---------|
| http://localhost:3001 | Home page |
| http://localhost:3001/login | User login |
| http://localhost:3001/admin-login | Admin login |
| http://localhost:3001/dashboard | Admin dashboard |
| http://localhost:3001/auth-debug | Debug panel |
| http://localhost:3000 | API server |
| http://localhost:3000/api/docs | Swagger docs |

---

**Last Updated:** 2026-03-23
**Status:** ✅ Fixes Applied

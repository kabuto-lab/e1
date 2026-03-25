# CRITICAL FRONTEND DEBUGGING REQUEST
## Escort Platform - Image Loading Issue

**Date:** March 22, 2026
**Priority:** HIGH
**Status:** Needs AI Code Review

---

## 🚨 IMMEDIATE PROBLEM

After seeding 14 models with `mainPhotoUrl` populated, the catalog page 
(http://localhost:3001/models) shows models but IMAGES MAY NOT BE RENDERING.

Console shows successful API responses:
- ✅ Models loaded: Array(14)
- ✅ Stats loaded: {total: 14, online: 12, verified: 10, elite: 2}
- ✅ Each model has: mainPhotoUrl: "http://localhost:3001/images_tst/[filename].jpg"
- ❌ BUT: Images may not appear in UI (need verification)

---

## 📁 PROJECT STRUCTURE

```
C:\Users\a\Documents\_DEV\Tran\ES\
├── apps/
│   ├── api/                    # NestJS backend (port 3000)
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── models.controller.ts    # GET /v1/models, /v1/models/:slug
│   │   │   │   └── models.service.ts
│   │   │   └── scripts/
│   │   │       ├── seed-models.ts          # ✅ Seeded 13 models
│   │   │       └── seed-photos.ts          # ✅ Added mainPhotoUrl to all
│   │   └── package.json
│   │
│   └── web/                    # Next.js 15 frontend (port 3001)
│       ├── app/
│       │   ├── models/
│       │   │   ├── page.tsx                  # ⚠️ Catalog page (working)
│       │   │   └── [slug]/
│       │   │       └── page.tsx              # ✅ FIXED: /v1/models/:slug
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── public/
│       │   └── images_tst/                   # ✅ 13 image files exist
│       ├── lib/
│       │   └── api-client.ts                 # API client (auth required for /profiles)
│       └── next.config.js
│
├── docker-compose.dev.yml      # PostgreSQL, Redis, MinIO, MailHog
└── .env                        # NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## ✅ WHAT'S WORKING

### Backend (NestJS - Port 3000)
```bash
# Public endpoints (NO auth required)
GET http://localhost:3000/v1/models              # ✅ Returns 14 models
GET http://localhost:3000/v1/models/stats        # ✅ {total:14, online:12, ...}
GET http://localhost:3000/v1/models/:slug        # ✅ Returns single model

# Protected endpoints (auth required)
GET http://localhost:3000/v1/profiles            # 🔒 401 Unauthorized (expected)
```

### Database (PostgreSQL)
```sql
-- Models table has correct data
SELECT id, display_name, slug, main_photo_url 
FROM model_profiles 
WHERE is_published = true;

-- Expected: 12-13 rows with main_photo_url like:
-- http://localhost:3001/images_tst/photo-1544005313-94ddf0286df2.jpg
```

### Static Files (Next.js Public Folder)
```
✅ /apps/web/public/images_tst/ contains 13 JPEG files:
   - photo-1544005313-94ddf0286df2.jpg
   - photo-1534528741775-53994a69daeb.jpg
   - photo-1524504388940-b1c1722653e1.jpg
   - [10 more files...]

✅ Images accessible via direct URL:
   http://localhost:3001/images_tst/2.jpg → HTTP 200 OK
   http://localhost:3001/images_tst/photo-1544005313-94ddf0286df2.jpg → HTTP 200 OK
```

### Frontend Pages
```
✅ http://localhost:3001/models
   - Catalog loads 14 models from API
   - Filters work (availability, verification, elite)
   - Sorting works
   - ⚠️ IMAGE RENDERING: NEED VERIFICATION

✅ http://localhost:3001/models/:slug
   - FIXED: Now uses /v1/models/:slug endpoint
   - Should show individual model profile
   - ⚠️ NEED VERIFICATION

❌ http://localhost:3001/dashboard/models/list
   - Requires authentication (expected)
   - Shows 401 without login (correct behavior)
```

---

## 🔍 SPECIFIC ISSUES TO AUDIT

### Issue #1: Image Rendering in Catalog (POTENTIAL)
**File:** `apps/web/app/models/page.tsx`

**Current State:**
- API returns models with `mainPhotoUrl` field
- Console shows: `Models loaded: Array(14)`
- ⚠️ UNKNOWN: Are `<img>` tags rendering correctly?

**What to Check:**
1. How does the catalog page use `mainPhotoUrl`?
2. Is there an `<img src={model.mainPhotoUrl}>` tag?
3. Are there any `<Image>` component issues (Next.js Image optimization)?
4. Check for CSS hiding images (opacity: 0, display: none, etc.)
5. Verify the ModelCard component renders photos

**Lines to Audit:**
- Search for: `mainPhotoUrl`, `main_photo_url`, `<img`, `<Image`
- Check ModelCard component rendering logic
- Verify image fallback for null/undefined URLs

---

### Issue #2: Individual Model Page (FIXED - NEED VERIFICATION)
**File:** `apps/web/app/models/[slug]/page.tsx`

**What Was Fixed:**
```typescript
// BEFORE (line 54):
const response = await fetch(`${API_URL}/models/${slug}`);

// AFTER:
const response = await fetch(`${API_URL}/v1/models/${slug}`);
```

**What to Verify:**
1. Does the page now load without 404?
2. Does it show model photo?
3. Are all model details displayed correctly?

---

### Issue #3: Next.js Image Component vs Regular IMG
**File:** `apps/web/next.config.js`

**Current Config:**
```javascript
images: {
  remotePatterns: [
    { protocol: 'http', hostname: 'localhost', port: '3000', ... },
    { protocol: 'http', hostname: 'localhost', port: '9000', ... },
  ],
}
```

**Potential Problem:**
- If using `<Image>` component, localhost:3001 may need to be added
- Or use regular `<img>` tag instead

**What to Check:**
1. Is catalog using `<Image>` or `<img>`?
2. If `<Image>`, add port 3001 to remotePatterns
3. Check for Image optimization errors in console

---

### Issue #4: Browser Console Errors (NEED SCREENSHOT)
**Known Console Output:**
```
✅ Models loaded: Array(14)
✅ Stats loaded: {total: 14, online: 12, verified: 10, elite: 2}
❌ GET http://localhost:3000/v1/profiles → 401 (expected, no auth)
❌ GET http://localhost:3001/favicon.svg → 404 (minor, can ignore)
❌ GET http://localhost:3000/models/maria → 404 (FIXED, was missing /v1/)
```

**What to Look For:**
1. Any errors about image loading?
2. Any React hydration errors?
3. Any CORS errors?
4. Any Content Security Policy violations?

---

## 🛠️ DEBUGGING TASKS FOR AI CODER

### Task 1: Audit Image Rendering
```
1. Read: apps/web/app/models/page.tsx
2. Find: Where models are mapped to cards
3. Check: How mainPhotoUrl is used in JSX
4. Verify: <img> or <Image> component has correct src
5. Check: CSS doesn't hide images
6. Suggest: Fix if images aren't rendering
```

### Task 2: Verify Model Card Component
```
1. Find: ModelCard component definition
2. Check: Photo rendering logic
3. Verify: Fallback for missing photos
4. Test: Image URL construction
```

### Task 3: Check Next.js Image Config
```
1. Read: apps/web/next.config.js
2. Check: images.remotePatterns includes localhost:3001
3. Verify: No Image optimization blocking local files
4. Suggest: Add public/images_tst to allowed patterns
```

### Task 4: Review Network Tab
```
Ask user to:
1. Open DevTools → Network tab
2. Filter by: Img
3. Refresh: http://localhost:3001/models
4. Report: Are image requests 200 OK or 404?
5. Report: What URLs are being requested?
```

### Task 5: Add Debug Logging
```
If images still don't show:
1. Add console.log for each model's mainPhotoUrl
2. Add console.log for rendered <img> src attributes
3. Check if URLs are correct format
4. Verify no undefined/null values
```

---

## 📋 EXPECTED BEHAVIOR

### Catalog Page (/models)
```
✅ Should show 12-14 model cards (published models only)
✅ Each card should display:
   - Model photo (from mainPhotoUrl)
   - Display name
   - Age, location (from physicalAttributes)
   - Tier badge (Elite/VIP/Premium)
   - Availability status (online/offline badge)
   - Rating circle
```

### Individual Model Page (/models/:slug)
```
✅ Should load without 404 error
✅ Should display:
   - Large model photo
   - Full profile details
   - About section
   - Photos gallery (if implemented)
```

---

## 🔧 QUICK FIXES TO TRY

### Fix #1: Use Regular IMG Tags
If using Next.js <Image>, try regular <img>:
```tsx
// Instead of:
<Image src={model.mainPhotoUrl} alt={model.displayName} fill />

// Try:
<img src={model.mainPhotoUrl} alt={model.displayName} style={{width: '100%', height: 'auto'}} />
```

### Fix #2: Add Image Fallback
```tsx
const photoUrl = model.mainPhotoUrl || '/images_tst/placeholder.jpg';
```

### Fix #3: Update next.config.js
```javascript
images: {
  remotePatterns: [
    { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/**' },
    { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/**' },
    { protocol: 'http', hostname: 'localhost', port: '9000', pathname: '/**' },
  ],
  unoptimized: true, // Disable optimization for debugging
}
```

### Fix #4: Check for CSS Issues
```css
/* Make sure no CSS is hiding images */
.model-card-image img {
  opacity: 1 !important;
  display: block !important;
  visibility: visible !important;
}
```

---

## 📊 CURRENT SYSTEM STATUS

```
✅ API Server (NestJS)    : http://localhost:3000 (RUNNING - PID 1732)
✅ Web Server (Next.js 15): http://localhost:3001 (RUNNING - PID 3000)
✅ PostgreSQL             : localhost:5432 (RUNNING in Docker)
✅ Redis                  : localhost:6379 (RUNNING in Docker)
✅ MinIO (S3)             : localhost:9000 (RUNNING in Docker)
✅ Images Folder          : /apps/web/public/images_tst/ (13 files)
✅ Database Models        : 14 total (12 published, 10 verified, 2 elite)
✅ API Endpoints          : /v1/models, /v1/models/:slug (WORKING)
⚠️ Image Rendering        : NEED VERIFICATION
✅ Model Profile Page     : FIXED (was missing /v1/ prefix)
```

---

## 🎯 SPECIFIC QUESTIONS FOR AI CODER

1. **Are images rendering in the catalog?** 
   - If NO: What's the root cause?
   - If YES: Confirm what's working

2. **What component renders model photos?**
   - Is it using `<Image>` or `<img>`?
   - Is the src attribute correct?

3. **Are there any blocking errors?**
   - React hydration errors?
   - Image optimization errors?
   - CORS issues?

4. **What's the exact fix needed?**
   - Code change in which file?
   - Line numbers?
   - Configuration updates?

5. **How to verify the fix worked?**
   - What URL to check?
   - What should user see?
   - What console output confirms success?

---

## 📝 ACTION ITEMS

### Immediate (Do First)
```
[ ] 1. Read apps/web/app/models/page.tsx lines 1-200
[ ] 2. Find where models are rendered
[ ] 3. Check how mainPhotoUrl is used
[ ] 4. Identify if <Image> or <img> component
[ ] 5. Report findings with code snippets
```

### Secondary (If Issue Found)
```
[ ] 1. Provide exact code fix
[ ] 2. Specify file path and line numbers
[ ] 3. Explain why the fix works
[ ] 4. Provide verification steps
```

### Tertiary (Optimization)
```
[ ] 1. Suggest Image optimization improvements
[ ] 2. Recommend lazy loading for performance
[ ] 3. Add proper fallback images
[ ] 4. Implement progressive image loading
```

---

## 🚀 HOW TO RESPOND

Please provide:

1. **ROOT CAUSE ANALYSIS**
   - What's causing the issue (if any)
   - Which file(s) are affected
   - Why it's happening

2. **EXACT CODE FIX**
   - File path
   - Line numbers
   - Before/after code comparison
   - Complete working code snippet

3. **VERIFICATION STEPS**
   - What URL to open
   - What to look for
   - Expected vs actual behavior
   - Console output to confirm

4. **PREVENTION**
   - How to avoid this in future
   - Best practices to follow
   - Testing recommendations

================================================================================
                         END OF DEBUGGING REQUEST
                         Thank you for your help!
================================================================================

# API Fixes — Health Endpoint + Model Photos

**Date:** March 25, 2026  
**Issues Fixed:** 2

---

## 🐛 Issues

### 1. Debug Panel Shows API Offline (404 Error)

**Problem:**
- Debug panel was calling `/v1/health` (versioned)
- Backend only has `/health` (non-versioned)
- Result: HTTP 404, API shown as offline

**Fix:**
- Updated `DebugPanel.tsx` to call `/health` instead of `/v1/health`

**Files Changed:**
- `apps/web/components/DebugPanel.tsx`

---

### 2. Model Images Not Showing in Dashboard

**Problem:**
- Models list page shows placeholder icons instead of photos
- Edit model page doesn't show model photos
- Root cause: `main_photo_url` column is NULL for existing models

**Why This Happened:**
- Photo upload flow was incomplete
- Photos could be uploaded to `media_files` table
- But no endpoint existed to set `main_photo_url` on `model_profiles`

**Fixes Applied:**

#### A. Added Missing Backend Endpoint
**File:** `apps/api/src/models/models.controller.ts`
```typescript
@Put(':id/set-main-photo')
async setMainPhoto(
  @Param('id') modelId: string,
  @Body() body: { photoUrl: string },
): Promise<ModelProfile>
```

**File:** `apps/api/src/models/models.service.ts`
```typescript
async setMainPhoto(modelId: string, photoUrl: string): Promise<ModelProfile> {
  return this.db.update(modelProfiles)
    .set({ mainPhotoUrl: photoUrl })
    .where(eq(modelProfiles.id, modelId))
    .returning();
}
```

#### B. Added API Client Method
**File:** `apps/web/lib/api-client.ts`
```typescript
async setMainPhoto(mediaId: string, modelId: string): Promise<Profile> {
  // Get media CDN URL
  const media = await fetch(`${BASE_PATH}/media/${mediaId}`);
  
  // Update model profile
  return fetch(`${BASE_PATH}/models/${modelId}/set-main-photo`, {
    method: 'PUT',
    body: JSON.stringify({ photoUrl: media.cdnUrl }),
  });
}
```

#### C. Added Debug Logging
**File:** `apps/web/app/dashboard/models/list/page.tsx`
- Added console logs to see if `mainPhotoUrl` is being returned

#### D. Created SQL Fix Script
**File:** `migra/fix_main_photos.sql`
```sql
-- Updates all models that have photos but no main_photo_url
UPDATE model_profiles mp
SET main_photo_url = (
    SELECT mf.cdn_url 
    FROM media_files mf 
    WHERE mf.model_id = mp.id 
    AND mf.file_type = 'photo' 
    AND mf.moderation_status = 'approved'
    ORDER BY mf.sort_order, mf.created_at 
    LIMIT 1
)
WHERE mp.main_photo_url IS NULL;
```

---

## 🔧 How to Fix Your Existing Data

### Option 1: Run SQL Fix (Recommended)

```bash
# In your database tool (pgAdmin, DBeaver, etc.)
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d escort_db -f /migra/fix_main_photos.sql
```

Or manually:
```bash
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d escort_db
```

Then paste the contents of `migra/fix_main_photos.sql`

### Option 2: Set Main Photos via UI

1. Go to `/dashboard/models/[id]/photos`
2. Click the star icon on a photo
3. This will call the new `setMainPhoto` endpoint

---

## ✅ Verification

### Test 1: API Health
1. Go to any dashboard page
2. Open debug panel (bottom-right corner)
3. Should show: **API Status: ONLINE**

### Test 2: Model Photos
1. Go to `/dashboard/models/list`
2. Check browser console for logs:
   ```
   📋 Loaded models: X
   📋 First model: { id: '...', displayName: '...', mainPhotoUrl: '...', hasPhoto: true/false }
   ```
3. If `hasPhoto: false`, run the SQL fix script

### Test 3: Set Main Photo
1. Go to `/dashboard/models/[id]/photos`
2. Click star icon on any photo
3. Go back to `/dashboard/models/list`
4. Photo should now appear

---

## 📁 Files Changed

### Backend
```
apps/api/src/models/
├── models.controller.ts   (+12 lines)
└── models.service.ts      (+18 lines)
```

### Frontend
```
apps/web/
├── components/DebugPanel.tsx          (fixed endpoint)
├── lib/api-client.ts                  (+16 lines)
└── app/dashboard/models/list/page.tsx (+4 lines debug logging)
```

### Database
```
migra/
├── debug_model_photos.sql   (diagnostic queries)
└── fix_main_photos.sql      (fix script)
```

---

## 🎯 Next Steps

1. **Restart your API server** to pick up new endpoints
2. **Run the SQL fix script** to update existing models
3. **Test** by visiting `/dashboard/models/list`
4. **Upload new photos** via the photos page — they should now work correctly

---

**Status:** ✅ FIXED  
**API Health:** Should be ONLINE after restart  
**Photos:** Will show after running SQL fix

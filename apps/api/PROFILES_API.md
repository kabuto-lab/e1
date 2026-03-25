# Profiles API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📝 Create Model Profile (MVP)

### POST `/profiles`
Create a new model profile.

**Request Body:**
```json
{
  "displayName": "Юлианна",
  "slug": "yulianna",
  "biography": "Элегантная спутница...",
  "physicalAttributes": {
    "age": 22,
    "height": 168,
    "weight": 52,
    "bustSize": 3,
    "bustType": "natural",
    "bodyType": "slim",
    "temperament": "gentle",
    "sexuality": "universal",
    "hairColor": "blonde",
    "eyeColor": "blue"
  },
  "languages": ["ru", "en"],
  "psychotypeTags": ["gentle", "caring"],
  "rateHourly": 5000,
  "rateOvernight": 25000
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "displayName": "Юлианна",
  "slug": "yulianna",
  "verificationStatus": "pending",
  "isPublished": false,
  "createdAt": "2026-03-20T...",
  "updatedAt": "2026-03-20T..."
}
```

---

## 📤 Generate Presigned URL (for file upload)

### POST `/profiles/media/presigned`
Get presigned URL for direct upload to MinIO.

**Request Body:**
```json
{
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 2048000
}
```

**Response (201):**
```json
{
  "uploadUrl": "http://localhost:9000/escort-media/uploads/...",
  "storageKey": "uploads/1234567890-photo.jpg",
  "cdnUrl": "http://localhost:9000/escort-media/uploads/...",
  "mediaId": "uuid"
}
```

**Client Upload Flow:**
1. Call this endpoint to get `uploadUrl`
2. PUT file directly to `uploadUrl` (bypass backend)
3. Call `/profiles/media/:id/confirm` to finalize

---

## ✅ Confirm Upload

### POST `/profiles/media/:id/confirm`
Confirm file upload after client uploads to MinIO.

**Request Body:**
```json
{
  "cdnUrl": "http://localhost:9000/escort-media/...",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "originalName": "photo.jpg"
  }
}
```

---

## 🖼️ Set Main Photo

### PUT `/profiles/media/:id/set-main?modelId=:modelId`
Set profile's main photo.

**Response:** Updated profile with `mainPhotoUrl`

---

## 📋 Get Profile

### GET `/profiles/:id`
Get profile by ID.

### GET `/profiles/slug/:slug`
Get profile by slug (public endpoint).

### GET `/profiles/me`
Get current user's profile.

---

## ✏️ Update Profile

### PUT `/profiles/:id`
Update profile fields.

**Request Body (partial):**
```json
{
  "displayName": "New Name",
  "biography": "Updated bio",
  "isPublished": true
}
```

---

## 📢 Publish Profile

### PUT `/profiles/:id/publish`
Publish or unpublish profile.

**Request Body:**
```json
{
  "isPublished": true
}
```

**Requirements:**
- Must have `mainPhotoUrl`
- Must have `displayName`

---

## 🗑️ Delete Profile

### DELETE `/profiles/:id`
Delete profile permanently.

---

## 📊 Statistics

### GET `/profiles/stats/overview`
Get profiles statistics (Admin/Manager only).

**Response:**
```json
{
  "total": 13,
  "published": 8,
  "verified": 5,
  "elite": 2,
  "online": 3
}
```

---

## 🎯 MVP Workflow

```
1. Create Profile
   POST /profiles
   → Get profile ID

2. Generate Upload URL (for each photo)
   POST /profiles/media/presigned
   → Get uploadUrl

3. Upload to MinIO (client-side)
   PUT {uploadUrl}
   Body: file binary

4. Confirm Upload
   POST /profiles/media/:id/confirm
   → Media record updated

5. Set Main Photo
   PUT /profiles/media/:id/set-main?modelId=:id
   → Profile updated with mainPhotoUrl

6. Publish Profile
   PUT /profiles/:id/publish
   Body: { "isPublished": true }
   → Profile is live!
```

---

## 🔗 Swagger UI
```
http://localhost:3000/api/docs
```

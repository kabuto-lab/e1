# Implementation Summary — Image Visibility + Water Shader

**Date:** March 25, 2026
**Session:** gstack design-consultation + implementation
**Status:** ✅ COMPLETE

---

## What Was Built

### 1. Image Visibility System ✅

A complete photo management system that allows models/managers to control which images are visible on public profiles, organized into albums.

#### Database Changes
- **File:** `packages/db/src/schema/media.ts`
- **Added columns:**
  - `isPublicVisible: boolean` — Toggle show/hide on public profile
  - `albumCategory: string` — Album categorization (portfolio, vip, elite, verified)

#### Backend API (NestJS)
- **File:** `apps/api/src/media/media.controller.ts`
- **File:** `apps/api/src/media/media.service.ts`

**New Endpoints:**
```
POST /media/:id/visibility      — Update single file visibility
POST /media/bulk-visibility     — Bulk update multiple files
GET  /media/model/:modelId      — Get model photos (updated to include visibility)
```

**New DTOs:**
- `UpdateVisibilityDto` — Single file updates
- `BulkUpdateVisibilityDto` — Bulk operations

**New Service Methods:**
- `updateVisibility()` — Update single file
- `bulkUpdateVisibility()` — Bulk update with ownership verification
- `getModelPhotosWithVisibility()` — Get all photos with visibility data
- `getModelPublicPhotos()` — Get only public photos for profile pages

#### Frontend Components

**ImageVisibilityGrid Component**
- **File:** `apps/web/components/ImageVisibilityGrid.tsx`
- **Features:**
  - Grid/List view toggle
  - Filter by visibility (All/Visible/Hidden)
  - Bulk selection with checkbox
  - Bulk actions (Show/Hide/Album change)
  - Per-image visibility toggle
  - Album category dropdown
  - Status badges (Verified/Pending, Moderation status)

**Updated Photos Page**
- **File:** `apps/web/app/dashboard/models/[id]/photos/page.tsx`
- **Changes:**
  - Integrated ImageVisibilityGrid component
  - Added visibility/album change handlers
  - Updated info tip with visibility instructions

**API Client**
- **File:** `apps/web/lib/api-client.ts`
- **New methods:**
  - `updateMediaVisibility()` — Single file update
  - `bulkUpdateMediaVisibility()` — Bulk update

#### Migration
- **File:** `migra/003_add_media_visibility.sql`
- **SQL commands:**
  - ALTER TABLE to add columns
  - CREATE INDEX for performance
  - Column comments

---

### 2. Water Shader Overlay ✅

A liquid distortion effect for background images, ported from the reference `water_shader_stacked.html` to a React component.

#### Components

**WaterShaderOverlay Component**
- **File:** `apps/web/components/WaterShaderOverlay.tsx`
- **Features:**
  - WebGL-based liquid distortion effect
  - Configurable intensity (0-100)
  - Configurable speed (0-2)
  - Automatic mobile detection (disabled on mobile)
  - Fullscreen canvas overlay
  - Simplex noise-based ripple animation
  - Subtle blue water tint

**Technical Details:**
- Uses raw WebGL (not Three.js) for performance
- Custom vertex + fragment shaders
- Animation loop with requestAnimationFrame
- Automatic cleanup on unmount
- Respects `prefers-reduced-motion` implicitly (mobile-only)

**Props:**
```typescript
interface WaterShaderOverlayProps {
  intensity?: number;      // 0-100, default: 50
  speed?: number;          // 0-2, default: 1.0
  enabled?: boolean;       // default: true
  imageUrl?: string;       // Optional background
}
```

---

### 3. Fade Slider Component ✅

Smooth crossfade transitions for background images, designed to work underneath the WaterShaderOverlay.

**File:** `apps/web/components/FadeSlider.tsx`

**Features:**
- Auto-advancing image slider
- Configurable interval (default: 5000ms)
- Three transition types: fade, slide, zoom
- Progress indicators (dots)
- Preloading for smooth transitions
- Hook for fetching public images

**Props:**
```typescript
interface FadeSliderProps {
  images: string[];
  interval?: number;       // default: 5000
  transition?: 'fade' | 'slide' | 'zoom';
  enabled?: boolean;
}
```

**Hook:**
- `usePublicImages(modelId)` — Fetch public-only images for a model

---

## How to Use

### In CMS (Dashboard)

Navigate to: `/dashboard/models/[id]/photos`

1. **Upload photos** using the existing upload component
2. **Toggle visibility** using the eye icon or bulk actions
3. **Assign albums** using the dropdown per image or bulk action
4. **Filter view** by All/Visible/Hidden

### In Public Profile

Example integration in `/apps/web/app/models/[slug]/page.tsx`:

```tsx
import { FadeSlider } from '@/components/FadeSlider';
import { WaterShaderOverlay } from '@/components/WaterShaderOverlay';
import { usePublicImages } from '@/components/FadeSlider';

export default async function PublicProfilePage({ params }: { params: { slug: string } }) {
  const model = await fetchModel(params.slug);
  const { images } = usePublicImages(model.id);

  return (
    <main className="relative min-h-screen">
      {/* Background layers */}
      <FadeSlider
        images={images}
        interval={6000}
        transition="fade"
      />
      <WaterShaderOverlay
        intensity={40}
        speed={0.8}
        enabled={!isMobile}
      />

      {/* Content overlay */}
      <div className="relative z-20">
        {/* Profile content here */}
      </div>
    </main>
  );
}
```

---

## Files Created/Modified

### Created (New Files)
```
apps/web/components/ImageVisibilityGrid.tsx
apps/web/components/WaterShaderOverlay.tsx
apps/web/components/FadeSlider.tsx
migra/003_add_media_visibility.sql
IMPLEMENTATION_SUMMARY.md (this file)
```

### Modified (Updated Files)
```
packages/db/src/schema/media.ts
apps/api/src/media/media.controller.ts
apps/api/src/media/media.service.ts
apps/web/app/dashboard/models/[id]/photos/page.tsx
apps/web/lib/api-client.ts
```

---

## Testing Checklist

### Image Visibility
- [ ] Run migration: `psql -f migra/003_add_media_visibility.sql`
- [ ] Restart API server
- [ ] Navigate to `/dashboard/models/[id]/photos`
- [ ] Upload a test photo
- [ ] Toggle visibility (eye icon)
- [ ] Change album category
- [ ] Test bulk selection (select multiple, bulk hide)
- [ ] Test filter views (All/Visible/Hidden)
- [ ] Verify grid and list views work

### Water Shader
- [ ] Create test page or integrate into profile page
- [ ] Verify shader renders on desktop
- [ ] Verify shader is disabled on mobile (check user agent)
- [ ] Test intensity slider (0-100)
- [ ] Test speed control (0-2)
- [ ] Check browser console for WebGL errors
- [ ] Verify performance (should be 60fps)

### Fade Slider
- [ ] Test with 1 image (no slider, static)
- [ ] Test with 2+ images (auto-advance)
- [ ] Test progress indicators (click to change slide)
- [ ] Test different transition types (fade/slide/zoom)
- [ ] Verify preloading works

---

## Known Limitations

### Image Visibility
1. **No drag-drop reordering** — Sort order exists in DB but no UI for it yet
2. **No album management** — Albums are hardcoded (portfolio/vip/elite/verified)
3. **No API endpoint for public photos** — `getModelPublicPhotos()` exists in service but not exposed as endpoint

### Water Shader
1. **Simplified effect** — This is a simplified version of the reference shader
2. **No interaction** — Mouse/touch interaction not implemented (ripples on click)
3. **No color grading** — Reference has saturation/contrast/brightness controls
4. **No dual-shader stacking** — Reference uses two stacked shaders

### Fade Slider
1. **No lazy loading optimization** — All images load at once
2. **No error handling** — Broken images not handled gracefully
3. **No keyboard navigation** — Arrow keys don't change slides

---

## Next Steps (Recommended)

### Immediate (Phase 2)
1. **Create API endpoint** for public photos:
   ```
   GET /models/:slug/public-photos
   ```

2. **Integrate into public profile page**:
   - Add FadeSlider + WaterShaderOverlay to `/apps/web/app/models/[slug]/page.tsx`

3. **Add drag-drop reordering**:
   - Use `@dnd-kit/core` or similar
   - Update sort_order via API

### Short-term
1. **Album management UI** — Create/edit/delete custom albums
2. **Mobile shader fallback** — CSS-based subtle animation instead of full WebGL
3. **Image optimization** — Generate multiple sizes (thumbnail, medium, large)

### Long-term
1. **Advanced shader controls** — Port full reference shader with control panels
2. **Video backgrounds** — Support video files in fade slider
3. **Analytics** — Track which images get most engagement

---

## Design System Alignment

All components follow the **Lovnge Design System** (DESIGN.md):

- **Colors:** Black/gold theme, restrained accent usage
- **Typography:** Satoshi (badges, labels) + DM Sans (body)
- **Spacing:** 8px base unit, comfortable density
- **Motion:** 200-300ms transitions, ease-in-out
- **Layout:** Grid-disciplined, predictable alignment
- **Decoration:** Intentional, minimal ornamentation

---

## Performance Notes

### Image Visibility
- Indexed queries on `is_public_visible` and `album_category`
- Bulk operations reduce API calls
- Component uses React.memo internally (could be optimized further)

### Water Shader
- Mobile detection prevents performance issues on low-power devices
- WebGL context reused across renders
- Animation frame cleanup prevents memory leaks
- Could add `requestIdleCallback` for slower devices

### Fade Slider
- Preloading next image prevents flicker
- Could add IntersectionObserver for lazy loading
- Consider using Next.js Image component for optimization

---

## Security Considerations

### Image Visibility
- Ownership verification in `bulkUpdateVisibility()`
- JWT auth required for all mutations
- Moderation status still respected (hidden images still moderated)

### Water Shader
- No user input in shaders (XSS-safe)
- Canvas is read-only (no data exfiltration risk)

---

## Generated Artifacts

| File | Purpose | Size |
|------|---------|------|
| `ImageVisibilityGrid.tsx` | Photo management UI | ~450 lines |
| `WaterShaderOverlay.tsx` | WebGL shader component | ~200 lines |
| `FadeSlider.tsx` | Image slider component | ~150 lines |
| `003_add_media_visibility.sql` | Database migration | ~20 lines |

**Total:** ~820 lines of production code

---

**Status:** ✅ READY FOR TESTING
**Next:** Run migration, restart servers, test in browser
**Estimated QA Time:** 30-45 minutes

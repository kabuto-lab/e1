# 🎯 CURRENT ROADMAP POSITION
**Last Updated:** %DATE%  
**Phase:** Phase 1 - Core CMS Development  
**Overall Progress:** 60%

---

## 📊 MASTER ROADMAP

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LOVNGE PLATFORM DEVELOPMENT                          │
│                     CMS → Profile → Slider → Shader                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Timeline Overview:
```
PAST ←───────────────────────────── NOW ─────────────────────────────→ FUTURE
     │                │                │                │              │
     │   Phase 1      │   Phase 1      │   Phase 2      │   Phase 3    │
     │   Foundation   │   CMS (60%%)    │   Public       │   Booking    │
     │   (100%%)       │   ⬆️ CURRENT   │   Profiles     │   System     │
     │                │                │   (0%%)         │   (0%%)       │
     │                │                │                │              │
     └────────────────┴────────────────┴────────────────┴──────────────┘
          Completed       In Progress      Next Up         Future
```

---

## 🏗️ PHASE 1: Core CMS (60% COMPLETE) ⬅️ CURRENT FOCUS

### ✅ Completed Features:
```
Infrastructure:
  ✓ Docker setup (PostgreSQL, Redis, MinIO, Mailhog)
  ✓ Database schema (13 tables)
  ✓ Environment configuration

Backend API:
  ✓ JWT authentication
  ✓ User CRUD operations
  ✓ Model profile CRUD endpoints
  ✓ Media upload (MinIO presigned URLs)
  ✓ Health check endpoints
  ✓ Swagger documentation

Frontend UI:
  ✓ Login page
  ✓ Dashboard layout
  ✓ Models list page
  ✓ Create model form
  ✓ Photo upload page (basic)
  ✓ Auth context + protected routes
```

### ⏳ In Progress:
```
Profile Editor:
  ~ Edit model form (partially working)
  ~ Form validation (incomplete)
  ~ Live preview (not started)

Image Management:
  ~ Upload working
  ~ Delete functionality (needs testing)
  ~ Reordering (not implemented)
  ~ Album/categories (not implemented)
```

### ⏹️ TODO - Immediate Next Tasks:
```
PRIORITY 1 - Image Visibility System:
  □ Add "Show on public profile" toggle per image
  □ Add visibility badge (Visible/Hidden)
  □ Add bulk selection toolbar
  □ Add filter view (visible/hidden)
  □ Create album/category dropdown
  □ Implement sort order management

PRIORITY 2 - Fade Slider Component:
  □ Create FadeSlider React component
  □ Implement smooth crossfade (5s default)
  □ Add configuration (speed, transition type)
  □ Make it use only "visible" images
  □ Add mobile responsive sizing
  □ Performance optimization (lazy loading)

PRIORITY 3 - Water Shader Integration:
  □ Port Three.js from water_shader_stacked.html
  □ Create WaterShaderOverlay component
  □ Apply as layer on top of fade slider
  □ Add intensity control (0-100%)
  □ Add animation speed control
  □ Implement mobile fallback (disable shader)

PRIORITY 4 - Preview Mode:
  □ Add "Preview Public Profile" button
  □ Show exactly what guests will see
  □ Toggle between edit/preview modes
  □ Test with different image counts
```

---

## 🎨 PHASE 2: Public Profile Pages (0% COMPLETE)

### Features to Build:
```
Public Profile Page (/models/[slug]):
  □ Page routing and data fetching
  □ Background fade slider with visible images
  □ Water shader overlay effect
  □ Profile info sections (bio, attributes)
  □ Image gallery with lightbox
  □ Contact/booking inquiry form
  □ Reviews and reliability rating
  □ VIP/Elite content gating

Profile Features:
  □ Social sharing (meta tags, OG images)
  □ Analytics tracking (views, favorites)
  □ Report/flag functionality
  □ Mobile-optimized layout
```

---

## 💼 PHASE 3: Booking System (0% COMPLETE)

### Features to Build:
```
Booking Flow:
  □ Booking request form
  □ Date/time selection
  □ Service type selection
  □ Price calculation
  □ Escrow payment integration
  □ Confirmation workflow
  □ Booking status tracking

Manager Dashboard:
  □ Booking management interface
  □ Calendar view
  □ Client communication tools
  □ Revenue analytics
```

---

## 🔮 PHASE 4: Advanced Features (Future)

### Planned Features:
```
CRM Integration:
  □ Telegram bot integration
  □ WhatsApp messaging
  □ Lead management
  □ Client assignment to managers

Admin Tools:
  □ Moderation queue
  □ Bulk profile actions
  □ User role management
  □ Audit logs
  □ Analytics dashboard

Security & Trust:
  □ Email verification
  □ SMS verification
  □ Passport verification workflow
  □ Video verification
  □ Blacklist system
  □ Anti-leak (phone number filtering)

Monetization:
  □ YooKassa payment gateway
  □ Cryptomus crypto payments
  □ Subscription plans
  □ VIP/Elite upgrade flow
```

---

## 📁 FEATURE BREAKDOWN: Image Visibility + Fade Slider + Shader

### What We're Building Today/Tomorrow:

#### 1️⃣ Image Visibility Control (CMS)
**Location:** `apps/web/app/dashboard/models/[id]/edit/page.tsx`

```tsx
// New UI Components Needed:
- ImageVisibilityGrid
  - Displays all uploaded images in grid
  - Each image has checkbox overlay: "Show on Profile"
  - Visual indicator (green border = visible, gray = hidden)
  - Drag-drop to reorder
  
- AlbumSelector
  - Dropdown to assign image to album
  - Albums: Portfolio, VIP, Elite, Verified
  - Color-coded badges
  
- VisibilityToolbar
  - Filter: All / Visible / Hidden
  - Bulk actions: Show All / Hide All
  - Sort: Manual / Date / Name
```

**Database Changes:**
```sql
-- Option A: Add to existing media_files table
ALTER TABLE media_files 
ADD COLUMN is_public_visible BOOLEAN DEFAULT true,
ADD COLUMN album_category VARCHAR(50) DEFAULT 'portfolio',
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Option B: Create new mapping table
CREATE TABLE profile_image_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES model_profiles(id),
  media_id UUID REFERENCES media_files(id),
  is_visible BOOLEAN DEFAULT true,
  album_category VARCHAR(50) DEFAULT 'portfolio',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

#### 2️⃣ Background Fade Slider
**Location:** `apps/web/components/FadeSlider.tsx` (NEW)

```tsx
// Component Props:
interface FadeSliderProps {
  images: string[];        // Array of image URLs
  interval?: number;       // Transition interval in ms (default: 5000)
  transition?: string;     // 'fade' | 'slide' | 'zoom' (default: 'fade')
  zIndex?: number;         // CSS z-index (default: 0)
  opacity?: number;        // Base opacity (default: 1.0)
}

// Implementation Outline:
export function FadeSlider({ images, interval = 5000 }: FadeSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Auto-advance images
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, interval]);
  
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {images.map((url, index) => (
        <div
          key={url}
          className={`absolute inset-0 transition-opacity duration-[5000ms] ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img 
            src={url} 
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
      ))}
    </div>
  );
}
```

---

#### 3️⃣ Water Shader Overlay
**Location:** `apps/web/components/WaterShaderOverlay.tsx` (NEW)

```tsx
// Port from water_shader_stacked.html
interface WaterShaderOverlayProps {
  intensity?: number;      // 0-100 (default: 50)
  speed?: number;          // Animation speed (default: 1.0)
  zIndex?: number;         // CSS z-index (default: 1)
  enabled?: boolean;       // Enable/disable shader (default: true)
}

export function WaterShaderOverlay({ 
  intensity = 50, 
  speed = 1.0,
  enabled = true 
}: WaterShaderOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!enabled || !canvasRef.current) return;
    
    // Initialize Three.js scene
    // Port shader code from water_shader_stacked.html
    // Apply distortion effect to background images
    
    return () => {
      // Cleanup Three.js resources
    };
  }, [intensity, speed, enabled]);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ zIndex: 1 }}
    />
  );
}
```

**Mobile Detection:**
```tsx
// Disable shader on mobile for performance
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

// In component:
<WaterShaderOverlay enabled={!isMobile} intensity={30} />
```

---

#### 4️⃣ Public Profile Page Integration
**Location:** `apps/web/app/models/[slug]/page.tsx` (NEW)

```tsx
// Page Structure:
export default async function PublicProfilePage({ 
  params 
}: { 
  params: { slug: string } 
}) {
  // Fetch profile data (server-side)
  const profile = await fetchProfile(params.slug);
  
  // Fetch only visible images
  const visibleImages = await fetchVisibleImages(profile.id);
  
  return (
    <main className="relative min-h-screen">
      {/* Background Layers */}
      <FadeSlider 
        images={visibleImages.map(img => img.url)} 
        interval={profile.fadeSliderSpeed || 5000}
      />
      <WaterShaderOverlay 
        enabled={!isMobile}
        intensity={profile.shaderIntensity || 50}
      />
      
      {/* Content Overlay */}
      <div className="relative z-20">
        <ProfileHeader profile={profile} />
        <ProfileGallery images={visibleImages} />
        <ProfileBio profile={profile} />
        <ProfileAttributes profile={profile} />
        <ContactForm profileId={profile.id} />
      </div>
    </main>
  );
}
```

---

## 🎯 TODAY'S ACTION PLAN

### Option A: Focus on Image Visibility (Recommended)
**Time:** 2-3 hours  
**Difficulty:** Medium  
**Impact:** High

```
Tasks:
1. Add database columns for visibility (15 min)
2. Update backend API endpoints (30 min)
3. Build ImageVisibilityGrid component (45 min)
4. Integrate into edit page (30 min)
5. Test with multiple images (15 min)

Files to Modify:
- packages/db/src/schema/model_profiles.ts
- apps/api/src/models/models.controller.ts
- apps/web/app/dashboard/models/[id]/edit/page.tsx
- apps/web/components/ImageVisibilityGrid.tsx (NEW)
```

---

### Option B: Focus on Fade Slider
**Time:** 2-3 hours  
**Difficulty:** Medium  
**Impact:** High

```
Tasks:
1. Create FadeSlider component (45 min)
2. Add configuration options (30 min)
3. Test with different image counts (30 min)
4. Optimize for mobile (30 min)
5. Add to public profile template (15 min)

Files to Modify:
- apps/web/components/FadeSlider.tsx (NEW)
- apps/web/app/models/[slug]/page.tsx (NEW)
- apps/web/types/slider.ts (NEW)
```

---

### Option C: Focus on Water Shader
**Time:** 3-4 hours  
**Difficulty:** Hard  
**Impact:** High (Visual Wow Factor)

```
Tasks:
1. Analyze water_shader_stacked.html (30 min)
2. Port Three.js setup to React (60 min)
3. Create WaterShaderOverlay component (45 min)
4. Add intensity/speed controls (30 min)
5. Implement mobile fallback (15 min)
6. Test performance (30 min)

Files to Modify:
- apps/web/components/WaterShaderOverlay.tsx (NEW)
- apps/web/lib/shader-utils.ts (NEW)
- water_shader_stacked.html (REFERENCE)
```

---

## 📊 PROGRESS TRACKING

### Update This Section Daily:

#### %DATE% - Today's Session
```
Started: [TIME]
Ended: [TIME]
Focus: [Image Visibility / Fade Slider / Water Shader]

Completed:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

Blockers:
- [Issue description]

Next Session Goals:
- [Goal 1]
- [Goal 2]
```

---

## 🔗 Quick Reference

### Key URLs:
- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Web: http://localhost:3001
- MinIO: http://localhost:9001

### Key Files:
- Profile Editor: `apps/web/app/dashboard/models/[id]/edit/page.tsx`
- Models API: `apps/api/src/models/models.controller.ts`
- Shader Reference: `water_shader_stacked.html`

### Start Development:
```bat
# Run this every morning
dev-ultimate.bat
```

---

**Current Position:** Phase 1 (Core CMS) - Image Visibility System  
**Next Milestone:** Complete image visibility toggles + album system  
**Estimated Time to Phase 2:** 2-3 days

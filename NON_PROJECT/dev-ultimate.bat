@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: LOVNGE PLATFORM - ULTIMATE DEV WORKFLOW
:: ============================================================================
:: All-in-one script that:
:: 1. Checks server status and starts if needed
:: 2. Opens Qwen Code with ultra-detailed context
:: 3. Asks about yesterday's progress
:: 4. Shows detailed roadmap and current position
:: 5. Focuses on: CMS + Profile Editor + Image Visibility + Fade Slider + Shader
:: ============================================================================

color 0A
title Lovnge Platform - Ultimate Dev Workflow

set "PROJECT_DIR=%~dp0"
set "API_PORT=3000"
set "WEB_PORT=3001"
set "QWEN_CMD=qwen"

:: ============================================================================
:: HEADER
:: ============================================================================
cls
echo.
echo ============================================================================
echo                  LOVNGE PLATFORM - ULTIMATE DEV WORKFLOW
echo ============================================================================
echo.
echo   Project:  Lovnge Escort Platform CMS
echo   Directory: %PROJECT_DIR%
echo   Date:      %DATE%
echo   Time:      %TIME%
echo.
echo   Goal: Make CMS fully working with profile editing, image visibility
echo         control, fade slider background, and water shader overlay.
echo.
echo ============================================================================
echo.

:: ============================================================================
:: SECTION 1: SERVER STATUS CHECK
:: ============================================================================
echo [STEP 1/4] CHECKING SERVER STATUS...
echo.

set "API_RUNNING=false"
set "WEB_RUNNING=false"

netstat -nno 2>nul | findstr ":%API_PORT%.*LISTENING" >nul
if not errorlevel 1 set "API_RUNNING=true"

netstat -nno 2>nul | findstr ":%WEB_PORT%.*LISTENING" >nul
if not errorlevel 1 set "WEB_RUNNING=true"

echo   API Server (Port %API_PORT%): 
if "%API_RUNNING%"=="true" (
    echo     [✓] RUNNING
) else (
    echo     [✗] NOT RUNNING
)

echo   Web Server (Port %WEB_PORT%): 
if "%WEB_RUNNING%"=="true" (
    echo     [✓] RUNNING
) else (
    echo     [✗] NOT RUNNING
)
echo.

:: ============================================================================
:: SECTION 2: START SERVERS IF NEEDED
:: ============================================================================
if "%API_RUNNING%"=="false" (
    echo [STEP 2/4] STARTING SERVERS...
    echo.
    
    :: Check Docker
    docker ps 2>nul | findstr "escort-" >nul
    if errorlevel 1 (
        echo   [!] Docker containers not running. Starting...
        cd /d "%PROJECT_DIR%"
        start "Docker Compose" cmd /k "docker-compose -f docker-compose.dev.yml up -d"
        timeout /t 8 /nobreak >nul
    ) else (
        echo   [✓] Docker containers running
    )
    echo.
    
    :: Start API
    echo   Starting API server (Port %API_PORT%)...
    cd /d "%PROJECT_DIR%"
    start "Lovnge API" cmd /k "cd apps/api && echo API Server Starting... && npm run dev"
    timeout /t 2 /nobreak >nul
    
    :: Start Web
    echo   Starting Web server (Port %WEB_PORT%)...
    start "Lovnge Web" cmd /k "cd apps/web && echo Web Server Starting... && npm run dev"
    timeout /t 2 /nobreak >nul
    
    echo.
    echo   [✓] Servers launching in new windows...
    echo   [i] Wait 15-30 seconds for full startup
    echo.
    timeout /t 5 /nobreak >nul
    
    set "SERVERS_STARTED=true"
) else (
    echo [STEP 2/4] SERVERS ALREADY RUNNING
    echo.
    set "SERVERS_STARTED=false"
)

:: ============================================================================
:: SECTION 3: GENERATE ULTRA-DETAILED PROMPT
:: ============================================================================
echo [STEP 3/4] GENERATING CONTEXT PROMPT...
echo.

set "PROMPT_FILE=%TEMP%\lovnge_qwen_%RANDOM%.md"

(
echo # 🎯 LOVNGE PLATFORM - DEVELOPMENT SESSION
echo.
echo **Date:** %DATE% %TIME%
echo **Focus:** CMS Profile Editor + Image Visibility + Fade Slider + Water Shader
echo.
echo ---
echo.
echo ## 📋 YESTERDAY'S PROGRESS REPORT
echo.
echo ### Please describe what you accomplished yesterday:
echo.
echo **Questions to help you recall:**
echo.
echo 1. **Profile Editor**
echo    - Did you build the edit form UI?
echo    - Which fields are working? (name, bio, attributes, rates, etc.)
echo    - Is form validation implemented?
echo    - Does the save/update function work?
echo.
echo 2. **Image Management**
echo    - Can you upload images to a profile?
echo    - Are images stored in MinIO successfully?
echo    - Can you delete images?
echo    - Can you reorder or set main photo?
echo.
echo 3. **Database/API**
echo    - Were new schema fields added for image visibility?
echo    - Are API endpoints updated for the new features?
echo    - Is the database migration complete?
echo.
echo 4. **UI Components**
echo    - Any new React components created?
echo    - Is the dashboard navigation working?
echo    - Mobile responsiveness addressed?
echo.
echo 5. **Bugs Fixed**
echo    - What issues were resolved?
echo.
echo ---
echo.
echo ## 🎯 CURRENT ROADMAP POSITION
echo.
echo ### MASTER PLAN: CMS → Public Profile with Fade Slider + Shader
echo.
echo ```
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  PHASE 1: Core CMS (CURRENT FOCUS)                              │
echo │  Progress: [████████░░░░] 60%%                                  │
echo ├─────────────────────────────────────────────────────────────────┤
echo │  ✅ DONE:                                                       │
echo │  • Docker infrastructure (PostgreSQL, Redis, MinIO, Mailhog)   │
echo │  • Database schema (13 tables including model_profiles)        │
echo │  • JWT authentication system                                    │
echo │  • Model CRUD API endpoints                                     │
echo │  • Dashboard UI layout                                          │
echo │  • Models list page                                             │
echo │  • Create model form                                            │
echo │  • Photo upload page (basic)                                    │
echo │                                                                 │
echo │  ⏳ IN PROGRESS:                                                │
echo │  • Profile editor page (edit existing models)                  │
echo │  • Image upload with MinIO integration                         │
echo │                                                                 │
echo │  ⏹️ TODO - IMMEDIATE:                                           │
echo │  • [ ] Image visibility toggles (show/hide on guest profile)   │
echo │  • [ ] Album/category organization for images                  │
echo │  • [ ] Background fade slider component                        │
echo │  • [ ] Water shader overlay integration                        │
echo │  • [ ] Preview mode (see what guests see)                      │
echo │  • [ ] Mobile responsive design                                │
echo └─────────────────────────────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  PHASE 2: Public Profile Pages (NEXT)                           │
echo │  Progress: [░░░░░░░░░░] 0%%                                      │
echo ├─────────────────────────────────────────────────────────────────┤
echo │  ⏹️ TODO:                                                       │
echo │  • Public profile page at /models/[slug]                       │
echo │  • Fade slider background with selected images                 │
echo │  • Water shader overlay (from water_shader_stacked.html)       │
echo │  • Image gallery with lightbox                                 │
echo │  • Contact/booking inquiry form                                │
echo │  • Reviews and reliability rating display                      │
echo │  • VIP/Elite content gating                                    │
echo └─────────────────────────────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  PHASE 3: Booking System (LATER)                                │
echo │  Progress: [░░░░░░░░░░] 0%%                                      │
echo ├─────────────────────────────────────────────────────────────────┤
echo │  ⏹️ TODO:                                                       │
echo │  • Booking request flow                                        │
echo │  • Escrow payment integration                                  │
echo │  • Calendar availability                                       │
echo │  • Confirmation workflow                                       │
echo └─────────────────────────────────────────────────────────────────┘
echo.
echo ┌─────────────────────────────────────────────────────────────────┐
echo │  PHASE 4: Advanced Features (FUTURE)                            │
echo ├─────────────────────────────────────────────────────────────────┤
echo │  • CRM integration (Telegram/WhatsApp)                         │
echo │  • Analytics dashboard                                         │
echo │  • Email verification                                          │
echo │  • Blacklist system                                            │
echo │  • Admin moderation tools                                      │
echo └─────────────────────────────────────────────────────────────────┘
echo ```
echo.
echo ---
echo.
echo ## 🎨 FEATURE SPECIFICATION: Image Visibility + Fade Slider + Shader
echo.
echo ### What We're Building:
echo.
echo **1. Image Visibility Control (CMS)**
echo ```
echo In the profile editor, each image should have:
echo - [✓] Checkbox: "Show on public profile"
echo - [✓] Visibility badge/tag (Visible/Hidden)
echo - [✓] Bulk selection for multiple images
echo - [✓] Filter view: Show only visible / only hidden
echo ```
echo.
echo **2. Album/Category System**
echo ```
echo Images can be organized into albums:
echo - Portfolio (public)
echo - VIP (private, requires login)
echo - Elite (private, requires verification)
echo - Verified (admin-approved)
echo.
echo Each album has:
echo - Name
echo - Visibility setting (public/private/gated)
echo - Cover image
echo - Sort order
echo ```
echo.
echo **3. Background Fade Slider**
echo ```
echo On the public profile page:
echo - Full-screen background slider
echo - Uses only images marked "visible"
echo - Smooth crossfade transitions (default: 5 seconds)
echo - Configurable per profile in CMS
echo - Mobile-responsive (cover fit)
echo - Performance optimized (lazy loading)
echo ```
echo.
echo **4. Water Shader Overlay**
echo ```
echo Port the Three.js shader from water_shader_stacked.html:
echo - Apply as overlay layer on top of fade slider
echo - Subtle ripple/distortion effect
echo - Performance fallback for mobile (disable shader)
echo - Intensity control in CMS (0-100%%)
echo - Animation speed control
echo ```
echo.
echo ---
echo.
echo ## 🔧 TECHNICAL IMPLEMENTATION PLAN
echo.
echo ### Step 1: Database Schema Updates
echo ```sql
echo -- Add to model_profiles table or create new table:
echo ALTER TABLE model_profiles ADD COLUMN fade_slider_enabled BOOLEAN DEFAULT false;
echo ALTER TABLE model_profiles ADD COLUMN fade_slider_speed INTEGER DEFAULT 5000;
echo ALTER TABLE model_profiles ADD COLUMN shader_intensity INTEGER DEFAULT 50;
echo.
echo -- Create image_visibility table:
echo CREATE TABLE profile_image_visibility (
echo   id UUID PRIMARY KEY,
echo   profile_id UUID REFERENCES model_profiles(id),
echo   media_id UUID REFERENCES media_files(id),
echo   is_visible BOOLEAN DEFAULT true,
echo   album_category VARCHAR(50) DEFAULT 'portfolio',
echo   sort_order INTEGER DEFAULT 0,
echo   created_at TIMESTAMP DEFAULT NOW()
echo );
echo ```
echo.
echo ### Step 2: Backend API Endpoints
echo ```typescript
echo // apps/api/src/models/models.controller.ts
echo PUT /models/:id/visibility       // Update image visibility
echo GET /models/:id/public-images    // Get only visible images
echo PUT /models/:id/slider-settings  // Update fade slider settings
echo.
echo // apps/api/src/media/media.controller.ts
echo POST /media/upload-multiple      // Batch upload images
echo PUT /media/:id/album             // Move image to album
echo ```
echo.
echo ### Step 3: CMS UI Components
echo ```tsx
echo // apps/web/app/dashboard/models/[id]/edit/page.tsx
echo - Add visibility toggle section
echo - Add album/category selector
echo - Add fade slider preview
echo - Add shader intensity slider
echo.
echo // New component: apps/web/components/ImageVisibilityGrid.tsx
echo - Grid view of all images
echo - Checkbox overlays
echo - Drag-drop reordering
echo - Bulk actions toolbar
echo ```
echo.
echo ### Step 4: Public Profile Page
echo ```tsx
echo // apps/web/app/models/[slug]/page.tsx
echo - Create public profile page
echo - Fetch visible images only
echo - Implement fade slider background
echo - Overlay water shader effect
echo - Add content sections (bio, attributes, contact)
echo ```
echo.
echo ### Step 5: Shader Integration
echo ```typescript
echo // apps/web/components/WaterShaderOverlay.tsx
echo - Port Three.js setup from water_shader_stacked.html
echo - Accept image texture as input
echo - Apply distortion effect
echo - Performance monitoring
echo - Mobile detection + fallback
echo ```
echo.
echo ---
echo.
echo ## 📁 KEY FILES TO WORK WITH
echo.
echo ### Backend (NestJS)
echo ```
echo apps/api/src/
echo ├── models/
echo │   ├── models.controller.ts      ← Model CRUD + new visibility endpoints
echo │   ├── models.service.ts         ← Business logic
echo │   └── dto/                       ← Request/response types
echo ├── media/
echo │   ├── media.controller.ts       ← File upload + presigned URLs
echo │   └── media.service.ts          ← MinIO integration
echo └── app.module.ts                 ← Module imports
echo ```
echo.
echo ### Frontend (Next.js)
echo ```
echo apps/web/app/
echo ├── dashboard/
echo │   └── models/
echo │       ├── list/page.tsx         ← Models list (working)
echo │       ├── create/page.tsx       ← Create form (working)
echo │       └── [id]/
echo │           ├── edit/page.tsx     ← Edit form (IN PROGRESS)
echo │           ├── photos/page.tsx   ← Photo upload (working)
echo │           └── view/page.tsx     ← View mode
echo └── models/
echo     └── [slug]/
echo         └── page.tsx              ← Public profile (TODO)
echo.
echo apps/web/components/
echo ├── ImageVisibilityGrid.tsx       ← NEW: Visibility controls
echo ├── FadeSlider.tsx                ← NEW: Background slider
echo └── WaterShaderOverlay.tsx        ← NEW: Shader component
echo ```
echo.
echo ### Reference Files
echo ```
echo water_shader_stacked.html         ← Shader implementation reference
echo packages/db/src/schema/
echo └── model_profiles.ts             ← Database schema
echo ```
echo.
echo ---
echo.
echo ## 🚀 IMMEDIATE ACTION ITEMS
echo.
echo ### Today's Goals (Choose 1-2 to focus on):
echo.
echo **Option A: Finish Profile Editor**
echo - [ ] Complete all form fields
echo - [ ] Add image visibility toggles
echo - [ ] Implement live preview
echo - [ ] Add validation and error handling
echo.
echo **Option B: Build Fade Slider**
echo - [ ] Create FadeSlider component
echo - [ ] Implement smooth crossfade
echo - [ ] Add configuration options
echo - [ ] Test with multiple images
echo.
echo **Option C: Integrate Water Shader**
echo - [ ] Port Three.js code to React component
echo - [ ] Apply as overlay on fade slider
echo - [ ] Add intensity/speed controls
echo - [ ] Implement mobile fallback
echo.
echo **Option D: Public Profile Page**
echo - [ ] Create /models/[slug] route
echo - [ ] Fetch and display visible images
echo - [ ] Add fade slider background
echo - [ ] Add shader overlay
echo.
echo ---
echo.
echo ## ❓ QUESTIONS FOR YOU (Developer)
echo.
echo **Please answer these to get personalized guidance:**
echo.
echo 1. **What did you complete yesterday?**
echo    - Be specific about features implemented
echo    - Mention any files you modified
echo    - Note any bugs you fixed
echo.
echo 2. **What is currently working?**
echo    - Can you edit a model profile right now?
echo    - Can you upload images?
echo    - Are images stored in MinIO?
echo    - What's broken or incomplete?
echo.
echo 3. **What do you want to build today?**
echo    - Choose from Options A-D above
echo    - Or describe your own goal
echo.
echo 4. **Any blockers or issues?**
echo    - API errors?
echo    - Database problems?
echo    - UI bugs?
echo    - Performance issues?
echo.
echo ---
echo.
echo ## 📊 QUICK STATUS CHECK
echo.
echo.
echo ### Current Server Status:
echo API Server (Port %API_PORT%): %API_RUNNING%
echo Web Server (Port %WEB_PORT%): %WEB_RUNNING%
echo.
echo ### Docker Containers:
) >> "%PROMPT_FILE%"

:: Add Docker status
docker ps --format "  - {{.Names}}: {{.Status}}" 2>nul >> "%PROMPT_FILE%" || echo "  - Docker not running" >> "%PROMPT_FILE%"

(
echo.
echo ---
echo.
echo ## 💬 LET'S GET STARTED
echo.
echo I'm ready to help you build the Lovnge Platform CMS. Please:
echo.
echo 1. **Describe yesterday's progress** (what you built, what works)
echo 2. **Tell me today's goal** (what you want to focus on)
echo 3. **Mention any issues** (bugs, errors, blockers)
echo.
echo Once I understand where we are, I'll help you:
echo - Review the current implementation
echo - Plan the next steps
echo - Implement features one by one
echo - Test and verify everything works
echo.
echo **What did you accomplish yesterday, and what shall we build today?** 🎯
echo.
) >> "%PROMPT_FILE%"

:: Add dynamic status
(
echo.
echo ---
echo.
echo ## 📈 AUTO-DETECTED PROJECT STATUS
echo.
) >> "%PROMPT_FILE%"

:: Check key files
if exist "%PROJECT_DIR%apps\web\app\dashboard\models\[id]\edit\page.tsx" (
    echo   [✓] Profile editor page exists >> "%PROMPT_FILE%"
) else (
    echo   [✗] Profile editor page missing >> "%PROMPT_FILE%"
)

if exist "%PROJECT_DIR%apps\web\app\dashboard\models\[id]\photos\page.tsx" (
    echo   [✓] Photo upload page exists >> "%PROMPT_FILE%"
) else (
    echo   [✗] Photo upload page missing >> "%PROMPT_FILE%"
)

if exist "%PROJECT_DIR%apps\api\src\models\models.controller.ts" (
    echo   [✓] Models API controller exists >> "%PROMPT_FILE%"
) else (
    echo   [✗] Models API controller missing >> "%PROMPT_FILE%"
)

if exist "%PROJECT_DIR%water_shader_stacked.html" (
    echo   [✓] Water shader reference available >> "%PROMPT_FILE%"
) else (
    echo   [✗] Water shader reference missing >> "%PROMPT_FILE%"
)

echo. >> "%PROMPT_FILE%"

echo   Prompt file created: %PROMPT_FILE%
echo.

:: ============================================================================
:: SECTION 4: OPEN QWEN CODE
:: ============================================================================
echo [STEP 4/4] OPENING QWEN CODE...
echo.

cd /d "%PROJECT_DIR%"

:: Open Qwen with the comprehensive prompt
start "Qwen Code - Lovnge Development" cmd /k "%QWEN_CMD% --prompt-file "%PROMPT_FILE%""

timeout /t 2 /nobreak >nul

:: ============================================================================
:: FOOTER
:: ============================================================================
echo.
echo ============================================================================
echo                      WORKFLOW INITIATED SUCCESSFULLY
echo ============================================================================
echo.
echo   🖥️  SERVERS:
if "%API_RUNNING%"=="true" (
    echo     [✓] API  - http://localhost:%API_PORT%
) else (
    echo     [→] API  - Starting... (check "Lovnge API" window)
)

if "%WEB_RUNNING%"=="true" (
    echo     [✓] Web  - http://localhost:%WEB_PORT%
) else (
    echo     [→] Web  - Starting... (check "Lovnge Web" window)
)
echo.
echo   🤖 QWEN CODE:
echo     [✓] Launched with ultra-detailed context prompt
echo     [i] Answer the questions to get personalized guidance
echo.
echo   🔗 QUICK LINKS:
echo     API Swagger:  http://localhost:%API_PORT%/api/docs
echo     Web App:      http://localhost:%WEB_PORT%
echo     MinIO:        http://localhost:9001
echo     Mailhog:      http://localhost:8025
echo.
echo   📋 NEXT STEPS:
echo     1. Wait for servers to fully start (15-30 seconds)
echo     2. In Qwen, describe yesterday's progress
echo     3. Tell Qwen today's goal
echo     4. Follow the implementation plan together
echo.
echo ============================================================================
echo.

:: Cleanup
del "%PROMPT_FILE%" 2>nul

echo   Press any key to close this window...
pause >nul

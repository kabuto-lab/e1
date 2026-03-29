@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: QWEN SESSION - Interactive Progress Tracking
:: ============================================================================
:: This script opens Qwen Code and prompts you to report yesterday's progress,
:: then provides detailed roadmap guidance based on your answers.
:: ============================================================================

color 0B
title Lovnge Platform - Qwen Session

set "PROJECT_DIR=%~dp0"
set "QWEN_CMD=qwen"

echo.
echo ============================================================================
echo                    QWEN CODE - DEVELOPMENT SESSION
echo ============================================================================
echo.
echo   Opening Qwen Code with interactive progress questionnaire...
echo.

:: Create comprehensive session prompt
set "PROMPT_FILE=%TEMP%\qwen_session_%RANDOM%.md"

(
echo # Lovnge Platform - Development Session
echo.
echo **Date:** %DATE% %TIME%
echo.
echo ---
echo.
echo ## 📋 PROGRESS REPORTING - Please Answer These Questions:
echo.
echo ### 1. What did you accomplish yesterday?
echo.
echo Be specific about what was implemented:
echo.
echo - [ ] **Profile Editor**: Did you complete the edit form UI?
echo   - Can you edit basic info (name, slug, bio)?
echo   - Can you edit physical attributes (age, height, weight)?
echo   - Can you edit rates (hourly, overnight)?
echo   - Can you toggle VIP/Elite status?
echo.
echo - [ ] **Image Management**: 
echo   - Can you upload images to a profile?
echo   - Can you delete images?
echo   - Can you reorder images?
echo   - Can you set a main/profile photo?
echo.
echo - [ ] **Database Changes**:
echo   - Were new tables/columns added?
echo   - Are migrations working?
echo   - Is MinIO storage integration complete?
echo.
echo - [ ] **Other Features**:
echo   - What else was implemented?
echo.
echo ---
echo.
echo ### 2. Current Working Status
echo.
echo Please test and report what's currently functional:
echo.
echo | Feature | Status | Notes |
echo |---------|--------|-------|
echo | Login/Auth | ✅/❌/⚠️ | |
echo | Dashboard | ✅/❌/⚠️ | |
echo | Models List | ✅/❌/⚠️ | |
echo | Create Model | ✅/❌/⚠️ | |
echo | Edit Model | ✅/❌/⚠️ | |
echo | Upload Photos | ✅/❌/⚠️ | |
echo | View Profile | ✅/❌/⚠️ | |
echo.
echo ---
echo.
echo ### 3. Immediate Next Task
echo.
echo What do you want to focus on TODAY? Choose from:
echo.
echo **Option A: Profile Editor Completion**
echo - Finish all form fields in the edit page
echo - Add validation and error handling
echo - Implement live preview
echo.
echo **Option B: Image Visibility System**
echo - Add "Show on public profile" toggle per image
echo - Create album/category system
echo - Build visibility settings UI
echo.
echo **Option C: Fade Slider Background**
echo - Implement background image slider
echo - Add smooth crossfade transitions
echo - Make it configurable per profile
echo.
echo **Option D: Water Shader Integration**
echo - Port shader from water_shader_stacked.html
echo - Apply as overlay on profile page
echo - Optimize for performance
echo.
echo ---
echo.
echo ### 4. Bugs or Blockers
echo.
echo Are you facing any technical issues?
echo.
echo - [ ] API errors (specify endpoint)
echo - [ ] Database connection issues
echo - [ ] Image upload failures
echo - [ ] UI/rendering problems
echo - [ ] Performance issues
echo - [ ] Other (describe)
echo.
echo ---
echo.
echo ## 🎯 CURRENT ROADMAP POSITION
echo.
echo ### Phase 1: Core CMS [CURRENT PHASE]
echo ```
echo Progress: [____/100%]
echo.
echo ✅ Completed:
echo - Docker infrastructure (PostgreSQL, Redis, MinIO, Mailhog)
echo - Database schema (13 tables)
echo - JWT authentication
echo - Basic model CRUD endpoints
echo - Dashboard UI skeleton
echo.
echo ⏳ In Progress:
echo - Profile editor UI (form fields, validation)
echo - Image upload with MinIO presigned URLs
echo - Photo management page
echo.
echo ⏹️ Pending:
echo - [ ] Image visibility toggles (show/hide on public profile)
echo - [ ] Album/category organization
echo - [ ] Background fade slider component
echo - [ ] Water shader overlay integration
echo - [ ] Mobile responsive design
echo - [ ] SEO metadata per profile
echo ```
echo.
echo ### Phase 2: Public Profile Pages [NEXT]
echo ```
echo ⏹️ Pending:
echo - Public profile page with fade slider + shader
echo - Image gallery with lightbox
echo - Contact/booking form
echo - Reviews and ratings display
echo - VIP content gating
echo ```
echo.
echo ### Phase 3: Advanced Features [LATER]
echo ```
echo ⏹️ Pending:
echo - Escrow payment integration
echo - Booking system state machine
echo - Review/rating calculations
echo - Blacklist automation
echo - Email verification
echo - Analytics dashboard
echo ```
echo.
echo ---
echo.
echo ## 🔧 TECHNICAL CONTEXT
echo.
echo ### Stack
echo - **Frontend:** Next.js 15, React 19, TypeScript, TailwindCSS, Three.js
echo - **Backend:** NestJS 10, Drizzle ORM, PostgreSQL 16
echo - **Storage:** MinIO (S3-compatible)
echo - **Auth:** JWT with refresh tokens
echo.
echo ### Key Files
echo ```
echo CMS Pages:
echo   - apps/web/app/dashboard/models/list/page.tsx
echo   - apps/web/app/dashboard/models/[id]/edit/page.tsx
echo   - apps/web/app/dashboard/models/[id]/photos/page.tsx
echo.
echo Backend:
echo   - apps/api/src/models/models.controller.ts
echo   - apps/api/src/models/models.service.ts
echo   - packages/db/src/schema/model_profiles.ts
echo.
echo Shader Reference:
echo   - water_shader_stacked.html
echo ```
echo.
echo ### API Endpoints
echo ```
echo GET    /models              - List all models
echo GET    /models/id/:id       - Get single model
echo POST   /models              - Create model
echo PUT    /models/id/:id       - Update model
echo DELETE /models/id/:id       - Delete model
echo POST   /media/presign      - Get presigned upload URL
echo ```
echo.
echo ---
echo.
echo ## 🚀 ACTION PLAN FOR THIS SESSION
echo.
echo Based on your answers above, I will help you:
echo.
echo 1. **Assess Current State** - Review what's working vs broken
echo 2. **Plan Next Steps** - Identify the most important task
echo 3. **Implement Features** - Build one feature at a time
echo 4. **Test & Verify** - Ensure everything works correctly
echo.
echo ---
echo.
echo **Please start by answering the questions above. I'm ready to help!** 🎯
echo.
) > "%PROMPT_FILE%"

cd /d "%PROJECT_DIR%"

:: Open Qwen Code with the prompt file
start "Qwen Code - Lovnge Session" cmd /k "%QWEN_CMD% --prompt-file "%PROMPT_FILE%""

timeout /t 2 /nobreak >nul

echo.
echo   [OK] Qwen Code launched!
echo.
echo   The prompt file contains:
echo     - Progress questionnaire
echo     - Current roadmap position
echo     - Technical context
echo     - Action plan template
echo.
echo   Answer the questions in Qwen to get personalized guidance.
echo.

:: Cleanup
del "%PROMPT_FILE%" 2>nul

pause

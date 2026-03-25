@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: LOVNGE PLATFORM - DEVELOPMENT WORKFLOW SCRIPT
:: ============================================================================
:: This script:
:: 1. Opens Qwen Code with project context
:: 2. Checks server status and starts if needed
:: 3. Provides ultra-detailed progress report and roadmap
:: ============================================================================

color 0A
title Lovnge Platform - Development Workflow

:: ============================================================================
:: CONFIGURATION
:: ============================================================================
set "PROJECT_DIR=%~dp0"
set "API_PORT=3000"
set "WEB_PORT=3001"
set "QWEN_CMD=qwen"

:: ============================================================================
:: HEADER
:: ============================================================================
echo.
echo ============================================================================
echo                      LOVNGE PLATFORM - DEV WORKFLOW
echo ============================================================================
echo.
echo   Project Directory: %PROJECT_DIR%
echo   Date: %DATE% %TIME%
echo.
echo ============================================================================
echo.

:: ============================================================================
:: SECTION 1: SERVER STATUS CHECK
:: ============================================================================
echo [1/4] CHECKING SERVER STATUS...
echo.

:: Check API server using a more reliable method
set "API_RUNNING=false"
netstat -nno 2>nul | findstr ":%API_PORT%.*LISTENING" >nul
if not errorlevel 1 set "API_RUNNING=true"

:: Check Web server
set "WEB_RUNNING=false"
netstat -nno 2>nul | findstr ":%WEB_PORT%.*LISTENING" >nul
if not errorlevel 1 set "WEB_RUNNING=true"

echo   API Server (Port %API_PORT%): 
if "%API_RUNNING%"=="true" (
    echo     [OK] Running
) else (
    echo     [XX] Not Running
)

echo   Web Server (Port %WEB_PORT%): 
if "%WEB_RUNNING%"=="true" (
    echo     [OK] Running
) else (
    echo     [XX] Not Running
)
echo.

:: ============================================================================
:: SECTION 2: START SERVERS IF NEEDED
:: ============================================================================
if "%API_RUNNING%"=="false" (
    echo [2/4] STARTING SERVERS...
    echo.
    
    :: Check if Docker containers are running
    docker ps --format "table {{.Names}}" 2>nul | findstr "escort-" >nul
    if errorlevel 1 (
        echo   [!] Docker containers not running. Starting...
        cd /d "%PROJECT_DIR%"
        start "Docker Compose" cmd /k "docker-compose -f docker-compose.dev.yml up -d && pause"
        timeout /t 10 /nobreak >nul
    ) else (
        echo   [OK] Docker containers running
    )
    echo.
    
    :: Start API and Web concurrently
    echo   Starting API server...
    cd /d "%PROJECT_DIR%"
    start "Lovnge API" cmd /k "cd apps/api && npm run dev"
    timeout /t 3 /nobreak >nul
    
    echo   Starting Web server...
    start "Lovnge Web" cmd /k "cd apps/web && npm run dev"
    timeout /t 3 /nobreak >nul
    
    echo.
    echo   [OK] Servers starting in new windows...
    echo.
    timeout /t 5 /nobreak >nul
) else (
    echo [2/4] SERVERS ALREADY RUNNING - Skipping start
    echo.
)

:: ============================================================================
:: SECTION 3: GENERATE CONTEXT PROMPT
:: ============================================================================
echo [3/4] GENERATING PROJECT CONTEXT PROMPT...
echo.

:: Create temporary prompt file
set "PROMPT_FILE=%TEMP%\qwen_prompt_%RANDOM%.txt"

(
echo.
echo ================================================================================
echo LOVNGE PLATFORM - DEVELOPMENT SESSION CONTEXT
echo ================================================================================
echo.
echo DATE: %DATE% %TIME%
echo PROJECT: Lovnge Escort Platform (Premium CMS for Model Management)
echo.
echo ================================================================================
echo CURRENT DEVELOPMENT PHASE: CMS + Profile Image Management
echo ================================================================================
echo.
echo ## MAIN OBJECTIVE:
echo Build a fully functional CMS where each model profile can be edited, and users
echo can select which images/albums are shown on the public guest profile page.
echo The profile images should act as a fade slider background, with the water
echo ripple shader effect from "water_shader_stacked.html" overlaid on top.
echo.
echo ================================================================================
echo WHAT WAS COMPLETED YESTERDAY:
echo ================================================================================
echo.
echo [Please provide details about what was accomplished in the previous session.
echo  I will ask you specific questions below to help document this.]
echo.
echo ================================================================================
echo CURRENT PROJECT STATUS (Auto-Detected):
echo ================================================================================
echo.

:: Check Docker status
echo ### Infrastructure:
docker ps --format "  - {{.Names}}: {{.Status}}" 2>nul || echo "  - Docker containers: NOT RUNNING"
echo.

:: Check if node_modules exists
if exist "%PROJECT_DIR%node_modules" (
    echo ### Dependencies: Installed
) else (
    echo ### Dependencies: NOT INSTALLED (run: npm install)
)
echo.

:: Check database schema
if exist "%PROJECT_DIR%packages\db\src\schema" (
    echo ### Database Schema: EXISTS (13 tables defined)
) else (
    echo ### Database Schema: MISSING
)
echo.

echo ================================================================================
echo DETAILED ROADMAP - CURRENT POSITION:
echo ================================================================================
echo.
echo ### PHASE 1: Core CMS Functionality [CURRENT FOCUS]
echo   [ ] Profile Editor - Full CRUD for model profiles
echo       - Basic info (name, slug, biography, rates)
echo       - Physical attributes (age, height, weight, measurements)
echo       - VIP/Elite status toggles
echo       - Verification status management
echo   [ ] Image/Album Management System
echo       - Upload multiple images per profile
echo       - Create albums/categories (Portfolio, VIP, Elite, etc.)
echo       - Drag-drop reordering
echo       - Set main/profile photo
echo   [ ] Guest Profile Visibility Selector
echo       - Checkbox/toggle for each image: "Show on public profile"
echo       - Album-level visibility controls
echo       - Preview mode: See exactly what guests see
echo   [ ] Background Fade Slider
echo       - Implement image fade slider for profile background
echo       - Configurable transition speed (default: 5s)
echo       - Smooth crossfade between selected images
echo       - Mobile-responsive sizing
echo   [ ] Water Shader Overlay Integration
echo       - Port Three.js shader from water_shader_stacked.html
echo       - Apply as overlay layer on top of fade slider
echo       - Performance optimization (mobile fallback)
echo       - Shader intensity/animation controls
echo.
echo ### PHASE 2: Advanced CMS Features [NEXT]
echo   [ ] Bulk Operations (select multiple images, batch edit)
echo   [ ] Image optimization (auto-resize, WebP conversion)
echo   [ ] Video upload support (profile videos, walkthroughs)
echo   [ ] SEO metadata per profile (meta title, description, OG tags)
echo   [ ] Profile analytics (views, favorites, booking requests)
echo   [ ] Version history / undo system for edits
echo.
echo ### PHASE 3: Public Profile Pages [PENDING]
echo   [ ] Guest-facing profile page with fade slider + shader
echo   [ ] Image gallery with lightbox
echo   [ ] Contact/booking form integration
echo   [ ] Social proof (reviews, ratings, reliability score)
echo   [ ] VIP/Elite content gating (login required)
echo.
echo ### PHASE 4: Admin Features [PENDING]
echo   [ ] Moderation queue for new/edited profiles
echo   [ ] Bulk profile actions (publish, unpublish, feature)
echo   [ ] User role management (admin, manager, model)
echo   [ ] Audit logs for all profile changes
echo.
echo ================================================================================
echo TECHNICAL STACK:
echo ================================================================================
echo.
echo   Frontend: Next.js 15 (App Router), React 19, TypeScript, TailwindCSS
echo   Backend:  NestJS 10, Drizzle ORM, PostgreSQL 16
echo   Storage:  MinIO (S3-compatible) for images/videos
echo   Effects:  Three.js WebGL shaders (water ripple effect)
echo   Auth:     JWT tokens with refresh rotation
echo.
echo ================================================================================
echo KEY FILES TO WORK WITH:
echo ================================================================================
echo.
echo   CMS Pages:
echo   - apps/web/app/dashboard/models/list/page.tsx (Models list)
echo   - apps/web/app/dashboard/models/[id]/edit/page.tsx (Profile editor)
echo   - apps/web/app/dashboard/models/[id]/photos/page.tsx (Photo management)
echo.
echo   Backend:
echo   - apps/api/src/models/models.controller.ts
echo   - apps/api/src/models/models.service.ts
echo   - packages/db/src/schema/model_profiles.ts
echo.
echo   Shader Reference:
echo   - water_shader_stacked.html (Three.js water ripple effect)
echo.
echo ================================================================================
echo QUESTIONS FOR YOU (Developer):
echo ================================================================================
echo.
echo Please answer these questions so I can understand our current position:
echo.
echo 1. What specific features were implemented yesterday?
echo    - Profile editor UI completed?
echo    - Image upload functionality working?
echo    - Database schema changes made?
echo.
echo 2. What is currently working vs broken?
echo    - Can you create/edit a model profile right now?
echo    - Can you upload images successfully?
echo    - Are images stored in MinIO correctly?
echo.
echo 3. What is the immediate next task you want to work on?
echo    - Finish the profile editor form?
echo    - Implement image visibility toggles?
echo    - Build the fade slider component?
echo    - Integrate the water shader overlay?
echo.
echo 4. Are there any specific bugs or blockers to address first?
echo.
echo ================================================================================
echo ACTION ITEMS FOR THIS SESSION:
echo ================================================================================
echo.
echo Based on your answers above, I will help you:
echo 1. Review current implementation status
echo 2. Identify what needs to be built next
echo 3. Implement the required features step by step
echo 4. Test and verify everything works
echo.
echo Please start by telling me:
echo - What did you accomplish yesterday?
echo - What would you like to focus on today?
echo.
echo ================================================================================
) > "%PROMPT_FILE%"

echo   Prompt file created: %PROMPT_FILE%
echo.

:: ============================================================================
:: SECTION 4: OPEN QWEN CODE
:: ============================================================================
echo [4/4] OPENING QWEN CODE...
echo.
echo   Launching Qwen Code with project context...
echo.

:: Change to project directory
cd /d "%PROJECT_DIR%"

:: Open Qwen Code with the prompt
start "Qwen Code - Lovnge Platform" cmd /k "%QWEN_CMD% --prompt-file "%PROMPT_FILE%""

:: Alternative: Just open Qwen in the project directory
:: start "Qwen Code" cmd /k "cd /d "%PROJECT_DIR%" && %QWEN_CMD%"

timeout /t 2 /nobreak >nul

:: ============================================================================
:: FOOTER
:: ============================================================================
echo.
echo ============================================================================
echo                         WORKFLOW INITIATED
echo ============================================================================
echo.
echo   Servers:
if "%API_RUNNING%"=="true" (
    echo     API:  Running on http://localhost:%API_PORT%
) else (
    echo     API:  Starting... (check "Lovnge API" window)
)

if "%WEB_RUNNING%"=="true" (
    echo     Web:  Running on http://localhost:%WEB_PORT%
) else (
    echo     Web:  Starting... (check "Lovnge Web" window)
)
echo.
echo   Qwen Code:
echo     Status: Launched with context prompt
echo.
echo   Quick Links:
echo     API Swagger:  http://localhost:%API_PORT%/api/docs
echo     Web App:      http://localhost:%WEB_PORT%
echo     MinIO:        http://localhost:9001
echo     Mailhog:      http://localhost:8025
echo.
echo ============================================================================
echo.
echo   Next Steps:
echo   1. Wait for servers to fully start (~15-30 seconds)
echo   2. Qwen Code will ask you about yesterday's progress
echo   3. Answer the questions to get personalized guidance
echo   4. Follow the roadmap to complete the CMS features
echo.
echo ============================================================================
echo.

:: Cleanup
del "%PROMPT_FILE%" 2>nul

:: Keep window open
echo   Press any key to close this window...
pause >nul

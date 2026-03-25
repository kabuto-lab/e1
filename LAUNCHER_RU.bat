@echo off
setlocal enabledelayedexpansion

color 0B
title Lovnge Platform - Быстрый Запуск

:MENU
cls
echo.
echo ============================================================================
echo                    LOVNGE PLATFORM - БЫСТРЫЙ ЗАПУСК
echo ============================================================================
echo.
echo   Выберите опцию:
echo.
echo   [1] 🚀 Полный рабочий процесс (Рекомендуется)
echo       - Проверка серверов + Автозапуск + Qwen с полным контекстом
echo.
echo   [2] 🤖 Только сессия Qwen
echo       - Открыть Qwen с вопросами о прогрессе
echo.
echo   [3] 📝 Просмотр текущей дорожной карты
echo       - Открыть документацию по roadmap в браузере
echo.
echo   [4] 🔧 Только запуск серверов
echo       - Запустить API и Web без Qwen
echo.
echo   [5] 🛑 Остановить все серверы
echo       - Остановить API, Web и Docker контейнеры
echo.
echo   [6] 📊 Проверить статус серверов
echo       - Быстрая проверка всех сервисов
echo.
echo   [0] Выход
echo.
echo ============================================================================
echo.
set /p choice="Введите ваш выбор (0-6): "

if "%choice%"=="1" goto ULTIMATE
if "%choice%"=="2" goto QWEN
if "%choice%"=="3" goto ROADMAP
if "%choice%"=="4" goto START_SERVERS
if "%choice%"=="5" goto STOP_ALL
if "%choice%"=="6" goto STATUS
if "%choice%"=="0" goto EXIT

echo Неверный выбор! Попробуйте снова.
timeout /t 2 /nobreak >nul
goto MENU

:ULTIMATE
cls
echo.
echo Запуск полного рабочего процесса...
echo.
dev-ultimate.bat
goto MENU

:QWEN
cls
echo.
echo Открытие сессии Qwen...
echo.
qwen-session.bat
goto MENU

:ROADMAP
cls
echo.
echo Открытие текущей дорожной карты...
echo.
start CURRENT_ROADMAP.md
echo Roadmap открыт в просмотрщике markdown.
timeout /t 2 /nobreak >nul
goto MENU

:START_SERVERS
cls
echo.
echo Запуск серверов...
echo.

:: Check and start Docker
docker ps 2>nul | findstr "escort-" >nul
if errorlevel 1 (
    echo [!] Docker контейнеры не запущены. Запуск...
    docker-compose -f docker-compose.dev.yml up -d
    timeout /t 5 /nobreak >nul
) else (
    echo [✓] Docker контейнеры запущены
)

:: Start API
netstat -nno 2>nul | findstr ":3000.*LISTENING" >nul
if errorlevel 1 (
    echo [→] Запуск API сервера...
    start "Lovnge API" cmd /k "cd apps/api && npm run dev"
) else (
    echo [✓] API уже запущен
)

:: Start Web
netstat -nno 2>nul | findstr ":3001.*LISTENING" >nul
if errorlevel 1 (
    echo [→] Запуск Web сервера...
    start "Lovnge Web" cmd /k "cd apps/web && npm run dev"
) else (
    echo [✓] Web уже запущен
)

echo.
echo Серверы запускаются...
timeout /t 3 /nobreak >nul
goto MENU

:STOP_ALL
cls
echo.
echo Остановка всех сервисов...
echo.

:: Kill Node processes
echo [→] Остановка Node.js процессов...
taskkill /F /FI "WINDOWTITLE eq Lovnge*" 2>nul
timeout /t 2 /nobreak >nul

:: Stop Docker
echo [→] Остановка Docker контейнеров...
docker-compose -f docker-compose.dev.yml down
timeout /t 3 /nobreak >nul

echo.
echo [✓] Все сервисы остановлены.
timeout /t 2 /nobreak >nul
goto MENU

:STATUS
cls
echo.
echo ============================================================================
echo                    ПРОВЕРКА СТАТУСА СЕРВЕРОВ
echo ============================================================================
echo.

:: Check API
set "API_STATUS=НЕ РАБОТАЕТ"
netstat -nno 2>nul | findstr ":3000.*LISTENING" >nul
if not errorlevel 1 set "API_STATUS=РАБОТАЕТ"

:: Check Web
set "WEB_STATUS=НЕ РАБОТАЕТ"
netstat -nno 2>nul | findstr ":3001.*LISTENING" >nul
if not errorlevel 1 set "WEB_STATUS=РАБОТАЕТ"

echo   API сервер (Порт 3000):    %API_STATUS%
echo   Web сервер (Порт 3001):    %WEB_STATUS%
echo.

:: Check Docker
echo   Docker контейнеры:
docker ps --format "     - {{.Names}}: {{.Status}}" 2>nul || echo "     Не запущены"
echo.

:: Check ports
echo   Использование портов:
netstat -nno 2>nul | findstr ":3000 :3001 :5432 :6379 :9000 :9001" | findstr LISTENING
echo.

echo ============================================================================
echo.
echo   Быстрые ссылки:
echo     API Swagger:  http://localhost:3000/api/docs
echo     Web приложение: http://localhost:3001
echo     MinIO:        http://localhost:9001
echo     Mailhog:      http://localhost:8025
echo.
echo ============================================================================
echo.
pause
goto MENU

:EXIT
cls
echo.
echo До свидания!
echo.
timeout /t 1 /nobreak >nul
exit /b

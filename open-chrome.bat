@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Lovnge Platform - Открыть в Chrome

echo.
echo ============================================================================
echo                    ОТКРЫТИЕ В CHROME С ОБНОВЛЕНИЕМ КЭША
echo ============================================================================
echo.

:: Check if Web server is running
set "WEB_RUNNING=false"
netstat -nno 2>nul | findstr ":3001.*LISTENING" >nul
if not errorlevel 1 set "WEB_RUNNING=true"

if "%WEB_RUNNING%"=="false" (
    echo [!] Web сервер не запущен. Запуск...
    start "Lovnge Web" cmd /k "cd apps/web && npm run dev"
    echo.
    echo [→] Ожидание запуска сервера (15 секунд)...
    timeout /t 15 /nobreak >nul
    
    :: Re-check
    netstat -nno 2>nul | findstr ":3001.*LISTENING" >nul
    if errorlevel 1 (
        echo [✗] Не удалось запустить Web сервер. Проверьте ошибки выше.
        pause
        exit /b 1
    )
)

echo [✓] Web сервер работает на http://localhost:3001
echo.

:: Kill any existing Chrome processes
echo [→] Закрытие существующих окон Chrome...
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul

:: Open Chrome with cache disabled
echo [→] Открытие Google Chrome с очисткой кэша...
echo.

:: Method 1: Chrome with disable-cache flag
start chrome --disable-cache --disable-application-cache http://localhost:3001

timeout /t 2 /nobreak >nul

echo.
echo ============================================================================
echo   Chrome открыт!
echo ============================================================================
echo.
echo   Для принудительного обновления кэша в браузере нажмите:
echo.
echo     Ctrl + Shift + R  (Windows)
echo     Cmd + Shift + R   (Mac)
echo.
echo   Или:
echo     F12 → Правая кнопка на кнопке обновления → "Очистить кэш и перезагрузить"
echo.
echo ============================================================================
echo.

exit /b

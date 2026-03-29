Option Explicit
Dim choice, shell, fso

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Change to script directory
Dim scriptPath, scriptDir
scriptPath = fso.GetAbsolutePathName(WScript.ScriptFullName)
scriptDir = fso.GetParentFolderName(scriptPath)
shell.CurrentDirectory = scriptDir

' Show menu
Do
    shell.Run "cmd /c cls", 0, True
    
    Dim menuText
    menuText = "============================================================================" & vbCrLf & vbCrLf & _
               "                    LOVNGE PLATFORM - БЫСТРЫЙ ЗАПУСК" & vbCrLf & vbCrLf & _
               "============================================================================" & vbCrLf & vbCrLf & _
               "  Выберите опцию:" & vbCrLf & vbCrLf & _
               "  [1] Полный рабочий процесс (Рекомендуется)" & vbCrLf & _
               "      - Проверка серверов + Автозапуск + Qwen с контекстом" & vbCrLf & vbCrLf & _
               "  [2] Сессия Qwen (только вопросы)" & vbCrLf & _
               "      - Открыть Qwen с вопросами о прогрессе" & vbCrLf & vbCrLf & _
               "  [3] Дорожная карта" & vbCrLf & _
               "      - Открыть документацию в браузере" & vbCrLf & vbCrLf & _
               "  [4] Запуск серверов" & vbCrLf & _
               "      - Запустить API и Web без Qwen" & vbCrLf & vbCrLf & _
               "  [5] Остановка всех серверов" & vbCrLf & _
               "      - Остановить API, Web и Docker" & vbCrLf & vbCrLf & _
               "  [6] Проверка статуса" & vbCrLf & _
               "      - Быстрая проверка всех сервисов" & vbCrLf & vbCrLf & _
               "  [7] Открыть в Chrome" & vbCrLf & _
               "      - Обновить кэш и открыть приложение" & vbCrLf & vbCrLf & _
               "  [0] Выход" & vbCrLf & vbCrLf & _
               "============================================================================" & vbCrLf & vbCrLf
    
    choice = shell.InputBox(menuText & "Введите ваш выбор (0-7):", "Lovnge Platform - Запуск")
    
    If choice = "" Then choice = "0"
    
    Select Case choice
        Case "1"
            shell.Run "cmd /c dev-ultimate-ru.bat", 1, False
        Case "2"
            shell.Run "cmd /c qwen-session-ru.bat", 1, False
        Case "3"
            shell.Run "cmd /c start CURRENT_ROADMAP.md", 1, False
        Case "4"
            shell.Run "cmd /c echo Запуск серверов... ^&^& docker-compose -f docker-compose.dev.yml up -d ^&^& start ""Lovnge API"" cmd /k ""cd apps/api ^&^& npm run dev"" ^&^& start ""Lovnge Web"" cmd /k ""cd apps/web ^&^& npm run dev""", 1, False
        Case "5"
            shell.Run "cmd /c taskkill /F /FI ""WINDOWTITLE eq Lovnge*"" ^&^& docker-compose -f docker-compose.dev.yml down", 1, False
        Case "6"
            shell.Run "cmd /c @echo off ^&^& cls ^&^& echo Проверка статуса... ^&^& netstat -nno ^| findstr "":3000 :3001"" ^&^& pause", 1, False
        Case "7"
            shell.Run "cmd /c open-chrome.bat", 1, False
        Case "0"
            Exit Do
        Case Else
            shell.Popup "Неверный выбор! Попробуйте снова.", 2, "Ошибка", 48
    End Select
Loop

WScript.Echo "До свидания!"

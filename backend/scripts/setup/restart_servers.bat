@echo off
REM ============================================================================
REM Script de Redémarrage Automatique des Serveurs (Version Batch)
REM ============================================================================
REM Description : Lance le script PowerShell de redémarrage des serveurs
REM Usage       : Double-cliquez sur ce fichier ou executez-le dans CMD
REM ============================================================================

echo.
echo ========================================
echo   REDÉMARRAGE DES SERVEURS
echo ========================================
echo.

REM Vérifier si PowerShell est disponible
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: PowerShell n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

REM Exécuter le script PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0restart_servers.ps1"

echo.
pause

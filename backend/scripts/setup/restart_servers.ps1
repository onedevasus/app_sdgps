# ============================================================================
# Script de Redémarrage Automatique des Serveurs
# ============================================================================
# Description : Détecte et redémarre automatiquement les serveurs Django 
#               (backend) et Angular (frontend) s'ils sont en cours d'exécution
# Usage       : .\backend\scripts\setup\restart_servers.ps1
# ============================================================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   REDÉMARRAGE AUTOMATIQUE DES SERVEURS                    ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$backendPort = 8000
$frontendPort = 4200
$backendPath = Join-Path $PSScriptRoot "..\..\"
$frontendPath = Join-Path $PSScriptRoot "..\..\..\frontend"

# Fonction pour vérifier si un port est utilisé
function Test-PortInUse {
    param([int]$Port)
    
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return ($null -ne $connections)
}

# Fonction pour arrêter un processus sur un port spécifique
function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)
    
    Write-Host "🔍 Vérification du port $Port..." -ForegroundColor Yellow
    
    if (Test-PortInUse -Port $Port) {
        Write-Host "⚠️  Port $Port déjà utilisé. Arrêt du service..." -ForegroundColor Yellow
        
        try {
            # Trouver le processus utilisant le port
            $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
            
            if ($connection) {
                $processId = $connection.OwningProcess
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                
                if ($process) {
                    Write-Host "   → Processus trouvé: $($process.ProcessName) (PID: $processId)" -ForegroundColor Gray
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                    
                    # Vérifier que le processus est bien arrêté
                    if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
                        Write-Host "   ⚠️  Forçage de l'arrêt..." -ForegroundColor Yellow
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds 1
                    }
                    
                    Write-Host "   ✅ $ServiceName arrêté avec succès" -ForegroundColor Green
                }
            }
        }
        catch {
            Write-Host "   ❌ Erreur lors de l'arrêt: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "   ✅ Port $Port libre" -ForegroundColor Green
    }
}

# Fonction pour fermer les anciennes fenêtres PowerShell des serveurs
function Close-OldPowerShellWindows {
    Write-Host "🧹 Nettoyage des anciennes fenêtres PowerShell..." -ForegroundColor Yellow
    
    try {
        # Trouver TOUS les processus powershell sauf celui-ci
        $currentPid = $PID
        $allPowerShells = Get-Process | Where-Object {
            $_.ProcessName -eq 'powershell' -and 
            $_.Id -ne $currentPid -and
            $_.MainWindowHandle -ne 0  # Seulement les processus avec fenêtre visible
        }
        
        if ($allPowerShells) {
            Write-Host "   → Fermeture de $($allPowerShells.Count) ancienne(s) fenêtre(s) PowerShell..." -ForegroundColor Gray
            foreach ($proc in $allPowerShells) {
                Write-Host "      - PID: $($proc.Id) | Titre: '$($proc.MainWindowTitle)'" -ForegroundColor Gray
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 2
            Write-Host "   ✅ Anciennes fenêtres fermées" -ForegroundColor Green
        }
        else {
            Write-Host "   ✅ Aucune ancienne fenêtre PowerShell trouvée" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "   ⚠️  Impossible de fermer les anciennes fenêtres (continuation...)" -ForegroundColor Yellow
    }
}

# Étape 1: Arrêter les serveurs existants
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 ÉTAPE 1/3: Arrêt des serveurs existants" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Stop-ProcessOnPort -Port $backendPort -ServiceName "Backend (Django)"
Stop-ProcessOnPort -Port $frontendPort -ServiceName "Frontend (Angular)"

Start-Sleep -Seconds 2

# Fermer les anciennes fenêtres PowerShell
Close-OldPowerShellWindows

Start-Sleep -Seconds 1

# Étape 2: Redémarrer le Backend (Django)
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 ÉTAPE 2/3: Démarrage du Backend (Django)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $backendPath) {
    Write-Host "🚀 Lancement du serveur Django sur le port $backendPort..." -ForegroundColor Yellow
    Write-Host "   Chemin: $backendPath" -ForegroundColor Gray
    Write-Host ""
    
    # Démarrer Django dans une nouvelle fenêtre PowerShell avec titre
    $djangoCommand = "cd '$backendPath'; `$Host.UI.RawUI.WindowTitle = 'SDGPS - Backend (Django)'; python manage.py runserver $backendPort"
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $djangoCommand -WindowStyle Normal
    
    Write-Host "   ✅ Serveur Django lancé dans une nouvelle fenêtre" -ForegroundColor Green
    Write-Host "   📝 Attente de l'initialisation..." -ForegroundColor Gray
    
    # Attendre que le serveur démarre
    Start-Sleep -Seconds 5
    
    # Vérifier si le serveur est accessible
    $maxRetries = 6
    $retryCount = 0
    $serverReady = $false
    
    while ($retryCount -lt $maxRetries -and -not $serverReady) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$backendPort" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404) {
                $serverReady = $true
            }
        }
        catch {
            # Serveur pas encore prêt
        }
        
        if (-not $serverReady) {
            $retryCount++
            Write-Host "   ⏳ Tentative $retryCount/$maxRetries..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    
    if ($serverReady) {
        Write-Host "   ✅ Backend prêt et accessible !" -ForegroundColor Green
    }
    else {
        Write-Host "   ⚠️  Backend démarré mais pas encore vérifiable (vérifiez la fenêtre Django)" -ForegroundColor Yellow
    }
}
else {
    Write-Host "   ❌ Dossier backend non trouvé: $backendPath" -ForegroundColor Red
}

# Étape 3: Redémarrer le Frontend (Angular)
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 ÉTAPE 3/3: Démarrage du Frontend (Angular)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $frontendPath) {
    Write-Host "🚀 Lancement du serveur Angular sur le port $frontendPort..." -ForegroundColor Yellow
    Write-Host "   Chemin: $frontendPath" -ForegroundColor Gray
    Write-Host ""
    
    # Démarrer Angular dans une nouvelle fenêtre PowerShell avec titre
    $angularCommand = "cd '$frontendPath'; `$Host.UI.RawUI.WindowTitle = 'SDGPS - Frontend (Angular)'; npm start"
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $angularCommand -WindowStyle Normal
    
    Write-Host "   ✅ Serveur Angular lancé dans une nouvelle fenêtre" -ForegroundColor Green
    Write-Host "   📝 Compilation en cours (cela peut prendre quelques secondes)..." -ForegroundColor Gray
    
    # Angular prend plus de temps à démarrer
    Start-Sleep -Seconds 10
    
    Write-Host ""
    Write-Host "   💡 Le serveur Angular compile... Patientez jusqu'à voir:" -ForegroundColor Cyan
    Write-Host "      '✔ Browser application bundle generation complete.'" -ForegroundColor Gray
}
else {
    Write-Host "   ❌ Dossier frontend non trouvé: $frontendPath" -ForegroundColor Red
}

# Résumé final
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ REDÉMARRAGE TERMINÉ" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 État des serveurs :" -ForegroundColor Cyan
Write-Host ""
Write-Host "   🔹 Backend (Django)  : http://localhost:$backendPort" -ForegroundColor White
Write-Host "   🔹 Frontend (Angular): http://localhost:$frontendPort" -ForegroundColor White
Write-Host ""
Write-Host "💡 Conseils :" -ForegroundColor Yellow
Write-Host "   • Deux fenêtres PowerShell ont été ouvertes avec titres clairs" -ForegroundColor Gray
Write-Host "   • Fenêtre 1: SDGPS - Backend (Django)" -ForegroundColor Gray
Write-Host "   • Fenêtre 2: SDGPS - Frontend (Angular)" -ForegroundColor Gray
Write-Host "   • Attendez que Angular termine la compilation" -ForegroundColor Gray
Write-Host "   • Pour arrêter les serveurs, fermez les deux fenêtres" -ForegroundColor Gray
Write-Host "   • Utilisez ce script à chaque modification du code" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Ouvrez votre navigateur :" -ForegroundColor Cyan
Write-Host "   → http://localhost:$frontendPort/auth/register" -ForegroundColor Green
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   Serveurs prêts ! Bon développement ! 🚀                ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

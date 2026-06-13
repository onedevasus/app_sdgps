# Script optimisé et complet pour SDGPS
# Détecte automatiquement l'état du système et effectue les actions nécessaires
# Emplacement: backend/scripts/setup/run.ps1

$ErrorActionPreference = "Continue"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SDGPS - Installation & Configuration" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# Navigation vers le dossier racine du projet
# ============================================
# Le script est dans backend/scripts/setup/, donc on remonte de 3 niveaux
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $scriptPath))

Write-Host "[INFO] Dossier projet: $projectRoot" -ForegroundColor Gray
Set-Location $projectRoot

# Nettoyer le PATH de QGIS pour éviter les conflits SQLite
Write-Host "[INFO] Optimisation du PATH..." -ForegroundColor Gray
$env:PATH = ($env:PATH -split ';' | Where-Object { 
    $_ -notlike '*QGIS*' -and 
    $_ -notlike '*qgis*' 
}) -join ';'

# Fonction utilitaire pour afficher les étapes
function Write-Step {
    param([string]$Message, [int]$Step, [int]$Total)
    Write-Host ""
    Write-Host "[$Step/$Total] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# ============================================
# ÉTAPE 1: Vérifications préliminaires
# ============================================
Write-Step "Vérification des prérequis" 1 8

$pythonFound = $false
$nodeFound = $false

try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python") {
        Write-Success "Python trouvé: $pythonVersion"
        $pythonFound = $true
    }
} catch {
    Write-Error-Custom "Python non trouvé"
}

try {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match "v") {
        Write-Success "Node.js trouvé: $nodeVersion"
        $nodeFound = $true
    }
} catch {
    Write-Error-Custom "Node.js non trouvé"
}

if (-not $pythonFound -or -not $nodeFound) {
    Write-Host ""
    Write-Host "ERREUR: Python et/ou Node.js sont requis." -ForegroundColor Red
    Write-Host "Installez-les avant de continuer." -ForegroundColor Red
    exit 1
}

# ============================================
# ÉTAPE 2: Configuration du backend
# ============================================
Write-Step "Configuration du backend Django" 2 8

Set-Location backend

# Vérifier si les dépendances sont déjà installées
$depsInstalled = $true
try {
    python -c "import django; import rest_framework; import corsheaders" 2>$null
    if ($LASTEXITCODE -ne 0) {
        $depsInstalled = $false
    }
} catch {
    $depsInstalled = $false
}

if (-not $depsInstalled) {
    Write-Host "Installation des dépendances Python..." -ForegroundColor Gray
    python -m pip install --quiet -r requirements.txt
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dépendances backend installées"
    } else {
        Write-Error-Custom "Échec installation dépendances backend"
        exit 1
    }
} else {
    Write-Success "Dépendances backend déjà installées"
}

# ============================================
# ÉTAPE 3: Gestion de la base de données
# ============================================
Write-Step "Vérification de la base de données" 3 8

$dbExists = Test-Path db.sqlite3
$migrationsApplied = $false

if ($dbExists) {
    # Vérifier si les migrations accounts sont appliquées
    try {
        $result = python manage.py showmigrations accounts 2>&1
        if ($result -match "\[X\].*0001_initial") {
            $migrationsApplied = $true
            Write-Success "Base de données configurée"
        }
    } catch {
        $migrationsApplied = $false
    }
}

if (-not $migrationsApplied) {
    Write-Host "Initialisation de la base de données..." -ForegroundColor Gray
    
    # Supprimer l'ancienne base si elle existe
    if ($dbExists) {
        Write-Host "  Suppression de l'ancienne base..." -ForegroundColor Gray
        Remove-Item db.sqlite3 -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    
    # Nettoyer le cache Python
    Get-ChildItem -Recurse -Directory -Filter "__pycache__" | 
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    
    # Créer les migrations
    Write-Host "  Création des migrations..." -ForegroundColor Gray
    python manage.py makemigrations accounts --noinput
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Échec création des migrations"
        exit 1
    }
    
    # Appliquer toutes les migrations
    Write-Host "  Application des migrations..." -ForegroundColor Gray
    python manage.py migrate --noinput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Base de données initialisée avec succès"
        Write-Success "Super admin créé (voir credentials ci-dessus)"
    } else {
        Write-Error-Custom "Échec de l'initialisation de la base"
        Write-Host "" 
        Write-Host "Détails de l'erreur :" -ForegroundColor Yellow
        Write-Host "Exécutez manuellement pour voir l'erreur complète :" -ForegroundColor Gray
        Write-Host "  cd backend" -ForegroundColor White
        Write-Host "  python manage.py migrate" -ForegroundColor White
        Write-Host ""
        exit 1
    }
}

# ============================================
# ÉTAPE 4: Configuration du frontend
# ============================================
Write-Step "Configuration du frontend Angular" 4 8

Set-Location ..\frontend

# Vérifier si node_modules existe
$nodeModulesExists = Test-Path node_modules

if (-not $nodeModulesExists) {
    Write-Host "Installation des dépendances npm (cela peut prendre quelques minutes)..." -ForegroundColor Gray
    npm install --legacy-peer-deps --silent
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dépendances frontend installées"
    } else {
        Write-Error-Custom "Échec installation dépendances frontend"
        exit 1
    }
} else {
    # Vérifier si package-lock.json existe (indique une install complète)
    $lockExists = Test-Path package-lock.json
    if ($lockExists) {
        Write-Success "Dépendances frontend déjà installées"
    } else {
        Write-Host "Réinstallation des dépendances npm..." -ForegroundColor Gray
        npm install --legacy-peer-deps --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dépendances frontend installées"
        } else {
            Write-Error-Custom "Échec installation dépendances frontend"
            exit 1
        }
    }
}

# ============================================
# ÉTAPE 5: Vérifications finales
# ============================================
Write-Step "Vérifications finales" 5 8

# Tester SQLite
try {
    Set-Location ..\backend
    $sqliteTest = python -c "import sqlite3; print('OK')" 2>&1
    if ($sqliteTest -like "*OK*") {
        Write-Success "SQLite fonctionne correctement"
    } else {
        Write-Host "⚠ SQLite: $sqliteTest" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Impossible de tester SQLite" -ForegroundColor Yellow
}

# Tester Django
try {
    python manage.py check --deploy 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Configuration Django valide"
    }
} catch {
    Write-Host "⚠ Vérification Django échouée" -ForegroundColor Yellow
}

Set-Location ..

# ============================================
# ÉTAPE 6: Résumé et instructions
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ✓ Installation terminée avec succès!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  Démarrer le BACKEND (Terminal 1):" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   python manage.py runserver" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣  Démarrer le FRONTEND (Terminal 2):" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣  Tester l'application:" -ForegroundColor Yellow
Write-Host "   🌐 http://localhost:4200/auth/register" -ForegroundColor Cyan
Write-Host ""

Write-Host "💡 Astuces:" -ForegroundColor Cyan
Write-Host "   • Backend: http://localhost:8000/api/auth/register/" -ForegroundColor Gray
Write-Host "   • Pour reset la DB: supprimez backend/db.sqlite3 et relancez ce script" -ForegroundColor Gray
Write-Host "   • Logs backend visibles dans Terminal 1" -ForegroundColor Gray
Write-Host "   • Logs frontend visibles dans Terminal 2 + console navigateur (F12)" -ForegroundColor Gray
Write-Host ""

Write-Host "Appuyez sur une touche pour ouvrir le navigateur..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Ouvrir le navigateur (optionnel)
try {
    Start-Process "http://localhost:4200/auth/register"
} catch {
    # Ignorer si échec
}

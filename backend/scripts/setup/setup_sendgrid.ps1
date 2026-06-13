# Script de configuration SendGrid
Write-Host "📧 Configuration de SendGrid pour l'envoi d'emails" -ForegroundColor Cyan
Write-Host ""

# Vérifier si le fichier .env existe
$envFile = "backend\.env"

if (Test-Path $envFile) {
    Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green
} else {
    Write-Host "❌ Fichier .env non trouvé. Création..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" -Destination $envFile
    Write-Host "✅ Fichier .env créé depuis .env.example" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  INSTRUCTIONS DE CONFIGURATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  CRÉER UN COMPTE SENDGRID" -ForegroundColor Yellow
Write-Host "   → Allez sur: https://sendgrid.com" -ForegroundColor White
Write-Host "   → Cliquez sur 'Start for Free'" -ForegroundColor White
Write-Host "   → Complétez l'inscription" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣  GÉNÉRER UNE CLÉ API" -ForegroundColor Yellow
Write-Host "   → Connectez-vous à: https://app.sendgrid.com" -ForegroundColor White
Write-Host "   → Settings → API Keys" -ForegroundColor White
Write-Host "   → Create API Key" -ForegroundColor White
Write-Host "   → Nom: SDGPS Production" -ForegroundColor White
Write-Host "   → Permissions: Full Access ou Mail Send" -ForegroundColor White
Write-Host "   → Copiez la clé (commence par SG.)" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣  CONFIGURER LE FICHIER .env" -ForegroundColor Yellow
Write-Host "   → Ouvrez: backend\.env" -ForegroundColor White
Write-Host "   → Remplacez SENDGRID_API_KEY par votre vraie clé" -ForegroundColor White
Write-Host ""

Write-Host "4️⃣  INSTALLER LES DÉPENDANCES" -ForegroundColor Yellow
Write-Host ""

$install = Read-Host "Voulez-vous installer les dépendances maintenant? (o/n)"

if ($install -eq "o" -or $install -eq "O") {
    Write-Host ""
    Write-Host "Installation des dépendances Python..." -ForegroundColor Cyan
    
    Set-Location backend
    
    python -m pip install sendgrid python-decouple
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dépendances installées avec succès!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'installation" -ForegroundColor Red
    }
    
    Set-Location ..
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TEST DE LA CONFIGURATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Pour tester l'envoi d'email :" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Créez un utilisateur avec un email valide" -ForegroundColor White
Write-Host "2. Allez sur: http://localhost:4200/auth/forgot-password" -ForegroundColor White
Write-Host "3. Entrez l'email de l'utilisateur" -ForegroundColor White
Write-Host "4. Vérifiez votre boîte de réception" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "   - Les premiers emails peuvent aller dans les SPAMS" -ForegroundColor White
Write-Host "   - Vérifiez aussi le dossier spam/courrier indésirable" -ForegroundColor White
Write-Host ""

Write-Host "📖 Documentation complète:" -ForegroundColor Cyan
Write-Host "   → CONFIGURATION_SENDGRID.md" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Configuration terminée!" -ForegroundColor Green
Write-Host ""

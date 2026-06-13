Je # 🛠️ Scripts - SDGPS

Ce dossier contient tous les scripts utilitaires du projet.

## 📁 Structure

### `setup/` - Scripts d'Installation et Configuration
Scripts pour installer, configurer et gérer l'application :

- **run.ps1** - Script principal intelligent (recommandé)
  - Détecte automatiquement les dépendances installées
  - Installe uniquement ce qui manque
  - Configure la base de données
  - Affiche les instructions de démarrage
  
- **restart_servers.ps1** - Redémarrage automatique des serveurs ⭐
  - Détecte et arrête les serveurs en cours d'exécution
  - Redémarre backend (Django) et frontend (Angular)
  - Ouvre deux nouvelles fenêtres PowerShell
  - Vérifie que les serveurs sont accessibles
  
- **restart_servers.bat** - Version batch du redémarrage
  - Double-cliquez pour exécuter (Windows)
  - Wrapper pour restart_servers.ps1
  
- **setup_sendgrid.ps1** - Configuration SendGrid
  - Guide interactif pour configurer l'envoi d'emails
  - Installe les dépendances nécessaires
  - Vérifie la configuration
  
- **install_and_run.bat** - Alternative Windows (batch)
  - Version batch pour anciens systèmes Windows

### `test/` - Scripts de Test
Scripts pour tester différentes fonctionnalités :

- **test_api_key.py** - Test de clé API SendGrid
  - Valide qu'une clé API est correcte
  - Affiche les informations du compte
  - Diagnostique les erreurs d'authentification
  
- **test_sendgrid.py** - Test d'envoi d'email
  - Envoie un email test
  - Vérifie la configuration complète
  - Utile pour le debugging

## 🚀 Utilisation

### Script Principal (Première Installation)

```powershell
.\backend\scripts\setup\run.ps1
```

Ce script peut être exécuté à tout moment, il est idempotent et safe.

### Redémarrage des Serveurs (Après Modifications) ⭐

**Option 1 : PowerShell (Recommandé)**
```powershell
.\backend\scripts\setup\restart_servers.ps1
```

**Option 2 : Batch (Double-clic)**
```
Double-cliquez sur restart_servers.bat
```

**Ce que fait le script :**
1. ✅ Détecte les serveurs en cours d'exécution
2. ✅ Les arrête proprement
3. ✅ Redémarre backend (Django port 8000)
4. ✅ Redémarre frontend (Angular port 4200)
5. ✅ Vérifie que tout fonctionne
6. ✅ Ouvre deux fenêtres de terminal

### Configuration Email

```powershell
.\backend\scripts\setup\setup_sendgrid.ps1
```

### Tests

```powershell
cd backend\scripts\test
python test_api_key.py      # Tester la clé API
python test_sendgrid.py     # Tester l'envoi d'email
```

## ➕ Ajouter de Nouveaux Scripts

### Conventions de Nommage

- **Scripts PowerShell** : `nom_script.ps1`
- **Scripts Python** : `test_nom_fonctionnalite.py`
- **Scripts Batch** : `nom_script.bat` (si nécessaire)

### Emplacement

- **Installation/Configuration** → `setup/`
- **Tests** → `test/`
- **Déploiement** → `deploy/` (à créer si besoin)
- **Maintenance** → `maintenance/` (à créer si besoin)

### Exemples

Pour une nouvelle fonctionnalité "Export PDF" :

```
backend/scripts/
├── setup/setup_pdf_library.ps1      # Installation
└── test/test_pdf_export.py          # Test
```

Pour un script de déploiement :

```
backend/scripts/
└── deploy/deploy_production.ps1     # Déploiement
```

## 📝 Bonnes Pratiques

1. **Un script = Une tâche** : Chaque script doit faire une chose spécifique
2. **Documentation** : Ajoutez des commentaires dans le script
3. **Feedback utilisateur** : Affichez des messages clairs sur la progression
4. **Gestion d'erreurs** : Gérez les cas d'erreur gracieusement
5. **Idempotent** : Le script doit pouvoir être relancé sans effet secondaire

## 🔧 Maintenance

- Supprimez les scripts obsolètes
- Mettez à jour la documentation quand un script change
- Testez les scripts après modification
- Versionnez les scripts importants

---

**💡 Astuce** : Utilisez `run.ps1` comme point d'entrée principal pour les nouveaux développeurs !

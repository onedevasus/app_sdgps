# Plan de Développement — Application SDGPS

> **SDGPS** : Système de Génération de Documents et Pièces
> **Version** : 1.0
> **Dernière mise à jour** : Juin 2026

---



---





























































## Sommaire

- [Plan de Développement — Application SDGPS](#plan-de-développement-application-sdgps)
  - [1. Introduction](#1-introduction)
    - [1.1 Stack technologique](#11-stack-technologique)
    - [1.2 Architecture applicative](#12-architecture-applicative)
    - [1.3 Conventions](#13-conventions)
  - [2. Workflow Git](#2-workflow-git)
    - [2.1 Compte Git du projet](#21-compte-git-du-projet)
    - [2.2 Branches](#22-branches)
    - [2.3 Cycle de développement](#23-cycle-de-développement)
    - [2.4 Conventions de commit](#24-conventions-de-commit)
  - [3. Protection contre la perte de données (Workspace Reset)](#3-protection-contre-la-perte-de-données-workspace-reset)
    - [3.1 Problématique](#31-problématique)
    - [3.2 Solutions mises en place](#32-solutions-mises-en-place)
      - [Couche 1 — Instructions OpenCode (agent)](#couche-1-instructions-opencode-agent)
      - [Couche 2 — Git hook pre-checkout](#couche-2-git-hook-pre-checkout)
      - [Couche 3 — Auto-save watcher (arrière-plan) — **Solution recommandée**](#couche-3-auto-save-watcher-arrière-plan-solution-recommandée)
    - [3.3 Résumé des risques couverts](#33-résumé-des-risques-couverts)
    - [3.4 Recommandation](#34-recommandation)
  - [4. Phases de développement](#4-phases-de-développement)
  - [5. Phase 3 — Gestion des Utilisateurs](#5-phase-3-gestion-des-utilisateurs)
    - [5.1 Définition](#51-définition)
    - [5.2 Modèle de données](#52-modèle-de-données)
      - [5.2.1 Rôles — mapping CPS → schéma](#521-rôles-mapping-cps-schéma)
      - [5.2.2 Migration des rôles existants](#522-migration-des-rôles-existants)
      - [5.2.3 Champs ajoutés à `CustomUser`](#523-champs-ajoutés-à-customuser)
      - [5.2.4 Champs ajoutés à `Membership`](#524-champs-ajoutés-à-membership)
    - [5.3 Matrice des permissions RBAC](#53-matrice-des-permissions-rbac)
    - [5.4 API Endpoints](#54-api-endpoints)
      - [Règles de filtrage backend](#règles-de-filtrage-backend)
    - [5.5 Composants frontend](#55-composants-frontend)
      - [5.5.1 Architecture des fichiers](#551-architecture-des-fichiers)
      - [5.5.2 UserListComponent](#552-userlistcomponent)
      - [5.5.3 UserDetailComponent](#553-userdetailcomponent)
      - [5.5.4 RolesPermissionsComponent](#554-rolespermissionscomponent)
    - [5.6 Mise à jour du routeur et du menu](#56-mise-à-jour-du-routeur-et-du-menu)
      - [5.6.1 Routes à ajouter](#561-routes-à-ajouter)
    - [5.7 Tâches d'implémentation](#57-tâches-dimplémentation)
      - [Phase 3.1 — Backend : Modèle et migration](#phase-31-backend-modèle-et-migration)
      - [Phase 3.2 — Backend : API endpoints](#phase-32-backend-api-endpoints)
      - [Phase 3.3 — Frontend : Service et modèle](#phase-33-frontend-service-et-modèle)
      - [Phase 3.4 — Frontend : UserListComponent](#phase-34-frontend-userlistcomponent)
      - [Phase 3.5 — Frontend : UserDetailComponent](#phase-35-frontend-userdetailcomponent)
      - [Phase 3.6 — Frontend : RolesPermissionsComponent](#phase-36-frontend-rolespermissionscomponent)
      - [Phase 3.7 — Configuration des routes](#phase-37-configuration-des-routes)
    - [5.8 Tests](#58-tests)
  - [6. Phase 5 — Domaine métier & saisie des données](#6-phase-5-domaine-métier-saisie-des-données)
    - [6.1 Définition](#61-définition)
    - [6.2 Modèle de données (nouvelle app Django `projects/`)](#62-modèle-de-données-nouvelle-app-django-projects)
      - [6.2.1 `Projet`](#621-projet)
      - [6.2.2 `Propriete`](#622-propriete)
      - [6.2.3 `Affaire` (sous-dossier d'affaire, « SD »)](#623-affaire-sous-dossier-daffaire-sd-)
      - [6.2.4 `Ssdgps` (sous-sous-dossier GPS)](#624-ssdgps-sous-sous-dossier-gps)
      - [6.2.5 `Session` (session d'observations GPS)](#625-session-session-dobservations-gps)
    - [6.3 API REST hiérarchique](#63-api-rest-hiérarchique)
    - [6.4 Frontend — navigation & formulaires dynamiques](#64-frontend-navigation-formulaires-dynamiques)
    - [6.5 Saisie & import des données des pièces](#65-saisie-import-des-données-des-pièces)
    - [6.6 Tests (Phase 5)](#66-tests-phase-5)
    - [6.7 État d'implémentation](#67-état-dimplémentation)
  - [7. Phase 6 — Pièces & génération de rapports PDF SSDGPS](#7-phase-6-pièces-génération-de-rapports-pdf-ssdgps)
    - [7.1 Définition](#71-définition)
    - [7.2 Catalogue des pièces](#72-catalogue-des-pièces)
    - [7.2.1 Structure réelle observée (exemples PDC/DDC/DLC)](#721-structure-réelle-observée-exemples-pdcddcdlc)
    - [7.3 Modèle de données (pièces & rapport)](#73-modèle-de-données-pièces-rapport)
    - [7.4 Cadre générique de pièces (« piece framework »)](#74-cadre-générique-de-pièces-piece-framework-)
    - [7.5 Report builder (UI)](#75-report-builder-ui)
    - [7.6 Génération PDF (WeasyPrint)](#76-génération-pdf-weasyprint)
    - [7.7 Livrables, historique & audit (F25/F26)](#77-livrables-historique-audit-f25f26)
    - [7.8 Tests (Phase 6)](#78-tests-phase-6)
  - [8. Phases ultérieures (aperçu)](#8-phases-ultérieures-aperçu)
    - [Phase 7 — Supervision & rapports consolidés (F01, F07, F09, F11, F16–F18)](#phase-7-supervision-rapports-consolidés-f01-f07-f09-f11-f16f18)
    - [Phase 8 — Invitations & fonctionnalités innovantes (F13, F28–F30)](#phase-8-invitations-fonctionnalités-innovantes-f13-f28f30)
  - [9. Glossaire](#9-glossaire)

## 1. Introduction

### 1.1 Stack technologique

| Couche | Technologie |
|--------|------------|
| Backend | Python / Django + Django REST Framework |
| Frontend | Angular 16+ |
| Base de données | SQL (relationnelle, via Docker) |
| Authentification | JWT (JSON Web Tokens) |
| Conteneurisation | Docker (backend uniquement) |
| Contrôle de version | Git |

### 1.2 Architecture applicative

- Architecture web deux couches (frontend / backend) communiquant via une API REST
- API sécurisée par token JWT avec expiration configurable
- Contrôle d'accès RBAC appliqué à chaque requête
- Base de données relationnelle avec migrations Django
- Backend conteneurisé (Docker) ; frontment servi via Angular CLI

### 1.3 Conventions

- Interface utilisateur en français
- API RESTful
- Soft-delete pour les données critiques (organisations, utilisateurs)
- RBAC avec 3 profils : ROLE_ADMIN_SYSTEME, ROLE_ORGANISATION_ADMIN, ROLE_ORGANISATION_AGENT

---

## 2. Workflow Git

### 2.1 Compte Git du projet

| Champ | Valeur |
|-------|--------|
| Nom | `blmerio2022` |
| Email | `120096166+blmerio2022@users.noreply.github.com` |
| Dépôt distant | `https://github.com/blmerio2022/app_sdgps.git` |

### 2.2 Branches

| Branche | Usage | Protection |
|---------|-------|------------|
| `main` | Production — code stable livré | Merge depuis `develop` uniquement |
| `develop` | Intégration — code validé, point de départ des feature branches | Push direct autorisé |
| `feature/<nom>` | Développement d'une fonctionnalité (créée depuis `develop`) | Aucune |

### 2.3 Cycle de développement

```
develop
  │
  ├── git checkout -b feature/gestion-utilisateurs
  │       │
  │       │   Implémentation + tests
  │       │
  │       └── git checkout develop
  │           git merge feature/gestion-utilisateurs
  │           git push origin develop
  │
  ├── git checkout -b feature/<prochaine-fonctionnalite>
  │       ...
```

1. Créer une branche `feature/<nom>` depuis `develop`
2. Implémenter la fonctionnalité dans cette branche
3. Tester et valider
4. Fusionner (`merge`) dans `develop`
5. Pousser `develop` sur le dépôt distant
6. (Plus tard) Fusionner `develop` dans `main` pour une livraison

### 2.4 Conventions de commit

- Utiliser des messages en anglais, format conventionnel : `type(scope): message`
- Types : `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
- Exemple : `feat(users): add user CRUD API endpoints`

---

## 3. Protection contre la perte de données (Workspace Reset)

### 3.1 Problématique

**OpenCode** utilise un système interne de **snapshots** pour suivre les modifications de fichiers pendant une session. Lors d'un changement de mode (`plan` → `build` ou `build` → `plan`), OpenCode restaure le snapshot pris à l'entrée du mode précédent, ce qui **efface toutes les modifications non commitées** dans le working directory.

Ce mécanisme est propre à OpenCode — il n'utilise **pas** `git checkout` ni aucune commande git visible. Il agit directement sur le système de fichiers via son propre moteur de snapshots. Les hooks git standards (`pre-checkout`, `post-checkout`) ne sont donc **pas déclenchés** par ce reset.

**Conséquence :** tout travail non commité avant un changement de mode est définitivement perdu.

### 3.2 Solutions mises en place

Trois couches de protection, classées par fiabilité :

#### Couche 1 — Instructions OpenCode (agent)

**Fichier :** `.opencode/instructions.md` (projet) et `~/.config/opencode/instructions.md` (global)

Chargées au démarrage d'OpenCode via la config (`instructions` dans `opencode.json`), ces instructions ordonnent à l'agent IA de commit automatiquement après chaque feature ou bug fix terminé. Applicable à tous les projets via la config globale `~/.config/opencode/opencode.json`.

- ✅ Guide l'agent dans son comportement
- ⚠️ Dépend du modèle — l'agent peut "oublier" ou mal interpréter
- ⚠️ Inefficace contre le reset de mode (l'agent n'est pas actif pendant le switch)

#### Couche 2 — Git hook pre-checkout

**Fichier :** `.githooks/pre-checkout`

Activé par `git config core.hooksPath .githooks`. Se déclenche avant chaque `git checkout` / `git switch` et commit automatiquement les modifications non commitées (`git add -A && git commit -m "wip: auto-save before checkout"`).

- ✅ Protège contre les switchs de branche manuels
- ❌ **Ne protège PAS contre le reset OpenCode** (qui ne passe pas par git)
- ✅ Protection utile pour les opérations git hors OpenCode

#### Couche 3 — Auto-save watcher (arrière-plan) — **Solution recommandée**

**Fichier :** `docs/scripts/auto-save-watcher.ps1`

Script PowerShell qui tourne en arrière-plan et vérifie toutes les 30 secondes la présence de fichiers modifiés non commités. Si détection, il commit automatiquement (`git add -A --ignore-errors && git commit -m "wip: auto-save [timestamp]"`).

```powershell
# Lancer le watcher
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -File `"$pwd\docs\scripts\auto-save-watcher.ps1`""

# Vérifier s'il tourne
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object CommandLine -match 'auto-save-watcher'

# Arrêter le watcher
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object CommandLine -match 'auto-save-watcher' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# Voir l'historique des commits auto-save
git log --oneline --grep="wip: auto-save" --max-count=20
```

- ✅ **Protège contre tout scénario** : reset OpenCode, crash, oubli de l'agent, fermeture inattendue
- ✅ Indépendant du modèle IA et du mécanisme de snapshot OpenCode
- ⚠️ Crée des commits "wip" fréquents — à squasher avant merge dans `develop`
- ⚠️ Disparaît à la fermeture du terminal — doit être relancé manuellement ou au démarrage Windows

### 3.3 Résumé des risques couverts

| Scénario | Couche 1 (Instructions) | Couche 2 (pre-checkout) | Couche 3 (Watcher) |
|----------|:---:|:---:|:---:|
| Agent oublie de commit | ✅ | ❌ | ✅ |
| Reset OpenCode (plan→build) | ❌ | ❌ | ✅ |
| `git checkout` manuel | ❌ | ✅ | ✅ |
| Crash / fermeture brutale | ❌ | ❌ | ✅ |

### 3.4 Recommandation

Lancer le watcher dès le début de chaque session de travail :

```powershell
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -File `"$pwd\docs\scripts\auto-save-watcher.ps1`""
```

Pour le rendre permanent, ajouter cette commande au démarrage de Windows (via le registre `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` ou le dossier `shell:startup`).

---

## 4. Phases de développement

| Phase | Fonctionnalité | Statut |
|-------|---------------|--------|
| 1 | Fondations (git, CPS, Docker, scripts) | ✅ Terminé |
| 2 | Gestion des organisations (CRUD, tableau, filtres) | ✅ Terminé |
| 3 | Gestion des utilisateurs (RBAC, tableau, protections) | ✅ Terminé |
| **5** | **Domaine métier : hiérarchie Projet→Propriété→Affaire→SSDGPS→Session + saisie/import (F19–F21)** | **🚧 Backend + Frontend faits · Import (6.5) à venir** |
| 6 | Pièces & génération de rapports PDF SSDGPS via WeasyPrint (F22–F26) | 📅 À venir |
| 7 | Supervision & rapports consolidés (F01, F07, F09, F11, F16–F18) | 📅 Aperçu |
| 8 | Invitations des agents (F13) + fonctionnalités innovantes (F28–F30) | 📅 Aperçu |

> **Note de renumérotation** : l'ancienne « Phase 4 — Invitations des agents (F13) » est
> déplacée en Phase 8 (regroupée avec les fonctionnalités innovantes). Les Phases 5 et 6
> ci-dessous constituent le cœur métier de l'application (génération des rapports SSDGPS).

---

## 5. Phase 3 — Gestion des Utilisateurs

### 5.1 Définition

Implémenter la gestion complète des utilisateurs de la plateforme conformément aux spécifications F05 et F12 du CPS, avec un contrôle d'accès strict basé sur les trois profils définis.

### 5.2 Modèle de données

#### 5.2.1 Rôles — mapping CPS → schéma

| Profil CPS | Implémentation |
|---|---|
| `ROLE_ADMIN_SYSTEME` | `CustomUser.is_superuser = True` (pas de Membership associé) |
| `ROLE_ORGANISATION_ADMIN` | `Membership.role = 'ROLE_ORGANISATION_ADMIN'` |
| `ROLE_ORGANISATION_AGENT` | `Membership.role = 'ROLE_ORGANISATION_AGENT'` |

#### 5.2.2 Migration des rôles existants

Les valeurs actuelles de `Membership.role` sont migrées comme suit :

| Ancienne valeur | Nouvelle valeur |
|----------------|----------------|
| `OWNER` | `ROLE_ORGANISATION_ADMIN` |
| `ADMIN` | `ROLE_ORGANISATION_ADMIN` |
| `MANAGER` | `ROLE_ORGANISATION_AGENT` |
| `USER` | `ROLE_ORGANISATION_AGENT` |

#### 5.2.3 Champs ajoutés à `CustomUser`

- Aucun champ nouveau nécessaire à ce stade (les champs existants `first_name`, `last_name`, `email`, `is_active`, `is_superuser`, `is_deleted` couvrent les besoins)

#### 5.2.4 Champs ajoutés à `Membership`

- Aucun champ nouveau — seul le choix `role` est modifié (nouvelles valeurs)

### 5.3 Matrice des permissions RBAC

| Action | `ROLE_ADMIN_SYSTEME` | `ROLE_ORGANISATION_ADMIN` | `ROLE_ORGANISATION_AGENT` |
|--------|:---:|:---:|:---:|
| Lister les utilisateurs | Tous | Agents de son organisation | ❌ |
| Voir un utilisateur | Tous | Agents de son organisation | ❌ |
| Créer un utilisateur | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Modifier un utilisateur | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Supprimer (soft-delete) | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Désactiver/Activer | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Réinitialiser mot de passe | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Voir les rôles disponibles | ✅ | ✅ | ❌ |

### 5.4 API Endpoints

Tous les endpoints sont préfixés par `/api/v1/users/`.

| Méthode | Endpoint | Description | Permission minimale |
|---------|----------|-------------|:---:|
| `GET` | `/api/v1/users/` | Liste des utilisateurs (filtrée par rôle) | `ROLE_ORGANISATION_ADMIN` |
| `POST` | `/api/v1/users/` | Création d'un utilisateur (avec MDP temporaire) | `ROLE_ORGANISATION_ADMIN` |
| `GET` | `/api/v1/users/{id}/` | Détail d'un utilisateur | `ROLE_ORGANISATION_ADMIN` |
| `PUT` | `/api/v1/users/{id}/` | Modification d'un utilisateur | `ROLE_ORGANISATION_ADMIN` |
| `PATCH` | `/api/v1/users/{id}/` | Modification partielle | `ROLE_ORGANISATION_ADMIN` |
| `DELETE` | `/api/v1/users/{id}/` | Suppression logique (soft-delete) | `ROLE_ORGANISATION_ADMIN` |
| `POST` | `/api/v1/users/{id}/reset-password/` | Réinitialisation forcée du mot de passe | `ROLE_ORGANISATION_ADMIN` |
| `POST` | `/api/v1/users/{id}/toggle-active/` | Activation/Désactivation | `ROLE_ORGANISATION_ADMIN` |
| `GET` | `/api/v1/users/roles/` | Liste des rôles disponibles | `ROLE_ORGANISATION_ADMIN` |

#### Règles de filtrage backend

- Un `ROLE_ORGANISATION_ADMIN` ne voit que les utilisateurs ayant un `Membership` dans sa (ses) organisation(s) avec le rôle `ROLE_ORGANISATION_AGENT`.
- Un `ROLE_ADMIN_SYSTEME` voit tous les utilisateurs de la plateforme.
- Les `ROLE_ORGANISATION_AGENT` n'ont pas accès à ces endpoints.

### 5.5 Composants frontend

#### 5.5.1 Architecture des fichiers

```
frontend/src/app/
├── core/
│   ├── models/
│   │   └── user.model.ts                 # Interface User et types associés
│   ├── services/
│   │   └── user.service.ts               # Service CRUD utilisateurs (calqué sur OrganizationService)
│   └── guards/
│       └── admin.guard.ts                # Mise à jour : décoder le rôle depuis le token
└── features/
    └── admin/
        └── users/
            ├── user-list/
            │   ├── user-list.component.ts
            │   ├── user-list.component.html
            │   └── user-list.component.scss
            ├── user-detail/
            │   ├── user-detail.component.ts
            │   ├── user-detail.component.html
            │   └── user-detail.component.scss
            └── roles-permissions/
                ├── roles-permissions.component.ts
                ├── roles-permissions.component.html
                └── roles-permissions.component.scss
```

#### 5.5.2 UserListComponent

Page `/admin/utilisateurs/liste` — reprend le patron de `OrganizationListComponent` :

- **En-tête** : titre + bouton "Ajouter un utilisateur" (visible selon permissions)
- **Filtres** : par rôle (`ROLE_ORGANISATION_ADMIN`, `ROLE_ORGANISATION_AGENT`), par statut (actif/inactif/supprimé), par organisation (ROLE_ADMIN_SYSTEME uniquement)
- **Tableau** :
  - Colonnes : nom complet, email, rôle, organisation, statut (badge), date de création, dernière connexion, actions
  - Checkbox avec sélection multiple
  - Tri par colonne
  - Pagination (5, 10, 25, 50)
  - Actions sticky, hover/selection styling
- **Modale d'ajout** : nom, prénom, email, rôle, organisation (liste déroulante), mot de passe temporaire + checkbox "forcer changement au premier login"
- **Modale d'édition** : nom, prénom, email (read-only après création), rôle, statut
- **Modale détail** : lecture seule avec toutes les infos + historique
- **Confirmation suppression** : soft-delete avec message
- **Menu contextuel** (clic droit) : voir détails, modifier, supprimer, réinitialiser MDP

#### 5.5.3 UserDetailComponent

Formulaire complet avec sections :

1. **Informations personnelles** : nom, prénom, email (read-only), organisation
2. **Rôle & Permissions** : rôle actuel (sélecteur), affichage des droits associés
3. **Statut & Sécurité** : booléen actif/inactif, date dernière connexion, date changement MDP
4. **Actions administratives** : bouton "Réinitialiser le mot de passe" (génère un MDP temporaire + option "forcer changement"), bouton "Désactiver/Activer" avec confirmation

#### 5.5.4 RolesPermissionsComponent

Page `/admin/utilisateurs/roles` — page d'information et de gestion :

- **Cartes des rôles** : 3 profils (ROLE_ADMIN_SYSTEME, ROLE_ORGANISATION_ADMIN, ROLE_ORGANISATION_AGENT) avec description, permissions associées, nombre d'utilisateurs
- **Tableau récapitulatif** : matrice rôles × permissions (comme la section 5.3 ci-dessus)
- **Assignation** : possibilité de modifier le rôle d'un utilisateur directement depuis cette page

### 5.6 Mise à jour du routeur et du menu

#### 5.6.1 Routes à ajouter

Dans `app-routing.module.ts`, sous le path `admin` :

```typescript
{ path: 'utilisateurs', redirectTo: 'utilisateurs/liste', pathMatch: 'full' },
{ path: 'utilisateurs/liste', component: UserListComponent, data: { title: 'Liste des Utilisateurs' } },
{ path: 'utilisateurs/:id', component: UserDetailComponent, data: { title: 'Détail Utilisateur' } },
{ path: 'utilisateurs/roles', component: RolesPermissionsComponent, data: { title: 'Rôles & Permissions' } },
```

### 5.7 Tâches d'implémentation

#### Phase 3.1 — Backend : Modèle et migration

- Modifier les `ROLE_CHOICES` du modèle `Organization` : remplacer `OWNER`, `ADMIN`, `MANAGER`, `USER` par `ROLE_ORGANISATION_ADMIN`, `ROLE_ORGANISATION_AGENT`
- Créer une migration de données pour convertir les rôles existants
- Ajouter les champs `is_deleted` et `deleted_at` à `CustomUser` (soft-delete)
- Ajouter l'index `db_index` sur `email` et `is_deleted`

#### Phase 3.2 — Backend : API endpoints

- Créer `backend/users/` (nouvelle app Django) ou étendre `backend/accounts/views.py` avec :
  - `UserListView` (GET) — liste filtrée avec pagination
  - `UserCreateView` (POST) — création avec MDP temporaire
  - `UserDetailView` (GET/PUT/PATCH/DELETE) — CRUD complet
  - `UserResetPasswordView` (POST) — réinitialisation forcée
  - `UserToggleActiveView` (POST) — activation/désactivation
  - `RolesListView` (GET) — liste des rôles disponibles
- Implémenter la logique de filtrage RBAC (`get_queryset()`)
- Créer les sérialiseurs : `UserListSerializer`, `UserDetailSerializer`, `UserCreateSerializer`, `UserUpdateSerializer`, `RoleSerializer`
- Implémenter la génération de mot de passe temporaire (8-12 caractères, critères de complexité)
- Enregistrer les routes dans `backend/urls.py` sous `/api/v1/users/`

#### Phase 3.3 — Frontend : Service et modèle

- Créer `core/models/user.model.ts` : interface `User`, `UserRole`, `CreateUserPayload`
- Créer `core/services/user.service.ts` : méthodes CRUD + `resetPassword()`, `toggleActive()`, `getRoles()`
- Mettre à jour `core/guards/admin.guard.ts` pour refléter les nouveaux rôles

#### Phase 3.4 — Frontend : UserListComponent

- Créer le composant avec module dédié `features/admin/users/users.module.ts`
- Implémenter le tableau complet avec filtres, tri, pagination, sélection
- Implémenter les modales : ajout (avec MDP temporaire), édition, détail, suppression
- Implémenter le menu contextuel
- Styliser avec le design system de l'application

#### Phase 3.5 — Frontend : UserDetailComponent

- Créer le composant
- Formulaire avec sections (infos personnelles, rôle, statut, actions)
- Boutons d'actions administratives (reset MDP, activation/désactivation)

#### Phase 3.6 — Frontend : RolesPermissionsComponent

- Créer le composant d'information sur les rôles
- Cartes des profils avec description et permissions
- Matrice récapitulative rôles × permissions
- Assignation rapide de rôle

#### Phase 3.7 — Configuration des routes

- Mettre à jour `app-routing.module.ts` avec les nouvelles routes
- Mettre à jour le breadcrumb mapper si nécessaire

### 5.8 Tests

- Tests unitaires backend pour chaque endpoint (DRF `APITestCase`)
- Tests d'authentification et de permission (chaque endpoint testé avec chaque profil)
- Migration de données testée (anciens rôles → nouveaux rôles)
- Tests de validation des mots de passe temporaires

---

## 6. Phase 5 — Domaine métier & saisie des données

### 6.1 Définition

Implémenter le cœur métier de l'application : la hiérarchie
**Projet → Propriété → Affaire (SD) → SSDGPS → Session**, ainsi que la saisie et l'import des
données techniques qui alimenteront les pièces des rapports (F19, F20, F21 du CPS). Un
**SSDGPS** (sous-sous-dossier GPS) est l'unité pour laquelle un rapport de post-traitement
bureau des observations GPS est produit.

> **✅ Backend implémenté** (app `backend/projects/`) : 5 modèles + validations + API REST
> RBAC + tests (`projects/tests_domain.py`, 13 tests). **Frontend (6.4) à venir.**

**Décisions validées (clarifications) :**
- **Champs de `Projet`** : uniquement `code_projet` + `statut` (les champs région/commune,
  référence client, échéance ne sont **pas** retenus pour l'instant).
- **Visibilité agent** : un Agent voit **tous les projets de son organisation** (travail
  collaboratif), pas seulement les siens.
- **Numéros d'ordre** (`numero_sd_affaire`, `numero_ssdgps`, `numero_session`) : **saisie
  manuelle** avec **unicité au sein du parent** (contrainte d'unicité en base).
- **Sessions** : un SSDGPS `mono-session` reçoit **automatiquement** une session n°1 à la
  création (signal `post_save`) ; les `multi-session` gèrent leurs sessions manuellement.

### 6.2 Modèle de données (nouvelle app Django `projects/`)

Six entités, toutes avec suppression logique (`is_deleted`/`deleted_at`), horodatage
(`created_at`/`updated_at`), `created_by`, et clé primaire UUID — en réutilisant le patron de
`accounts/models.py` (managers, index). Le rattachement à l'organisation assure le scoping RBAC.

#### 6.2.1 `Projet`

| Champ | Type | Notes |
|-------|------|-------|
| `nom_projet` | CharField | Obligatoire |
| `description_projet` | TextField | Optionnel |
| `code_projet` | CharField unique, indexé | Identifiant court (obligatoire) |
| `organization` | FK → `Organization` (PROTECT) | **Scoping RBAC** (cabinet propriétaire) |
| `statut` | choices | `brouillon` (défaut), `en_cours`, `cloture`, `archive` |
| `created_by`, `created_at`, `updated_at`, `is_deleted`, `deleted_at` | — | Patron commun |

> Champs région/commune, référence client et échéance **écartés** pour l'instant (décision 6.1) ;
> réintroductibles ultérieurement si besoin.

#### 6.2.2 `Propriete`

- `nom_propriete` (propriété-dite) — obligatoire
- `id_requisition` — format `R<numéro>/<indice>` (indice : nombre 1–1000 **ou** 1–2 lettres majuscules), validé par regex
- `id_titre` — format `T<numéro>/<indice>` (même règle d'indice), validé par regex
- `projet` — FK → `Projet`
- **Règle** : au moins l'un de `id_requisition` / `id_titre` doit être renseigné

#### 6.2.3 `Affaire` (sous-dossier d'affaire, « SD »)

- `numero_sd_affaire` — numéro d'ordre dans la propriété mère
- `nature_procedure_affaire` — enum : `IFF`, `IFE`, `IFR`, `PS_FORET`, `PS_COLLECTIF`, `PS_EXPROPRIATION`, `AS`
- `nature_affaire` — enum **dépendant** de la procédure :

  | Procédure | Natures d'affaire autorisées |
  |-----------|------------------------------|
  | `IFF` | `BI` (bornage d'immatriculation), `BC` (bornage complémentaire) |
  | `IFE` | `IFE` |
  | `IFR` | `IFR` |
  | `PS_FORET` / `PS_COLLECTIF` / `PS_EXPROPRIATION` | `RB` (recollement de bornage) |
  | `AS` | `MEC`, `MT`, `FS`, `MT-FS`, `LOT`, `COP` |

- `date_bornage` — **conditionnel** : date de bornage pour `IFF`/`AS`, date de recollement pour `PS_*`, **non définie** (null) pour `IFE`/`IFR`
- `propriete` — FK → `Propriete`
- **Validation croisée** procédure ↔ nature ↔ date_bornage dans `Model.clean()` **et** dans le sérialiseur DRF

#### 6.2.4 `Ssdgps` (sous-sous-dossier GPS)

- `nature_ssdgps` — enum : `PDC/GPS` (projet de densification cadastrale), `DDC/GPS` (dossier de densification cadastrale), `PLC/GPS` (projet de levé cadastral), `DLC/GPS` (dossier de levé cadastral)
- `numero_ssdgps` — numéro d'ordre dans le SD d'affaire mère
- `type_ssdgps` — enum : `mono-session`, `multi-session`
- `affaire` — FK → `Affaire`

#### 6.2.5 `Session` (session d'observations GPS)

- `ssdgps` — FK → `Ssdgps`
- `numero_session`, `date_session`, métadonnées
- Un SSDGPS `multi-session` porte N sessions ; un SSDGPS `mono-session` porte une session
  (unique). Les pièces d'observations/déterminations sont rattachées à la **session** (voir Phase 6).

### 6.3 API REST hiérarchique

Endpoints sous `/api/v1/` : `projets/`, `proprietes/`, `affaires/`, `ssdgps/`, `sessions/`
(CRUD + endpoints imbriqués). **Filtrage RBAC** :

| Rôle | Portée |
|------|--------|
| `ROLE_ADMIN_SYSTEME` | Tous les projets |
| `ROLE_ORGANISATION_ADMIN` / `ROLE_ORGANISATION_AGENT` | Projets de leur organisation |

Chaque vue pose explicitement `IsAuthenticated` (rappel : le défaut DRF est `AllowAny`).
Sérialiseurs avec validations conditionnelles (natures, `date_bornage`, formats d'id).

### 6.4 Frontend — navigation & formulaires dynamiques

- Arbre de navigation Projet → Propriété → Affaire → SSDGPS → Session (composant arborescent +
  fil d'Ariane).
- Formulaires dynamiques : `nature_affaire` filtrée selon `nature_procedure_affaire` ;
  `date_bornage` affichée/masquée selon la procédure ; masques et validation des
  `id_requisition` / `id_titre`.
- Services Angular calqués sur `OrganizationService` / `UserService`.

### 6.5 Saisie & import des données des pièces

- Upload d'images (canevas, photos, rapports de consultation).
- Import CSV/Excel côté backend (`openpyxl` / `pandas`), mapping colonnes → champs.
- Saisie directe via formulaires structurés.
- Validation des fichiers importés (type, taille, contenu) — consigne de sécurité du CPS.
- Stockage : payload JSON structuré + fichiers (médias).

### 6.6 Tests (Phase 5)

- Modèles : validations conditionnelles (procédure↔nature↔date_bornage), regex des id.
- API : permissions RBAC par rôle, scoping par organisation.
- Import : parsing CSV/Excel, rejets de fichiers invalides.

### 6.7 État d'implémentation

- ✅ **Backend livré** : app `backend/projects/` (modèles `Projet`, `Propriete`, `Affaire`,
  `Ssdgps`, `Session` ; validateurs partagés `validators.py` ; signal auto-session ;
  sérialiseurs ; ViewSets RBAC ; routes `/api/v1/{projets,proprietes,affaires,ssdgps,sessions}/`).
  Migration `projects/0001_initial`. Tests `projects/tests_domain.py` (13 tests ✅).
- ✅ **Frontend livré (6.4)** : module `features/projects/` — `ProjectListComponent` (table CRUD
  + filtres + scoping org via `/auth/me/`) et `ProjectExplorerComponent` (drill-down
  Propriété→Affaire→SSDGPS→Session avec fil d'Ariane et **formulaire Affaire dynamique** :
  `nature_affaire` filtrée par procédure, `date_bornage` conditionnelle). Modèle
  `core/models/project.model.ts`, service `core/services/projects.service.ts`, route lazy
  `/admin/projets`, entrée de menu. Build AOT ✅.
- ⏳ **Reste à faire (6.5)** : import CSV/Excel + upload d'images (formats des pièces), à traiter
  dans un incrément suivant.

---

## 7. Phase 6 — Pièces & génération de rapports PDF SSDGPS

### 7.1 Définition

Produire des **rapports PDF de SSDGPS** composés de **pièces ordonnées** (F22–F26). Chaque
pièce a une source de données (UI, images uploadées, CSV/Excel, saisie directe) et une
applicabilité selon la nature du SSDGPS. Moteur retenu : **WeasyPrint** (HTML/CSS → PDF).

### 7.2 Catalogue des pièces

19 types de pièces (source : tableau de `docs/notes/Notes.md` et classeur
`docs/notes/RAPPORTS.xlsm`). Applicabilité et source résumées :

| Pièce | Natures SSDGPS | Source | Niveau |
|-------|----------------|--------|--------|
| Page de Garde SDGPS | toutes | UI (choix + ordre des pièces) | SSDGPS |
| Rapport de Consultation | toutes | Images | SSDGPS |
| Liste des Points Anciens | toutes | CSV/Excel/saisie | SSDGPS |
| Canevas de Contrôle de Stabilité des Points Anciens | toutes | Images | SSDGPS |
| Canevas de Densification Cadastrale | PDC/GPS, DDC/GPS | Images | SSDGPS |
| Canevas de Levé Cadastral | PLC/GPS, DLC/GPS | Images | SSDGPS |
| Photos des points anciens | toutes | Images + CSV/Excel/saisie | SSDGPS |
| Photos des points nouveaux | toutes | Images + CSV/Excel/saisie | SSDGPS |
| Fiche Technique des Récepteurs | toutes | CSV/Excel/saisie | SSDGPS |
| Rapport des Observations Brutes | toutes | CSV/Excel/saisie | **Session** |
| Rapport du traitement des lignes de base | toutes | CSV/Excel/saisie | **Session** |
| Rapport des fermetures des Boucles | toutes | CSV/Excel/saisie | **Session** |
| Rapport de la détermination libre | toutes | CSV/Excel/saisie | **Session** |
| Rapport de détermination N°i (**pièce répétée** : N°1..N°k, k variable) | PDC/GPS, DDC/GPS, PLC/GPS | CSV/Excel/saisie | **Session** |
| Rapport des déterminations (variante **agrégée** multi-pages, ex. DLC/GPS) | DLC/GPS (constaté) | CSV/Excel/saisie | **Session** |
| Rapport de la détermination définitive | DDC/GPS, DLC/GPS | CSV/Excel/saisie | **Session** |
| Rapport de contrôle | toutes | CSV/Excel/saisie | SSDGPS |

> Le niveau « Session » vs « SSDGPS » et la composition exacte par nature sont **précisés en
> 7.2.1** à partir des rapports exemples fournis (`docs/exemples-ssdgps/`).

### 7.2.1 Structure réelle observée (exemples PDC/DDC/DLC)

Analyse des rapports `docs/exemples-ssdgps/RAPPORTS_SDGPS_{PDC,DDC,DLC}.pdf` (⚠️ **PLC non
fourni** — à obtenir pour compléter).

**Anatomie d'un rapport :**
- Page 1 = **page de garde** (Propriété Dite, Réquisition, Titre, N° SDGPS, en-tête ANCFCC /
  Service du Cadastre).
- Puis, pour chaque pièce dans l'ordre : une **page de séparation** « PIÈCE N°X : TITRE » suivie
  des pages de contenu.
- **En-tête** de chaque page de contenu : Propriété Dite / Réquisition / Titre / **Nature Affaire**
  (ex. « BI du 09/04/2023 » = nature d'affaire + `date_bornage`) / **Nature SDGPS** (« PDC/GPS »).
- **Pied de page** : « SDGPS N°.. PIÈCE N°.. PAGE N°.. ».
- La **numérotation des pièces (N°1, N°2, …) est séquentielle selon l'ordre choisi** dans le
  report builder — ce n'est pas un identifiant fixe de la pièce.

**Jeux de pièces par nature (ordre réel constaté) :**

| Pièce (dans l'ordre) | PDC/GPS | DDC/GPS | DLC/GPS |
|----------------------|:------:|:------:|:------:|
| Page de garde | ✅ | ✅ | ✅ |
| Rapport de consultation | ✅ | ✅ | ✅ |
| Liste des points anciens | ✅ | — | ✅ |
| Canevas contrôle stabilité points anciens | ✅ | — | — |
| Canevas de densification cadastrale | — | ✅ | — |
| Canevas de levé cadastral | — | — | ✅ |
| Photos des points anciens | ✅ | — | ✅ |
| Photos des points nouveaux | — | ✅ | ✅ |
| Observations brutes | ✅ | ✅ | ✅ |
| Traitement des lignes de base | ✅ | ✅ | ✅ |
| Fermetures de boucles | ✅ | ✅ | ✅ |
| Détermination libre | ✅ | ✅ | ✅ |
| Déterminations N°1..N°k (répétées) | ✅ (k=10) | ✅ (k=15) | — |
| Rapport des déterminations (agrégé) | — | — | ✅ |
| Détermination définitive | — | ✅ | ✅ |
| Rapport de contrôle | ✅ | ✅ | ✅ |

> **Écart à lever** : le tableau de `Notes.md` attribuait « Canevas de densification » à PDC **et**
> DDC ; or l'exemple **PDC ne le contient pas** (il apparaît au **dossier** DDC). À confirmer.

**Schémas de données constatés (pièces tabulaires CSV/Excel) :**
- *Liste des points anciens* : `ID, Nom Point, X(m), Y(m), Référence, Nature, Matérialisation, Nature Signalisation`.
- *Observations brutes* : `ID, Point, Heure Début, Heure Fin, Durée, Type, …`.
- *Détermination N°i* : `ID, Nom Point, X(m), Y(m), …` (+ écarts).
- *Photos (anciens/nouveaux)* : une page par point — `Nom, Date de visite, Projection, Système, X(m)/Y(m) approx.` + photo.

Colonnes exactes de chaque pièce : `docs/notes/RAPPORTS.xlsm` (feuilles homonymes).

### 7.3 Modèle de données (pièces & rapport)

- **`Piece`** : `type_piece` (enum des types), rattachement `ssdgps` **ou** `session` selon
  le type, `source_type` (`ui` / `image` / `csv` / `manual`), `payload` (JSON structuré),
  fichiers/images associés, `statut`.
- **Cardinalité des pièces** : distinguer les pièces **singleton** (une occurrence : liste des
  points anciens, contrôle, canevas…) des pièces **à collection** (répétées : une page par point
  pour les photos ; **une pièce par détermination** pour « Détermination N°i »). Le modèle prévoit
  donc, pour les déterminations, une entité `Determination` (numéro/ordre + données) dont chaque
  instance génère une pièce, ainsi qu'une variante **agrégée** (DLC).
- **Mapping** `type_piece → {natures applicables, niveau (ssdgps/session), source, cardinalité,
  schéma de données}` (dérivé des tableaux 7.2 et 7.2.1).
- **`RapportSsdgps`** + table de liaison **`RapportPiece`** (`ordre`, `inclus`) : un rapport =
  sélection **ordonnée** de pièces d'un SSDGPS ; paramètres de page de garde ; `fichier_pdf`
  généré, `genere_par`, `date_generation`, `statut`.

### 7.4 Cadre générique de pièces (« piece framework »)

Registry central `type_piece → { schéma de données, source, applicabilité par nature, niveau
session/ssdgps, template de rendu HTML }`. Objectif : ajouter/itérer les pièces sans logique
ad hoc dispersée, et filtrer dynamiquement les pièces disponibles selon `nature_ssdgps`.

### 7.5 Report builder (UI)

Page de composition du rapport : sélection des pièces disponibles (filtrées par nature),
**réordonnancement par glisser-déposer**, configuration de la **Page de Garde SDGPS**, aperçu,
paramètres. Correspond à la source « UI dans l'app pour choisir et définir l'ordre des pièces ».

### 7.6 Génération PDF (WeasyPrint)

- Templates HTML/CSS Django, un par type de pièce ; en-têtes/pieds de page, pagination, page de
  garde.
- **Convention de rendu constatée** (cf. 7.2.1) : page de garde en tête ; **une page de
  séparation par pièce** (« PIÈCE N°X : TITRE ») ; en-tête répété (Propriété / Réquisition /
  Titre / Nature Affaire+date_bornage / Nature SDGPS) et pied de page
  (« SDGPS N°.. PIÈCE N°.. PAGE N°.. ») ; **numérotation des pièces séquentielle** selon l'ordre
  du report builder.
- Assemblage **ordonné** des pièces sélectionnées → **PDF unique** (les pièces « à collection »
  comme les déterminations et les photos produisent une occurrence par élément).
- Ajouter les dépendances système WeasyPrint au `backend/Dockerfile` (pango/cairo/gdk-pixbuf).
- Contrainte CPS : génération d'un document standard **< 30 s**.
- **Étape « gabarits exacts » (itérative)** : décliner les pièces par nature à partir des exemples
  `docs/exemples-ssdgps/` (**PDC/DDC/DLC fournis** ✅, **PLC à fournir** ⚠️) et de `RAPPORTS.xlsm`.
  Spécificités confirmées : *détermination définitive* pour DDC/DLC ; *canevas de densification*
  (DDC) vs *canevas de levé* (DLC/PLC) ; **nombre de déterminations variable** (N°1..N°k).

### 7.7 Livrables, historique & audit (F25/F26)

- Téléchargement du PDF généré ; historique et statut des générations ; journalisation des
  actions critiques (audit).

### 7.8 Tests (Phase 6)

- Applicabilité pièce↔nature, niveau session/ssdgps.
- Import de données de pièces (parsing, validation).
- Génération PDF : présence des pièces dans le bon ordre, non-régression des gabarits (comparaison structurelle).

---

## 8. Phases ultérieures (aperçu)

### Phase 7 — Supervision & rapports consolidés (F01, F07, F09, F11, F16–F18)

- Tableaux de bord global (admin système) et par organisation (admin org).
- Journal d'audit avec filtres (utilisateur, action, date).
- Rapports consolidés / statistiques ; gestion des quotas et alertes.

### Phase 8 — Invitations & fonctionnalités innovantes (F13, F28–F30)

- Invitations des agents (F13) : modèle `Invitation`, service d'email, page de gestion.
- Signature électronique des documents produits (F28).
- Automatisation des workflows de validation (F29).
- Tableau de bord prédictif (F30).

---

## 9. Glossaire

| Terme | Définition |
|-------|-----------|
| **ROLE_ADMIN_SYSTEME** | Administrateur de l'application — plus haut niveau, gère toute la plateforme |
| **ROLE_ORGANISATION_ADMIN** | Responsable Admin d'une organisation — gère les agents de son organisation |
| **ROLE_ORGANISATION_AGENT** | Agent d'une organisation — profil opérationnel, gestion des projets |
| **RBAC** | Role-Based Access Control — contrôle d'accès basé sur les rôles |
| **Soft-delete** | Suppression logique : données masquées mais conservées en base |
| **JWT** | JSON Web Token — jeton d'authentification sécurisé |
| **SSDGPS** | Sous-sous-dossier GPS — unité de production d'un rapport de post-traitement bureau des observations GPS. Quatre natures : PDC/GPS, DDC/GPS, PLC/GPS, DLC/GPS |
| **SD d'affaire** | Sous-dossier d'affaire — regroupe des SSDGPS ; caractérisé par une procédure et une nature d'affaire |
| **Propriété** | Bien foncier (propriété-dite) identifié par une réquisition et/ou un titre foncier ; rattachée à un projet |
| **Réquisition** | Identifiant d'une propriété en phase d'immatriculation (`R<numéro>/<indice>`) |
| **Titre foncier** | Identifiant d'une propriété après immatriculation (`T<numéro>/<indice>`) |
| **Session** | Session d'observations GPS d'un SSDGPS ; un SSDGPS multi-session en compte plusieurs |
| **Pièce** | Composant d'un rapport SSDGPS (page de garde, canevas, rapports de détermination, etc.), issu d'une source de données (UI, image, CSV/Excel, saisie) |
| **PDC/GPS · DDC/GPS** | Projet / Dossier de densification cadastrale par GPS |
| **PLC/GPS · DLC/GPS** | Projet / Dossier de levé cadastral par GPS |
| **Bornage / Recollement** | Opération de terrain dont la date (`date_bornage`) caractérise l'affaire selon sa procédure |
| **WeasyPrint** | Moteur de rendu HTML/CSS → PDF utilisé pour la génération des rapports |

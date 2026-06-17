# Plan de Développement — Application SDGPS

> **SDGPS** : Système de Génération de Documents et Pièces
> **Version** : 1.0
> **Dernière mise à jour** : Juin 2026

---

## Sommaire

- [1. Introduction](#1-introduction)
  - [1.1 Stack technologique](#11-stack-technologique)
  - [1.2 Architecture applicative](#12-architecture-applicative)
  - [1.3 Conventions](#13-conventions)
- [2. Phases de développement](#2-phases-de-développement)
- [3. Phase 3 — Gestion des Utilisateurs](#3-phase-3--gestion-des-utilisateurs)
  - [3.1 Définition](#31-définition)
  - [3.2 Modèle de données](#32-modèle-de-données)
    - [3.2.1 Rôles — mapping CPS → schéma](#321-rôles--mapping-cps--schéma)
    - [3.2.2 Migration des rôles existants](#322-migration-des-rôles-existants)
    - [3.2.3 Champs ajoutés à `CustomUser`](#323-champs-ajoutés-à-customuser)
    - [3.2.4 Champs ajoutés à `Membership`](#324-champs-ajoutés-à-membership)
  - [3.3 Matrice des permissions RBAC](#33-matrice-des-permissions-rbac)
  - [3.4 API Endpoints](#34-api-endpoints)
    - [Règles de filtrage backend](#règles-de-filtrage-backend)
  - [3.5 Composants frontend](#35-composants-frontend)
    - [3.5.1 Architecture des fichiers](#351-architecture-des-fichiers)
    - [3.5.2 UserListComponent](#352-userlistcomponent)
    - [3.5.3 UserDetailComponent](#353-userdetailcomponent)
    - [3.5.4 RolesPermissionsComponent](#354-rolespermissionscomponent)
  - [3.6 Mise à jour du routeur et du menu](#36-mise-à-jour-du-routeur-et-du-menu)
    - [3.6.1 Routes à ajouter](#361-routes-à-ajouter)
  - [3.7 Tâches d'implémentation](#37-tâches-dimplantation)
    - [Phase 3.1 — Backend : Modèle et migration](#phase-31--backend--modèle-et-migration)
    - [Phase 3.2 — Backend : API endpoints](#phase-32--backend--api-endpoints)
    - [Phase 3.3 — Frontend : Service et modèle](#phase-33--frontend--service-et-modèle)
    - [Phase 3.4 — Frontend : UserListComponent](#phase-34--frontend--userlistcomponent)
    - [Phase 3.5 — Frontend : UserDetailComponent](#phase-35--frontend--userdetailcomponent)
    - [Phase 3.6 — Frontend : RolesPermissionsComponent](#phase-36--frontend--rolespermissionscomponent)
    - [Phase 3.7 — Configuration des routes](#phase-37--configuration-des-routes)
  - [3.8 Tests](#38-tests)
- [4. Phases ultérieures (aperçu)](#4-phases-ultérieures-aperçu)
  - [Phase 4 — Invitations des agents (F13)](#phase-4--invitations-des-agents-f13)
  - [Phase 5 — Gestion des projets (F19-F26)](#phase-5--gestion-des-projets-f19-f26)
  - [Phase 6 — Supervision et rapports (F01, F07, F09, F16, F17)](#phase-6--supervision-et-rapports-f01-f07-f09-f16-f17)
  - [Phase 7 — Fonctionnalités innovantes (F28-F30)](#phase-7--fonctionnalités-innovantes-f28-f30)
- [5. Glossaire](#5-glossaire)

---

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
- RBAC avec 3 profils : ROLE_APP_ADMIN, ROLE_ORGANISATION_ADMIN, ROLE_ORGANISATION_AGENT

---

## 2. Phases de développement

| Phase | Fonctionnalité | Statut |
|-------|---------------|--------|
| 1 | Fondations (git, CPS, Docker, scripts) | ✅ Terminé |
| 2 | Gestion des organisations (CRUD, tableau, filtres) | ✅ Terminé |
| **3** | **Gestion des utilisateurs** | **⬅️ En cours** |
| 4 | Invitations des agents (F13) | 📅 Reportée |
| 5 | Gestion des projets | 📅 À venir |
| 6 | Gestion des pièces et documents | 📅 À venir |
| 7 | Supervision et rapports | 📅 À venir |
| 8 | Fonctionnalités innovantes (signature, workflows, prédictif) | 📅 À venir |

---

## 3. Phase 3 — Gestion des Utilisateurs

### 3.1 Définition

Implémenter la gestion complète des utilisateurs de la plateforme conformément aux spécifications F05 et F12 du CPS, avec un contrôle d'accès strict basé sur les trois profils définis.

### 3.2 Modèle de données

#### 3.2.1 Rôles — mapping CPS → schéma

| Profil CPS | Implémentation |
|---|---|
| `ROLE_APP_ADMIN` | `CustomUser.is_superuser = True` (pas de Membership associé) |
| `ROLE_ORGANISATION_ADMIN` | `Membership.role = 'ROLE_ORGANISATION_ADMIN'` |
| `ROLE_ORGANISATION_AGENT` | `Membership.role = 'ROLE_ORGANISATION_AGENT'` |

#### 3.2.2 Migration des rôles existants

Les valeurs actuelles de `Membership.role` sont migrées comme suit :

| Ancienne valeur | Nouvelle valeur |
|----------------|----------------|
| `OWNER` | `ROLE_ORGANISATION_ADMIN` |
| `ADMIN` | `ROLE_ORGANISATION_ADMIN` |
| `MANAGER` | `ROLE_ORGANISATION_AGENT` |
| `USER` | `ROLE_ORGANISATION_AGENT` |

#### 3.2.3 Champs ajoutés à `CustomUser`

- Aucun champ nouveau nécessaire à ce stade (les champs existants `first_name`, `last_name`, `email`, `is_active`, `is_superuser`, `is_deleted` couvrent les besoins)

#### 3.2.4 Champs ajoutés à `Membership`

- Aucun champ nouveau — seul le choix `role` est modifié (nouvelles valeurs)

### 3.3 Matrice des permissions RBAC

| Action | `ROLE_APP_ADMIN` | `ROLE_ORGANISATION_ADMIN` | `ROLE_ORGANISATION_AGENT` |
|--------|:---:|:---:|:---:|
| Lister les utilisateurs | Tous | Agents de son organisation | ❌ |
| Voir un utilisateur | Tous | Agents de son organisation | ❌ |
| Créer un utilisateur | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Modifier un utilisateur | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Supprimer (soft-delete) | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Désactiver/Activer | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Réinitialiser mot de passe | Tous les rôles | `ROLE_ORGANISATION_AGENT` uniquement | ❌ |
| Voir les rôles disponibles | ✅ | ✅ | ❌ |

### 3.4 API Endpoints

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
- Un `ROLE_APP_ADMIN` voit tous les utilisateurs de la plateforme.
- Les `ROLE_ORGANISATION_AGENT` n'ont pas accès à ces endpoints.

### 3.5 Composants frontend

#### 3.5.1 Architecture des fichiers

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

#### 3.5.2 UserListComponent

Page `/admin/utilisateurs/liste` — reprend le patron de `OrganizationListComponent` :

- **En-tête** : titre + bouton "Ajouter un utilisateur" (visible selon permissions)
- **Filtres** : par rôle (`ROLE_ORGANISATION_ADMIN`, `ROLE_ORGANISATION_AGENT`), par statut (actif/inactif/supprimé), par organisation (ROLE_APP_ADMIN uniquement)
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

#### 3.5.3 UserDetailComponent

Formulaire complet avec sections :

1. **Informations personnelles** : nom, prénom, email (read-only), organisation
2. **Rôle & Permissions** : rôle actuel (sélecteur), affichage des droits associés
3. **Statut & Sécurité** : booléen actif/inactif, date dernière connexion, date changement MDP
4. **Actions administratives** : bouton "Réinitialiser le mot de passe" (génère un MDP temporaire + option "forcer changement"), bouton "Désactiver/Activer" avec confirmation

#### 3.5.4 RolesPermissionsComponent

Page `/admin/utilisateurs/roles` — page d'information et de gestion :

- **Cartes des rôles** : 3 profils (ROLE_APP_ADMIN, ROLE_ORGANISATION_ADMIN, ROLE_ORGANISATION_AGENT) avec description, permissions associées, nombre d'utilisateurs
- **Tableau récapitulatif** : matrice rôles × permissions (comme la section 3.3 ci-dessus)
- **Assignation** : possibilité de modifier le rôle d'un utilisateur directement depuis cette page

### 3.6 Mise à jour du routeur et du menu

#### 3.6.1 Routes à ajouter

Dans `app-routing.module.ts`, sous le path `admin` :

```typescript
{ path: 'utilisateurs', redirectTo: 'utilisateurs/liste', pathMatch: 'full' },
{ path: 'utilisateurs/liste', component: UserListComponent, data: { title: 'Liste des Utilisateurs' } },
{ path: 'utilisateurs/:id', component: UserDetailComponent, data: { title: 'Détail Utilisateur' } },
{ path: 'utilisateurs/roles', component: RolesPermissionsComponent, data: { title: 'Rôles & Permissions' } },
```

### 3.7 Tâches d'implémentation

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

### 3.8 Tests

- Tests unitaires backend pour chaque endpoint (DRF `APITestCase`)
- Tests d'authentification et de permission (chaque endpoint testé avec chaque profil)
- Migration de données testée (anciens rôles → nouveaux rôles)
- Tests de validation des mots de passe temporaires

---

## 4. Phases ultérieures (aperçu)

### Phase 4 — Invitations des agents (F13)

- Reportée. Nécessitera un modèle `Invitation`, un service d'envoi d'email, une page frontend de gestion des invitations.

### Phase 5 — Gestion des projets (F19-F26)

- Création, modification, suivi de statut des projets
- Import de fichiers (HTML, Excel, TXT)
- Génération de rapports PDF et documents administratifs

### Phase 6 — Supervision et rapports (F01, F07, F09, F16, F17)

- Tableaux de bord globaux et par organisation
- Journal d'audit avec filtres
- Rapports consolidés et statistiques

### Phase 7 — Fonctionnalités innovantes (F28-F30)

- Signature électronique
- Automatisation des workflows
- Tableau de bord prédictif

---

## 5. Glossaire

| Terme | Définition |
|-------|-----------|
| **ROLE_APP_ADMIN** | Administrateur de l'application — plus haut niveau, gère toute la plateforme |
| **ROLE_ORGANISATION_ADMIN** | Responsable Admin d'une organisation — gère les agents de son organisation |
| **ROLE_ORGANISATION_AGENT** | Agent d'une organisation — profil opérationnel, gestion des projets |
| **RBAC** | Role-Based Access Control — contrôle d'accès basé sur les rôles |
| **Soft-delete** | Suppression logique : données masquées mais conservées en base |
| **JWT** | JSON Web Token — jeton d'authentification sécurisé |

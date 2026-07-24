# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Présentation du projet

SDGPS (« Système de Génération de Documents ») est une plateforme multi-locataire de
gestion de documents et d'organisations. Elle comporte deux applications lancées
indépendamment :

- **backend/** — API REST Django 4.2 + Django REST Framework (authentification JWT via
  `djangorestframework-simplejwt`), base de données SQLite en développement.
- **frontend/** — SPA Angular 16 (basée sur les NgModule, pas les composants standalone),
  Angular Material + ngx-toastr + FontAwesome.

Le code est majoritairement en **français** (commentaires, docstrings, `verbose_name`,
textes d'interface). Respecter cette convention lors de l'ajout de code.

## Commandes

### Backend (à lancer depuis `backend/`)
- Serveur de dev : `python manage.py runserver` (port **8000** par défaut)
- Migrations : `python manage.py makemigrations` / `python manage.py migrate`
- Tests : `python manage.py test` — une seule app : `python manage.py test organizations`
- Shell Django : `python manage.py shell`
- Amorcer les données d'initialisation (seul jeu de données injecté, PARTOUT — dev inclus) :
  `python manage.py seed_initial_data`. Aucune donnée de démo/test n'est générée dans aucun
  environnement (les commandes `seed_test_users` / `generate_test_data` / `seed_demo_orgs` ont
  été **supprimées**).

### Frontend (à lancer depuis `frontend/`)
- Installer les dépendances : `npm install --legacy-peer-deps` (le flag est requis à cause
  de conflits de peer-dependencies)
- Serveur de dev : `npm start` (port **4200**) — voir « Pièges connus » ci-dessous
- Build : `npm run build` (configuration production par défaut)
- Tests unitaires (Karma/Jasmine) : `npm test` / `ng test`

### Installation / redémarrage en une commande (PowerShell Windows)
- Installation initiale (idempotente) : `.\backend\scripts\setup\run.ps1`
- Redémarrer les deux serveurs : `.\backend\scripts\setup\restart_servers.ps1`

## Architecture

### RBAC / multi-locataire (modèle de domaine central)
Défini dans `backend/accounts/models.py` :
- **`Organization`** (clé primaire UUID) — un cabinet (`PRIVATE`) ou une entité publique
  (`PUBLIC`). La clé étrangère auto-référencée `parent` construit une hiérarchie
  (Direction > Division > Service). Suppression logique via `is_deleted`/`deleted_at` ;
  le flag `is_test_data` sépare les données générées.
- **`Membership`** — modèle de liaison entre `CustomUser` ↔ `Organization` avec un `role`
  (`ROLE_ORGANISATION_ADMIN` / `ROLE_ORGANISATION_AGENT`). Un utilisateur peut appartenir
  à plusieurs organisations (`unique_together = (user, organization)`).
- **`CustomUser`** (`AUTH_USER_MODEL`) — l'email est l'identifiant de connexion
  (`USERNAME_FIELD`, pas de username). Rôle global via `platform_role`
  (`ROLE_ADMIN_SYSTEME`) ; superuser = `ROLE_SUPER_ADMIN`. `get_primary_role()` encode la
  hiérarchie : **Super Admin > Admin Système > Admin Org > Agent Org**.
- **`PasswordResetToken`** — utilisé pour les flux de première connexion et de
  réinitialisation (email via SendGrid).

**Filtrage des données de test :** `Organization.objects` utilise `OrganizationManager`
(`accounts/managers.py`), qui exclut automatiquement les lignes `is_test_data=True` dans
les environnements « type production » (`settings.IS_PRODUCTION_LIKE`, soit `preprod` **et**
`production` — cf. `PRODUCTION_LIKE_ENVIRONMENTS`). Utiliser `Organization.all_objects` pour
contourner le filtrage.

**Changement de mot de passe forcé :** `accounts.middleware.ForcePasswordChangeMiddleware`
renvoie une 403 (`code: MUST_CHANGE_PASSWORD`) pour les appels API quand
`user.requires_password_change()`, n'autorisant que les endpoints
change-password/logout.

### Organisation des apps backend
- `accounts/` — authentification + gestion des utilisateurs. Attention à la séparation :
  les flux d'auth sont dans `views.py`/`urls.py`/`serializers.py` ; **le CRUD
  d'administration des utilisateurs est dans le trio parallèle `users_views.py` /
  `users_urls.py` / `users_serializers.py`**. Ne pas les confondre.
- `organizations/` — CRUD des organisations, membres, métadonnées, suppression en masse.
- `platform_admin/` — profil self-service du super-admin + mot de passe (pas de modèles,
  uniquement des vues).
- Racines des URL (`backend/urls.py`) :
  - `/api/auth/` → accounts (register, login, forgot/verify/reset/change password, `me/`)
  - `/api/v1/users/` → gestion des utilisateurs
  - `/api/v1/organizations/` → organisations
  - `/api/v1/platform-admin/` → profil super-admin

**Contrôle d'accès :** le défaut DRF est `AllowAny` (voir « Pièges connus »). L'application
des permissions se fait **par vue** : les vues admin filtrent au niveau du queryset et de
l'objet (`get_queryset` renvoie `none()` pour un non-admin ; `can_manage_user()` +
`check_object_permissions` dans `users_views.py`). Toujours vérifier la vue quand on
raisonne sur les droits.

### Structure du frontend (`frontend/src/app/`)
- `core/` — singletons transverses :
  - `auth/auth.service.ts` — login/register/reset, stocke le JWT dans `localStorage`
    (`authToken`), décode le JWT côté client pour extraire le rôle.
  - `interceptors/auth.interceptor.ts` — ajoute le token `Bearer` ; en cas de 401, purge le
    token et redirige vers `/auth/login`.
  - `guards/admin.guard.ts` — protège `/admin/**` ; autorise `ROLE_SUPER_ADMIN`,
    `ROLE_ADMIN_SYSTEME`, `ROLE_ORGANISATION_ADMIN` (rôle lu depuis le payload JWT). Ce
    guard est **cosmétique** : la vraie barrière de sécurité est côté backend.
  - `layout/` — `DashboardLayoutComponent` (coquille sidebar/topbar) qui englobe les routes
    de l'app.
  - `services/` — services organization/user/preferences/toast/password-validation.
- `features/` — modules de fonctionnalités chargés en lazy : `auth/`, `dashboard/`,
  `admin/users/`, `profile/`. Le routage est centralisé dans
  `core/.../app-routing.module.ts` ; de nombreuses routes admin utilisent encore un
  `PlaceholderComponent` en dur (modules en cours de construction).
- `shared/` — composants réutilisables (organization-form, toast, field-info).

Les modules sont importés en eager dans `app.module.ts` (`LayoutModule`, `AuthModule`,
`DashboardModule`, `UsersModule`) ; `auth` et `profile` sont aussi des routes lazy via
`loadChildren`.

## Pièges connus

État actuel du dépôt qui piège si on l'ignore (facts, pas des jugements) :

- **Ports incohérents.** Le front vise l'API sur le port **8085**
  (`frontend/src/environments/environment.ts`, et en dur dans `auth.service.ts`), mais le
  backend et les scripts tournent sur **8000**. Certains scripts servent le front sur
  **4205** au lieu de 4200. Vérifier le port réel avant de brancher front↔back.
- **URL d'API en dur.** `auth.service.ts` code `API_URL` en dur au lieu d'importer
  `environment.apiUrl`. Modifier `environment.ts` seul ne suffit pas.
- **`package.json` → script `start`.** Il contient un `cd` vers un chemin absolu erroné
  (`...PythonProject...` au lieu de `perso`). `npm start` peut échouer ailleurs que sur la
  machine d'origine ; utiliser `ng serve` directement.
- **JWT partiel.** Le token ne pose que `role`, `platform_role`, `is_superuser`
  (`accounts/views.py`). Il ne contient **pas** `org_id`/`user_id`, alors que le front les
  lit → `getOrganizationId()`/`getUserId()` renvoient toujours `null`.
- **Défaut DRF `AllowAny`.** `DEFAULT_PERMISSION_CLASSES = ['AllowAny']` : toute nouvelle
  vue est publique tant qu'elle ne pose pas explicitement `IsAuthenticated`.
- **Deux endpoints change-password** (`accounts` et `platform_admin`) : vérifier lequel
  s'applique au type d'utilisateur visé.
- **Pillow** est requis (`ImageField` sur les logos/photos) mais absent de
  `requirements.txt` (seulement installé dans le `Dockerfile`).

## Politique de tests (OBLIGATOIRE)

**Toute nouvelle fonctionnalité ou correction de bug DOIT être accompagnée de tests**, dans
le même changement. C'est une exigence, pas une option — elle s'applique à tous les
assistants de codage IA comme aux contributeurs humains (cf. `AGENTS.md`).

- **Backend** (Django/DRF) : tests dans `app/tests.py` ou `app/tests_*.py`, exécutés par
  `python manage.py test`. Couvrir : la règle métier / le happy-path, les cas d'erreur et de
  validation, et le **scoping RBAC** (permissions par rôle) pour toute vue exposée.
- **Frontend** (Angular) : specs `*.spec.ts` à côté du code, exécutées par
  `npm run test:ci` (Karma/Jasmine, headless). Couvrir au minimum les **services** (avec
  `HttpClientTestingModule`), les **guards/interceptors**, et la logique non triviale des
  composants.
- **Definition of Done** : une fonctionnalité n'est « terminée » que si `python manage.py
  test` **et** `npm run test:ci` passent au vert, en local et en CI
  (`.github/workflows/ci.yml`).
- Écrire les tests au fil de l'eau (idéalement avant/pendant l'implémentation), pas « plus
  tard ». Un correctif de bug commence par un test qui reproduit le bug.
- Ne jamais désactiver, ignorer (`skip`/`xit`) ou supprimer un test pour faire passer la CI
  sans justification explicite dans le message de commit.

## Conventions & notes de workflow

- **Règles d'auto-commit** (`.opencode/instructions.md`) : ce dépôt est configuré pour un
  workflow OpenCode qui réinitialise l'espace de travail lors des changements de mode ; il
  impose de committer après chaque fonctionnalité/correction. Format des messages :
  `type(scope): description` (ex. `feat(users): add ROLE_SUPER_ADMIN filter`). Les commits
  `wip: auto-save` de l'historique proviennent de cet outillage.
- Le `.env` (backend) contient les clés SendGrid, les identifiants d'amorçage du super-admin
  et les flags `ENVIRONMENT` / `SHOW_TEST_DATA`. Il est gitignoré mais présent en local.
- Les composants Angular utilisent **SCSS** par défaut (schematics de `angular.json`).
- Référence de design : `docs/ui-design-spec.md` ; notes de travail dans `docs/notes/`,
  plans dans `docs/plans/PLAN_DEV.md`.

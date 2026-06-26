# Plan : Suppression du champ `nom_societe` du modèle CustomUser

## Backend (Python/Django)
1. `accounts/models.py` — Supprimer `nom_societe` de `CustomUser`
2. `accounts/serializers.py` — Supprimer `nomSociete` de `RegisterSerializer`
3. `accounts/users_serializers.py` — Supprimer `nom_societe` de `UserListSerializer`, `UserDetailSerializer`, `UserCreateSerializer`, `UserUpdateSerializer`
4. `accounts/views.py` — Supprimer les références dans `me` endpoint
5. Créer une migration Django

## Frontend (Angular)
6. `core/models/user.model.ts` — Supprimer `nom_societe` de `User`, `CreateUserPayload`, `UpdateUserPayload`
7. `auth/models/user.model.ts` — Supprimer `nomSociete` de l'interface register
8. `auth/components/register/register.component.ts` — Supprimer `nomSociete` du payload
9. `features/admin/users/user-list/user-list.component.ts` — Supprimer colonne, search, sort, form fields, description, getFilterableColumns
10. `features/admin/users/user-list/user-list.component.html` — Supprimer les templates `nom_societe`
11. `features/admin/users/user-detail/user-detail.component.ts` — Supprimer le champ du form et submit
12. `features/admin/users/user-detail/user-detail.component.html` — Supprimer le champ du template
13. `profile/services/profile.service.ts` — Supprimer `nom_societe` de l'interface
14. `profile/components/profile-settings/profile-settings.component.ts` — Supprimer du form
15. `profile/components/profile-settings/profile-settings.component.html` — Supprimer du template

## Docker
16. Rebuild image backend + restart container

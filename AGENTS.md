# AGENTS.md — Instructions pour les assistants de codage IA

Ce fichier s'adresse à **tout assistant de codage IA** (Claude Code, Cursor, Copilot,
Aider, OpenCode, etc.) intervenant sur ce dépôt. Il complète `CLAUDE.md` (contexte projet)
et prime sur les habitudes par défaut de l'outil.

## Règle n°1 — Écrire les tests de chaque fonctionnalité

> **Toute nouvelle fonctionnalité ou correction de bug DOIT inclure ses tests, dans le même
> changement (commit / PR). Aucune exception sans justification explicite.**

Une contribution sans test est considérée comme **incomplète** et ne doit pas être proposée
comme « terminée ».

### Backend — Django / DRF
- Emplacement : `backend/<app>/tests.py` ou `backend/<app>/tests_*.py`.
- Exécution : `cd backend && python manage.py test` (une app : `python manage.py test <app>`).
- Couverture attendue pour chaque fonctionnalité :
  - le comportement nominal (happy-path) ;
  - les cas d'erreur et de **validation** ;
  - le **scoping RBAC** (permissions par rôle) de toute vue exposée — c'est le cœur de
    sécurité de l'app (cf. `CLAUDE.md`).
- Un correctif de bug **commence** par un test qui reproduit le bug (rouge → vert).

### Frontend — Angular
- Emplacement : `*.spec.ts` à côté du fichier testé.
- Exécution : `cd frontend && npm run test:ci` (Karma/Jasmine, ChromeHeadless).
- Couverture attendue :
  - **services** avec `HttpClientTestingModule` (URLs, params, gestion des réponses) ;
  - **guards / interceptors** (redirection 401, injection du token, autorisation) ;
  - logique non triviale des composants (helpers, transformations, états).

## Definition of Done
Une tâche n'est « terminée » que si, en local **et** en CI (`.github/workflows/ci.yml`) :

```bash
cd backend  && python manage.py test        # backend au vert
cd frontend && npm run test:ci              # frontend au vert
```

## Interdits
- Ne pas désactiver, ignorer (`@skip`, `xit`, `fit`, `xdescribe`) ou supprimer des tests
  pour « faire passer » la CI, sauf justification explicite dans le message de commit.
- Ne pas baisser les assertions au point de ne plus rien vérifier.
- Ne pas committer de code qui casse la suite existante sans la réparer.

## Conventions
- Code et libellés en **français** (cf. `CLAUDE.md`).
- Messages de commit : `type(scope): description` (ex. `feat(pieces): import CSV LPA`).
- Réutiliser les *helpers* de test existants (`make_agent`, hiérarchie
  Projet→Propriété→Affaire→SSDGPS→Pièce) plutôt que de les redéfinir.

## État de la couverture
- **Backend** : suite verte (`python manage.py test`). Apps couvertes : `accounts`
  (protection admin d'org), `organizations`, `projects` (domaine + RBAC), `pieces`
  (catalogue, cohérence, upload, import, scoping), `analytics` (ventilations, cache,
  permissions). En ajoutant une app/fonctionnalité, ajouter ses tests dans la foulée.
- **Frontend** : infrastructure Karma/Jasmine en place (`npm run test:ci`, headless). La
  couverture composant/service est à étendre au fil des fonctionnalités (viser d'abord les
  services et guards/interceptors).

# Stratégie des environnements progressifs

Le code remonte progressivement à travers **4 environnements**, chacun avec **sa propre base de
données** (on ne mélange jamais les données) :

```
Code  →  DEV         →  STAGING      →  PREPROD       →  PRODUCTION
        (moi)          (équipe)         (client)         (tout le monde)
```

| Environnement | `ENVIRONMENT` | Public        | Base de données        | Données démo/test |
|---------------|---------------|---------------|------------------------|-------------------|
| Développement | `development` | Moi           | **SQLite** locale      | visibles          |
| Staging       | `staging`     | Équipe        | **PostgreSQL** dédiée  | visibles          |
| Préprod       | `preprod`     | Client        | **PostgreSQL** dédiée  | **masquées**      |
| Production    | `production`  | Tout le monde | **PostgreSQL** dédiée  | **masquées**      |

## Sélection de l'environnement

La variable **`ENVIRONMENT`** (posée par l'OS / Docker / Railway, jamais dans un `.env`) pilote
tout (`backend/settings.py`) :

- charge `backend/.env.<ENVIRONMENT>` s'il existe (sinon repli sur les variables d'env du service) ;
- choisit le **moteur BDD** : PostgreSQL pour `staging`/`preprod`/`production`, SQLite pour `development`
  (`settings.SERVER_ENVIRONMENTS`) ;
- active les protections « type production » pour `preprod`/`production`
  (`settings.PRODUCTION_LIKE_ENVIRONMENTS` → `IS_PRODUCTION_LIKE`) :
  - les organisations `is_test_data=True` sont **masquées** (`OrganizationManager`) ;
  - les commandes de **données de démo/test** sont **interdites** (`seed_demo_orgs`,
    `generate_test_data`, `seed_test_users` via `forbid_in_production()`).

Chaque environnement a un fichier `.env.<env>` (non versionné) ; les modèles versionnés sont
`.env.development.example`, `.env.staging.example`, `.env.preprod.example`, `.env.production.example`.

## Bases de données séparées

Chaque environnement pointe vers **une base distincte** via `DATABASE_URL` (ou `POSTGRES_*`). Sur
Railway, chaque environnement possède son propre service PostgreSQL — aucune connexion n'est
partagée entre dev/staging/preprod/production.

## Données d'initialisation (identiques dans les 4 — première étape)

Le seed (`accounts.seeding.run_seed`, rejoué à chaque `migrate` via le signal `post_migrate`)
lit **les mêmes fichiers embarqués** quel que soit l'environnement :

- `accounts/seed_data/initial_data.json` — utilisateurs de référence, organisations, organismes ;
- `accounts/seed_data/business_data.json` — données métier (projets → pièces) + médias.

Donc, **dans un premier temps, les 4 environnements sont initialisés avec les mêmes données**.
Différenciation possible plus tard via la variable `SEED_DATA_FILE` (fichier monté par
environnement) sans changer le code.

## Flux de promotion (branches → environnements)

Modèle recommandé (à câbler dans le CI/CD) :

```
feature/* ──PR──▶ develop ──▶ STAGING      (déploiement auto sur merge)
                    │
                    └──PR──▶ release/* ──▶ PREPROD   (validation client)
                                 │
                                 └──PR──▶ main ──▶ PRODUCTION  (live)
```

- On ne déploie jamais directement en production : un changement doit avoir traversé
  STAGING puis PREPROD.
- Chaque promotion = un merge vers la branche de l'environnement cible, qui déclenche le
  build + déploiement de cet environnement (mêmes migrations + même seed).

## Mise en place Railway (résumé)

Un **projet** Railway avec **4 environnements** (Railway « Environments ») : `development`
(optionnel), `staging`, `preprod`, `production`. Pour chaque environnement serveur :

1. un service **PostgreSQL** dédié ;
2. le service applicatif (image Docker racine) avec `ENVIRONMENT=<env>`, `DATABASE_URL` référencé,
   un **volume** `/app/media`, et les secrets (`SECRET_KEY`, SendGrid, comptes seedés) ;
3. la branche GitHub suivie correspondant au flux ci-dessus.

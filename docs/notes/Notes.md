# Plan de dev de l'app




## Sommaire

- [Plan de dev de l'app](#plan-de-dev-de-lapp)
- [Promptes importantes opencode](#promptes-importantes-opencode)
  - [Phase : configuration du depot git local + distant](#phase-configuration-du-depot-git-local-distant)
    - [Compte Github pour git + Github API token](#compte-github-pour-git-github-api-token)
    - [synchronisation depot local avec depot distant](#synchronisation-depot-local-avec-depot-distant)
    - [Structure des branches dans local et dans depot distant](#structure-des-branches-dans-local-et-dans-depot-distant)
    - [Creation des branches de fonctionnalite](#creation-des-branches-de-fonctionnalite)
    - [commandes pour controller le watcher.](#commandes-pour-controller-le-watcher)
  - [Teste de la version actuelle de l'app](#teste-de-la-version-actuelle-de-lapp)
    - [Identifiants des utilisateurs de tests](#identifiants-des-utilisateurs-de-tests)
    - [Prompte redemarrage serveurs backend + frontend](#prompte-redemarrage-serveurs-backend-frontend)
  - [Redaction du CPS de l'app](#redaction-du-cps-de-lapp)
    - [Prompt redaction CPS de l'app](#prompt-redaction-cps-de-lapp)
      - [Plan du CPS](#plan-du-cps)
      - [Acteurs et roles](#acteurs-et-roles)
  - [Phase : Developement de l'app](#phase-developement-de-lapp)
    - [Fonctionnalites Espace Admin : Gestion des organisations](#fonctionnalites-espace-admin-gestion-des-organisations)
      - [Prompte n1](#prompte-n1)
      - [Prompte n2](#prompte-n2)
      - [Prompte n3](#prompte-n3)
    - [Fonctionnalites Espace Admin : Gestion des utilisateurs](#fonctionnalites-espace-admin-gestion-des-utilisateurs)
      - [Prompte n1 : redaction plan de dev de la phase : Gestion des utilisateurs](#prompte-n1-redaction-plan-de-dev-de-la-phase-gestion-des-utilisateurs)
      - [Prompte n2 : implementation plan de dev de la phase : Gestion des utilisateurs](#prompte-n2-implementation-plan-de-dev-de-la-phase-gestion-des-utilisateurs)

    - configuration du depot git local + distant
    - tester la version actuelle de l'app
    - Redaction du CPS de l'app
    - Redaction des phases du plan de dev de l'app a partir du CPS
    - Implementation du plan de dev de l'app
# Promptes importantes opencode
## Phase : configuration du depot git local + distant
### Compte Github pour git + Github API token 
    Configurer le compte suivant spécifiquement pour ce dépôt uniquement. Les infos du compte git sont les suivantes: 
	email : "120096166+blmerio2022@users.noreply.github.com"
	name : "blmerio2022"
    Github token compte Blmerio2022: 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
### synchronisation depot local avec depot distant
synchronise ce depot local avec depot distant : https://github.com/blmerio2022/app_sdgps en utilisant ce compte

### Structure des branches dans local et dans depot distant
ajoute en local et dans depot distant une branche "develop" et l'activer par defaut en local et dans le depot distant. renomme la branche master local et distante en main si possible. de telle sorte que main locale suit origin/main et develop locale suit origin/develop.

### Creation des branches de fonctionnalite

Creer une branche pour la redaction du CPS de l'app (propose un nom parlant pour cette branche) et mettre cette branche comme active en local et dans le depot distant

----------------------------------

commit changes dans la branche locale active et synchronise ces commits  avec le dépôt distant global de l'app


### commandes pour controller le watcher.


LANCER le watcher
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -File `"$pwd\.githooks\auto-save-watcher.ps1`""

VÉRIFIER s'il tourne
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object CommandLine -match 'auto-save-watcher' | Format-Table ProcessId, CommandLine -AutoSize -Wrap

ARRÊTER le watcher
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object CommandLine -match 'auto-save-watcher' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

VOIR L'HISTORIQUE des commits auto-save
git log --oneline --grep="wip: auto-save" --max-count=20


## Teste de la version actuelle de l'app

### Identifiants des utilisateurs de tests

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Super Admin | boulmaneabderrazzak@gmail.com | Abderrazzak@1234 |
| Utilisateur standard | abderrazzak.cadazilal@gmail.com | Test@1234 |

### Prompte redemarrage serveurs backend + frontend

force le redemarrage/relance des deux serveurs frontend et backend (vrai serveur backend via docker) en arriere plan (ne pas afficher de fenetres terminal dans windows). relance backend sur port 8085 et frontend sur le port 4205. ne jamais stopper les autres process deja dans les autres ports par exemples : 8080/ 8081 ... ou bien 4200/4201 ...

## Redaction du CPS de l'app

### Prompt redaction CPS de l'app

l'objectif de ce cps est de decrire les differntes fonctionnalites qui seront developpees dans cette app, sans entrer en details dans l'implementation technique de ces fonctionnalites.

#### Plan du CPS

Redige le CPS de l'app suivant le plan ci-dessous. utilise speckit pour clarifier les points ambigues et manquantes.

Plan du CPS de l'app: 

0.Introduction et Contexte : Contexte ANCFCC + cabinets privés, périmètre

I. Objectifs du Projet

    1.1 Objectifs fonctionnels

    1.2 Objectifs techniques

II. Acteurs et Rôles
    

III. Description des Fonctionnalités


3.1 Espace Administration - ROLE_APP_ADMIN


3.2 Responsable Admin d'une organisation (ROLE_ORGANISATION_ADMIN)


3.3 Espace Agent d'une organisation (ROLE_ORGANISATION_AGENT)

3.4 Fonctionnalités Innovantes


IV. Spécifications Techniques


4.1 Stack technologique obligatoire

4.2 Architecture applicative

4.3 Sécurité

4.4 Exigences non fonctionnelles

VI. Contraintes et Consignes Importantes

6.1 Contraintes de développement

6.2 Consignes de sécurité

VII. Glossaire : Définitions des termes métier


#### Acteurs et roles

L'application distingue quatre profils utilisateurs, chacun disposant de droits stricts.

Administrateur de l'app (ROLE_APP_ADMIN):

	Configuration globale, gestion des utilisateurs,
	paramétrage global de l'app, supervision des organisations, rapports consolidés.

Responsable Admin d'une organisation (ROLE_ORGANISATION_ADMIN):

	Gestion des agents de son organisation, validation
	des opérations sensibles, rapports de l'organisation,
	Responsable du parametrage specifique a l'organisation.


Agent d'une organisation (ROLE_ORGANISATION_AGENT):

    Gestion et configuration des porojets
    Gestion et configuration des rapports
    Gestion et configuration des pieces
    Saisie et import des donnees
    Generation des rapports

## Phase : Developement de l'app

### Fonctionnalites Espace Admin : Gestion des organisations

#### Prompte n1

Je veux maintenant, ajouter les fonctionnalites suivantes dans le tableau de la liste des organisations dans la page "/admin/organisations/liste" : 

dans le footer du tableau a gauche les outils de filtres (afficher toutes les organisations, Afficher uniquement les organisations selectionnees, filtrer par champs) et dans la partie droite les outils de paginations.

Le tout en s'inspirant tres grandement du tableau deja present dans le code et qui contient toutes ces fonctionnalites (tableau de la "Liste des tranches des grilles tarifaires des corridors" dans la page "/admin/devises-pays" onglet "Grilles Tarifaires") du projet dont le code source est dans le dossier suivant "D:\BOULMANE\SMAHAN BOULMANE\PROJET-ATLAS-OKAN-TRANSFERT" . Le tout dans un style élégant, pro et conforme au design System de l'app.

#### Prompte n2

le style des outils de filtrage et de pagination du tableau de la liste des organisations est tres moche. corrige le style en utilisant un style élégant, pro et conforme au design System de l'app.

#### Prompte n3

corrige les points suivants : 
    - la ligne des noms des colonnes du tableau de la liste des organisations doit etre figee lors du scroll vertical.
    - L'espace reserve a l'affichage des lignes du tableau doit etre le plus grand possible, le footer du tableau doit etre figee en bas de la page, pour accordee le plus d'espace possible pour l'affiche des donnees du tableau.
    - au chargement de la page "/admin/organisations/liste" par defaut seulement 5 organisations qui doivent s'afficher dans le tableau.
    - L'entete de la colonne action ne reste pas figee lors du scroll vertical.surtout lorsque le nombre d'elements par page selectionne est > nombre elements qu'une page peut afficher sans activer scroll vertical (dans mon ecran = 5 lignes)
    - la colonne type doit afficher seulement "Administration" pour les organisations de type "Entité Publique / Administration" et "Entreprise" pour les organisations de type "Cabinet Privé / Entreprise".
    - Maintenant lorsque une ligne est selectionnee ou bien survoler la colonne action est non incluse dans cette selection/survole.
    - Ajouter les options de la colonne actions : voir details, modifier, supprimer dans la fenetre contextuel du clique droit sur une ligne.
    - je ne comprend pas pourquoi le style de la fenetre modifier une organisation est cassee
    - corrige le style de la fenetre "Organiser les colonnes" en utilisant un style élégant, pro et conforme au design System de l'app.
    - lorsque je survole le nom d'une colonne le background devient transparent. corrige ce probleme
    - toujours lorsque le scroll vertical est active et que je scroll verticalement puis apres survole du nom d'une colonne la ligne en dessous s'affiche car le fond de cette colonne est transparent. corrige ce probleme.

### Fonctionnalites Espace Admin : Gestion des utilisateurs

#### Prompte n1 : redaction plan de dev de la phase : Gestion des utilisateurs

L'objectif maintenant est de developper la fonctionnalite de gestion des utilisateurs de l'app.

La plateforme distingue trois profils utilisateurs, chacun disposant de droits et responsabilités spécifiques :

    Administrateur de l'application (ROLE_APP_ADMIN)
    Profil de plus haut niveau. Gère l'ensemble de la plateforme : configuration globale, gestion des utilisateurs et organisations, paramétrage système, supervision des activités et consultation des rapports consolidés.
    L'administrateur de l'application (ROLE_APP_ADMIN) peut creer/modifier/supprimer n'importe quel utilisateur : les Administrateur de l'application (ROLE_APP_ADMIN), les Responsables Admin d'une organisation (ROLE_ORGANISATION_ADMIN) et les Agents d'une organisation (ROLE_ORGANISATION_AGENT). il peut egalement reinitialiser le mdp de n'importe quel autre utilisateur y compris ceux des Administrateurs de l'application (ROLE_APP_ADMIN)

    Responsable Admin d'une organisation (ROLE_ORGANISATION_ADMIN)
    Profil de gestion au niveau d'une organisation (service ANCFCC ou cabinet privé). Gère les agents de son organisation, valide les opérations sensibles, supervise les projets et configure les paramètres spécifiques à son organisation.
    Le responsable Admin d'une organisation (ROLE_ORGANISATION_ADMIN) peut creer/modifier/supprimer uniquement les agents de son organisation (ROLE_ORGANISATION_AGENT). il peut egalement reinitialiser le mdp de n'importe quel agent de son organisation (ROLE_ORGANISATION_AGENT).

    Agent d'une organisation (ROLE_ORGANISATION_AGENT)
    Profil opérationnel. Assure la gestion courante des projets, la saisie et l'import des données, la génération des rapports et documents, et la configuration des pièces.
    L'agent d'une organisation ne peut pas creer/modifier/supprimer aucun utilisateur de l'app. 

Fonctionnalités à implémenter (par priorité)
1. Liste des Utilisateurs (page admin)
Backend : GET/DELETE /api/v1/users/ — lister, filtrer (par rôle, statut, organisation), désactiver/supprimer des utilisateurs
Frontend : UserListComponent — tableau type organisations (checkbox, sticky actions, tri, pagination, filtre par rôle/statut/org)
Valeur : indispensable pour F05 (CPS)
2. Détail / Édition d'un Utilisateur
Backend : GET/PUT/PATCH /api/v1/users/<id>/ — modifier infos, rôle, statut, reset MDP forcé
Frontend : UserDetailComponent — formulaire avec sections (infos personnelles, rôle, organisation, statut, actions MDP)
Valeur : nécessaire pour F05, F12
3. Gestion des Rôles & Permissions (F06)
Backend : endpoint GET /api/v1/roles/ + PUT /api/v1/users/<id>/role/ — modifier le rôle d'un utilisateur dans une organisation
Frontend : RolesPermissionsComponent — visualisation des rôles avec leurs permissions, assignation par utilisateur
Valeur : contrôle d'accès fin
4. Membres d'une Organisation (vue org)
Backend : déjà partiellement avec OrganizationMembersView et AddMemberView
Frontend : OrganizationMembersComponent — intégré dans la vue détail d'organisation, lister/ajouter/retirer des membres
Valeur : gestion quotidienne des équipes
5. Journal des Connexions
Backend : endpoint GET /api/v1/users/audit/ (dernières connexions, IP, date)
Frontend : section dans l'utilisateur ou page dédiée
Valeur : traçabilité sécurité (complémentaire aux logs d'audit déjà prévus)
L'architecture à suivre serait cohérente avec organization-list : module dédié features/admin/users/, service core/services/user.service.ts, routes sous /admin/utilisateurs/* (déjà configurées dans le menu mais pas dans le routeur).

L'objectif est de rediger le plan de dev de l'app dans docs/plans/PLAN_DEV.md. ce plan doit contenir une phase pour toutes ces fonctionnalites de gestion des utilisateurs. utilise speckit pour clarifier les points ambigues et manquantes.

pour question 1 : utilise CustomUser.is_superuser = True (pas lié à une org) pour ROLE_APP_ADMIN et les profils ROLE_ORGANISATION_ADMIN, ROLE_ORGANISATION_AGENT pour les valeurs de Membership.role au lieu des valeurs :  OWNER, ADMIN, MANAGER, USER. pour question n2 : cette fonctionnalite est reportée à une phase ultérieure. pour question n3 : option A.

pour question n1 :  option (A) L'admin définit un mot de passe temporaire + option "forcer changement au premier login". pour question n2 : on garde les deux l'admin peut supprimer un utilisateur ( fait un soft-delete (comme pour les organisations avec is_deleted)) et encore garder l'option de Désactivation : un utilisateur peut etre desactive  via is_active. pour la question n3 : pour l'instant garder seulement les superuser presents, ne pas créer dès cette phase d'autres utilisateurs ROLE_APP_ADMIN.

Ajouter au repo local et distant la branche main pour production et develop comme point de depart des fonctionnalites nouvelles dans l'app. a chaque phase une nouvelle branche de fonctionnalite sera cree et une fois testee et validee sera fusionnee dans develop. Ajouter ces instructions au plsn de dev. Configurer le compte suivant spécifiquement pour ce dépôt uniquement. Les infos du compte git sont les suivantes: 
email : "120096166+blmerio2022@users.noreply.github.com"
name : "blmerio2022"

#### Prompte n2 : implementation plan de dev de la phase : Gestion des utilisateurs

passons maintenant a l'implementation de la phase Gestion des Utilisateurs.

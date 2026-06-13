# Plan de dev de l'app
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


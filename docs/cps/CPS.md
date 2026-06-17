# Cahier des Prescriptions Spéciales (CPS)

## Application SDGPS — Système de Génération de Documents et Pièces

---

## Sommaire

- **0. [Introduction et Contexte](#0-introduction-et-contexte)**
  - [Contexte institutionnel](#contexte-institutionnel)
  - [Constat actuel](#constat-actuel)
  - [Périmètre du projet](#périmètre-du-projet)
- **I. [Objectifs du Projet](#i-objectifs-du-projet)**
  - [1.1 Objectifs fonctionnels](#11-objectifs-fonctionnels)
  - [1.2 Objectifs techniques](#12-objectifs-techniques)
- **II. [Acteurs et Rôles](#ii-acteurs-et-rôles)**
  - [Administrateur de l'application (ROLE_APP_ADMIN)](#administrateur-de-lapplication-role_app_admin)
  - [Responsable Admin d'une organisation (ROLE_ORGANISATION_ADMIN)](#responsable-admin-dune-organisation-role_organisation_admin)
  - [Agent d'une organisation (ROLE_ORGANISATION_AGENT)](#agent-dune-organisation-role_organisation_agent)
- **III. [Description des Fonctionnalités](#iii-description-des-fonctionnalités)**
  - [3.1 Espace Administration — ROLE_APP_ADMIN](#31-espace-administration--role_app_admin)
  - [3.2 Responsable Admin d'une organisation — ROLE_ORGANISATION_ADMIN](#32-responsable-admin-dune-organisation--role_organisation_admin)
  - [3.3 Espace Agent d'une organisation — ROLE_ORGANISATION_AGENT](#33-espace-agent-dune-organisation--role_organisation_agent)
  - [3.4 Fonctionnalités Innovantes](#34-fonctionnalités-innovantes)
- **IV. [Spécifications Techniques](#iv-spécifications-techniques)**
  - [4.1 Stack technologique obligatoire](#41-stack-technologique-obligatoire)
  - [4.2 Architecture applicative](#42-architecture-applicative)
  - [4.3 Sécurité](#43-sécurité)
  - [4.4 Exigences non fonctionnelles](#44-exigences-non-fonctionnelles)
- **VI. [Contraintes et Consignes Importantes](#vi-contraintes-et-consignes-importantes)**
  - [6.1 Contraintes de développement](#61-contraintes-de-développement)
  - [6.2 Consignes de sécurité](#62-consignes-de-sécurité)
- **VII. [Glossaire](#vii-glossaire)**

---

## 0. Introduction et Contexte

### Contexte institutionnel

L'Agence Nationale de la Conservation Foncière, du Cadastre et de la Cartographie (ANCFCC) est l'organisme public de référence en matière de gestion du foncier au Maroc. Elle collabore avec un réseau de cabinets privés de topographie et de géomètres-experts agréés pour assurer la production et la gestion des documents techniques et administratifs liés au cadastre et à la conservation foncière.

### Constat actuel

La production de ces documents repose aujourd'hui sur des processus manuels, des outils hétérogènes et des échanges non centralisés. Cette situation entraîne :

- Des délais de traitement allongés
- Une absence de traçabilité des actions
- Des risques d'erreur dans la saisie et la génération des documents
- Une difficulté à superviser l'activité des cabinets et des services

### Périmètre du projet

Le projet SDGPS vise à doter l'ANCFCC et les cabinets privés partenaires d'une plateforme web sécurisée de génération et de gestion des documents et pièces administratives et techniques. La plateforme couvre l'ensemble du cycle de vie : de la création d'un projet à la production des livrables finaux, en passant par la collaboration multi-acteurs et le contrôle d'accès strict.

---

## I. Objectifs du Projet

### 1.1 Objectifs fonctionnels

- Centraliser la gestion des organisations (ANCFCC et cabinets privés) et de leurs membres
- Permettre la création et le suivi de projets multi-acteurs
- Offrir des formulaires de saisie structurée pour les données techniques
- Permettre l'import de données depuis des fichiers (HTML, Excel, TXT)
- Générer des rapports PDF et des documents administratifs paramétrables
- Assurer la traçabilité complète des actions (journal d'audit)
- Contrôler les accès par profils et rôles stricts
- Offrir un tableau de bord de supervision pour chaque niveau hiérarchique
- Permettre la signature électronique des documents produits

### 1.2 Objectifs techniques

- Garantir un temps de réponse rapide pour les opérations courantes
- Assurer la disponibilité continue de la plateforme
- Garantir la sécurité et la confidentialité des données traitées
- Permettre l'évolutivité de la plateforme à mesure du nombre d'utilisateurs et d'organisations
- Assurer la compatibilité avec les navigateurs modernes et les terminaux courants

---

## II. Acteurs et Rôles

La plateforme distingue trois profils utilisateurs, chacun disposant de droits et responsabilités spécifiques :

### Administrateur de l'application (ROLE_APP_ADMIN)

Profil de plus haut niveau. Gère l'ensemble de la plateforme : configuration globale, gestion des utilisateurs et organisations, paramétrage système, supervision des activités et consultation des rapports consolidés.

### Responsable Admin d'une organisation (ROLE_ORGANISATION_ADMIN)

Profil de gestion au niveau d'une organisation (service ANCFCC ou cabinet privé). Gère les agents de son organisation, valide les opérations sensibles, supervise les projets et configure les paramètres spécifiques à son organisation.

### Agent d'une organisation (ROLE_ORGANISATION_AGENT)

Profil opérationnel. Assure la gestion courante des projets, la saisie et l'import des données, la génération des rapports et documents, et la configuration des pièces.

---

## III. Description des Fonctionnalités

### 3.1 Espace Administration — ROLE_APP_ADMIN

| Réf | Fonctionnalité | Description |
|-----|---------------|-------------|
| F01 | Tableau de bord global | Vue d'ensemble des indicateurs clés : nombre d'organisations, utilisateurs actifs, projets en cours, volume de documents générés |
| F02 | Gestion des organisations | Création, modification, activation/désactivation et suppression des organisations |
| F03 | Consultation des organisations | Liste complète avec recherche, filtres (type, statut, date) et détails |
| F04 | Hiérarchie des organisations | Organisation arborescente des entités publiques (Ministère > Direction > Division > Service) |
| F05 | Gestion des utilisateurs | Consultation de tous les utilisateurs de la plateforme, activation/désactivation, réinitialisation de mot de passe |
| F06 | Paramétrage global | Configuration des paramètres système : mots de passe, durées de validité, quotas par défaut |
| F07 | Supervision des activités | Consultation des journaux d'audit avec filtres (utilisateur, action, date) |
| F08 | Mode maintenance | Activation/désactivation du mode maintenance avec message personnalisé |
| F09 | Rapports consolidés | Génération de rapports statistiques transverses sur l'ensemble des organisations |
| F10 | Gestion des données de test | Marquage, filtrage et nettoyage des données de test |

### 3.2 Responsable Admin d'une organisation — ROLE_ORGANISATION_ADMIN

| Réf | Fonctionnalité | Description |
|-----|---------------|-------------|
| F11 | Tableau de bord organisation | Vue synthétique des activités de l'organisation : projets actifs, membres, documents générés |
| F12 | Gestion des agents | Ajout, modification, attribution des rôles et désactivation des agents de son organisation |
| F13 | Invitation des agents | Génération de liens d'invitation sécurisés pour rejoindre l'organisation |
| F14 | Paramétrage spécifique | Configuration des templates de documents et des champs personnalisés propres à l'organisation |
| F15 | Validation des opérations | Validation ou rejet des documents et pièces produits par les agents |
| F16 | Supervision des projets | Consultation de l'ensemble des projets de l'organisation avec indicateurs d'avancement |
| F17 | Rapports organisation | Génération de rapports et statistiques propres à l'organisation |
| F18 | Gestion des quotas | Consultation de l'état des quotas (projets, stockage) et alertes de dépassement |

### 3.3 Espace Agent d'une organisation — ROLE_ORGANISATION_AGENT

| Réf | Fonctionnalité | Description |
|-----|---------------|-------------|
| F19 | Gestion des projets | Création, modification et consultation des projets avec suivi de statut |
| F20 | Saisie des données | Formulaire structuré pour la saisie des données techniques et administratives |
| F21 | Import de fichiers | Import de données depuis des fichiers aux formats HTML, Excel et TXT |
| F22 | Gestion des pièces | Création, modification et suppression des pièces rattachées aux projets |
| F23 | Génération de rapports | Génération de rapports PDF à partir des données saisies |
| F24 | Génération de documents | Production de documents administratifs basés sur des templates paramétrables |
| F25 | Consultation de l'historique | Accès à l'historique des documents générés et des actions réalisées |
| F26 | Téléchargement des livrables | Téléchargement des documents finaux et pièces jointes |
| F27 | Profil et préférences | Modification de ses informations personnelles et préférences d'affichage |

### 3.4 Fonctionnalités Innovantes

| Réf | Fonctionnalité | Description |
|-----|---------------|-------------|
| F28 | Signature électronique | Intégration d'un module de signature électronique permettant aux responsables et agents de signer numériquement les documents générés, garantissant l'authenticité et l'intégrité des livrables |
| F29 | Automatisation des workflows | Mise en place de règles métier automatisées pour la validation et la génération des documents (circuit de validation paramétrable) |
| F30 | Tableau de bord prédictif | Indicateurs avancés et tendances sur l'activité des organisations (volume projeté, délais moyens, taux de complétion) |

---

## IV. Spécifications Techniques

### 4.1 Stack technologique obligatoire

- **Backend** : Python / Django avec Django REST Framework
- **Frontend** : Angular (version 16+)
- **Base de données** : SQL (relationnelle)
- **Authentification** : JWT (JSON Web Tokens)
- **Conteneurisation** : Docker
- **Contrôle de version** : Git

### 4.2 Architecture applicative

- Architecture web à deux couches (frontend / backend) communiquant via une API REST
- API sécurisée par authentification par token JWT avec expiration configurable
- Contrôle d'accès basé sur les profils (RBAC) appliqué à chaque requête
- Base de données relationnelle avec gestion des migrations
- Conteneurisation du backend pour le déploiement et l'isolation

### 4.3 Sécurité

- Chiffrement des échanges (HTTPS en production)
- Hachage des mots de passe (aucun stockage en clair)
- Politique de robustesse des mots de passe (longueur minimale, complexité)
- Sessions limitées dans le temps avec renouvellement de token
- Contrôle d'accès à chaque requête : un utilisateur ne voit que les données de son organisation
- Journal d'audit horodaté pour toutes les actions importantes
- Mode maintenance pour restreindre l'accès lors des interventions
- Signature électronique des documents finaux

### 4.4 Exigences non fonctionnelles

- Temps de réponse inférieur à 3 secondes pour les opérations courantes
- Génération de documents standard en moins de 30 secondes
- Disponibilité de la plateforme 24h/24 et 7j/7
- Application responsive compatible avec les navigateurs modernes (Chrome, Firefox, Edge, Safari)
- Capacité à monter en charge avec l'augmentation du nombre d'organisations et d'utilisateurs
- Sauvegarde et récupération des données

---

## VI. Contraintes et Consignes Importantes

### 6.1 Contraintes de développement

- Les fonctionnalités doivent être développées par ordre de priorité défini dans la feuille de route
- Chaque fonctionnalité doit être livrée avec ses tests associés
- L'interface doit être en français
- Le code source est versionné avec Git selon une convention de branchement définie
- Les API doivent respecter les principes REST

### 6.2 Consignes de sécurité

- Aucune donnée sensible ne doit transiter en clair
- Les jetons d'authentification ne doivent pas être stockés côté serveur
- Les accès API doivent être protégés par authentification et autorisation à chaque point d'entrée
- Les mots de passe doivent respecter une politique de robustesse stricte
- Les fichiers importés doivent être validés (type, taille, contenu)
- Les actions critiques (suppression, validation, changement de rôle) doivent être tracées dans le journal d'audit
- Les données de test doivent être isolées des données de production

---

## VII. Glossaire

| Terme | Définition |
|-------|------------|
| **ANCFCC** | Agence Nationale de la Conservation Foncière, du Cadastre et de la Cartographie |
| **SDGPS** | Système de Génération de Documents et Pièces |
| **CPS** | Cahier des Prescriptions Spéciales |
| **Pièce** | Document ou donnée attaché à un projet (saisie, fichier importé, rapport généré) |
| **Projet** | Conteneur structuré regroupant des pièces et documents autour d'un objectif métier |
| **RBAC** | Role-Based Access Control — Contrôle d'accès basé sur les rôles utilisateurs |
| **Template** | Modèle paramétrable définissant la mise en page et les champs d'un document |
| **JWT** | JSON Web Token — Jeton d'authentification JSON sécurisé |
| **Rapport** | Document généré (format PDF) à partir des données d'un projet |
| **Soft delete** | Suppression logique : les données sont masquées mais conservées en base |
| **Quota** | Limite définie par organisation (nombre de projets, espace de stockage) |

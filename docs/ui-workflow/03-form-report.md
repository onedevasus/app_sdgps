# Rapport d'Analyse de Forme — UserList Redesign

> Généré par ui-form-analyst le 2026-06-24

## Résumé
Analyse complète de la structure du nouveau UserListComponent. Recommande un layout header 2 lignes (comme OrganizationList), 7 colonnes visibles par défaut, 7 cachées, menu contextuel dual (colonne + ligne), sticky checkbox + actions, pagination enrichie [5,8,10,20,50], colonnes configurables par drag & drop, export CSV, préférences localStorage fallback.

## Décisions clés
1. Header 2 lignes : stats + toolbar
2. must_change_password : badge sur statut (pas colonne dédiée)
3. Search bar à droite (comme OrgList)
4. Sticky columns : checkbox gauche + actions droite
5. Memberships : détail modal uniquement (pas expand row)
6. Préférences persistées : API → localStorage fallback
7. ColumnConfig[] hardcodé en TypeScript

## Template HTML
Structure complète en 4 sections : header 2 lignes → table avec sticky header → footer filtre/pagination → modales (6)

Voir fichier complet dans docs/ui-workflow/03-form-report.md

# Rapport d'Architecture d'Information — UserList Redesign

> Généré par ui-ia-analyst le 2026-06-24

## Résumé
Analyse complète de la navigation, hiérarchie et structure des 8 parcours utilisateur principaux (création, consultation, modification, suppression, export, colonnes, mot de passe, navigation).

## Décisions clés
1. Les 6 modales suivent un pattern de cohérence standardisé (Header icône + titre → Body → Footer Annuler/Action)
2. 14 colonnes totales dont 7 visibles par défaut + 7 cachées
3. RBAC : ROLE_APP_ADMIN voit tout, ROLE_ORGANISATION_ADMIN restreint
4. États vides différenciés : "Aucun utilisateur" vs "Aucun résultat"
5. Labels en français cohérents

Voir fichier complet docs/ui-workflow/05-ia-report.md

# UI 设计规范 — Gestion des Utilisateurs (SDGPS)
> Généré par UI Workflow (Mode profond) le 2026-06-24
> Intègre 7 rapports : Research → Need → Form → Visual → IA → Interaction → Content

---

## 1. 产品定位与目标

- **Produit** : SDGPS (Système de Génération de Documents et Pièces) — Back-office d'administration
- **Page** : `/admin/utilisateurs` — Gestion des comptes utilisateurs
- **Objectif** : Reconstruire UserListComponent (~860 lignes) en s'inspirant d'OrganizationListComponent (~1668 lignes)
- **Utilisateurs** : ROLE_APP_ADMIN (super admin) ✓ | ROLE_ORGANISATION_ADMIN (admin restreint) ✓

## 2. 关键页面与形态

### Layout général
```
┌──────────────────────────────────────────────────────────────┐
│  [Line 1] Utilisateurs    Total: 120 | Filtrés: 45 | Sel.: 3 │
│  [Line 2] (Filtre) Select All | Deselect | Invert | Export   │
│           Columns | Delete  ──separator──  [Ajouter]  [🔍]   │
├──────────────────────────────────────────────────────────────┤
│  ☐ │ Nom complet │ Email │ Rôle │ Org │ Statut │ DC │ Actions│
│  ☑ │ Dupont Jean │ j@...│Agent │ACME │🟢 Actif│.. │👁✏🔑🗑│
│  ☐ │ ...          │      │      │      │🔴 Inac.│   │       │
├──────────────────────────────────────────────────────────────┤
│  Filtrer: [▼] [Champ: Nom ▾] [______]  [5 par page ▾] ◀1..3▶│
└──────────────────────────────────────────────────────────────┘
```

### 6 colonnes visibles par défaut + checkbox + actions
| # | Colonne | Type | Visible | Note |
|---|---------|------|---------|------|
| 1 | Checkbox | selection | ✅ | sticky left |
| 2 | Nom complet | text | ✅ | first_name + last_name |
| 3 | Email | email | ✅ | |
| 4 | Rôle | badge | ✅ | role_display avec couleur |
| 5 | Organisation | text | ✅ | |
| 6 | Statut | boolean | ✅ | badge Actif/Inactif/Supprimé |
| 7 | Dernière connexion | date | ✅ | |
| 8 | Actions | icons | ✅ | sticky right |

### 7 colonnes cachées (configurables)
Société, Superuser, Changement MDP, Dernier changement MDP, Date d'inscription, Supprimé, Date de suppression

## 3. 信息架构

### Navigation (8 parcours clés)
1. **Créer** → Modal Add (600px) → Submit → Toast + reload
2. **Consulter** → Modal Detail (800px) → Membreships → Fermer
3. **Modifier** → Modal Detail → Edit → Modal Edit (600px) → Save
4. **Supprimer** → Modal Delete (550px) → Soft-delete → reload
5. **Reset MDP** → Modal Reset Password (400px) → Nouveau MDP + Copier
6. **Colonnes** → Modal Column Config (700px) → Drag & Drop → Save
7. **Export** → Dropdown Export → CSV (Tous / Sélectionnés)
8. **Menu contextuel** → Clic droit colonne (Masquer/Configurer) / Ligne (Détails/Modifier/MDP/Supprimer)

### RBAC
| Action | ROLE_APP_ADMIN | ROLE_ORGANISATION_ADMIN |
|--------|:---:|:---:|
| Voir tous les utilisateurs | ✅ | ❌ (son org seulement) |
| Créer ROLE_APP_ADMIN | ✅ | ❌ |
| Voir colonnes cachées (audit) | ✅ | ❌ |
| Configurer colonnes | ✅ | ✅ |
| Export CSV | ✅ | ✅ |
| Supprimer | ✅ | ✅ (son org) |

## 4. 设计令牌（Design Tokens）

### Palette
```yaml
accent: "#cc5858"          # Rouge corail — boutons, focus, badges admin
success: { text: "#2ecc71", bg: "rgba(46,204,113,0.15)" }    # Agent, Actif
warning: { text: "#f39c12", bg: "rgba(243,156,18,0.15)" }    # Inactif
danger:  { text: "#e74c3c", bg: "rgba(231,76,60,0.15)" }     # Admin, Delete
info:    { text: "#3498db", bg: "rgba(52,152,219,0.15)" }    # Org-Admin
pending: { text: "#9b59b6", bg: "rgba(155,89,182,0.15)" }    # MDP à changer
selection: "rgba(255,193,7,0.15)"                             # Jaune ambré
```

### Typographie
- Display: 26px/1.3 600 / Heading: 22px/1.35 600
- Body: 14px/1.5 400 / Body small: 13px/1.5 400
- Table header: 13px/1.5 600 uppercase
- Badge: 12px/1.5 500
- Famille: Segoe UI, Inter, -apple-system

### Espacement
- Container: 24px / Toolbar gap: 12px / Cell padding: 14px
- PageSize: [5, 8, 10, 20, 50]
- Pagination gap: 4px

### Ombres
- Table wrapper: 0 2px 8px rgba(0,0,0,0.25)
- Context menu: 0 8px 24px rgba(0,0,0,0.15)
- Modal: 0 25px 70px rgba(0,0,0,0.55)

## 5. 视觉风格与氛围

- **Style** : Dark professional admin — cockpit de monitoring
- **Fond** : Body #121212, Cartes #2d2d2d, Texte #ecf0f1
- **Accent unique** : #cc5858 (rouge corail) pour tous les CTA et focus
- **Badges** : 5 couleurs sémantiques (role + status + pending)
- **Modales** : Header gradient #1a1a2e→#16213e, bordure accent, backdrop blur 44px
- **Table** : Sticky header (shadow au scroll) + sticky checkbox/actions

## 6. 动效与微交互

| Animation | Durée | Easing |
|-----------|-------|--------|
| Context menu enter | 150ms scale(0.95→1) | cubic-bezier(0.4,0,0.2,1) |
| Bouton hover | 200ms shadow + bg | ease |
| Icône action hover | 100ms scale(1.1) | ease |
| Modal enter | 300ms translateY(20px) + opacity | ease-out |
| Modal overlay | 200ms opacity + blur(44px) | ease |
| Selection toolbar | 150ms slideDown + opacity | ease |
| Tri colonne | 150ms icône rotation | ease |

### Raccourcis clavier
| Ctrl+K | Ctrl+N | Escape | Ctrl+Shift+E | Ctrl+A |
|--------|--------|--------|--------------|--------|
| Focus search | Add user | Close modal | Export dropdown | Select all |

## 7. 交互规范

- **Debounce** : Search 300ms, Field filter 300ms, Préférences 1000ms
- **Loading** : Spinner overlay sur tableau (cache conservé) 
- **Empty state** : Différencié "Aucun utilisateur" (base vide) vs "Aucun résultat" (filtre)
- **Toast** : Success 2s, Error 4s, Password 5s (copiable)
- **Focus trap** : Dans toutes les modales, Tab cycle interne
- **aria-labels** : Sur toutes les icônes sans texte

## 8. 内容与文案规范

| Concept | Label | Utilisé dans |
|---------|-------|-------------|
| Titre page | `Utilisateurs` | Header |
| CTA principal | `Ajouter un utilisateur` | Toolbar |
| Bouton submit | `Créer l'utilisateur` | Modal Add |
| Export | `Tous les utilisateurs` / `Sélectionnés (X)` | Dropdown |
| Vider | `Réinitialiser les filtres` / `Effacer la recherche` | Empty state |
| Ton | Professionnel, neutre, vous | Partout |

### Messages d'état
- **Empty (no users)**: "Aucun utilisateur pour le moment" + CTA "Ajouter un utilisateur"
- **Empty (filter)**: "Aucun résultat" + "Essayez de modifier vos filtres" + "Réinitialiser les filtres"
- **Loading**: "Chargement des utilisateurs..."
- **Delete**: "suppression logique" (soft-delete, réversible)

## 9. 实现优先级与风险

### P0 — Critique (doit être implémenté)
- [ ] Colonnes configurables (ColumnConfig[] + getVisibleColumns())
- [ ] Filtre par champ (footer menu + input)
- [ ] Export CSV (Tous / Sélectionnés)
- [ ] Menu contextuel colonne (Masquer / Configurer)
- [ ] Menu contextuel ligne amélioré (Copy value + actions)
- [ ] Header 2 lignes avec compteurs
- [ ] Pagination enrichie [5,8,10,20,50] + first/last

### P1 — Important
- [ ] Selection toolbar animée avec actions batch
- [ ] must_change_password comme badge sur statut
- [ ] Sticky checkbox (gauche) + actions (droite)
- [ ] Préférences persistées (localStorage fallback)

### P2 — Amélioration
- [ ] Custom scrollbar
- [ ] Modal Reset Password (remplace confirm() natif)
- [ ] Animation sélection toolbar slideDown
- [ ] Keyboard shortcuts

### Risques identifiés
1. ⚠️ API `/api/v1/users/table-preferences/` non disponible → fallback localStorage
2. ⚠️ API `/api/v1/users/metadata/` non disponible → hardcoder ColumnConfig[]
3. ⚠️ RBAC frontend : AdminGuard trop permissif → renforcer vérification rôle
4. ⚠️ Performance client-side avec >1000 utilisateurs → préparer server-side pagination

---

*Document généré par UI Workflow. 7 analystes consultés. Pour toute question, voir les rapports individuels dans docs/ui-workflow/*.

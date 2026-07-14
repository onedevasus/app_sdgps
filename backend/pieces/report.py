"""
Génération du rapport PDF d'un SSDGPS (Phase 6 — §7.3 du plan de dev).

Assemble en un seul PDF, à l'image du modèle métier mono-session
(`docs/exemples-ssdgps/.../RAPPORTS_SDGPS_PDC.pdf`) :

1. une **page de garde** listant toutes les pièces valides du rapport
   (N° d'ordre, désignation, nombre, observations) ;
2. pour **chaque pièce valide**, une page-séparateur « PIÈCE N°k : … » suivie de
   son contenu — tableau de données (LPA, ROB, RDL/RDN/RDD, RC…), galerie d'images
   (RDC, canevas…) ou photos de points (PPA/PPN).

Le rendu HTML→PDF est confié à WeasyPrint (import différé : le module reste
importable même sans les bibliothèques natives GTK, l'erreur n'apparaît qu'à la
génération effective). Seules les pièces `statut == 'valide'` et non supprimées
sont incluses, dans l'ordre `ordre` du rapport.
"""
import re
from pathlib import Path

from django.template.loader import render_to_string

from .catalog import get_piece_def, catalog_orientation

# Types à base d'images pleine page (galerie plate, sans point rattaché).
IMAGE_TYPES = {'RDC', 'CCSPA', 'CDC', 'CLC'}
# Types « photos de points » (chaque point porte ses clichés + métadonnées).
PHOTO_TYPES = {'PPA', 'PPN'}
# La page de garde est générée par le rapport lui-même : on n'inclut jamais une
# éventuelle pièce PGSDGPS comme pièce numérotée distincte.
EXCLUDED_TYPES = {'PGSDGPS'}

# --- Orientation du contenu des pièces (portrait / paysage) --------------------
# Au-delà de ce nombre de colonnes visibles, le contenu tabulaire passe en paysage
# (Option 2 — calcul automatique par largeur). Ajustable.
ORIENTATION_COLUMN_THRESHOLD = 10
# Types dont l'orientation automatique est TOUJOURS le paysage, indépendamment du
# nombre de colonnes ou de leur nature (image / tableau) : canevas et LPA, plus les
# rapports d'observations/traitement/déterminations/contrôle (RDL/RDN/RDD forcés en
# paysage même sans la version « écarts »).
AUTO_LANDSCAPE_TYPES = {
    'LPA', 'CCSPA', 'CDC', 'CLC',
    'ROB', 'RTLB', 'RFB', 'RDL', 'RDN', 'RDI', 'RDD', 'RC',
}
# Option 1 (règle catalogue par type × nature) : désactivée par défaut. Passer à True
# pour que `catalog.ORIENTATION_CATALOG` l'emporte sur le calcul automatique.
USE_CATALOG_ORIENTATION = False


def _content_column_count(piece) -> int:
    """Nombre de colonnes visibles du contenu tabulaire d'une pièce (tient compte de
    la version « écarts », plus large, quand elle est présente sur CETTE pièce)."""
    d = get_piece_def(piece.type_piece)
    cols = len(d.get('champs') or [])
    if (piece.payload or {}).get('rows_ecarts') and d.get('ecarts_champs'):
        cols = max(cols, len(d['ecarts_champs']))
    return cols


def auto_orientation(piece) -> str:
    """Option 2 — orientation déduite de la largeur des données : types « toujours
    paysage » d'abord (LPA, canevas), puis images/photos en portrait, puis tableaux en
    paysage au-delà du seuil de colonnes, portrait sinon."""
    if piece.type_piece in AUTO_LANDSCAPE_TYPES:
        return 'paysage'
    if piece.type_piece in IMAGE_TYPES or piece.type_piece in PHOTO_TYPES:
        return 'portrait'
    return 'paysage' if _content_column_count(piece) >= ORIENTATION_COLUMN_THRESHOLD else 'portrait'


def default_orientation(piece, ssdgps) -> str:
    """Orientation par défaut (quand la pièce est en mode 'auto') : règle catalogue si
    activée (Option 1), sinon calcul automatique par largeur (Option 2)."""
    if USE_CATALOG_ORIENTATION:
        catalog_val = catalog_orientation(piece.type_piece, ssdgps.nature_ssdgps)
        if catalog_val:
            return catalog_val
    return auto_orientation(piece)


def resolve_orientation(piece, ssdgps) -> str:
    """Orientation effective du CONTENU d'une pièce : override manuel s'il est posé
    ('portrait'/'paysage'), sinon l'orientation par défaut calculée."""
    if piece.orientation in ('portrait', 'paysage'):
        return piece.orientation
    return default_orientation(piece, ssdgps)


def _fmt_date(value) -> str:
    if not value:
        return ''
    return value.strftime('%d/%m/%Y')


def _slug(value) -> str:
    """Nettoie un segment de nom de fichier : les caractères non alphanumériques
    (dont les « / » de « R19000/55 » ou « PDC/GPS ») deviennent des tirets."""
    return re.sub(r'[^0-9A-Za-z._-]+', '-', str(value or '').strip()).strip('-')


def report_filename(ssdgps, session=None) -> str:
    """Nom du fichier PDF du rapport, au format :
    ``RAPPORT_SDGPS_<titre|réquisition>_SD<n>_SDGPS-N<i>_<nature>[_SESSION-N<j>].pdf``.
    Le titre foncier prime sur la réquisition ; le suffixe SESSION n'est ajouté que
    pour un rapport ciblant une session précise."""
    affaire = ssdgps.affaire
    propriete = affaire.propriete
    parts = ['RAPPORT_SDGPS']
    ident = _slug(propriete.id_titre or propriete.id_requisition)
    if ident:
        parts.append(ident)
    parts.append(f'SD{affaire.numero_sd_affaire}')
    parts.append(f'SDGPS-N{ssdgps.numero_ssdgps}')
    parts.append(_slug(ssdgps.nature_ssdgps))
    if session is not None:
        parts.append(f'SESSION-N{session.numero_session}')
    return '_'.join(p for p in parts if p) + '.pdf'


def piece_designation(piece) -> str:
    """Libellé métier d'une pièce pour la page de garde et le séparateur."""
    piece_def = get_piece_def(piece.type_piece)
    nom = piece_def['nom']
    if piece.type_piece == 'RDN' and piece.numero:
        return f"Rapport de la détermination N°{piece.numero}"
    if piece_def.get('repeatable') and piece.numero:
        return f"{nom} n°{piece.numero}"
    return nom


def _file_uri(image) -> str | None:
    """URI ``file://`` absolue exploitable par WeasyPrint ; préfère l'aperçu PNG
    (formats non affichables nativement, ex. TIFF) puis le fichier d'origine."""
    for field in (image.apercu, image.fichier):
        if not field:
            continue
        try:
            path = Path(field.path)
        except (ValueError, NotImplementedError):
            continue
        if path.exists():
            return path.as_uri()
    return None


# Champs en mètres formatés à 2 décimales : coordonnées X/Y (et variantes fixe/calculé)
# et écarts ΔX/ΔY/ΔD. Tous les autres champs en mètres (σx, longueurs, RMS, précisions,
# ΔZ/ΔH/ΔV/Δ3D, tolérance…) sont formatés à 3 décimales. Clé par NOM de champ (le libellé
# est ambigu : « σx(m) » contient « x(m) »).
_TWO_DECIMAL_FIELDS = {
    'x_m', 'y_m',
    'x_m_fixe', 'y_m_fixe', 'x_m_calcule', 'y_m_calcule',
    'delta_x_m', 'delta_y_m', 'delta_d_m',
}


def _meter_decimals(champ) -> int | None:
    """Nombre de décimales à imposer pour une colonne en mètres, ou None si la colonne
    n'est pas en unité mètre (libellé sans « (m) »)."""
    if '(m)' not in (champ.get('label') or '').replace(' ', '').lower():
        return None
    return 2 if champ['name'] in _TWO_DECIMAL_FIELDS else 3


def _format_meters(value, decimals: int):
    """Formate une valeur en mètres avec `decimals` décimales (séparateur décimal « . »,
    milliers séparés par une espace). Les valeurs non numériques (« -- », « Fixe », vide)
    sont renvoyées telles quelles."""
    s = str(value).strip()
    if s == '':
        return value
    cleaned = re.sub(r'\s', '', s)  # retire toutes les espaces (dont insécables) servant de séparateur de milliers
    if ',' in cleaned and '.' not in cleaned:   # virgule décimale « à la française »
        cleaned = cleaned.replace(',', '.')
    else:
        cleaned = cleaned.replace(',', '')
    try:
        num = float(cleaned)
    except ValueError:
        return value
    return f"{num:,.{decimals}f}".replace(',', ' ')


def _merge_fields(type_piece, version):
    """Colonnes à fusionner verticalement (cellules de valeurs consécutives identiques,
    par groupe tenu sur une même page) selon la pièce et la version du tableau
    ('brut' = tableau principal, 'ecarts')."""
    if version == 'brut':
        if type_piece == 'RDIA':
            return ('determination',)
        if type_piece == 'RC':
            return ('nom_point_fixe',)
    elif version == 'ecarts':
        if type_piece == 'RDN':
            return ('nom_point_fixe',)
        if type_piece == 'RDIA':
            return ('determination', 'nom_point_fixe')
    return ()


def _table_cells(champs, rows):
    """Colonnes gardées (colonnes entièrement vides retirées) + lignes de cellules
    formatées (valeurs en mètres arrondies via `_meter_decimals`). Ne fait aucune
    fusion ni pagination : c'est la base commune aux deux passes de rendu."""
    def _nonempty(v):
        return v is not None and str(v).strip() != ''

    kept = [c for c in champs if any(_nonempty(row.get(c['name'])) for row in rows)] or list(champs)
    columns = [{'name': c['name'], 'label': c['label'], 'num': c.get('type') == 'number'}
               for c in kept]
    decimals = {c['name']: _meter_decimals(c) for c in kept}
    flat = []
    for row in rows:
        cells = []
        for c in kept:
            value = row.get(c['name'], '')
            if decimals[c['name']] is not None:
                value = _format_meters(value, decimals[c['name']])
            cells.append({'value': value, 'num': c.get('type') == 'number', 'name': c['name']})
        flat.append(cells)
    return columns, flat


def _cellval(cells, field):
    for c in cells:
        if c['name'] == field:
            return str(c['value'])
    return ''


def flat_blocks(tables):
    """Blocs « à plat » : un bloc par tableau, TOUTES les lignes, sans fusion ni saut de
    page. Chaque ligne porte un `rid` (index global) → utilisé (1) pour la passe de sonde
    qui découvre la pagination naturelle, (2) comme rendu final des pièces non fusionnées."""
    blocks, rid = [], 0
    for tbl in tables:
        rows = []
        for cells in tbl['flat']:
            rows.append({'zebra': 'z%d' % (rid % 2), 'rid': rid, 'cells': cells})
            rid += 1
        blocks.append({'title': tbl['title'], 'columns': tbl['columns'], 'merged': False,
                       'break_before': False, 'groups': [{'rows': rows}]})
    return blocks


def paged_blocks(tables, row_pages):
    """Blocs finaux à partir de la pagination réelle `row_pages` (rid → n° de page trouvé
    par la sonde). Chaque tableau est redécoupé par PAGE ; dans chaque segment de page les
    `merge_fields` sont fusionnés (rowspan). Saut de page uniquement au changement de page
    → les pages se remplissent naturellement (brut et écarts peuvent partager une page).
    Le zébrage des lignes suit l'index global ; les cellules fusionnées alternent leur
    teinte par groupe (`mz0`/`mz1`)."""
    from itertools import groupby
    blocks, rid, prev_page, gcount = [], 0, None, 0
    for tbl in tables:
        merge = [f for f in tbl['merge'] if f in {c['name'] for c in tbl['columns']}]
        trows = []
        for cells in tbl['flat']:
            trows.append({'rid': rid, 'page': row_pages.get(rid, 0), 'cells': cells})
            rid += 1
        first_seg = True
        for page, seg in groupby(trows, key=lambda r: r['page']):
            seg = list(seg)
            groups = []
            if merge:
                for _, grp in groupby(seg, key=lambda r: tuple(_cellval(r['cells'], f) for f in merge)):
                    grp = list(grp)
                    mz = 'mz%d' % (gcount % 2)
                    gcount += 1
                    grows = []
                    for i, row in enumerate(grp):
                        cells = []
                        for cell in row['cells']:
                            c = dict(cell)
                            if cell['name'] in merge:
                                if i == 0:
                                    c['rowspan'] = len(grp)
                                    c['merged'] = True
                                    c['mz'] = mz
                                else:
                                    c['skip'] = True
                            cells.append(c)
                        grows.append({'zebra': 'z%d' % (row['rid'] % 2), 'rid': row['rid'], 'cells': cells})
                    groups.append({'rows': grows})
            else:
                groups = [{'rows': [{'zebra': 'z%d' % (r['rid'] % 2), 'rid': r['rid'], 'cells': r['cells']}
                                    for r in seg]}]
            blocks.append({
                'title': tbl['title'] if first_seg else '',
                'columns': tbl['columns'], 'merged': bool(merge),
                'break_before': prev_page is not None and page != prev_page,
                'groups': groups,
            })
            prev_page, first_seg = page, False
    return blocks


def _piece_content(piece):
    """Modèle de rendu du contenu d'une pièce : tableaux (liste `tables` « à plat », la
    pagination/fusion est décidée ensuite par `flat_blocks`/`paged_blocks`), images, photos."""
    piece_def = get_piece_def(piece.type_piece)
    payload = piece.payload or {}
    content = {'tables': [], 'images': [], 'photos': [], 'kind': 'empty'}

    if piece.type_piece in PHOTO_TYPES:
        content['kind'] = 'photos'
        rows = payload.get('rows') or []
        images = list(piece.images.all())
        by_ref = {}
        for img in images:
            by_ref.setdefault((img.point_ref or '').strip(), []).append(img)
        used = set()
        meta_fields = [c for c in piece_def['champs'] if c['name'] not in ('id', 'fichier_image')]
        for row in rows:
            keys = [str(row.get('id', '')).strip(), str(row.get('nom_point', '')).strip()]
            pics = []
            for key in keys:
                if key and key in by_ref and key not in used:
                    pics.extend(by_ref[key])
                    used.add(key)
            uris = [u for u in (_file_uri(i) for i in pics) if u]
            content['photos'].append({
                'nom_point': row.get('nom_point', '') or row.get('id', ''),
                'meta': [(c['label'], row.get(c['name'], '')) for c in meta_fields],
                'images': uris,
            })
        # Photos non rattachées à un point identifié.
        orphan = []
        for ref, pics in by_ref.items():
            if ref in used:
                continue
            orphan.extend(pics)
        orphan_uris = [u for u in (_file_uri(i) for i in orphan) if u]
        if orphan_uris:
            content['photos'].append({'nom_point': 'Photos non rattachées', 'meta': [],
                                      'images': orphan_uris})
        return content

    if piece.type_piece in IMAGE_TYPES:
        content['kind'] = 'images'
        content['images'] = [u for u in (_file_uri(i) for i in piece.images.all()) if u]
        return content

    # Pièces tabulaires : tableau brut (principal) + éventuel tableau « écarts ». Les
    # tableaux sont préparés « à plat » ; la fusion et la pagination sont appliquées
    # ensuite (flat_blocks / paged_blocks) — la mise en pages fusionnée nécessite une
    # passe de sonde pour connaître les sauts de page réels (cf. render_report_pdf).
    rows = payload.get('rows') or []
    if rows and piece_def.get('champs'):
        content['kind'] = 'table'
        columns, flat = _table_cells(piece_def['champs'], rows)
        content['tables'].append({'title': '', 'columns': columns, 'flat': flat,
                                  'merge': _merge_fields(piece.type_piece, 'brut')})
    rows_ecarts = payload.get('rows_ecarts') or []
    if rows_ecarts and piece_def.get('ecarts_champs'):
        content['kind'] = 'table'
        columns, flat = _table_cells(piece_def['ecarts_champs'], rows_ecarts)
        content['tables'].append({'title': 'Écarts par rapport à la détermination définitive',
                                  'columns': columns, 'flat': flat,
                                  'merge': _merge_fields(piece.type_piece, 'ecarts')})
    for tbl in content['tables']:
        tbl['merged'] = bool(tbl['merge'])
    return content


def build_report_context(ssdgps, session, pieces):
    """Assemble le contexte de rendu du template `pieces/report.html`."""
    affaire = ssdgps.affaire
    propriete = affaire.propriete
    projet = propriete.projet
    organization = projet.organization

    nature_affaire = affaire.nature_affaire or ''
    if affaire.date_bornage:
        nature_affaire = f"{nature_affaire} du {_fmt_date(affaire.date_bornage)}".strip()

    header = {
        'organization': (organization.name if organization else '').upper(),
        'propriete': propriete.nom_propriete or '',
        'requisition': propriete.id_requisition or '',
        'titre': propriete.id_titre or '',
        'nature_affaire': nature_affaire,
        'nature_ssdgps': ssdgps.nature_ssdgps or '',
        'numero_ssdgps': ssdgps.numero_ssdgps,
        'session_numero': session.numero_session if session else None,
        'session_date': _fmt_date(session.date_session) if session else '',
        'projet': f"{projet.code_projet} — {projet.nom_projet}",
    }

    cover_rows, rendered = [], []
    for index, piece in enumerate(pieces, start=1):
        designation = piece_designation(piece)
        cover_rows.append({
            'ordre': index,
            'designation': designation,
            'nombre': 1,
            'observations': (piece.commentaire or '').strip(),
        })
        rendered.append({
            'index': index,
            'title': designation.upper(),
            'code': piece.type_piece,
            'content': _piece_content(piece),
            'content_landscape': resolve_orientation(piece, ssdgps) == 'paysage',
        })

    return {
        'header': header,
        'cover_rows': cover_rows,
        'total': len(cover_rows),
        'pieces': rendered,
    }


def render_report_pdf(ssdgps, session, pieces):
    """Rend le rapport en PDF (bytes). Lève `RuntimeError` si WeasyPrint (ou ses
    bibliothèques natives) n'est pas disponible sur l'environnement d'exécution.

    Chaque « unité » (page de garde, séparateur de pièce, contenu de pièce) est rendue
    comme un document WeasyPrint indépendant, puis les pages sont fusionnées en un seul
    PDF. Ce découpage est indispensable pour que la numérotation « PAGE N°k » du bas de
    page reparte de 1 au contenu de chaque pièce (le compteur `page` de WeasyPrint est
    global à un document et ne peut être réinitialisé par `counter-reset`)."""
    try:
        from weasyprint import HTML
    except (ImportError, OSError) as exc:  # OSError : bibliothèques GTK absentes
        raise RuntimeError(
            "La génération PDF requiert WeasyPrint et ses bibliothèques natives "
            f"(GTK/Pango/Cairo). Détail : {exc}"
        ) from exc

    context = build_report_context(ssdgps, session, pieces)
    base = {'header': context['header']}

    # Préfixe commun du pied de page : « <titre|réquisition> SD<n> SDGPS N°<i> ».
    propriete = ssdgps.affaire.propriete
    ident = (propriete.id_titre or propriete.id_requisition or '').strip()
    foot_base = ' '.join(p for p in (
        ident, f'SD{ssdgps.affaire.numero_sd_affaire}', f'SDGPS N°{ssdgps.numero_ssdgps}',
    ) if p)

    def _render(mode, foot_prefix, extra):
        html = render_to_string('pieces/report.html',
                                {**base, 'mode': mode, 'foot_prefix': foot_prefix, **extra})
        return HTML(string=html).render()

    def _probe_row_pages(doc):
        """Associe chaque ligne de tableau (attribut data-row) à son n° de page réel,
        en parcourant l'arbre de boîtes de la mise en pages WeasyPrint."""
        row_pages = {}

        def walk(box):
            yield box
            for child in getattr(box, 'children', ()) or ():
                yield from walk(child)

        for pnum, page in enumerate(doc.pages):
            for box in walk(page._page_box):
                el = getattr(box, 'element', None)
                if el is not None and getattr(el, 'tag', None) == 'tr':
                    rid = el.get('data-row')
                    if rid not in (None, ''):
                        row_pages.setdefault(int(rid), pnum)
        return row_pages

    def _piece_doc(piece, foot_prefix):
        """Rend le contenu d'une pièce. Si elle comporte un tableau fusionné, on rend
        d'abord une passe « à plat » (sonde) pour connaître la pagination naturelle, puis
        la passe finale où la fusion est recalculée par page réelle → pages bien remplies."""
        content = piece['content']
        tables = content.get('tables') or []
        if content.get('kind') == 'table' and any(t['merged'] for t in tables):
            probe = _render('piece', foot_prefix,
                            {'piece': {**piece, 'content': {**content, 'blocks': flat_blocks(tables)}}})
            blocks = paged_blocks(tables, _probe_row_pages(probe))
        else:
            blocks = flat_blocks(tables)
        return _render('piece', foot_prefix,
                       {'piece': {**piece, 'content': {**content, 'blocks': blocks}}})

    # (1) Page de garde du SDGPS — pied sans « PIÈCE N° ».
    documents = [_render('cover', foot_base,
                         {'cover_rows': context['cover_rows'], 'total': context['total']})]
    # (2) Une pièce = un document (séparateur + contenu) → PAGE N°k/n numérote la pièce.
    for piece in context['pieces']:
        foot_prefix = f"{foot_base} PIÈCE N°{piece['index']}"
        documents.append(_piece_doc(piece, foot_prefix))

    all_pages = [page for doc in documents for page in doc.pages]
    return documents[0].copy(all_pages).write_pdf()

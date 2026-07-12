"""
Calcul automatique du tableau de la pièce « Rapport de contrôle » (RC).

Le RC croise deux pièces sources :
- « Liste des points anciens » (LPA)   → coordonnées FIXES (vraies) des points anciens ;
- « Rapports de la détermination N°k » (RDN, une par détermination intermédiaire nk)
  → coordonnées CALCULÉES des points dans chaque détermination.

Points de contrôle = points anciens tenus FIXES dans au moins une détermination (les
seuls « points anciens utilisés »). Pour chaque détermination ni (point fixe F_i) et chaque
point de contrôle P (Nom Point Calculé), on compare la coordonnée LPA de P (fixe) à sa
coordonnée calculée dans ni :
    ΔX = X_fixe − X_calculé,  ΔY = Y_fixe − Y_calculé,  ΔD = √(ΔX² + ΔY²)
Pour la ligne où P == F_i (le point fixe lui-même), les écarts valent « -- ».
"""
import math

DASH = '--'
_SPACES = (' ', ' ', ' ', ' ')  # nbsp, narrow-nbsp, thin space, espace


def _to_float(value):
    """« 353 108.16 » / « 353 108,16 » → 353108.16 ; None si non numérique."""
    if value is None:
        return None
    t = str(value)
    for sp in _SPACES:
        t = t.replace(sp, '')
    t = t.replace(',', '.').strip()
    if t in ('', DASH, '?'):
        return None
    try:
        return float(t)
    except ValueError:
        return None


def _fixed_point(det_rows):
    """Nom du point tenu fixe (σx ou σy == « FIXE ») dans une détermination."""
    for r in det_rows:
        sx = str(r.get('sigma_x_m', '')).strip().upper()
        sy = str(r.get('sigma_y_m', '')).strip().upper()
        if sx == 'FIXE' or sy == 'FIXE':
            return str(r.get('nom_point', '')).strip()
    return None


def compute_ecarts_vs_definitive(piece_rows, rdd_rows):
    """
    Deuxième version « écarts » d'une pièce RDL / RDN.

    Pour chaque point P de la pièce (version brute), compare sa coordonnée définitive
    (RDD, « supposée vraie » → Fixe) à sa coordonnée calculée dans la pièce (Calculé) :
        ΔX = X_fixe − X_calculé,  ΔY = Y_fixe − Y_calculé,  ΔD = √(ΔX² + ΔY²)
    piece_rows / rdd_rows : list[dict] (clés `nom_point`, `x_m`, `y_m`, `sigma_x_m`,
    `sigma_y_m`). Retourne list[dict] au schéma _ECARTS_CHAMPS (catalog.py). Les points
    absents du RDD sont ignorés.

    `nom_point_fixe` = nom(s) du/des point(s) tenu(s) FIXE dans la détermination courante
    (constant pour toutes les lignes) : vide pour une détermination libre (RDL, aucun point
    fixe), un ou plusieurs noms pour une détermination intermédiaire (RDN).
    """
    rdd = {}
    for r in rdd_rows:
        n = str(r.get('nom_point', '')).strip()
        if n and n not in rdd:
            rdd[n] = (r.get('x_m'), r.get('y_m'))

    # Point(s) fixe(s) de la détermination : σx ou σy == « FIXE » (ordre d'apparition).
    fixes = []
    for r in piece_rows:
        sx = str(r.get('sigma_x_m', '')).strip().upper()
        sy = str(r.get('sigma_y_m', '')).strip().upper()
        if sx == 'FIXE' or sy == 'FIXE':
            n = str(r.get('nom_point', '')).strip()
            if n and n not in fixes:
                fixes.append(n)
    fixes_label = ', '.join(fixes)

    out = []
    idx = 1
    for r in piece_rows:
        p = str(r.get('nom_point', '')).strip()
        if not p or p not in rdd:
            continue
        fx, fy = rdd[p]
        cx, cy = r.get('x_m'), r.get('y_m')
        fxv, fyv, cxv, cyv = _to_float(fx), _to_float(fy), _to_float(cx), _to_float(cy)
        if None in (fxv, fyv, cxv, cyv):
            dx = dy = dd = ''
        else:
            ddx, ddy = fxv - cxv, fyv - cyv
            dx = f'{ddx:.2f}'
            dy = f'{ddy:.2f}'
            dd = f'{math.hypot(ddx, ddy):.2f}'
        out.append({
            'id': str(idx),
            'nom_point_fixe': fixes_label,
            'nom_point_calcule': p,
            'x_m_fixe': fx, 'y_m_fixe': fy,
            'x_m_calcule': cx, 'y_m_calcule': cy,
            'delta_x_m': dx, 'delta_y_m': dy, 'delta_d_m': dd,
        })
        idx += 1
    return out


def assemble_determinations(sources):
    """
    Assemble plusieurs déterminations (RDL + RDNₖ) en un tableau brut unique (RDIA).
    sources : list ordonnée de {'label': str, 'rows': list[dict]} — `label` = « Libre »,
    « N°1 », « N°2 »… `rows` = payload brut de chaque détermination.
    Retourne list[dict] au schéma _RDIA_BRUT_CHAMPS (colonne `determination`, `id` global).
    """
    out = []
    idx = 1
    for src in sources:
        label = src.get('label', '')
        for r in src.get('rows') or []:
            out.append({
                'id': str(idx),
                'determination': label,
                'nom_point': r.get('nom_point', ''),
                'x_m': r.get('x_m', ''),
                'sigma_x_m': r.get('sigma_x_m', ''),
                'y_m': r.get('y_m', ''),
                'sigma_y_m': r.get('sigma_y_m', ''),
            })
            idx += 1
    return out


def compute_ecarts_assembled(brut_rows, rdd_rows):
    """
    Version « écarts » d'une pièce assemblée (RDIA) : calcule les écarts vs RDD
    détermination PAR détermination (bloc `determination`), en conservant l'ordre des
    blocs et la colonne `determination`. Réutilise compute_ecarts_vs_definitive par bloc.
    Retourne list[dict] au schéma _RDIA_ECARTS_CHAMPS.
    """
    groups = []  # [(label, [rows])] dans l'ordre d'apparition
    pos = {}
    for r in brut_rows:
        label = str(r.get('determination', '')).strip()
        if label not in pos:
            pos[label] = len(groups)
            groups.append((label, []))
        groups[pos[label]][1].append(r)

    out = []
    idx = 1
    for label, rows in groups:
        for b in compute_ecarts_vs_definitive(rows, rdd_rows):
            row = {'id': str(idx), 'determination': label}
            for k, v in b.items():
                if k != 'id':
                    row[k] = v
            out.append(row)
            idx += 1
    return out


def compute_rapport_controle(lpa_rows, determinations):
    """
    lpa_rows : list[dict] du LPA (clés `nom_point`, `x_m`, `y_m`).
    determinations : list[dict] {'numero', 'rows'} des RDN, triées par numéro.
    Retourne list[dict] au schéma RC (_RC_CHAMPS de catalog.py).
    """
    lpa = {}
    for r in lpa_rows:
        name = str(r.get('nom_point', '')).strip()
        if name and name not in lpa:
            lpa[name] = (r.get('x_m'), r.get('y_m'))

    # Détermination → (point fixe, {nom_point: (x, y) calculés}).
    det_info = []
    control = []  # points de contrôle = points fixes (points anciens) dans l'ordre des déterminations
    for det in determinations:
        rows = det.get('rows') or []
        fname = _fixed_point(rows)
        calc = {}
        for r in rows:
            n = str(r.get('nom_point', '')).strip()
            if n and n not in calc:
                calc[n] = (r.get('x_m'), r.get('y_m'))
        det_info.append((fname, calc))
        if fname and fname in lpa and fname not in control:
            control.append(fname)

    out = []
    idx = 1
    for fname, calc in det_info:
        if not fname or fname not in lpa:
            continue
        for pj in control:
            fixe = lpa.get(pj)
            calc_xy = calc.get(pj)
            if fixe is None or calc_xy is None:
                continue
            fx, fy = fixe
            cx, cy = calc_xy
            if pj == fname:
                dx = dy = dd = DASH
            else:
                fxv, fyv, cxv, cyv = _to_float(fx), _to_float(fy), _to_float(cx), _to_float(cy)
                if None in (fxv, fyv, cxv, cyv):
                    dx = dy = dd = ''
                else:
                    ddx, ddy = fxv - cxv, fyv - cyv
                    dx = f'{ddx:.2f}'
                    dy = f'{ddy:.2f}'
                    dd = f'{math.hypot(ddx, ddy):.2f}'
            out.append({
                'id': str(idx),
                'nom_point_fixe': fname,
                'nom_point_calcule': pj,
                'x_m_fixe': fx, 'y_m_fixe': fy,
                'x_m_calcule': cx, 'y_m_calcule': cy,
                'delta_x_m': dx, 'delta_y_m': dy, 'delta_d_m': dd,
            })
            idx += 1
    return out

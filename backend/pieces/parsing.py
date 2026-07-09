"""Lecture des fichiers CSV/Excel uploadés — aucune dépendance front (pas de papaparse/xlsx JS)."""
import csv
import io
import os

from django.conf import settings

# .xls (legacy) volontairement hors scope v1 : openpyxl ne le lit pas, et xlrd ne
# supporte plus xlsx — dépendance supplémentaire pour un format en voie de disparition.
SUPPORTED_EXTENSIONS = {'.csv', '.xlsx'}


def parse_uploaded_table(file_obj):
    """
    Retourne (columns: list[str], rows: list[list[str]]).
    Lève ValueError si le format n'est pas supporté ou si le fichier est vide/corrompu.
    """
    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Format « {ext} » non supporté. Utilisez un fichier .csv ou .xlsx.")
    if ext == '.csv':
        return _parse_csv(file_obj)
    return _parse_xlsx(file_obj)


def _parse_csv(file_obj):
    file_obj.seek(0)
    raw = file_obj.read()
    text = None
    for encoding in ('utf-8-sig', 'utf-8', 'latin-1'):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise ValueError("Encodage du fichier CSV non reconnu.")
    sample = text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=';,\t')
    except csv.Error:
        dialect = csv.excel
        dialect.delimiter = ';'
    reader = csv.reader(io.StringIO(text), dialect)
    all_rows = [row for row in reader if any(cell.strip() for cell in row)]
    if not all_rows:
        raise ValueError("Fichier CSV vide.")
    return all_rows[0], all_rows[1:]


def _parse_xlsx(file_obj):
    import openpyxl
    file_obj.seek(0)
    wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    try:
        header_row = next(rows_iter)
    except StopIteration:
        raise ValueError("Fichier Excel vide.")
    header = [str(c) if c is not None else '' for c in header_row]
    data_rows = []
    max_rows = getattr(settings, 'PIECE_IMPORT_MAX_ROWS', 5000)
    for i, row in enumerate(rows_iter):
        if i >= max_rows:
            raise ValueError(f"Fichier trop volumineux (> {max_rows} lignes).")
        if any(c is not None for c in row):
            data_rows.append(['' if c is None else str(c) for c in row])
    return header, data_rows


def apply_mapping(columns, rows, mapping):
    """
    mapping: {target_field: source_column_name}. Colonnes source absentes du mapping
    sont ignorées ; champs cibles absents du mapping reçoivent None.
    Retourne list[dict] indexé par nom de champ cible.
    """
    index_by_col = {name: i for i, name in enumerate(columns)}
    out = []
    for row in rows:
        entry = {}
        for target_field, source_col in mapping.items():
            idx = index_by_col.get(source_col)
            entry[target_field] = row[idx] if idx is not None and idx < len(row) else None
        out.append(entry)
    return out

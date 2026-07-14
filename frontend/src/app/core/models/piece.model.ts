/**
 * Modèles des pièces d'un rapport SSDGPS (Phase 6.5).
 * Miroir exact de `backend/pieces/catalog.py` et `backend/pieces/serializers.py`.
 */

export type PieceTypeCode =
  | 'PGSDGPS' | 'RDC' | 'LPA' | 'CCSPA' | 'CDC' | 'CLC' | 'PPA' | 'PPN' | 'FTR'
  | 'ROB' | 'RTLB' | 'RFB' | 'RDL' | 'RDN' | 'RDI' | 'RDD' | 'RC';

export type PieceNiveau = 'ssdgps' | 'session';
export type PieceSource = 'ui' | 'image' | 'csv_manuel' | 'image_csv_manuel' | 'manuel' | 'calcul';
export type PieceSourceSaisie = 'manuel' | 'import' | 'image' | 'ui';
export type PieceStatut = 'brouillon' | 'valide' | 'rejete';
export type PieceChampType = 'text' | 'number' | 'date' | 'textarea';
export type PiecePortee = 'ssdgps' | 'session';

export interface PieceChampDef {
  name: string;
  label: string;
  type: PieceChampType;
}

export interface PieceTypeDef {
  code: PieceTypeCode;
  nom: string;
  niveau: PieceNiveau;
  source: PieceSource;
  natures: 'toutes' | string[];
  champs: PieceChampDef[];
  repeatable: boolean;
  html_import?: boolean;
  /** RC : tableau calculé automatiquement (depuis LPA + déterminations). */
  computed?: boolean;
  /** RDL/RDN/RDIA : 2ᵉ version « écarts » calculable (brute vs détermination définitive). */
  ecarts?: boolean;
  /** Colonnes de la version « écarts » (si `ecarts`). */
  ecarts_champs?: PieceChampDef[];
  /** RDIA : pièce assemblée depuis les déterminations RDL/RDNₖ du dossier. */
  assemble?: boolean;
}

export interface PieceImage {
  id: number;
  fichier_url: string | null;
  apercu_url: string | null;
  ordre: number;
  point_ref: string;
  format: string;
  taille_octets: number;
  largeur: number;
  hauteur: number;
  mode_couleur: string;
  compression: string;
  date_creation: string | null;
  date_modification: string | null;
  created_at: string;
}

export interface Piece {
  id: string;
  type_piece: PieceTypeCode;
  type_piece_display?: string;
  numero?: number | null;
  ssdgps: string;
  session?: string | null;
  session_numero?: number | null;
  niveau?: PieceNiveau;
  portee?: PiecePortee;
  ordre: number;
  fichier?: string | null;
  fichier_url?: string | null;
  images?: PieceImage[];
  payload: { rows?: any[]; [key: string]: any };
  source_saisie: PieceSourceSaisie;
  statut: PieceStatut;
  /** Orientation du contenu dans le rapport PDF : 'auto' = calculée automatiquement. */
  orientation?: 'auto' | 'portrait' | 'paysage';
  /** Orientation réellement appliquée (résout le mode 'auto'). Lecture seule. */
  orientation_effective?: 'portrait' | 'paysage';
  commentaire?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_by_email?: string;
  updated_by_email?: string;
  deleted_by_email?: string;
}

export interface PieceImportPreview {
  columns: string[];
  preview_rows: string[][];
  total_rows: number;
  champs: PieceChampDef[];
}

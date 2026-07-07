/**
 * Modèles du domaine métier SDGPS (Phase 5).
 * Hiérarchie : Projet → Propriété → Affaire (SD) → SSDGPS → Session.
 */

export type ProjetStatut = 'brouillon' | 'en_cours' | 'cloture' | 'archive';

export interface Projet {
  id: string;
  nom_projet: string;
  description_projet?: string;
  code_projet: string;
  organization: string;
  organization_name?: string;
  statut: ProjetStatut;
  statut_display?: string;
  proprietes_count?: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface Propriete {
  id: string;
  nom_propriete: string;
  id_requisition?: string;
  id_titre?: string;
  projet: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export type NatureProcedure =
  | 'IFF' | 'IFE' | 'IFR'
  | 'PS_FORET' | 'PS_COLLECTIF' | 'PS_EXPROPRIATION' | 'AS';

export type NatureAffaire =
  | 'BI' | 'BC' | 'IFE' | 'IFR' | 'RB'
  | 'MEC' | 'MT' | 'FS' | 'MT-FS' | 'LOT' | 'COP';

export interface Affaire {
  id: string;
  numero_sd_affaire: number;
  nature_procedure_affaire: NatureProcedure;
  nature_affaire: NatureAffaire;
  date_bornage?: string | null;
  propriete: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export type NatureSsdgps = 'PDC/GPS' | 'DDC/GPS' | 'PLC/GPS' | 'DLC/GPS';
export type TypeSsdgps = 'mono-session' | 'multi-session';

export interface Ssdgps {
  id: string;
  nature_ssdgps: NatureSsdgps;
  numero_ssdgps: number;
  type_ssdgps: TypeSsdgps;
  affaire: string;
  sessions_count?: number;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface Session {
  id: string;
  ssdgps: string;
  numero_session: number;
  date_session?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

// --- Options / libellés pour les <select> -----------------------------------

export const STATUT_OPTIONS: { value: ProjetStatut; label: string }[] = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'cloture', label: 'Clôturé' },
  { value: 'archive', label: 'Archivé' },
];

export const PROCEDURE_OPTIONS: { value: NatureProcedure; label: string }[] = [
  { value: 'IFF', label: "IFF — Immatriculation Foncière Facultative" },
  { value: 'IFE', label: "IFE — Immatriculation Foncière d'Ensemble" },
  { value: 'IFR', label: "IFR — Immatriculation Foncière de Remembrement" },
  { value: 'PS_FORET', label: 'PS Forêt' },
  { value: 'PS_COLLECTIF', label: 'PS Collectif' },
  { value: 'PS_EXPROPRIATION', label: 'PS Expropriation' },
  { value: 'AS', label: 'AS — Affaires subséquentes' },
];

export const NATURE_AFFAIRE_LABELS: Record<NatureAffaire, string> = {
  BI: "Bornage d'immatriculation",
  BC: 'Bornage complémentaire',
  IFE: "Immatriculation Foncière d'Ensemble",
  IFR: 'Immatriculation Foncière de Remembrement',
  RB: 'Recollement de bornage',
  MEC: 'Mise en Concordance',
  MT: 'Morcellement',
  FS: 'Fusion',
  'MT-FS': 'Morcellement-Fusion',
  LOT: 'Lotissement',
  COP: 'Copropriété',
};

/** Natures d'affaire autorisées selon la procédure (miroir du backend). */
export const PROCEDURE_NATURES: Record<NatureProcedure, NatureAffaire[]> = {
  IFF: ['BI', 'BC'],
  IFE: ['IFE'],
  IFR: ['IFR'],
  PS_FORET: ['RB'],
  PS_COLLECTIF: ['RB'],
  PS_EXPROPRIATION: ['RB'],
  AS: ['MEC', 'MT', 'FS', 'MT-FS', 'LOT', 'COP'],
};

/** Procédures pour lesquelles date_bornage n'est pas définie. */
export const PROCEDURES_SANS_DATE_BORNAGE: NatureProcedure[] = ['IFE', 'IFR'];

export const NATURE_SSDGPS_OPTIONS: { value: NatureSsdgps; label: string }[] = [
  { value: 'PDC/GPS', label: 'PDC/GPS — Projet de densification cadastrale' },
  { value: 'DDC/GPS', label: 'DDC/GPS — Dossier de densification cadastrale' },
  { value: 'PLC/GPS', label: 'PLC/GPS — Projet de levé cadastral' },
  { value: 'DLC/GPS', label: 'DLC/GPS — Dossier de levé cadastral' },
];

export const TYPE_SSDGPS_OPTIONS: { value: TypeSsdgps; label: string }[] = [
  { value: 'mono-session', label: 'Mono-session' },
  { value: 'multi-session', label: 'Multi-session' },
];

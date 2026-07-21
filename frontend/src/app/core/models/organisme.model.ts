/**
 * Organismes du rapport SDGPS (registre administratif, hors multi-locataire).
 * - Niveau 1 : organisme central (ex. ANCFCC).
 * - Niveau 2 : entité décentralisée rattachée à un organisme de premier niveau.
 */
export interface OrganismeNiveau1 {
  id: string;
  code: string;
  nom: string;
  sigle?: string;
  is_active: boolean;
  is_deleted?: boolean;
  nbr_niveaux2?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  created_by_email?: string;
  updated_by_email?: string;
  deleted_by_email?: string;
}

export interface OrganismeNiveau2 {
  id: string;
  code: string;
  nom: string;
  sigle?: string;
  ville?: string;
  niveau1: string;          // UUID de l'organisme de premier niveau
  niveau1_nom?: string;     // libellé (lecture)
  is_active: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  created_by_email?: string;
  updated_by_email?: string;
  deleted_by_email?: string;
}

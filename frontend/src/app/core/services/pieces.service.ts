import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Piece, PieceImage, PieceImportPreview, PieceTypeDef } from '../models/piece.model';

interface PieceParent {
  ssdgps?: string;
  session?: string;
}

/** Service CRUD + import des pièces (Phase 6.5). Calqué sur ProjectsService. */
@Injectable({ providedIn: 'root' })
export class PiecesService {
  private base = `${environment.apiUrl}/v1/pieces/`;

  constructor(private http: HttpClient) {}

  getCatalog(): Observable<PieceTypeDef[]> {
    return this.http.get<PieceTypeDef[]>(`${this.base}catalog/`);
  }

  private list(params: Record<string, any>): Observable<Piece[]> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== null && params[k] !== undefined && params[k] !== '') {
        httpParams = httpParams.set(k, params[k]);
      }
    });
    return this.http.get<any>(this.base, { params: httpParams }).pipe(
      map(res => Array.isArray(res) ? res : (res?.results ?? []))
    );
  }

  listBySsdgps(ssdgpsId: string, showDeleted = false): Observable<Piece[]> {
    return this.list({ ssdgps: ssdgpsId, show_deleted: showDeleted || undefined });
  }

  listBySession(sessionId: string, showDeleted = false): Observable<Piece[]> {
    return this.list({ session: sessionId, show_deleted: showDeleted || undefined });
  }

  /** Récupère une pièce par son id (endpoint retrieve du ModelViewSet) — utile pour
   * l'accès direct (deep-link) à la page d'édition. */
  getById(id: string): Observable<Piece> {
    return this.http.get<Piece>(`${this.base}${id}/`);
  }

  createManual(payload: {
    type_piece: string; parent: PieceParent; numero?: number;
    data: { rows: any[] };
  }): Observable<Piece> {
    return this.http.post<Piece>(this.base, {
      type_piece: payload.type_piece,
      ssdgps: payload.parent.ssdgps || null,
      session: payload.parent.session || null,
      numero: payload.numero ?? null,
      source_saisie: 'manuel',
      payload: payload.data,
    });
  }

  uploadImage(file: File, typePiece: string, parent: PieceParent, numero?: number): Observable<Piece> {
    const formData = new FormData();
    formData.append('type_piece', typePiece);
    if (parent.ssdgps) formData.append('ssdgps', parent.ssdgps);
    if (parent.session) formData.append('session', parent.session);
    if (numero != null) formData.append('numero', String(numero));
    formData.append('source_saisie', 'image');
    formData.append('fichier', file, file.name);
    return this.http.post<Piece>(this.base, formData);
  }

  /** Crée une pièce à base d'image sans fichier (la galerie est alimentée ensuite via addImages). */
  createImagePiece(typePiece: string, parent: PieceParent, numero?: number): Observable<Piece> {
    return this.http.post<Piece>(this.base, {
      type_piece: typePiece,
      ssdgps: parent.ssdgps || null,
      session: parent.session || null,
      numero: numero ?? null,
      source_saisie: 'image',
    });
  }

  /** Ajoute plusieurs images à une pièce ; transmet le lastModified navigateur par fichier.
   * `pointRef` (PPA/PPN) rattache tout le lot à un point. */
  addImages(pieceId: string, files: File[], pointRef?: string): Observable<Piece> {
    const formData = new FormData();
    files.forEach(f => {
      formData.append('fichiers', f, f.name);
      formData.append('last_modified', String(f.lastModified));
    });
    if (pointRef) formData.append('point_ref', pointRef);
    return this.http.post<Piece>(`${this.base}${pieceId}/images/`, formData);
  }

  deleteImage(pieceId: string, imageId: number): Observable<Piece> {
    return this.http.delete<Piece>(`${this.base}${pieceId}/images/${imageId}/`);
  }

  /** (Ré)assigne une photo à un point (PPA/PPN) ; pointRef vide = désassigner. */
  assignImage(pieceId: string, imageId: number, pointRef: string): Observable<Piece> {
    return this.http.post<Piece>(`${this.base}${pieceId}/images/${imageId}/assign/`, { point_ref: pointRef });
  }

  /** Affecte en masse plusieurs photos à un point (un seul appel). */
  assignImagesBulk(pieceId: string, imageIds: number[], pointRef: string): Observable<Piece> {
    return this.http.post<Piece>(`${this.base}${pieceId}/images/assign-bulk/`, { image_ids: imageIds, point_ref: pointRef });
  }

  reorderImages(pieceId: string, orderedIds: number[]): Observable<Piece> {
    return this.http.post<Piece>(`${this.base}${pieceId}/images/reorder/`, { ordered_ids: orderedIds });
  }

  /** Aperçu : parse le rapport HTML TBC (RFB) côté serveur → lignes générées. */
  previewHtmlImport(file: File, typePiece: string): Observable<{ rows: any[]; champs: any[]; total_rows: number }> {
    const formData = new FormData();
    formData.append('fichier', file, file.name);
    formData.append('type_piece', typePiece);
    return this.http.post<{ rows: any[]; champs: any[]; total_rows: number }>(`${this.base}import-html/`, formData);
  }

  /** Confirmation : crée la pièce RFB à partir du HTML (lignes éditées + fichier attaché). */
  confirmHtmlImport(file: File, typePiece: string, parent: PieceParent, numero: number | undefined, rows: any[]): Observable<Piece> {
    const formData = new FormData();
    formData.append('fichier', file, file.name);
    formData.append('type_piece', typePiece);
    if (parent.ssdgps) formData.append('ssdgps', parent.ssdgps);
    if (parent.session) formData.append('session', parent.session);
    if (numero != null) formData.append('numero', String(numero));
    formData.append('payload', JSON.stringify({ rows }));
    return this.http.post<Piece>(`${this.base}import-html/`, formData);
  }

  /**
   * Création EN MASSE de pièces répétables (RDN) à partir de plusieurs rapports HTML TBC.
   * L'ordre des fichiers transmis fixe les numéros des déterminations (n° = rang).
   */
  bulkImportHtml(files: File[], typePiece: string, parent: PieceParent): Observable<{ created: Piece[]; count: number }> {
    const formData = new FormData();
    formData.append('type_piece', typePiece);
    if (parent.ssdgps) formData.append('ssdgps', parent.ssdgps);
    if (parent.session) formData.append('session', parent.session);
    for (const f of files) formData.append('fichiers', f, f.name);
    return this.http.post<{ created: Piece[]; count: number }>(`${this.base}import-html-bulk/`, formData);
  }

  /**
   * Aperçu du « Rapport de contrôle » (RC) calculé depuis la LPA + les déterminations
   * du SSDGPS (et de la session si précisée). Erreur 400 si une source manque.
   */
  previewComputeRc(parent: PieceParent): Observable<{ rows: any[]; champs: any[]; total_rows: number }> {
    const formData = new FormData();
    formData.append('type_piece', 'RC');
    if (parent.ssdgps) formData.append('ssdgps', parent.ssdgps);
    if (parent.session) formData.append('session', parent.session);
    return this.http.post<{ rows: any[]; champs: any[]; total_rows: number }>(`${this.base}compute-rc/`, formData);
  }

  /** Création du RC (lignes calculées, éventuellement éditées avant enregistrement). */
  confirmComputeRc(parent: PieceParent, rows: any[]): Observable<Piece> {
    const formData = new FormData();
    formData.append('type_piece', 'RC');
    if (parent.ssdgps) formData.append('ssdgps', parent.ssdgps);
    if (parent.session) formData.append('session', parent.session);
    formData.append('commit', '1');
    formData.append('payload', JSON.stringify({ rows }));
    return this.http.post<Piece>(`${this.base}compute-rc/`, formData);
  }

  /**
   * Calcule la 2ᵉ version « écarts » d'une pièce RDL/RDN (brute vs détermination
   * définitive). Résultat persisté dans `payload.rows_ecarts`. Erreur 400 si la RDD
   * ou les données brutes manquent.
   */
  computeEcarts(pieceId: string): Observable<Piece> {
    return this.http.post<Piece>(`${this.base}${pieceId}/compute-ecarts/`, {});
  }

  /**
   * Aperçu de l'assemblage RDIA (RDL + RDNₖ → une pièce). `sourceIds` (ordonnés) fixe
   * l'ordre des blocs ; vide = toutes les déterminations du scope (RDL puis RDN).
   */
  previewAssembleRdi(parent: PieceParent, sourceIds: string[]):
      Observable<{ rows: any[]; champs: any[]; total_rows: number; sources: any[] }> {
    return this.http.post<{ rows: any[]; champs: any[]; total_rows: number; sources: any[] }>(
      `${this.base}assemble-rdi/`,
      { ssdgps: parent.ssdgps, session: parent.session || null, source_ids: sourceIds });
  }

  /** Crée la pièce RDIA assemblée (lignes éventuellement éditées avant enregistrement). */
  confirmAssembleRdi(parent: PieceParent, sourceIds: string[], rows: any[]): Observable<Piece> {
    return this.http.post<Piece>(`${this.base}assemble-rdi/`, {
      ssdgps: parent.ssdgps, session: parent.session || null,
      source_ids: sourceIds, commit: '1', payload: { rows },
    });
  }

  /** Réassemble une pièce RDIA existante depuis les déterminations du dossier (écarts invalidés). */
  reassembleRdi(pieceId: string): Observable<Piece> {
    return this.http.post<Piece>(`${this.base}assemble-rdi/`, { piece_id: pieceId });
  }

  /** Ré-import HTML TBC : remplace les données (+ fichier) d'une pièce existante. */
  reimportHtml(pieceId: string, file: File, typePiece: string, rows: any[]): Observable<Piece> {
    const formData = new FormData();
    formData.append('fichier', file, file.name);
    formData.append('type_piece', typePiece);
    formData.append('piece_id', pieceId);
    formData.append('payload', JSON.stringify({ rows }));
    return this.http.post<Piece>(`${this.base}import-html/`, formData);
  }

  previewImport(file: File, typePiece: string): Observable<PieceImportPreview> {
    const formData = new FormData();
    formData.append('fichier', file, file.name);
    formData.append('type_piece', typePiece);
    return this.http.post<PieceImportPreview>(`${this.base}import/`, formData);
  }

  confirmImport(
    file: File, typePiece: string, parent: PieceParent,
    mapping: Record<string, string>, numero?: number,
  ): Observable<Piece> {
    const formData = new FormData();
    formData.append('fichier', file, file.name);
    formData.append('type_piece', typePiece);
    if (parent.ssdgps) formData.append('ssdgps', parent.ssdgps);
    if (parent.session) formData.append('session', parent.session);
    if (numero != null) formData.append('numero', String(numero));
    formData.append('mapping', JSON.stringify(mapping));
    return this.http.post<Piece>(`${this.base}import/`, formData);
  }

  update(id: string, payload: Partial<Piece>): Observable<Piece> {
    return this.http.patch<Piece>(`${this.base}${id}/`, payload);
  }

  replaceFile(id: string, file: File): Observable<Piece> {
    const formData = new FormData();
    formData.append('fichier', file, file.name);
    return this.http.patch<Piece>(`${this.base}${id}/`, formData);
  }

  reimport(pieceId: string, file: File, typePiece: string, mapping: Record<string, string>): Observable<Piece> {
    const formData = new FormData();
    formData.append('fichier', file, file.name);
    formData.append('type_piece', typePiece);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('piece_id', pieceId);
    return this.http.post<Piece>(`${this.base}import/`, formData);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}${id}/`);
  }

  restore(id: string): Observable<Piece> {
    return this.http.post<Piece>(`${this.base}${id}/restore/`, {});
  }

  bulkRestore(ids: string[]): Observable<{ restored_count: number }> {
    return this.http.post<{ restored_count: number }>(`${this.base}bulk-restore/`, { ids });
  }

  reorder(ssdgpsId: string, orderedIds: string[]): Observable<Piece[]> {
    return this.http.post<Piece[]>(`${this.base}reorder/`, { ssdgps: ssdgpsId, ordered_ids: orderedIds });
  }

  moveToPosition(id: string, position: number): Observable<Piece> {
    return this.http.post<Piece>(`${this.base}${id}/move/`, { position });
  }

  setScope(id: string, sessionId: string | null): Observable<Piece> {
    return this.update(id, { session: sessionId } as Partial<Piece>);
  }
}

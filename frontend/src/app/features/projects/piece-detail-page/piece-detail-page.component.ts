import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectsService } from '../../../core/services/projects.service';
import { PiecesService } from '../../../core/services/pieces.service';
import { ToastService } from '../../../core/services/toast.service';
import { Piece, PieceTypeDef } from '../../../core/models/piece.model';
import { Ssdgps, Session } from '../../../core/models/project.model';

/**
 * Page dédiée de modification d'une pièce (architecture hybride). Charge la pièce
 * par son id (deep-link possible) + le contexte SSDGPS, puis héberge
 * `piece-detail-modal` en mode `embedded` + `edit`.
 */
@Component({
  selector: 'app-piece-detail-page',
  templateUrl: './piece-detail-page.component.html',
  styleUrls: ['./piece-detail-page.component.scss'],
})
export class PieceDetailPageComponent implements OnInit {
  loading = false;
  mode: 'view' | 'edit' = 'view';
  piece: Piece | null = null;
  ssdgps!: Ssdgps;
  sessions: Session[] = [];
  catalog: PieceTypeDef[] = [];

  private projectId!: string;
  private ssdgpsId!: string;
  private pieceId!: string;
  private proprieteId: string | null = null;
  private affaireId: string | null = null;
  private sessionId: string | null = null;

  constructor(
    private projectsService: ProjectsService,
    private piecesService: PiecesService,
    private toast: ToastService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    this.ssdgpsId = this.route.snapshot.paramMap.get('ssdgpsId')!;
    this.pieceId = this.route.snapshot.paramMap.get('pieceId')!;
    this.mode = this.route.snapshot.data['mode'] === 'edit' ? 'edit' : 'view';
    this.proprieteId = this.route.snapshot.queryParamMap.get('proprieteId');
    this.affaireId = this.route.snapshot.queryParamMap.get('affaireId');
    this.sessionId = this.route.snapshot.queryParamMap.get('session');
    this.loading = true;
    forkJoin([
      this.projectsService.getSsdgpsById(this.ssdgpsId),
      this.projectsService.getSessions(this.ssdgpsId),
      this.piecesService.getCatalog(),
      this.piecesService.getById(this.pieceId),
    ]).subscribe({
      next: ([ssdgps, sessions, catalog, piece]) => {
        this.ssdgps = ssdgps; this.sessions = sessions;
        this.catalog = catalog; this.piece = piece;
        this.loading = false;
      },
      error: () => { this.toast.error('Erreur', 'Pièce introuvable'); this.backToList(); },
    });
  }

  /** Définition catalogue de la pièce (pour le nom complet du type dans le titre de page). */
  get catalogDef(): PieceTypeDef | undefined {
    return this.piece ? this.catalog.find(d => d.code === this.piece!.type_piece) : undefined;
  }

  backToList(): void {
    this.router.navigate(['/dashboard/projets', this.projectId, 'pieces', this.ssdgpsId], {
      queryParams: { proprieteId: this.proprieteId, affaireId: this.affaireId, session: this.sessionId },
    });
  }

  onSaved(updated: Piece): void { this.piece = updated; }

  /** Depuis la consultation, bascule vers la page d'édition (même pièce). */
  goToEdit(): void {
    this.router.navigate(
      ['/dashboard/projets', this.projectId, 'pieces', this.ssdgpsId, 'piece', this.pieceId, 'modifier'],
      { queryParams: { proprieteId: this.proprieteId, affaireId: this.affaireId, session: this.sessionId } },
    );
  }
}

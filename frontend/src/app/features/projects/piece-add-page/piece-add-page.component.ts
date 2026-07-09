import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectsService } from '../../../core/services/projects.service';
import { PiecesService } from '../../../core/services/pieces.service';
import { ToastService } from '../../../core/services/toast.service';
import { Piece, PieceTypeDef } from '../../../core/models/piece.model';
import { Ssdgps, Session } from '../../../core/models/project.model';

/**
 * Page dédiée d'ajout d'une pièce (architecture hybride). Résout le contexte
 * (SSDGPS, sessions, catalogue, pièces existantes) comme `piece-management-page`,
 * puis héberge `piece-add-wizard` en mode `embedded`. Navigue en retour vers la
 * liste à la création ou à l'annulation.
 */
@Component({
  selector: 'app-piece-add-page',
  templateUrl: './piece-add-page.component.html',
  styleUrls: ['./piece-add-page.component.scss'],
})
export class PieceAddPageComponent implements OnInit {
  loading = false;
  ssdgps!: Ssdgps;
  sessions: Session[] = [];
  catalog: PieceTypeDef[] = [];
  existingPieces: Piece[] = [];
  defaultSessionId: string | null = null;

  private projectId!: string;
  private ssdgpsId!: string;
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
    this.proprieteId = this.route.snapshot.queryParamMap.get('proprieteId');
    this.affaireId = this.route.snapshot.queryParamMap.get('affaireId');
    this.sessionId = this.route.snapshot.queryParamMap.get('session');
    this.defaultSessionId = this.sessionId;
    this.loading = true;
    forkJoin([
      this.projectsService.getSsdgpsById(this.ssdgpsId),
      this.projectsService.getSessions(this.ssdgpsId),
      this.piecesService.getCatalog(),
      this.piecesService.listBySsdgps(this.ssdgpsId, false),
    ]).subscribe({
      next: ([ssdgps, sessions, catalog, pieces]) => {
        this.ssdgps = ssdgps; this.sessions = sessions;
        this.catalog = catalog; this.existingPieces = pieces;
        this.loading = false;
      },
      error: () => { this.toast.error('Erreur', 'SSDGPS introuvable'); this.backToList(); },
    });
  }

  backToList(): void {
    this.router.navigate(['/dashboard/projets', this.projectId, 'pieces', this.ssdgpsId], {
      queryParams: { proprieteId: this.proprieteId, affaireId: this.affaireId, session: this.sessionId },
    });
  }

  onCreated(): void { this.toast.success('Succès', 'Pièce ajoutée'); this.backToList(); }
  onCancelled(): void { this.backToList(); }
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectsService } from '../../../core/services/projects.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Projet, Propriete, Affaire, Ssdgps, Session,
  PROCEDURE_OPTIONS, PROCEDURE_NATURES, PROCEDURES_SANS_DATE_BORNAGE,
  NATURE_AFFAIRE_LABELS, NATURE_SSDGPS_OPTIONS, TYPE_SSDGPS_OPTIONS, NatureAffaire,
} from '../../../core/models/project.model';

type Level = 'propriete' | 'affaire' | 'ssdgps' | 'session';

@Component({
  selector: 'app-project-explorer',
  templateUrl: './project-explorer.component.html',
  styleUrls: ['./project-explorer.component.scss'],
})
export class ProjectExplorerComponent implements OnInit {
  readonly procedureOptions = PROCEDURE_OPTIONS;
  readonly natureSsdgpsOptions = NATURE_SSDGPS_OPTIONS;
  readonly typeSsdgpsOptions = TYPE_SSDGPS_OPTIONS;

  projet: Projet | null = null;
  level: Level = 'propriete';
  chain: { propriete?: Propriete; affaire?: Affaire; ssdgps?: Ssdgps } = {};
  items: any[] = [];
  loading = false;

  // Modale de saisie
  showModal = false;
  editing: any = null;
  submitting = false;
  form!: FormGroup;

  // Formulaire Affaire dynamique
  availableNatures: { value: NatureAffaire; label: string }[] = [];
  dateBornageRequired = true;

  constructor(
    private service: ProjectsService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getProjet(id).subscribe({
      next: (p) => { this.projet = p; this.goToLevel('propriete'); },
      error: () => { this.toast.error('Erreur', 'Projet introuvable'); this.router.navigate(['/admin/projets']); },
    });
  }

  // --- Navigation ---
  private childOf(level: Level): Level | null {
    return ({ propriete: 'affaire', affaire: 'ssdgps', ssdgps: 'session', session: null } as any)[level];
  }

  goToLevel(level: Level): void {
    this.level = level;
    // Nettoie la chaîne au-delà du niveau courant
    if (level === 'propriete') this.chain = {};
    else if (level === 'affaire') this.chain = { propriete: this.chain.propriete };
    else if (level === 'ssdgps') this.chain = { propriete: this.chain.propriete, affaire: this.chain.affaire };
    this.loadLevel();
  }

  loadLevel(): void {
    this.loading = true;
    const done = (data: any[]) => { this.items = data; this.loading = false; };
    const fail = () => { this.toast.error('Erreur', 'Chargement impossible'); this.loading = false; };
    switch (this.level) {
      case 'propriete': this.service.getProprietes(this.projet!.id).subscribe({ next: done, error: fail }); break;
      case 'affaire': this.service.getAffaires(this.chain.propriete!.id).subscribe({ next: done, error: fail }); break;
      case 'ssdgps': this.service.getSsdgps(this.chain.affaire!.id).subscribe({ next: done, error: fail }); break;
      case 'session': this.service.getSessions(this.chain.ssdgps!.id).subscribe({ next: done, error: fail }); break;
    }
  }

  descend(item: any): void {
    const child = this.childOf(this.level);
    if (!child) return; // session = feuille
    if (this.level === 'propriete') this.chain.propriete = item;
    else if (this.level === 'affaire') this.chain.affaire = item;
    else if (this.level === 'ssdgps') this.chain.ssdgps = item;
    this.level = child;
    this.loadLevel();
  }

  // --- Libellés ---
  get levelTitle(): string {
    return { propriete: 'Propriétés', affaire: 'Affaires (SD)', ssdgps: 'SSDGPS', session: 'Sessions' }[this.level];
  }

  itemLabel(item: any, level: Level = this.level): string {
    switch (level) {
      case 'propriete': return item.nom_propriete + (item.id_requisition ? ` (${item.id_requisition})` : '');
      case 'affaire': return `SD ${item.numero_sd_affaire} — ${item.nature_affaire}`;
      case 'ssdgps': return `SSDGPS ${item.numero_ssdgps} (${item.nature_ssdgps})`;
      case 'session': return `Session ${item.numero_session}`;
      default: return '';
    }
  }

  natureLabel(v: string): string { return NATURE_AFFAIRE_LABELS[v as NatureAffaire] || v; }
  isLeaf(): boolean { return this.level === 'session'; }

  // --- Formulaire ---
  openCreate(): void { this.editing = null; this.buildForm(); this.showModal = true; }
  openEdit(item: any, ev: Event): void { ev.stopPropagation(); this.editing = item; this.buildForm(item); this.showModal = true; }
  closeModal(): void { this.showModal = false; this.editing = null; }

  private buildForm(item?: any): void {
    switch (this.level) {
      case 'propriete':
        this.form = this.fb.group({
          nom_propriete: [item?.nom_propriete || '', Validators.required],
          id_requisition: [item?.id_requisition || ''],
          id_titre: [item?.id_titre || ''],
        });
        break;
      case 'affaire':
        this.form = this.fb.group({
          numero_sd_affaire: [item?.numero_sd_affaire ?? null, Validators.required],
          nature_procedure_affaire: [item?.nature_procedure_affaire || '', Validators.required],
          nature_affaire: [item?.nature_affaire || '', Validators.required],
          date_bornage: [item?.date_bornage || null],
        });
        this.onProcedureChange(item?.nature_procedure_affaire || '');
        this.form.get('nature_procedure_affaire')!.valueChanges.subscribe(v => this.onProcedureChange(v));
        break;
      case 'ssdgps':
        this.form = this.fb.group({
          nature_ssdgps: [item?.nature_ssdgps || '', Validators.required],
          numero_ssdgps: [item?.numero_ssdgps ?? null, Validators.required],
          type_ssdgps: [item?.type_ssdgps || 'mono-session', Validators.required],
        });
        break;
      case 'session':
        this.form = this.fb.group({
          numero_session: [item?.numero_session ?? null, Validators.required],
          date_session: [item?.date_session || null],
        });
        break;
    }
  }

  /** Met à jour les natures disponibles + l'obligation de date selon la procédure. */
  onProcedureChange(procedure: string): void {
    const natures = PROCEDURE_NATURES[procedure as keyof typeof PROCEDURE_NATURES] || [];
    this.availableNatures = natures.map(n => ({ value: n, label: `${n} — ${NATURE_AFFAIRE_LABELS[n]}` }));
    this.dateBornageRequired = !!procedure && !PROCEDURES_SANS_DATE_BORNAGE.includes(procedure as any);
    const natureCtrl = this.form.get('nature_affaire');
    if (natureCtrl && !natures.includes(natureCtrl.value)) natureCtrl.setValue('');
    if (procedure && !this.dateBornageRequired) this.form.get('date_bornage')?.setValue(null);
  }

  get isProprieteInvalid(): boolean {
    if (this.level !== 'propriete') return false;
    return !this.form.value.id_requisition && !this.form.value.id_titre;
  }

  submit(): void {
    if (this.form.invalid || this.submitting) { this.form.markAllAsTouched(); return; }
    if (this.isProprieteInvalid) { this.toast.error('Validation', 'Renseignez au moins la réquisition ou le titre.'); return; }
    if (this.level === 'affaire' && this.dateBornageRequired && !this.form.value.date_bornage) {
      this.toast.error('Validation', 'La date de bornage/recollement est requise pour cette procédure.'); return;
    }
    this.submitting = true;
    const payload: any = { ...this.form.value };
    // Rattache le parent
    if (this.level === 'propriete') payload.projet = this.projet!.id;
    else if (this.level === 'affaire') payload.propriete = this.chain.propriete!.id;
    else if (this.level === 'ssdgps') payload.affaire = this.chain.affaire!.id;
    else if (this.level === 'session') payload.ssdgps = this.chain.ssdgps!.id;

    const done = () => { this.submitting = false; this.closeModal(); this.loadLevel(); this.toast.success('Succès', 'Enregistré'); };
    const fail = (e: any) => {
      this.submitting = false;
      const err = e?.error;
      const msg = typeof err === 'object' && err ? Object.values(err).flat().join(' ') : 'Erreur lors de l\'enregistrement';
      this.toast.error('Échec', String(msg));
    };
    const svc = this.service;
    const id = this.editing?.id;
    const call: Observable<any> = {
      propriete: () => id ? svc.updatePropriete(id, payload) : svc.createPropriete(payload),
      affaire: () => id ? svc.updateAffaire(id, payload) : svc.createAffaire(payload),
      ssdgps: () => id ? svc.updateSsdgps(id, payload) : svc.createSsdgps(payload),
      session: () => id ? svc.updateSession(id, payload) : svc.createSession(payload),
    }[this.level]();
    call.subscribe({ next: done, error: fail });
  }

  remove(item: any, ev: Event): void {
    ev.stopPropagation();
    if (!confirm('Confirmer la suppression ?')) return;
    const svc = this.service;
    const call: Observable<any> = {
      propriete: () => svc.deletePropriete(item.id),
      affaire: () => svc.deleteAffaire(item.id),
      ssdgps: () => svc.deleteSsdgps(item.id),
      session: () => svc.deleteSession(item.id),
    }[this.level]();
    call.subscribe({
      next: () => { this.toast.success('Succès', 'Supprimé'); this.loadLevel(); },
      error: () => this.toast.error('Erreur', 'Suppression impossible'),
    });
  }

  backToList(): void { this.router.navigate(['/admin/projets']); }
}

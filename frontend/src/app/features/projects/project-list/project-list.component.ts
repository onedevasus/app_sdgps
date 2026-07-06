import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectsService } from '../../../core/services/projects.service';
import { ProfileService } from '../../profile/services/profile.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { ToastService } from '../../../core/services/toast.service';
import { Projet, STATUT_OPTIONS } from '../../../core/models/project.model';
import { Organization } from '../../../core/models/organization.model';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
})
export class ProjectListComponent implements OnInit {
  readonly statutOptions = STATUT_OPTIONS;

  projets: Projet[] = [];
  filtered: Projet[] = [];
  loading = false;
  searchText = '';
  statutFilter = '';

  // Organisation de l'utilisateur (pour la création) ; null pour un Admin Système.
  currentOrgId: string | null = null;
  currentOrgName: string | null = null;
  organizations: Organization[] = [];

  showModal = false;
  editing: Projet | null = null;
  submitting = false;
  form: FormGroup;

  constructor(
    private service: ProjectsService,
    private profile: ProfileService,
    private orgService: OrganizationService,
    private toast: ToastService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.form = this.fb.group({
      nom_projet: ['', Validators.required],
      code_projet: ['', Validators.required],
      description_projet: [''],
      statut: ['brouillon', Validators.required],
      organization: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.load();
    this.profile.getCurrentUser().subscribe({
      next: (me: any) => {
        this.currentOrgId = me.organization_id ?? null;
        this.currentOrgName = me.organization_name ?? null;
        // Admin Système / Super Admin : pas d'org → proposer la liste des organisations.
        if (!this.currentOrgId) {
          this.orgService.getOrganizations().subscribe(orgs => (this.organizations = orgs));
        }
      },
      error: () => {},
    });
  }

  load(): void {
    this.loading = true;
    this.service.getProjets().subscribe({
      next: (p) => { this.projets = p; this.applyFilter(); this.loading = false; },
      error: () => { this.toast.error('Erreur', 'Chargement des projets impossible'); this.loading = false; },
    });
  }

  applyFilter(): void {
    let r = [...this.projets];
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      r = r.filter(p => p.nom_projet.toLowerCase().includes(q) || p.code_projet.toLowerCase().includes(q));
    }
    if (this.statutFilter) r = r.filter(p => p.statut === this.statutFilter);
    this.filtered = r;
  }

  open(projet: Projet): void {
    this.router.navigate(['/admin/projets', projet.id]);
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({ statut: 'brouillon', organization: this.currentOrgId || '' });
    this.showModal = true;
  }

  openEdit(projet: Projet, ev: Event): void {
    ev.stopPropagation();
    this.editing = projet;
    this.form.reset({
      nom_projet: projet.nom_projet,
      code_projet: projet.code_projet,
      description_projet: projet.description_projet || '',
      statut: projet.statut,
      organization: projet.organization,
    });
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; this.editing = null; }

  get isOrgLocked(): boolean { return !!this.currentOrgId; }

  submit(): void {
    if (this.form.invalid || this.submitting) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    const payload = { ...this.form.value };
    const done = () => { this.submitting = false; this.closeModal(); this.load(); };
    const fail = (e: any) => {
      this.submitting = false;
      let msg = 'Erreur lors de l\'enregistrement';
      if (e?.error?.code_projet) msg = `Code projet : ${e.error.code_projet}`;
      else if (e?.error?.detail) msg = e.error.detail;
      this.toast.error('Échec', msg);
    };
    if (this.editing) {
      this.service.updateProjet(this.editing.id, payload).subscribe({ next: () => { this.toast.success('Succès', 'Projet modifié'); done(); }, error: fail });
    } else {
      this.service.createProjet(payload).subscribe({ next: () => { this.toast.success('Succès', 'Projet créé'); done(); }, error: fail });
    }
  }

  remove(projet: Projet, ev: Event): void {
    ev.stopPropagation();
    if (!confirm(`Supprimer le projet « ${projet.nom_projet} » ?`)) return;
    this.service.deleteProjet(projet.id).subscribe({
      next: () => { this.toast.success('Succès', 'Projet supprimé'); this.load(); },
      error: () => this.toast.error('Erreur', 'Suppression impossible'),
    });
  }

  statutLabel(v: string): string {
    return this.statutOptions.find(o => o.value === v)?.label || v;
  }
}

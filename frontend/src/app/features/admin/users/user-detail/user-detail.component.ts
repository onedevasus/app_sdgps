import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../../../core/services/user.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { ToastService } from '../../../../core/services/toast.service';
import { User, UpdateUserPayload } from '../../../../core/models/user.model';
import { Organization } from '../../../../core/models/organization.model';

@Component({
  selector: 'app-user-detail',
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
})
export class UserDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  user: User | null = null;
  organizations: Organization[] = [];
  editForm: FormGroup;
  isEditing = false;
  loading = false;
  saving = false;
  showResetPassword = false;
  newPassword = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private organizationService: OrganizationService,
    private toastService: ToastService,
    private fb: FormBuilder,
  ) {
    this.editForm = this.fb.group({
      first_name: [''],
      last_name: [''],
      email: [''],
      nom_societe: [''],
      is_active: [true],
      role: [''],
      organization_id: [''],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUser(id);
      this.loadOrganizations();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUser(id: string): void {
    this.loading = true;
    this.userService.getUser(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.user = user;
        this.editForm.patchValue({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          nom_societe: user.nom_societe || '',
          is_active: user.is_active,
          role: user.role,
          organization_id: user.organization_id || '',
        });
        this.loading = false;
      },
      error: () => {
        this.toastService.error('Erreur', 'Erreur lors du chargement');
        this.loading = false;
        this.router.navigate(['/admin/utilisateurs']);
      },
    });
  }

  loadOrganizations(): void {
    this.organizationService.getOrganizations().pipe(takeUntil(this.destroy$)).subscribe({
      next: (orgs) => {
        this.organizations = orgs;
      },
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.user) {
      this.editForm.patchValue({
        first_name: this.user.first_name,
        last_name: this.user.last_name,
        email: this.user.email,
        nom_societe: this.user.nom_societe || '',
        is_active: this.user.is_active,
        role: this.user.role,
        organization_id: this.user.organization_id || '',
      });
    }
  }

  save(): void {
    if (!this.user || this.editForm.invalid) return;
    this.saving = true;
    const payload: UpdateUserPayload = {};
    const formVal = this.editForm.value;
    if (formVal.first_name !== this.user.first_name) payload.first_name = formVal.first_name;
    if (formVal.last_name !== this.user.last_name) payload.last_name = formVal.last_name;
    if (formVal.nom_societe !== (this.user.nom_societe || '')) payload.nom_societe = formVal.nom_societe;
    if (formVal.is_active !== this.user.is_active) payload.is_active = formVal.is_active;
    if (formVal.role !== this.user.role) payload.role = formVal.role;
    if (formVal.organization_id !== (this.user.organization_id || '')) payload.organization_id = formVal.organization_id;

    this.userService.updateUser(this.user.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.toastService.success('Succès', 'Utilisateur modifié avec succès');
        this.user = updated;
        this.isEditing = false;
        this.saving = false;
      },
      error: () => {
        this.toastService.error('Erreur', 'Erreur lors de la modification');
        this.saving = false;
      },
    });
  }

  confirmResetPassword(): void {
    if (!this.user) return;
    this.saving = true;
    this.userService.resetPassword(this.user.id, { must_change_password: true }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.newPassword = res.new_password;
        this.showResetPassword = true;
        this.saving = false;
      },
      error: () => {
        this.toastService.error('Erreur', 'Erreur lors de la réinitialisation');
        this.saving = false;
      },
    });
  }

  copyPassword(): void {
    navigator.clipboard.writeText(this.newPassword).then(() => {
      this.toastService.success('Succès', 'Mot de passe copié');
    });
  }

  closeResetPassword(): void {
    this.showResetPassword = false;
    this.newPassword = '';
  }

  toggleActive(): void {
    if (!this.user) return;
    const action = this.user.is_active ? 'désactiver' : 'activer';
    this.userService.toggleActive(this.user.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Succès', `Compte ${action} avec succès`);
        this.loadUser(this.user!.id);
      },
      error: () => this.toastService.error('Erreur', "Erreur lors du changement d'état"),
    });
  }

  onCheckboxChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.editForm.patchValue({ is_active: target.checked });
  }

  goBack(): void {
    this.router.navigate(['/admin/utilisateurs']);
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ROLE_SUPER_ADMIN': return 'badge-super-admin';
      case 'ROLE_ADMIN_SYSTEME': return 'badge-admin';
      case 'ROLE_ORGANISATION_ADMIN': return 'badge-org-admin';
      case 'ROLE_ORGANISATION_AGENT': return 'badge-agent';
      default: return 'badge-default';
    }
  }
}

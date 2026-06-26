import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../../../core/services/user.service';
import { ToastService } from '../../../../core/services/toast.service';
import { RoleInfo } from '../../../../core/models/user.model';

@Component({
  selector: 'app-roles-permissions',
  templateUrl: './roles-permissions.component.html',
  styleUrls: ['./roles-permissions.component.scss'],
})
export class RolesPermissionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  roles: RoleInfo[] = [];
  loading = false;
  selectedRole: RoleInfo | null = null;

  readonly roleIcons: Record<string, string> = {
    ROLE_APP_ADMIN: 'fa-crown',
    ROLE_ORGANISATION_ADMIN: 'fa-user-tie',
    ROLE_ORGANISATION_AGENT: 'fa-user',
  };

  constructor(
    private userService: UserService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoles(): void {
    this.loading = true;
    this.userService.getRoles().pipe(takeUntil(this.destroy$)).subscribe({
      next: (roles) => {
        this.roles = roles;
        this.loading = false;
      },
      error: () => {
        this.toastService.error('Erreur', 'Erreur lors du chargement des rôles');
        this.loading = false;
      },
    });
  }

  selectRole(role: RoleInfo): void {
    this.selectedRole = this.selectedRole?.id === role.id ? null : role;
  }

  getRoleIcon(roleId: string): string {
    return this.roleIcons[roleId] || 'fa-user-circle';
  }

  getRoleBadgeClass(roleId: string): string {
    switch (roleId) {
      case 'ROLE_APP_ADMIN': return 'badge-admin';
      case 'ROLE_ORGANISATION_ADMIN': return 'badge-org-admin';
      case 'ROLE_ORGANISATION_AGENT': return 'badge-agent';
      default: return 'badge-default';
    }
  }

  getRoleCardClass(roleId: string): string {
    switch (roleId) {
      case 'ROLE_APP_ADMIN': return 'role-admin';
      case 'ROLE_ORGANISATION_ADMIN': return 'role-org-admin';
      case 'ROLE_ORGANISATION_AGENT': return 'role-agent';
      default: return '';
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { LayoutService } from '../../services/layout.service';
import { ProfileService, UserProfile as ProfileUserProfile } from '../../../../features/profile/services/profile.service';
import { SidebarState, UserProfile } from '../../interfaces/menu.interface';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent implements OnInit {
  
  sidebarState$: Observable<SidebarState>;

  constructor(
    private layoutService: LayoutService,
    private profileService: ProfileService
  ) {
    this.sidebarState$ = this.layoutService.sidebarState$;
  }

  ngOnInit(): void {
    // Charger le profil utilisateur et configurer le menu
    this.loadUserProfile();
  }

  /**
   * Charger le profil utilisateur depuis l'API
   */
  private loadUserProfile(): void {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      // Récupérer le profil de l'utilisateur RÉELLEMENT connecté (tous rôles).
      // /auth/me/ renvoie request.user ; l'ancien endpoint /platform-admin/me/profile/
      // renvoyait 403 pour un ROLE_ORGANISATION_ADMIN, ce qui déclenchait le fallback
      // mock affichant un mauvais utilisateur dans le topbar.
      this.profileService.getCurrentUser().subscribe({
        next: (profile: ProfileUserProfile) => {
          console.log('✅ Profil utilisateur chargé depuis API:', profile);

          // Mettre à jour LayoutService avec le vrai profil
          this.layoutService.setUserProfile({
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: profile.role,
            organization_name: profile.organization_name,
            avatar: profile.profile_picture_url || undefined // Photo si disponible
          });
        },
        error: (error: any) => {
          // Ne JAMAIS fabriquer une fausse identité ici : cela masquerait l'utilisateur
          // réel. En cas d'échec (401 → l'intercepteur redirige, ou réseau), on n'affiche
          // simplement pas de profil.
          console.error('❌ Erreur chargement profil utilisateur:', error);
        }
      });
    } else {
      console.warn('⚠️ Aucun token trouvé - Utilisateur non authentifié');
    }
  }
}

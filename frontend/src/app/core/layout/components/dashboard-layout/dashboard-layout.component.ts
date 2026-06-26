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
      // Appeler l'API pour récupérer le vrai profil utilisateur
      this.profileService.getProfile().subscribe({
        next: (profile: ProfileUserProfile) => {
          console.log('✅ Profil utilisateur chargé depuis API:', profile);
          
          // Mettre à jour LayoutService avec le vrai profil
          this.layoutService.setUserProfile({
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: profile.role,  // 'superadmin', 'admin', etc.
            avatar: profile.profile_picture_url || undefined // Photo si disponible
          });
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement profil:', error);
          // Fallback: utiliser mock en cas d'erreur
          this.loadMockProfile();
        }
      });
    } else {
      console.warn('⚠️ Aucun token trouvé - Utilisateur non authentifié');
    }
  }
  
  /**
   * Fallback: charger un profil mock en cas d'erreur API
   */
  private loadMockProfile(): void {
    const mockProfile = {
      id: 1,
      email: 'boulmaneabderrazzak@gmail.com',
      first_name: 'Abderrazzak',
      last_name: 'Boulmane',
      role: 'ROLE_APP_ADMIN',
      avatar: undefined
    };
    
    this.layoutService.setUserProfile(mockProfile);
    console.log('⚠️ Profil mock chargé:', mockProfile);
  }
}

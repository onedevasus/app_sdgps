import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-test-profile-route',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div style="padding: 40px; text-align: center;">
      <h1>Test Route Profile</h1>
      <p>Cliquez sur le bouton pour tester la navigation vers /admin/profile</p>
      
      <button 
        (click)="goToProfile()"
        style="padding: 15px 30px; font-size: 18px; background: #cc5858; color: white; border: none; border-radius: 8px; cursor: pointer; margin: 10px;">
        🚀 Aller au Profil
      </button>
      
      <br><br>
      
      <a 
        [routerLink]="['/admin/profile']"
        style="display: inline-block; padding: 15px 30px; font-size: 18px; background: #2ecc71; color: white; text-decoration: none; border-radius: 8px;">
        🔗 Lien Router Profile
      </a>
      
      <br><br>
      
      <a 
        href="/admin/profile"
        style="display: inline-block; padding: 15px 30px; font-size: 18px; background: #3498db; color: white; text-decoration: none; border-radius: 8px;">
        🌐 Lien Direct Profile
      </a>
    </div>
  `
})
export class TestProfileRouteComponent {
  constructor(private router: Router) {}
  
  goToProfile() {
    console.log('🔴 Bouton test cliqué - Navigation vers /admin/profile');
    this.router.navigate(['/admin/profile']);
  }
}

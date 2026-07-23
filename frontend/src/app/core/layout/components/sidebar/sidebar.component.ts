import { Component, OnInit } from '@angular/core';
import { LayoutService } from '../../services/layout.service';
import { MenuItem, SidebarState } from '../../interfaces/menu.interface';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  
  menuItems$: Observable<MenuItem[]>;
  sidebarState$: Observable<SidebarState>;
  expandedMenus: Set<string> = new Set();

  constructor(public layoutService: LayoutService) {
    this.menuItems$ = this.layoutService.menuItems$;
    this.sidebarState$ = this.layoutService.sidebarState$;
  }

  ngOnInit(): void {}

  /**
   * Basculer l'expansion d'un sous-menu
   */
  toggleSubmenu(menuId: string): void {
    if (this.expandedMenus.has(menuId)) {
      this.expandedMenus.delete(menuId);
    } else {
      this.expandedMenus.add(menuId);
    }
  }

  /**
   * Vérifier si un menu est expandé
   */
  isExpanded(menuId: string): boolean {
    return this.expandedMenus.has(menuId);
  }

  /**
   * Après l'ouverture d'une entrée du menu, réduire le sidebar (mode compact).
   * Appelé uniquement sur les liens de navigation (feuilles), pas sur l'ouverture d'un sous-menu.
   */
  onNavigate(): void {
    this.layoutService.collapseSidebar();
  }

  /**
   * Naviguer vers une route
   */
  navigateTo(route?: string): void {
    if (route) {
      console.log(`🚀 Navigation vers: ${route}`);
      // TODO: Implémenter la navigation réelle avec Router
    }
  }
}

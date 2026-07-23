import { of } from 'rxjs';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let cmp: SidebarComponent;
  const layoutService = {
    menuItems$: of([]),
    sidebarState$: of({ isCollapsed: true, isVisible: true }),
    collapseSidebar: jasmine.createSpy('collapseSidebar'),
  };

  beforeEach(() => {
    layoutService.collapseSidebar.calls.reset();
    cmp = new SidebarComponent(layoutService as any);
  });

  it('toggleSubmenu ouvre puis referme', () => {
    cmp.toggleSubmenu('projets');
    expect(cmp.isExpanded('projets')).toBeTrue();
    cmp.toggleSubmenu('projets');
    expect(cmp.isExpanded('projets')).toBeFalse();
  });

  it('onNavigate réduit la sidebar', () => {
    cmp.onNavigate();
    expect(layoutService.collapseSidebar).toHaveBeenCalled();
  });
});

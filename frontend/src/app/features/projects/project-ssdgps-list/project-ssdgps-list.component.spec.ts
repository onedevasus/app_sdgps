import { ProjectSsdgpsListComponent } from './project-ssdgps-list.component';

describe('ProjectSsdgpsListComponent (tri & libellés)', () => {
  let cmp: ProjectSsdgpsListComponent;

  beforeEach(() => {
    cmp = new ProjectSsdgpsListComponent(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  });

  it('activeCount = nombre d’éléments actifs', () => {
    (cmp as any).activeItems = [{ id: '1' }, { id: '2' }];
    expect(cmp.activeCount).toBe(2);
  });

  it('sortLevelOf / sortDirOf lisent les niveaux de tri', () => {
    (cmp as any).sortLevels = [{ field: 'nature_ssdgps', dir: 'asc' }];
    expect(cmp.sortLevelOf('nature_ssdgps')).toBe(1);
    expect(cmp.sortDirOf('nature_ssdgps')).toBe('asc');
    expect(cmp.sortLevelOf('inconnu')).toBe(0);
    expect(cmp.sortDirOf('inconnu')).toBe('');
  });

  it('fieldLabel renvoie le champ brut si non listé', () => {
    expect(cmp.fieldLabel('champ_x')).toBe('champ_x');
  });

  it('sortSummary résume le tri', () => {
    (cmp as any).sortLevels = [];
    expect(cmp.sortSummary).toBe('Aucun tri');
    (cmp as any).sortLevels = [{ field: 'nature_ssdgps', dir: 'desc' }];
    expect(cmp.sortSummary).toContain('↓');
  });
});

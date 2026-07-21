import { StorageDashboardComponent } from './storage-dashboard.component';

/**
 * Tests unitaires des helpers PURS du dashboard (formatage, pourcentages, décompte
 * d'organisations). On instancie directement la classe avec des dépendances factices :
 * pas de cycle de vie Angular ni de rendu Chart.js.
 */
describe('StorageDashboardComponent (helpers)', () => {
  let cmp: StorageDashboardComponent;

  beforeEach(() => {
    cmp = new StorageDashboardComponent({} as any, {} as any, {} as any);
  });

  it('formatBytes() formate en unités lisibles', () => {
    expect(cmp.formatBytes(0)).toBe('0 o');
    expect(cmp.formatBytes(512)).toBe('512 o');
    expect(cmp.formatBytes(1024)).toBe('1.0 Ko');
    expect(cmp.formatBytes(1048576)).toBe('1.0 Mo');
  });

  it('percent() calcule la part du total', () => {
    cmp.overview = { total_bytes: 1000 } as any;
    expect(cmp.percent(250)).toBe(25);
    expect(cmp.percent(0)).toBe(0);
    cmp.overview = { total_bytes: 0 } as any;
    expect(cmp.percent(10)).toBe(0); // pas de division par zéro
  });

  it('orgCount exclut la pseudo-catégorie « Hors organisation »', () => {
    cmp.overview = {
      by_organization: [
        { label: 'Org A', bytes: 10 },
        { label: 'Hors organisation', bytes: 5 },
      ],
    } as any;
    expect(cmp.orgCount).toBe(1);
  });

  it('topType renvoie la 1re nature ou « — »', () => {
    expect(cmp.topType).toBe('—');
    cmp.overview = { by_type: [{ key: 'images', label: 'Images', bytes: 5 }] } as any;
    expect(cmp.topType).toBe('Images');
  });

  it('currentRank suit l’onglet actif', () => {
    cmp.overview = {
      by_organization: [{ label: 'A', bytes: 1 }],
      by_project: [{ label: 'P', bytes: 2 }, { label: 'Q', bytes: 3 }],
      by_user: [],
    } as any;
    cmp.rankTab = 'by_project';
    expect(cmp.currentRank.length).toBe(2);
    cmp.rankTab = 'by_organization';
    expect(cmp.currentRank.length).toBe(1);
  });
});

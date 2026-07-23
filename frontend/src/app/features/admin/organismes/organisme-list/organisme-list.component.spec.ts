import { OrganismeListComponent } from './organisme-list.component';

describe('OrganismeListComponent (helpers)', () => {
  let cmp: OrganismeListComponent;

  beforeEach(() => {
    cmp = new OrganismeListComponent({} as any, {} as any, {} as any, {} as any);
  });

  it('getTypeLabel mappe les types (repli « Texte »)', () => {
    expect(cmp.getTypeLabel('text')).toBe('Texte');
    expect(cmp.getTypeLabel('number')).toBe('Nombre');
    expect(cmp.getTypeLabel('boolean')).toBe('Booléen');
    expect(cmp.getTypeLabel('autre')).toBe('Texte');
  });

  it('isN2 selon le niveau', () => {
    cmp.niveau = 1;
    expect(cmp.isN2).toBeFalse();
    cmp.niveau = 2;
    expect(cmp.isN2).toBeTrue();
  });

  it('getVisibleColumns filtre les colonnes visibles', () => {
    cmp.columns = [
      { visible: true } as any,
      { visible: false } as any,
      { visible: true } as any,
    ];
    expect(cmp.getVisibleColumns().length).toBe(2);
  });

  it('getFieldDescription lit la table des descriptions', () => {
    (cmp as any).descriptions = { nom: 'Nom officiel' };
    expect(cmp.getFieldDescription('nom')).toBe('Nom officiel');
    expect(cmp.getFieldDescription('absent')).toBe('');
  });
});

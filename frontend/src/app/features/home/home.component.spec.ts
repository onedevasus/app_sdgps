import { HomeComponent } from './home.component';

/** Helpers purs du tableau de bord d'accueil (instanciation directe, sans cycle Angular). */
describe('HomeComponent (helpers)', () => {
  let cmp: HomeComponent;

  beforeEach(() => {
    cmp = new HomeComponent({} as any, {} as any, {} as any);
  });

  it('greeting renvoie une salutation', () => {
    expect(['Bonjour', 'Bonsoir']).toContain(cmp.greeting);
  });

  it('firstName déduit le prénom depuis l’utilisateur', () => {
    (cmp as any).user = { first_name: 'Ali' };
    expect(cmp.firstName).toBe('Ali');
    (cmp as any).user = { email: 'sara@sdgps.ma' };
    expect(cmp.firstName).toBe('sara');
    (cmp as any).user = null;
    expect(cmp.firstName).toBe('');
  });

  it('statutLabel gère l’inconnu et le vide', () => {
    expect(cmp.statutLabel(undefined)).toBe('—');
    expect(cmp.statutLabel('code_inconnu')).toBe('code_inconnu');
    const label = cmp.statutLabel('en_cours');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('statutBadgeClass a un repli', () => {
    expect(cmp.statutBadgeClass(undefined)).toBe('badge-brouillon');
  });

  it('formatDate formate ou renvoie un tiret', () => {
    expect(cmp.formatDate(null)).toBe('—');
    expect(cmp.formatDate('pas-une-date')).toBe('—');
    expect(cmp.formatDate('2026-07-21T10:00:00Z')).toContain('2026');
  });
});

import { PieceAddPageComponent } from './piece-add-page.component';

describe('PieceAddPageComponent (logique)', () => {
  let cmp: PieceAddPageComponent;
  let router: jasmine.SpyObj<{ navigate: any }>;
  let toast: jasmine.SpyObj<{ success: any; error: any }>;
  let breadcrumb: jasmine.SpyObj<{ set: any; clear: any }>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    (router as any).url = '/projets/p1/pieces/s1/ajouter';
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    breadcrumb = jasmine.createSpyObj('BreadcrumbService', ['set', 'clear']);
    cmp = new PieceAddPageComponent(
      {} as any, {} as any, toast as any, router as any, {} as any, breadcrumb as any,
    );
    (cmp as any).projectId = 'p1';
    (cmp as any).ssdgpsId = 's1';
  });

  it('onCreated notifie et revient à la liste', () => {
    cmp.onCreated();
    expect(toast.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/projets', 'p1', 'pieces', 's1'], jasmine.any(Object),
    );
  });

  it('onCancelled revient à la liste sans notifier', () => {
    cmp.onCancelled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('ngOnDestroy efface le fil d’Ariane', () => {
    cmp.ngOnDestroy();
    expect(breadcrumb.clear).toHaveBeenCalled();
  });

  describe('updateTopbarBreadcrumb (privé)', () => {
    it('termine par « Ajouter une pièce » actif', () => {
      (cmp as any).proprieteId = 'prop1';
      (cmp as any).affaireId = 'aff1';
      cmp.ssdgps = {
        id: 's1', numero_ssdgps: 5, type_ssdgps: 'mono-session',
        propriete_id_titre: 'TF-123', affaire_numero: 9,
      } as any;
      (cmp as any).projet = { code_projet: 'PRJ-1' };

      (cmp as any).updateTopbarBreadcrumb();
      const trail = breadcrumb.set.calls.mostRecent().args[0];
      const last = trail[trail.length - 1];
      expect(last.label).toBe('Ajouter une pièce');
      expect(last.isActive).toBeTrue();
      expect(trail.map((t: any) => t.label)).toContain('PRJ-1');
    });

    it('inclut la session pour un SSDGPS multi-session', () => {
      (cmp as any).proprieteId = 'prop1';
      (cmp as any).affaireId = 'aff1';
      (cmp as any).sessionId = 'sess1';
      cmp.sessions = [{ id: 'sess1', numero_session: 3 } as any];
      cmp.ssdgps = { id: 's1', numero_ssdgps: 5, type_ssdgps: 'multi-session' } as any;

      (cmp as any).updateTopbarBreadcrumb();
      const trail = breadcrumb.set.calls.mostRecent().args[0];
      expect(trail.map((t: any) => t.label)).toContain('Session 3');
    });

    it('ne publie rien sans SSDGPS', () => {
      (cmp as any).ssdgps = undefined;
      (cmp as any).updateTopbarBreadcrumb();
      expect(breadcrumb.set).not.toHaveBeenCalled();
    });
  });
});

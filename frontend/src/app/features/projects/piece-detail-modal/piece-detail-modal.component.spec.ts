import { PieceDetailModalComponent } from './piece-detail-modal.component';

describe('PieceDetailModalComponent (helpers)', () => {
  let cmp: PieceDetailModalComponent;

  beforeEach(() => {
    cmp = new PieceDetailModalComponent({} as any, {} as any, {} as any, {} as any, {} as any);
  });

  it('statutBadgeClass mappe les statuts', () => {
    expect(cmp.statutBadgeClass('brouillon')).toBe('badge-warning');
    expect(cmp.statutBadgeClass('valide')).toBe('badge-success');
    expect(cmp.statutBadgeClass('inconnu')).toBe('badge-secondary');
  });

  it('statutLabel renvoie la valeur brute si inconnue', () => {
    expect(cmp.statutLabel('valeur_x')).toBe('valeur_x');
  });

  it('autoSaving reflète les sauvegardes en cours', () => {
    expect(cmp.autoSaving).toBeFalse();
    (cmp as any).savingManual = true;
    expect(cmp.autoSaving).toBeTrue();
  });

  it('toggleReplaceMenu bascule le menu', () => {
    expect(cmp.showReplaceMenu).toBeFalse();
    cmp.toggleReplaceMenu();
    expect(cmp.showReplaceMenu).toBeTrue();
  });

  it('isImageFile selon l’extension de fichier_url', () => {
    cmp.piece = { fichier_url: 'photo.PNG' } as any;
    expect(cmp.isImageFile).toBeTrue();
    cmp.piece = { fichier_url: 'doc.pdf' } as any;
    expect(cmp.isImageFile).toBeFalse();
    cmp.piece = {} as any;
    expect(cmp.isImageFile).toBeFalse();
  });
});

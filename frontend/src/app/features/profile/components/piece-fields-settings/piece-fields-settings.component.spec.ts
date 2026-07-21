import { PieceFieldsSettingsComponent } from './piece-fields-settings.component';

describe('PieceFieldsSettingsComponent (logique)', () => {
  let cmp: PieceFieldsSettingsComponent;
  let toastr: jasmine.SpyObj<{ error: any; success: any }>;

  const champs = [
    { name: 'x', label: 'X', required: false },
    { name: 'y', label: 'Y', required: false },
    { name: 'z', label: 'Z', required: true },
  ];

  /** Construit une ligne de type avec les items dérivés du catalogue (tout visible). */
  function row(over: any = {}): any {
    const items = () => champs.map(c => ({ ...c, visible: true }));
    return {
      code: 'RDL', nom: 'Rattachement', hasEcarts: false,
      champsBrut: champs, champsEcarts: [],
      import: { brut: items(), ecarts: [] },
      app: { brut: items(), ecarts: [] },
      pdf: { brut: items(), ecarts: [] },
      ...over,
    };
  }

  beforeEach(() => {
    toastr = jasmine.createSpyObj('ToastrService', ['error', 'success']);
    cmp = new PieceFieldsSettingsComponent({} as any, {} as any, toastr as any, {} as any);
    spyOn<any>(cmp, 'queueAutoSave');
  });

  describe('buildItems (privé)', () => {
    const build = (visible?: string[]) => (cmp as any).buildItems(champs, visible);
    it('undefined = tout visible dans l’ordre catalogue', () => {
      const items = build(undefined);
      expect(items.map((i: any) => i.name)).toEqual(['x', 'y', 'z']);
      expect(items.every((i: any) => i.visible)).toBeTrue();
    });
    it('liste vide = tout masqué', () => {
      expect(build([]).every((i: any) => !i.visible)).toBeTrue();
    });
    it('réordonne les visibles puis ajoute les masqués en fin', () => {
      const items = build(['z', 'x']);
      expect(items.map((i: any) => i.name)).toEqual(['z', 'x', 'y']);
      expect(items[0].visible).toBeTrue();
      expect(items[2].visible).toBeFalse();
    });
  });

  describe('cascade import → app/pdf', () => {
    it('toggleVisible désactivant un champ import le retire de app/pdf', () => {
      const t = row();
      // Désactive 'x' à l'import → cascade
      const xImport = t.import.brut.find((i: any) => i.name === 'x');
      cmp.toggleVisible(t, 'import', 'brut', xImport);
      expect(xImport.visible).toBeFalse();
      expect(t.app.brut.find((i: any) => i.name === 'x').visible).toBeFalse();
      expect(t.pdf.brut.find((i: any) => i.name === 'x').visible).toBeFalse();
    });
    it('isLocked verrouille un champ non importé dans app', () => {
      const t = row();
      t.import.brut.find((i: any) => i.name === 'x').visible = false;
      const xApp = t.app.brut.find((i: any) => i.name === 'x');
      expect(cmp.isLocked(t, 'app', 'brut', xApp)).toBeTrue();
      expect(cmp.isChecked(t, 'app', 'brut', xApp)).toBeFalse();
    });
    it('isLocked verrouille un champ requis dans import', () => {
      const t = row();
      const zImport = t.import.brut.find((i: any) => i.name === 'z');
      expect(cmp.isLocked(t, 'import', 'brut', zImport)).toBeTrue();
      expect(cmp.isChecked(t, 'import', 'brut', zImport)).toBeTrue();
    });
    it('toggleVisible ignore un champ verrouillé', () => {
      const t = row();
      t.import.brut.find((i: any) => i.name === 'x').visible = false;
      const xApp = t.app.brut.find((i: any) => i.name === 'x');
      xApp.visible = false;
      cmp.toggleVisible(t, 'app', 'brut', xApp);
      expect(xApp.visible).toBeFalse(); // reste verrouillé
    });
  });

  describe('résumés & défaut', () => {
    it('visibleCount / summary', () => {
      const t = row();
      t.app.brut[0].visible = false;
      expect(cmp.visibleCount(t, 'app', 'brut')).toBe(2);
      expect(cmp.summary(t, 'app', 'brut')).toBe('2 / 3 colonnes');
    });
    it('isDefault vrai à l’état catalogue, faux après réordonnancement', () => {
      const t = row();
      expect(cmp.isDefault(t, 'app', 'brut')).toBeTrue();
      cmp.moveDown(t, 'app', 'brut', 0);
      expect(cmp.isDefault(t, 'app', 'brut')).toBeFalse();
    });
  });

  describe('réordonnancement', () => {
    it('moveToStart / moveToEnd', () => {
      const t = row();
      cmp.moveToStart(t, 'app', 'brut', 2);
      expect(t.app.brut.map((i: any) => i.name)).toEqual(['z', 'x', 'y']);
      cmp.moveToEnd(t, 'app', 'brut', 0);
      expect(t.app.brut.map((i: any) => i.name)).toEqual(['x', 'y', 'z']);
    });
    it('moveUp ignore le premier, moveDown le dernier', () => {
      const t = row();
      const before = t.app.brut.map((i: any) => i.name);
      cmp.moveUp(t, 'app', 'brut', 0);
      cmp.moveDown(t, 'app', 'brut', 2);
      expect(t.app.brut.map((i: any) => i.name)).toEqual(before);
    });
  });

  describe('sélection groupée', () => {
    it('deselectAll masque tout (hors verrous)', () => {
      const t = row();
      cmp.deselectAll(t, 'app', 'brut');
      expect(cmp.visibleCount(t, 'app', 'brut')).toBe(0);
    });
    it('selectAll coche les activables', () => {
      const t = row();
      cmp.deselectAll(t, 'app', 'brut');
      cmp.selectAll(t, 'app', 'brut');
      expect(cmp.visibleCount(t, 'app', 'brut')).toBe(3);
    });
    it('invertSelection inverse les activables', () => {
      const t = row();
      t.app.brut[0].visible = false; // x masqué, y/z visibles
      cmp.invertSelection(t, 'app', 'brut');
      expect(t.app.brut.find((i: any) => i.name === 'x').visible).toBeTrue();
      expect(t.app.brut.find((i: any) => i.name === 'y').visible).toBeFalse();
    });
    it('resetView remet tout visible dans l’ordre catalogue', () => {
      const t = row();
      cmp.moveToEnd(t, 'app', 'brut', 0);
      t.app.brut[0].visible = false;
      cmp.resetView(t, 'app', 'brut');
      expect(cmp.isDefault(t, 'app', 'brut')).toBeTrue();
    });
  });

  describe('serializeView (privé)', () => {
    const serialize = (t: any, view: any, v: any) => (cmp as any).serializeView(t, view, v);
    it('undefined à l’état par défaut', () => {
      const t = row();
      expect(serialize(t, 'app', 'brut')).toBeUndefined();
    });
    it('liste ordonnée des visibles sinon', () => {
      const t = row();
      t.app.brut[1].visible = false; // masque y
      expect(serialize(t, 'app', 'brut')).toEqual(['x', 'z']);
    });
  });
});

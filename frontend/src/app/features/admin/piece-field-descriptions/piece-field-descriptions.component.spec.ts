import { PieceFieldDescriptionsComponent } from './piece-field-descriptions.component';

describe('PieceFieldDescriptionsComponent (logique)', () => {
  let cmp: PieceFieldDescriptionsComponent;
  let toastr: jasmine.SpyObj<{ error: any }>;

  function block(over: any = {}): any {
    return {
      code: 'RDL', nom: 'Rattachement', collapsed: false,
      catalogFields: [{ name: 'x', label: 'X', origin: 'brut', description: '', tooltip: '' }],
      customFields: [],
      ...over,
    };
  }

  beforeEach(() => {
    toastr = jasmine.createSpyObj('ToastrService', ['error']);
    cmp = new PieceFieldDescriptionsComponent({} as any, toastr as any);
    spyOn<any>(cmp, 'queueAutoSave');
  });

  describe('build (privé)', () => {
    const build = (catalog: any[]) => (cmp as any).build(catalog);
    it('sépare champs catalogue et personnalisés, dédup les noms', () => {
      const blocks = build([{
        code: 'RDL', nom: 'Rattachement',
        champs: [
          { name: 'x', label: 'X' },
          { name: 'x', label: 'X bis' }, // doublon ignoré
          { name: 'c1', label: 'Perso', custom: true, type: 'number' },
        ],
        ecarts_champs: [{ name: 'ex', label: 'EX' }],
      }]);
      expect(blocks[0].catalogFields.map((f: any) => f.name)).toEqual(['x', 'ex']);
      expect(blocks[0].customFields.map((f: any) => f.name)).toEqual(['c1']);
      expect(blocks[0].catalogFields[1].origin).toBe('ecarts');
    });
  });

  describe('accordéons', () => {
    it('toggleMaster / toggleType', () => {
      cmp.masterCollapsed = false;
      cmp.toggleMaster();
      expect(cmp.masterCollapsed).toBeTrue();
      const t = block();
      cmp.toggleType(t);
      expect(t.collapsed).toBeTrue();
    });
    it('expandAll / collapseAll', () => {
      cmp.types = [block({ collapsed: true }), block({ collapsed: true })];
      cmp.masterCollapsed = true;
      cmp.expandAll();
      expect(cmp.masterCollapsed).toBeFalse();
      expect(cmp.types.every(t => !t.collapsed)).toBeTrue();
      cmp.collapseAll();
      expect(cmp.types.every(t => t.collapsed)).toBeTrue();
    });
  });

  describe('compteurs', () => {
    it('documentedCount compte les champs documentés', () => {
      const t = block({
        catalogFields: [
          { name: 'x', label: 'X', description: 'desc', tooltip: '' },
          { name: 'y', label: 'Y', description: '', tooltip: '' },
        ],
        customFields: [{ name: 'c', label: 'C', description: '', tooltip: 'tip' }],
      });
      expect(cmp.documentedCount(t)).toBe(2);
      expect(cmp.fieldCount(t)).toBe(3);
    });
  });

  describe('champs personnalisés', () => {
    it('addCustomField ajoute une ligne vide et déplie', () => {
      const t = block({ collapsed: true });
      cmp.addCustomField(t);
      expect(t.customFields.length).toBe(1);
      expect(t.collapsed).toBeFalse();
    });
    it('removeCustomField retire par index', () => {
      const t = block({ customFields: [{ name: 'a' }, { name: 'b' }] });
      cmp.removeCustomField(t, 0);
      expect(t.customFields.map((f: any) => f.name)).toEqual(['b']);
    });
  });

  describe('validate (privé)', () => {
    const validate = () => (cmp as any).validate();
    it('null quand tout est valide', () => {
      cmp.types = [block({ customFields: [{ name: 'mon_champ', label: 'Mon', type: 'text', description: '', tooltip: '' }] })];
      expect(validate()).toBeNull();
    });
    it('signale un nom manquant', () => {
      cmp.types = [block({ customFields: [{ name: '', label: 'L', type: 'text', description: '', tooltip: '' }] })];
      expect(validate()).toContain('nom technique');
    });
    it('signale un nom invalide', () => {
      cmp.types = [block({ customFields: [{ name: '1bad', label: 'L', type: 'text', description: '', tooltip: '' }] })];
      expect(validate()).toContain('invalide');
    });
    it('signale un libellé manquant', () => {
      cmp.types = [block({ customFields: [{ name: 'ok', label: '', type: 'text', description: '', tooltip: '' }] })];
      expect(validate()).toContain('libellé');
    });
    it('signale un doublon', () => {
      cmp.types = [block({ customFields: [
        { name: 'dup', label: 'A', type: 'text', description: '', tooltip: '' },
        { name: 'dup', label: 'B', type: 'text', description: '', tooltip: '' },
      ] })];
      expect(validate()).toContain('double');
    });
  });

  describe('buildPayload (privé)', () => {
    it('assemble descriptions catalogue + champs custom par type', () => {
      cmp.types = [block({
        catalogFields: [{ name: 'x', label: 'X', origin: 'brut', description: ' desc ', tooltip: ' tip ' }],
        customFields: [{ name: ' c ', label: ' Perso ', type: 'number', description: '', tooltip: '' }],
      })];
      const payload = (cmp as any).buildPayload();
      expect(payload['RDL'].fields['x']).toEqual({ description: 'desc', tooltip: 'tip' });
      expect(payload['RDL'].custom[0]).toEqual({
        name: 'c', label: 'Perso', type: 'number', description: '', tooltip: '',
      });
    });
  });
});

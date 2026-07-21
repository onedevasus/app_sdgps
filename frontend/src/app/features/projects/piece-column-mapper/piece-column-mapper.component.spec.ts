import { FormBuilder } from '@angular/forms';
import { PieceColumnMapperComponent } from './piece-column-mapper.component';

describe('PieceColumnMapperComponent (mapping)', () => {
  let cmp: PieceColumnMapperComponent;
  const fb = new FormBuilder();

  beforeEach(() => {
    cmp = new PieceColumnMapperComponent(fb);
    cmp.champs = [{ name: 'a' } as any, { name: 'b' } as any];
    cmp.form = fb.group({ a: 'COL_A', b: '' });
    (cmp as any).originalSuggestions = { a: 'COL_A', b: '' };
  });

  it('totalChamps / mappedCount', () => {
    expect(cmp.totalChamps).toBe(2);
    expect(cmp.mappedCount).toBe(1); // seul « a » est mappé
  });

  it('previewColumns ne garde que les champs mappés', () => {
    expect(cmp.previewColumns.map(c => c.name)).toEqual(['a']);
  });

  it('isModified détecte un écart avec la suggestion d’origine', () => {
    expect(cmp.isModified('a')).toBeFalse();
    cmp.form.get('a')?.setValue('AUTRE_COL');
    expect(cmp.isModified('a')).toBeTrue();
  });
});

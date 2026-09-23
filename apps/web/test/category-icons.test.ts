import { describe, expect, it } from 'vitest';
import { CATEGORY_ICON_OPTIONS, isCategoryIcon, resolveCategoryIcon } from '../src/lib/directory/category-icons';

describe('biblioteca canonica de icones de categorias', () => {
  it('mantem valores unicos e reconhecidos pelo Guia', () => {
    const values = CATEGORY_ICON_OPTIONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every(isCategoryIcon)).toBe(true);
  });

  it('resolve icone conhecido e aplica fallback seguro', () => {
    expect(resolveCategoryIcon('saude')).toBe(resolveCategoryIcon('stethoscope'));
    expect(resolveCategoryIcon('icone-inexistente')).toBe(resolveCategoryIcon('briefcase'));
  });
});

import { describe, expect, it } from 'vitest';
import {
  deduplicateCategoriesByName,
  isSameCategoryName,
  normalizeCategoryKey,
} from '../category-dedup';

describe('category-dedup', () => {
  it('normalizes category names ignoring accents, case and punctuation', () => {
    expect(normalizeCategoryKey('Máquinas e Equipamentos')).toBe('maquinas e equipamentos');
    expect(normalizeCategoryKey('  maquinas   e   equipamentos ')).toBe('maquinas e equipamentos');
    expect(isSameCategoryName('Segurança', 'Seguranca')).toBe(true);
    expect(isSameCategoryName('Psicologia', 'Direito')).toBe(false);
  });

  it('deduplicates categories preferring the accented spelling', () => {
    const deduped = deduplicateCategoriesByName([
      { id: '1', name: 'Seguranca' },
      { id: '2', name: 'Segurança' },
      { id: '3', name: 'Maquinas' },
      { id: '4', name: 'Máquinas' },
      { id: '5', name: 'Advocacia' },
    ]);

    expect(deduped).toEqual([
      { id: '5', name: 'Advocacia' },
      { id: '4', name: 'Máquinas' },
      { id: '2', name: 'Segurança' },
    ]);
  });
});


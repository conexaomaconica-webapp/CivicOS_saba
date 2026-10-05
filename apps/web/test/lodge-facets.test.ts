import { describe, it, expect } from 'vitest';
import { buildLodgeFacets } from '@/lib/lodges/facets';

describe('buildLodgeFacets', () => {
  it('monta estados, cidades por estado, potências e ritos reais, sem repetição e em ordem', () => {
    const facets = buildLodgeFacets([
      { city: 'Salvador', state: 'ba', potency: 'GOB', rite: 'REAA' },
      { city: 'Feira de Santana', state: 'BA', potency: 'GLBA', rite: 'York' },
      { city: 'Salvador', state: 'BA', potency: 'GOB', rite: null },
      { city: 'São Paulo', state: 'SP', potency: 'GOB', rite: 'REAA' },
      { city: null, state: null, potency: null, rite: null },
    ]);
    expect(facets.states).toEqual(['BA', 'SP']);
    expect(facets.cities).toEqual(['Feira de Santana', 'Salvador', 'São Paulo']);
    expect(facets.citiesByState).toEqual({ BA: ['Feira de Santana', 'Salvador'], SP: ['São Paulo'] });
    expect(facets.potencies.map((p) => p.value)).toEqual(['GLBA', 'GOB']);
    expect(facets.rites).toEqual(['REAA', 'York']);
    expect(facets.total).toBe(5);
  });
});

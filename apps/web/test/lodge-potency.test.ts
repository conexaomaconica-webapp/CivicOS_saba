import { describe, it, expect } from 'vitest';
import { canonicalPotencyCode, potencyLabel } from '@/lib/lodges/potency';
import { buildLodgeFacets } from '@/lib/lodges/facets';

describe('canonicalPotencyCode', () => {
  it('remove o estado do final, com qualquer separador', () => {
    expect(canonicalPotencyCode('CMSB/BA')).toBe('CMSB');
    expect(canonicalPotencyCode('CMSB/RJ')).toBe('CMSB');
    expect(canonicalPotencyCode('cmsb - sp')).toBe('CMSB');
    expect(canonicalPotencyCode('GOB RJ')).toBe('GOB');
    expect(canonicalPotencyCode('COMAB–MG')).toBe('COMAB');
  });

  it('não mexe no que não termina em UF', () => {
    expect(canonicalPotencyCode('CMSB')).toBe('CMSB');
    expect(canonicalPotencyCode('GLMERJ')).toBe('GLMERJ');
    expect(canonicalPotencyCode('Grande Oriente do Brasil')).toBe('Grande Oriente do Brasil');
    expect(canonicalPotencyCode('')).toBe('');
    expect(canonicalPotencyCode(null)).toBe('');
  });

  it('a base nunca fica vazia', () => {
    expect(canonicalPotencyCode('BA')).toBe('BA');
    expect(canonicalPotencyCode('/BA')).toBe('/BA');
  });
});

describe('potencyLabel', () => {
  it('usa o nome conhecido ou do catálogo', () => {
    expect(potencyLabel('CMSB')).toBe('Grande Loja Maçônica - CMSB');
    expect(potencyLabel('GOB')).toBe('Grande Oriente do Brasil - GOB');
    expect(potencyLabel('XYZ')).toBe('XYZ');
    expect(potencyLabel('GLBA', 'Grande Loja do Brasil')).toBe('Grande Loja do Brasil - GLBA');
    expect(potencyLabel('GOB', 'GOB')).toBe('GOB');
  });
});

describe('facetas de potência', () => {
  it('as potências separadas por estado viram uma só opção', () => {
    const facets = buildLodgeFacets([
      { city: 'Salvador', state: 'BA', potency: 'CMSB/BA' },
      { city: 'Rio', state: 'RJ', potency: 'CMSB/RJ' },
      { city: 'SP', state: 'SP', potency: 'GOB-SP' },
      { city: 'Niterói', state: 'RJ', potency: 'GOB' },
    ]);
    expect(facets.potencies.map((p) => p.value)).toEqual(['CMSB', 'GOB']);
    expect(facets.potencies[0]?.label).toBe('Grande Loja Maçônica - CMSB');
  });
});

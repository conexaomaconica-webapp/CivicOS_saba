import { describe, it, expect } from 'vitest';
import { interpretLodgeQueryByRules, type LodgeSearchFacets } from '@/lib/lodges/smart-search';

const facets: LodgeSearchFacets = {
  cities: ['Feira de Santana', 'Salvador', 'Santana', 'São Paulo'],
  potencies: [
    { abbreviation: 'GOB', name: 'Grande Oriente do Brasil', slug: 'gob' },
    { abbreviation: 'GLBA', name: 'Grande Loja Maçônica', slug: 'glba' },
  ],
  rites: [
    { name: 'Rito Escocês Antigo e Aceito (REAA)', slug: 'reaa' },
    { name: 'Rito York', slug: 'york' },
  ],
};

describe('interpretLodgeQueryByRules', () => {
  it('entende cidade, potência e dia numa frase', () => {
    const r = interpretLodgeQueryByRules('lojas GOB em Feira de Santana que reúnem na quarta-feira', facets);
    expect(r.city).toBe('Feira de Santana');
    expect(r.potency).toBe('GOB');
    expect(r.day).toBe('quarta');
    expect(r.query).toBe('');
  });

  it('prefere a cidade mais longa ("Feira de Santana" e não "Santana")', () => {
    expect(interpretLodgeQueryByRules('feira de santana', facets).city).toBe('Feira de Santana');
  });

  it('ignora acentos e maiúsculas', () => {
    expect(interpretLodgeQueryByRules('SAO PAULO', facets).city).toBe('São Paulo');
  });

  it('reconhece rito por apelido e por nome', () => {
    expect(interpretLodgeQueryByRules('rito york em salvador', facets)).toMatchObject({ rite: 'york', city: 'Salvador' });
    expect(interpretLodgeQueryByRules('REAA', facets).rite).toBe('reaa');
  });

  it('reconhece estado por nome', () => {
    expect(interpretLodgeQueryByRules('lojas na Bahia', facets).state).toBe('BA');
  });

  it('mantém o nome/número como texto de busca', () => {
    const r = interpretLodgeQueryByRules('Loja 16 de Junho nº 1842 Salvador', facets);
    expect(r.city).toBe('Salvador');
    expect(r.query).toContain('16 de junho');
    expect(r.query).toContain('1842');
  });

  it('sem nada reconhecido, a frase vira busca textual', () => {
    const r = interpretLodgeQueryByRules('Esperança da Pátria', facets);
    expect(r).toMatchObject({ city: '', potency: '', rite: '', day: '', state: '' });
    expect(r.query).toBe('esperanca da patria');
  });
});

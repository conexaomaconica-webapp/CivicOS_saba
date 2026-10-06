import { describe, expect, it } from 'vitest';
import { genericCrestForPotency } from '../src/lib/lodges/generic-crest';

describe('genericCrestForPotency', () => {
  it('resolve a potência-base, inclusive com UF', () => {
    expect(genericCrestForPotency('GOB')).toContain('logo-generico-gob-baiano');
    expect(genericCrestForPotency('gob - ba')).toContain('logo-generico-gob-baiano');
    expect(genericCrestForPotency('CMSB/BA')).toContain('logo-generico-cmsb');
    expect(genericCrestForPotency('COMAB')).toContain('logo-generico-comab');
    expect(genericCrestForPotency('GOSP')).toContain('logo-generico-gosp');
  });

  it('resolve a potência escrita por extenso, como aparece nos cards', () => {
    expect(genericCrestForPotency('GRANDE ORIENTE DO BRASIL – GOB')).toContain('logo-generico-gob-baiano');
    expect(genericCrestForPotency('Grande Oriente do Brasil')).toContain('logo-generico-gob-baiano');
    expect(genericCrestForPotency('GRANDE LOJA - CMSB')).toContain('logo-generico-cmsb');
    expect(genericCrestForPotency('Grande Loja Maçônica')).toContain('logo-generico-cmsb');
  });

  it('potência sem genérico ou vazia não devolve imagem', () => {
    expect(genericCrestForPotency('GLBA')).toBeNull();
    expect(genericCrestForPotency('')).toBeNull();
    expect(genericCrestForPotency(null)).toBeNull();
  });
});

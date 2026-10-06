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

  it('potência sem genérico ou vazia não devolve imagem', () => {
    expect(genericCrestForPotency('GLBA')).toBeNull();
    expect(genericCrestForPotency('')).toBeNull();
    expect(genericCrestForPotency(null)).toBeNull();
  });
});

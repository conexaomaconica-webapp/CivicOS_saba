import { describe, expect, it } from 'vitest';
import { parseLegacyAddress } from '../src/lib/admin/legacy-address';

describe('parseLegacyAddress', () => {
  it('separa rua, número e bairro', () => {
    expect(parseLegacyAddress("Avenida Papa João XXIII, 1660, Olhos D'Água")).toEqual({
      street: 'Avenida Papa João XXIII', number: '1660', neighborhood: "Olhos D'Água",
    });
  });
  it('sem número: o segundo pedaço vira bairro', () => {
    expect(parseLegacyAddress('Rua A, Centro')).toEqual({ street: 'Rua A', neighborhood: 'Centro' });
  });
  it('ignora cidade/UF e CEP e aceita S/N', () => {
    expect(parseLegacyAddress('Rua B, S/N, Lagoa, Feira de Santana - BA, CEP 44000-000')).toEqual({
      street: 'Rua B', number: 'S/N', neighborhood: 'Lagoa',
    });
  });
  it('vazio devolve objeto vazio', () => {
    expect(parseLegacyAddress('')).toEqual({});
    expect(parseLegacyAddress(null)).toEqual({});
  });
});

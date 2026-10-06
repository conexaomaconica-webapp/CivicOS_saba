import { describe, expect, it, vi, afterEach } from 'vitest';
import { geocodeBrazilianAddress, isValidBrazilianCoordinate } from '../src/lib/geo/geocode';

afterEach(() => vi.restoreAllMocks());

describe('isValidBrazilianCoordinate', () => {
  it('aceita pontos do Brasil e rejeita o resto', () => {
    expect(isValidBrazilianCoordinate(-12.2740977, -38.9594723)).toBe(true);
    expect(isValidBrazilianCoordinate(40.7, -74.0)).toBe(false); // Nova York
    expect(isValidBrazilianCoordinate(NaN, -38)).toBe(false);
    expect(isValidBrazilianCoordinate('-12', '-38')).toBe(false);
  });
});

describe('geocodeBrazilianAddress', () => {
  it('sem cidade ou estado não consulta nada', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await geocodeBrazilianAddress({ city: '', state: 'BA' })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('devolve a precisão da primeira tentativa que encontra', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ lat: '-12.25', lon: '-38.95' }]), { status: 200 })
    );
    const result = await geocodeBrazilianAddress({ street: 'Rua A', number: '10', city: 'Feira de Santana', state: 'BA' });
    expect(result).toEqual({ latitude: -12.25, longitude: -38.95, precision: 'address' });
  });
});

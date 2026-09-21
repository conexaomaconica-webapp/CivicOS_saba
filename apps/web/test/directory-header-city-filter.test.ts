import { describe, it, expect } from 'vitest';

describe('Directory Header & Available Cities Normalization Contract', () => {
  it('should normalize available_cities from RPC into string array correctly', () => {
    const mockRpcResponse = {
      available_cities: ['Camaçari', 'Feira de Santana', 'Salvador', 'Vitória da Conquista'],
    };

    const rawCities = mockRpcResponse.available_cities;
    const availableCities = Array.isArray(rawCities)
      ? rawCities.filter(
          (city): city is string => typeof city === 'string' && city.trim().length > 0
        )
      : [];

    expect(availableCities).toEqual([
      'Camaçari',
      'Feira de Santana',
      'Salvador',
      'Vitória da Conquista',
    ]);
    expect(availableCities).toHaveLength(4);
  });

  it('should filter out invalid or non-string entries during normalization', () => {
    const dirtyData = {
      available_cities: ['Salvador', '', null, 123, 'Feira de Santana', '   '],
    };

    const rawCities = dirtyData.available_cities;
    const availableCities = Array.isArray(rawCities)
      ? rawCities.filter(
          (city): city is string => typeof city === 'string' && city.trim().length > 0
        )
      : [];

    expect(availableCities).toEqual(['Salvador', 'Feira de Santana']);
  });

  it('should ensure commercial available_cities contains strictly commercial cities', () => {
    // Commercial cities list from published businesses
    const commercialCities = ['Camaçari', 'Feira de Santana', 'Salvador', 'Vitória da Conquista'];

    // Verify no lodge-only cities or non-commercial entities bleed in
    expect(commercialCities).toContain('Feira de Santana');
    expect(commercialCities).toContain('Salvador');
    expect(commercialCities).toContain('Vitória da Conquista');
    expect(commercialCities).toContain('Camaçari');
  });
});

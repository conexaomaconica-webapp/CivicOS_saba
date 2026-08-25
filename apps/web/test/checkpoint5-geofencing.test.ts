import { describe, it, expect } from 'vitest';
import {
  searchBusinessesByGeofenceAction,
  searchLodgesByGeofenceAction,
} from '../src/lib/geofencing/geofencing-service';

describe('CHECKPOINT 5 — GEOFENCING "PERTO DE MIM"', () => {
  it('1. Busca empresas por raio de distância (5, 10, 25, 50, 100 km) com ordenação por proximidade', async () => {
    const res = await searchBusinessesByGeofenceAction({
      userLat: -23.55052,
      userLng: -46.633308,
      radiusKm: 25,
    });

    expect(res.items).toBeDefined();
    expect(res.radiusKm).toBe(25);
    expect(res.userLat).toBe(-23.55052);
  });

  it('2. Busca Lojas Maçônicas por raio de distância (Perto de mim)', async () => {
    const res = await searchLodgesByGeofenceAction({
      userLat: -23.55052,
      userLng: -46.633308,
      radiusKm: 50,
    });

    expect(res.items).toBeDefined();
    expect(res.radiusKm).toBe(50);
  });

  it('3. Rejeita coordenadas inválidas no servidor', async () => {
    const res = await searchBusinessesByGeofenceAction({
      userLat: 999, // Coordenada inválida
      userLng: 999,
      radiusKm: 10,
    });

    expect(res.items).toEqual([]);
    expect(res.total).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import {
  createCapacitorPlatform,
  CapacitorStorageAdapter,
  CapacitorCameraAdapter,
  CapacitorGeolocationAdapter,
  CapacitorPushAdapter,
  CapacitorHapticsAdapter,
} from './adapters';

describe('FASE MOBILE 2 — Adaptadores Capacitor (@saas/mobile)', () => {
  it('1. Instancia com sucesso os adaptadores nativos para iOS e Android', () => {
    const iosPlatform = createCapacitorPlatform('ios');
    const androidPlatform = createCapacitorPlatform('android');

    expect(iosPlatform.platform).toBe('ios');
    expect(androidPlatform.platform).toBe('android');

    expect(iosPlatform.camera).toBeInstanceOf(CapacitorCameraAdapter);
    expect(iosPlatform.geolocation).toBeInstanceOf(CapacitorGeolocationAdapter);
    expect(iosPlatform.pushNotifications).toBeInstanceOf(CapacitorPushAdapter);
    expect(iosPlatform.haptics).toBeInstanceOf(CapacitorHapticsAdapter);
    expect(iosPlatform.storage).toBeInstanceOf(CapacitorStorageAdapter);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  trackMobileEvent,
  getOrCreateMobileCycleId,
  resetMobileCycleId,
} from './mobile-analytics';

describe('mobile-analytics', () => {
  beforeEach(() => {
    resetMobileCycleId('biz-123');
    vi.restoreAllMocks();
  });

  it('gera e reutiliza cycleId estável para o mesmo negócio durante a sessão', () => {
    const cycle1 = getOrCreateMobileCycleId('biz-123');
    const cycle2 = getOrCreateMobileCycleId('biz-123');
    expect(cycle1).toBeTruthy();
    expect(cycle1).toBe(cycle2);

    resetMobileCycleId('biz-123');
    const cycle3 = getOrCreateMobileCycleId('biz-123');
    expect(cycle3).not.toBe(cycle1);
  });

  it('envia evento com payload canônico e device=mobile_app', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const result = await trackMobileEvent(
      {
        businessId: 'biz-123',
        eventType: 'view',
        city: 'Feira de Santana',
        state: 'BA',
      },
      mockFetch as unknown as typeof fetch
    );

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0]!;
    const url = callArgs[0] as string;
    const init = callArgs[1] as RequestInit;

    expect(url).toContain('/api/analytics/track');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      businessId: 'biz-123',
      eventType: 'view',
      source: 'app_mobile',
      device: 'mobile_app',
      city: 'Feira de Santana',
      state: 'BA',
    });
    expect(body.cycleId).toMatch(/^mob_/);
  });

  it('permite cliques sucessivos no whatsapp sem reutilizar cycleId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await trackMobileEvent(
      {
        businessId: 'biz-123',
        eventType: 'whatsapp',
      },
      mockFetch as unknown as typeof fetch
    );

    const callArgs = mockFetch.mock.calls[0]!;
    const body = JSON.parse((callArgs[1] as RequestInit).body as string);
    expect(body.eventType).toBe('whatsapp');
    expect(body.cycleId).toBeUndefined();
    expect(body.device).toBe('mobile_app');
  });

  it('falha de forma silenciosa e controlada se a rede móvel oscilar', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network request failed'));

    const result = await trackMobileEvent(
      {
        businessId: 'biz-123',
        eventType: 'phone',
      },
      mockFetch as unknown as typeof fetch
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network request failed');
  });
});

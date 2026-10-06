import { describe, expect, it, vi } from 'vitest';

const track = vi.fn().mockResolvedValue({ ok: true });
const impressions = vi.fn().mockResolvedValue({ ok: true, count: 2 });
vi.mock('../src/lib/analytics/analytics-service', () => ({
  trackDirectoryEventAction: (...a: unknown[]) => track(...a),
  trackSearchImpressionsAction: (...a: unknown[]) => impressions(...a),
}));

import { POST } from '../src/app/api/analytics/track/route';

const ID = '123e4567-e89b-42d3-a456-426614174000';
function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/analytics/track', {
    method: 'POST',
    headers: { host: 'localhost', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/analytics/track', () => {
  it('grava um evento válido', async () => {
    const res = await POST(req({ businessId: ID, eventType: 'whatsapp_click', source: 'business_profile' }));
    expect(res.status).toBe(200);
    expect(track).toHaveBeenCalledWith({ businessId: ID, eventType: 'whatsapp_click', source: 'business_profile' });
  });

  it('grava aparições em lote', async () => {
    const res = await POST(req({ eventType: 'search_impression', businessIds: [ID, 'invalido'], source: 'directory_list' }));
    expect(res.status).toBe(200);
    expect(impressions).toHaveBeenCalledWith([ID], 'directory_list');
  });

  it('rejeita evento desconhecido, id inválido e JSON quebrado', async () => {
    expect((await POST(req({ businessId: ID, eventType: 'hack' }))).status).toBe(400);
    expect((await POST(req({ businessId: 'x', eventType: 'share' }))).status).toBe(400);
    expect((await POST(req('{nao-e-json'))).status).toBe(400);
  });

  it('rejeita origem diferente do host', async () => {
    const res = await POST(req({ businessId: ID, eventType: 'share' }, { origin: 'https://outro-site.com' }));
    expect(res.status).toBe(403);
  });
});

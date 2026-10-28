import { describe, expect, it, vi } from 'vitest';

const track = vi.fn().mockResolvedValue({ ok: true });
const impressions = vi.fn().mockResolvedValue({ ok: true, count: 2 });
vi.mock('../src/lib/analytics/analytics-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/analytics/analytics-service')>();
  return {
    ...actual,
    trackDirectoryEventAction: (...a: unknown[]) => track(...a),
    trackSearchImpressionsAction: (...a: unknown[]) => impressions(...a),
  };
});

import { POST, OPTIONS } from '../src/app/api/analytics/track/route';

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
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ businessId: ID, eventType: 'whatsapp_click', source: 'business_profile' }));
  });

  it('normaliza eventos móveis (Capacitor) para vocabulário canônico', async () => {
    const resWa = await POST(req({ businessId: ID, eventType: 'whatsapp', device: 'mobile_app' }));
    expect(resWa.status).toBe(200);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ businessId: ID, eventType: 'whatsapp_click', device: 'mobile_app' }));

    const resRoute = await POST(req({ businessId: ID, eventType: 'route' }, { 'x-client-platform': 'mobile_app' }));
    expect(resRoute.status).toBe(200);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ businessId: ID, eventType: 'directions_click', device: 'mobile_app' }));

    const resPhone = await POST(req({ businessId: ID, eventType: 'phone' }));
    expect(resPhone.status).toBe(200);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ businessId: ID, eventType: 'phone_click' }));
  });

  it('permite origem de aplicativo móvel Capacitor', async () => {
    const res = await POST(req({ businessId: ID, eventType: 'view', cycleId: 'mob_173000000_abc123' }, { origin: 'capacitor://localhost' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('capacitor://localhost');
  });

  it('responde a requisições de preflight OPTIONS com cabeçalhos CORS', async () => {
    const optReq = new Request('http://localhost/api/analytics/track', {
      method: 'OPTIONS',
      headers: { host: 'localhost', origin: 'capacitor://localhost' },
    });
    const res = await OPTIONS(optReq);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('capacitor://localhost');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
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

  it('rejeita cycleId malformado para visualizações', async () => {
    const res = await POST(req({ businessId: ID, eventType: 'view', cycleId: '<script>alert(1)</script>' }));
    expect(res.status).toBe(400);
  });

  it('rejeita origem não autorizada', async () => {
    const res = await POST(req({ businessId: ID, eventType: 'share' }, { origin: 'https://outro-site.com' }));
    expect(res.status).toBe(403);
  });
});

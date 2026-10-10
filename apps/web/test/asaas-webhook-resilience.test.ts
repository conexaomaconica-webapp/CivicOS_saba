import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/webhooks/asaas/route';

vi.mock('@/lib/payment/commercial-onboarding-webhook-service', () => ({
  validateAsaasWebhookToken: vi.fn(async (token: string | null) => token === 'valid-secret-token'),
  reconcileCommercialPaymentWebhook: vi.fn(async () => ({ success: false, reconciled: false })),
}));

vi.mock('@/lib/billing/billing-adapters', () => ({
  AsaasBillingAdapter: {
    parseEvent: vi.fn(() => ({
      provider: 'asaas',
      providerEventId: 'evt_test_123',
      canonicalEvent: 'PAYMENT_CONFIRMED',
      businessId: 'biz_test_uuid',
      userId: 'usr_test_uuid',
      planCode: 'esquadro',
      amountCents: 10000,
      rawPayload: { id: 'evt_test_123', event: 'PAYMENT_CONFIRMED' },
    })),
  },
}));

// Mock do createClient do Supabase
const mockRpc = vi.fn();
const mockFrom = vi.fn(() => ({
  insert: vi.fn(() => Promise.resolve({ error: null })),
  update: vi.fn(() => ({
    match: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  })),
}));

describe('M1.3 — Resiliência Operacional do Webhook Asaas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejeita requisições sem token de acesso ou com token inválido com HTTP 401', async () => {
    const req = new Request('https://www.conexaomaconica.com.br/api/webhooks/asaas', {
      method: 'POST',
      headers: {
        'asaas-access-token': 'token-invalido',
      },
      body: JSON.stringify({ event: 'PAYMENT_CONFIRMED' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error).toContain('UNAUTHORIZED');
  });

  it('rejeita payload com JSON quebrado sem estourar 500 no servidor', async () => {
    const req = new Request('https://www.conexaomaconica.com.br/api/webhooks/asaas', {
      method: 'POST',
      headers: {
        'asaas-access-token': 'valid-secret-token',
      },
      body: 'nao-e-um-json-valido',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('INVALID_PAYLOAD');
  });

  it('processa evento financeiro com sucesso e retorna HTTP 200', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, processed: true }, error: null });

    const req = new Request('https://www.conexaomaconica.com.br/api/webhooks/asaas', {
      method: 'POST',
      headers: {
        'asaas-access-token': 'valid-secret-token',
        'asaas-event-id': 'evt_test_123',
      },
      body: JSON.stringify({ event: 'PAYMENT_CONFIRMED', id: 'evt_test_123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.result).toEqual({ success: true, processed: true });
  });

  it('registra falha crítica quando o RPC falha, incluindo incident_id e sem vazar dados', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Empresa não encontrada no tenant para ativação' },
    });

    const req = new Request('https://www.conexaomaconica.com.br/api/webhooks/asaas', {
      method: 'POST',
      headers: {
        'asaas-access-token': 'valid-secret-token',
        'asaas-event-id': 'evt_test_123',
      },
      body: JSON.stringify({ event: 'PAYMENT_CONFIRMED', id: 'evt_test_123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('Empresa não encontrada');
    expect(typeof json.incident_id).toBe('string');
    expect(json.incident_id.startsWith('inc_')).toBe(true);
  });

  it('preserva a resposta ao Asaas mesmo se o envio do webhook de alerta falhar ou der timeout', async () => {
    // Simula falha catastrófica de rede no webhook de alerta externo
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Discord connection timeout'));

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Erro interno de processamento de fatura' },
    });

    const req = new Request('https://www.conexaomaconica.com.br/api/webhooks/asaas', {
      method: 'POST',
      headers: {
        'asaas-access-token': 'valid-secret-token',
        'asaas-event-id': 'evt_test_alert_fail',
      },
      body: JSON.stringify({ event: 'PAYMENT_CONFIRMED', id: 'evt_test_alert_fail' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('Erro interno de processamento de fatura');
    expect(json.incident_id).toBeDefined();

    fetchSpy.mockRestore();
  });
});


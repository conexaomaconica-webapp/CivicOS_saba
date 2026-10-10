import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/telemetry/errors/route';
import { reportClientError } from '@/lib/observability/client-reporter';

describe('M1.3 — Telemetria de Erros de Cliente (/api/telemetry/errors) — Zero Sentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('processa reporte válido com digest e rota e retorna HTTP 200 com incident_id', async () => {
    const payload = {
      digest: 'digest_hash_123',
      message: 'Erro ao renderizar componente de busca',
      pathname: '/guia/empresas',
      source: 'error-boundary',
    };

    const req = new Request('https://www.conexaomaconica.com.br/api/telemetry/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '187.12.34.56',
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.received).toBe(true);
    expect(typeof json.incident_id).toBe('string');
    expect(json.incident_id.startsWith('inc_')).toBe(true);
  });

  it('suprime rajadas repetidas pelo cache de deduplicação', async () => {
    const payload = {
      digest: 'digest_repetitivo',
      message: 'Erro em loop infinito',
      pathname: '/mural',
    };

    const makeReq = () =>
      new Request('https://www.conexaomaconica.com.br/api/telemetry/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '187.12.34.57',
        },
        body: JSON.stringify(payload),
      });

    const res1 = await POST(makeReq());
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.received).toBe(true);
    expect(json1.deduplicated).toBeUndefined();

    // Segunda chamada idêntica deve ser deduplicada
    const res2 = await POST(makeReq());
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.deduplicated).toBe(true);
  });

  it('rejeita requisições que excedam o tamanho limite de 2KB com HTTP 413', async () => {
    const hugeMessage = 'A'.repeat(3000);
    const payload = {
      message: hugeMessage,
    };

    const req = new Request('https://www.conexaomaconica.com.br/api/telemetry/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '187.12.34.58',
        'content-length': String(Buffer.byteLength(JSON.stringify(payload))),
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('sanitiza credenciais e tokens vazados no corpo do reporte de erro', async () => {
    const payload = {
      message: 'Falha com Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz e cartão 4532-1234-5678-9012',
      pathname: '/checkout?token=secret123',
    };

    const req = new Request('https://www.conexaomaconica.com.br/api/telemetry/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '187.12.34.59',
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('reportClientError executa fetch sem quebrar quando executado no cliente', () => {
    (globalThis as any).window = { location: { pathname: '/guia' } };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"received":true}'));

    const mockError = new Error('Erro de renderização React') as Error & { digest?: string };
    mockError.digest = 'digest_teste_client';

    expect(() => {
      reportClientError(mockError, 'error-boundary');
    }).not.toThrow();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/telemetry/errors',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    delete (globalThis as any).window;
    fetchSpy.mockRestore();
  });
});

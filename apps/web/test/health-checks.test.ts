import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as getLiveness } from '@/app/health/route';
import { GET as getReadiness } from '@/app/api/health/ready/route';

describe('M1.2 — Verificação de Disponibilidade (Health Checks em Duas Camadas)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('Liveness Probe Público (/health)', () => {
    it('retorna HTTP 200 de forma imediata e sem expor dados internos', async () => {
      const response = await getLiveness();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.ok).toBe(true);

      // Verifica cabeçalhos de segurança contra indexação e cache
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');

      // Garante que não há vazamento de chaves ou versões
      expect(json).not.toHaveProperty('version');
      expect(json).not.toHaveProperty('env');
      expect(json).not.toHaveProperty('database');
    });
  });

  describe('Readiness Probe Protegido (/api/health/ready)', () => {
    it('rejeita requisições não autorizadas com HTTP 401 em ambiente com segredo configurado', async () => {
      process.env.NODE_ENV = 'production';
      process.env.HEALTH_CHECK_SECRET = 'segredo-estrito-de-saude-123';

      const request = new Request('https://www.conexaomaconica.com.br/api/health/ready', {
        headers: { 'x-forwarded-for': '200.100.50.1' },
      });

      const response = await getReadiness(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toContain('UNAUTHORIZED');
    });

    it('aceita requisições autenticadas via header Bearer token', async () => {
      process.env.NODE_ENV = 'production';
      process.env.HEALTH_CHECK_SECRET = 'segredo-estrito-de-saude-123';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-de-teste';

      // Mock do fetch global para simular Supabase respondendo com sucesso
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify([{ id: 'mock-id' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const request = new Request('https://www.conexaomaconica.com.br/api/health/ready', {
        headers: {
          authorization: 'Bearer segredo-estrito-de-saude-123',
          'x-forwarded-for': '10.0.0.1',
        },
      });

      const response = await getReadiness(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe('ready');
      expect(json.web).toBe('healthy');
      expect(json.database).toBe('healthy');
      expect(typeof json.timestamp).toBe('string');

      fetchSpy.mockRestore();
    });

    it('retorna HTTP 503 com status degraded quando o banco falha, sem vazar stack trace', async () => {
      process.env.NODE_ENV = 'production';
      process.env.HEALTH_CHECK_SECRET = 'segredo-estrito-de-saude-123';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-de-teste';

      // Simula falha de conexão do Supabase
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused at postgres://secret-user:secret-pass@db:5432'));

      const request = new Request('https://www.conexaomaconica.com.br/api/health/ready', {
        headers: {
          'x-health-key': 'segredo-estrito-de-saude-123',
          'x-forwarded-for': '10.0.0.2',
        },
      });

      const response = await getReadiness(request);
      expect(response.status).toBe(503);

      const json = await response.json();
      expect(json.status).toBe('degraded');
      expect(json.web).toBe('healthy');
      expect(json.database).toBe('unhealthy');
      expect(['DATABASE_QUERY_ERROR', 'DATABASE_TIMEOUT_OR_UNAVAILABLE']).toContain(json.error_code);

      // Garante que a mensagem de erro interna e a string de conexão NUNCA foram expostas
      expect(JSON.stringify(json)).not.toContain('postgres://');
      expect(JSON.stringify(json)).not.toContain('secret-pass');

      fetchSpy.mockRestore();
    });
  });
});

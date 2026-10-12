import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAdminEmailIntegrationOverviewAction,
  testAdminEmailConnectionAction,
  sendAdminTestEmailAction,
} from './email-config-service';

vi.mock('@/lib/admin/admin-auth-helper', () => ({
  assertPlatformAdminAccess: vi.fn().mockResolvedValue({
    user: { id: 'admin-usr-1', email: 'admin@conexaomaconica.com.br' },
    role: 'platform_admin',
    supabase: {},
  }),
}));

describe('EmailConfigService Unit Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.HOSTINGER_MAIL_API_TOKEN = 'hos_token_secret_123456';
    process.env.HOSTINGER_MAILBOX_RESOURCE_ID = 'mbox-resource-987';
    process.env.HOSTINGER_MAIL_API_BASE_URL = 'https://api.mail.hostinger.com';
    process.env.HOSTINGER_MAIL_FROM = 'contato@conexaomaconica.com.br';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe('getAdminEmailIntegrationOverviewAction', () => {
    it('retorna os dados da Hostinger com token devidamente mascarado', async () => {
      const res = await getAdminEmailIntegrationOverviewAction();
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();

      const hostinger = res.data!.hostinger;
      expect(hostinger.isConfigured).toBe(true);
      expect(hostinger.hasToken).toBe(true);
      expect(hostinger.maskedToken).toContain('••••••••');
      expect(hostinger.maskedToken).not.toBe('hos_token_secret_123456');
      expect(hostinger.mailboxResourceId).toBe('mbox-resource-987');
      expect(res.data!.currentUserEmail).toBe('admin@conexaomaconica.com.br');
    });

    it('indica configuração ausente quando as variáveis não existem', async () => {
      delete process.env.HOSTINGER_MAIL_API_TOKEN;
      delete process.env.HOSTINGER_MAILBOX_RESOURCE_ID;

      const res = await getAdminEmailIntegrationOverviewAction();
      expect(res.success).toBe(true);
      expect(res.data!.hostinger.isConfigured).toBe(false);
      expect(res.data!.hostinger.hasToken).toBe(false);
    });
  });

  describe('testAdminEmailConnectionAction', () => {
    it('falha se as credenciais da Hostinger não estiverem configuradas', async () => {
      delete process.env.HOSTINGER_MAIL_API_TOKEN;

      const res = await testAdminEmailConnectionAction();
      expect(res.success).toBe(false);
      expect(res.message).toContain('HOSTINGER_MAIL_API_TOKEN');
    });

    it('retorna sucesso quando a Hostinger Mail API responde com 200 OK', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"status":"active"}'),
      });
      global.fetch = mockFetch;

      const res = await testAdminEmailConnectionAction();
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.message).toContain('Conexão bem-sucedida');
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mail.hostinger.com/api/v1/mailboxes/mbox-resource-987',
        expect.any(Object)
      );
    });

    it('retorna erro amigável se a API retornar 401 Unauthorized', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"error":"Unauthorized"}'),
      });
      global.fetch = mockFetch;

      const res = await testAdminEmailConnectionAction();
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.message).toContain('Falha de autenticação');
    });
  });

  describe('sendAdminTestEmailAction', () => {
    it('rejeita e-mail de destinatário inválido', async () => {
      const res = await sendAdminTestEmailAction({
        recipientEmail: 'invalido',
      });
      expect(res.success).toBe(false);
      expect(res.status).toBe('failed');
      expect(res.error).toContain('Endereço de e-mail inválido');
    });

    it('envia e-mail de teste com sucesso usando a Hostinger Mail API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'test-hostinger-msg-123' }),
        text: () => Promise.resolve('{"id":"test-hostinger-msg-123"}'),
      });
      global.fetch = mockFetch;

      const res = await sendAdminTestEmailAction({
        recipientEmail: 'destinatario@teste.com',
        customSubject: 'Teste Automatizado',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('accepted');
      expect(res.provider).toBe('hostinger');
      expect(res.providerMessageId).toBe('test-hostinger-msg-123');
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mail.hostinger.com/api/v1/mailboxes/mbox-resource-987/send',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

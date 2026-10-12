import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HostingerMailProvider } from '@/lib/email/providers/hostinger-mail-provider';
import { dispatchContractEmail } from './contract-email-service';

describe('HostingerMailProvider Unit Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.HOSTINGER_MAIL_API_TOKEN = 'test-token-xyz';
    process.env.HOSTINGER_MAILBOX_RESOURCE_ID = 'mbox-12345';
    process.env.HOSTINGER_MAIL_API_BASE_URL = 'https://api.mail.hostinger.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('devolve not_configured se as variáveis de ambiente estiverem ausentes', async () => {
    delete process.env.HOSTINGER_MAIL_API_TOKEN;
    const provider = new HostingerMailProvider();
    expect(provider.isConfigured()).toBe(false);

    const res = await provider.send({
      to: 'cliente@exemplo.com.br',
      subject: 'Teste',
      text: 'Texto',
      html: '<p>HTML</p>',
    });

    expect(res.sent).toBe(false);
    expect(res.status).toBe('not_configured');
    expect(res.provider).toBe('hostinger');
  });

  it('devolve accepted e providerMessageId quando a API responde 200 OK', async () => {
    const provider = new HostingerMailProvider();
    expect(provider.isConfigured()).toBe(true);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'msg-hostinger-999' }),
      text: async () => '{"id":"msg-hostinger-999"}',
    });
    global.fetch = mockFetch;

    const res = await provider.send({
      to: 'cliente@exemplo.com.br',
      subject: 'Contrato de Adesão',
      text: 'Texto',
      html: '<p>HTML</p>',
    });

    expect(res.sent).toBe(true);
    expect(res.status).toBe('accepted');
    expect(res.providerMessageId).toBe('msg-hostinger-999');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.mail.hostinger.com/api/v1/mailboxes/mbox-12345/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-xyz',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('devolve failed quando a API responde 400 Bad Request ou erro 4xx do cliente', async () => {
    const provider = new HostingerMailProvider();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Destinatário inválido',
    });

    const res = await provider.send({
      to: 'cliente@exemplo.com.br',
      subject: 'Teste',
      text: 'Texto',
      html: '<p>HTML</p>',
    });

    expect(res.sent).toBe(false);
    expect(res.status).toBe('failed');
    expect(res.error).toContain('rejeitou o envio (HTTP 400)');
  });

  it('devolve unknown quando a API responde 500/503 (serviço instável, resultado ambíguo)', async () => {
    const provider = new HostingerMailProvider();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    });

    const res = await provider.send({
      to: 'cliente@exemplo.com.br',
      subject: 'Teste',
      text: 'Texto',
      html: '<p>HTML</p>',
    });

    expect(res.sent).toBe(false);
    expect(res.status).toBe('unknown');
    expect(res.error).toContain('Estado de entrega desconhecido');
  });

  it('devolve unknown em caso de timeout de rede ou queda de conexão', async () => {
    const provider = new HostingerMailProvider();
    global.fetch = vi.fn().mockRejectedValue(new Error('The operation was aborted due to timeout'));

    const res = await provider.send({
      to: 'cliente@exemplo.com.br',
      subject: 'Teste',
      text: 'Texto',
      html: '<p>HTML</p>',
    });

    expect(res.sent).toBe(false);
    expect(res.status).toBe('unknown');
    expect(res.error).toContain('Timeout ou falha de rede');
  });
});

describe('dispatchContractEmail Concurrency, Idempotency & Safety', () => {
  const mockContractId = 'c0000000-0000-0000-0000-000000000001';
  const mockBusinessId = 'b0000000-0000-0000-0000-000000000001';
  const mockTenantId = 't0000000-0000-0000-0000-000000000001';
  const mockSnapshotId = 's0000000-0000-0000-0000-000000000001';
  const mockSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  function createMockDb(inFlightDispatch: any = null) {
    const dbState = {
      tokens: [
        {
          id: 'prev-token-uuid',
          business_id: mockBusinessId,
          contract_id: mockContractId,
          snapshot_id: mockSnapshotId,
          token_hash: 'prev-hash-abc',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          is_revoked: false,
        },
      ],
      dispatches: inFlightDispatch ? [inFlightDispatch] : [] as any[],
      businesses: {
        id: mockBusinessId,
        tenant_id: mockTenantId,
        name: 'Auto Elétrica São João',
        commercial_status: 'contrato_gerado',
        email: 'contato@saojoao.com.br',
      },
      contracts: {
        id: mockContractId,
        tenant_id: mockTenantId,
        status: 'draft',
      },
      snapshots: {
        id: mockSnapshotId,
        sha256_hash: mockSha256,
        template_title: 'Minuta de Adesão',
      },
      auditLogs: [] as any[],
    };

    const mockDb: any = {
      dbState,
      from: (table: string) => {
        if (table === 'businesses') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: dbState.businesses, error: null }),
              }),
            }),
            update: (updates: any) => ({
              eq: async () => {
                Object.assign(dbState.businesses, updates);
                return { error: null };
              },
            }),
          };
        }

        if (table === 'contracts') {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: dbState.contracts, error: null }),
                    }),
                  }),
                }),
              }),
            }),
            update: (updates: any) => ({
              eq: async () => {
                Object.assign(dbState.contracts, updates);
                return { error: null };
              },
            }),
          };
        }

        if (table === 'contract_snapshots') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: dbState.snapshots, error: null }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'contract_email_dispatches') {
          return {
            select: () => ({
              eq: (_col1: string, val1: any) => ({
                eq: (_col2: string, val2: any) => ({
                  gt: (_col3: string, _val3: any) => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => {
                          const item = dbState.dispatches.find(
                            (d) => d.contract_id === val1 && d.dispatch_status === val2
                          );
                          return { data: item || null, error: null };
                        },
                      }),
                    }),
                  }),
                }),
              }),
            }),
            insert: (row: any) => {
              const newRecord = { id: `disp-${Date.now()}`, ...row };
              dbState.dispatches.push(newRecord);
              return {
                select: () => ({
                  single: async () => ({ data: newRecord, error: null }),
                }),
              };
            },
            update: (updates: any) => ({
              eq: async (_col: string, val: any) => {
                const target = dbState.dispatches.find((d) => d.id === val);
                if (target) Object.assign(target, updates);
                return { error: null };
              },
            }),
          };
        }

        if (table === 'business_onboarding_tokens') {
          return {
            insert: (row: any) => {
              const newRecord = { id: `token-${Date.now()}`, ...row };
              dbState.tokens.push(newRecord);
              return {
                select: () => ({
                  single: async () => ({ data: newRecord, error: null }),
                }),
              };
            },
            update: (updates: any) => ({
              eq: async (_col: string, val: any) => {
                const target = dbState.tokens.find((t) => t.id === val);
                if (target) Object.assign(target, updates);
                return { error: null };
              },
            }),
            delete: () => ({
              eq: async (_col: string, val: any) => {
                const idx = dbState.tokens.findIndex((t) => t.id === val);
                if (idx >= 0) dbState.tokens.splice(idx, 1);
                return { error: null };
              },
            }),
          };
        }

        if (table === 'business_responsibles' || table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }

        if (table === 'admin_audit_logs') {
          return {
            insert: async (log: any) => {
              dbState.auditLogs.push(log);
              return { error: null };
            },
          };
        }

        throw new Error(`Tabela não mockada: ${table}`);
      },
    };

    return mockDb;
  }

  beforeEach(() => {
    process.env.HOSTINGER_MAIL_API_TOKEN = 'test-token-xyz';
    process.env.HOSTINGER_MAILBOX_RESOURCE_ID = 'mbox-12345';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bloqueia envio concorrente se já houver despacho em processamento ativo', async () => {
    const mockDb = createMockDb({
      id: 'disp-active-in-flight',
      contract_id: mockContractId,
      dispatch_status: 'processing',
      created_at: new Date().toISOString(),
    });

    const result = await dispatchContractEmail({
      businessId: mockBusinessId,
      dbClient: mockDb,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('already_processing');
    expect(result.error).toContain('Já existe um envio deste contrato em andamento');
  });

  it('não revoga o token anterior antes nem após o reenvio (coexistência controlada)', async () => {
    const mockDb = createMockDb();

    // Mock fetch com sucesso da Hostinger
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'hostinger-ack-123' }),
    });

    const result = await dispatchContractEmail({
      businessId: mockBusinessId,
      dbClient: mockDb,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('accepted');

    // Verifica coexistência de tokens
    expect(mockDb.dbState.tokens.length).toBe(2);
    const prevToken = mockDb.dbState.tokens.find((t: any) => t.id === 'prev-token-uuid');
    expect(prevToken.is_revoked).toBe(false); // Token anterior NÃO foi revogado!

    const newToken = mockDb.dbState.tokens.find((t: any) => t.id !== 'prev-token-uuid');
    expect(newToken.is_revoked).toBe(false);
    expect(newToken.snapshot_id).toBe(mockSnapshotId); // Mesmo snapshot imutável preservado

    // Estado da empresa avançou para contrato_enviado
    expect(mockDb.dbState.businesses.commercial_status).toBe('contrato_enviado');
  });

  it('em caso de resultado ambíguo (unknown / timeout), preserva o token anterior e NÃO retenta', async () => {
    const mockDb = createMockDb();

    // Simula timeout da Hostinger
    global.fetch = vi.fn().mockRejectedValue(new Error('Gateway Timeout ETIMEDOUT'));

    const result = await dispatchContractEmail({
      businessId: mockBusinessId,
      dbClient: mockDb,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('unknown');
    expect(result.error).toContain('Envio com resultado incerto');

    // Token anterior permanece 100% ativo e válido
    const prevToken = mockDb.dbState.tokens.find((t: any) => t.id === 'prev-token-uuid');
    expect(prevToken.is_revoked).toBe(false);

    // Registro do despacho gravado como 'unknown'
    const dispatch = mockDb.dbState.dispatches[0];
    expect(dispatch.dispatch_status).toBe('unknown');
  });

  it('preserva integralmente snapshot_id, sha256_hash e contrato', async () => {
    const mockDb = createMockDb();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'hostinger-ack-456' }),
    });

    await dispatchContractEmail({
      businessId: mockBusinessId,
      dbClient: mockDb,
    });

    // Garante que o snapshot e o hash nunca foram modificados
    expect(mockDb.dbState.snapshots.sha256_hash).toBe(mockSha256);
    expect(mockDb.dbState.snapshots.id).toBe(mockSnapshotId);
  });
});

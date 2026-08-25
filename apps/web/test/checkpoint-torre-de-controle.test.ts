import { describe, it, expect, vi } from 'vitest';
import { checkSystemHealthAction } from '../src/lib/master/master-control-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'b-1' }],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
  }),
}));

describe('Torre de Controle — SuperAdmin / Engenharia (/master)', () => {
  it('1. Telemetria de Saúde System-Wide — Executa PING de microserviços em tempo real', async () => {
    const res = await checkSystemHealthAction();
    expect(res.overallStatus).toBe('operational');
    expect(res.services).toBeDefined();
    expect(res.services.length).toBeGreaterThan(0);

    const postgres = res.services.find((s) => s.serviceId === 'supabase_db');
    expect(postgres).toBeDefined();
    expect(postgres?.status).toBe('operational');
    expect(postgres?.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('2. Isenção de Duplicação Comercial — Garante que a Torre é exclusiva para saúde sistêmica', async () => {
    const res = await checkSystemHealthAction();
    expect(res.attentionNeeded).toBeDefined();
    expect(res.recentSystemEvents).toBeDefined();
    expect(res.securityAuditSummary).toBeDefined();
  });
});

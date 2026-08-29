import { describe, it, expect, vi } from 'vitest';
import {
  createBusinessEventAction,
  createBusinessPostAction,
  getBusinessEntitlementQuotaAction,
  updateBusinessEventStatusAction,
  updateBusinessPostStatusAction,
} from '../src/app/actions/events-and-posts';
import {
  saveAdvertiserEventAction,
  saveAdvertiserPostAction,
} from '../src/lib/advertiser/advertiser-content-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user_owner_001', email: 'owner@example.com' } },
          error: null,
        }),
      },
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === '_effective_business_plan') {
          return Promise.resolve({
            data: [{ plan_code: 'ouro' }],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'biz_001', owner_id: 'user_owner_001', tenant_id: 'tenant_001' },
              error: null,
            }),
          };
        }
        if (table === 'plan_entitlements') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { max_limit: 5 },
              error: null,
            }),
          };
        }
        if (table === 'business_events' || table === 'business_posts') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'id_123', title: 'Teste Factual', publication_status: 'published' },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      }),
    });
  }),
}));

describe('Checkpoint Etapa 5 — Server Actions de Eventos & Posts (Autoridade Única)', () => {
  it('deve consultar cota de eventos usando plano efetivo sem fallback bronze', async () => {
    const res = await getBusinessEntitlementQuotaAction('tenant_001', 'biz_001', 'events_limit');
    expect(res.success).toBe(true);
    expect(res.data?.maxLimit).toBe(5);
  });

  it('deve criar evento via autoridade canônica createBusinessEventAction', async () => {
    const res = await createBusinessEventAction({
      tenantId: 'tenant_001',
      businessId: 'biz_001',
      title: 'Encontro Maçônico 2026',
      startsAt: new Date().toISOString(),
      locationName: 'Loja Central',
    });
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
  });

  it('deve criar post via autoridade canônica createBusinessPostAction', async () => {
    const res = await createBusinessPostAction({
      tenantId: 'tenant_001',
      businessId: 'biz_001',
      title: 'Comunicado de Inauguração',
      content: 'Novo espaço inaugurado no centro.',
    });
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
  });

  it('deve atualizar status de evento', async () => {
    const res = await updateBusinessEventStatusAction({
      eventId: 'evt_001',
      status: 'archived',
    });
    expect(res.success).toBe(true);
  });

  it('deve atualizar status de post', async () => {
    const res = await updateBusinessPostStatusAction({
      postId: 'pst_001',
      status: 'archived',
    });
    expect(res.success).toBe(true);
  });

  it('saveAdvertiserEventAction em DTO deve delegar para createBusinessEventAction', async () => {
    const res = await saveAdvertiserEventAction({
      business_id: 'biz_001',
      title: 'Evento via Portal',
    });
    expect(res.success).toBe(true);
    expect(res.message).toContain('sucesso');
  });

  it('saveAdvertiserPostAction em DTO deve delegar para createBusinessPostAction', async () => {
    const res = await saveAdvertiserPostAction({
      business_id: 'biz_001',
      title: 'Publicação via Portal',
      content: 'Conteúdo via portal.',
    });
    expect(res.success).toBe(true);
    expect(res.message).toContain('sucesso');
  });
});

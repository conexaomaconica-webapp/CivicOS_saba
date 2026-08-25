import { describe, it, expect, vi } from 'vitest';
import {
  getPlanEntitlementsAction,
  updateCommercialPlanAction,
} from '../src/app/actions/plan-entitlements';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-user-id' } }, error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [{ id: 'tenant-cm-001' }] }),
          };
        }
        if (table === 'plan_payment_rules') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  plan_code: 'bronze',
                  amount_cents: 0,
                  installments_max: 3,
                  interest_free_installments: 3,
                  title: 'Plano Bronze',
                  slogan: 'Entrada Gratuita',
                  is_popular: false,
                  commercial_features: ['Presença Básica'],
                },
                {
                  plan_code: 'prata',
                  amount_cents: 178800,
                  installments_max: 6,
                  interest_free_installments: 6,
                  title: 'Plano Prata',
                  slogan: 'Visibilidade Destaque',
                  is_popular: true,
                  commercial_features: ['Destaque Comercial', 'Até 6 Fotos'],
                },
                {
                  plan_code: 'ouro',
                  amount_cents: 238800,
                  installments_max: 12,
                  interest_free_installments: 12,
                  title: 'Plano Ouro',
                  slogan: 'Topo das Buscas',
                  is_popular: false,
                  commercial_features: ['Topo das Buscas', 'Analytics Avançado'],
                },
              ],
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'plan_entitlements') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                { plan_code: 'prata', feature_code: 'gallery_photos_limit', max_limit: 6 },
                { plan_code: 'prata', feature_code: 'services_limit', max_limit: 5 },
              ],
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'admin_audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [] }),
        };
      }),
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === 'has_platform_admin_access') {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    });
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Central Comercial de Planos (/admin/planos)', () => {
  it('deve retornar dados comerciais consolidados para Bronze, Prata e Ouro', async () => {
    const res = await getPlanEntitlementsAction();
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    const plans = res.data!;
    expect(plans.length).toBe(3);

    const prata = plans.find((p) => p.plan_code === 'prata')!;
    expect(prata.title).toBe('Plano Prata');
    expect(prata.amount_cents).toBe(178800);
    expect(prata.installments_max).toBe(6);
    expect(prata.is_popular).toBe(true);
    expect(prata.gallery_photos_limit).toBe(6);
  });

  it('deve permitir atualizar preço, parcelamento e cotas numéricas de um plano comercial', async () => {
    const res = await updateCommercialPlanAction({
      plan_code: 'ouro',
      title: 'Plano Ouro VIP',
      slogan: 'Máxima presença no guia comercial',
      description: 'Plano de elite para parceiros premium',
      amount_cents: 238800,
      installments_max: 12,
      interest_free_installments: 12,
      is_popular: false,
      is_active: true,
      commercial_features: ['Topo das Buscas', 'Analytics Avançado', 'Até 10 Fotos'],
      services_limit: 10,
      gallery_photos_limit: 10,
      benefits_limit: 5,
      events_limit: 10,
      posts_limit: 10,
    });

    expect(res.success).toBe(true);
  });
});

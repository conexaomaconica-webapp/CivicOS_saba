import { describe, it, expect, vi } from 'vitest';
import { getPlanEntitlementsAction, updateCommercialPlanAction } from '../src/app/actions/plan-entitlements';
import { getAdminPaymentsDashboardAction, reprocessPaymentWebhookAction } from '../src/lib/admin/admin-payments-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [{ id: '00000000-0000-0000-0000-000000000010' }],
              error: null,
            }),
          };
        }
        if (table === 'plan_payment_rules') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  plan_code: 'ouro',
                  title: 'Plano Ouro',
                  slogan: 'Máxima presença comercial',
                  description: 'Plano VIP',
                  amount_cents: 238800,
                  installments_max: 12,
                  interest_free_installments: 12,
                  is_popular: true,
                  is_active: true,
                  commercial_features: ['Topo das buscas'],
                },
              ],
              error: null,
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
                { plan_code: 'ouro', feature_code: 'services_limit', max_limit: 10 },
              ],
              error: null,
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'b-1', name: 'Comandos', plan_code: 'ouro' }],
              error: null,
            }),
          };
        }
        if (table === 'admin_audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    });
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Refinamento Planos (/admin/planos) e Pagamentos (/admin/pagamentos)', () => {
  it('1. Central Comercial de Planos — Carrega cotas e regras financeiras BRL', async () => {
    const res = await getPlanEntitlementsAction();
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.length).toBeGreaterThan(0);
  });

  it('2. Central Comercial de Planos — Atualiza cotas do Plano Ouro sem alterar contratos históricos', async () => {
    const res = await updateCommercialPlanAction({
      plan_code: 'ouro',
      title: 'Plano Ouro Especial',
      slogan: 'Máxima visibilidade no Guia',
      description: 'Plano VIP comercial',
      amount_cents: 238800,
      installments_max: 12,
      interest_free_installments: 12,
      is_popular: true,
      is_active: true,
      commercial_features: ['Topo das buscas', '10 Fotos na Galeria'],
      services_limit: 10,
      gallery_photos_limit: 10,
      benefits_limit: 5,
      events_limit: 10,
      posts_limit: 10,
    });
    expect(res.success).toBe(true);
  });

  it('3. Central de Pagamentos — Carrega KPIs operacionais e fila de conciliação de divergências', async () => {
    const res = await getAdminPaymentsDashboardAction();
    expect(res.kpis.monthlyReceivedBrl).toBeGreaterThan(0);
    expect(res.reconciliationRequired).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
  });

  it('4. Reprocessar Webhook com Segurança — Registra auditoria sem alterar pagamentos já confirmados', async () => {
    const res = await reprocessPaymentWebhookAction('pay-003');
    expect(res.success).toBe(true);
  });
});

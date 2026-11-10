import { describe, it, expect, vi } from 'vitest';
import { getAdminPaymentsDashboardAction } from '../src/lib/admin/admin-payments-service';

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const nowIso = new Date().toISOString();
const prevMonthDate = new Date();
prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
const prevMonthIso = prevMonthDate.toISOString();
const prevYm = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

vi.mock('../src/lib/supabase/server', () => ({
  resolveTenantIdServer: vi.fn().mockResolvedValue('tenant-1'),
  createServerSideClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: 'admin-1', email: 'admin@cm.com.br' } },
            error: null,
          }),
      },
      rpc: (fnName: string) => {
        if (fnName === 'has_platform_admin_access') return Promise.resolve({ data: true, error: null });
        return Promise.resolve({ data: null, error: null });
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          const rows = [
            {
              id: 'biz-discount',
              name: 'Empresa Com Desconto',
              owner_id: 'owner-1',
              plan_tier: 'ouro',
              commercial_status: 'pagamento_confirmado',
              email: 'desconto@empresa.com',
              created_at: prevMonthIso,
            },
            {
              id: 'biz-permuta100',
              name: 'Som & Luz Evento',
              owner_id: 'owner-2',
              plan_tier: 'acacia',
              commercial_status: 'pagamento_confirmado',
              email: 'som@empresa.com',
              created_at: nowIso,
            },
            {
              id: 'biz-parceria',
              name: 'Parceria Institucional Ltda',
              owner_id: 'owner-3',
              plan_tier: 'compasso',
              commercial_status: 'publicado',
              email: 'parceria@empresa.com',
              created_at: prevMonthIso,
            },
          ];
          return {
            select: vi.fn().mockReturnThis(),
            then: (r: any) => r({ data: rows, error: null }),
          };
        }
        if (table === 'business_commercial_terms') {
          const rows = [
            {
              business_id: 'biz-discount',
              plan_code: 'ouro',
              billing_cycle: 'biennial',
              payment_method: 'avista',
              commercial_modality: 'padrao',
              amount_cents: 120000,
              installments_count: 1,
              is_pedra_fundamental: true,
              conferred_at: prevMonthIso,
              created_at: prevMonthIso,
            },
            {
              business_id: 'biz-permuta100',
              plan_code: 'acacia',
              billing_cycle: 'annual',
              payment_method: 'permuta_100',
              commercial_modality: 'permuta_100',
              permuta_description: 'Sonorização e iluminação do evento de lançamento',
              amount_cents: 0,
              installments_count: 1,
              is_pedra_fundamental: false,
              conferred_at: nowIso,
              created_at: nowIso,
            },
            {
              business_id: 'biz-parceria',
              plan_code: 'compasso',
              billing_cycle: 'annual',
              payment_method: 'parceria',
              commercial_modality: 'parceria',
              permuta_description: 'Cortesia institucional para divulgação oficial',
              amount_cents: 0,
              installments_count: 1,
              is_pedra_fundamental: false,
              conferred_at: prevMonthIso,
              created_at: prevMonthIso,
            },
          ];
          return {
            select: vi.fn().mockReturnThis(),
            then: (r: any) => r({ data: rows, error: null }),
          };
        }
        if (table === 'plan_payment_rules') {
          return {
            select: vi.fn().mockReturnThis(),
            then: (r: any) =>
              r({
                data: [
                  { plan_code: 'acacia', amount_cents: 238800 },
                  { plan_code: 'compasso', amount_cents: 178800 },
                ],
                error: null,
              }),
          };
        }
        if (table === 'invoices') {
          const rows = [
            {
              id: 'inv-discount-1',
              business_id: 'biz-discount',
              amount_cents: 238800,
              amount_due: 2388.0,
              status: 'paid',
              payment_method: 'pix',
              paid_at: prevMonthIso,
              due_date: prevMonthIso,
              created_at: prevMonthIso,
            },
          ];
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: (r: any) => r({ data: rows, error: null }),
          };
        }
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnThis(),
            then: (r: any) => r({ data: [{ id: 'sub-1', business_id: 'biz-discount', status: 'active' }], error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          then: (r: any) => r({ data: [], error: null }),
        };
      }),
    }),
  ),
}));

describe('Admin Pagamentos — Descontos, Permutas, Parcerias e Filtros de Período', () => {
  it('1. Substitui valor integral da fatura pelo valor negociado nos termos comerciais e preserva original_amount_cents', async () => {
    const res = await getAdminPaymentsDashboardAction();
    const discountedItem = res.items.find((i) => i.business_id === 'biz-discount');

    expect(discountedItem).toBeDefined();
    expect(discountedItem?.amount_cents).toBe(120000);
    expect(discountedItem?.original_amount_cents).toBe(238800);
    expect(discountedItem?.has_discount).toBe(true);
    expect(discountedItem?.is_pedra_fundamental).toBe(true);
  });

  it('2. Inclui anunciantes com Permuta 100% e Parceria 100% mesmo sem fatura Asaas gerada', async () => {
    const res = await getAdminPaymentsDashboardAction();
    const permuta = res.items.find((i) => i.business_id === 'biz-permuta100');
    const parceria = res.items.find((i) => i.business_id === 'biz-parceria');

    expect(permuta).toBeDefined();
    expect(permuta?.amount_cents).toBe(0);
    expect(permuta?.commercial_modality).toBe('permuta_100');
    expect(permuta?.status).toBe('paid');
    expect(permuta?.is_virtual_terms_record).toBe(true);
    expect(permuta?.permuta_description).toContain('Sonorização');

    expect(parceria).toBeDefined();
    expect(parceria?.amount_cents).toBe(0);
    expect(parceria?.commercial_modality).toBe('parceria');
    expect(parceria?.status).toBe('paid');
    expect(res.kpis.permutaParceriaCount).toBe(2);
  });

  it('3. Filtra por mês anterior (monthFilter) e calcula periodReceivedBrl vs totalReceivedBrl', async () => {
    const prevRes = await getAdminPaymentsDashboardAction({ monthFilter: prevYm });

    expect(prevRes.items.some((i) => i.business_id === 'biz-discount')).toBe(true);
    expect(prevRes.items.some((i) => i.business_id === 'biz-parceria')).toBe(true);
    expect(prevRes.items.some((i) => i.business_id === 'biz-permuta100')).toBe(false);
    expect(prevRes.kpis.periodReceivedBrl).toBe(1200);
    expect(prevRes.kpis.totalReceivedBrl).toBe(1200);
    expect(prevRes.availableMonths.some((m) => m.value === prevYm)).toBe(true);
  });

  it('4. Filtra por modalidade (permuta_100, parceria, desconto) e plano canônico', async () => {
    const resPermuta = await getAdminPaymentsDashboardAction({ modalityFilter: 'permuta_100' });
    expect(resPermuta.items).toHaveLength(1);
    expect(resPermuta.items[0].business_id).toBe('biz-permuta100');

    const resDesconto = await getAdminPaymentsDashboardAction({ modalityFilter: 'desconto' });
    expect(resDesconto.items.some((i) => i.business_id === 'biz-discount')).toBe(true);

    const resAcacia = await getAdminPaymentsDashboardAction({ planFilter: 'acacia' });
    expect(resAcacia.items.some((i) => i.business_id === 'biz-discount')).toBe(true);
    expect(resAcacia.items.some((i) => i.business_id === 'biz-permuta100')).toBe(true);
    expect(resAcacia.items.some((i) => i.business_id === 'biz-parceria')).toBe(false);
  });
});


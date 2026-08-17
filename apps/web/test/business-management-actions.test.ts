import { describe, it, expect, vi } from 'vitest';
import {
  createBusinessServiceAction,
  updateBusinessServiceAction,
  toggleBusinessServiceActiveAction,
  reorderBusinessServiceAction,
  deleteBusinessServiceAction,
  createBusinessBenefitAction,
  updateBusinessBenefitAction,
  toggleBusinessBenefitActiveAction,
  reorderBusinessBenefitAction,
  deleteBusinessBenefitAction,
} from '../src/app/actions/business-management';

// Mock server-side headers and Supabase client for unit test isolation
vi.mock('next/headers', () => ({
  headers: async () => new Map([['host', 'localhost']]),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('../src/lib/supabase/server', () => {
  const createMockQuery = (tableName: string) => {
    const chainable = {
      eq: () => chainable,
      single: async () => {
        if (tableName === 'tenants') return { data: { id: 't-test-1' }, error: null };
        if (tableName === 'business_members') return { data: { role: 'owner' }, error: null };
        return { data: null, error: null };
      },
      select: () => chainable,
      insert: (payload: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            if (payload.name === 'Quota Overload') {
              return { data: null, error: { message: 'Cota máxima de serviços ativos atingida', code: 'P0001' } };
            }
            return { data: { id: 'srv-created-1', ...payload }, error: null };
          },
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'srv-1', ...payload }, error: null }),
            }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    };
    return chainable;
  };

  return {
    createServerSideClient: async () => ({
      auth: {
        getUser: async () => ({ data: { user: { id: 'usr-test-123' } }, error: null }),
      },
      from: (tableName: string) => createMockQuery(tableName),
      rpc: async (fn: string) => {
        if (fn === 'has_platform_admin_access') return { data: true, error: null };
        if (fn === 'reorder_business_services' || fn === 'reorder_business_benefits') return { error: null };
        return { data: null, error: null };
      },
    }),
  };
});

describe('Checkpoint 7C — Business Management Server Actions Unit Tests', () => {
  it('1. Deve criar serviço com autorização server-side bem-sucedida', async () => {
    const res = await createBusinessServiceAction('biz-123', {
      name: 'Consultoria Especializada',
      description: 'Atendimento presencial e remoto',
      iconName: 'briefcase',
      priceInfo: 'Sob consulta',
    });

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
  });

  it('2. Deve separar rigorosamente campos de Benefício (sem priceInfo/iconName)', async () => {
    const res = await createBusinessBenefitAction('biz-123', {
      title: 'Desconto Fraterno 20%',
      description: 'Válido em compras acima de R$ 100',
      discountCode: 'PROMO20',
      badgeText: '20% OFF',
      validFrom: '2026-08-01T00:00:00Z',
      validUntil: '2026-12-31T23:59:59Z',
    });

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    // Confirmar ausência de campos de serviço
    const benefitObj = res.data as Record<string, unknown>;
    expect(benefitObj.price_info).toBeUndefined();
    expect(benefitObj.icon_name).toBeUndefined();
  });

  it('3. Deve capturar exceção de cota excedida vinda do banco e retornar erro amigável', async () => {
    const res = await createBusinessServiceAction('biz-123', {
      name: 'Quota Overload',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Cota máxima de serviços');
  });

  it('4. Deve executar reordenação transacional via RPC server-side', async () => {
    const resSrv = await reorderBusinessServiceAction('biz-123', 'srv-1', 'up');
    expect(resSrv.success).toBe(true);

    const resBen = await reorderBusinessBenefitAction('biz-123', 'ben-1', 'down');
    expect(resBen.success).toBe(true);
  });

  it('5. Deve alternar status de ativação mantendo integridade server-side', async () => {
    const resSrv = await toggleBusinessServiceActiveAction('biz-123', 'srv-1', false);
    expect(resSrv.success).toBe(true);

    const resBen = await toggleBusinessBenefitActiveAction('biz-123', 'ben-1', true);
    expect(resBen.success).toBe(true);
  });

  it('6. Deve excluir item com confirmação e chamada server-side', async () => {
    const resSrv = await deleteBusinessServiceAction('biz-123', 'srv-1');
    expect(resSrv.success).toBe(true);

    const resBen = await deleteBusinessBenefitAction('biz-123', 'ben-1');
    expect(resBen.success).toBe(true);
  });
});

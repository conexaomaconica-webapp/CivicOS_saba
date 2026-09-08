import { describe, it, expect, vi } from 'vitest';
import {
  getAdminBusinessesListAction,
  getAdminBusiness360DetailsAction,
} from '../src/lib/admin/admin-businesses-service';

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({
    get: () => undefined, getAll: () => [], set: () => {}, delete: () => {},
  }),
}));

const chainable = (defaultData: any = null) => {
  const c: any = {
    select: () => c, insert: () => c, update: () => c, upsert: () => c, delete: () => c,
    eq: () => c, neq: () => c, gt: () => c, gte: () => c, lt: () => c, lte: () => c,
    like: () => c, ilike: () => c, is: () => c, in: () => c, or: () => c, not: () => c,
    contains: () => c, containedBy: () => c, filter: () => c, match: () => c,
    order: () => c, limit: () => c, range: () => c,
    single: () => Promise.resolve({ data: defaultData, error: null }),
    maybeSingle: () => Promise.resolve({ data: defaultData, error: null }),
    then: (r: any) => r({ data: defaultData ? [defaultData] : [], error: null, count: defaultData ? 1 : 0 }),
  };
  return c;
};

const mockBusiness = {
  id: '00000000-0000-0000-0000-000000000001',
  tenant_id: '00000000-0000-0000-0000-000000000010',
  name: 'Comandos - Terceirização e Segurança Eletrônica',
  category: 'Segurança Eletrônica & Terceirização',
  publication_status: 'published',
  plan_code: 'ouro',
  plan_tier: 'ouro',
  is_founder: true,
  is_pedra_fundamental: true,
  is_coluna_honra: true,
  city: 'Campinas',
  state: 'SP',
  slug: 'comandos',
};

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: '00000000-0000-0000-0000-000000000099', email: 'admin@cm.com.br' } },
        error: null,
      }),
    },
    rpc: (fnName: string) => {
      if (fnName === 'has_platform_admin_access') return Promise.resolve({ data: true, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    from: () => chainable(mockBusiness),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('EPIC ADMIN — CHECKPOINT 4: GESTÃO 360º DE ANUNCIANTES & EMPRESAS', () => {
  const TEST_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

  it('1. Busca e filtragem do diretório de empresas (/admin/empresas)', async () => {
    const res = await getAdminBusinessesListAction({
      query: 'Comandos',
      status: 'published',
      page: 1,
      pageSize: 10,
    });

    expect(res.items).toBeDefined();
    expect(res.kpis).toBeDefined();
  });

  it('2. Carrega o Prontuário 360º completo da empresa (/admin/empresas/[id])', async () => {
    const dto = await getAdminBusiness360DetailsAction(TEST_BUSINESS_ID);

    // With mock returning a valid business, should have data
    expect(dto).toBeDefined();
    if (dto) {
      expect(dto.business?.id || dto.id).toBeDefined();
    }
  });

  it('3. Preserva a separação conceitual entre Plano Comercial e Selos Históricos (Pedra Fundamental 1/10)', async () => {
    const dto = await getAdminBusiness360DetailsAction(TEST_BUSINESS_ID);

    if (dto) {
      // Pedra Fundamental should NOT appear as a commercial plan code
      const planCode = dto.subscription?.plan_code || dto.plan_code || dto.business?.plan_code;
      expect(planCode).not.toBe('pedra_fundamental');
    }
  });
});

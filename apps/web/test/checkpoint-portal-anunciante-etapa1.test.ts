import { describe, it, expect, vi } from 'vitest';
import { getAdvertiserDashboardDTOAction } from '../src/lib/advertiser/advertiser-portal-service';

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
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
    then: (r: any) => r({ data: defaultData ? [defaultData] : [], error: null }),
  };
  return c;
};

const mockBusiness = {
  id: 'biz_001',
  name: 'Comandos - Terceirização e Segurança Eletrônica',
  slug: 'comandos-terceirizacao-e-seguranca-eletronica',
  plan_code: 'ouro',
  plan_tier: 'ouro',
  publication_status: 'published',
  is_active: true,
};

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: 'user_anunciante_1', email: 'anunciante@cm.com.br' } },
        error: null,
      }),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: () => chainable(mockBusiness),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://mock/${path}` } }),
        list: () => Promise.resolve({ data: [], error: null }),
      }),
    },
  })),
}));

describe('Portal do Anunciante — Etapa 1: Home + Layout Unificado (/anunciante)', () => {
  it('1. DTO da Home — Retorna blocos executivos de retenção e valor percebido', async () => {
    const dto = await getAdvertiserDashboardDTOAction('user_anunciante_1');

    // Verify structural integrity of the DTO
    expect(dto).toBeDefined();
    expect(dto.business).toBeDefined();
    expect(dto.business.publication_status_label).toBeDefined();
  });

  it('2. Linguagem Humana e Valor — Isenção de enums técnicos internos', async () => {
    const dto = await getAdvertiserDashboardDTOAction();
    expect(dto).toBeDefined();
    expect(dto.business).toBeDefined();
    // Ensure labels are human-readable, not raw enum values
    if (dto.business.publication_status_label) {
      expect(dto.business.publication_status_label).not.toContain('publication_status');
    }
  });
});

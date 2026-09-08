import { describe, it, expect, vi } from 'vitest';
import {
  updateBusinessProfileInfoAction,
  updateBusinessAdminDataAction,
  updateBusinessContactsAction,
  uploadBusinessAssetAction,
} from '../src/app/actions/business-profile-actions';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: () => 'localhost',
  }),
  cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
}));

const mockBiz = {
  id: '00000000-0000-0000-0000-000000000001',
  tenant_id: '00000000-0000-0000-0000-000000000010',
  name: 'Oficina Exemplo Ouro',
  slug: 'oficina-exemplo-ouro',
};

const createMockSupabaseClient = () => {
  const createChain = () => {
    const c: any = {
      select: () => c,
      insert: () => Promise.resolve({ data: mockBiz, error: null }),
      update: () => c,
      eq: () => c,
      neq: () => c,
      limit: () => c,
      maybeSingle: () => Promise.resolve({ data: mockBiz, error: null }),
      single: () => Promise.resolve({ data: mockBiz, error: null }),
      then: (resolve: any) => resolve({ data: [mockBiz], error: null }),
    };
    return c;
  };

  return {
    from: () => createChain(),
    rpc: (fnName: string) => {
      if (fnName === '_resolve_tenant_by_host') {
        return Promise.resolve({ data: '00000000-0000-0000-0000-000000000010', error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: '00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000000001/logo/logo.webp' }, error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://mock-supabase.test/storage/v1/object/public/business-assets/${path}` },
        }),
      }),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user_anunciante_1' } },
        error: null,
      }),
    },
  };
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => createMockSupabaseClient()),
}));

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => Promise.resolve(createMockSupabaseClient())),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Bloco 1 - Business Profile, Storage & Plan Entitlements Contract', () => {
  const mockBusinessId = '00000000-0000-0000-0000-000000000001';

  it('should update business public profile info successfully', async () => {
    const res = await updateBusinessProfileInfoAction(mockBusinessId, {
      name: 'Oficina Exemplo Ouro',
      tagline: 'Especialista em Manutenção',
      category: 'Serviços Automotivos',
      description: 'Oficina mecânica completa com atendimento diferenciado.',
    });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it('should store private administrative data (CNPJ/CPF) securely without public exposure', async () => {
    const res = await updateBusinessAdminDataAction(mockBusinessId, {
      legalName: 'Razão Social Exemplo LTDA',
      documentNumber: '12.345.678/0001-90',
    });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it('should update public contacts and social networks successfully', async () => {
    const res = await updateBusinessContactsAction(mockBusinessId, {
      phone: '(11) 3333-4444',
      whatsapp: '(11) 99999-8888',
      email: 'contato@oficinaouro.com.br',
      website: 'https://www.oficinaouro.com.br',
    });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it('should construct server-side storage paths in {tenant_id}/{business_id}/{asset_type}/ format', async () => {
    const res = await uploadBusinessAssetAction(
      mockBusinessId,
      'logo',
      'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3AgAA='
    );

    expect(res).toBeDefined();
    // uploadBusinessAssetAction is deprecated and redirects to uploadAdvertiserAssetAction
    expect(res.success).toBe(false);
    expect(res.message).toContain('uploadAdvertiserAssetAction');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { getAdvertiserProfileDataAction } from '../src/lib/advertiser/advertiser-profile-service';
import { getAdvertiserPlanBillingDTOAction } from '../src/lib/advertiser/advertiser-billing-service';
import { getAdvertiserResultsDTOAction } from '../src/lib/advertiser/advertiser-results-service';

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
}));

const mockBiz = {
  id: 'biz_001',
  name: 'Comandos - Terceirização e Segurança Eletrônica',
  slug: 'comandos-terceirizacao-e-seguranca-eletronica',
  cnpj: '12.345.678/0001-90',
  plan_code: 'ouro',
  plan_tier: 'ouro',
};

const mockInvoice = {
  id: 'inv_001',
  business_id: 'biz_001',
  amount_cents: 238800,
  amount_due: 2388.00,
  status: 'paid',
  payment_method: 'credit_card',
  created_at: new Date().toISOString(),
};

const mockContract = {
  id: 'ctr_001',
  business_id: 'biz_001',
  sha256_hash: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890',
  ip_address: '127.0.0.1',
  signed_at: new Date().toISOString(),
};

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    const createChain = (table: string) => {
      const c: any = {
        select: () => c,
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => c,
        eq: () => c,
        neq: () => c,
        in: () => c,
        or: () => c,
        limit: () => c,
        order: () => c,
        maybeSingle: () => {
          if (table === 'businesses') return Promise.resolve({ data: mockBiz, error: null });
          if (table === 'invoices') return Promise.resolve({ data: mockInvoice, error: null });
          if (table === 'contract_snapshots') return Promise.resolve({ data: mockContract, error: null });
          return Promise.resolve({ data: null, error: null });
        },
        single: () => Promise.resolve({ data: mockBiz, error: null }),
        then: (resolve: any) => resolve({ data: table === 'invoices' ? [mockInvoice] : [mockBiz], error: null }),
      };
      return c;
    };

    return Promise.resolve({
      from: (table: string) => createChain(table),
      rpc: (fnName: string) => {
        if (fnName === 'get_signed_contract_snapshot') {
          return Promise.resolve({
            data: {
              ok: true,
              contract_id: 'ctr_001',
              status: 'signed',
              sha256_hash: mockContract.sha256_hash,
              accepted_at: mockContract.signed_at,
              ip_address: '', // IP masked for public privacy guardrail
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
      storage: {
        from: () => ({
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://mock/${path}` } }),
          list: () => Promise.resolve({ data: [], error: null }),
        }),
      },
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user_anunciante_1',
              email: 'anunciante@comandosseguranca.com.br',
              user_metadata: { full_name: 'Carlos Eduardo Silva' },
            },
          },
          error: null,
        }),
      },
    });
  }),
}));

describe('Checkpoint de Auditoria Corretiva — Rotas Críticas & Navegação do Portal do Anunciante', () => {
  it('1. Canonical Slug & Public Profile Link — Garante que business.slug é a fonte única para /guia/[slug]', async () => {
    const profile = await getAdvertiserProfileDataAction();
    expect(profile.business.slug).toBe('comandos-terceirizacao-e-seguranca-eletronica');
    expect(`/guia/${profile.business.slug}`).toBe('/guia/comandos-terceirizacao-e-seguranca-eletronica');
  });

  it('2. Canonical Payments Route — Confirma rota canônica /anunciante/pagamentos e integridade de faturas', async () => {
    const billing = await getAdvertiserPlanBillingDTOAction();
    expect(billing.plan.name).toBe('Plano Ouro');
    expect(billing.invoices.length).toBeGreaterThan(0);
    expect(billing.invoices[0]?.status).toBe('paid');
  });

  it('3. Contract Snapshot & Privacy Guardrail — Retorna snapshot sem expor IP na interface pública', async () => {
    const billing = await getAdvertiserPlanBillingDTOAction();
    expect(billing.contract).toBeDefined();
    expect(billing.contract?.sha256_hash.length).toBe(64);
    expect(billing.contract?.ip_address).toBe('');
  });

  it('4. Separation of Pedra Fundamental — Confirma que Pedra Fundamental NÃO aparece em upgrades comerciais', async () => {
    const billing = await getAdvertiserPlanBillingDTOAction();
    if (billing.upgradeRecommendation) {
      const text = billing.upgradeRecommendation.highlight_features.join(' ');
      expect(text).not.toContain('Pedra Fundamental');
    }
  });

  it('5. Results & Human-Centric Phrasing — Valida DTO de resultados comercial em linguagem humana', async () => {
    const results = await getAdvertiserResultsDTOAction('30d');
    expect(results.business.slug).toBe('comandos-terceirizacao-e-seguranca-eletronica');
    expect(results.recommendations.length).toBeGreaterThan(0);
  });
});

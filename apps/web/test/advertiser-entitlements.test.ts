import { describe, expect, it, vi, beforeEach } from 'vitest';

const state: { plan: string; rows: Array<{ feature_code: string; max_limit: number }> } = { plan: 'bronze', rows: [] };

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    rpc: async () => ({ data: null, error: { message: 'sem acesso' } }),
    from: (table: string) => {
      const chain: any = { select: () => chain, eq: () => chain };
      if (table === 'plan_entitlements') chain.then = (resolve: any) => resolve({ data: state.rows, error: null });
      return chain;
    },
  })),
}));

vi.mock('../src/lib/advertiser/advertiser-access', () => ({
  findAdvertiserBusiness: vi.fn().mockImplementation(async () => ({ id: 'b1', tenant_id: 't1', plan_tier: state.plan })),
}));

import { checkAdvertiserQuotaAction, getAdvertiserFeaturesAction } from '../src/lib/advertiser/advertiser-entitlements';

beforeEach(() => {
  state.plan = 'bronze';
  state.rows = [];
});

describe('plano e recursos do anunciante', () => {
  it('Esquadro (sem linhas na tabela) usa os limites canônicos: sem benefícios, eventos e publicações', async () => {
    const features = await getAdvertiserFeaturesAction();
    expect(features?.planName).toBe('Esquadro');
    expect(features?.allows).toEqual({ benefits: false, events: false, posts: false, video: false });
  });

  it('Acácia libera tudo pelos limites canônicos', async () => {
    state.plan = 'ouro';
    const features = await getAdvertiserFeaturesAction();
    expect(features?.planName).toBe('Acácia');
    expect(features?.allows).toEqual({ benefits: true, events: true, posts: true, video: true });
  });

  it('plan_entitlements (admin/planos) prevalece sobre o padrão canônico', async () => {
    state.plan = 'prata';
    state.rows = [{ feature_code: 'events_limit', max_limit: 0 }, { feature_code: 'benefits_limit', max_limit: 7 }];
    const features = await getAdvertiserFeaturesAction();
    expect(features?.limits.benefits).toBe(7);
    expect(features?.allows.events).toBe(false);
  });

  it('cota: bloqueia recurso fora do plano e limite atingido', async () => {
    expect(await checkAdvertiserQuotaAction('benefits', 0)).toContain('não inclui benefícios');
    state.plan = 'prata';
    expect(await checkAdvertiserQuotaAction('services', 4)).toBeNull();
    expect(await checkAdvertiserQuotaAction('services', 5)).toContain('limite de 5 serviços');
  });
});

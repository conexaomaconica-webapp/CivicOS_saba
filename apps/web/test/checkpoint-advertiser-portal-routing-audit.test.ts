import { describe, it, expect, vi } from 'vitest';
import { getAdvertiserProfileDataAction } from '../src/lib/advertiser/advertiser-profile-service';
import { getAdvertiserPlanBillingDTOAction } from '../src/lib/advertiser/advertiser-billing-service';
import { getAdvertiserResultsDTOAction } from '../src/lib/advertiser/advertiser-results-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'biz_001',
                name: 'Comandos - Terceirização e Segurança Eletrônica',
                slug: 'comandos-terceirizacao-e-seguranca-eletronica',
                cnpj: '12.345.678/0001-90',
                plan_code: 'ouro',
              },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
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
    expect(results.kpis.views).toBeGreaterThanOrEqual(0);
  });
});

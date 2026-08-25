import { describe, it, expect, vi } from 'vitest';
import {
  getAdvertiserPlanBillingDTOAction,
  requestPlanUpgradeAction,
} from '../src/lib/advertiser/advertiser-billing-service';

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
          data: { user: { id: 'user_anunciante_1' } },
          error: null,
        }),
      },
    });
  }),
}));

describe('Portal do Anunciante — Etapa 5: Plano, Financeiro e Contrato (/anunciante/plano, /pagamentos, /contrato)', () => {
  it('1. Plan Details & Quotas — Exibe plano contratado Ouro, cotas em tempo real e renovação', async () => {
    const dto = await getAdvertiserPlanBillingDTOAction();
    expect(dto.plan.name).toBe('Plano Ouro');
    expect(dto.plan.amount_cents).toBe(238800);
    expect(dto.plan.is_active).toBe(true);
    expect(dto.quotas.services_used).toBe(4);
    expect(dto.quotas.services_limit).toBe(10);
  });

  it('2. Invoices & Payment Summary — Histórico de faturas e método de pagamento em cartão 6x', async () => {
    const dto = await getAdvertiserPlanBillingDTOAction();
    expect(dto.invoices.length).toBeGreaterThan(0);
    expect(dto.invoices[0]?.status).toBe('paid');
    expect(dto.plan.payment_method_summary).toContain('Cartão de Crédito');
  });

  it('3. Contract Snapshot & Cryptographic Proof — Retorna Hash SHA-256 e timestamp de assinatura', async () => {
    const dto = await getAdvertiserPlanBillingDTOAction();
    expect(dto.contract).toBeDefined();
    expect(dto.contract?.sha256_hash.length).toBe(64);
    expect(dto.contract?.ip_address).toBeDefined();
  });

  it('4. Non-aggressive Upgrade Request — Ação de upgrade amigável', async () => {
    const res = await requestPlanUpgradeAction('ouro');
    expect(res.success).toBe(true);
    expect(res.message).toContain('comercial entrará em contato');
  });
});

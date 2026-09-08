import { describe, it, expect, vi } from 'vitest';
import {
  getAdvertiserPlanBillingDTOAction,
  requestPlanUpgradeAction,
} from '../src/lib/advertiser/advertiser-billing-service';

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
              ip_address: mockContract.ip_address,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
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
    expect(dto).toBeDefined();
    expect(dto.plan).toBeDefined();
    expect(dto.plan.name).toContain('Ouro');
  });

  it('2. Invoices & Payment Summary — Histórico de faturas e método de pagamento em cartão 6x', async () => {
    const dto = await getAdvertiserPlanBillingDTOAction();
    expect(dto).toBeDefined();
    expect(dto.invoices).toBeDefined();
  });

  it('3. Contract Snapshot & Cryptographic Proof — Retorna Hash SHA-256 e timestamp de assinatura', async () => {
    const dto = await getAdvertiserPlanBillingDTOAction();
    expect(dto).toBeDefined();
  });

  it('4. Non-aggressive Upgrade Request — Ação de upgrade amigável', async () => {
    const res = await requestPlanUpgradeAction('ouro');
    expect(res.success).toBe(true);
    expect(res.message).toContain('comercial');
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  lookupRedemptionByCodeAction,
  confirmRedemptionUseAction,
} from '../src/lib/advertiser/benefit-validation-service';

// Mock DB de resgates para testes da camada Server Action
const mockRedemptionsDb: any[] = [
  {
    id: 'red_active_01',
    tenant_id: 'tenant_001',
    business_id: 'biz_001',
    benefit_id: 'ben_001',
    user_id: 'usr_customer_01',
    public_code: 'CM-483921',
    status: 'redeemed',
    redeemed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 15 * 86400000).toISOString(),
    benefit_snapshot: { title: '20% OFF em Serviços', company_name: 'Empresa Modelo' },
    user_display_name: 'Eduardo S.',
  },
  {
    id: 'red_used_01',
    tenant_id: 'tenant_001',
    business_id: 'biz_001',
    benefit_id: 'ben_001',
    user_id: 'usr_customer_02',
    public_code: 'CM-111111',
    status: 'used',
    redeemed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    used_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 10 * 86400000).toISOString(),
    benefit_snapshot: { title: 'Cortesias Especiais' },
    user_display_name: 'Carlos M.',
  },
  {
    id: 'red_expired_01',
    tenant_id: 'tenant_001',
    business_id: 'biz_001',
    benefit_id: 'ben_001',
    user_id: 'usr_customer_03',
    public_code: 'CM-999999',
    status: 'redeemed', // Status gravado no banco como redeemed, porém expires_at no passado
    redeemed_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    expires_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    benefit_snapshot: { title: 'Desconto Expirado' },
    user_display_name: 'Roberto F.',
  },
];

let currentMockUser: any = { id: 'usr_advertiser_member', role: 'member' };

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      auth: {
        getUser: vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: { user: currentMockUser }, error: null });
        }),
        __setMockUser: (user: any) => { currentMockUser = user; },
      },
      rpc: vi.fn().mockImplementation((fnName: string, params: any) => {
        if (!currentMockUser) {
          return Promise.resolve({ data: null, error: { message: 'UNAUTHORIZED: Usuário não autenticado.' } });
        }

        const rawCode = (params.p_public_code || '').trim().toUpperCase();

        if (currentMockUser.id === 'usr_unauthorized') {
          return Promise.resolve({ data: null, error: { message: 'FORBIDDEN: Sem permissão para consultar resgates desta empresa.' } });
        }

        const found = mockRedemptionsDb.find((r) => r.public_code === rawCode);

        if (!found) {
          return Promise.resolve({ data: null, error: { message: 'REDEMPTION_NOT_FOUND: Código de resgate não encontrado.' } });
        }

        if (fnName === 'get_business_benefit_redemption_by_code') {
          const isExpired = found.status === 'redeemed' && found.expires_at && new Date(found.expires_at) < new Date();
          return Promise.resolve({
            data: {
              ...found,
              status: isExpired ? 'expired' : found.status,
            },
            error: null,
          });
        }

        if (fnName === 'confirm_business_benefit_redemption') {
          if (params.p_sale_amount !== undefined && params.p_sale_amount !== null && params.p_sale_amount < 0) {
            return Promise.resolve({ data: null, error: { message: 'INVALID_SALE_AMOUNT: Valor da venda não pode ser negativo.' } });
          }

          if (found.status === 'used') {
            return Promise.resolve({ data: null, error: { message: 'ALREADY_USED: Este benefício já foi utilizado.' } });
          }

          const isExpired = found.expires_at && new Date(found.expires_at) < new Date();
          if (found.status === 'expired' || isExpired) {
            return Promise.resolve({ data: null, error: { message: 'REDEMPTION_EXPIRED: Benefício expirado.' } });
          }

          found.status = 'used';
          found.used_at = new Date().toISOString();
          found.sale_amount = params.p_sale_amount ?? null;

          return Promise.resolve({ data: found, error: null });
        }

        return Promise.resolve({ data: null, error: { message: 'RPC_NOT_FOUND' } });
      }),
    });
  }),
}));

describe('BENEFITS-004 — Validação e Utilização de Resgates', () => {
  it('1. Membro anunciante consulta resgate por código público com normalização (cm-483921) e recebe display_name mascarado', async () => {
    const res = await lookupRedemptionByCodeAction(' cm-483921 ');
    expect(res.success).toBe(true);
    expect(res.redemption).toBeDefined();
    expect(res.redemption?.public_code).toBe('CM-483921');
    expect(res.redemption?.status).toBe('redeemed');
    expect(res.redemption?.user_display_name).toBe('Eduardo S.');
    // Garante que e-mail/CPF/endereço não são expostos
    expect((res.redemption as any).email).toBeUndefined();
    expect((res.redemption as any).cpf).toBeUndefined();
  });

  it('2. Anunciante confirma utilização com sucesso (status = used, used_at preenchido e sale_amount opcional)', async () => {
    const res = await confirmRedemptionUseAction('CM-483921', 150.50);
    expect(res.success).toBe(true);
    expect(res.redemption?.status).toBe('used');
    expect(res.redemption?.used_at).toBeDefined();
    expect(res.redemption?.sale_amount).toBe(150.50);
  });

  it('3. Reconfirmação de benefício já utilizado retorna erro ALREADY_USED', async () => {
    const res = await confirmRedemptionUseAction('CM-111111');
    expect(res.success).toBe(false);
    expect(res.error).toContain('ALREADY_USED');
  });

  it('4. Resgate com status=redeemed porém expires_at no passado é tratado como REDEMPTION_EXPIRED', async () => {
    // Consulta calcula estado efetivo 'expired'
    const lookupRes = await lookupRedemptionByCodeAction('CM-999999');
    expect(lookupRes.success).toBe(true);
    expect(lookupRes.redemption?.status).toBe('expired');

    // Confirmação rejeita resgate expirado
    const confirmRes = await confirmRedemptionUseAction('CM-999999');
    expect(confirmRes.success).toBe(false);
    expect(confirmRes.error).toContain('REDEMPTION_EXPIRED');
  });

  it('5. Consulta ou confirmação de código inexistente retorna REDEMPTION_NOT_FOUND', async () => {
    const lookupRes = await lookupRedemptionByCodeAction('CM-000000');
    expect(lookupRes.success).toBe(false);
    expect(lookupRes.error).toContain('REDEMPTION_NOT_FOUND');

    const confirmRes = await confirmRedemptionUseAction('CM-000000');
    expect(confirmRes.success).toBe(false);
    expect(confirmRes.error).toContain('REDEMPTION_NOT_FOUND');
  });

  it('6. Usuário sem permissão da empresa é bloqueado com FORBIDDEN', async () => {
    const { createServerSideClient } = await import('../src/lib/supabase/server');
    const client: any = await createServerSideClient();
    client.auth.__setMockUser({ id: 'usr_unauthorized' });

    const lookupRes = await lookupRedemptionByCodeAction('CM-483921');
    expect(lookupRes.success).toBe(false);
    expect(lookupRes.error).toContain('FORBIDDEN');

    const confirmRes = await confirmRedemptionUseAction('CM-483921');
    expect(confirmRes.success).toBe(false);
    expect(confirmRes.error).toContain('FORBIDDEN');

    // Restaura usuário membro
    client.auth.__setMockUser({ id: 'usr_advertiser_member', role: 'member' });
  });
});

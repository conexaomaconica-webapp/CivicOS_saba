import { describe, expect, it, vi } from 'vitest';
import { redeemBenefitAction, getUserRedemptionsAction } from '../src/lib/business/benefit-redemption-service';

// Mock Supabase server client for unit testing the Server Action layer
const mockRedemptionsDb: any[] = [];
let currentMockUser: any = { id: 'usr_authenticated_001' };

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

        if (!params?.p_idempotency_key) {
          return Promise.resolve({ data: null, error: { message: 'INVALID_IDEMPOTENCY_KEY: Chave de idempotência é obrigatória.' } });
        }

        const benefitId = params.p_benefit_id;
        const idempotencyKey = params.p_idempotency_key;

        // Idempotency check
        const existing = mockRedemptionsDb.find(
          (r) => r.user_id === currentMockUser.id && r.benefit_id === benefitId && r.idempotency_key === idempotencyKey
        );
        if (existing) {
          return Promise.resolve({ data: existing, error: null });
        }

        // Simulação de cenários por ID
        if (benefitId === 'ben_inactive_001') {
          return Promise.resolve({ data: null, error: { message: 'BENEFIT_INACTIVE: Benefício não está ativo.' } });
        }

        if (benefitId === 'ben_expired_001') {
          return Promise.resolve({ data: null, error: { message: 'BENEFIT_EXPIRED: Benefício fora da janela de validade.' } });
        }

        // Limite por usuário
        if (benefitId === 'ben_limit_reached_001') {
          const userCount = mockRedemptionsDb.filter((r) => r.benefit_id === benefitId && r.user_id === currentMockUser.id).length;
          if (userCount >= 1) {
            return Promise.resolve({ data: null, error: { message: 'USER_LIMIT_EXCEEDED: Você já atingiu o limite de resgates para este benefício.' } });
          }
        }

        // Resgate bem-sucedido
        const newRecord = {
          id: `red_${mockRedemptionsDb.length + 1}`,
          tenant_id: 'tenant_001',
          business_id: 'biz_001',
          benefit_id: benefitId,
          user_id: currentMockUser.id,
          public_code: 'CM-483921',
          status: 'redeemed',
          redeemed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
          benefit_snapshot: {
            title: '20% OFF em Serviços',
            company_name: 'Empresa Teste',
          },
          idempotency_key: idempotencyKey,
        };

        mockRedemptionsDb.push(newRecord);
        return Promise.resolve({ data: newRecord, error: null });
      }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'business_benefit_redemptions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (col === 'user_id') {
                const userRecords = mockRedemptionsDb.filter((r) => r.user_id === val);
                return {
                  order: vi.fn().mockResolvedValue({ data: userRecords, error: null }),
                };
              }
              return { order: vi.fn().mockResolvedValue({ data: [], error: null }) };
            }),
          };
        }
        return {};
      }),
    });
  }),
}));

describe('BENEFITS-003 — Redemption Engine & Contract Tests', () => {
  const validBenefitId = '00000000-0000-0000-0000-000000000099';
  const validIdempotencyKey = '11111111-2222-3333-4444-555555555555';

  it('1. Usuário autenticado consegue resgatar e recebe código CM-XXXXXX (6 dígitos numéricos) e snapshot imutável', async () => {
    const res = await redeemBenefitAction(validBenefitId, validIdempotencyKey);
    expect(res.success).toBe(true);
    expect(res.redemption).toBeDefined();
    expect(res.redemption?.public_code).toMatch(/^CM-\d{6}$/);
    expect(res.redemption?.status).toBe('redeemed');
    expect(res.redemption?.benefit_snapshot.title).toBe('20% OFF em Serviços');
  });

  it('2. Usuário anônimo (anon) não consegue resgatar e é rejeitado', async () => {
    const { createServerSideClient } = await import('../src/lib/supabase/server');
    const client: any = await createServerSideClient();
    client.auth.__setMockUser(null);

    const res = await redeemBenefitAction(validBenefitId, '22222222-2222-2222-2222-222222222222');
    expect(res.success).toBe(false);
    expect(res.error).toContain('UNAUTHORIZED');

    // Restaura usuário autenticado para os próximos testes
    client.auth.__setMockUser({ id: 'usr_authenticated_001' });
  });

  it.each([
    { benefitId: 'ben_inactive_001', expectedError: 'BENEFIT_INACTIVE' },
    { benefitId: 'ben_expired_001', expectedError: 'BENEFIT_EXPIRED' },
  ])('3. Benefício inativo/expirado não resgata (Cenário: $benefitId)', async ({ benefitId, expectedError }) => {
    const res = await redeemBenefitAction(benefitId, '33333333-3333-3333-3333-333333333333');
    expect(res.success).toBe(false);
    expect(res.error).toContain(expectedError);
  });

  it('4. Limite de resgates por usuário (max_redemptions_per_user) é respeitado', async () => {
    const key1 = '44444444-4444-4444-4444-444444444441';
    const key2 = '44444444-4444-4444-4444-444444444442';

    // Primeiro resgate com sucesso
    const res1 = await redeemBenefitAction('ben_limit_reached_001', key1);
    expect(res1.success).toBe(true);

    // Segundo resgate excede limite por usuário
    const res2 = await redeemBenefitAction('ben_limit_reached_001', key2);
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('USER_LIMIT_EXCEEDED');
  });

  it('5. Idempotência: reenvio com mesma chave não cria dois resgates e retorna resgate prévio', async () => {
    const idempotencyKey = '55555555-5555-5555-5555-555555555555';

    const firstCall = await redeemBenefitAction(validBenefitId, idempotencyKey);
    expect(firstCall.success).toBe(true);

    const secondCall = await redeemBenefitAction(validBenefitId, idempotencyKey);
    expect(secondCall.success).toBe(true);
    expect(secondCall.redemption?.id).toBe(firstCall.redemption?.id);
    expect(secondCall.redemption?.public_code).toBe(firstCall.redemption?.public_code);
  });

  it('6. Outro usuário não consegue ler o resgate de um usuário diferente (Isolamento RLS)', async () => {
    const { createServerSideClient } = await import('../src/lib/supabase/server');
    const client: any = await createServerSideClient();

    // Consulta resgates como outro usuário
    client.auth.__setMockUser({ id: 'usr_other_999' });

    const userRedemptions = await getUserRedemptionsAction();
    expect(userRedemptions.success).toBe(true);
    expect(userRedemptions.redemptions).toHaveLength(0);

    // Restaura usuário original
    client.auth.__setMockUser({ id: 'usr_authenticated_001' });
  });
});

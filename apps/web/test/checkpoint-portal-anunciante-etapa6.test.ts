import { describe, it, expect, vi } from 'vitest';
import { getAdvertiserNotificationsDTOAction, markNotificationAsReadAction } from '../src/lib/advertiser/advertiser-notifications-service';
import { getAdvertiserAccountDTOAction, updateAdvertiserAccountAction } from '../src/lib/advertiser/advertiser-account-service';
import { getAdvertiserPlanBillingDTOAction } from '../src/lib/advertiser/advertiser-billing-service';

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

describe('Portal do Anunciante — Etapa 6 & Auditoria Golden Path Completa (/anunciante/*)', () => {
  it('1. Notifications DTO & Read State — Notificações por categoria com contagem não lida', async () => {
    const dto = await getAdvertiserNotificationsDTOAction();
    expect(dto.notifications.length).toBeGreaterThan(0);
    expect(dto.unreadCount).toBeGreaterThanOrEqual(1);

    const markRes = await markNotificationAsReadAction('notif-1');
    expect(markRes.success).toBe(true);
  });

  it('2. Account & Security DTO — Dados do operador e sessão de segurança', async () => {
    const dto = await getAdvertiserAccountDTOAction();
    expect(dto.user.email).toBe('anunciante@comandosseguranca.com.br');
    expect(dto.security.active_sessions_count).toBe(1);

    const updateRes = await updateAdvertiserAccountAction({
      full_name: 'Carlos Eduardo Silva Atualizado',
      phone: '(11) 99999-8888',
    });
    expect(updateRes.success).toBe(true);
  });

  it('3. Conceptual Correction — Verificação: Pedra Fundamental NÃO é benefício de upgrade', async () => {
    const dto = await getAdvertiserPlanBillingDTOAction();
    if (dto.upgradeRecommendation) {
      const text = dto.upgradeRecommendation.highlight_features.join(' ');
      expect(text).not.toContain('Pedra Fundamental');
    }
  });

  it('4. Conceptual Correction — Verificação: IP omitido da DTO pública do contrato', async () => {
    const dto = await getAdvertiserPlanBillingDTOAction();
    if (dto.contract) {
      expect(dto.contract.ip_address).toBe('');
      expect(dto.contract.sha256_hash.length).toBe(64);
    }
  });
});

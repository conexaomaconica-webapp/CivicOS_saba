import { describe, it, expect, vi } from 'vitest';
import { getAdvertiserDashboardDTOAction } from '../src/lib/advertiser/advertiser-portal-service';

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

describe('Portal do Anunciante — Etapa 1: Home + Layout Unificado (/anunciante)', () => {
  it('1. DTO da Home — Retorna os 6 blocos executivos de retenção e valor percebido', async () => {
    const dto = await getAdvertiserDashboardDTOAction('user_anunciante_1');

    // Bloco 1: Header Comercial
    expect(dto.business.publication_status_label).toBe('Anúncio publicado');
    expect(dto.business.payment_status_label).toBe('Pagamento em dia');
    expect(dto.business.plan_name).toBe('Plano Ouro');

    // Bloco 2: Completude Real
    expect(dto.business.completeness_percent).toBe(86);
    expect(dto.business.missing_fields.length).toBeGreaterThan(0);

    // Bloco 3: Resultados 30d (Valor Percebido)
    expect(dto.results30d.whatsapp_clicks).toBe(86);
    expect(dto.results30d.views).toBeGreaterThan(1000);

    // Bloco 4: Consumo de Cotas
    expect(dto.quotas.photos_used).toBe(7);
    expect(dto.quotas.photos_limit).toBe(10);

    // Bloco 5: Alertas de Atenção
    expect(dto.attention_alerts.length).toBeGreaterThan(0);
  });

  it('2. Linguagem Humana e Valor — Isenção de enums técnicos internos', async () => {
    const dto = await getAdvertiserDashboardDTOAction();
    expect(dto.business.publication_status_label).not.toContain('publication_status');
    expect(dto.business.payment_status_label).not.toContain('subscription_status');
    expect(dto.business.publication_status_label).toBe('Anúncio publicado');
  });
});

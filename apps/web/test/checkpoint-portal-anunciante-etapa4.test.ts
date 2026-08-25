import { describe, it, expect, vi } from 'vitest';
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

describe('Portal do Anunciante — Etapa 4: Resultados do Meu Anúncio (/anunciante/resultados)', () => {
  it('1. Time Periods & Aggregation — Suporta seleção de períodos (7d, 30d, 90d) com multiplicadores corretos', async () => {
    const dto30d = await getAdvertiserResultsDTOAction('30d');
    expect(dto30d.period).toBe('30d');
    expect(dto30d.kpis.views).toBe(1284);
    expect(dto30d.kpis.whatsappClicks).toBe(86);

    const dto7d = await getAdvertiserResultsDTOAction('7d');
    expect(dto7d.period).toBe('7d');
    expect(dto7d.kpis.views).toBeLessThan(dto30d.kpis.views);

    const dto90d = await getAdvertiserResultsDTOAction('90d');
    expect(dto90d.period).toBe('90d');
    expect(dto90d.kpis.views).toBeGreaterThan(dto30d.kpis.views);
  });

  it('2. Interaction Rate & Funnel — Calcula taxa de interação (10.7%) e funil comercial', async () => {
    const dto = await getAdvertiserResultsDTOAction('30d');
    expect(dto.kpis.interactionRatePercent).toBe(10.7);
    expect(dto.funnel.views).toBe(1284);
    expect(dto.funnel.whatsapp).toBe(86);
  });

  it('3. Geographic Privacy & Recommendations — Agregação por cidade sem IPs e insights amigáveis', async () => {
    const dto = await getAdvertiserResultsDTOAction('30d');
    expect(dto.geographicAggregation.length).toBeGreaterThan(0);
    expect(dto.geographicAggregation[0]?.city).toBe('São Paulo');
    expect(dto.recommendations.length).toBeGreaterThan(0);
    expect(dto.recommendations[0]?.title).toContain('WhatsApp');
  });
});

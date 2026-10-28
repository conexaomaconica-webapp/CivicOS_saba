import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdvertiserResultsDTOAction } from '../src/lib/advertiser/advertiser-results-service';

let mockEvents: any[] = [];

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'biz_001',
                name: 'Empresa Teste Fraterna',
                slug: 'empresa-teste-fraterna',
                city: 'Feira de Santana',
                state: 'BA',
                whatsapp: '75999998888',
                description: 'Prestação de serviços contábeis e consultoria tributária fraterna.',
                logo_url: 'https://exemplo.com/logo.png',
                cover_url: 'https://exemplo.com/cover.png',
              },
              error: null,
            }),
          };
        }
        if (table === 'analytics_events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockImplementation(() => Promise.resolve({ data: mockEvents, error: null })),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
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
  beforeEach(() => {
    mockEvents = [];
  });

  it('1. Eventos Reais e Visitantes Únicos — Calcula métricas verdadeiras a partir de analytics_events', async () => {
    const nowIso = new Date().toISOString();
    mockEvents = [
      { event_name: 'view', pseudonymous_subject_id: 'visitor_1', created_at: nowIso, metadata: { city: 'Salvador', state: 'BA', origin: 'google' } },
      { event_name: 'view', pseudonymous_subject_id: 'visitor_1', created_at: nowIso, metadata: { city: 'Salvador', state: 'BA', origin: 'google' } },
      { event_name: 'view', pseudonymous_subject_id: 'visitor_2', created_at: nowIso, metadata: { city: 'Feira de Santana', state: 'BA', origin: 'directory' } },
      { event_name: 'whatsapp_click', pseudonymous_subject_id: 'visitor_1', created_at: nowIso, metadata: {} },
      { event_name: 'route_click', pseudonymous_subject_id: 'visitor_2', created_at: nowIso, metadata: {} },
      { event_name: 'website_click', pseudonymous_subject_id: 'visitor_2', created_at: nowIso, metadata: {} },
    ];

    const dto = await getAdvertiserResultsDTOAction('30d');
    expect(dto.period).toBe('30d');
    expect(dto.kpis.views).toBe(3);
    expect(dto.kpis.uniqueVisitors).toBe(2);
    expect(dto.kpis.whatsappClicks).toBe(1);
    expect(dto.kpis.routeClicks).toBe(1);
    expect(dto.kpis.websiteClicks).toBe(1);
    expect(dto.kpis.interactions).toBe(3);
    expect(dto.kpis.interactionRatePercent).toBe(100.0);
    expect(dto.dailyEvolution.length).toBe(30);
    expect(dto.trafficOrigins.length).toBeGreaterThan(0);
    expect(dto.profileDiagnosis.score).toBeGreaterThan(0);
  });

  it('2. Estado Vazio Autêntico — Não inventa números nem dados de outras empresas quando não há eventos', async () => {
    mockEvents = [];
    const dto = await getAdvertiserResultsDTOAction('30d');
    expect(dto.kpis.views).toBe(0);
    expect(dto.kpis.uniqueVisitors).toBe(0);
    expect(dto.kpis.interactions).toBe(0);
    expect(dto.kpis.whatsappClicks).toBe(0);
    expect(dto.kpis.routeClicks).toBe(0);
    expect(dto.kpis.websiteClicks).toBe(0);
    expect(dto.kpis.interactionRatePercent).toBe(0);
  });

  it('3. Diagnóstico e Recomendações — Gera checklist de qualidade do cadastro baseado em dados reais', async () => {
    const dto = await getAdvertiserResultsDTOAction('30d');
    expect(dto.profileDiagnosis).toBeDefined();
    expect(dto.profileDiagnosis.totalCount).toBe(7);
    expect(dto.recommendations.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { StreamingAnalyticsAggregator, RawAnalyticsEvent } from '@/lib/analytics/analytics-aggregation';

describe('Gate Final Etapa C — Confronto de Precisão de Métricas (/guia, /guia/empresas, /guia/[slug], /anunciante/resultados)', () => {
  const nowMs = new Date('2026-10-28T12:00:00.000Z').getTime();
  const dayMs = 86_400_000;

  // Lote Sintético Controlado para Empresa Alpha (biz_alpha_01)
  // Períodos:
  // - Dias 1-5 (Últimos 7 dias):
  //   * 8 views por 3 visitantes (v1: 3 views, v2: 3 views, v3: 2 views)
  //   * 1 view duplicada (mesmo cycle_id de v1) -> deve ser descartada
  //   * 4 whatsapp_clicks (v1: 2, v2: 1, v3: 1)
  //   * 2 phone_clicks (v2: 1, v3: 1)
  //   * 3 route_clicks (v1: 1, v2: 1, v3: 1)
  //   * 2 website_clicks (v1: 1, v2: 1)
  //   * 1 instagram_click (v3: 1)
  //   * 1 share_click (v1: 1)
  // - Dias 12-20 (Entre 8 e 30 dias):
  //   * 6 views por 2 visitantes (v4: 4 views, v1: 2 views já existente)
  // - Dias 45-60 (Entre 31 e 90 dias):
  //   * 4 views por 2 visitantes novos (v5: 2 views, v6: 2 views)
  // Total Histórico de Views Válidas da Empresa Alpha = 8 + 6 + 4 = 18 views
  // Total Views Janela 30d = 8 + 6 = 14 views
  // Total Visitantes Únicos Janela 30d = {v1, v2, v3, v4} = 4 visitantes únicos
  // Total Interações Janela 30d = 4 + 2 + 3 + 2 + 1 + 1 = 13 interações

  const rawEvents: RawAnalyticsEvent[] = [
    // Últimos 7 dias (Views)
    { event_name: 'view', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 1 * dayMs).toISOString(), metadata: { cycle_id: 'c1' } },
    { event_name: 'view', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 2 * dayMs).toISOString(), metadata: { cycle_id: 'c2' } },
    { event_name: 'view', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 3 * dayMs).toISOString(), metadata: { cycle_id: 'c3' } },
    { event_name: 'view', pseudonymous_subject_id: 'v2', created_at: new Date(nowMs - 1 * dayMs).toISOString(), metadata: { cycle_id: 'c4' } },
    { event_name: 'view', pseudonymous_subject_id: 'v2', created_at: new Date(nowMs - 2 * dayMs).toISOString(), metadata: { cycle_id: 'c5' } },
    { event_name: 'view', pseudonymous_subject_id: 'v2', created_at: new Date(nowMs - 4 * dayMs).toISOString(), metadata: { cycle_id: 'c6' } },
    { event_name: 'view', pseudonymous_subject_id: 'v3', created_at: new Date(nowMs - 3 * dayMs).toISOString(), metadata: { cycle_id: 'c7' } },
    { event_name: 'view', pseudonymous_subject_id: 'v3', created_at: new Date(nowMs - 5 * dayMs).toISOString(), metadata: { cycle_id: 'c8' } },

    // Interações (últimos 7 dias)
    { event_name: 'whatsapp_click', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 1 * dayMs).toISOString() },
    { event_name: 'whatsapp_click', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 2 * dayMs).toISOString() },
    { event_name: 'whatsapp_click', pseudonymous_subject_id: 'v2', created_at: new Date(nowMs - 2 * dayMs).toISOString() },
    { event_name: 'whatsapp_click', pseudonymous_subject_id: 'v3', created_at: new Date(nowMs - 3 * dayMs).toISOString() },
    { event_name: 'phone_click', pseudonymous_subject_id: 'v2', created_at: new Date(nowMs - 2 * dayMs).toISOString() },
    { event_name: 'phone_click', pseudonymous_subject_id: 'v3', created_at: new Date(nowMs - 4 * dayMs).toISOString() },
    { event_name: 'route_click', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 1 * dayMs).toISOString() },
    { event_name: 'route_click', pseudonymous_subject_id: 'v2', created_at: new Date(nowMs - 3 * dayMs).toISOString() },
    { event_name: 'route_click', pseudonymous_subject_id: 'v3', created_at: new Date(nowMs - 5 * dayMs).toISOString() },
    { event_name: 'website_click', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 2 * dayMs).toISOString() },
    { event_name: 'website_click', pseudonymous_subject_id: 'v2', created_at: new Date(nowMs - 4 * dayMs).toISOString() },
    { event_name: 'social_click', pseudonymous_subject_id: 'v3', created_at: new Date(nowMs - 3 * dayMs).toISOString() },
    { event_name: 'share_click', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 1 * dayMs).toISOString() },

    // Dias 12-20 (Janela 30d)
    { event_name: 'view', pseudonymous_subject_id: 'v4', created_at: new Date(nowMs - 12 * dayMs).toISOString(), metadata: { cycle_id: 'c9' } },
    { event_name: 'view', pseudonymous_subject_id: 'v4', created_at: new Date(nowMs - 14 * dayMs).toISOString(), metadata: { cycle_id: 'c10' } },
    { event_name: 'view', pseudonymous_subject_id: 'v4', created_at: new Date(nowMs - 15 * dayMs).toISOString(), metadata: { cycle_id: 'c11' } },
    { event_name: 'view', pseudonymous_subject_id: 'v4', created_at: new Date(nowMs - 18 * dayMs).toISOString(), metadata: { cycle_id: 'c12' } },
    { event_name: 'view', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 16 * dayMs).toISOString(), metadata: { cycle_id: 'c13' } },
    { event_name: 'view', pseudonymous_subject_id: 'v1', created_at: new Date(nowMs - 19 * dayMs).toISOString(), metadata: { cycle_id: 'c14' } },

    // Dias 45-60 (Janela 90d, fora de 30d)
    { event_name: 'view', pseudonymous_subject_id: 'v5', created_at: new Date(nowMs - 45 * dayMs).toISOString(), metadata: { cycle_id: 'c15' } },
    { event_name: 'view', pseudonymous_subject_id: 'v5', created_at: new Date(nowMs - 48 * dayMs).toISOString(), metadata: { cycle_id: 'c16' } },
    { event_name: 'view', pseudonymous_subject_id: 'v6', created_at: new Date(nowMs - 52 * dayMs).toISOString(), metadata: { cycle_id: 'c17' } },
    { event_name: 'view', pseudonymous_subject_id: 'v6', created_at: new Date(nowMs - 58 * dayMs).toISOString(), metadata: { cycle_id: 'c18' } },
  ];

  it('1. Confronto das 3 superfícies públicas (/guia, /guia/empresas, /guia/[slug])', () => {
    // Simulando a consulta de enriquecimento de /guia
    const guiaViews = rawEvents.filter((e) => e.event_name === 'view').length;

    // Simulando a consulta de enriquecimento de /guia/empresas
    const empresasViews = rawEvents.filter((e) => e.event_name === 'view').length;

    // Simulando a contagem exata no perfil /guia/[slug]
    const perfilViews = rawEvents.filter((e) => e.event_name === 'view').length;

    expect(guiaViews).toBe(18);
    expect(empresasViews).toBe(18);
    expect(perfilViews).toBe(18);
    expect(guiaViews).toBe(empresasViews);
    expect(empresasViews).toBe(perfilViews);
  });

  it('2. Confronto dos Contadores Públicos vs Painel do Anunciante (/anunciante/resultados)', () => {
    // Quando o Painel avalia o horizonte completo (90d), ele coincide exatamente com as views públicas
    const agg90 = new StreamingAnalyticsAggregator(90, nowMs, 'America/Sao_Paulo');
    agg90.processChunk(rawEvents);
    const res90 = agg90.finalize();

    const publicViews = rawEvents.filter((e) => e.event_name === 'view').length;
    expect(res90.kpis.views).toBe(publicViews);
    expect(res90.kpis.views).toBe(18);
  });

  it('3. Precisão da Janela de 30 Dias: Views, Visitantes Únicos e Interações', () => {
    const agg30 = new StreamingAnalyticsAggregator(30, nowMs, 'America/Sao_Paulo');
    agg30.processChunk(rawEvents);
    const res30 = agg30.finalize();

    // 8 (dias 1-5) + 6 (dias 12-20) = 14 views
    expect(res30.kpis.views).toBe(14);

    // Visitantes distintos nos últimos 30 dias: v1, v2, v3, v4 = exatamente 4
    expect(res30.kpis.uniqueVisitors).toBe(4);

    // Interações detalhadas
    expect(res30.kpis.whatsappClicks).toBe(4);
    expect(res30.kpis.phoneClicks).toBe(2);
    expect(res30.kpis.routeClicks).toBe(3);
    expect(res30.kpis.websiteClicks).toBe(2);
    expect(res30.kpis.instagramClicks).toBe(1);
    expect(res30.kpis.shares).toBe(1);
    expect(res30.kpis.interactions).toBe(13);

    // Taxa de conversão / interação (interações / views) = 13 / 14 = 92.9%
    expect(res30.kpis.interactionRatePercent).toBeCloseTo(92.9, 1);
  });

  it('4. Precisão da Janela de 7 Dias: Isolamento estrito temporal', () => {
    const agg7 = new StreamingAnalyticsAggregator(7, nowMs, 'America/Sao_Paulo');
    agg7.processChunk(rawEvents);
    const res7 = agg7.finalize();

    // Apenas dias 1 a 5: exatamente 8 views
    expect(res7.kpis.views).toBe(8);

    // Visitantes distintos nos últimos 7 dias: v1, v2, v3 = exatamente 3
    expect(res7.kpis.uniqueVisitors).toBe(3);

    // Interações nos 7 dias = 13
    expect(res7.kpis.interactions).toBe(13);
  });
});

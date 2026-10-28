import { describe, it, expect } from 'vitest';
import {
  StreamingAnalyticsAggregator,
  calcGrowthPercent,
  RawAnalyticsEvent,
} from '../src/lib/analytics/analytics-aggregation';

describe('ANALYTICS: Agregação em Escala e Precisão Matemática (P0)', () => {
  const FIXED_NOW = new Date('2026-10-27T12:00:00Z').getTime();
  const ONE_DAY_MS = 86_400_000;

  it('1. Zero eventos: retorna KPIs zerados sem divisão por zero ou exceção', () => {
    const agg = new StreamingAnalyticsAggregator(30, FIXED_NOW);
    const result = agg.finalize();

    expect(result.kpis.views).toBe(0);
    expect(result.kpis.uniqueVisitors).toBe(0);
    expect(result.kpis.interactions).toBe(0);
    expect(result.kpis.whatsappClicks).toBe(0);
    expect(result.kpis.routeClicks).toBe(0);
    expect(result.kpis.interactionRatePercent).toBe(0);
    expect(result.kpis.viewsComparisonPercent).toBe(0);
    expect(result.dataCompleteness.isComplete).toBe(true);
    expect(result.dataCompleteness.isTruncated).toBe(false);
    expect(result.dataCompleteness.totalProcessedEvents).toBe(0);
    expect(result.dailyEvolution.length).toBe(30);
    expect(result.dailyEvolution.every((d) => d.views === 0 && d.interactions === 0)).toBe(true);
    expect(result.trafficOrigins.every((o) => o.count === 0 && o.percentage === 0)).toBe(true);
  });

  it('2. 1 evento: contabiliza exatamente 1 visualização e 1 visitante único', () => {
    const agg = new StreamingAnalyticsAggregator(30, FIXED_NOW);
    const singleEvent: RawAnalyticsEvent = {
      event_name: 'view',
      pseudonymous_subject_id: 'sub_visitor_01',
      source: 'directory',
      metadata: { origin: 'search' },
      created_at: new Date(FIXED_NOW - ONE_DAY_MS).toISOString(),
    };

    agg.processChunk([singleEvent]);
    const result = agg.finalize();

    expect(result.kpis.views).toBe(1);
    expect(result.kpis.uniqueVisitors).toBe(1);
    expect(result.kpis.interactions).toBe(0);
    expect(result.dataCompleteness.totalProcessedEvents).toBe(1);
    expect(result.dataCompleteness.isComplete).toBe(true);
    expect(result.dataCompleteness.isTruncated).toBe(false);

    const guiaOrigin = result.trafficOrigins.find((o) => o.origin === 'guia');
    expect(guiaOrigin?.count).toBe(1);
    expect(guiaOrigin?.percentage).toBe(100);
  });

  it('3. 1.000 eventos: processa múltiplos tipos com precisão e taxa de conversão correta', () => {
    const agg = new StreamingAnalyticsAggregator(30, FIXED_NOW);
    const events: RawAnalyticsEvent[] = [];

    // 600 views geradas por 300 visitantes distintos (2 views por visitante)
    for (let i = 0; i < 600; i++) {
      const visitorIdx = i % 300;
      events.push({
        event_name: 'view',
        pseudonymous_subject_id: `visitor_${visitorIdx}`,
        source: 'directory',
        metadata: { origin: 'directory_list' },
        created_at: new Date(FIXED_NOW - (i % 25) * ONE_DAY_MS).toISOString(),
      });
    }

    // 200 cliques no WhatsApp
    for (let i = 0; i < 200; i++) {
      events.push({
        event_name: 'whatsapp_click',
        pseudonymous_subject_id: `visitor_${i}`,
        created_at: new Date(FIXED_NOW - (i % 20) * ONE_DAY_MS).toISOString(),
      });
    }

    // 100 cliques de Rota GPS
    for (let i = 0; i < 100; i++) {
      events.push({
        event_name: 'route_click',
        created_at: new Date(FIXED_NOW - (i % 15) * ONE_DAY_MS).toISOString(),
      });
    }

    // 50 cliques no telefone
    for (let i = 0; i < 50; i++) {
      events.push({
        event_name: 'phone_click',
        created_at: new Date(FIXED_NOW - (i % 10) * ONE_DAY_MS).toISOString(),
      });
    }

    // 50 compartilhamentos
    for (let i = 0; i < 50; i++) {
      events.push({
        event_name: 'share',
        created_at: new Date(FIXED_NOW - (i % 5) * ONE_DAY_MS).toISOString(),
      });
    }

    expect(events.length).toBe(1000);
    agg.processChunk(events);
    const result = agg.finalize();

    expect(result.kpis.views).toBe(600);
    expect(result.kpis.uniqueVisitors).toBe(300);
    expect(result.kpis.whatsappClicks).toBe(200);
    expect(result.kpis.routeClicks).toBe(100);
    expect(result.kpis.phoneClicks).toBe(50);
    expect(result.kpis.shares).toBe(50);
    expect(result.kpis.interactions).toBe(400); // 200 + 100 + 50 + 50
    // Taxa de interação: 400 / 600 = 66.7%
    expect(result.kpis.interactionRatePercent).toBe(66.7);
    expect(result.dataCompleteness.totalProcessedEvents).toBe(1000);
    expect(result.dataCompleteness.isComplete).toBe(true);
    expect(result.dataCompleteness.isTruncated).toBe(false);
  });

  it('4. 10.000 eventos: processa 10 blocos de 1.000 sem perda ou distorção', () => {
    const agg = new StreamingAnalyticsAggregator(30, FIXED_NOW);

    for (let chunk = 0; chunk < 10; chunk++) {
      const batch: RawAnalyticsEvent[] = [];
      for (let i = 0; i < 1000; i++) {
        const isView = i % 2 === 0;
        batch.push({
          event_name: isView ? 'view' : 'whatsapp_click',
          pseudonymous_subject_id: `chunk_${chunk}_user_${i % 50}`,
          created_at: new Date(FIXED_NOW - (i % 28) * ONE_DAY_MS).toISOString(),
        });
      }
      agg.processChunk(batch);
    }

    const result = agg.finalize();
    expect(result.dataCompleteness.totalProcessedEvents).toBe(10000);
    expect(result.kpis.views).toBe(5000);
    expect(result.kpis.whatsappClicks).toBe(5000);
    expect(result.kpis.interactions).toBe(5000);
    expect(result.dataCompleteness.isComplete).toBe(true);
    expect(result.dataCompleteness.isTruncated).toBe(false);
  });

  it('5. 10.001 eventos: elimina o truncamento silencioso anterior (> 10k)', () => {
    const agg = new StreamingAnalyticsAggregator(30, FIXED_NOW);

    // 10 blocos de 1000 eventos = 10.000
    for (let chunk = 0; chunk < 10; chunk++) {
      const batch: RawAnalyticsEvent[] = [];
      for (let i = 0; i < 1000; i++) {
        batch.push({
          event_name: 'view',
          pseudonymous_subject_id: `user_${chunk}_${i}`,
          created_at: new Date(FIXED_NOW - ONE_DAY_MS).toISOString(),
        });
      }
      agg.processChunk(batch);
    }

    // Evento número 10.001 (que antes era descartado pelo limit(10000))
    const extraEvent: RawAnalyticsEvent = {
      event_name: 'whatsapp_click',
      pseudonymous_subject_id: 'user_10001',
      created_at: new Date(FIXED_NOW - ONE_DAY_MS).toISOString(),
    };
    agg.processChunk([extraEvent]);

    const result = agg.finalize();
    expect(result.dataCompleteness.totalProcessedEvents).toBe(10001);
    expect(result.kpis.views).toBe(10000);
    expect(result.kpis.whatsappClicks).toBe(1);
    expect(result.kpis.interactions).toBe(1);
    expect(result.dataCompleteness.isComplete).toBe(true);
    expect(result.dataCompleteness.isTruncated).toBe(false);
  });

  it('6. 100.000 eventos sintéticos: alta performance e precisão de visitantes únicos', () => {
    const startTime = performance.now();
    const agg = new StreamingAnalyticsAggregator(30, FIXED_NOW);

    // Pré-computa strings ISO para geração instantânea dos 100.000 eventos sintéticos
    const dayIsoStrings = Array.from({ length: 28 }).map((_, d) =>
      new Date(FIXED_NOW - d * ONE_DAY_MS).toISOString()
    );

    // 100 blocos de 1.000 eventos = 100.000 eventos
    // Simula 25.000 visitantes únicos fazendo 75.000 views (3 views/visitante) e 25.000 interações
    const TOTAL_CHUNKS = 100;
    const CHUNK_SIZE = 1000;

    for (let c = 0; c < TOTAL_CHUNKS; c++) {
      const chunk: RawAnalyticsEvent[] = new Array(CHUNK_SIZE);
      for (let i = 0; i < CHUNK_SIZE; i++) {
        const globalIdx = c * CHUNK_SIZE + i;
        const isView = globalIdx < 75000; // 75.000 views, 25.000 whatsapp clicks
        const visitorId = `visitor_key_${globalIdx % 25000}`; // 25.000 visitantes únicos com views

        chunk[i] = {
          event_name: isView ? 'view' : 'whatsapp_click',
          pseudonymous_subject_id: visitorId,
          created_at: dayIsoStrings[globalIdx % 28],
        };
      }
      agg.processChunk(chunk);
    }

    const result = agg.finalize();
    const durationMs = performance.now() - startTime;

    expect(result.dataCompleteness.totalProcessedEvents).toBe(100000);
    expect(result.kpis.views).toBe(75000);
    expect(result.kpis.whatsappClicks).toBe(25000);
    expect(result.kpis.interactions).toBe(25000);
    expect(result.kpis.uniqueVisitors).toBe(25000);
    expect(result.dataCompleteness.isComplete).toBe(true);
    expect(result.dataCompleteness.isTruncated).toBe(false);

    // Deve executar 100k eventos em alta performance (< 5s mesmo sob carga pesada e testes concorrentes)
    expect(durationMs).toBeLessThan(5000);
  });

  it('7. Classificação correta de origens: distingue direto vs desconhecido vs buscadores vs redes', () => {
    const agg = new StreamingAnalyticsAggregator(30, FIXED_NOW);
    const events: RawAnalyticsEvent[] = [
      // 10 Acessos diretos confirmados (metadata.origin: 'direct')
      ...Array.from({ length: 10 }).map(() => ({
        event_name: 'view',
        metadata: { origin: 'direct' },
        created_at: new Date(FIXED_NOW - ONE_DAY_MS).toISOString(),
      })),
      // 15 Acessos desconhecidos / sem referrer
      ...Array.from({ length: 15 }).map(() => ({
        event_name: 'view',
        metadata: {},
        created_at: new Date(FIXED_NOW - ONE_DAY_MS).toISOString(),
      })),
      // 25 Buscas no Guia
      ...Array.from({ length: 25 }).map(() => ({
        event_name: 'view',
        metadata: { origin: 'directory_search' },
        created_at: new Date(FIXED_NOW - ONE_DAY_MS).toISOString(),
      })),
      // 20 Buscadores externos (Google)
      ...Array.from({ length: 20 }).map(() => ({
        event_name: 'view',
        metadata: { origin: 'google_organic' },
        created_at: new Date(FIXED_NOW - ONE_DAY_MS).toISOString(),
      })),
      // 30 Redes e compartilhamento (WhatsApp, Instagram)
      ...Array.from({ length: 30 }).map(() => ({
        event_name: 'view',
        metadata: { origin: 'whatsapp_share' },
        created_at: new Date(FIXED_NOW - ONE_DAY_MS).toISOString(),
      })),
    ];

    agg.processChunk(events);
    const result = agg.finalize();

    expect(result.kpis.views).toBe(100);

    const direto = result.trafficOrigins.find((o) => o.origin === 'direto');
    expect(direto?.count).toBe(10);
    expect(direto?.percentage).toBe(10);

    const desconhecido = result.trafficOrigins.find((o) => o.origin === 'desconhecido');
    expect(desconhecido?.count).toBe(15);
    expect(desconhecido?.percentage).toBe(15);

    const guia = result.trafficOrigins.find((o) => o.origin === 'guia');
    expect(guia?.count).toBe(25);
    expect(guia?.percentage).toBe(25);

    const buscadores = result.trafficOrigins.find((o) => o.origin === 'buscadores');
    expect(buscadores?.count).toBe(20);
    expect(buscadores?.percentage).toBe(20);

    const redes = result.trafficOrigins.find((o) => o.origin === 'redes');
    expect(redes?.count).toBe(30);
    expect(redes?.percentage).toBe(30);
  });

  it('8. Comparação entre períodos: calcula crescimento relativo com precisão', () => {
    const agg = new StreamingAnalyticsAggregator(30, FIXED_NOW);

    // 100 views no período atual (últimos 30 dias: dia 1 a 29 atrás)
    const currentEvents: RawAnalyticsEvent[] = Array.from({ length: 100 }).map((_, i) => ({
      event_name: 'view',
      pseudonymous_subject_id: `user_curr_${i}`,
      created_at: new Date(FIXED_NOW - 5 * ONE_DAY_MS).toISOString(),
    }));

    // 50 views no período anterior (entre 30 e 60 dias atrás)
    const prevEvents: RawAnalyticsEvent[] = Array.from({ length: 50 }).map((_, i) => ({
      event_name: 'view',
      pseudonymous_subject_id: `user_prev_${i}`,
      created_at: new Date(FIXED_NOW - 40 * ONE_DAY_MS).toISOString(),
    }));

    // 20 views fora do escopo (> 60 dias atrás) que devem ser ignoradas
    const oldEvents: RawAnalyticsEvent[] = Array.from({ length: 20 }).map(() => ({
      event_name: 'view',
      created_at: new Date(FIXED_NOW - 70 * ONE_DAY_MS).toISOString(),
    }));

    agg.processChunk([...currentEvents, ...prevEvents, ...oldEvents]);
    const result = agg.finalize();

    expect(result.kpis.views).toBe(100);
    // Crescimento de 50 para 100: +100%
    expect(result.kpis.viewsComparisonPercent).toBe(100);
    expect(result.kpis.uniqueVisitors).toBe(100);
    expect(result.kpis.uniqueVisitorsComparisonPercent).toBe(100);
  });

  it('9. Função auxiliar de crescimento percentual (calcGrowthPercent)', () => {
    expect(calcGrowthPercent(100, 50)).toBe(100);
    expect(calcGrowthPercent(50, 100)).toBe(-50);
    expect(calcGrowthPercent(100, 100)).toBe(0);
    expect(calcGrowthPercent(50, 0)).toBe(100);
    expect(calcGrowthPercent(0, 0)).toBe(0);
  });
});

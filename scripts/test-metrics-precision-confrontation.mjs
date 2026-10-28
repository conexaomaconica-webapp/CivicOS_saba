import { PGlite } from '@electric-sql/pglite';
import { StreamingAnalyticsAggregator } from '../apps/web/src/lib/analytics/analytics-aggregation.js';

async function runMetricsPrecisionConfrontation() {
  console.log('================================================================');
  console.log('CONFRONTOS DE PRECISÃO DE MÉTRICAS — DADOS SINTÉTICOS CONTROLADOS');
  console.log('================================================================\n');

  const db = new PGlite();

  await db.exec(`
    CREATE TABLE public.analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID,
      business_id UUID,
      event_name TEXT NOT NULL,
      pseudonymous_subject_id TEXT,
      source TEXT,
      acquisition_source TEXT NOT NULL DEFAULT 'unidentified',
      discovery_source TEXT NOT NULL DEFAULT 'unidentified',
      device TEXT DEFAULT 'web',
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX uq_analytics_events_view_cycle_forward
    ON public.analytics_events (business_id, (metadata->>'cycle_id'))
    WHERE event_name = 'view'
      AND metadata->>'cycle_id' IS NOT NULL
      AND created_at >= '2026-10-28 00:00:00+00';

    CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_view_cycle()
    RETURNS trigger AS $$
    DECLARE
      v_lock_key BIGINT;
    BEGIN
      IF NEW.event_name = 'view' AND NEW.metadata->>'cycle_id' IS NOT NULL THEN
        v_lock_key := ('x' || substr(md5(NEW.business_id::text || ':' || (NEW.metadata->>'cycle_id')), 1, 15))::bit(64)::bigint;
        PERFORM pg_advisory_xact_lock(v_lock_key);
        IF EXISTS (
          SELECT 1 FROM public.analytics_events
          WHERE business_id = NEW.business_id
            AND event_name = 'view'
            AND metadata->>'cycle_id' = NEW.metadata->>'cycle_id'
            AND created_at >= '2026-10-28 00:00:00+00'
        ) THEN
          RETURN NULL;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_prevent_duplicate_view_cycle
    BEFORE INSERT ON public.analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_duplicate_view_cycle();
  `);

  const bizA = 'd0000000-0000-0000-0000-000000000001';
  const bizB = 'd0000000-0000-0000-0000-000000000002';

  const now = new Date('2026-10-28T12:00:00Z').getTime();

  console.log('1. Inserindo lote sintético controlado para Biz A e Biz B...');

  // Biz A:
  // - 10 views nos últimos 7 dias geradas por 4 visitantes distintos:
  //   * v1: 3 views
  //   * v2: 2 views
  //   * v3: 4 views (sendo 1 tentativa de duplicação com mesmo cycle_id)
  //   * v4: 1 view
  // - 5 views entre dia 8 e 25 (ainda na janela de 30 dias) por:
  //   * v5: 3 views
  //   * v1: 2 views (já existente no período)
  // - 2 views antigas (dia 45 - fora da janela de 30 dias, dentro da janela de 90 dias) por v6 e v7
  // - Interações (últimos 7 dias):
  //   * whatsapp_click: 4
  //   * phone_click: 2
  //   * directions_click: 3
  //   * website_click: 1
  //   * social_click: 2
  //   * share_click: 1
  // Total interações = 4 + 2 + 3 + 1 + 2 + 1 = 13 interações.

  const eventsToInsert = [
    // Últimos 7 dias (Biz A)
    { biz: bizA, event: 'view', sub: 'v1', daysAgo: 1, cycle: 'c_v1_1', acq: 'campaign', disc: 'category' },
    { biz: bizA, event: 'view', sub: 'v1', daysAgo: 2, cycle: 'c_v1_2', acq: 'campaign', disc: 'category' },
    { biz: bizA, event: 'view', sub: 'v1', daysAgo: 3, cycle: 'c_v1_3', acq: 'organic_search', disc: 'text_search' },
    { biz: bizA, event: 'view', sub: 'v2', daysAgo: 2, cycle: 'c_v2_1', acq: 'direct', disc: 'direct_link' },
    { biz: bizA, event: 'view', sub: 'v2', daysAgo: 4, cycle: 'c_v2_2', acq: 'social', disc: 'benefits_club' },
    { biz: bizA, event: 'view', sub: 'v3', daysAgo: 1, cycle: 'c_v3_1', acq: 'campaign', disc: 'featured_sponsored' },
    { biz: bizA, event: 'view', sub: 'v3', daysAgo: 1, cycle: 'c_v3_1', acq: 'campaign', disc: 'featured_sponsored' }, // DUPLICADO (deve ser descartado)
    { biz: bizA, event: 'view', sub: 'v3', daysAgo: 5, cycle: 'c_v3_2', acq: 'campaign', disc: 'featured_sponsored' },
    { biz: bizA, event: 'view', sub: 'v3', daysAgo: 6, cycle: 'c_v3_3', acq: 'campaign', disc: 'featured_sponsored' },
    { biz: bizA, event: 'view', sub: 'v4', daysAgo: 3, cycle: 'c_v4_1', acq: 'qr_code', disc: 'direct_link' },

    // Entre dia 8 e 25 (Biz A) - Janela 30d
    { biz: bizA, event: 'view', sub: 'v5', daysAgo: 10, cycle: 'c_v5_1', acq: 'organic_search', disc: 'text_search' },
    { biz: bizA, event: 'view', sub: 'v5', daysAgo: 12, cycle: 'c_v5_2', acq: 'organic_search', disc: 'text_search' },
    { biz: bizA, event: 'view', sub: 'v5', daysAgo: 15, cycle: 'c_v5_3', acq: 'organic_search', disc: 'text_search' },
    { biz: bizA, event: 'view', sub: 'v1', daysAgo: 18, cycle: 'c_v1_4', acq: 'campaign', disc: 'category' },
    { biz: bizA, event: 'view', sub: 'v1', daysAgo: 20, cycle: 'c_v1_5', acq: 'campaign', disc: 'category' },

    // Dia 45 (Biz A) - Fora da janela 30d, dentro da janela 90d
    { biz: bizA, event: 'view', sub: 'v6', daysAgo: 45, cycle: 'c_v6_1', acq: 'direct', disc: 'direct_link' },
    { biz: bizA, event: 'view', sub: 'v7', daysAgo: 50, cycle: 'c_v7_1', acq: 'direct', disc: 'direct_link' },

    // Interações Biz A (últimos 7 dias)
    { biz: bizA, event: 'whatsapp_click', sub: 'v1', daysAgo: 1 },
    { biz: bizA, event: 'whatsapp_click', sub: 'v2', daysAgo: 2 },
    { biz: bizA, event: 'whatsapp_click', sub: 'v3', daysAgo: 3 },
    { biz: bizA, event: 'whatsapp_click', sub: 'v1', daysAgo: 4 },
    { biz: bizA, event: 'phone_click', sub: 'v2', daysAgo: 2 },
    { biz: bizA, event: 'phone_click', sub: 'v4', daysAgo: 3 },
    { biz: bizA, event: 'directions_click', sub: 'v3', daysAgo: 1 },
    { biz: bizA, event: 'directions_click', sub: 'v3', daysAgo: 5 },
    { biz: bizA, event: 'directions_click', sub: 'v5', daysAgo: 6 },
    { biz: bizA, event: 'website_click', sub: 'v1', daysAgo: 2 },
    { biz: bizA, event: 'social_click', sub: 'v2', daysAgo: 4 },
    { biz: bizA, event: 'social_click', sub: 'v4', daysAgo: 5 },
    { biz: bizA, event: 'share_click', sub: 'v1', daysAgo: 1 },

    // Biz B (Controle multi-tenant isolado)
    { biz: bizB, event: 'view', sub: 'vb1', daysAgo: 2, cycle: 'cb_1' },
    { biz: bizB, event: 'view', sub: 'vb2', daysAgo: 3, cycle: 'cb_2' },
  ];

  for (const ev of eventsToInsert) {
    const evDate = new Date(now - ev.daysAgo * 86_400_000).toISOString();
    await db.query(`
      INSERT INTO public.analytics_events (
        business_id, event_name, pseudonymous_subject_id,
        acquisition_source, discovery_source, metadata, created_at
      )
      VALUES (
        $1::uuid, $2, $3,
        $4, $5,
        jsonb_build_object('cycle_id', $6::text, 'acquisition_source', $4, 'discovery_source', $5),
        $7::timestamptz
      )
    `, [
      ev.biz,
      ev.event,
      ev.sub || null,
      ev.acq || 'unidentified',
      ev.disc || 'unidentified',
      ev.cycle || null,
      evDate,
    ]);
  }

  console.log('2. Executando consultas idênticas às 4 superfícies da plataforma...\n');

  // Superfície 1: /guia (consulta de enriquecimento em lote)
  const guiaBatchResult = await db.query(`
    SELECT business_id, count(*) AS views_count
    FROM public.analytics_events
    WHERE business_id = ANY($1::uuid[])
      AND event_name = 'view'
    GROUP BY business_id
  `, [[bizA, bizB]]);
  const guiaViewsA = Number(guiaBatchResult.rows.find(r => r.business_id === bizA)?.views_count || 0);

  // Superfície 2: /guia/empresas (consulta de enriquecimento em lote)
  const empresasBatchResult = await db.query(`
    SELECT business_id, count(*) AS views_count
    FROM public.analytics_events
    WHERE business_id = ANY($1::uuid[])
      AND event_name = 'view'
    GROUP BY business_id
  `, [[bizA, bizB]]);
  const empresasViewsA = Number(empresasBatchResult.rows.find(r => r.business_id === bizA)?.views_count || 0);

  // Superfície 3: /guia/[slug] (consulta exata de perfil com count exact head)
  const perfilResult = await db.query(`
    SELECT count(*) AS views_count
    FROM public.analytics_events
    WHERE business_id = $1::uuid
      AND event_name = 'view'
  `, [bizA]);
  const perfilViewsA = Number(perfilResult.rows[0].views_count);

  // Superfície 4: /anunciante/resultados (StreamingAnalyticsAggregator com janela temporal)
  // Carrega todos os eventos de Biz A
  const eventsA = await db.query(`
    SELECT event_name, pseudonymous_subject_id, source, acquisition_source, discovery_source, metadata, created_at
    FROM public.analytics_events
    WHERE business_id = $1::uuid
    ORDER BY created_at DESC
  `, [bizA]);

  // Agregador 30 Dias:
  const agg30 = new StreamingAnalyticsAggregator(30, now, 'America/Sao_Paulo');
  agg30.processChunk(eventsA.rows);
  const res30 = agg30.finalize();

  // Agregador 90 Dias:
  const agg90 = new StreamingAnalyticsAggregator(90, now, 'America/Sao_Paulo');
  agg90.processChunk(eventsA.rows);
  const res90 = agg90.finalize();

  // Agregador 7 Dias:
  const agg7 = new StreamingAnalyticsAggregator(7, now, 'America/Sao_Paulo');
  agg7.processChunk(eventsA.rows);
  const res7 = agg7.finalize();

  console.log('--- RESULTADOS OBTIDOS POR SUPERFÍCIE ---');
  console.log(`[Superfície 1] /guia (card público acumulado):          ${guiaViewsA} visualizações`);
  console.log(`[Superfície 2] /guia/empresas (listagem acumulada):     ${empresasViewsA} visualizações`);
  console.log(`[Superfície 3] /guia/[slug] (perfil público acumulado): ${perfilViewsA} visualizações`);
  console.log(`[Superfície 4] /anunciante/resultados:`);
  console.log(`  - Janela 7 dias:  ${res7.kpis.views} views | ${res7.kpis.uniqueVisitors} visitantes únicos | ${res7.kpis.interactions} interações`);
  console.log(`  - Janela 30 dias: ${res30.kpis.views} views | ${res30.kpis.uniqueVisitors} visitantes únicos | ${res30.kpis.interactions} interações`);
  console.log(`  - Janela 90 dias: ${res90.kpis.views} views | ${res90.kpis.uniqueVisitors} visitantes únicos | ${res90.kpis.interactions} interações`);

  console.log('\n--- VERIFICAÇÃO DE PRECISÃO E CRITÉRIOS DE CONFRONTO ---');

  // Verificação 1: Coerência 100% entre os 3 contadores públicos acumulados
  const publicCountersMatch = (guiaViewsA === empresasViewsA && empresasViewsA === perfilViewsA);
  console.log(`1. Coerência entre /guia, /guia/empresas e /guia/[slug]: ${publicCountersMatch ? 'SIM (100% IDÊNTICOS: ' + perfilViewsA + ')' : 'NÃO'}`);

  // Verificação 2: Total acumulado público vs Painel no horizonte completo (90d cobre todo o dataset sintético de 50 dias)
  const fullHorizonMatch = (perfilViewsA === res90.kpis.views);
  console.log(`2. Total Acumulado Público (${perfilViewsA}) == Painel 90d (${res90.kpis.views}): ${fullHorizonMatch ? 'SIM (MATCH PERFEITO)' : 'NÃO'}`);

  // Verificação 3: Janela 30 dias (deve ter exatamente 14 views: 9 dos últimos 7d + 5 entre 8-25d, sem as 2 de 45/50d)
  const views30Expected = 14;
  const views30Match = (res30.kpis.views === views30Expected);
  console.log(`3. Total Janela 30d (${res30.kpis.views}) == Esperado (${views30Expected}): ${views30Match ? 'SIM' : 'NÃO'}`);

  // Verificação 4: Visitantes únicos nos 30 dias: v1, v2, v3, v4, v5 = exatamente 5
  const uniques30Expected = 5;
  const uniques30Match = (res30.kpis.uniqueVisitors === uniques30Expected);
  console.log(`4. Visitantes Únicos 30d (${res30.kpis.uniqueVisitors}) == Esperado (${uniques30Expected}): ${uniques30Match ? 'SIM' : 'NÃO'}`);

  // Verificação 5: Interações nos 30 dias: exatamente 13 (4 wpp + 2 tel + 3 rota + 1 site + 2 redes + 1 share)
  const interactionsExpected = 13;
  const interactionsMatch = (res30.kpis.interactions === interactionsExpected);
  console.log(`5. Total Interações 30d (${res30.kpis.interactions}) == Esperado (${interactionsExpected}): ${interactionsMatch ? 'SIM' : 'NÃO'}`);

  // Verificação 6: Deduplicação de cycle_id comprovada: a tentativa duplicada c_v3_1 gerou apenas 1 view
  const duplicateCycleQuery = await db.query(`
    SELECT count(*) AS total FROM public.analytics_events
    WHERE business_id = $1::uuid AND metadata->>'cycle_id' = 'c_v3_1'
  `, [bizA]);
  const cycleDeduplicated = (Number(duplicateCycleQuery.rows[0].total) === 1);
  console.log(`6. Deduplicação física de cycle_id 'c_v3_1' no banco: ${cycleDeduplicated ? 'SIM (EXATAMENTE 1 REGISTRO)' : 'NÃO'}`);

  if (publicCountersMatch && fullHorizonMatch && views30Match && uniques30Match && interactionsMatch && cycleDeduplicated) {
    console.log('\n>>> SUCESSO: Confronto de métricas 100% aprovado em todas as superfícies e critérios! <<<');
  } else {
    console.error('\n>>> FALHA no confronto de métricas <<<');
    process.exit(1);
  }
}

runMetricsPrecisionConfrontation().catch((err) => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});

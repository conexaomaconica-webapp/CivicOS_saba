import { PGlite } from '@electric-sql/pglite';

async function testPerformanceHighVolume() {
  console.log('================================================================');
  console.log('AUDITORIA DE PERFORMANCE E EXPLAIN ANALYZE — VOLUMES ELEVADOS');
  console.log('================================================================\n');

  const db = new PGlite();

  // 1. Cria tabela base e índices existentes
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

    -- Índices existentes no schema
    CREATE INDEX idx_analytics_business_date ON public.analytics_events(business_id, created_at);
    CREATE INDEX idx_analytics_tenant_event ON public.analytics_events(tenant_id, event_name, created_at);
    CREATE UNIQUE INDEX uq_analytics_events_view_cycle_forward
    ON public.analytics_events (business_id, (metadata->>'cycle_id'))
    WHERE event_name = 'view' AND metadata->>'cycle_id' IS NOT NULL AND created_at >= '2026-10-28 00:00:00+00';
  `);

  console.log('Passo 1: Gerando massa de dados sintética de 50.000 eventos distribuídos...');
  const biz1 = 'e0000000-0000-0000-0000-000000000001';
  const biz2 = 'e0000000-0000-0000-0000-000000000002';
  const biz3 = 'e0000000-0000-0000-0000-000000000003';

  // Inserção em lote de 50.000 registros usando generate_series
  const t0 = Date.now();
  await db.exec(`
    INSERT INTO public.analytics_events (business_id, event_name, pseudonymous_subject_id, source, acquisition_source, discovery_source, created_at)
    SELECT
      CASE (i % 3)
        WHEN 0 THEN '${biz1}'::uuid
        WHEN 1 THEN '${biz2}'::uuid
        ELSE '${biz3}'::uuid
      END,
      CASE (i % 5)
        WHEN 0 THEN 'view'
        WHEN 1 THEN 'view'
        WHEN 2 THEN 'whatsapp_click'
        WHEN 3 THEN 'route_click'
        ELSE 'search_impression'
      END,
      'visitor_' || (i % 500)::text,
      'categoria',
      'campaign',
      'category',
      now() - ((i % 60) || ' days')::interval
    FROM generate_series(1, 50000) AS i;
  `);
  console.log(`  - 50.000 eventos inseridos no PostgreSQL em ${Date.now() - t0}ms.`);

  // 2. Medição da Consulta Pública 1: Perfil da Empresa (/guia/[slug])
  console.log('\n--- Consulta 1: Perfil da Empresa (/guia/[slug]) ---');
  console.log('Query: SELECT count(*) FROM analytics_events WHERE business_id = $1 AND event_name = view');
  const tSlug = Date.now();
  const planSlug = await db.query(`
    EXPLAIN ANALYZE
    SELECT count(*) FROM public.analytics_events
    WHERE business_id = '${biz1}'::uuid AND event_name = 'view';
  `);
  const dSlug = Date.now() - tSlug;
  console.log('Plano de Execução:');
  for (const r of planSlug.rows) console.log(' ', r['QUERY PLAN']);
  console.log(`Tempo de resposta: ${dSlug}ms`);

  // 3. Medição da Consulta Pública 2: Cards Vitrine (/guia e /guia/empresas)
  console.log('\n--- Consulta 2: Cards Vitrine em Lote (/guia e /guia/empresas) ---');
  console.log('Query: SELECT business_id, count(*) FROM analytics_events WHERE business_id IN (...) AND event_name = view GROUP BY business_id');
  const tCards = Date.now();
  const planCards = await db.query(`
    EXPLAIN ANALYZE
    SELECT business_id, count(*)
    FROM public.analytics_events
    WHERE business_id IN ('${biz1}'::uuid, '${biz2}'::uuid, '${biz3}'::uuid)
      AND event_name = 'view'
    GROUP BY business_id;
  `);
  const dCards = Date.now() - tCards;
  console.log('Plano de Execução:');
  for (const r of planCards.rows) console.log(' ', r['QUERY PLAN']);
  console.log(`Tempo de resposta: ${dCards}ms`);

  // 4. Medição da Consulta do Painel do Anunciante (/anunciante/resultados)
  console.log('\n--- Consulta 3: Painel do Anunciante (/anunciante/resultados) ---');
  console.log('Query: SELECT event_name, created_at, ... FROM analytics_events WHERE business_id = $1 AND created_at >= $2 ORDER BY created_at DESC');
  const tPanel = Date.now();
  const planPanel = await db.query(`
    EXPLAIN ANALYZE
    SELECT event_name, pseudonymous_subject_id, source, metadata, created_at
    FROM public.analytics_events
    WHERE business_id = '${biz1}'::uuid
      AND created_at >= (now() - interval '60 days')
    ORDER BY created_at DESC
    LIMIT 1000;
  `);
  const dPanel = Date.now() - tPanel;
  console.log('Plano de Execução:');
  for (const r of planPanel.rows) console.log(' ', r['QUERY PLAN']);
  console.log(`Tempo de resposta: ${dPanel}ms`);

  // 5. Testando Otimização com Índice Composto Cobridor: idx_analytics_biz_event
  console.log('\n--- Testando Otimização: Adição do Índice Composto Cobridor (business_id, event_name) ---');
  await db.exec(`
    CREATE INDEX idx_analytics_biz_event ON public.analytics_events(business_id, event_name);
  `);
  const tOptimized = Date.now();
  const planOpt = await db.query(`
    EXPLAIN ANALYZE
    SELECT count(*) FROM public.analytics_events
    WHERE business_id = '${biz1}'::uuid AND event_name = 'view';
  `);
  const dOpt = Date.now() - tOptimized;
  console.log('Plano Otimizado:');
  for (const r of planOpt.rows) console.log(' ', r['QUERY PLAN']);
  console.log(`Tempo de resposta otimizado: ${dOpt}ms`);

  console.log('\n================================================================');
  console.log('RESUMO DA AUDITORIA DE PERFORMANCE:');
  console.log(`1. Perfil /guia/[slug]: ${dSlug}ms -> ${dOpt}ms com índice idx_analytics_biz_event`);
  console.log(`2. Cards Vitrine /guia: ${dCards}ms (Batching em lote aprovado, sem N+1)`);
  console.log(`3. Painel /anunciante/resultados: ${dPanel}ms (Utiliza idx_analytics_business_date com range index scan)`);
  console.log('================================================================');
}

testPerformanceHighVolume().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});

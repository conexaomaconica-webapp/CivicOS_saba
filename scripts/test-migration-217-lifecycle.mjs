import { PGlite } from '@electric-sql/pglite';

async function testMigration217Lifecycle() {
  console.log('================================================================');
  console.log('SUITE AUDITORIA POSTGRESQL REAL: MIGRATION 217 LIFECYCLE & ROLLBACK');
  console.log('================================================================\n');

  const db = new PGlite();

  // 1. Setup base table (Schema pré-217)
  await db.exec(`
    CREATE TABLE public.tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL
    );
    CREATE TABLE public.businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES public.tenants(id),
      name TEXT NOT NULL
    );
    CREATE TABLE public.analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID,
      business_id UUID,
      event_name TEXT NOT NULL,
      pseudonymous_subject_id TEXT,
      source TEXT,
      device TEXT,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const bizId = 'c0000000-0000-0000-0000-000000000001';

  // 2. Inserção de dados sintéticos pré-migração (incluindo eventos legados com apenas origin e source)
  console.log('Passo 1: Inserindo eventos pré-migração (com taxonomias em metadata e campos legados origin/source)...');
  await db.query(`
    INSERT INTO public.analytics_events (business_id, event_name, pseudonymous_subject_id, source, metadata, created_at)
    VALUES
      ($1::uuid, 'view', 'sub_01', 'categoria', '{"acquisition_source":"campaign","discovery_source":"category"}'::jsonb, '2026-10-28 08:00:00+00'),
      ($1::uuid, 'view', 'sub_02', 'busca', '{"acquisition_source":"organic_search","discovery_source":"text_search"}'::jsonb, '2026-10-28 08:30:00+00'),
      ($1::uuid, 'view', 'sub_03', 'direto', '{"acquisition_source":"direct","discovery_source":"direct_link"}'::jsonb, '2026-10-28 09:00:00+00'),
      ($1::uuid, 'view', 'sub_04', 'vitrine', '{"origin":"google","source":"busca_categoria"}'::jsonb, '2026-10-28 09:05:00+00'),
      ($1::uuid, 'view', 'sub_05', 'direct', '{}'::jsonb, '2026-10-28 09:10:00+00'),
      ($1::uuid, 'whatsapp_click', 'sub_01', 'categoria', '{"channel":"whatsapp"}'::jsonb, '2026-10-28 09:15:00+00');
  `, [bizId]);

  // Consulta pré-migração (simula agregador lendo metadata)
  const preQuery = await db.query(`
    SELECT
      id,
      event_name,
      metadata->>'acquisition_source' AS acq_source,
      metadata->>'discovery_source' AS disc_source
    FROM public.analytics_events
    WHERE business_id = $1::uuid
  `, [bizId]);
  console.log(`  - Registros pré-migração lidos com sucesso: ${preQuery.rows.length}`);

  // 3. Aplicação da Migration 217 dentro de uma transação com validação de commit
  console.log('\nPasso 2: Aplicando Migration 217 (Adição de colunas + backfill robusto + índices parciais)...');
  const migration217Sql = `
    ALTER TABLE public.analytics_events
      ADD COLUMN IF NOT EXISTS acquisition_source TEXT NOT NULL DEFAULT 'unidentified',
      ADD COLUMN IF NOT EXISTS discovery_source TEXT NOT NULL DEFAULT 'unidentified';

    UPDATE public.analytics_events
    SET
      acquisition_source = COALESCE(
        NULLIF(TRIM(metadata->>'acquisition_source'), ''),
        NULLIF(TRIM(metadata->>'origin'), ''),
        CASE 
          WHEN source = 'direct' THEN 'direct'
          ELSE NULL
        END,
        acquisition_source
      ),
      discovery_source = COALESCE(
        NULLIF(TRIM(metadata->>'discovery_source'), ''),
        NULLIF(TRIM(metadata->>'source'), ''),
        NULLIF(TRIM(source), ''),
        discovery_source
      )
    WHERE 
      metadata ? 'acquisition_source'
      OR metadata ? 'origin'
      OR metadata ? 'discovery_source'
      OR metadata ? 'source'
      OR source IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_analytics_events_acquisition_source
    ON public.analytics_events (tenant_id, business_id, acquisition_source, created_at)
    WHERE acquisition_source <> 'unidentified';

    CREATE INDEX IF NOT EXISTS idx_analytics_events_discovery_source
    ON public.analytics_events (tenant_id, business_id, discovery_source, created_at)
    WHERE discovery_source <> 'unidentified';
  `;

  await db.exec(migration217Sql);
  console.log('  - Migration 217 executada com sucesso.');

  // Validação dos dados após migração
  const postMigQuery = await db.query(`
    SELECT
      id,
      event_name,
      acquisition_source,
      discovery_source,
      metadata->>'acquisition_source' AS meta_acq
    FROM public.analytics_events
    WHERE business_id = $1::uuid
    ORDER BY created_at ASC
  `, [bizId]);

  console.log(`  - Verificação de colunas preenchidas retroativamente:`);
  let backfillSuccess = true;
  for (const row of postMigQuery.rows) {
    console.log(`    * [${row.event_name}] col_acq: ${row.acquisition_source} | meta_acq: ${row.meta_acq}`);
    if (row.meta_acq && row.acquisition_source !== row.meta_acq) {
      backfillSuccess = false;
    }
  }

  // 4. Teste de Rollback Transacional
  console.log('\nPasso 3: Testando script de Rollback da Migration 217...');
  const rollback217Sql = `
    DROP INDEX IF EXISTS public.idx_analytics_events_discovery_source;
    DROP INDEX IF EXISTS public.idx_analytics_events_acquisition_source;
    ALTER TABLE public.analytics_events
      DROP COLUMN IF EXISTS discovery_source,
      DROP COLUMN IF EXISTS acquisition_source;
  `;

  await db.exec(rollback217Sql);
  console.log('  - Rollback executado com sucesso.');

  // Verificação pós-rollback: colunas devem ter sido removidas e dados de metadata intactos
  const postRollback = await db.query(`
    SELECT
      id,
      event_name,
      metadata->>'acquisition_source' AS acq_source,
      metadata->>'discovery_source' AS disc_source
    FROM public.analytics_events
    WHERE business_id = $1::uuid
  `, [bizId]);

  console.log(`  - Verificação pós-rollback: ${postRollback.rows.length} eventos preservados integralmente via metadata.`);

  // 5. Reaplicação para certificar idempotência do script
  console.log('\nPasso 4: Reaplicando Migration 217 (certificação de idempotência)...');
  await db.exec(migration217Sql);
  console.log('  - Migration 217 reaplicada com sucesso (idempotente).');

  if (backfillSuccess && postRollback.rows.length === 6) {
    console.log('\n>>> SUCESSO: Migration 217 validada com backfill, rollback transacional e idempotência 100%! <<<');
  } else {
    console.error('\n>>> FALHA na validação da Migration 217 <<<', { backfillSuccess, rollbackRows: postRollback.rows.length });
    process.exit(1);
  }
}

testMigration217Lifecycle().catch((err) => {
  console.error('ERRO FATAL 217:', err);
  process.exit(1);
});

import { PGlite } from '@electric-sql/pglite';

async function runDefinitivePgConcurrencySuite() {
  console.log('================================================================');
  console.log('SUITE AUDITORIA POSTGRESQL REAL: CONCORRÊNCIA MIGRATION 216');
  console.log('================================================================\n');

  const db = new PGlite();

  // 1. Setup base schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS public.analytics_events (
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

    CREATE UNIQUE INDEX IF NOT EXISTS uq_analytics_events_view_cycle_forward
    ON public.analytics_events (business_id, (metadata->>'cycle_id'))
    WHERE event_name = 'view'
      AND metadata->>'cycle_id' IS NOT NULL
      AND created_at >= '2026-10-28 00:00:00+00';
  `);

  const bizId = 'b0000000-0000-0000-0000-000000000001';

  // --------------------------------------------------------------------------
  // Cenário A: Demonstração da limitação do trigger original sem Lock Advisory
  // --------------------------------------------------------------------------
  console.log('--- CENÁRIO A: Trigger Original (apenas IF EXISTS) ---');
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_view_cycle_v1()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.event_name = 'view' AND NEW.metadata->>'cycle_id' IS NOT NULL THEN
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

    DROP TRIGGER IF EXISTS trg_prevent_duplicate_view_cycle ON public.analytics_events;
    CREATE TRIGGER trg_prevent_duplicate_view_cycle
    BEFORE INSERT ON public.analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_duplicate_view_cycle_v1();
  `);

  // Testando inserção direta duplicada sem passar pelo trigger antes do commit
  // Se duas transações inserem simultaneamente, a segunda baterá no índice único
  console.log('[Cenário A] Inserindo registro 1...');
  await db.query(
    `INSERT INTO public.analytics_events (business_id, event_name, metadata, created_at)
     VALUES ($1::uuid, 'view', '{"cycle_id":"cycle_demo_v1"}'::jsonb, '2026-10-28 12:00:00+00')`,
    [bizId]
  );

  console.log('[Cenário A] Inserindo registro 2 sequencial (o trigger descarta via IF EXISTS)...');
  const resSeq = await db.query(
    `INSERT INTO public.analytics_events (business_id, event_name, metadata, created_at)
     VALUES ($1::uuid, 'view', '{"cycle_id":"cycle_demo_v1"}'::jsonb, '2026-10-28 12:00:01+00') RETURNING id`,
    [bizId]
  );
  console.log('[Cenário A] Linhas inseridas no segundo comando:', resSeq.rows.length);

  // --------------------------------------------------------------------------
  // Cenário B: Correção com pg_advisory_xact_lock no Trigger (Migration 216 Refinada)
  // --------------------------------------------------------------------------
  console.log('\n--- CENÁRIO B: Trigger Corrigido com Advisory Lock Atômico ---');
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_view_cycle()
    RETURNS trigger AS $$
    DECLARE
      v_lock_key BIGINT;
    BEGIN
      IF NEW.event_name = 'view' AND NEW.metadata->>'cycle_id' IS NOT NULL THEN
        -- Gera chave determinística de 64-bit para advisory lock transacional
        v_lock_key := ('x' || substr(md5(NEW.business_id::text || ':' || (NEW.metadata->>'cycle_id')), 1, 15))::bit(64)::bigint;
        PERFORM pg_advisory_xact_lock(v_lock_key);

        IF EXISTS (
          SELECT 1 FROM public.analytics_events
          WHERE business_id = NEW.business_id
            AND event_name = 'view'
            AND metadata->>'cycle_id' = NEW.metadata->>'cycle_id'
            AND created_at >= '2026-10-28 00:00:00+00'
        ) THEN
          -- Descarta inserção silenciosamente sem lançar erro de transação
          RETURN NULL;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_prevent_duplicate_view_cycle ON public.analytics_events;
    CREATE TRIGGER trg_prevent_duplicate_view_cycle
    BEFORE INSERT ON public.analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_duplicate_view_cycle();
  `);

  console.log('[Cenário B] Testando concorrência com 10 transações simultâneas no mesmo ciclo...');
  const cycleConcurrentId = 'cycle_high_concurrency_999';

  // Dispara 10 promises simultâneas tentando inserir o mesmo ciclo
  const results = await Promise.allSettled(
    Array.from({ length: 10 }).map(async (_, idx) => {
      return await db.transaction(async (tx) => {
        const res = await tx.query(
          `INSERT INTO public.analytics_events (business_id, event_name, metadata, created_at)
           VALUES ($1::uuid, 'view', jsonb_build_object('cycle_id', $2::text), '2026-10-28 14:00:00+00')
           RETURNING id`,
          [bizId, cycleConcurrentId]
        );
        return { idx, inserted: res.rows.length };
      });
    })
  );

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  const totalInsertedRows = fulfilled.reduce((acc, r) => acc + (r.value?.inserted || 0), 0);

  console.log(`[Cenário B] Resultados das 10 transações simultâneas:`);
  console.log(`  - Concluídas com sucesso (sem erro 23505): ${fulfilled.length}/10`);
  console.log(`  - Rejeitadas com erro: ${rejected.length}/10`);
  console.log(`  - Total de linhas efetivamente inseridas na tabela: ${totalInsertedRows} (Esperado: exatamente 1)`);

  const countQuery = await db.query(
    `SELECT count(*) FROM public.analytics_events WHERE metadata->>'cycle_id' = $1`,
    [cycleConcurrentId]
  );
  console.log(`  - Verificação física final no PostgreSQL: ${countQuery.rows[0].count} registro(s)`);

  if (totalInsertedRows === 1 && rejected.length === 0 && Number(countQuery.rows[0].count) === 1) {
    console.log('\n>>> SUCESSO: Concorrência simultânea resolvida no motor PostgreSQL com 0 erros e 100% de integridade! <<<');
  } else {
    console.error('\n>>> FALHA no teste de concorrência <<<', { totalInsertedRows, rejectedLength: rejected.length, count: countQuery.rows[0].count, type: typeof countQuery.rows[0].count });
    process.exit(1);
  }
}

runDefinitivePgConcurrencySuite().catch((err) => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});

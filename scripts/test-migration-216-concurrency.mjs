import { PGlite } from '@electric-sql/pglite';

async function testConcurrency() {
  const db = new PGlite();

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

    CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_view_cycle()
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
    EXECUTE FUNCTION public.fn_prevent_duplicate_view_cycle();
  `);

  const bizId = 'a0000000-0000-0000-0000-000000000001';
  const cycleId = 'cycle_concurrent_test_1';

  console.log('Teste 1: Inserções sequenciais...');
  const res1 = await db.query(
    `INSERT INTO public.analytics_events (business_id, event_name, metadata, created_at)
     VALUES ($1::uuid, 'view', jsonb_build_object('cycle_id', $2::text), '2026-10-28 10:00:00+00') RETURNING id`,
    [bizId, cycleId]
  );
  console.log('Insert 1 retornou:', res1.rows.length, 'linhas');

  const res2 = await db.query(
    `INSERT INTO public.analytics_events (business_id, event_name, metadata, created_at)
     VALUES ($1::uuid, 'view', jsonb_build_object('cycle_id', $2::text), '2026-10-28 10:00:01+00') RETURNING id`,
    [bizId, cycleId]
  );
  console.log('Insert 2 (sequencial) retornou:', res2.rows.length, 'linhas (descartado pelo trigger)');
  
  const count = await db.query('SELECT count(*) FROM public.analytics_events');
  console.log('Total de linhas após sequencial:', count.rows[0].count);
}

testConcurrency().catch(console.error);

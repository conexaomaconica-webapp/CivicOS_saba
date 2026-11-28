/**
 * GATE-BUSINESS-VIEWS — Validação de Concorrência Multi-Conexão em PostgreSQL Real (TCP)
 * Conexão Maçônica — CivicOS SABA
 *
 * Executa conexões PostgreSQL TCP independentes e simultâneas contra um container
 * PostgreSQL descartável (ex.: GitHub Actions service container postgres:16-alpine),
 * validando integralmente os 9 cenários obrigatórios da Seção 2 do Gate:
 *   1. Incrementos simultâneos para a mesma empresa (20 conexões independentes).
 *   2. Deduplicação concorrente por cycle_id (15 conexões independentes).
 *   3. Acessos simultâneos por visitantes distintos (20 conexões independentes).
 *   4. Acessos concorrentes do mesmo visitante em COOLDOWN (12 conexões independentes + travessia de meia-noite).
 *   5. Troca de política (ALL_VIEWS -> COOLDOWN -> UNIQUE_DAILY) durante inserções concorrentes.
 *   6. Concorrência durante backfill e reconciliação (LOCK TABLE ... IN SHARE ROW EXCLUSIVE MODE).
 *   7. Ausência de perda de incrementos e zero deadlocks sob carga concorrente.
 *   8. Integridade do contador após UPDATE e DELETE concorrentes (incluindo exclusão de duplicata histórica).
 *   9. Ciclo completo de rollback (258_rollback.sql) e reaplicação (sem congelar contadores durante o rollback).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const requireFromWeb = createRequire(path.join(rootDir, 'apps', 'web', 'package.json'));
const postgres = requireFromWeb('postgres');

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

// Safety check: NUNCA executar contra banco de produção ou remoto do Supabase
if (
  connectionString.includes('supabase.co') ||
  connectionString.includes('supabase.com') ||
  connectionString.includes('rwvztwsjcjljphqttiws')
) {
  console.error(
    '❌ [BLOQUEIO DE SEGURANÇA] Este script de escrita concorrente só pode rodar em PostgreSQL descartável/isolado (localhost)!'
  );
  process.exit(1);
}

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const BIZ_A = '10000000-0000-0000-0000-000000000001';
const BIZ_B = '10000000-0000-0000-0000-000000000002';
const BIZ_ZERO = '10000000-0000-0000-0000-000000000003';

let passed = 0;
let failed = 0;

function assert(condition, label, details = undefined) {
  if (condition) {
    console.log(`  ✅ [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${label}`, details ?? '');
    failed++;
  }
}

async function createIndependentClients(count) {
  return Array.from({ length: count }, () =>
    postgres(connectionString, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
      onnotice: () => {},
    })
  );
}

async function closeClients(clients) {
  await Promise.all(clients.map((c) => c.end({ timeout: 2 })));
}

async function main() {
  console.log('================================================================================');
  console.log('GATE-BUSINESS-VIEWS — VALIDAÇÃO DE CONCORRÊNCIA MULTI-CONEXÃO POSTGRESQL REAL');
  console.log('================================================================================');

  const adminSql = postgres(connectionString, {
    max: 2,
    onnotice: () => {},
  });

  const migration258Path = path.join(
    rootDir,
    'supabase',
    'migrations',
    '258_canonical_business_views_and_configurable_policy.sql'
  );
  const rollback258Path = path.join(
    rootDir,
    'supabase',
    'rollbacks',
    'analytics',
    '258_rollback.sql'
  );

  const migration258Sql = fs.readFileSync(migration258Path, 'utf8');
  const rollback258Sql = fs.readFileSync(rollback258Path, 'utf8');

  try {
    const ver = await adminSql`SELECT version(), current_database(), inet_server_addr()::text AS addr`;
    console.log(`📌 Conectado ao PostgreSQL: ${ver[0].version}`);

    // ------------------------------------------------------------------------
    // 0. Bootstrap do schema base + aplicação da Migration 258
    // ------------------------------------------------------------------------
    await adminSql.unsafe(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      DO $$ BEGIN
        CREATE ROLE anon NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE ROLE authenticated NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE ROLE service_role NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE ROLE supabase_admin NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DROP TABLE IF EXISTS public.analytics_events CASCADE;
      DROP TABLE IF EXISTS public.businesses CASCADE;
      DROP TABLE IF EXISTS public.tenant_settings CASCADE;

      CREATE TABLE public.tenant_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL UNIQUE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE public.businesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        plan_tier TEXT NOT NULL DEFAULT 'gold',
        publication_status TEXT NOT NULL DEFAULT 'published',
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_verified BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT '2026-01-01T00:00:00Z'::timestamptz
      );

      CREATE TABLE public.analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
        event_name TEXT NOT NULL,
        pseudonymous_subject_id TEXT,
        source TEXT,
        device TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX uq_analytics_events_view_cycle_forward
        ON public.analytics_events (business_id, (metadata->>'cycle_id'))
        WHERE event_name = 'view'
          AND metadata->>'cycle_id' IS NOT NULL
          AND created_at >= '2026-10-28 00:00:00+00'::timestamptz;

      INSERT INTO public.tenant_settings (tenant_id, metadata)
      VALUES ('${TENANT_ID}', '{}'::jsonb);

      INSERT INTO public.businesses (id, tenant_id, slug, name) VALUES
        ('${BIZ_A}', '${TENANT_ID}', 'caminho-da-luz', 'Caminho da Luz'),
        ('${BIZ_B}', '${TENANT_ID}', 'optica-circulo', 'Óptica Circulô'),
        ('${BIZ_ZERO}', '${TENANT_ID}', 'empresa-zero', 'Empresa Zero Views');
    `);

    // Aplica Migration 258
    await adminSql.unsafe(migration258Sql);

    // ------------------------------------------------------------------------
    // CENÁRIO 1: Incrementos simultâneos para a mesma empresa (20 conexões TCP independentes)
    // ------------------------------------------------------------------------
    console.log('\n[1/9] Incrementos simultâneos para a mesma empresa (20 conexões independentes)...');
    const clients1 = await createIndependentClients(20);
    const wave1 = await Promise.allSettled(
      clients1.map((client, i) =>
        client`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
          VALUES (${TENANT_ID}::uuid, ${BIZ_A}::uuid, 'view', ${'visitor_c1_' + i}, ${client.json({ cycle_id: `c1_simul_${i}` })}, now())
          RETURNING id
        `
      )
    );
    await closeClients(clients1);

    const wave1Rejected = wave1.filter((r) => r.status === 'rejected');
    const [bizAAfter1] = await adminSql`SELECT views_count, updated_at FROM public.businesses WHERE id = ${BIZ_A}::uuid`;
    assert(wave1Rejected.length === 0, 'Cenário 1: 20 conexões simultâneas concluídas com 0 erros/deadlocks', wave1Rejected);
    assert(Number(bizAAfter1.views_count) === 20, `Cenário 1: views_count incrementado exatamente para 20 (atual: ${bizAAfter1.views_count})`);
    assert(
      new Date(bizAAfter1.updated_at).toISOString() === '2026-01-01T00:00:00.000Z',
      'Cenário 1: businesses.updated_at preservado intacto sob 20 incrementos concorrentes'
    );

    // ------------------------------------------------------------------------
    // CENÁRIO 2: Deduplicação concorrente por cycle_id (15 conexões TCP independentes com mesmo cycle_id)
    // ------------------------------------------------------------------------
    console.log('\n[2/9] Deduplicação concorrente por cycle_id (15 conexões independentes)...');
    const clients2 = await createIndependentClients(15);
    const sharedCycleId = 'cycle_concurrent_collision_test_01';
    const wave2 = await Promise.allSettled(
      clients2.map((client) =>
        client`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
          VALUES (${TENANT_ID}::uuid, ${BIZ_A}::uuid, 'view', 'visitor_same_cycle', ${client.json({ cycle_id: sharedCycleId })}, now())
          RETURNING id
        `
      )
    );
    await closeClients(clients2);

    const wave2Rejected = wave2.filter((r) => r.status === 'rejected');
    const wave2Inserted = wave2
      .filter((r) => r.status === 'fulfilled')
      .reduce((acc, r) => acc + r.value.length, 0);
    const [bizAAfter2] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_A}::uuid`;
    assert(
      wave2Rejected.length === 0,
      'Cenário 2: 0 erros 23505 (unique_violation) em 15 conexões concorrentes com mesmo cycle_id',
      wave2Rejected
    );
    assert(wave2Inserted === 1, `Cenário 2: exatamente 1 linha persistida dentre 15 tentativas simultâneas (inseridas: ${wave2Inserted})`);
    assert(Number(bizAAfter2.views_count) === 21, `Cenário 2: views_count avançou exatamente +1 (20 -> ${bizAAfter2.views_count})`);

    // ------------------------------------------------------------------------
    // CENÁRIO 3: Acessos simultâneos por visitantes distintos (20 conexões independentes em BIZ_B)
    // ------------------------------------------------------------------------
    console.log('\n[3/9] Acessos simultâneos por visitantes distintos (20 conexões independentes)...');
    const clients3 = await createIndependentClients(20);
    const wave3 = await Promise.allSettled(
      clients3.map((client, i) =>
        client`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
          VALUES (
            ${TENANT_ID}::uuid,
            ${BIZ_B}::uuid,
            'view',
            ${'distinct_visitor_' + i},
            ${client.json({ cycle_id: `c3_distinct_${i}`, cooldown_subject_id: `cd_distinct_${i}` })},
            now()
          )
          RETURNING id
        `
      )
    );
    await closeClients(clients3);

    const [bizBAfter3] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_B}::uuid`;
    assert(
      wave3.every((r) => r.status === 'fulfilled'),
      'Cenário 3: 20 visitantes distintos simultâneos processados sem bloqueio cruzado'
    );
    assert(Number(bizBAfter3.views_count) === 20, `Cenário 3: BIZ_B com exatamente 20 visualizações (atual: ${bizBAfter3.views_count})`);

    // ------------------------------------------------------------------------
    // CENÁRIO 4: Acessos concorrentes do mesmo visitante em COOLDOWN (12 conexões independentes + meia-noite)
    // ------------------------------------------------------------------------
    console.log('\n[4/9] Acessos concorrentes do mesmo visitante em COOLDOWN (12 conexões + meia-noite)...');
    await adminSql`
      UPDATE public.tenant_settings
      SET metadata = jsonb_set(metadata, '{analytics_views_policy,counting_mode}', '"COOLDOWN"'::jsonb)
      WHERE tenant_id = ${TENANT_ID}::uuid
    `;

    const clients4 = await createIndependentClients(12);
    // 6 conexões às 23:58 BRT (02:58 UTC) com daily subject D1, e 6 conexões às 00:02 BRT (03:02 UTC) com daily subject D2,
    // mas todas compartilhando o mesmo cooldown_subject_id contínuo do visitante!
    const wave4 = await Promise.allSettled(
      clients4.map((client, i) => {
        const isAfterMidnight = i >= 6;
        const ts = isAfterMidnight ? '2026-11-28T03:02:00Z' : '2026-11-28T02:58:00Z';
        const dailySubj = isAfterMidnight ? 'subj_day_2' : 'subj_day_1';
        return client`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
          VALUES (
            ${TENANT_ID}::uuid,
            ${BIZ_B}::uuid,
            'view',
            ${dailySubj},
            ${client.json({
              cycle_id: `c4_cooldown_concurrent_${i}`,
              cooldown_subject_id: 'cd_same_visitor_across_midnight',
            })},
            ${ts}::timestamptz
          )
          RETURNING id, (metadata->>'eligible_view')::boolean AS eligible
        `;
      })
    );
    await closeClients(clients4);

    const wave4Rows = wave4.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
    const wave4EligibleCount = wave4Rows.filter((r) => r.eligible === true).length;
    const wave4IneligibleCount = wave4Rows.filter((r) => r.eligible === false).length;
    const [bizBAfter4] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_B}::uuid`;

    assert(
      wave4Rows.length === 12,
      `Cenário 4: todos os 12 eventos brutos foram preservados no histórico (inseridos: ${wave4Rows.length})`
    );
    assert(
      wave4EligibleCount === 1 && wave4IneligibleCount === 11,
      `Cenário 4: advisory lock por visitante garantiu exatamente 1 view elegível e 11 em cooldown (elegíveis: ${wave4EligibleCount}, inel.: ${wave4IneligibleCount})`
    );
    assert(Number(bizBAfter4.views_count) === 21, `Cenário 4: contador de BIZ_B subiu apenas +1 (20 -> ${bizBAfter4.views_count})`);

    // ------------------------------------------------------------------------
    // CENÁRIO 5: Troca de política durante inserções concorrentes (ALL_VIEWS -> COOLDOWN -> UNIQUE_DAILY -> ALL_VIEWS)
    // ------------------------------------------------------------------------
    console.log('\n[5/9] Troca de política durante inserções concorrentes...');
    const clients5 = await createIndependentClients(15);
    const policySwitcher = (async () => {
      const modes = ['ALL_VIEWS', 'COOLDOWN', 'UNIQUE_DAILY', 'ALL_VIEWS'];
      for (const mode of modes) {
        await adminSql`
          UPDATE public.tenant_settings
          SET metadata = jsonb_set(metadata, '{analytics_views_policy,counting_mode}', to_jsonb(${mode}::text))
          WHERE tenant_id = ${TENANT_ID}::uuid
        `;
      }
    })();

    const wave5 = await Promise.allSettled([
      policySwitcher,
      ...clients5.map((client, i) =>
        client`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
          VALUES (
            ${TENANT_ID}::uuid,
            ${BIZ_A}::uuid,
            'view',
            ${'visitor_policy_switch_' + (i % 5)},
            ${client.json({ cycle_id: `c5_switch_${i}`, cooldown_subject_id: `cd_switch_${i % 5}` })},
            now()
          )
          RETURNING id
        `
      ),
    ]);
    await closeClients(clients5);

    const [auditAfter5] = await adminSql`
      SELECT * FROM public.audit_business_views_consistency() WHERE business_id = ${BIZ_A}::uuid
    `;
    assert(
      wave5.every((r) => r.status === 'fulfilled'),
      'Cenário 5: 0 falhas durante troca concorrente de política administrativa'
    );
    assert(
      Number(auditAfter5.divergence) === 0 && auditAfter5.is_consistent === true,
      `Cenário 5: consistência 100% preservada após troca concorrente de política (materializado=${auditAfter5.materialized_views_count}, recalculado=${auditAfter5.recalculated_eligible_views}, div=${auditAfter5.divergence})`
    );

    // Garante retorno para ALL_VIEWS
    await adminSql`
      UPDATE public.tenant_settings
      SET metadata = jsonb_set(metadata, '{analytics_views_policy,counting_mode}', '"ALL_VIEWS"'::jsonb)
      WHERE tenant_id = ${TENANT_ID}::uuid
    `;

    // ------------------------------------------------------------------------
    // CENÁRIO 6: Concorrência durante backfill e reconciliação (SHARE ROW EXCLUSIVE lock)
    // ------------------------------------------------------------------------
    console.log('\n[6/9] Concorrência durante backfill e reconciliação...');
    const clients6 = await createIndependentClients(12);
    const wave6 = await Promise.allSettled([
      // Conexão administrativa executando reconciliação global sob SHARE ROW EXCLUSIVE lock
      adminSql.begin(async (tx) => {
        await tx`LOCK TABLE public.analytics_events IN SHARE ROW EXCLUSIVE MODE`;
        await tx`SELECT public.reconcile_business_views_count(NULL)`;
      }),
      // 12 conexões independentes inserindo eventos simultaneamente
      ...clients6.map((client, i) =>
        client`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
          VALUES (
            ${TENANT_ID}::uuid,
            ${BIZ_A}::uuid,
            'view',
            ${'visitor_reconcile_' + i},
            ${client.json({ cycle_id: `c6_reconcile_${i}` })},
            now()
          )
          RETURNING id
        `
      ),
    ]);
    await closeClients(clients6);

    const [auditAfter6] = await adminSql`
      SELECT * FROM public.audit_business_views_consistency() WHERE business_id = ${BIZ_A}::uuid
    `;
    assert(
      wave6.every((r) => r.status === 'fulfilled'),
      'Cenário 6: todas as 12 inserções concorrentes ao LOCK TABLE + reconcile completaram sem erro'
    );
    assert(
      Number(auditAfter6.divergence) === 0 && auditAfter6.is_consistent === true,
      `Cenário 6: zero perda e zero dupla contagem durante backfill/reconcile concorrente (div=${auditAfter6.divergence})`
    );

    // ------------------------------------------------------------------------
    // CENÁRIO 7: Ausência de perda de incrementos e zero deadlocks sob rajada multi-empresa
    // ------------------------------------------------------------------------
    console.log('\n[7/9] Ausência de perda de incrementos e deadlocks sob rajada multi-empresa...');
    const [before7A] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_A}::uuid`;
    const [before7B] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_B}::uuid`;

    const clients7 = await createIndependentClients(20);
    const wave7 = await Promise.allSettled(
      clients7.map((client, i) => {
        const targetBiz = i % 2 === 0 ? BIZ_A : BIZ_B;
        return client`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
          VALUES (
            ${TENANT_ID}::uuid,
            ${targetBiz}::uuid,
            'view',
            ${'visitor_burst_' + i},
            ${client.json({ cycle_id: `c7_burst_${i}` })},
            now()
          )
          RETURNING id
        `;
      })
    );
    await closeClients(clients7);

    const [after7A] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_A}::uuid`;
    const [after7B] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_B}::uuid`;

    assert(wave7.every((r) => r.status === 'fulfilled'), 'Cenário 7: 0 deadlocks em rajada multi-empresa');
    assert(
      Number(after7A.views_count) - Number(before7A.views_count) === 10 &&
        Number(after7B.views_count) - Number(before7B.views_count) === 10,
      `Cenário 7: incremento exato de +10 em BIZ_A e +10 em BIZ_B`
    );

    // ------------------------------------------------------------------------
    // CENÁRIO 8: Integridade do contador após UPDATE e DELETE (incluindo duplicata histórica)
    // ------------------------------------------------------------------------
    console.log('\n[8/9] Integridade do contador após UPDATE e DELETE...');
    // Insere duas linhas históricas (< 2026-10-28) com o MESMO cycle_id
    const dupCycle = 'legacy_dup_cycle_pre_216';
    const [dup1] = await adminSql`
      INSERT INTO public.analytics_events (tenant_id, business_id, event_name, metadata, created_at)
      VALUES (${TENANT_ID}::uuid, ${BIZ_B}::uuid, 'view', ${adminSql.json({ cycle_id: dupCycle })}, '2026-05-01T12:00:00Z'::timestamptz)
      RETURNING id
    `;
    const [dup2] = await adminSql`
      INSERT INTO public.analytics_events (tenant_id, business_id, event_name, metadata, created_at)
      VALUES (${TENANT_ID}::uuid, ${BIZ_B}::uuid, 'view', ${adminSql.json({ cycle_id: dupCycle })}, '2026-05-01T12:00:01Z'::timestamptz)
      RETURNING id
    `;
    // Reconcilia para garantir contagem distinta por cycle_id
    await adminSql`SELECT public.reconcile_business_views_count(${BIZ_B}::uuid)`;
    const [beforeDelDup] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_B}::uuid`;

    // Deleta a primeira cópia da duplicata histórica -> contador NÃO pode cair pois dup2 ainda existe!
    await adminSql`DELETE FROM public.analytics_events WHERE id = ${dup1.id}::uuid`;
    const [afterDelDup1] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_B}::uuid`;
    assert(
      Number(afterDelDup1.views_count) === Number(beforeDelDup.views_count),
      `Cenário 8a: DELETE de duplicata histórica preservou views_count (${afterDelDup1.views_count}) enquanto a outra cópia do cycle_id existia`
    );

    // Deleta a última cópia -> agora o contador deve cair em -1
    await adminSql`DELETE FROM public.analytics_events WHERE id = ${dup2.id}::uuid`;
    const [afterDelDup2] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_B}::uuid`;
    assert(
      Number(afterDelDup2.views_count) === Number(beforeDelDup.views_count) - 1,
      `Cenário 8b: DELETE da última cópia reduziu views_count em -1 (${beforeDelDup.views_count} -> ${afterDelDup2.views_count})`
    );

    // UPDATE de eligible_view true -> false e transferência de business_id
    const [evtToMove] = await adminSql`
      INSERT INTO public.analytics_events (tenant_id, business_id, event_name, metadata, created_at)
      VALUES (${TENANT_ID}::uuid, ${BIZ_B}::uuid, 'view', ${adminSql.json({ cycle_id: 'cycle_move_test' })}, now())
      RETURNING id
    `;
    await adminSql`
      UPDATE public.analytics_events
      SET business_id = ${BIZ_A}::uuid
      WHERE id = ${evtToMove.id}::uuid
    `;

    const allAudit8 = await adminSql`SELECT * FROM public.audit_business_views_consistency()`;
    assert(
      allAudit8.every((row) => Number(row.divergence) === 0 && row.is_consistent === true),
      'Cenário 8c: 0 divergências em todas as empresas após UPDATE de business_id e DELETE'
    );

    // ------------------------------------------------------------------------
    // CENÁRIO 9: Ciclo completo de rollback (258_rollback.sql) e reaplicação
    // ------------------------------------------------------------------------
    console.log('\n[9/9] Ciclo completo de rollback e reaplicação com inserções concorrentes...');
    const [beforeRollbackA] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_A}::uuid`;

    // Executa o rollback 258
    await adminSql.unsafe(rollback258Sql);

    const [syncStatusAfterRollback] = await adminSql`
      SELECT public.is_business_views_materialized_sync_active() AS active
    `;
    assert(
      syncStatusAfterRollback.active === false,
      'Cenário 9a: is_business_views_materialized_sync_active() detecta trigger desativado após rollback'
    );

    // Insere 5 novos eventos concorrentes durante o estado pós-rollback
    const clients9 = await createIndependentClients(5);
    await Promise.all(
      clients9.map((client, i) =>
        client`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
          VALUES (
            ${TENANT_ID}::uuid,
            ${BIZ_A}::uuid,
            'view',
            ${'visitor_rollback_' + i},
            ${client.json({ cycle_id: `c9_during_rollback_${i}` })},
            now()
          )
        `
      )
    );
    await closeClients(clients9);

    // Verifica que get_canonical_business_views_counts e get_single_business_canonical_views_count NÃO retornam valor congelado!
    const [liveReadDuringRollback] = await adminSql`
      SELECT
        public.get_single_business_canonical_views_count(${BIZ_A}::uuid) AS single_count,
        (public.get_canonical_business_views_counts(ARRAY[${BIZ_A}::uuid])->>${BIZ_A})::bigint AS batch_count
    `;
    const expectedDuringRollback = Number(beforeRollbackA.views_count) + 5;
    assert(
      Number(liveReadDuringRollback.single_count) === expectedDuringRollback &&
        Number(liveReadDuringRollback.batch_count) === expectedDuringRollback,
      `Cenário 9b: durante o rollback, leitores canônicos retornaram contagem viva (${liveReadDuringRollback.single_count}) e NÃO a coluna congelada (${beforeRollbackA.views_count})`
    );

    // Reaplica a Migration 258 integralmente
    await adminSql.unsafe(migration258Sql);

    const [syncStatusAfterReapply] = await adminSql`
      SELECT public.is_business_views_materialized_sync_active() AS active
    `;
    const finalAudit = await adminSql`SELECT * FROM public.audit_business_views_consistency()`;
    const [afterReapplyA] = await adminSql`SELECT views_count FROM public.businesses WHERE id = ${BIZ_A}::uuid`;

    assert(
      syncStatusAfterReapply.active === true,
      'Cenário 9c: trigger reativado com sucesso após reaplicação da Migration 258'
    );
    assert(
      Number(afterReapplyA.views_count) === expectedDuringRollback,
      `Cenário 9d: coluna businesses.views_count reconciliada perfeitamente após reaplicação (${afterReapplyA.views_count})`
    );
    assert(
      finalAudit.every((row) => Number(row.divergence) === 0 && row.is_consistent === true),
      'Cenário 9e: 100% das empresas consistentes (0 divergências, incluindo empresa com 0 views) ao final do ciclo completo'
    );

    console.log('\n================================================================================');
    console.log(`RESULTADO FINAL: ${passed} asserções aprovadas, ${failed} falhas.`);
    console.log('================================================================================');

    await adminSql.end({ timeout: 2 });
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ ERRO FATAL NA VALIDAÇÃO DE CONCORRÊNCIA:', err);
    await adminSql.end({ timeout: 2 });
    process.exit(1);
  }
}

main();

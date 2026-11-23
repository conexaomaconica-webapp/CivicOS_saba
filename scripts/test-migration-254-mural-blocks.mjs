import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function main() {
  console.log('🧪 Iniciando validação isolada em PGlite da Migration 254 (Mural User Blocks & Compatibility with 171/244/245)...');
  const db = new PGlite();

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const userA = '00000000-0000-0000-0000-00000000000a';
  const userB = '00000000-0000-0000-0000-00000000000b';
  const authorAbusive = '00000000-0000-0000-0000-000000000099';
  const authorGood = '00000000-0000-0000-0000-000000000088';
  const biz1 = '00000000-0000-0000-0000-000000000101';
  const biz2 = '00000000-0000-0000-0000-000000000102';
  const connAbusive1 = '00000000-0000-0000-0000-000000001001';
  const connAbusive2 = '00000000-0000-0000-0000-000000001002';
  const connGood = '00000000-0000-0000-0000-000000001003';

  // 1. Setup base schema matching Migrations 171, 244, 245
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    DO $$ BEGIN
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE auth.users (
      id UUID PRIMARY KEY,
      email TEXT
    );

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    $$;

    CREATE TABLE public.tenants (
      id UUID PRIMARY KEY,
      slug TEXT NOT NULL
    );

    CREATE TABLE public.businesses (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      logo_url TEXT,
      publication_status TEXT NOT NULL DEFAULT 'published',
      is_active BOOLEAN NOT NULL DEFAULT true
    );

    CREATE TABLE public.business_connections (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
      member_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      connection_type TEXT NOT NULL DEFAULT 'compra',
      item_description TEXT,
      message TEXT,
      photo_url TEXT,
      photo_moderation_status TEXT NOT NULL DEFAULT 'aprovada',
      status TEXT NOT NULL DEFAULT 'confirmada',
      share_on_mural BOOLEAN NOT NULL DEFAULT true,
      confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE public.connection_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id UUID NOT NULL REFERENCES public.business_connections(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
    );

    CREATE TABLE public.connection_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id UUID NOT NULL REFERENCES public.business_connections(id) ON DELETE CASCADE,
      reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL CHECK (reason IN ('foto_inadequada', 'informacao_falsa', 'ofensivo', 'outro')),
      details TEXT CHECK (details IS NULL OR char_length(details) <= 300),
      status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'resolvida')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (connection_id, reporter_user_id)
    );

    CREATE OR REPLACE FUNCTION public._resolve_public_tenant_id(p_host TEXT)
    RETURNS UUID LANGUAGE sql STABLE AS $$
      SELECT '${tenantId}'::UUID;
    $$;

    CREATE OR REPLACE FUNCTION public._connection_member_first_name(p_user_id UUID)
    RETURNS TEXT LANGUAGE sql STABLE AS $$
      SELECT CASE
        WHEN p_user_id = '${authorAbusive}'::UUID THEN 'AutorAbusivo'
        WHEN p_user_id = '${authorGood}'::UUID THEN 'AutorFraterno'
        ELSE 'Ir.'
      END;
    $$;

    CREATE OR REPLACE FUNCTION public._normalize_search(p_text TEXT)
    RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
      SELECT lower(COALESCE(p_text, ''));
    $$;

    INSERT INTO auth.users (id, email) VALUES
      ('${userA}', 'usera@test.com'),
      ('${userB}', 'userb@test.com'),
      ('${authorAbusive}', 'abusive@test.com'),
      ('${authorGood}', 'good@test.com');

    INSERT INTO public.tenants (id, slug) VALUES ('${tenantId}', 'default');

    INSERT INTO public.businesses (id, tenant_id, name, slug, publication_status, is_active) VALUES
      ('${biz1}', '${tenantId}', 'Empresa Alfa', 'empresa-alfa', 'published', true),
      ('${biz2}', '${tenantId}', 'Empresa Beta', 'empresa-beta', 'published', true);

    INSERT INTO public.business_connections (
      id, tenant_id, business_id, member_user_id, connection_type, item_description, message, status, share_on_mural
    ) VALUES
      ('${connAbusive1}', '${tenantId}', '${biz1}', '${authorAbusive}', 'compra', 'Item 1', 'Post 1 do autor bloqueado', 'confirmada', true),
      ('${connAbusive2}', '${tenantId}', '${biz2}', '${authorAbusive}', 'servico', 'Item 2', 'Post 2 do mesmo autor em outra empresa', 'confirmada', true),
      ('${connGood}', '${tenantId}', '${biz1}', '${authorGood}', 'visita', 'Item 3', 'Post legítimo de outro irmão', 'confirmada', true);
  `);

  // 2. Apply Migration 254 (twice to verify idempotency!)
  const migration254Sql = fs
    .readFileSync(path.join(rootDir, 'supabase', 'migrations', '254_mural_user_blocks_and_abuse_prevention.sql'), 'utf8')
    .replace(/NOTIFY pgrst, 'reload schema';/g, '');
  await db.exec(migration254Sql);
  await db.exec(migration254Sql); // 2nd execution proves idempotency

  let passed = 0;
  let failed = 0;
  const assert = (cond, label) => {
    if (cond) {
      console.log(`  ✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${label}`);
      failed++;
    }
  };

  // Test 1: Anonymous user sees all 3 connections
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '', false);`);
  const anonFeed = await db.query(`SELECT public.public_connections_feed('localhost', 6, false, false, true) AS data;`);
  assert(anonFeed.rows[0].data.length === 3, 'Visitante anônimo visualiza todas as 3 conexões confirmadas antes de qualquer bloqueio');

  // Test 2: Self-block prevention
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${authorAbusive}', false);`);
  const selfBlock = await db.query(`SELECT public.block_connection_author('${connAbusive1}'::UUID, 'ofensivo') AS res;`);
  assert(
    selfBlock.rows[0].res.success === false && selfBlock.rows[0].res.code === 'SELF_BLOCK_NOT_ALLOWED',
    'Impede auto-bloqueio (SELF_BLOCK_NOT_ALLOWED)',
  );

  // Test 3: User A blocks author of connAbusive1 -> both connAbusive1 (Biz1) and connAbusive2 (Biz2) disappear for User A, and a report is created in connection_reports
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${userA}', false);`);
  const blockRes = await db.query(`SELECT public.block_connection_author('${connAbusive1}'::UUID, 'ofensivo') AS res;`);
  assert(blockRes.rows[0].res.success === true, 'User A bloqueia o autor de connAbusive1 via block_connection_author');

  const reportsCheck = await db.query(`SELECT count(*)::int AS cnt FROM public.connection_reports WHERE connection_id = '${connAbusive1}'::UUID AND reporter_user_id = '${userA}'::UUID;`);
  assert(reportsCheck.rows[0].cnt === 1, 'Bloqueio de autor registra automaticamente denúncia na fila administrativa connection_reports (Migration 171)');

  const userAFeed = await db.query(`SELECT public.public_connections_feed('localhost', 6, false, false, true) AS data;`);
  const userAFeedIds = userAFeed.rows[0].data.map((r) => r.id);
  assert(
    userAFeedIds.length === 1 && userAFeedIds[0] === connGood,
    'public_connections_feed oculta TODAS as conexões do autor bloqueado (em qualquer empresa) para o User A',
  );

  const userAList = await db.query(`SELECT public.public_connections_list('localhost', NULL, NULL, 'recent', 1, 12) AS data;`);
  assert(
    userAList.rows[0].data.total === 1 && userAList.rows[0].data.items.length === 1,
    'public_connections_list (/conexoes) também oculta o autor bloqueado para o User A',
  );

  const userABizConns = await db.query(`SELECT public.public_business_connections('localhost', 'empresa-alfa', 6) AS data;`);
  assert(
    userABizConns.rows[0].data.confirmed_count === 1 && userABizConns.rows[0].data.items.length === 1,
    'public_business_connections (perfil da empresa) também oculta o autor bloqueado para o User A',
  );

  // Test 4: User B (another authenticated user) still sees all 3 connections (strict user separation)
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${userB}', false);`);
  const userBFeed = await db.query(`SELECT public.public_connections_feed('localhost', 6, false, false, true) AS data;`);
  assert(
    userBFeed.rows[0].data.length === 3,
    'Isolamento entre usuários: User B continua visualizando todas as 3 conexões normalmente',
  );

  // Test 5: Validate Rollback 254
  const rollback254Sql = fs
    .readFileSync(path.join(rootDir, 'supabase', 'rollbacks', '254_rollback.sql'), 'utf8')
    .replace(/NOTIFY pgrst, 'reload schema';/g, '');
  await db.exec(rollback254Sql);

  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${userA}', false);`);
  const postRollbackFeed = await db.query(`SELECT public.public_connections_feed('localhost', 6, false, false, true) AS data;`);
  assert(
    postRollbackFeed.rows[0].data.length === 3,
    'Rollback 254 restaura public_connections_feed (244), public_connections_list (245) e public_business_connections (171) sem erros',
  );

  console.log(`\n📊 Resultado PGlite Migration 254: ${passed} aprovados, ${failed} reprovados.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


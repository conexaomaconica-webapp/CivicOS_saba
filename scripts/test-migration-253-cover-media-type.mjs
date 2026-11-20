// Teste isolado em PostgreSQL real (PGlite) da Migration 253 e do Rollback 253
// Valida:
// 1. Estado anterior (migrations 123 -> 153 -> 159 para public_directory_home_data; 160 -> 206 -> 207 para public_business_detail)
// 2. Aplicação da 253_fix_cover_media_type_filter_in_public_rpcs.sql
// 3. Preservação de todos os campos, filtros, critérios de publicação, regras de planos, permissões e vídeos institucionais
// 4. Validação do script 253_rollback.sql e reaplicação idempotente da 253

import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;
const failures = [];

async function ok(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    failures.push(`${name}: ${e.message}`);
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

const eq = (a, b, label = '') => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${label} esperado ${JSON.stringify(b)}, obtido ${JSON.stringify(a)}`);
  }
};

const TENANT_ID = '00000000-0000-0000-0000-000000000000';
const BIZ_COMANDOS = '00000000-0000-0000-0000-000000000201';
const BIZ_FISION = '5d355d41-a5a2-4e86-808c-57f7ef86afef';
const BIZ_GRUPOMAP = '1caa6064-765b-4c59-b55b-6894edcd4792';
const BIZ_ARETUZA = 'd07e7edc-3b60-4101-8fd6-06d1b1830bb3';

const COMANDOS_COVER = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000000201/cover/1789991047944-images__8_.webp';
const FISION_COVER = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000000/5d355d41-a5a2-4e86-808c-57f7ef86afef/cover/d7b72e7f-f92d-4345-8346-3c334b16b84c.webp';
const GRUPOMAP_COVER = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000000/1caa6064-765b-4c59-b55b-6894edcd4792/cover/a6e9d096-f5d0-427a-aa76-108652472e31.webp';
const ARETUZA_COVER = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000000/d07e7edc-3b60-4101-8fd6-06d1b1830bb3/cover/94302bce-9528-4571-8db9-7d67f97563c9.webp';

const STUBS = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN;

  CREATE OR REPLACE FUNCTION public._resolve_public_tenant_id(p_host TEXT)
  RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT '${TENANT_ID}'::UUID;
  $$;

  CREATE OR REPLACE FUNCTION public._safe_public_url(p_url TEXT)
  RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT p_url;
  $$;

  CREATE TABLE public.directory_home_settings (
    tenant_id UUID PRIMARY KEY,
    hero_title TEXT,
    hero_subtitle TEXT,
    hero_search_placeholder TEXT,
    default_page_size INTEGER DEFAULT 12,
    sections_config JSONB DEFAULT '[]'::jsonb,
    sponsored_display_mode TEXT DEFAULT 'cards',
    sponsored_marquee_speed INTEGER DEFAULT 45,
    sponsored_logo_style TEXT DEFAULT 'standard'
  );

  CREATE TABLE public.directory_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    title TEXT,
    subtitle TEXT,
    image_desktop_url TEXT,
    image_mobile_url TEXT,
    cta_text TEXT,
    cta_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ
  );

  CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    slug TEXT,
    icon TEXT
  );

  CREATE TABLE public.directory_featured_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    category_id UUID,
    custom_title TEXT,
    icon_name TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
  );

  CREATE TABLE public.businesses (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    logo_url TEXT,
    plan_tier TEXT,
    category TEXT,
    publication_status TEXT DEFAULT 'published',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.directory_sponsored_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    priority INTEGER DEFAULT 100,
    city TEXT,
    is_active BOOLEAN DEFAULT true,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ
  );

  CREATE TABLE public.business_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    is_headquarters BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.business_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    media_type TEXT,
    url TEXT,
    title TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    category_id UUID,
    is_primary BOOLEAN DEFAULT true
  );

  CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name TEXT
  );

  CREATE TABLE public.business_masonic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    organization_id UUID,
    status TEXT DEFAULT 'verified',
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.business_recognitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    recognition_key TEXT,
    is_active BOOLEAN DEFAULT true
  );

  CREATE TABLE public.business_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    type TEXT,
    value TEXT,
    label TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.business_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    name TEXT,
    description TEXT,
    icon_name TEXT,
    price_info TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.business_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    title TEXT,
    description TEXT,
    benefit_type TEXT,
    discount_percentage NUMERIC,
    discount_code TEXT,
    badge_text TEXT,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE public.business_responsibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    business_id UUID,
    name TEXT,
    business_role TEXT,
    community_label TEXT,
    organization TEXT,
    avatar_url TEXT
  );

  CREATE OR REPLACE FUNCTION public._effective_business_plan(p_tenant_id UUID, p_business_id UUID)
  RETURNS TABLE(plan_code TEXT) LANGUAGE sql STABLE AS $$
    SELECT b.plan_tier AS plan_code FROM public.businesses b WHERE b.id = p_business_id AND b.tenant_id = p_tenant_id;
  $$;
`;

async function buildIsolatedDb(with207 = false) {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(read('supabase/migrations/123_sponsored_speed_and_logo_style.sql'));
  await db.exec('GRANT EXECUTE ON FUNCTION public.public_directory_home_data(TEXT, TEXT) TO anon, authenticated, service_role;');
  await db.exec(read('supabase/migrations/153_fix_directory_home_location_priority.sql'));
  await db.exec(read('supabase/migrations/159_fix_home_sponsored_cover_and_headquarters.sql'));
  await db.exec(read('supabase/migrations/160_public_business_detail_current_schema.sql'));
  if (with207) {
    await db.exec(read('supabase/migrations/207_public_business_plan_contract.sql'));
  }

  // Seed das empresas reais (3 afetadas com vídeo + 1 sem vídeo)
  await db.exec(`
    INSERT INTO public.businesses (id, tenant_id, name, slug, description, logo_url, plan_tier, category, publication_status, is_active)
    VALUES
      ('${BIZ_COMANDOS}', '${TENANT_ID}', 'Comandos', 'comandos', 'Moda Masculina', 'https://cdn.test/logo-comandos.webp', 'acacia', 'Moda', 'published', true),
      ('${BIZ_FISION}', '${TENANT_ID}', 'FISION — Fisioterapia e Pilates', 'fision', 'Fisioterapia', 'https://cdn.test/logo-fision.webp', 'acacia', 'Saúde', 'published', true),
      ('${BIZ_GRUPOMAP}', '${TENANT_ID}', 'Grupo MAP', 'grupomap', 'Segurança', 'https://cdn.test/logo-map.webp', 'acacia', 'Segurança', 'published', true),
      ('${BIZ_ARETUZA}', '${TENANT_ID}', 'Aretuza Prado', 'aretuzaprado', 'Consultoria', 'https://cdn.test/logo-aretuza.webp', 'compasso', 'Consultoria', 'published', true);

    INSERT INTO public.business_locations (tenant_id, business_id, city, state, is_headquarters)
    VALUES
      ('${TENANT_ID}', '${BIZ_COMANDOS}', 'Feira de Santana', 'BA', true),
      ('${TENANT_ID}', '${BIZ_FISION}', 'Feira de Santana', 'BA', true),
      ('${TENANT_ID}', '${BIZ_GRUPOMAP}', 'Salvador', 'BA', true),
      ('${TENANT_ID}', '${BIZ_ARETUZA}', 'Feira de Santana', 'BA', true);

    -- Mídias: vídeo com display_order = 0 inserido ANTES da imagem com display_order = 0 para reproduzir o empate real do PostgreSQL
    INSERT INTO public.business_media (tenant_id, business_id, media_type, url, title, display_order, created_at)
    VALUES
      ('${TENANT_ID}', '${BIZ_COMANDOS}', 'video', 'https://youtu.be/am3teVpl-Ow', 'Vídeo institucional', 0, now() - interval '10 minutes'),
      ('${TENANT_ID}', '${BIZ_COMANDOS}', 'image', '${COMANDOS_COVER}', 'Imagem de Capa', 0, now() - interval '5 minutes'),
      ('${TENANT_ID}', '${BIZ_FISION}', 'video', 'https://youtube.com/shorts/05Lm_cJzs34', 'Vídeo institucional', 0, now() - interval '10 minutes'),
      ('${TENANT_ID}', '${BIZ_FISION}', 'image', '${FISION_COVER}', 'Imagem de Capa', 0, now() - interval '5 minutes'),
      ('${TENANT_ID}', '${BIZ_GRUPOMAP}', 'video', 'https://youtu.be/2bHPkewankE?is=tYJ5AFPO9TsGODz0', 'Vídeo institucional', 0, now() - interval '10 minutes'),
      ('${TENANT_ID}', '${BIZ_GRUPOMAP}', 'image', '${GRUPOMAP_COVER}', 'Imagem de Capa', 0, now() - interval '5 minutes'),
      ('${TENANT_ID}', '${BIZ_ARETUZA}', 'image', '${ARETUZA_COVER}', 'Imagem de Capa', 0, now() - interval '5 minutes');
  `);

  return db;
}

console.log('Gate Final · Migration 253 e Rollback 253 em PostgreSQL Real (PGlite)');

await ok('1. ANTES da 253: reproduz o defeito em public_directory_home_data e public_business_detail', async () => {
  const db = await buildIsolatedDb(false);
  const home = (await db.query(`SELECT public.public_directory_home_data('localhost:3000', NULL) AS r`)).rows[0].r;
  const bySlug = Object.fromEntries(home.sponsored.map((s) => [s.slug, s]));
  eq(bySlug.comandos.cover_url, 'https://youtu.be/am3teVpl-Ow');
  eq(bySlug.fision.cover_url, 'https://youtube.com/shorts/05Lm_cJzs34');
  eq(bySlug.grupomap.cover_url, 'https://youtu.be/2bHPkewankE?is=tYJ5AFPO9TsGODz0');

  const fisionDetail = (await db.query(`SELECT public.public_business_detail('localhost:3000', 'fision') AS r`)).rows[0].r;
  eq(fisionDetail.media[0].media_type, 'video');
});

await ok('2. DEPOIS da 253: public_directory_home_data retorna apenas imagens válidas em cover_url e preserva todos os campos/filtros', async () => {
  const db = await buildIsolatedDb(false);
  await db.exec(read('supabase/migrations/253_fix_cover_media_type_filter_in_public_rpcs.sql'));

  const home = (await db.query(`SELECT public.public_directory_home_data('localhost:3000', NULL) AS r`)).rows[0].r;
  eq(Object.keys(home).sort(), ['available_cities', 'banners', 'categories', 'settings', 'sponsored']);
  const bySlug = Object.fromEntries(home.sponsored.map((s) => [s.slug, s]));
  eq(bySlug.comandos.cover_url, COMANDOS_COVER);
  eq(bySlug.fision.cover_url, FISION_COVER);
  eq(bySlug.grupomap.cover_url, GRUPOMAP_COVER);
  eq(bySlug.aretuzaprado.cover_url, ARETUZA_COVER);

  // Filtro por cidade preservado
  const homeSalvador = (await db.query(`SELECT public.public_directory_home_data('localhost:3000', 'Salvador') AS r`)).rows[0].r;
  eq(homeSalvador.sponsored.map((s) => s.slug), ['grupomap']);
  eq(homeSalvador.sponsored[0].cover_url, GRUPOMAP_COVER);
});

await ok('3. DEPOIS da 253: public_business_detail prioriza imagem em media[0] e preserva integralmente o vídeo institucional', async () => {
  const db = await buildIsolatedDb(false);
  await db.exec(read('supabase/migrations/253_fix_cover_media_type_filter_in_public_rpcs.sql'));

  for (const [slug, expectedCover, expectedVideo] of [
    ['comandos', COMANDOS_COVER, 'https://youtu.be/am3teVpl-Ow'],
    ['fision', FISION_COVER, 'https://youtube.com/shorts/05Lm_cJzs34'],
    ['grupomap', GRUPOMAP_COVER, 'https://youtu.be/2bHPkewankE?is=tYJ5AFPO9TsGODz0'],
  ]) {
    const detail = (await db.query(`SELECT public.public_business_detail('localhost:3000', $1) AS r`, [slug])).rows[0].r;
    eq(detail.media.length, 2);
    eq(detail.media[0].media_type, 'image');
    eq(detail.media[0].url, expectedCover);
    eq(detail.media[1].media_type, 'video');
    eq(detail.media[1].url, expectedVideo);
  }
});

await ok('4. Compatibilidade com migration 207 (_public_business_detail_legacy) e preservação de grants/permissões', async () => {
  const db = await buildIsolatedDb(true);
  await db.exec(read('supabase/migrations/253_fix_cover_media_type_filter_in_public_rpcs.sql'));

  const detail = (await db.query(`SELECT public.public_business_detail('localhost:3000', 'fision') AS r`)).rows[0].r;
  eq(detail.media[0].media_type, 'image');
  eq(detail.media[0].url, FISION_COVER);
  eq(detail.media[1].media_type, 'video');
  eq(detail.effective_plan_code, 'acacia');

  const privHome = async (r) => (await db.query(`SELECT has_function_privilege($1, p.oid, 'execute') AS r FROM pg_proc p WHERE p.proname = 'public_directory_home_data'`, [r])).rows[0].r;
  const privDetail = async (r) => (await db.query(`SELECT has_function_privilege($1, p.oid, 'execute') AS r FROM pg_proc p WHERE p.proname = 'public_business_detail'`, [r])).rows[0].r;
  eq([await privHome('anon'), await privHome('authenticated')], [true, true]);
  eq([await privDetail('anon'), await privDetail('authenticated')], [true, true]);
});

await ok('5. Validação do 253_rollback.sql em ambiente isolado e reaplicação idempotente da 253', async () => {
  const db = await buildIsolatedDb(false);
  await db.exec(read('supabase/migrations/253_fix_cover_media_type_filter_in_public_rpcs.sql'));
  // Reaplicação idempotente não deve falhar
  await db.exec(read('supabase/migrations/253_fix_cover_media_type_filter_in_public_rpcs.sql'));

  // Rollback restaura estado anterior
  await db.exec(read('supabase/rollbacks/253_rollback.sql'));
  const homeAfterRollback = (await db.query(`SELECT public.public_directory_home_data('localhost:3000', NULL) AS r`)).rows[0].r;
  const bySlugRollback = Object.fromEntries(homeAfterRollback.sponsored.map((s) => [s.slug, s]));
  eq(bySlugRollback.fision.cover_url, 'https://youtube.com/shorts/05Lm_cJzs34');

  // Reaplicar 253 após rollback corrige novamente
  await db.exec(read('supabase/migrations/253_fix_cover_media_type_filter_in_public_rpcs.sql'));
  const homeReapplied = (await db.query(`SELECT public.public_directory_home_data('localhost:3000', NULL) AS r`)).rows[0].r;
  const bySlugReapplied = Object.fromEntries(homeReapplied.sponsored.map((s) => [s.slug, s]));
  eq(bySlugReapplied.fision.cover_url, FISION_COVER);
});

console.log(`RESULTADO PGLITE (Migration 253): ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) {
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}


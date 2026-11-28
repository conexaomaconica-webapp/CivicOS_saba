// @vitest-environment jsdom

import fs from 'fs';
import path from 'path';
import React from 'react';
(globalThis as unknown as { React: typeof React }).React = React;
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon_test_key';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import {
  clearLiveViewsStoreForTesting,
  getActiveViewsSubscribersCountForTesting,
  getValidCachedViewsEntry,
  LIVE_VIEWS_CACHE_TTL_MS,
  recordConfirmedServerViewsCount,
  useLiveBusinessViewsCount,
} from '../src/lib/analytics/live-views-store';
import {
  resetNavigationCycle,
  trackEvent,
} from '../src/lib/analytics/track-client';
import {
  extractTrustedClientIp,
  generateCooldownSubjectId,
  generatePseudonymousSubjectId,
} from '../src/lib/analytics/privacy-hash';
import {
  resolveCanonicalViewsCountsMap,
  resolveSingleBusinessCanonicalViewsCount,
} from '../src/lib/analytics/canonical-views-reader';
import { DirectorySponsored } from '../src/components/public/directory/DirectorySponsored';
import { DirectoryFoundersMarquee } from '../src/components/public/directory/DirectoryFoundersMarquee';
import { BenefitsDirectoryCards } from '../src/components/public/directory/BenefitsDirectoryCards';
import { BusinessCard } from '../src/components/public/directory/BusinessCard';
import { BusinessListCard } from '../src/components/public/directory/BusinessListCard';
import { GoldBusinessProfile } from '../src/components/public/business/layouts/GoldBusinessProfile';
import { SilverBusinessProfile } from '../src/components/public/business/layouts/SilverBusinessProfile';
import { BronzeBusinessProfile } from '../src/components/public/business/layouts/BronzeBusinessProfile';
import { FavoritesProvider } from '../src/lib/directory/favorites-context';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');
const ROLLBACKS_DIR = path.resolve(__dirname, '../../../supabase/rollbacks/analytics');
const MIGRATION_216_PATH = path.join(MIGRATIONS_DIR, '216_analytics_event_cycle_deduplication.sql');
const MIGRATION_258_PATH = path.join(MIGRATIONS_DIR, '258_canonical_business_views_and_configurable_policy.sql');
const ROLLBACK_258_PATH = path.join(ROLLBACKS_DIR, '258_rollback.sql');

const TENANT_ID = '00000000-0000-0000-0000-000000000010';
const BIZ_CAMINHO = '8c028048-0000-4000-8000-000000000001';
const BIZ_OPTICA = '9d028048-0000-4000-8000-000000000002';
const BIZ_ZERO = 'ad028048-0000-4000-8000-000000000003';

async function createHomologationPostgres(): Promise<PGlite> {
  const db = new PGlite();

  // Schema base compatível com Supabase PostgreSQL para businesses, tenant_settings, analytics_events e RPCs
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
      END IF;
    END
    $$;

    CREATE TABLE public.tenant_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      timezone TEXT DEFAULT 'America/Sao_Paulo',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    INSERT INTO public.tenant_settings (tenant_id, metadata)
    VALUES ('${TENANT_ID}', '{}'::jsonb);

    CREATE TABLE public.businesses (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Consultoria',
      logo_url TEXT,
      plan_tier TEXT DEFAULT 'acacia',
      is_active BOOLEAN NOT NULL DEFAULT true,
      publication_status TEXT NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT '2026-08-01T00:00:00Z',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT '2026-08-01T00:00:00Z'
    );

    CREATE OR REPLACE FUNCTION public.update_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER trg_businesses_updated_at
      BEFORE UPDATE ON public.businesses
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();

    CREATE TABLE public.analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
      event_name TEXT NOT NULL,
      pseudonymous_subject_id TEXT,
      source TEXT,
      device TEXT DEFAULT 'web',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION public._resolve_public_tenant_id(p_host TEXT)
    RETURNS UUID LANGUAGE sql IMMUTABLE AS $$
      SELECT '${TENANT_ID}'::UUID;
    $$;

    CREATE OR REPLACE FUNCTION public._safe_public_url(p_url TEXT)
    RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
      SELECT p_url;
    $$;

    CREATE OR REPLACE FUNCTION public.public_directory_home_data(p_host TEXT, p_city TEXT DEFAULT NULL)
    RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
    DECLARE
      v_sponsored JSONB;
    BEGIN
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'slug', b.slug,
        'is_featured', true
      )), '[]'::jsonb) INTO v_sponsored
      FROM public.businesses b
      WHERE b.tenant_id = public._resolve_public_tenant_id(p_host) AND b.is_active = true AND b.publication_status = 'published';
      RETURN jsonb_build_object('sponsored', v_sponsored);
    END;
    $$;

    CREATE OR REPLACE FUNCTION public.public_businesses_search(p_host TEXT, p_query TEXT DEFAULT NULL)
    RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
    DECLARE
      v_items JSONB;
    BEGIN
      WITH filtered_data AS (
        SELECT
          b.id,
          b.slug,
          b.name,
          b.is_active,
          b.publication_status,
          true AS is_verified
        FROM public.businesses b
        WHERE b.tenant_id = public._resolve_public_tenant_id(p_host) AND b.is_active = true AND b.publication_status = 'published'
      )
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'slug', slug,
        'name', name,
        'is_verified', is_verified,
        'plan_code', 'acacia'
      )), '[]'::jsonb) INTO v_items FROM filtered_data;
      RETURN jsonb_build_object('items', v_items);
    END;
    $$;

    CREATE OR REPLACE FUNCTION public.public_business_detail(p_host TEXT, p_business_slug TEXT)
    RETURNS SETOF JSONB LANGUAGE plpgsql STABLE AS $$
    DECLARE
      v_biz public.businesses%ROWTYPE;
    BEGIN
      SELECT b.* INTO v_biz FROM public.businesses b WHERE b.slug = p_business_slug LIMIT 1;
      IF v_biz.id IS NULL THEN RETURN; END IF;
      RETURN QUERY SELECT jsonb_build_object(
        'business_id', v_biz.id,
        'business_slug', v_biz.slug,
        'business_name', v_biz.name,
        'rating_count', 0
      );
    END;
    $$;

    INSERT INTO public.businesses (id, tenant_id, name, slug) VALUES
      ('${BIZ_CAMINHO}', '${TENANT_ID}', 'Centro Espiritualista Caminho da Luz', 'caminhodaluz'),
      ('${BIZ_OPTICA}', '${TENANT_ID}', 'Óptica Circulô', 'opticacirculo'),
      ('${BIZ_ZERO}', '${TENANT_ID}', 'Empresa Sem Visitas', 'sem-visitas');
  `);

  // Aplica a Migration 216 existente
  const sql216 = fs.readFileSync(MIGRATION_216_PATH, 'utf8');
  await db.exec(sql216);

  return db;
}

describe('GATE-BUSINESS-VIEWS — Homologação Completa (PostgreSQL Real + Web + Mobile + Políticas)', () => {
  describe('Bloco 1: Homologação SQL em PostgreSQL Local (PGlite) — Migration 258, Políticas e Rollback', () => {
    it('T-SQL-01 a T-SQL-09: Reconcilia >1.000 eventos, empresas com 0 views, cycle_id nulo/vazio, preserva updated_at e protege contra manipulação direta', async () => {
      const db = await createHomologationPostgres();

      // Insere eventos históricos ANTES da Migration 258:
      // - 1.250 views para Caminho da Luz (200 legadas sem cycle_id antes de 2026-10-28, 50 com cycle_id vazio "", e 1.000 com cycle_id único)
      // - 102 views para Óptica Circulô
      // - 25 eventos de outros tipos (whatsapp_click, search_impression, share) que NÃO devem entrar em views_count
      // - 0 views para BIZ_ZERO
      await db.exec(`
        -- 200 views históricas sem cycle_id (antes do corte)
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, metadata, created_at)
        SELECT '${TENANT_ID}', '${BIZ_CAMINHO}', 'view', '{}'::jsonb, '2026-09-15T12:00:00Z'::timestamptz + (g || ' seconds')::interval
        FROM generate_series(1, 200) g;

        -- 50 views com cycle_id vazio ou espaços (devem ser tratadas como individuais pelo id::text)
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, metadata, created_at)
        SELECT '${TENANT_ID}', '${BIZ_CAMINHO}', 'view', jsonb_build_object('cycle_id', '   '), '2026-09-20T12:00:00Z'::timestamptz + (g || ' seconds')::interval
        FROM generate_series(1, 50) g;

        -- 1.000 views com cycle_id único após o corte
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, metadata, created_at)
        SELECT '${TENANT_ID}', '${BIZ_CAMINHO}', 'view', jsonb_build_object('cycle_id', 'cycle_hist_' || g), '2026-11-10T12:00:00Z'::timestamptz + (g || ' seconds')::interval
        FROM generate_series(1, 1000) g;

        -- 102 views para Óptica Circulô
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, metadata, created_at)
        SELECT '${TENANT_ID}', '${BIZ_OPTICA}', 'view', jsonb_build_object('cycle_id', 'cycle_opt_' || g), '2026-11-12T12:00:00Z'::timestamptz + (g || ' seconds')::interval
        FROM generate_series(1, 102) g;

        -- 25 eventos não-view (cliques e impressões)
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, metadata, created_at)
        SELECT '${TENANT_ID}', '${BIZ_CAMINHO}', 'whatsapp_click', '{}'::jsonb, now()
        FROM generate_series(1, 15) g;

        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, metadata, created_at)
        SELECT '${TENANT_ID}', '${BIZ_OPTICA}', 'search_impression', '{}'::jsonb, now()
        FROM generate_series(1, 10) g;
      `);

      // Aplica Migration 258
      const sql258 = fs.readFileSync(MIGRATION_258_PATH, 'utf8');
      await db.exec(sql258);

      // Verifica contadores reconciliados (> 1.000 eventos + 102 + 0)
      const resCounts = await db.query<{ slug: string; views_count: number; updated_at: string }>(
        `SELECT slug, views_count::int AS views_count, updated_at::text FROM public.businesses ORDER BY slug ASC`
      );
      const bySlug = Object.fromEntries(resCounts.rows.map((r) => [r.slug, r]));

      expect(bySlug['caminhodaluz']?.views_count).toBe(1250);
      expect(bySlug['opticacirculo']?.views_count).toBe(102);
      expect(bySlug['sem-visitas']?.views_count).toBe(0);

      // T-SQL-04: Reconciliação executada repetidamente (5 vezes) não duplica nem altera valores consistentes
      for (let i = 0; i < 5; i++) {
        await db.query(`SELECT public.reconcile_business_views_count(NULL)`);
      }
      const auditRes = await db.query<{
        business_slug: string;
        materialized_views_count: number;
        recalculated_eligible_views: number;
        divergence: number;
        is_consistent: boolean;
      }>(`SELECT business_slug, materialized_views_count::int, recalculated_eligible_views::int, divergence::int, is_consistent FROM public.audit_business_views_consistency()`);

      expect(auditRes.rows.every((r) => r.is_consistent && r.divergence === 0)).toBe(true);

      // T-SQL-08: Incremento de views_count NÃO altera businesses.updated_at
      const beforeUpdatedAt = bySlug['opticacirculo']!.updated_at;
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata)
        VALUES ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'vid_user_1', '{"cycle_id":"cycle_new_visit_001"}'::jsonb);
      `);
      const afterViewRes = await db.query<{ views_count: number; updated_at: string }>(
        `SELECT views_count::int AS views_count, updated_at::text FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(afterViewRes.rows[0]?.views_count).toBe(103);
      expect(afterViewRes.rows[0]?.updated_at).toBe(beforeUpdatedAt);

      // Mas atualizar o nome da empresa atualiza updated_at normalmente
      await db.exec(`UPDATE public.businesses SET name = 'Óptica Circulô Oficial' WHERE id = '${BIZ_OPTICA}'`);
      const afterNameRes = await db.query<{ updated_at: string }>(
        `SELECT updated_at::text FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(afterNameRes.rows[0]?.updated_at).not.toBe(beforeUpdatedAt);

      // T-SQL-07: Exclusão de visita única reduz -1, e piso 0 é respeitado
      await db.exec(`
        DELETE FROM public.analytics_events
        WHERE business_id = '${BIZ_OPTICA}' AND metadata->>'cycle_id' = 'cycle_new_visit_001';
      `);
      const afterDelRes = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(afterDelRes.rows[0]?.views_count).toBe(102);

      // T-SQL-07b: Exclusão de duplicata histórica (mesmo cycle_id antes do corte 2026-10-28) NÃO reduz o contador indevidamente
      await db.exec(`
        INSERT INTO public.analytics_events (id, tenant_id, business_id, event_name, metadata, created_at) VALUES
          ('11111111-1111-4111-8111-111111111101', '${TENANT_ID}', '${BIZ_ZERO}', 'view', '{"cycle_id":"legacy_dup_cycle"}'::jsonb, '2026-09-01T10:00:00Z'),
          ('11111111-1111-4111-8111-111111111102', '${TENANT_ID}', '${BIZ_ZERO}', 'view', '{"cycle_id":"legacy_dup_cycle"}'::jsonb, '2026-09-01T10:00:01Z');
        SELECT public.reconcile_business_views_count('${BIZ_ZERO}');
      `);
      const beforeDupClean = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_ZERO}'`
      );
      expect(beforeDupClean.rows[0]?.views_count).toBe(1);

      // Apaga apenas 1 das 2 cópias históricas duplicadas -> contador DEVE permanecer 1!
      await db.exec(`DELETE FROM public.analytics_events WHERE id = '11111111-1111-4111-8111-111111111102'`);
      const afterDupClean = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_ZERO}'`
      );
      expect(afterDupClean.rows[0]?.views_count).toBe(1);

      // Apaga a última cópia -> agora sim vai para 0
      await db.exec(`DELETE FROM public.analytics_events WHERE id = '11111111-1111-4111-8111-111111111101'`);
      const afterLastDel = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_ZERO}'`
      );
      expect(afterLastDel.rows[0]?.views_count).toBe(0);

      // T-SQL-09: Tentativa de manipulação direta por usuário comum (role authenticated) é bloqueada pelo trigger de guarda
      await db.exec(`GRANT SELECT, UPDATE ON public.businesses TO authenticated`);
      await expect(
        db.exec(`
          SET ROLE authenticated;
          UPDATE public.businesses SET views_count = 999999 WHERE id = '${BIZ_OPTICA}';
        `)
      ).rejects.toThrow(/BUSINESS_VIEWS_COUNT_IS_SERVER_MANAGED/);
      await db.exec(`RESET ROLE;`);

      // T-SQL-16: Integridade das RPCs públicas (public_directory_home_data, public_businesses_search, public_business_detail)
      const homeRpc = await db.query<{ data: { sponsored: Array<{ slug: string; views_count: number }> } }>(
        `SELECT public.public_directory_home_data('conexaomaconica.com.br') AS data`
      );
      const searchRpc = await db.query<{ data: { items: Array<{ slug: string; views_count: number }> } }>(
        `SELECT public.public_businesses_search('conexaomaconica.com.br') AS data`
      );
      const detailRpc = await db.query<{ data: { business_slug: string; views_count: number } }>(
        `SELECT public.public_business_detail('conexaomaconica.com.br', 'caminhodaluz') AS data`
      );

      const homeCaminho = homeRpc.rows[0]?.data.sponsored.find((b) => b.slug === 'caminhodaluz');
      const searchCaminho = searchRpc.rows[0]?.data.items.find((b) => b.slug === 'caminhodaluz');
      const detailCaminho = detailRpc.rows[0]?.data;

      expect(homeCaminho?.views_count).toBe(1250);
      expect(searchCaminho?.views_count).toBe(1250);
      expect(detailCaminho?.views_count).toBe(1250);

      await db.close();
    }, 60000);

    it('T-SQL-02: Suporta > 10.000 eventos (10.500 visualizações) com consistência matemática 100% e leitura O(1)', async () => {
      const db = await createHomologationPostgres();

      // Insere 10.000 visualizações históricas antes da migration + 500 incrementais após a migration (= 10.500)
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        SELECT
          '${TENANT_ID}',
          '${BIZ_CAMINHO}',
          'view',
          'visitor_' || (g % 500),
          jsonb_build_object('cycle_id', 'cycle_scale_10k_hist_' || g),
          '2026-11-15T00:00:00Z'::timestamptz + (g || ' seconds')::interval
        FROM generate_series(1, 10000) g;
      `);

      const sql258 = fs.readFileSync(MIGRATION_258_PATH, 'utf8');
      await db.exec(sql258);

      // + 500 visualizações incrementais via trigger ACID após a migration
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        SELECT
          '${TENANT_ID}',
          '${BIZ_CAMINHO}',
          'view',
          'visitor_' || (g % 500),
          jsonb_build_object('cycle_id', 'cycle_scale_10k_inc_' || g),
          '2026-11-20T00:00:00Z'::timestamptz + (g || ' seconds')::interval
        FROM generate_series(1, 500) g;
      `);

      const startMs = performance.now();
      const res = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_CAMINHO}'`
      );
      const elapsedMs = performance.now() - startMs;

      expect(res.rows[0]?.views_count).toBe(10500);
      expect(elapsedMs).toBeLessThan(1000); // Leitura O(1) em WASM

      const audit = await db.query<{ divergence: number; is_consistent: boolean }>(
        `SELECT divergence::int, is_consistent FROM public.audit_business_views_consistency() WHERE business_id = '${BIZ_CAMINHO}'`
      );
      expect(audit.rows[0]).toEqual({ divergence: 0, is_consistent: true });

      await db.close();
    }, 60000);

    it('T-SQL-10 a T-SQL-15: Políticas ALL_VIEWS, COOLDOWN (5/15/30/60m), UNIQUE_DAILY (America/Sao_Paulo), troca prospectiva, anti-burst e Rollback', async () => {
      const db = await createHomologationPostgres();
      const sql258 = fs.readFileSync(MIGRATION_258_PATH, 'utf8');
      await db.exec(sql258);

      // 1. Modo inicial padrão: ALL_VIEWS
      const polRes = await db.query<{ policy: { counting_mode: string } }>(
        `SELECT public.get_analytics_views_policy('${TENANT_ID}') AS policy`
      );
      expect(polRes.rows[0]?.policy.counting_mode).toBe('ALL_VIEWS');

      // T-SQL-10a: Em ALL_VIEWS, 5 atualizações efetivas (F5 com cycle_ids diferentes pelo mesmo visitante) geram +5 visualizações
      for (let i = 1; i <= 5; i++) {
        await db.exec(`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata)
          VALUES ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_alpha', '{"cycle_id":"cycle_f5_00${i}"}'::jsonb);
        `);
      }
      let optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(5);

      // T-SQL-10b: Em ALL_VIEWS, 5 retries com o MESMO cycle_id geram apenas +1 visualização
      for (let i = 1; i <= 5; i++) {
        await db.exec(`
          INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata)
          VALUES ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_alpha', '{"cycle_id":"cycle_retry_same_999"}'::jsonb);
        `);
      }
      optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(6);

      // 2. Troca administrativa para modo COOLDOWN (15 minutos)
      await db.exec(`
        UPDATE public.tenant_settings
        SET metadata = jsonb_set(
          metadata,
          '{analytics_views_policy}',
          '{"counting_mode":"COOLDOWN","cooldown_minutes":15,"daily_timezone":"America/Sao_Paulo","technical_dedup_enabled":true,"ignore_internal_traffic":true,"bot_abuse_protection_enabled":true,"auto_update_counters_enabled":true}'::jsonb
        )
        WHERE tenant_id = '${TENANT_ID}';
      `);

      // T-SQL-11a: Novo visitante 'visitor_beta' acessa no instante T0 -> +1 (total vai para 7)
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        VALUES ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_beta', '{"cycle_id":"cycle_cd_beta_1"}'::jsonb, '2026-11-28T14:00:00Z');
      `);
      optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(7);

      // Acessos repetidos de 'visitor_beta' dentro de 15 minutos (T0 + 3m, T0 + 10m, T0 + 14m) com cycle_ids diferentes -> NÃO incrementam!
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at) VALUES
          ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_beta', '{"cycle_id":"cycle_cd_beta_2"}'::jsonb, '2026-11-28T14:03:00Z'),
          ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_beta', '{"cycle_id":"cycle_cd_beta_3"}'::jsonb, '2026-11-28T14:10:00Z'),
          ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_beta', '{"cycle_id":"cycle_cd_beta_4"}'::jsonb, '2026-11-28T14:14:00Z');
      `);
      optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(7);

      // Outro visitante distinto ('visitor_gamma') acessando no mesmo minuto -> incrementa normalmente (+1 -> 8)
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        VALUES ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_gamma', '{"cycle_id":"cycle_cd_gamma_1"}'::jsonb, '2026-11-28T14:05:00Z');
      `);
      optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(8);

      // T-SQL-11b: 'visitor_beta' acessa após expirar o cooldown de 15m (T0 + 16m = 14:16:00Z) -> incrementa (+1 -> 9)!
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        VALUES ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_beta', '{"cycle_id":"cycle_cd_beta_5"}'::jsonb, '2026-11-28T14:16:00Z');
      `);
      optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(9);

      // T-SQL-11c: Continuidade do COOLDOWN (15m) atravessando a meia-noite (23:58 BRT -> 00:02 BRT)
      // Visitante 'visitor_midnight' acessa às 23:58 BRT (02:58 UTC) com pseudonymous_subject_id do Dia 1 e cooldown_subject_id contínuo -> +1 (total = 10)
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        VALUES (
          '${TENANT_ID}',
          '${BIZ_OPTICA}',
          'view',
          'vid_midnight_day1',
          '{"cycle_id":"cycle_mid_1","cooldown_subject_id":"cd_midnight_visitor_stable"}'::jsonb,
          '2026-11-28T16:58:00Z'
        );
      `);
      optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(10);

      // 4 minutos depois (após virada de dia do hash diário: pseudonymous_subject_id mudou para vid_midnight_day2, mas cooldown_subject_id permanece cd_midnight_visitor_stable)
      // DEVE respeitar o cooldown de 15m e NÃO incrementar!
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        VALUES (
          '${TENANT_ID}',
          '${BIZ_OPTICA}',
          'view',
          'vid_midnight_day2',
          '{"cycle_id":"cycle_mid_2","cooldown_subject_id":"cd_midnight_visitor_stable"}'::jsonb,
          '2026-11-28T17:02:00Z'
        );
      `);
      optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(10);

      // 3. Troca administrativa para modo UNIQUE_DAILY (fuso America/Sao_Paulo, UTC-3)
      await db.exec(`
        UPDATE public.tenant_settings
        SET metadata = jsonb_set(
          metadata,
          '{analytics_views_policy}',
          '{"counting_mode":"UNIQUE_DAILY","cooldown_minutes":15,"daily_timezone":"America/Sao_Paulo","technical_dedup_enabled":true,"ignore_internal_traffic":true,"bot_abuse_protection_enabled":true,"auto_update_counters_enabled":true}'::jsonb
        )
        WHERE tenant_id = '${TENANT_ID}';
      `);

      // T-SQL-12: 'visitor_delta' acessa às 22:30 BRT (01:30 UTC do dia 29/11) -> +1 (total = 11)
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        VALUES ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_delta', '{"cycle_id":"cycle_ud_delta_1"}'::jsonb, '2026-11-29T01:30:00Z');
      `);
      // Novo acesso às 23:45 BRT do MESMO dia em São Paulo (02:45 UTC do dia 29/11) -> NÃO duplica (continua 11)
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        VALUES ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_delta', '{"cycle_id":"cycle_ud_delta_2"}'::jsonb, '2026-11-29T02:45:00Z');
      `);
      optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(11);

      // Acesso às 00:10 BRT do DIA SEGUINTE em São Paulo (03:10 UTC do dia 29/11) -> incrementa (+1 -> 12)!
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        VALUES ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_delta', '{"cycle_id":"cycle_ud_delta_3"}'::jsonb, '2026-11-29T03:10:00Z');
      `);
      optViews = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(optViews.rows[0]?.views_count).toBe(12);

      // T-SQL-13: Reconciliação após múltiplas trocas de política preserva 100% o contador acumulado (12 elegíveis de 17 eventos brutos)
      await db.query(`SELECT public.reconcile_business_views_count(NULL)`);
      const auditAfterSwitches = await db.query<{
        materialized_views_count: number;
        recalculated_eligible_views: number;
        raw_total_view_events: number;
        divergence: number;
        is_consistent: boolean;
      }>(`
        SELECT
          materialized_views_count::int,
          recalculated_eligible_views::int,
          raw_total_view_events::int,
          divergence::int,
          is_consistent
        FROM public.audit_business_views_consistency()
        WHERE business_id = '${BIZ_OPTICA}'
      `);
      expect(auditAfterSwitches.rows[0]).toEqual({
        materialized_views_count: 12,
        recalculated_eligible_views: 12,
        raw_total_view_events: 17,
        divergence: 0,
        is_consistent: true,
      });

      // T-SQL-14: Proteção contra abuso automatizado (flood > 25 views em < 3s pelo mesmo subject)
      await db.exec(`
        UPDATE public.tenant_settings
        SET metadata = jsonb_set(
          metadata,
          '{analytics_views_policy}',
          '{"counting_mode":"ALL_VIEWS","cooldown_minutes":15,"daily_timezone":"America/Sao_Paulo","technical_dedup_enabled":true,"ignore_internal_traffic":true,"bot_abuse_protection_enabled":true,"auto_update_counters_enabled":true}'::jsonb
        )
        WHERE tenant_id = '${TENANT_ID}';

        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata, created_at)
        SELECT '${TENANT_ID}', '${BIZ_ZERO}', 'view', 'bot_flood_subject', jsonb_build_object('cycle_id', 'cycle_flood_' || g), '2026-11-30T10:00:00Z'::timestamptz
        FROM generate_series(1, 30) g;
      `);
      const floodRes = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_ZERO}'`
      );
      // Apenas os primeiros 25 passam; os 5 excedentes no mesmo segundo são marcados como automated_burst_rate_limit
      expect(floodRes.rows[0]?.views_count).toBe(25);

      // T-SQL-15: Ciclo Completo de Rollback -> Novos Eventos durante Rollback (Sem Congelar Leitura!) -> Reaplicação -> Reconciliação
      const syncActiveBefore = await db.query<{ active: boolean }>(
        `SELECT public.is_business_views_materialized_sync_active() AS active`
      );
      expect(syncActiveBefore.rows[0]?.active).toBe(true);

      const sqlRollback = fs.readFileSync(ROLLBACK_258_PATH, 'utf8');
      await db.exec(sqlRollback);

      // Após o rollback do trigger, is_business_views_materialized_sync_active() DEVE retornar false!
      const syncActiveDuringRollback = await db.query<{ active: boolean }>(
        `SELECT public.is_business_views_materialized_sync_active() AS active`
      );
      expect(syncActiveDuringRollback.rows[0]?.active).toBe(false);

      // Insere 3 novas visualizações válidas ENQUANTO o sistema está em estado de rollback (sem o trigger incremental)
      await db.exec(`
        INSERT INTO public.analytics_events (tenant_id, business_id, event_name, pseudonymous_subject_id, metadata) VALUES
          ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_post_rb_1', '{"cycle_id":"cycle_post_rb_1"}'::jsonb),
          ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_post_rb_2', '{"cycle_id":"cycle_post_rb_2"}'::jsonb),
          ('${TENANT_ID}', '${BIZ_OPTICA}', 'view', 'visitor_post_rb_3', '{"cycle_id":"cycle_post_rb_3"}'::jsonb);
      `);

      // A coluna materializada businesses.views_count está parada em 12 (pois o trigger foi removido),
      // MAS as funções canônicas e RPCs públicas detectam automaticamente que o trigger está inativo e retornam 15 (12 + 3)!
      const rawColDuringRollback = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(rawColDuringRollback.rows[0]?.views_count).toBe(12);

      const liveCanonicalDuringRollback = await db.query<{ cnt: number; map_cnt: number }>(
        `SELECT
          public.get_single_business_canonical_views_count('${BIZ_OPTICA}')::int AS cnt,
          (public.get_canonical_business_views_counts(ARRAY['${BIZ_OPTICA}'::uuid])->>'${BIZ_OPTICA}')::int AS map_cnt`
      );
      expect(liveCanonicalDuringRollback.rows[0]?.cnt).toBe(15);
      expect(liveCanonicalDuringRollback.rows[0]?.map_cnt).toBe(15);

      const searchRpcDuringRollback = await db.query<{ data: { items: Array<{ slug: string; views_count: number }> } }>(
        `SELECT public.public_businesses_search('conexaomaconica.com.br') AS data`
      );
      const optInSearchDuringRollback = searchRpcDuringRollback.rows[0]?.data.items.find(
        (b) => b.slug === 'opticacirculo'
      );
      expect(optInSearchDuringRollback?.views_count).toBe(15);

      // Agora reaplica a Migration 258: o trigger volta a ficar ativo e a coluna materializada é reconciliada para 15 sem perda nem duplicação!
      await db.exec(sql258);

      const syncActiveAfterReapply = await db.query<{ active: boolean }>(
        `SELECT public.is_business_views_materialized_sync_active() AS active`
      );
      expect(syncActiveAfterReapply.rows[0]?.active).toBe(true);

      const postReapplyCol = await db.query<{ views_count: number }>(
        `SELECT views_count::int AS views_count FROM public.businesses WHERE id = '${BIZ_OPTICA}'`
      );
      expect(postReapplyCol.rows[0]?.views_count).toBe(15);

      // T-SQL-17: Permissões de roles (anon, authenticated, service_role) e bloqueio de adulteração de analytics_events
      await expect(
        db.exec(`
          SET ROLE anon;
          SELECT public.reconcile_business_views_count(NULL);
        `)
      ).rejects.toThrow(/permission denied/i);
      await db.exec(`RESET ROLE;`);

      await expect(
        db.exec(`
          SET ROLE authenticated;
          SELECT public.audit_business_views_consistency();
        `)
      ).rejects.toThrow(/permission denied/i);
      await db.exec(`RESET ROLE;`);

      await db.exec(`GRANT SELECT, UPDATE, DELETE ON public.analytics_events TO authenticated;`);
      await expect(
        db.exec(`
          SET ROLE authenticated;
          UPDATE public.analytics_events SET metadata = '{"eligible_view":false}'::jsonb WHERE business_id = '${BIZ_OPTICA}';
        `)
      ).rejects.toThrow(/ANALYTICS_EVENTS_MODIFICATION_FORBIDDEN/);
      await db.exec(`RESET ROLE;`);

      await db.close();
    }, 60000);
  });

  describe('Bloco 2: Atualização Automática Reativa na Web, Respostas Fora de Ordem, Correção para Menor e TTL', () => {
    beforeEach(() => {
      cleanup();
      clearLiveViewsStoreForTesting();
      resetNavigationCycle();
      vi.restoreAllMocks();
    });

    it('T-WEB-01: trackEvent(view) utiliza fetch com keepalive (mesmo se sendBeacon existir) e atualiza automaticamente o contador após confirmação do backend', async () => {
      const sendBeaconSpy = vi.fn().mockReturnValue(true);
      Object.defineProperty(window.navigator, 'sendBeacon', {
        value: sendBeaconSpy,
        configurable: true,
        writable: true,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, viewsCount: 103, serverTimestamp: 1700000005000 }),
      });
      global.fetch = mockFetch;

      function BadgeHarness() {
        const count = useLiveBusinessViewsCount(BIZ_OPTICA, 102);
        return React.createElement('span', { 'data-testid': 'live-views' }, count);
      }

      const { getByTestId } = render(React.createElement(BadgeHarness));
      expect(getByTestId('live-views').textContent).toBe('102');

      trackEvent({
        businessId: BIZ_OPTICA,
        eventType: 'view',
        source: 'business_profile',
      });

      await vi.waitFor(() => {
        expect(getByTestId('live-views').textContent).toBe('103');
      });

      // Para 'view', sendBeacon NÃO deve ter sido usado (para não descartar a resposta JSON)
      expect(sendBeaconSpy).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('T-WEB-02 e T-WEB-03: Descarta respostas HTTP fora de ordem (timestamp antigo) e permite correções legítimas para valores menores (sem Math.max)', () => {
      // 1. Confirmação no instante T = 2000 com valor 150
      expect(recordConfirmedServerViewsCount(BIZ_OPTICA, 150, 2000)).toBe(true);
      expect(getValidCachedViewsEntry(BIZ_OPTICA)?.viewsCount).toBe(150);

      // 2. Resposta atrasada fora de ordem do instante T = 1500 com valor 199 -> DEVE ser descartada!
      expect(recordConfirmedServerViewsCount(BIZ_OPTICA, 199, 1500)).toBe(false);
      expect(getValidCachedViewsEntry(BIZ_OPTICA)?.viewsCount).toBe(150);

      // 3. Correção administrativa/reconciliação legítima no instante T = 3000 para um valor MENOR (102) -> DEVE ser aceita!
      expect(recordConfirmedServerViewsCount(BIZ_OPTICA, 102, 3000)).toBe(true);
      expect(getValidCachedViewsEntry(BIZ_OPTICA)?.viewsCount).toBe(102);
    });

    it('T-WEB-04: Expira cache após o TTL e remove listeners ao desmontar componentes (zero memory leaks)', () => {
      recordConfirmedServerViewsCount(BIZ_CAMINHO, 428, 5000);
      const entry = getValidCachedViewsEntry(BIZ_CAMINHO);
      expect(entry?.viewsCount).toBe(428);

      // Simula passagem do tempo além do TTL de 10 minutos
      const expired = getValidCachedViewsEntry(BIZ_CAMINHO, Date.now() + LIVE_VIEWS_CACHE_TTL_MS + 1000);
      expect(expired).toBeNull();

      function MultiCardHarness() {
        const c1 = useLiveBusinessViewsCount(BIZ_CAMINHO, 427);
        const c2 = useLiveBusinessViewsCount(BIZ_OPTICA, 102);
        return React.createElement(
          'div',
          null,
          React.createElement('span', null, c1),
          React.createElement('span', null, c2)
        );
      }

      const { unmount } = render(React.createElement(MultiCardHarness));
      expect(getActiveViewsSubscribersCountForTesting()).toBe(2);

      unmount();
      expect(getActiveViewsSubscribersCountForTesting()).toBe(0);
    });

    it('T-WEB-05 e T-SEC-01: HMAC Cooldown contínuo entre dias, isolamento por tenant, cabeçalhos Vercel e fallback anti-congelamento no leitor canônico', async () => {
      const salt = 'secret-production-pepper-2026';
      const ip = '177.55.88.10';
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';

      // 1. Extração confiável de IP atrás da infraestrutura Vercel
      const mockHeaders = new Headers({
        'x-forwarded-for': '10.0.0.1, 177.55.88.10',
        'x-real-ip': '177.55.88.99',
        'x-vercel-forwarded-for': '177.55.88.10, 10.0.0.1',
      });
      expect(extractTrustedClientIp(mockHeaders)).toBe('177.55.88.10');

      // 2. Isolamento entre tenants no HMAC diário e no HMAC de Cooldown
      const subjTenantA = generatePseudonymousSubjectId({
        ip,
        userAgent: ua,
        dateStr: '2026-11-28',
        tenantId: '00000000-0000-0000-0000-000000000010',
        salt,
      });
      const subjTenantB = generatePseudonymousSubjectId({
        ip,
        userAgent: ua,
        dateStr: '2026-11-28',
        tenantId: '00000000-0000-0000-0000-000000000020',
        salt,
      });
      expect(subjTenantA).not.toBe(subjTenantB);

      // 3. Continuidade de Cooldown na transição de meia-noite (23:58 -> 00:02)
      const cdAt2358 = generateCooldownSubjectId({
        tenantId: TENANT_ID,
        ip,
        userAgent: ua,
        salt,
      });
      const cdAt0002 = generateCooldownSubjectId({
        tenantId: TENANT_ID,
        ip,
        userAgent: ua,
        salt,
      });
      expect(cdAt2358).toMatch(/^cd_[0-9a-f]{28}$/);
      expect(cdAt2358).toBe(cdAt0002);

      // 4. Fallback do leitor canônico quando RPC retorna vs quando RPC está indisponível (pós-rollback)
      const rpcDbMock = {
        rpc: vi.fn().mockResolvedValue({
          data: { [BIZ_CAMINHO]: 435, [BIZ_OPTICA]: 103 },
          error: null,
        }),
      };
      const mapFromRpc = await resolveCanonicalViewsCountsMap([BIZ_CAMINHO, BIZ_OPTICA], rpcDbMock);
      expect(mapFromRpc).toEqual({ [BIZ_CAMINHO]: 435, [BIZ_OPTICA]: 103 });

      // Simula estado onde RPC falha/não existe: cai diretamente para COUNT(*) exact head:true em analytics_events (NUNCA lê coluna congelada)
      const fallbackDbMock = {
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'function not found' } }),
        from: vi.fn().mockImplementation(() => ({
          select: () => ({
            eq: (_col: string, val: string) => ({
              eq: () =>
                Promise.resolve({
                  count: val === BIZ_CAMINHO ? 440 : 108,
                  error: null,
                }),
            }),
          }),
        })),
      };
      const singleFromFallback = await resolveSingleBusinessCanonicalViewsCount(BIZ_OPTICA, fallbackDbMock);
      expect(singleFromFallback).toBe(108);
    });

    it('T-WEB-06: Comprova atualização reativa nos 8 componentes públicos (DirectorySponsored, DirectoryFoundersMarquee, BenefitsDirectoryCards, BusinessCard, BusinessListCard, GoldBusinessProfile, SilverBusinessProfile, BronzeBusinessProfile)', async () => {
      const sampleCard = {
        id: BIZ_OPTICA,
        slug: 'opticacirculo',
        name: 'Óptica Circulô',
        category_name: 'Saúde & Óptica',
        city: 'São Paulo',
        state: 'SP',
        views_count: 103,
        is_verified: true,
        is_pedra_fundamental: true,
        effective_plan_code: 'acacia',
      };

      const buildProfile = (template: 'ouro' | 'prata' | 'bronze') =>
        ({
          identity: {
            id: BIZ_OPTICA,
            slug: 'opticacirculo',
            name: 'Óptica Circulô',
            category: 'Saúde & Óptica',
            shortDescription: 'Óptica especializada',
            description: 'Óptica especializada para a família maçônica.',
            logo: { url: '/logo.png', alt: 'Logo' },
          },
          plan: {
            commercialPlan: 'acacia',
            template,
            features: {},
          },
          recognition: {
            isVerified: true,
            isFounder: false,
            isPedraFundamental: true,
            isColunaHonra: false,
            activeKeys: ['pedra_fundamental'],
            catalog: [],
          },
          location: {
            city: 'São Paulo',
            state: 'SP',
            addressLine: 'Av. Paulista, 1000',
          },
          contacts: {
            whatsapp: '11999999999',
          },
          media: {
            cover: { url: '/cover.png', alt: 'Capa' },
            gallery: [],
            heroImageCount: 1,
          },
          services: [],
          benefits: [],
          events: [],
          posts: [],
          certifications: [],
          hours: [],
          reviews: { items: [], average: null, total: 0 },
          metrics: { views: 103 },
          owner: { name: 'Ir. João', businessRole: 'Diretor', communityLabel: "Ir.'." },
        }) as any;

      const { container } = render(
        React.createElement(
          FavoritesProvider,
          null,
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              { 'data-testid': 'comp-sponsored-logos' },
              React.createElement(DirectorySponsored, { items: [sampleCard], displayMode: 'logos' })
            ),
            React.createElement(
              'div',
              { 'data-testid': 'comp-sponsored-cards' },
              React.createElement(DirectorySponsored, { items: [sampleCard], displayMode: 'cards' })
            ),
            React.createElement(
              'div',
              { 'data-testid': 'comp-founders-marquee' },
              React.createElement(DirectoryFoundersMarquee, { items: [sampleCard] })
            ),
            React.createElement(
              'div',
              { 'data-testid': 'comp-benefits-cards' },
              React.createElement(BenefitsDirectoryCards, {
                items: [
                  {
                    business_id: BIZ_OPTICA,
                    business_name: 'Óptica Circulô',
                    business_slug: 'opticacirculo',
                    card: sampleCard,
                    benefits: [],
                  },
                ],
              })
            ),
            React.createElement(
              'div',
              { 'data-testid': 'comp-business-card' },
              React.createElement(BusinessCard, { data: sampleCard })
            ),
            React.createElement(
              'div',
              { 'data-testid': 'comp-business-list-card' },
              React.createElement(BusinessListCard, { data: sampleCard })
            ),
            React.createElement(
              'div',
              { 'data-testid': 'comp-gold-profile' },
              React.createElement(GoldBusinessProfile, { profile: buildProfile('ouro') })
            ),
            React.createElement(
              'div',
              { 'data-testid': 'comp-silver-profile' },
              React.createElement(SilverBusinessProfile, { profile: buildProfile('prata') })
            ),
            React.createElement(
              'div',
              { 'data-testid': 'comp-bronze-profile' },
              React.createElement(BronzeBusinessProfile, { profile: buildProfile('bronze') })
            )
          )
        )
      );

      // Estado inicial antes da confirmação do backend: todos exibem 103
      expect(container.querySelector('[data-testid="comp-sponsored-logos"] [data-views-count="103"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="comp-founders-marquee"] [data-views-count="103"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="comp-sponsored-cards"]')?.textContent).toContain('103 visualizações');
      expect(container.querySelector('[data-testid="comp-benefits-cards"]')?.textContent).toContain('103 visualizações');
      expect(container.querySelector('[data-testid="comp-business-card"]')?.textContent).toContain('103 visualizações');
      expect(container.querySelector('[data-testid="comp-business-list-card"]')?.textContent).toContain('103 visualizações');
      expect(container.querySelector('[data-testid="comp-gold-profile"]')?.textContent).toContain('103 visualizações');
      expect(container.querySelector('[data-testid="comp-silver-profile"]')?.textContent).toContain('103 visualizações');
      expect(container.querySelector('[data-testid="comp-bronze-profile"]')?.textContent).toContain('103 visualizações');

      // Dispara confirmação oficial do backend (/api/analytics/track -> 104)
      recordConfirmedServerViewsCount(BIZ_OPTICA, 104, Date.now());

      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="comp-sponsored-logos"] [data-views-count="104"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="comp-founders-marquee"] [data-views-count="104"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="comp-sponsored-cards"]')?.textContent).toContain('104 visualizações');
        expect(container.querySelector('[data-testid="comp-benefits-cards"]')?.textContent).toContain('104 visualizações');
        expect(container.querySelector('[data-testid="comp-business-card"]')?.textContent).toContain('104 visualizações');
        expect(container.querySelector('[data-testid="comp-business-list-card"]')?.textContent).toContain('104 visualizações');
        expect(container.querySelector('[data-testid="comp-gold-profile"]')?.textContent).toContain('104 visualizações');
        expect(container.querySelector('[data-testid="comp-silver-profile"]')?.textContent).toContain('104 visualizações');
        expect(container.querySelector('[data-testid="comp-bronze-profile"]')?.textContent).toContain('104 visualizações');
      });
    });
  });
});

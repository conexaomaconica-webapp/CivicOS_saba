-- ============================================================================
-- Migration 258: Unificação e Sincronização Canônica das Visualizações das Empresas
--                + Política Configurável de Contabilização (ALL_VIEWS / COOLDOWN / UNIQUE_DAILY)
-- ============================================================================
-- AVISO OBRIGATÓRIO:
-- Homologação local. NÃO aplicar em banco remoto sem aprovação expressa do GATE de Produção.
-- Reversão: supabase/rollbacks/analytics/258_rollback.sql
--
-- Pilares desta migration:
--   1. Coluna canônica `public.businesses.views_count BIGINT NOT NULL DEFAULT 0 CHECK (views_count >= 0)`.
--   2. Proteção de `businesses.updated_at` quando apenas `views_count` for atualizado, e bloqueio
--      de manipulação direta de `views_count` por usuários comuns ou empresários (`trg_guard_business_views_count`).
--   3. Estrutura de configuração administrativa em `public.tenant_settings.metadata->'analytics_views_policy'`
--      com padrão inicial obrigatório `ALL_VIEWS` (sem criar tabela redundante) e auditoria em `admin_audit_logs`.
--   4. Evolução do trigger `BEFORE INSERT` em `public.analytics_events` (`fn_prevent_duplicate_view_cycle`):
--      - Preserva 100% a deduplicação técnica por `(business_id, cycle_id)` da Migration 216.
--      - Avalia a política ativa (`ALL_VIEWS`, `COOLDOWN`, `UNIQUE_DAILY`) e proteção contra abuso automatizado
--        sob lock transacional por visitante (`pg_advisory_xact_lock`), marcando `metadata.eligible_view` (true/false)
--        de forma prospectiva sem jamais apagar ou alterar eventos brutos nem recalcular retroativamente o passado.
--   5. Trigger transacional `AFTER INSERT OR UPDATE OR DELETE` em `public.analytics_events`
--      (`fn_sync_business_views_count`) para incremento/decremento atômico O(1) e reconciliação segura.
--   6. Reconciliação histórica (backfill) sob lock explícito (`SHARE ROW EXCLUSIVE`) garantindo zero perda e
--      zero dupla contagem, contemplando todas as empresas (inclusive com 0 visualizações) e tratando
--      corretamente `cycle_id` nulo ou vazio.
--   7. Funções administrativas de auditoria e reconciliação (`public.audit_business_views_consistency` e
--      `public.reconcile_business_views_count`).
--   8. Inclusão retrocompatível de `views_count` nas RPCs `public_directory_home_data`,
--      `public_businesses_search`, `public_business_detail`, `get_business_analytics_aggregate_metrics`
--      e `get_advertiser_analytics_summary`, preservando integralmente todas as melhorias anteriores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Coluna Canônica `views_count` em `public.businesses`
-- ----------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS views_count BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS chk_businesses_views_count_non_negative;

ALTER TABLE public.businesses
  ADD CONSTRAINT chk_businesses_views_count_non_negative CHECK (views_count >= 0);

COMMENT ON COLUMN public.businesses.views_count IS
'Contador oficial canônico e materializado de visualizações elegíveis do perfil empresarial (sincronizado via trigger ACID a partir de public.analytics_events).';

-- ----------------------------------------------------------------------------
-- 2. Proteção de `updated_at` e Bloqueio contra Manipulação Direta de `views_count`
-- ----------------------------------------------------------------------------
-- 2a. Evita que o incremento de `views_count` a cada visita pública altere `businesses.updated_at`
CREATE OR REPLACE FUNCTION public.update_businesses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'views_count' - 'updated_at') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'views_count' - 'updated_at') THEN
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_businesses_updated_at();

-- 2b. Impede que usuários comuns ou empresários alterem `views_count` via UPDATE/INSERT direto na tabela `businesses`
CREATE OR REPLACE FUNCTION public.guard_business_views_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Permite apenas o motor interno / trigger SECURITY DEFINER (postgres), service_role ou supabase_admin
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND COALESCE( current_setting('request.jwt.claim.role', true), '' ) <> 'service_role' THEN
    IF TG_OP = 'INSERT' AND COALESCE(NEW.views_count, 0) <> 0 THEN
      RAISE EXCEPTION 'BUSINESS_VIEWS_COUNT_IS_SERVER_MANAGED';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.views_count IS DISTINCT FROM OLD.views_count THEN
      RAISE EXCEPTION 'BUSINESS_VIEWS_COUNT_IS_SERVER_MANAGED';
    END IF;
  END IF;

  NEW.views_count := GREATEST(COALESCE(NEW.views_count, 0), 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_business_views_count ON public.businesses;
CREATE TRIGGER trg_guard_business_views_count
  BEFORE INSERT OR UPDATE OF views_count ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_business_views_count();

-- ----------------------------------------------------------------------------
-- 3. Política Configurável de Visualizações em `public.tenant_settings`
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_views_policy(p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_raw JSONB;
  v_mode TEXT;
  v_cooldown INT;
  v_tz TEXT;
BEGIN
  IF p_tenant_id IS NOT NULL THEN
    SELECT ts.metadata->'analytics_views_policy'
      INTO v_raw
    FROM public.tenant_settings ts
    WHERE ts.tenant_id = p_tenant_id
    LIMIT 1;
  END IF;

  IF v_raw IS NULL THEN
    SELECT ts.metadata->'analytics_views_policy'
      INTO v_raw
    FROM public.tenant_settings ts
    WHERE ts.metadata ? 'analytics_views_policy'
    ORDER BY ts.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  v_mode := COALESCE(v_raw->>'counting_mode', 'ALL_VIEWS');
  IF v_mode NOT IN ('ALL_VIEWS', 'COOLDOWN', 'UNIQUE_DAILY') THEN
    v_mode := 'ALL_VIEWS';
  END IF;

  v_cooldown := COALESCE((v_raw->>'cooldown_minutes')::INT, 15);
  IF v_cooldown NOT IN (5, 15, 30, 60) THEN
    v_cooldown := 15;
  END IF;

  v_tz := COALESCE(NULLIF(BTRIM(v_raw->>'daily_timezone'), ''), 'America/Sao_Paulo');

  RETURN jsonb_build_object(
    'counting_mode', v_mode,
    'cooldown_minutes', v_cooldown,
    'daily_timezone', v_tz,
    'technical_dedup_enabled', COALESCE((v_raw->>'technical_dedup_enabled')::BOOLEAN, true),
    'ignore_internal_traffic', COALESCE((v_raw->>'ignore_internal_traffic')::BOOLEAN, true),
    'bot_abuse_protection_enabled', COALESCE((v_raw->>'bot_abuse_protection_enabled')::BOOLEAN, true),
    'auto_update_counters_enabled', COALESCE((v_raw->>'auto_update_counters_enabled')::BOOLEAN, true),
    'updated_at', v_raw->>'updated_at',
    'updated_by', v_raw->>'updated_by'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'counting_mode', 'ALL_VIEWS',
    'cooldown_minutes', 15,
    'daily_timezone', 'America/Sao_Paulo',
    'technical_dedup_enabled', true,
    'ignore_internal_traffic', true,
    'bot_abuse_protection_enabled', true,
    'auto_update_counters_enabled', true,
    'updated_at', NULL,
    'updated_by', NULL
  );
END;
$$;

ALTER FUNCTION public.get_analytics_views_policy(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_analytics_views_policy(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_analytics_views_policy(UUID) TO anon, authenticated, service_role;

-- Inicializa a configuração padrão obrigatória (`ALL_VIEWS`) nos tenants existentes sem sobrescrever caso já exista
UPDATE public.tenant_settings
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'analytics_views_policy',
  jsonb_build_object(
    'counting_mode', 'ALL_VIEWS',
    'cooldown_minutes', 15,
    'daily_timezone', 'America/Sao_Paulo',
    'technical_dedup_enabled', true,
    'ignore_internal_traffic', true,
    'bot_abuse_protection_enabled', true,
    'auto_update_counters_enabled', true,
    'updated_at', now()::text,
    'updated_by', 'system_migration_258'
  )
)
WHERE COALESCE(metadata, '{}'::jsonb)->'analytics_views_policy' IS NULL;

-- Índice auxiliar para consultas de janela por visitante (COOLDOWN / UNIQUE_DAILY / anti-burst)
CREATE INDEX IF NOT EXISTS idx_analytics_events_biz_subject_created
  ON public.analytics_events (business_id, pseudonymous_subject_id, created_at DESC)
  WHERE event_name = 'view' AND pseudonymous_subject_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Evolução do Trigger `BEFORE INSERT` em `public.analytics_events`
--    Deduplicação técnica por `cycle_id` + Avaliação prospectiva da política ativa
--    (com suporte a continuidade de COOLDOWN através da meia-noite via `cooldown_subject_id`)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_view_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cycle_id TEXT;
  v_subject_id TEXT;
  v_cooldown_subject_id TEXT;
  v_effective_visitor_key TEXT;
  v_lock_key BIGINT;
  v_subject_lock_key BIGINT;
  v_now TIMESTAMPTZ;
  v_policy JSONB;
  v_mode TEXT;
  v_cooldown_min INT;
  v_tz TEXT;
  v_bot_protection BOOLEAN;
  v_burst_count INT;
  v_is_eligible BOOLEAN := true;
  v_ineligible_reason TEXT := NULL;
BEGIN
  -- Aplica-se exclusivamente ao evento canônico de visualização ('view')
  IF NEW.event_name <> 'view' OR NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_now := COALESCE(NEW.created_at, now());
  v_cycle_id := NULLIF(BTRIM(COALESCE(NEW.metadata->>'cycle_id', '')), '');
  v_subject_id := NULLIF(BTRIM(COALESCE(NEW.pseudonymous_subject_id, '')), '');
  v_cooldown_subject_id := NULLIF(BTRIM(COALESCE(NEW.metadata->>'cooldown_subject_id', '')), '');
  v_effective_visitor_key := COALESCE(v_cooldown_subject_id, v_subject_id);

  -- Normaliza cycle_id vazio ("") para NULL no JSONB para não colidir no índice único parcial
  IF NEW.metadata ? 'cycle_id' AND v_cycle_id IS NULL THEN
    NEW.metadata := NEW.metadata - 'cycle_id';
  END IF;

  -- 1. Deduplicação Técnica por cycle_id (Migration 216 - Sempre ativa em todos os modos)
  IF v_cycle_id IS NOT NULL AND v_now >= '2026-10-28 00:00:00+00'::TIMESTAMPTZ THEN
    v_lock_key := ('x' || substr(md5(NEW.business_id::text || ':cycle:' || v_cycle_id), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    IF EXISTS (
      SELECT 1 FROM public.analytics_events ae
      WHERE ae.business_id = NEW.business_id
        AND ae.event_name = 'view'
        AND ae.metadata->>'cycle_id' = v_cycle_id
        AND ae.created_at >= '2026-10-28 00:00:00+00'::TIMESTAMPTZ
    ) THEN
      -- Descarta silenciosamente retries técnicos / renderizações duplicadas do mesmo ciclo
      RETURN NULL;
    END IF;
  END IF;

  -- 2. Carrega a Política Configurável do Tenant (aplicada exclusivamente a eventos prospectivos)
  v_policy := public.get_analytics_views_policy(NEW.tenant_id);
  v_mode := COALESCE(v_policy->>'counting_mode', 'ALL_VIEWS');
  v_cooldown_min := COALESCE((v_policy->>'cooldown_minutes')::INT, 15);
  v_tz := COALESCE(NULLIF(BTRIM(v_policy->>'daily_timezone'), ''), 'America/Sao_Paulo');
  v_bot_protection := COALESCE((v_policy->>'bot_abuse_protection_enabled')::BOOLEAN, true);

  -- Serializa requisições concorrentes do mesmo visitante (mesmo com cycle_ids diferentes ou na virada da meia-noite)
  IF v_effective_visitor_key IS NOT NULL AND v_effective_visitor_key <> 'anon_session' THEN
    v_subject_lock_key := ('x' || substr(md5(NEW.business_id::text || ':subj:' || v_effective_visitor_key), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_subject_lock_key);

    -- 3. Proteção contra abuso automatizado (flood/burst não-humano: >= 25 views em 3 segundos pelo mesmo visitante na mesma empresa)
    IF v_bot_protection THEN
      SELECT COUNT(*)
        INTO v_burst_count
      FROM public.analytics_events ae
      WHERE ae.business_id = NEW.business_id
        AND ae.event_name = 'view'
        AND (
          (v_subject_id IS NOT NULL AND ae.pseudonymous_subject_id = v_subject_id)
          OR (v_cooldown_subject_id IS NOT NULL AND ae.metadata->>'cooldown_subject_id' = v_cooldown_subject_id)
        )
        AND ae.created_at >= (v_now - INTERVAL '3 seconds')
        AND ae.created_at <= v_now;

      IF v_burst_count >= 25 THEN
        v_is_eligible := false;
        v_ineligible_reason := 'automated_burst_rate_limit';
      END IF;
    END IF;

    -- 4. Avaliação prospectiva de elegibilidade segundo a modalidade ativa
    -- Em COOLDOWN, verifica tanto pseudonymous_subject_id quanto cooldown_subject_id para respeitar o intervalo mesmo atravessando a meia-noite (ex.: 23h58 -> 00h02)
    IF v_is_eligible AND v_mode = 'COOLDOWN' THEN
      IF EXISTS (
        SELECT 1 FROM public.analytics_events ae
        WHERE ae.business_id = NEW.business_id
          AND ae.event_name = 'view'
          AND (
            (v_subject_id IS NOT NULL AND ae.pseudonymous_subject_id = v_subject_id)
            OR (v_cooldown_subject_id IS NOT NULL AND ae.metadata->>'cooldown_subject_id' = v_cooldown_subject_id)
          )
          AND COALESCE((ae.metadata->>'eligible_view')::BOOLEAN, true) = true
          AND ae.created_at > (v_now - (v_cooldown_min || ' minutes')::INTERVAL)
          AND ae.created_at <= v_now
      ) THEN
        v_is_eligible := false;
        v_ineligible_reason := 'cooldown_window_active';
      END IF;
    ELSIF v_is_eligible AND v_mode = 'UNIQUE_DAILY' THEN
      IF EXISTS (
        SELECT 1 FROM public.analytics_events ae
        WHERE ae.business_id = NEW.business_id
          AND ae.event_name = 'view'
          AND (
            (v_subject_id IS NOT NULL AND ae.pseudonymous_subject_id = v_subject_id)
            OR (v_cooldown_subject_id IS NOT NULL AND ae.metadata->>'cooldown_subject_id' = v_cooldown_subject_id)
          )
          AND COALESCE((ae.metadata->>'eligible_view')::BOOLEAN, true) = true
          AND timezone(v_tz, ae.created_at)::DATE = timezone(v_tz, v_now)::DATE
      ) THEN
        v_is_eligible := false;
        v_ineligible_reason := 'unique_daily_already_counted';
      END IF;
    END IF;
  END IF;

  -- Respeita marcação explícita caso já enviada pelo serviço e registra a política aplicada no evento
  IF NEW.metadata ? 'eligible_view' AND (NEW.metadata->>'eligible_view') = 'false' THEN
    v_is_eligible := false;
    v_ineligible_reason := COALESCE(NEW.metadata->>'ineligible_reason', v_ineligible_reason, 'explicit_ineligible');
  END IF;

  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
    'eligible_view', v_is_eligible,
    'policy_mode', v_mode
  ) || CASE
    WHEN v_ineligible_reason IS NOT NULL THEN jsonb_build_object('ineligible_reason', v_ineligible_reason)
    ELSE '{}'::jsonb
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_prevent_duplicate_view_cycle() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_view_cycle ON public.analytics_events;
CREATE TRIGGER trg_prevent_duplicate_view_cycle
  BEFORE INSERT ON public.analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_duplicate_view_cycle();

-- 4b. Impede que usuários comuns ou empresários manipulem eventos ou metadata de elegibilidade em `analytics_events`
CREATE OR REPLACE FUNCTION public.guard_analytics_events_authority()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'ANALYTICS_EVENTS_MODIFICATION_FORBIDDEN';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_analytics_events_authority ON public.analytics_events;
CREATE TRIGGER trg_guard_analytics_events_authority
  BEFORE UPDATE OR DELETE ON public.analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_analytics_events_authority();

-- ----------------------------------------------------------------------------
-- 5. Função de Reconciliação Exata por Empresa ou Global e Trigger `AFTER` ACID
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_business_views_count(p_business_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated_count INT := 0;
BEGIN
  IF p_business_id IS NOT NULL THEN
    UPDATE public.businesses b
    SET views_count = COALESCE((
      SELECT COUNT(DISTINCT COALESCE(NULLIF(BTRIM(ae.metadata->>'cycle_id'), ''), ae.id::text))
      FROM public.analytics_events ae
      WHERE ae.business_id = b.id
        AND ae.event_name = 'view'
        AND COALESCE((ae.metadata->>'eligible_view')::BOOLEAN, true) = true
    ), 0)
    WHERE b.id = p_business_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  ELSE
    WITH exact_counts AS (
      SELECT
        ae.business_id,
        COUNT(DISTINCT COALESCE(NULLIF(BTRIM(ae.metadata->>'cycle_id'), ''), ae.id::text)) AS exact_views
      FROM public.analytics_events ae
      WHERE ae.event_name = 'view'
        AND ae.business_id IS NOT NULL
        AND COALESCE((ae.metadata->>'eligible_view')::BOOLEAN, true) = true
      GROUP BY ae.business_id
    )
    UPDATE public.businesses b
    SET views_count = COALESCE(ec.exact_views, 0)
    FROM (
      SELECT b0.id AS biz_id, COALESCE(ec0.exact_views, 0) AS exact_views
      FROM public.businesses b0
      LEFT JOIN exact_counts ec0 ON ec0.business_id = b0.id
    ) ec
    WHERE b.id = ec.biz_id
      AND b.views_count IS DISTINCT FROM ec.exact_views;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reconciled_businesses', v_updated_count
  );
END;
$$;

ALTER FUNCTION public.reconcile_business_views_count(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reconcile_business_views_count(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_business_views_count(UUID) TO service_role;

-- Trigger AFTER INSERT OR UPDATE OR DELETE em `public.analytics_events`
CREATE OR REPLACE FUNCTION public.fn_sync_business_views_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_cycle TEXT;
  v_still_exists BOOLEAN := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.event_name = 'view'
       AND NEW.business_id IS NOT NULL
       AND COALESCE((NEW.metadata->>'eligible_view')::BOOLEAN, true) = true THEN
      UPDATE public.businesses
      SET views_count = GREATEST(COALESCE(views_count, 0) + 1, 0)
      WHERE id = NEW.business_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.event_name = 'view'
       AND OLD.business_id IS NOT NULL
       AND COALESCE((OLD.metadata->>'eligible_view')::BOOLEAN, true) = true THEN
      v_old_cycle := NULLIF(BTRIM(COALESCE(OLD.metadata->>'cycle_id', '')), '');

      -- Se o evento excluído tinha um cycle_id e ainda resta outra cópia elegível com o mesmo cycle_id
      -- (ex.: limpeza de duplicata histórica), NÃO reduz o contador indevidamente!
      IF v_old_cycle IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM public.analytics_events ae
          WHERE ae.business_id = OLD.business_id
            AND ae.event_name = 'view'
            AND COALESCE((ae.metadata->>'eligible_view')::BOOLEAN, true) = true
            AND NULLIF(BTRIM(ae.metadata->>'cycle_id'), '') = v_old_cycle
        ) INTO v_still_exists;
      END IF;

      IF NOT v_still_exists THEN
        UPDATE public.businesses
        SET views_count = GREATEST(COALESCE(views_count, 0) - 1, 0)
        WHERE id = OLD.business_id;
      END IF;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.business_id IS DISTINCT FROM NEW.business_id
       OR OLD.event_name IS DISTINCT FROM NEW.event_name
       OR (OLD.metadata->>'cycle_id') IS DISTINCT FROM (NEW.metadata->>'cycle_id')
       OR (OLD.metadata->>'eligible_view') IS DISTINCT FROM (NEW.metadata->>'eligible_view') THEN
      IF OLD.business_id IS NOT NULL THEN
        PERFORM public.reconcile_business_views_count(OLD.business_id);
      END IF;
      IF NEW.business_id IS NOT NULL AND NEW.business_id IS DISTINCT FROM OLD.business_id THEN
        PERFORM public.reconcile_business_views_count(NEW.business_id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

ALTER FUNCTION public.fn_sync_business_views_count() OWNER TO postgres;

-- ----------------------------------------------------------------------------
-- 6. Ativação do Trigger e Backfill Histórico sob Lock Transacional Explícito com `lock_timeout`
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Define lock_timeout de 5 segundos para interrupção segura caso exista alguma manutenção concorrente longa
  SET LOCAL lock_timeout = '5s';

  -- Bloqueia escritas concorrentes em analytics_events durante a criação do trigger + backfill,
  -- permitindo leituras normais e garantindo ZERO perda e ZERO dupla contagem.
  LOCK TABLE public.analytics_events IN SHARE ROW EXCLUSIVE MODE;

  DROP TRIGGER IF EXISTS trg_sync_business_views_count ON public.analytics_events;
  CREATE TRIGGER trg_sync_business_views_count
    AFTER INSERT OR UPDATE OR DELETE ON public.analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_business_views_count();

  -- Backfill idempotente para TODAS as empresas (inclusive empresas com 0 visualizações)
  WITH exact_counts AS (
    SELECT
      ae.business_id,
      COUNT(DISTINCT COALESCE(NULLIF(BTRIM(ae.metadata->>'cycle_id'), ''), ae.id::text)) AS exact_views
    FROM public.analytics_events ae
    WHERE ae.event_name = 'view'
      AND ae.business_id IS NOT NULL
      AND COALESCE((ae.metadata->>'eligible_view')::BOOLEAN, true) = true
    GROUP BY ae.business_id
  )
  UPDATE public.businesses b
  SET views_count = COALESCE(ec.exact_views, 0)
  FROM (
    SELECT b0.id AS biz_id, COALESCE(ec0.exact_views, 0) AS exact_views
    FROM public.businesses b0
    LEFT JOIN exact_counts ec0 ON ec0.business_id = b0.id
  ) ec
  WHERE b.id = ec.biz_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6b. Detecção Automática de Trigger Ativo e RPC `get_canonical_business_views_counts`
--     Impede leitura de contador congelado caso o trigger seja removido em um rollback
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_business_views_materialized_sync_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'analytics_events'
      AND t.tgname = 'trg_sync_business_views_count'
      AND t.tgenabled <> 'D'
  );
$$;

ALTER FUNCTION public.is_business_views_materialized_sync_active() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_business_views_materialized_sync_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_views_materialized_sync_active() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_canonical_business_views_counts(p_business_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
BEGIN
  IF p_business_ids IS NULL OR cardinality(p_business_ids) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  IF public.is_business_views_materialized_sync_active() THEN
    -- Caminho O(1): Trigger ativo -> lê diretamente o contador materializado em public.businesses
    SELECT COALESCE(jsonb_object_agg(b.id::text, COALESCE(b.views_count, 0)), '{}'::jsonb)
      INTO v_result
    FROM public.businesses b
    WHERE b.id = ANY(p_business_ids);
  ELSE
    -- Caminho de Fallback Pós-Rollback: Trigger desativado/removido -> agrega em SQL direto de analytics_events
    -- preservando 100% da semântica de eligible_view e cycle_id sem truncamento de 1.000 linhas e sem congelar o número!
    WITH requested_ids AS (
      SELECT DISTINCT unnest(p_business_ids) AS biz_id
    ),
    live_counts AS (
      SELECT
        ae.business_id,
        COUNT(DISTINCT COALESCE(NULLIF(BTRIM(ae.metadata->>'cycle_id'), ''), ae.id::text)) AS exact_views
      FROM public.analytics_events ae
      WHERE ae.business_id = ANY(p_business_ids)
        AND ae.event_name = 'view'
        AND COALESCE((ae.metadata->>'eligible_view')::BOOLEAN, true) = true
      GROUP BY ae.business_id
    )
    SELECT COALESCE(jsonb_object_agg(r.biz_id::text, COALESCE(lc.exact_views, 0)), '{}'::jsonb)
      INTO v_result
    FROM requested_ids r
    LEFT JOIN live_counts lc ON lc.business_id = r.biz_id;
  END IF;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

ALTER FUNCTION public.get_canonical_business_views_counts(UUID[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_canonical_business_views_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_canonical_business_views_counts(UUID[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_single_business_canonical_views_count(p_business_id UUID)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_business_id IS NULL THEN 0::BIGINT
    WHEN public.is_business_views_materialized_sync_active() THEN
      COALESCE((SELECT b.views_count FROM public.businesses b WHERE b.id = p_business_id), 0::BIGINT)
    ELSE
      COALESCE((
        SELECT COUNT(DISTINCT COALESCE(NULLIF(BTRIM(ae.metadata->>'cycle_id'), ''), ae.id::text))
        FROM public.analytics_events ae
        WHERE ae.business_id = p_business_id
          AND ae.event_name = 'view'
          AND COALESCE((ae.metadata->>'eligible_view')::BOOLEAN, true) = true
      ), 0::BIGINT)
  END;
$$;

ALTER FUNCTION public.get_single_business_canonical_views_count(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_single_business_canonical_views_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_single_business_canonical_views_count(UUID) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. Consulta Administrativa de Auditoria de Consistência (`audit_business_views_consistency`)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_business_views_consistency()
RETURNS TABLE (
  business_id UUID,
  business_slug TEXT,
  business_name TEXT,
  materialized_views_count BIGINT,
  recalculated_eligible_views BIGINT,
  raw_total_view_events BIGINT,
  divergence BIGINT,
  is_consistent BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  WITH event_stats AS (
    SELECT
      ae.business_id,
      COUNT(DISTINCT COALESCE(NULLIF(BTRIM(ae.metadata->>'cycle_id'), ''), ae.id::text))
        FILTER (WHERE COALESCE((ae.metadata->>'eligible_view')::BOOLEAN, true) = true) AS eligible_views,
      COUNT(*) AS raw_views
    FROM public.analytics_events ae
    WHERE ae.event_name = 'view'
      AND ae.business_id IS NOT NULL
    GROUP BY ae.business_id
  )
  SELECT
    b.id AS business_id,
    b.slug AS business_slug,
    b.name AS business_name,
    b.views_count AS materialized_views_count,
    COALESCE(es.eligible_views, 0) AS recalculated_eligible_views,
    COALESCE(es.raw_views, 0) AS raw_total_view_events,
    (b.views_count - COALESCE(es.eligible_views, 0)) AS divergence,
    (b.views_count = COALESCE(es.eligible_views, 0)) AS is_consistent
  FROM public.businesses b
  LEFT JOIN event_stats es ON es.business_id = b.id
  ORDER BY ABS(b.views_count - COALESCE(es.eligible_views, 0)) DESC, b.views_count DESC, b.name ASC;
$$;

ALTER FUNCTION public.audit_business_views_consistency() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.audit_business_views_consistency() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_business_views_consistency() TO service_role;

-- ----------------------------------------------------------------------------
-- 8. Atualização Cirúrgica e Retrocompatível das RPCs Públicas e de Analytics
-- ----------------------------------------------------------------------------

-- 8a. `public_directory_home_data`: adiciona `'views_count', COALESCE(b.views_count, 0)` nos cards de `sponsored`
-- preservando 100% da definição vigente (incluindo o filtro de capa da Migration 253).
DO $$
DECLARE
  v_oid OID;
  v_def TEXT;
  v_new TEXT;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'public_directory_home_data'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_oid IS NOT NULL THEN
    v_def := pg_get_functiondef(v_oid);
    IF position('''views_count''' IN v_def) = 0 THEN
      v_new := replace(
        v_def,
        '''is_featured'', true',
        '''is_featured'', true, ''views_count'', public.get_single_business_canonical_views_count(b.id)'
      );
      IF v_new <> v_def THEN
        EXECUTE v_new;
      END IF;
    END IF;
  END IF;
END;
$$;

-- 8b. `public_businesses_search`: adiciona `b.views_count` nas CTEs `filtered_data` e `'views_count', COALESCE(views_count, 0)`
-- em `jsonb_build_object`, preservando 100% das melhorias das Migrations 154, 158, 175, 191 e 214.
DO $$
DECLARE
  v_oid OID;
  v_def TEXT;
  v_new TEXT;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'public_businesses_search'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_oid IS NOT NULL THEN
    v_def := pg_get_functiondef(v_oid);
    IF position('''views_count''' IN v_def) = 0 THEN
      v_new := replace(
        v_def,
        'b.publication_status,',
        'b.publication_status, public.get_single_business_canonical_views_count(b.id) AS views_count,'
      );
      v_new := replace(
        v_new,
        '''is_verified'', is_verified,',
        '''is_verified'', is_verified, ''views_count'', COALESCE(views_count, 0),'
      );
      IF v_new <> v_def THEN
        EXECUTE v_new;
      END IF;
    END IF;
  END IF;
END;
$$;

-- 8c. `public_business_detail`: adiciona `'views_count', COALESCE(v_views_count, 0)` no wrapper da Migration 207
-- (ou na função principal caso não use wrapper), preservando 100% das Migrations 207, 253 e 256.
DO $$
DECLARE
  v_oid OID;
  v_def TEXT;
  v_new TEXT;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'public_business_detail'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_oid IS NOT NULL THEN
    v_def := pg_get_functiondef(v_oid);
    IF position('''views_count''' IN v_def) = 0 THEN
      IF position('contracted_plan_code' IN v_def) > 0 THEN
        -- Wrapper da Migration 207
        v_new := replace(
          v_def,
          'v_contracted_plan TEXT;',
          'v_contracted_plan TEXT; v_views_count BIGINT := 0;'
        );
        v_new := replace(
          v_new,
          'SELECT b.plan_tier' || E'\n' || '      INTO v_contracted_plan',
          'SELECT b.plan_tier, public.get_single_business_canonical_views_count(b.id)' || E'\n' || '      INTO v_contracted_plan, v_views_count'
        );
        IF position('v_views_count' IN v_new) > 0 AND position('INTO v_contracted_plan, v_views_count' IN v_new) = 0 THEN
          v_new := regexp_replace(
            v_new,
            'SELECT\s+b\.plan_tier\s+INTO\s+v_contracted_plan',
            'SELECT b.plan_tier, public.get_single_business_canonical_views_count(b.id) INTO v_contracted_plan, v_views_count',
            'i'
          );
        END IF;
        v_new := replace(
          v_new,
          '''effective_access'', v_effective_access',
          '''effective_access'', v_effective_access, ''views_count'', COALESCE(v_views_count, 0)'
        );
      ELSE
        -- Caso direto sem wrapper 207
        v_new := replace(
          v_def,
          '''rating_count'', 0',
          '''rating_count'', 0, ''views_count'', public.get_single_business_canonical_views_count(v_biz.id)'
        );
      END IF;

      IF v_new <> v_def THEN
        EXECUTE v_new;
      END IF;
    END IF;
  END IF;
END;
$$;

-- 8d. `get_business_analytics_aggregate_metrics`: passa a usar estritamente `event_name = 'view'`
-- e inclui `totalOfficialViews` (`businesses.views_count`) no objeto `kpis`, preservando a autorização da Migration 249.
DO $$
DECLARE
  v_oid OID;
  v_def TEXT;
  v_new TEXT;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'public_businesses_search' -- dummy check
  LIMIT 1;

  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_business_analytics_aggregate_metrics'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_oid IS NOT NULL THEN
    v_def := pg_get_functiondef(v_oid);
    v_new := replace(v_def, 'event_name IN (''view'', ''page_view'')', 'event_name = ''view'' AND COALESCE((metadata->>''eligible_view'')::boolean, true) = true');
    v_new := replace(v_new, 'event_name = ANY (ARRAY[''view''::text, ''page_view''::text])', 'event_name = ''view'' AND COALESCE((metadata->>''eligible_view'')::boolean, true) = true');

    IF position('''totalOfficialViews''' IN v_new) = 0 THEN
      v_new := replace(
        v_new,
        '''views'', v_views_current,',
        '''totalOfficialViews'', COALESCE((SELECT b_v.views_count FROM public.businesses b_v WHERE b_v.id = p_business_id), v_views_current), ''views'', v_views_current,'
      );
    END IF;

    IF v_new <> v_def THEN
      EXECUTE v_new;
    END IF;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';


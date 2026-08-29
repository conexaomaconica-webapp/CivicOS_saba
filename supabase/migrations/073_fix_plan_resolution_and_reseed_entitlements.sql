-- ============================================================================
-- Migration 073: Fix Plan Resolution, Re-seed Entitlements, Centralize RBAC
-- ============================================================================
-- 
-- ACHADO RAIZ: _effective_business_plan exigia plans.tenant_id = subscriptions.tenant_id,
-- mas plans é um catálogo global (1 registro "ouro" com tenant_id=...0001) enquanto
-- subscriptions pertencem a tenants diferentes. O JOIN nunca casava, retornando [],
-- fazendo o trigger de quota usar plan_code='none' → max_limit=0 → 100% bloqueado.
--
-- CORREÇÕES:
-- 1. Remover AND p.tenant_id = s.tenant_id do JOIN (planos são globais)
-- 2. Re-seed entitlements faltantes com defaults da Migration 044 (ON CONFLICT DO NOTHING)
-- 3. Criar RPC has_platform_admin_access() baseada em auth.uid()
-- ============================================================================


-- =============================================================================
-- 1. FIX: _effective_business_plan — Remover tenant constraint em plans
-- =============================================================================
-- A subscription continua rigorosamente scoped a (tenant_id, business_id, status, period).
-- Apenas o JOIN com plans deixa de exigir tenant match, pois plans é catálogo global.

CREATE OR REPLACE FUNCTION public._effective_business_plan(
  p_tenant_id UUID,
  p_business_id UUID
)
RETURNS TABLE (
  subscription_id UUID,
  plan_version_id UUID,
  plan_code TEXT,
  subscription_status TEXT,
  access_valid_until TIMESTAMPTZ,
  is_in_grace BOOLEAN,
  entitlements JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  WITH eligible AS (
    SELECT
      s.id AS subscription_id,
      s.plan_version_id,
      p.code AS plan_code,
      s.status AS subscription_status,
      CASE
        WHEN s.status = 'past_due' THEN s.grace_until
        WHEN s.status = 'canceled' THEN s.access_ends_at
        ELSE s.current_period_end
      END AS access_valid_until,
      s.status = 'past_due' AS is_in_grace
    FROM public.subscriptions s
    JOIN public.plan_versions pv ON pv.id = s.plan_version_id
    JOIN public.plans p ON p.id = pv.plan_id
    -- REMOVIDO: AND p.tenant_id = s.tenant_id
    -- Planos são catálogo global; subscription permanece tenant-scoped.
    WHERE s.tenant_id = p_tenant_id
      AND s.business_id = p_business_id
      AND (
        (s.status IN ('active', 'trialing')
         AND statement_timestamp() >= COALESCE(s.current_period_start, '1970-01-01'::timestamptz)
         AND (s.current_period_end IS NULL OR statement_timestamp() < s.current_period_end))
        OR
        (s.status = 'past_due'
         AND s.grace_until IS NOT NULL
         AND statement_timestamp() >= COALESCE(s.current_period_start, '1970-01-01'::timestamptz)
         AND statement_timestamp() < s.grace_until)
        OR
        (s.status = 'canceled'
         AND s.access_ends_at IS NOT NULL
         AND statement_timestamp() >= COALESCE(s.current_period_start, '1970-01-01'::timestamptz)
         AND statement_timestamp() < s.access_ends_at)
      )
  ),
  unique_candidate AS (
    -- Ambiguidade comercial falha fechada; nunca escolhe o plano "mais alto".
    SELECT e.*
    FROM eligible e
    WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT
    c.subscription_id,
    c.plan_version_id,
    c.plan_code,
    c.subscription_status,
    c.access_valid_until,
    c.is_in_grace,
    '{}'::jsonb AS entitlements
  FROM unique_candidate c;
$$;

-- Manter permissões consistentes com Migration 054
ALTER FUNCTION public._effective_business_plan(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._effective_business_plan(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._effective_business_plan(UUID, UUID) TO service_role;


-- =============================================================================
-- 2. RE-SEED: Entitlements faltantes com defaults históricos da Migration 044
-- =============================================================================
-- Usa ON CONFLICT DO NOTHING para preservar qualquer valor já configurado pelo Admin.
-- Não sobrescreve, não inventa novos limites comerciais.

INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT 
  t.id AS tenant_id,
  f.plan_code,
  f.feature_code,
  f.default_limit
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('bronze', 'services_limit', 3),
    ('bronze', 'benefits_limit', 0),
    ('bronze', 'gallery_photos_limit', 0),
    ('bronze', 'events_limit', 0),
    ('bronze', 'posts_limit', 0),

    ('prata', 'services_limit', 10),
    ('prata', 'benefits_limit', 1),
    ('prata', 'gallery_photos_limit', 3),
    ('prata', 'events_limit', 0),
    ('prata', 'posts_limit', 0),

    ('ouro', 'services_limit', 25),
    ('ouro', 'benefits_limit', 3),
    ('ouro', 'gallery_photos_limit', 10),
    ('ouro', 'events_limit', 3),
    ('ouro', 'posts_limit', 5),

    ('ouro_founder', 'services_limit', 25),
    ('ouro_founder', 'benefits_limit', 3),
    ('ouro_founder', 'gallery_photos_limit', 10),
    ('ouro_founder', 'events_limit', 5),
    ('ouro_founder', 'posts_limit', 10)
) AS f(plan_code, feature_code, default_limit)
ON CONFLICT (tenant_id, plan_code, feature_code) DO NOTHING;


-- =============================================================================
-- 3. RPC: has_platform_admin_access() — Baseada em auth.uid()
-- =============================================================================
-- Não aceita UUID externo: verifica SOMENTE o usuário autenticado da sessão.
-- Matriz canônica: admin, superadmin, platform_admin, master, socio_admin.

CREATE OR REPLACE FUNCTION public.has_platform_admin_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND LOWER(COALESCE(role, '')) IN (
        'admin', 'superadmin', 'platform_admin', 'master', 'socio_admin'
      )
  );
$$;

ALTER FUNCTION public.has_platform_admin_access() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.has_platform_admin_access() TO authenticated, service_role;
-- Anon NÃO deve poder verificar admin access
REVOKE EXECUTE ON FUNCTION public.has_platform_admin_access() FROM anon;

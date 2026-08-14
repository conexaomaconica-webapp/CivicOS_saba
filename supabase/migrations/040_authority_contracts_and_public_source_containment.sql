-- ============================================================================
-- PROPOSTA 040 - Authority contracts and public-source containment
-- ============================================================================
-- STATUS: proposta para revisao. Nao aplicada ao Supabase remoto nesta fase.
--
-- Objetivos:
--   * falhar fechado para publicacao de tenant, Home, reviews e lojas;
--   * impedir que businesses.plan_tier seja uma autoridade comercial;
--   * formalizar as fontes de Fundador, Empresa Verificada, plano efetivo e
--     responsavel publico;
--   * remover SELECT anonimo direto das tabelas-fonte. A leitura publica passa
--     exclusivamente pelas RPCs de projecao criadas na migration 041.
--
-- Esta migration nao altera as RPCs transacionais de 030-033.
-- ============================================================================

-- Helpers SECURITY DEFINER herdados sao recompilados com search_path vazio.
-- Apenas ALTER FUNCTION seria insuficiente: as versoes antigas consultavam
-- pg_tables sem qualificar o schema e deixavam EXECUTE aberto a PUBLIC.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN (auth.jwt() ->> 'tenant_id')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()),
    'usuario_comum'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_global_platform_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = p_role
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.status = 'active'
        AND (r.is_global = true OR ur.tenant_id IS NULL)
        AND r.code = p_role
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_admin_access(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_global_platform_role('master') THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'tenant_admin', 'owner', 'socio_admin')
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = p_tenant_id
        AND ur.status = 'active'
        AND r.code IN ('tenant_admin', 'admin', 'owner', 'socio_admin')
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_business_permission(
  p_tenant_id UUID,
  p_business_id UUID,
  p_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_business_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_tenant_admin_access(p_tenant_id) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'business_members'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = p_tenant_id
        AND bm.business_id = p_business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND bm.role = ANY(p_roles)
    );
  END IF;

  RETURN false;
END;
$$;

ALTER FUNCTION public.current_tenant_id() OWNER TO postgres;
ALTER FUNCTION public.get_current_user_role() OWNER TO postgres;
ALTER FUNCTION public.has_global_platform_role(TEXT) OWNER TO postgres;
ALTER FUNCTION public.has_tenant_admin_access(UUID) OWNER TO postgres;
ALTER FUNCTION public.has_business_permission(UUID, UUID, TEXT[]) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_global_platform_role(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_tenant_admin_access(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_business_permission(UUID, UUID, TEXT[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_global_platform_role(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_tenant_admin_access(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_business_permission(UUID, UUID, TEXT[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Publicacao explicita do tenant e dominio canonico
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS public_access_status TEXT NOT NULL DEFAULT 'disabled'
    CHECK (public_access_status IN ('disabled', 'enabled'));

CREATE INDEX IF NOT EXISTS idx_tenants_public_access
  ON public.tenants (id)
  WHERE public_access_status = 'enabled';

-- O indice usa a mesma canonizacao publica da 041 (caixa, ponto final e www).
-- Ele falha de modo seguro diante de qualquer dominio ambiguo preexistente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_domains_domain_normalized
  ON public.tenant_domains (
    lower(regexp_replace(rtrim(btrim(domain), '.'), '^www\.', '', 'i'))
  );

CREATE INDEX IF NOT EXISTS idx_tenant_domains_public_resolution
  ON public.tenant_domains (
    lower(regexp_replace(rtrim(btrim(domain), '.'), '^www\.', '', 'i')),
    tenant_id
  )
  WHERE is_verified = true AND ssl_status = 'active';

-- ---------------------------------------------------------------------------
-- 2. Conteudo publico da Home (campos explicitos; nenhum JSON interno)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_public_home_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  primary_cta_label TEXT,
  primary_cta_url TEXT,
  secondary_cta_label TEXT,
  secondary_cta_url TEXT,
  about_title TEXT,
  about_body TEXT,
  publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_home_content_published_at CHECK (
    publication_status <> 'published' OR published_at IS NOT NULL
  )
);

CREATE OR REPLACE TRIGGER trg_tenant_public_home_content_updated_at
  BEFORE UPDATE ON public.tenant_public_home_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.tenant_public_home_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage public home content"
  ON public.tenant_public_home_content;
CREATE POLICY "tenant_admin can manage public home content"
  ON public.tenant_public_home_content
  FOR ALL
  TO authenticated
  USING (public.has_tenant_admin_access(tenant_id))
  WITH CHECK (public.has_tenant_admin_access(tenant_id));

-- ---------------------------------------------------------------------------
-- 3. Moderacao de reviews: registros historicos ficam pendentes por padrao
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_reviews
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'published', 'rejected', 'hidden')),
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS business_response TEXT,
  ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

ALTER TABLE public.business_reviews
  DROP CONSTRAINT IF EXISTS chk_business_reviews_published_moderation;
ALTER TABLE public.business_reviews
  ADD CONSTRAINT chk_business_reviews_published_moderation CHECK (
    moderation_status <> 'published'
    OR (moderated_at IS NOT NULL AND moderated_by IS NOT NULL)
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_business_reviews_public_page
  ON public.business_reviews (tenant_id, business_id, created_at DESC, id DESC)
  WHERE moderation_status = 'published';

ALTER TABLE public.business_reviews
  DROP CONSTRAINT IF EXISTS fk_business_reviews_business_tenant;
ALTER TABLE public.business_reviews
  ADD CONSTRAINT fk_business_reviews_business_tenant
  FOREIGN KEY (tenant_id, business_id)
  REFERENCES public.businesses(tenant_id, id)
  ON DELETE CASCADE
  NOT VALID;

CREATE OR REPLACE FUNCTION public.guard_business_review_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_is_privileged BOOLEAN :=
    current_user IN ('postgres', 'service_role', 'supabase_admin')
    OR public.has_tenant_admin_access(NEW.tenant_id);
BEGIN
  IF TG_OP = 'INSERT' AND NOT v_is_privileged THEN
    NEW.moderation_status := 'pending';
    NEW.moderated_by := NULL;
    NEW.moderated_at := NULL;
    NEW.moderation_reason := NULL;
    NEW.business_response := NULL;
    NEW.responded_by := NULL;
    NEW.responded_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT v_is_privileged AND (
    NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
    OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
    OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
    OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason
    OR NEW.business_response IS DISTINCT FROM OLD.business_response
    OR NEW.responded_by IS DISTINCT FROM OLD.responded_by
    OR NEW.responded_at IS DISTINCT FROM OLD.responded_at
  ) THEN
    RAISE EXCEPTION 'REVIEW_MODERATION_FIELDS_ARE_SERVER_MANAGED';
  END IF;

  IF v_is_privileged AND NEW.moderation_status = 'published' THEN
    NEW.moderated_at := COALESCE(NEW.moderated_at, statement_timestamp());
    NEW.moderated_by := COALESCE(NEW.moderated_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_business_review_moderation
  ON public.business_reviews;
CREATE TRIGGER trg_guard_business_review_moderation
  BEFORE INSERT OR UPDATE ON public.business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_business_review_moderation();

-- ---------------------------------------------------------------------------
-- 4. Publicacao explicita de lojas maconicas
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'suspended', 'archived')),
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_public_slug
  ON public.organizations (tenant_id, public_slug)
  WHERE public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_public_directory
  ON public.organizations (tenant_id, lower(name), public_slug)
  WHERE is_active = true AND publication_status = 'published';

CREATE INDEX IF NOT EXISTS idx_organizations_public_search
  ON public.organizations USING gin (
    to_tsvector(
      'simple'::regconfig,
      COALESCE(name, '') || ' ' || COALESCE(potency, '') || ' ' || COALESCE(rite, '')
    )
  )
  WHERE is_active = true AND publication_status = 'published';

-- ---------------------------------------------------------------------------
-- 5. Plano efetivo e entitlement de origem Fundador
-- ---------------------------------------------------------------------------

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_ends_at TIMESTAMPTZ;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS chk_subscriptions_grace_window;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT chk_subscriptions_grace_window CHECK (
    grace_until IS NULL OR grace_until >= current_period_start
  ) NOT VALID;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS chk_subscriptions_access_window;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT chk_subscriptions_access_window CHECK (
    access_ends_at IS NULL OR access_ends_at >= current_period_start
  ) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_one_open_per_business
  ON public.subscriptions (tenant_id, business_id)
  WHERE status IN ('active', 'past_due');

CREATE INDEX IF NOT EXISTS idx_subscriptions_effective_resolution
  ON public.subscriptions (tenant_id, business_id, status, current_period_start, current_period_end);

ALTER TABLE public.entitlement_sources
  DROP CONSTRAINT IF EXISTS entitlement_sources_source_type_check;
ALTER TABLE public.entitlement_sources
  ADD CONSTRAINT entitlement_sources_source_type_check CHECK (
    source_type IN (
      'plan_version',
      'founder_allocation',
      'founder_qualification', -- legado: nunca concede selo/beneficio publico
      'campaign',
      'manual_override'
    )
  );

CREATE INDEX IF NOT EXISTS idx_entitlement_grants_effective
  ON public.entitlement_grants
    (tenant_id, business_id, status, valid_from, valid_until, source_id);

CREATE INDEX IF NOT EXISTS idx_founder_allocations_public_authority
  ON public.founder_allocations (tenant_id, business_id)
  WHERE status = 'granted';

-- O schema original tinha FKs independentes para tenant e business. A FK
-- composta impede novas allocations com empresa de outro tenant sem reescrever
-- o historico antes da auditoria de aplicacao.
ALTER TABLE public.founder_allocations
  DROP CONSTRAINT IF EXISTS fk_founder_allocations_business_tenant;
ALTER TABLE public.founder_allocations
  ADD CONSTRAINT fk_founder_allocations_business_tenant
  FOREIGN KEY (tenant_id, business_id)
  REFERENCES public.businesses(tenant_id, id)
  ON DELETE RESTRICT
  NOT VALID;

-- Definicao global e imutavel por convencao para verificacao cadastral. Uma
-- credencial de outro tipo nunca concede o selo Empresa Verificada.
INSERT INTO public.credential_types
  (tenant_id, code, name, description, requires_evidence)
VALUES
  (NULL, 'business_registration_verification', 'Verificacao cadastral da empresa',
   'Credencial global que atesta exclusivamente a verificacao cadastral empresarial.', true)
ON CONFLICT (code) WHERE tenant_id IS NULL DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_credential_issuances_business_verification
  ON public.credential_issuances
    (tenant_id, business_id, credential_type_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_businesses_public_search
  ON public.businesses USING gin (
    to_tsvector(
      'simple'::regconfig,
      COALESCE(name, '') || ' ' || COALESCE(description, '')
    )
  )
  WHERE is_active = true AND publication_status = 'published';

CREATE INDEX IF NOT EXISTS idx_businesses_public_cursor
  ON public.businesses (tenant_id, lower(name), slug)
  WHERE is_active = true AND publication_status = 'published' AND slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_categories_public_lookup
  ON public.business_categories (tenant_id, business_id, is_primary, category_id);

CREATE INDEX IF NOT EXISTS idx_business_locations_public_lookup
  ON public.business_locations (tenant_id, business_id, is_headquarters, id);

CREATE INDEX IF NOT EXISTS idx_business_contacts_public_lookup
  ON public.business_contacts (tenant_id, business_id, type, id)
  WHERE is_public = true;

-- businesses.plan_tier continua como cache legado, mas clientes nao podem
-- escolhe-lo nem altera-lo. Uma escrita server-side futura deve ocorrer por
-- service_role ou por RPC SECURITY DEFINER auditada.
CREATE OR REPLACE FUNCTION public.guard_legacy_business_plan_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    IF TG_OP = 'INSERT' AND NEW.plan_tier <> 'bronze' THEN
      RAISE EXCEPTION 'BUSINESS_PLAN_TIER_IS_SERVER_MANAGED';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
      RAISE EXCEPTION 'BUSINESS_PLAN_TIER_IS_SERVER_MANAGED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_legacy_business_plan_tier ON public.businesses;
CREATE TRIGGER trg_guard_legacy_business_plan_tier
  BEFORE INSERT OR UPDATE OF plan_tier ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_legacy_business_plan_tier();

-- ---------------------------------------------------------------------------
-- 6. Helpers internos das quatro autoridades
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._business_is_founder(
  p_tenant_id UUID,
  p_business_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.founder_allocations fa
    WHERE fa.tenant_id = p_tenant_id
      AND fa.business_id = p_business_id
      AND fa.status = 'granted'
  );
$$;

CREATE OR REPLACE FUNCTION public._business_is_registration_verified(
  p_tenant_id UUID,
  p_business_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.credential_issuances ci
    JOIN public.credential_types ct
      ON ct.id = ci.credential_type_id
     AND ct.tenant_id IS NULL
     AND ct.code = 'business_registration_verification'
    WHERE ci.tenant_id = p_tenant_id
      AND ci.business_id = p_business_id
      AND ci.status = 'verified'
      AND (ci.expires_at IS NULL OR ci.expires_at > statement_timestamp())
  );
$$;

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
    JOIN public.plans p ON p.id = pv.plan_id AND p.tenant_id = s.tenant_id
    WHERE s.tenant_id = p_tenant_id
      AND s.business_id = p_business_id
      AND (
        (s.status = 'active'
         AND statement_timestamp() >= s.current_period_start
         AND statement_timestamp() < s.current_period_end)
        OR
        (s.status = 'past_due'
         AND s.grace_until IS NOT NULL
         AND statement_timestamp() >= s.current_period_start
         AND statement_timestamp() < s.grace_until)
        OR
        (s.status = 'canceled'
         AND s.access_ends_at IS NOT NULL
         AND statement_timestamp() >= s.current_period_start
         AND statement_timestamp() < s.access_ends_at)
      )
      AND EXISTS (
        SELECT 1
        FROM public.entitlement_grants plan_grant
        JOIN public.entitlement_sources plan_source
          ON plan_source.id = plan_grant.source_id
         AND plan_source.tenant_id = plan_grant.tenant_id
        WHERE plan_grant.tenant_id = s.tenant_id
          AND plan_grant.business_id = s.business_id
          AND plan_grant.status = 'active'
          AND plan_grant.valid_from <= statement_timestamp()
          AND (plan_grant.valid_until IS NULL OR plan_grant.valid_until > statement_timestamp())
          AND plan_source.source_type = 'plan_version'
          AND plan_source.source_reference_id = s.plan_version_id
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
    COALESCE(entitlements.items, '{}'::jsonb)
  FROM unique_candidate c
  LEFT JOIN LATERAL (
    SELECT jsonb_object_agg(effective.code, effective.value) AS items
    FROM (
      SELECT DISTINCT ON (ed.code)
        ed.code,
        CASE ed.value_type
          WHEN 'boolean' THEN to_jsonb(COALESCE(eo.override_value_boolean, eg.value_boolean, false))
          WHEN 'numeric' THEN to_jsonb(COALESCE(eo.override_value_numeric, eg.value_numeric, 0))
          WHEN 'unlimited' THEN to_jsonb(eg.is_unlimited)
        END AS value
      FROM public.entitlement_grants eg
      JOIN public.entitlement_definitions ed ON ed.id = eg.entitlement_id
      JOIN public.entitlement_sources es
        ON es.id = eg.source_id AND es.tenant_id = eg.tenant_id
      LEFT JOIN LATERAL (
        SELECT o.override_value_boolean, o.override_value_numeric
        FROM public.entitlement_overrides o
        WHERE o.grant_id = eg.id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 1
      ) eo ON true
      WHERE eg.tenant_id = p_tenant_id
        AND eg.business_id = p_business_id
        AND eg.status = 'active'
        AND eg.valid_from <= statement_timestamp()
        AND (eg.valid_until IS NULL OR eg.valid_until > statement_timestamp())
        AND (
          (es.source_type = 'plan_version'
           AND es.source_reference_id = c.plan_version_id)
          OR es.source_type IN ('campaign', 'manual_override')
          OR (
            es.source_type = 'founder_allocation'
            AND EXISTS (
              SELECT 1
              FROM public.founder_allocations fa
              WHERE fa.id = es.source_reference_id
                AND fa.tenant_id = p_tenant_id
                AND fa.business_id = p_business_id
                AND fa.status = 'granted'
            )
          )
        )
      ORDER BY ed.code, eg.valid_from DESC, eg.id DESC
    ) effective
  ) entitlements ON true;
$$;

CREATE OR REPLACE FUNCTION public._public_business_responsible(
  p_tenant_id UUID,
  p_business_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'name', pr.name,
    'business_role', CASE WHEN pc.display_business_role THEN bml.link_type END,
    'organization', CASE WHEN pc.display_organization THEN o.name END,
    'community_verified', true
  ))
  FROM public.business_masonic_links bml
  JOIN public.business_members bm
    ON bm.tenant_id = bml.tenant_id
   AND bm.business_id = bml.business_id
   AND bm.user_id = bml.declaring_user_id
   AND bm.status = 'active'
  JOIN public.profiles pr
    ON pr.id = bml.declaring_user_id
   AND pr.status = 'active'
  JOIN public.business_masonic_link_authorizations ba
    ON ba.tenant_id = bml.tenant_id
   AND ba.link_id = bml.id
   AND ba.status = 'active'
   AND ba.authorization_scope = 'company_listing'
   AND (ba.valid_until IS NULL OR ba.valid_until > statement_timestamp())
  JOIN public.business_masonic_link_publication_consents pc
    ON pc.tenant_id = bml.tenant_id
   AND pc.link_id = bml.id
   AND pc.visibility_scope = 'public_all'
   AND pc.granted = true
   AND pc.revoked_at IS NULL
   AND pc.display_name = true
  LEFT JOIN public.organizations o
    ON o.id = bml.organization_id
   AND o.tenant_id = bml.tenant_id
   AND o.is_active = true
   AND o.publication_status = 'published'
  WHERE bml.tenant_id = p_tenant_id
    AND bml.business_id = p_business_id
    AND bml.is_primary = true
    AND bml.status = 'active'
    AND bml.verified_by IS NOT NULL
    AND bml.verified_at IS NOT NULL
    AND (bml.valid_until IS NULL OR bml.valid_until > statement_timestamp())
  ORDER BY bml.verified_at DESC, bml.id
  LIMIT 1;
$$;

-- Helpers de autoridade sao internos; a API publica so recebe seus resultados
-- minimizados por meio das RPCs da migration 041.
ALTER FUNCTION public._business_is_founder(UUID, UUID) OWNER TO postgres;
ALTER FUNCTION public._business_is_registration_verified(UUID, UUID) OWNER TO postgres;
ALTER FUNCTION public._effective_business_plan(UUID, UUID) OWNER TO postgres;
ALTER FUNCTION public._public_business_responsible(UUID, UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public._business_is_founder(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._business_is_registration_verified(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._effective_business_plan(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._public_business_responsible(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._business_is_founder(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public._business_is_registration_verified(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public._effective_business_plan(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public._public_business_responsible(UUID, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Contencao: remover politicas/leitura anonima direta nas fontes
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can read tenants" ON public.tenants;
DROP POLICY IF EXISTS "Public can read published businesses" ON public.businesses;
DROP POLICY IF EXISTS "Public can read banners of published businesses" ON public.business_banners;
DROP POLICY IF EXISTS "Public can read reviews of published businesses" ON public.business_reviews;
DROP POLICY IF EXISTS "Public can view verified credentials of published businesses" ON public.credential_issuances;
DROP POLICY IF EXISTS "Public can view active consented links of published businesses" ON public.business_masonic_links;
DROP POLICY IF EXISTS "Public can view active organizations" ON public.organizations;
DROP POLICY IF EXISTS "Public can view active banners in tenant" ON public.banners;

-- A antiga RPC confundia vinculo comunitario com verificacao cadastral e nao
-- recebia contexto de tenant. Removida para impedir uso acidental.
-- DROP remove tambem a ACL existente. Nao ha REVOKE separado porque REVOKE
-- nao aceita IF EXISTS e a RPC pode legitimamente estar ausente em ambientes
-- que executaram uma versao intermediaria da migration 036.
DROP FUNCTION IF EXISTS public.get_verified_business_ids();

-- Restaura leitura autenticada de tenant sem a recursao da policy original de
-- tenant_members. O helper retorna apenas um booleano sobre o proprio usuario.
CREATE OR REPLACE FUNCTION public.is_current_user_tenant_member(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.is_current_user_tenant_member(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_current_user_tenant_member(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_current_user_tenant_member(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated members can view own tenants" ON public.tenants;
CREATE POLICY "Authenticated members can view own tenants"
  ON public.tenants FOR SELECT TO authenticated
  USING (public.is_current_user_tenant_member(id) OR public.has_global_platform_role('master'));

DROP POLICY IF EXISTS "Members can view fellow members" ON public.tenant_members;
DROP POLICY IF EXISTS "Authenticated members can view fellow members" ON public.tenant_members;
CREATE POLICY "Authenticated members can view fellow members"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (public.is_current_user_tenant_member(tenant_id) OR public.has_global_platform_role('master'));

-- As policies legadas de profiles consultavam a propria tabela e entravam em
-- recursao infinita. O helper SECURITY DEFINER le somente o tenant do usuario
-- atual e tambem impede troca de tenant/role no autoatendimento.
CREATE OR REPLACE FUNCTION public.current_user_profile_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT p.tenant_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

ALTER FUNCTION public.current_user_profile_tenant_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.current_user_profile_tenant_id() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_profile_tenant_id() TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Socio admins can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Masters can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view authorized profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view authorized profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_tenant_admin_access(tenant_id)
    OR public.has_global_platform_role('master')
  );

DROP POLICY IF EXISTS "Users can update own profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own protected profile" ON public.profiles;
CREATE POLICY "Users can update own protected profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND tenant_id IS NOT DISTINCT FROM public.current_user_profile_tenant_id()
    AND role = public.get_current_user_role()
  );

DROP POLICY IF EXISTS "Authorized users can view managed businesses" ON public.businesses;
CREATE POLICY "Authorized users can view managed businesses"
  ON public.businesses FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_business_permission(
      tenant_id, id,
      ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
    )
    OR public.has_tenant_admin_access(tenant_id)
  );

DROP POLICY IF EXISTS "Anyone can view reviews in active tenant" ON public.business_reviews;
DROP POLICY IF EXISTS "Logged in users can post reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Users can manage own reviews" ON public.business_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.business_reviews;

DROP POLICY IF EXISTS "Reviewers can view own reviews" ON public.business_reviews;
CREATE POLICY "Reviewers can view own reviews"
  ON public.business_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "Authenticated users can submit pending reviews" ON public.business_reviews;
CREATE POLICY "Authenticated users can submit pending reviews"
  ON public.business_reviews FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND moderation_status = 'pending'
    AND public.is_current_user_tenant_member(tenant_id)
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_reviews.business_id
        AND b.tenant_id = business_reviews.tenant_id
        AND b.is_active = true
        AND b.publication_status = 'published'
    )
  );

DROP POLICY IF EXISTS "Reviewers can edit own pending reviews" ON public.business_reviews;
CREATE POLICY "Reviewers can edit own pending reviews"
  ON public.business_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND moderation_status = 'pending')
  WITH CHECK (user_id = auth.uid() AND moderation_status = 'pending');

DROP POLICY IF EXISTS "Reviewers can delete own pending reviews" ON public.business_reviews;
CREATE POLICY "Reviewers can delete own pending reviews"
  ON public.business_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND moderation_status = 'pending');

DROP POLICY IF EXISTS "Tenant admins can moderate reviews" ON public.business_reviews;
CREATE POLICY "Tenant admins can moderate reviews"
  ON public.business_reviews FOR ALL TO authenticated
  USING (public.has_tenant_admin_access(tenant_id))
  WITH CHECK (public.has_tenant_admin_access(tenant_id));

-- Defense in depth: mesmo que uma policy antiga reapareca, anon nao possui
-- privilegio de tabela. SECURITY DEFINER nas RPCs 041 usa projecoes explicitas.
REVOKE SELECT ON TABLE
  public.tenants,
  public.tenant_domains,
  public.tenant_settings,
  public.tenant_features,
  public.tenant_public_home_content,
  public.businesses,
  public.business_banners,
  public.business_reviews,
  public.business_categories,
  public.business_locations,
  public.business_contacts,
  public.business_hours,
  public.business_media,
  public.business_attributes,
  public.categories,
  public.tenant_plans,
  public.banners,
  public.coupons,
  public.articles,
  public.events,
  public.popups,
  public.organizations,
  public.organization_people,
  public.credential_types,
  public.credential_issuances,
  public.profiles,
  public.business_members,
  public.business_masonic_links,
  public.business_masonic_link_authorizations,
  public.business_masonic_link_publication_consents,
  public.founder_allocations,
  public.subscriptions,
  public.plans,
  public.plan_versions,
  public.entitlement_definitions,
  public.entitlement_sources,
  public.entitlement_grants,
  public.entitlement_overrides,
  public.listing_highlights,
  public.sponsorships
FROM anon;

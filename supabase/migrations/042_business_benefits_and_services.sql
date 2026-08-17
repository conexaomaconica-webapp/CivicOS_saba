-- ============================================================================
-- Migration 042: Business Benefits & Services Domain Engine
-- Checkpoint 7A — Entidades, RLS Privada, Triggers com Lock Transacional,
-- Enforcement de Quota por Tier, Algoritmo de Concorrência Instantânea de Janelas
-- e RPC public_business_detail Sanitizada
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela public.business_benefits
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  title VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  benefit_type VARCHAR(40) NOT NULL DEFAULT 'special_condition',
  discount_percentage NUMERIC(5,2),
  discount_amount NUMERIC(10,2),
  discount_code VARCHAR(50),
  badge_text VARCHAR(40),
  redeem_instructions TEXT,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_bus_benefits_business
    FOREIGN KEY (tenant_id, business_id)
    REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT chk_benefit_discount_pct
    CHECK (discount_percentage IS NULL OR discount_percentage BETWEEN 0 AND 100),
  CONSTRAINT chk_benefit_validity_dates
    CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS idx_business_benefits_lookup
  ON public.business_benefits(tenant_id, business_id, is_active, display_order, valid_from, valid_until);

CREATE OR REPLACE TRIGGER trg_business_benefits_updated_at
  BEFORE UPDATE ON public.business_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Tabela public.business_services
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50),
  price_info VARCHAR(80),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_bus_services_business
    FOREIGN KEY (tenant_id, business_id)
    REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_services_lookup
  ON public.business_services(tenant_id, business_id, is_active, display_order);

CREATE OR REPLACE TRIGGER trg_business_services_updated_at
  BEFORE UPDATE ON public.business_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Trigger SQL de Enforcement de Quotas com Lock Transacional
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._trg_enforce_business_benefit_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_effective_plan TEXT;
  v_max_benefits INT;
  v_new_from TIMESTAMPTZ;
  v_new_until TIMESTAMPTZ;
  v_test_instant TIMESTAMPTZ;
  v_instant_count INT;
BEGIN
  -- 1. Lock de linha na empresa pai para serialização transacional por empresa
  PERFORM 1 FROM public.businesses
  WHERE tenant_id = NEW.tenant_id AND id = NEW.business_id
  FOR UPDATE;

  -- 2. Resolver plano efetivo canônico (tenant-aware)
  SELECT plan_code INTO v_effective_plan
  FROM public._effective_business_plan(NEW.tenant_id, NEW.business_id);

  v_max_benefits := CASE
    WHEN v_effective_plan = 'ouro' THEN 3
    WHEN v_effective_plan = 'prata' THEN 1
    ELSE 0
  END;

  -- 3. Apenas validar concorrência instantânea se is_active = true
  IF NEW.is_active = true THEN
    v_new_from := COALESCE(NEW.valid_from, NEW.created_at, now());
    v_new_until := COALESCE(NEW.valid_until, '9999-12-31 23:59:59+00'::TIMESTAMPTZ);

    -- Testar concorrência instantânea em cada ponto de fronteira de início de janela
    FOR v_test_instant IN
      SELECT DISTINCT t
      FROM (
        SELECT v_new_from AS t
        UNION
        SELECT COALESCE(b.valid_from, b.created_at, now()) AS t
        FROM public.business_benefits b
        WHERE b.tenant_id = NEW.tenant_id
          AND b.business_id = NEW.business_id
          AND b.is_active = true
          AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      ) sub
      WHERE sub.t >= v_new_from AND sub.t < v_new_until
    LOOP
      SELECT COUNT(*) INTO v_instant_count
      FROM (
        SELECT NEW.id AS benefit_id
        WHERE v_test_instant >= v_new_from AND v_test_instant < v_new_until
        UNION ALL
        SELECT b.id
        FROM public.business_benefits b
        WHERE b.tenant_id = NEW.tenant_id
          AND b.business_id = NEW.business_id
          AND b.is_active = true
          AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND v_test_instant >= COALESCE(b.valid_from, b.created_at, now())
          AND v_test_instant < COALESCE(b.valid_until, '9999-12-31 23:59:59+00'::TIMESTAMPTZ)
      ) active_at_instant;

      IF v_instant_count > v_max_benefits THEN
        RAISE EXCEPTION 'Quota de benefícios simultaneamente ativos excedida para o plano % (Máximo: % no instante %)',
          COALESCE(v_effective_plan, 'none'), v_max_benefits, v_test_instant;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_benefit_quota ON public.business_benefits;
CREATE TRIGGER trg_enforce_business_benefit_quota
  BEFORE INSERT OR UPDATE ON public.business_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_enforce_business_benefit_quota();

CREATE OR REPLACE FUNCTION public._trg_enforce_business_service_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_effective_plan TEXT;
  v_max_services INT;
  v_active_count INT;
BEGIN
  -- 1. Lock de linha na empresa pai para serialização transacional
  PERFORM 1 FROM public.businesses
  WHERE tenant_id = NEW.tenant_id AND id = NEW.business_id
  FOR UPDATE;

  -- 2. Resolver plano efetivo canônico (tenant-aware)
  SELECT plan_code INTO v_effective_plan
  FROM public._effective_business_plan(NEW.tenant_id, NEW.business_id);

  v_max_services := CASE
    WHEN v_effective_plan = 'ouro' THEN 25
    WHEN v_effective_plan = 'prata' THEN 10
    WHEN v_effective_plan = 'bronze' THEN 3
    ELSE 0
  END;

  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO v_active_count
    FROM public.business_services
    WHERE tenant_id = NEW.tenant_id
      AND business_id = NEW.business_id
      AND is_active = true
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    IF (v_active_count + 1) > v_max_services THEN
      RAISE EXCEPTION 'Quota de serviços ativos excedida para o plano % (Máximo: %)',
        COALESCE(v_effective_plan, 'none'), v_max_services;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_service_quota ON public.business_services;
CREATE TRIGGER trg_enforce_business_service_quota
  BEFORE INSERT OR UPDATE ON public.business_services
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_enforce_business_service_quota();

-- ---------------------------------------------------------------------------
-- 4. RLS Privada para Gestão por Membros Autorizados / Platform Admin
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.business_benefits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.business_services FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_benefits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_services TO authenticated;

DROP POLICY IF EXISTS p_business_benefits_select ON public.business_benefits;
CREATE POLICY p_business_benefits_select ON public.business_benefits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = business_benefits.tenant_id
        AND bm.business_id = business_benefits.business_id
        AND bm.user_id = auth.uid()
    )
    OR public.has_tenant_admin_access(tenant_id)
  );

DROP POLICY IF EXISTS p_business_benefits_write ON public.business_benefits;
CREATE POLICY p_business_benefits_write ON public.business_benefits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = business_benefits.tenant_id
        AND bm.business_id = business_benefits.business_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'admin')
    )
    OR public.has_tenant_admin_access(tenant_id)
  );

DROP POLICY IF EXISTS p_business_services_select ON public.business_services;
CREATE POLICY p_business_services_select ON public.business_services
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = business_services.tenant_id
        AND bm.business_id = business_services.business_id
        AND bm.user_id = auth.uid()
    )
    OR public.has_tenant_admin_access(tenant_id)
  );

DROP POLICY IF EXISTS p_business_services_write ON public.business_services;
CREATE POLICY p_business_services_write ON public.business_services
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = business_services.tenant_id
        AND bm.business_id = business_services.business_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'admin')
    )
    OR public.has_tenant_admin_access(tenant_id)
  );

-- ---------------------------------------------------------------------------
-- 5. Atualização da RPC public_business_detail com Benefits e Services Sanitizados
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_business_detail(p_host TEXT, p_business_slug TEXT);
DROP FUNCTION IF EXISTS public.public_business_detail(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.public_business_detail(
  p_host TEXT,
  p_business_slug TEXT
)
RETURNS TABLE (
  tenant_slug TEXT,
  business_slug TEXT,
  business_name TEXT,
  description TEXT,
  company_type TEXT,
  logo_url TEXT,
  primary_category_slug TEXT,
  primary_category_name TEXT,
  locations JSONB,
  contacts JSONB,
  business_hours JSONB,
  media JSONB,
  is_founder BOOLEAN,
  is_verified BOOLEAN,
  effective_plan_code TEXT,
  responsible JSONB,
  rating_average NUMERIC,
  rating_count BIGINT,
  benefits JSONB,
  services JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    t.slug,
    b.slug,
    b.name,
    b.description,
    b.company_type,
    public._safe_public_url(b.logo_url),
    category.slug,
    category.name,
    COALESCE(locations.items, '[]'::jsonb),
    COALESCE(contacts.items, '[]'::jsonb),
    COALESCE(hours.items, '[]'::jsonb),
    COALESCE(media_items.items, '[]'::jsonb),
    public._business_is_founder(b.tenant_id, b.id),
    public._business_is_registration_verified(b.tenant_id, b.id),
    effective_plan.plan_code,
    public._public_business_responsible(b.tenant_id, b.id),
    reviews.average_rating,
    COALESCE(reviews.review_count, 0),
    COALESCE(benefits.items, '[]'::jsonb),
    COALESCE(services.items, '[]'::jsonb)
  FROM public.businesses b
  JOIN public.tenants t ON t.id = b.tenant_id
  LEFT JOIN LATERAL (
    SELECT c.slug, c.name
    FROM public.business_categories bc
    JOIN public.categories c ON c.id = bc.category_id
    WHERE bc.tenant_id = b.tenant_id
      AND bc.business_id = b.id
      AND c.is_active = true
      AND (c.tenant_id IS NULL OR c.tenant_id = b.tenant_id)
    ORDER BY bc.is_primary DESC, c.display_order, c.id
    LIMIT 1
  ) category ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'title', bl.title,
      'street', bl.street,
      'number', bl.number,
      'complement', bl.complement,
      'neighborhood', bl.neighborhood,
      'city', bl.city,
      'state', bl.state,
      'postal_code', bl.postal_code,
      'country', bl.country,
      'latitude', bl.latitude,
      'longitude', bl.longitude,
      'is_headquarters', bl.is_headquarters
    )) ORDER BY bl.is_headquarters DESC, bl.id) AS items
    FROM public.business_locations bl
    WHERE bl.tenant_id = b.tenant_id AND bl.business_id = b.id
  ) locations ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'type', bc.type,
      'value', bc.value,
      'label', bc.label
    )) ORDER BY bc.type, bc.id) AS items
    FROM public.business_contacts bc
    WHERE bc.tenant_id = b.tenant_id
      AND bc.business_id = b.id
      AND bc.is_public = true
  ) contacts ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'day_of_week', bh.day_of_week,
      'open_time', bh.open_time,
      'close_time', bh.close_time,
      'is_closed', bh.is_closed
    ) ORDER BY bh.day_of_week) AS items
    FROM public.business_hours bh
    WHERE bh.tenant_id = b.tenant_id AND bh.business_id = b.id
  ) hours ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'media_type', bm.media_type,
      'url', public._safe_public_url(bm.url),
      'title', bm.title,
      'display_order', bm.display_order
    )) ORDER BY bm.display_order, bm.id) AS items
    FROM public.business_media bm
    WHERE bm.tenant_id = b.tenant_id
      AND bm.business_id = b.id
      AND bm.media_type IN ('image', 'video')
      AND public._safe_public_url(bm.url) IS NOT NULL
  ) media_items ON true
  LEFT JOIN LATERAL (
    SELECT
      round(avg(br.rating)::numeric, 2) AS average_rating,
      count(*)::bigint AS review_count
    FROM public.business_reviews br
    WHERE br.tenant_id = b.tenant_id
      AND br.business_id = b.id
      AND br.moderation_status = 'published'
  ) reviews ON true
  LEFT JOIN LATERAL public._effective_business_plan(b.tenant_id, b.id)
    AS effective_plan ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', bbn.id,
      'title', bbn.title,
      'description', bbn.description,
      'benefit_type', bbn.benefit_type,
      'discount_percentage', CASE WHEN effective_plan.plan_code IN ('prata', 'ouro') THEN bbn.discount_percentage ELSE NULL END,
      'discount_amount', CASE WHEN effective_plan.plan_code IN ('prata', 'ouro') THEN bbn.discount_amount ELSE NULL END,
      'discount_code', CASE WHEN effective_plan.plan_code = 'ouro' THEN bbn.discount_code ELSE NULL END,
      'badge_text', bbn.badge_text,
      'redeem_instructions', CASE WHEN effective_plan.plan_code = 'ouro' THEN bbn.redeem_instructions ELSE NULL END,
      'valid_until', CASE WHEN effective_plan.plan_code = 'ouro' THEN bbn.valid_until ELSE NULL END
    ))) AS items
    FROM (
      SELECT *
      FROM public.business_benefits bbn_inner
      WHERE bbn_inner.tenant_id = b.tenant_id
        AND bbn_inner.business_id = b.id
        AND bbn_inner.is_active = true
        AND (bbn_inner.valid_from IS NULL OR bbn_inner.valid_from <= now())
        AND (bbn_inner.valid_until IS NULL OR bbn_inner.valid_until > now())
      ORDER BY bbn_inner.display_order ASC, bbn_inner.created_at ASC, bbn_inner.id ASC
      LIMIT CASE
        WHEN effective_plan.plan_code = 'ouro' THEN 3
        WHEN effective_plan.plan_code = 'prata' THEN 1
        ELSE 0
      END
    ) bbn
  ) benefits ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', bsv.id,
      'name', bsv.name,
      'description', CASE WHEN effective_plan.plan_code IN ('prata', 'ouro') THEN bsv.description ELSE NULL END,
      'icon_name', CASE WHEN effective_plan.plan_code = 'ouro' THEN bsv.icon_name ELSE NULL END,
      'price_info', CASE WHEN effective_plan.plan_code = 'ouro' THEN bsv.price_info ELSE NULL END
    ))) AS items
    FROM (
      SELECT *
      FROM public.business_services bsv_inner
      WHERE bsv_inner.tenant_id = b.tenant_id
        AND bsv_inner.business_id = b.id
        AND bsv_inner.is_active = true
      ORDER BY bsv_inner.display_order ASC, bsv_inner.created_at ASC, bsv_inner.id ASC
      LIMIT CASE
        WHEN effective_plan.plan_code = 'ouro' THEN 25
        WHEN effective_plan.plan_code = 'prata' THEN 10
        WHEN effective_plan.plan_code = 'bronze' THEN 3
        ELSE 0
      END
    ) bsv
  ) services ON true
  WHERE b.tenant_id = public._resolve_public_tenant_id(p_host)
    AND length(p_business_slug) <= 160
    AND p_business_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND b.slug = p_business_slug
    AND b.is_active = true
    AND b.publication_status = 'published'
  LIMIT 1;
$$;

-- 1. HELPER FUNCTION DE AUTORIZAÇÃO PLATFORM ADMIN
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND (
        LOWER(COALESCE(p.role, '')) IN ('admin', 'superadmin', 'platform_admin', 'master')
        OR COALESCE((p.raw_user_meta_data->>'is_platform_admin')::boolean, false) = true
      )
  ) INTO v_is_admin;

  RETURN COALESCE(v_is_admin, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- 2. TABELA CANÔNICA DE COTAS POR PLANO E TENANT (plan_entitlements)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  feature_code TEXT NOT NULL,
  max_limit INTEGER NOT NULL DEFAULT 0 CHECK (max_limit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plan_entitlements UNIQUE (tenant_id, plan_code, feature_code)
);

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

-- Politica RLS para plan_entitlements: Leitura pública/membros; escrita apenas admins da plataforma
DROP POLICY IF EXISTS "Anyone can view plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Anyone can view plan entitlements"
  ON public.plan_entitlements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Platform admins can manage plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Platform admins can manage plan entitlements"
  ON public.plan_entitlements FOR ALL
  USING (public._is_platform_admin(auth.uid()));


-- 2. SEED INICIAL DE COTAS DE PLANO (FALLBACK FAIL-CLOSED)
-- ----------------------------------------------------------------------------

INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT 
  t.id AS tenant_id,
  p.plan_code,
  f.feature_code,
  f.default_limit
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('bronze'),
    ('prata'),
    ('ouro'),
    ('ouro_founder')
) AS p(plan_code)
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
WHERE p.plan_code = f.plan_code
ON CONFLICT (tenant_id, plan_code, feature_code) 
DO UPDATE SET max_limit = EXCLUDED.max_limit, updated_at = now();


-- 3. FUNÇÃO AUXILIAR DE CONSULTA FAIL-CLOSED DE COTAS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._get_plan_entitlement(
  p_tenant_id UUID,
  p_plan_code TEXT,
  p_feature_code TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  SELECT max_limit INTO v_limit
  FROM public.plan_entitlements
  WHERE tenant_id = p_tenant_id
    AND LOWER(plan_code) = LOWER(p_plan_code)
    AND LOWER(feature_code) = LOWER(p_feature_code);

  IF v_limit IS NULL THEN
    -- Fail-closed default se a cota não estiver explicitamente configurada
    RETURN 0;
  END IF;

  RETURN v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- 4. REFATORAÇÃO DOS TRIGGERS DE QUOTA PARA CONSULTAR plan_entitlements
-- ----------------------------------------------------------------------------

-- A) Trigger de Quota de Serviços
CREATE OR REPLACE FUNCTION public.trg_check_business_services_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_code TEXT;
  v_max_services INTEGER;
  v_active_count INTEGER;
BEGIN
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  v_plan_code := public._effective_business_plan(NEW.tenant_id, NEW.business_id);
  v_max_services := public._get_plan_entitlement(NEW.tenant_id, v_plan_code, 'services_limit');

  SELECT COUNT(*) INTO v_active_count
  FROM public.business_services
  WHERE tenant_id = NEW.tenant_id
    AND business_id = NEW.business_id
    AND is_active = true
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_active_count >= v_max_services THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED: O plano % permite no máximo % serviço(s) ativo(s) simultaneamente.',
      UPPER(v_plan_code), v_max_services;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- B) Trigger de Quota de Benefícios
CREATE OR REPLACE FUNCTION public.trg_check_business_benefits_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_code TEXT;
  v_max_benefits INTEGER;
  v_active_count INTEGER;
  v_new_from TIMESTAMPTZ;
  v_new_until TIMESTAMPTZ;
BEGIN
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  v_plan_code := public._effective_business_plan(NEW.tenant_id, NEW.business_id);
  v_max_benefits := public._get_plan_entitlement(NEW.tenant_id, v_plan_code, 'benefits_limit');

  v_new_from := COALESCE(NEW.valid_from, '-infinity'::timestamptz);
  v_new_until := COALESCE(NEW.valid_until, 'infinity'::timestamptz);

  SELECT COUNT(*) INTO v_active_count
  FROM public.business_benefits
  WHERE tenant_id = NEW.tenant_id
    AND business_id = NEW.business_id
    AND is_active = true
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (COALESCE(valid_from, '-infinity'::timestamptz), COALESCE(valid_until, 'infinity'::timestamptz))
      OVERLAPS
      (v_new_from, v_new_until)
    );

  IF v_active_count >= v_max_benefits THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED: O plano % permite no máximo % benefício(s) ativo(s) com janelas sobrepostas.',
      UPPER(v_plan_code), v_max_benefits;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- C) Trigger de Quota de Mídia / Galeria (Reaproveitando business_media)
CREATE OR REPLACE FUNCTION public.trg_check_business_media_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_code TEXT;
  v_max_photos INTEGER;
  v_active_count INTEGER;
BEGIN
  -- Apenas limita imagens da galeria (videos/documentos se aplicável)
  IF NEW.media_type <> 'image' THEN
    RETURN NEW;
  END IF;

  v_plan_code := public._effective_business_plan(NEW.tenant_id, NEW.business_id);
  v_max_photos := public._get_plan_entitlement(NEW.tenant_id, v_plan_code, 'gallery_photos_limit');

  SELECT COUNT(*) INTO v_active_count
  FROM public.business_media
  WHERE tenant_id = NEW.tenant_id
    AND business_id = NEW.business_id
    AND media_type = 'image'
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_active_count >= v_max_photos THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED: O plano % permite no máximo % foto(s) na galeria.',
      UPPER(v_plan_code), v_max_photos;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_business_media_quota ON public.business_media;
CREATE TRIGGER check_business_media_quota
  BEFORE INSERT OR UPDATE ON public.business_media
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_business_media_quota();


-- 5. ATUALIZAÇÃO DA RPC PÚBLICA DE APRESENTAÇÃO (public_business_detail)
-- ----------------------------------------------------------------------------
-- Garante que:
-- A) Mídia da galeria é limitada de acordo com a cota do plano em 'plan_entitlements'.
-- B) CNPJ/CPF NUNCA são expostos no retorno público.

DROP FUNCTION IF EXISTS public.public_business_detail(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.public_business_detail(
  p_host TEXT,
  p_slug TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_business RECORD;
  v_plan_code TEXT;
  v_max_services INTEGER;
  v_max_benefits INTEGER;
  v_max_gallery INTEGER;
  v_services JSONB;
  v_benefits JSONB;
  v_media JSONB;
BEGIN
  -- Resolve o tenant pelo host público
  v_tenant_id := public._resolve_tenant_by_host(p_host);

  -- Busca o registro da empresa ativa no tenant
  SELECT * INTO v_business
  FROM public.businesses
  WHERE tenant_id = v_tenant_id
    AND LOWER(slug) = LOWER(p_slug)
    AND is_published = true;

  IF v_business.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Resolve o plano vigente e cotas comerciais da empresa
  v_plan_code := public._effective_business_plan(v_tenant_id, v_business.id);
  v_max_services := public._get_plan_entitlement(v_tenant_id, v_plan_code, 'services_limit');
  v_max_benefits := public._get_plan_entitlement(v_tenant_id, v_plan_code, 'benefits_limit');
  v_max_gallery := public._get_plan_entitlement(v_tenant_id, v_plan_code, 'gallery_photos_limit');

  -- Seleciona serviços ativos sanitizados respeitando a cota do plano
  SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO v_services
  FROM (
    SELECT id, name, description, icon_name, price_info, display_order
    FROM public.business_services
    WHERE tenant_id = v_tenant_id
      AND business_id = v_business.id
      AND is_active = true
    ORDER BY display_order ASC, created_at ASC
    LIMIT v_max_services
  ) s;

  -- Seleciona benefícios ativos vigentes respeitando a cota do plano
  SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) INTO v_benefits
  FROM (
    SELECT id, title, description, discount_code, badge_text, redeem_instructions, valid_from, valid_until, display_order
    FROM public.business_benefits
    WHERE tenant_id = v_tenant_id
      AND business_id = v_business.id
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= now())
      AND (valid_until IS NULL OR valid_until > now())
    ORDER BY display_order ASC, created_at ASC
    LIMIT v_max_benefits
  ) b;

  -- Seleciona mídias da galeria respeitando a cota do plano
  SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]'::jsonb) INTO v_media
  FROM (
    SELECT id, media_type, url, title, display_order
    FROM public.business_media
    WHERE tenant_id = v_tenant_id
      AND business_id = v_business.id
    ORDER BY display_order ASC, created_at ASC
    LIMIT v_max_gallery
  ) m;

  -- Retorna a apresentação pública unificada (SEM CNPJ/CPF ou dados privados)
  RETURN jsonb_build_object(
    'id', v_business.id,
    'name', v_business.name,
    'slug', v_business.slug,
    'tagline', v_business.tagline,
    'description', v_business.description,
    'logoUrl', v_business.logo_url,
    'coverUrl', v_business.cover_url,
    'category', v_business.category,
    'effectivePlan', v_plan_code,
    'isFounder', (v_plan_code = 'ouro_founder'),
    'contacts', jsonb_build_object(
      'phone', v_business.phone,
      'whatsapp', v_business.whatsapp,
      'email', v_business.public_email,
      'website', v_business.website
    ),
    'address', jsonb_build_object(
      'street', v_business.street,
      'number', v_business.number,
      'city', v_business.city,
      'state', v_business.state,
      'zipCode', v_business.zip_code
    ),
    'services', v_services,
    'benefits', v_benefits,
    'media', v_media
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

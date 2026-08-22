-- ============================================================================
-- Migration 057: Masonic Lodges Directory Architecture & Public Discovery RPCs
-- ============================================================================

-- 1. Auxiliary Table: Masonic Potencies (Obediências)
CREATE TABLE IF NOT EXISTS public.masonic_potencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_masonic_potencies_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_masonic_potencies_tenant ON public.masonic_potencies(tenant_id);

-- 2. Auxiliary Table: Masonic Rites (Ritos)
CREATE TABLE IF NOT EXISTS public.masonic_rites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_masonic_rites_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_masonic_rites_tenant ON public.masonic_rites(tenant_id);

-- 3. Enhance `public.organizations` Table for Lodges Context
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS worshipful_master_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS potency_id UUID REFERENCES public.masonic_potencies(id) ON DELETE SET NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS rite_id UUID REFERENCES public.masonic_rites(id) ON DELETE SET NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS show_worshipful_master BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS show_address BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_organizations_city ON public.organizations(city);
CREATE INDEX IF NOT EXISTS idx_organizations_state ON public.organizations(state);

-- 4. Table: Organization Contacts (Multiple Contacts with granular Privacy)
CREATE TABLE IF NOT EXISTS public.organization_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'phone', 'whatsapp', 'email', 'website', 'instagram'
  value TEXT NOT NULL,
  label TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_contacts_org ON public.organization_contacts(tenant_id, organization_id);

-- 5. Table: Organization Meetings (Multiple Regular & Special Meetings)
CREATE TABLE IF NOT EXISTS public.organization_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_day TEXT NOT NULL, -- 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'
  meeting_time TEXT NOT NULL, -- '20:00'
  label TEXT, -- e.g. 'Sessão Ordinária', 'Instrução'
  is_public BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_meetings_org ON public.organization_meetings(tenant_id, organization_id);

-- 6. Table: Organization Media (Photos & Attachments)
CREATE TABLE IF NOT EXISTS public.organization_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  type TEXT NOT NULL DEFAULT 'photo', -- 'photo', 'logo', 'cover', 'brasao'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_media_org ON public.organization_media(tenant_id, organization_id);

-- 7. RLS Policies for New Tables
ALTER TABLE public.masonic_potencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masonic_rites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_media ENABLE ROW LEVEL SECURITY;

-- Read Policies
DROP POLICY IF EXISTS "Public can view potencies" ON public.masonic_potencies;
CREATE POLICY "Public can view potencies" ON public.masonic_potencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view rites" ON public.masonic_rites;
CREATE POLICY "Public can view rites" ON public.masonic_rites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view public contacts" ON public.organization_contacts;
CREATE POLICY "Public can view public contacts" ON public.organization_contacts FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Public can view public meetings" ON public.organization_meetings;
CREATE POLICY "Public can view public meetings" ON public.organization_meetings FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Public can view organization media" ON public.organization_media;
CREATE POLICY "Public can view organization media" ON public.organization_media FOR SELECT USING (true);

-- Admin Management Policies
DROP POLICY IF EXISTS "tenant_admin can manage potencies" ON public.masonic_potencies;
CREATE POLICY "tenant_admin can manage potencies" ON public.masonic_potencies FOR ALL USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "tenant_admin can manage rites" ON public.masonic_rites;
CREATE POLICY "tenant_admin can manage rites" ON public.masonic_rites FOR ALL USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "tenant_admin can manage contacts" ON public.organization_contacts;
CREATE POLICY "tenant_admin can manage contacts" ON public.organization_contacts FOR ALL USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "tenant_admin can manage meetings" ON public.organization_meetings;
CREATE POLICY "tenant_admin can manage meetings" ON public.organization_meetings FOR ALL USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "tenant_admin can manage media" ON public.organization_media;
CREATE POLICY "tenant_admin can manage media" ON public.organization_media FOR ALL USING (public.has_tenant_admin_access(tenant_id));

-- 8. Seed Default Potencies & Rites for Default Tenant
DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000010';
BEGIN
  INSERT INTO public.masonic_potencies (tenant_id, name, abbreviation, slug)
  VALUES 
    (v_tenant_id, 'Grande Oriente do Brasil', 'GOB', 'gob'),
    (v_tenant_id, 'Grande Loja Maçônica', 'GLBA', 'glba'),
    (v_tenant_id, 'Grandes Lojas Maçônicas Unificadas', 'COMAB', 'comab')
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  INSERT INTO public.masonic_rites (tenant_id, name, slug)
  VALUES 
    (v_tenant_id, 'Rito Escocês Antigo e Aceito (REAA)', 'reaa'),
    (v_tenant_id, 'Rito York', 'york'),
    (v_tenant_id, 'Rito Moderno ou Francês', 'moderno'),
    (v_tenant_id, 'Rito Adonhiramita', 'adonhiramita'),
    (v_tenant_id, 'Rito Brasileiro', 'brasileiro'),
    (v_tenant_id, 'Rito de Schröder', 'schroeder')
  ON CONFLICT (tenant_id, slug) DO NOTHING;
END $$;

-- 9. RPC: `public_lodges_search` (Advanced Search & Discovery for Masonic Lodges)
DROP FUNCTION IF EXISTS public.public_lodges_search CASCADE;

CREATE OR REPLACE FUNCTION public.public_lodges_search(
  p_host text,
  p_query text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_potency text DEFAULT NULL,
  p_rite text DEFAULT NULL,
  p_meeting_day text DEFAULT NULL,
  p_user_lat numeric DEFAULT NULL,
  p_user_lng numeric DEFAULT NULL,
  p_max_distance_km numeric DEFAULT NULL,
  p_sort text DEFAULT 'name',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_query TEXT;
  v_state TEXT;
  v_city TEXT;
  v_potency TEXT;
  v_rite TEXT;
  v_meeting_day TEXT;
  v_sort TEXT;
  v_page INTEGER;
  v_page_size INTEGER;
  v_offset INTEGER;
  v_total INTEGER;
  v_total_pages INTEGER;
  v_items JSONB;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'items', '[]'::jsonb,
      'total', 0,
      'page', 1,
      'page_size', 12,
      'total_pages', 0,
      'has_next_page', false,
      'has_previous_page', false
    );
  END IF;

  v_query := NULLIF(btrim(p_query), '');
  v_state := NULLIF(btrim(p_state), '');
  v_city := NULLIF(btrim(p_city), '');
  v_potency := NULLIF(btrim(p_potency), '');
  v_rite := NULLIF(btrim(p_rite), '');
  v_meeting_day := NULLIF(lower(btrim(p_meeting_day)), '');
  v_sort := COALESCE(lower(btrim(p_sort)), 'name');
  v_page := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 50);
  v_offset := (v_page - 1) * v_page_size;

  WITH lodge_base AS (
    SELECT DISTINCT ON (o.id)
      o.id,
      COALESCE(o.slug, regexp_replace(lower(o.name), '[^a-z0-9]+', '-', 'g')) AS slug,
      o.name,
      o.code_number,
      COALESCE(p.name, o.potency) AS potency_name,
      COALESCE(p.abbreviation, o.potency) AS potency_abbreviation,
      p.slug AS potency_slug,
      COALESCE(r.name, o.rite) AS rite_name,
      r.slug AS rite_slug,
      o.city,
      o.state,
      o.address,
      o.latitude,
      o.longitude,
      o.logo_url,
      o.cover_url,
      o.foundation_date,
      CASE WHEN o.show_worshipful_master = true THEN o.worshipful_master_name ELSE NULL END AS worshipful_master_name,
      o.show_worshipful_master,
      o.show_address,
      o.is_featured,
      -- Distance calculation in KM
      (
        CASE 
          WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL THEN
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(p_user_lat)) * cos(radians(o.latitude)) *
                cos(radians(o.longitude) - radians(p_user_lng)) +
                sin(radians(p_user_lat)) * sin(radians(o.latitude))
              ))
            )
          ELSE NULL
        END
      ) AS distance_km,
      -- Primary Meeting Day & Schedule
      (
        SELECT jsonb_build_object(
          'day', m.meeting_day,
          'time', m.meeting_time,
          'label', m.label
        )
        FROM public.organization_meetings m
        WHERE m.tenant_id = o.tenant_id AND m.organization_id = o.id AND m.is_public = true
        ORDER BY m.sort_order ASC, m.created_at ASC
        LIMIT 1
      ) AS primary_meeting
    FROM public.organizations o
    LEFT JOIN public.masonic_potencies p ON p.id = o.potency_id
    LEFT JOIN public.masonic_rites r ON r.id = o.rite_id
    LEFT JOIN public.organization_meetings om ON om.organization_id = o.id AND om.tenant_id = o.tenant_id
    WHERE o.tenant_id = v_tenant_id
      AND o.is_active = true
      AND o.is_published = true
      -- Search Query (Name, Code Number, City)
      AND (
        v_query IS NULL
        OR public._normalize_search(o.name) LIKE '%' || public._normalize_search(v_query) || '%'
        OR (o.code_number IS NOT NULL AND o.code_number::text LIKE '%' || v_query || '%')
        OR public._normalize_search(COALESCE(o.city, '')) LIKE '%' || public._normalize_search(v_query) || '%'
        OR public._normalize_search(COALESCE(p.abbreviation, '')) LIKE '%' || public._normalize_search(v_query) || '%'
      )
      -- Filters
      AND (v_state IS NULL OR lower(o.state) = lower(v_state))
      AND (v_city IS NULL OR lower(o.city) = lower(v_city))
      AND (v_potency IS NULL OR lower(p.slug) = lower(v_potency) OR lower(p.abbreviation) = lower(v_potency) OR lower(o.potency) = lower(v_potency))
      AND (v_rite IS NULL OR lower(r.slug) = lower(v_rite) OR lower(r.name) LIKE '%' || lower(v_rite) || '%')
      AND (v_meeting_day IS NULL OR lower(om.meeting_day) = v_meeting_day)
  ),
  filtered_lodges AS (
    SELECT *
    FROM lodge_base
    WHERE (p_max_distance_km IS NULL OR distance_km IS NULL OR distance_km <= p_max_distance_km)
  ),
  total_count AS (
    SELECT COUNT(*) AS total_rows FROM filtered_lodges
  ),
  paginated_items AS (
    SELECT 
      jsonb_build_object(
        'id', id,
        'slug', slug,
        'name', name,
        'code_number', code_number,
        'potency', potency_abbreviation,
        'potency_name', potency_name,
        'rite', rite_name,
        'city', city,
        'state', state,
        'address', CASE WHEN show_address = true THEN address ELSE NULL END,
        'latitude', latitude,
        'longitude', longitude,
        'distance_km', ROUND(distance_km::numeric, 1),
        'logo_url', logo_url,
        'cover_url', cover_url,
        'worshipful_master_name', worshipful_master_name,
        'primary_meeting', primary_meeting,
        'is_featured', is_featured
      ) AS item_json
    FROM filtered_lodges
    ORDER BY
      is_featured DESC,
      CASE WHEN v_sort = 'distance' THEN distance_km END ASC NULLS LAST,
      CASE WHEN v_sort = 'code' THEN code_number END ASC NULLS LAST,
      name ASC
    LIMIT v_page_size OFFSET v_offset
  )
  SELECT 
    (SELECT total_rows FROM total_count),
    COALESCE(jsonb_agg(item_json), '[]'::jsonb)
  INTO v_total, v_items
  FROM paginated_items;

  v_total := COALESCE(v_total, 0);
  v_total_pages := CEIL(v_total::NUMERIC / GREATEST(v_page_size, 1)::NUMERIC);
END;
$$;

ALTER FUNCTION public.public_lodges_search(text, text, text, text, text, text, text, numeric, numeric, numeric, text, integer, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.public_lodges_search(text, text, text, text, text, text, text, numeric, numeric, numeric, text, integer, integer) TO anon, authenticated;

-- 10. RPC: `public_lodge_detail` (Single Lodge Full Information Page)
DROP FUNCTION IF EXISTS public.public_lodge_detail CASCADE;

CREATE OR REPLACE FUNCTION public.public_lodge_detail(
  p_host text,
  p_lodge_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_lodge JSONB;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', o.id,
    'slug', COALESCE(o.slug, regexp_replace(lower(o.name), '[^a-z0-9]+', '-', 'g')),
    'name', o.name,
    'code_number', o.code_number,
    'potency', COALESCE(p.abbreviation, o.potency),
    'potency_name', COALESCE(p.name, o.potency),
    'rite', COALESCE(r.name, o.rite),
    'foundation_date', o.foundation_date,
    'city', o.city,
    'state', o.state,
    'cep', o.cep,
    'address', CASE WHEN o.show_address = true THEN o.address ELSE NULL END,
    'latitude', o.latitude,
    'longitude', o.longitude,
    'logo_url', o.logo_url,
    'cover_url', o.cover_url,
    'worshipful_master_name', CASE WHEN o.show_worshipful_master = true THEN o.worshipful_master_name ELSE NULL END,
    'show_worshipful_master', o.show_worshipful_master,
    'show_address', o.show_address,
    -- Contacts Array (Only Public)
    'contacts', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'type', c.type,
          'value', c.value,
          'label', c.label
        )
      ), '[]'::jsonb)
      FROM public.organization_contacts c
      WHERE c.tenant_id = o.tenant_id AND c.organization_id = o.id AND c.is_public = true
    ),
    -- Meetings Array (Only Public)
    'meetings', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'day', m.meeting_day,
          'time', m.meeting_time,
          'label', m.label
        )
      ), '[]'::jsonb)
      FROM public.organization_meetings m
      WHERE m.tenant_id = o.tenant_id AND m.organization_id = o.id AND m.is_public = true
    ),
    -- Media Gallery
    'gallery', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', med.id,
          'url', med.url,
          'alt', med.alt,
          'type', med.type
        )
      ), '[]'::jsonb)
      FROM public.organization_media med
      WHERE med.tenant_id = o.tenant_id AND med.organization_id = o.id
    )
  ) INTO v_lodge
  FROM public.organizations o
  LEFT JOIN public.masonic_potencies p ON p.id = o.potency_id
  LEFT JOIN public.masonic_rites r ON r.id = o.rite_id
  WHERE o.tenant_id = v_tenant_id
    AND o.is_active = true
    AND o.is_published = true
    AND (
      o.slug = p_lodge_slug 
      OR regexp_replace(lower(o.name), '[^a-z0-9]+', '-', 'g') = p_lodge_slug
      OR o.id::text = p_lodge_slug
    )
  LIMIT 1;

  RETURN v_lodge;
END;
$$;

ALTER FUNCTION public.public_lodge_detail(text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.public_lodge_detail(text, text) TO anon, authenticated;

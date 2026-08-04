-- ============================================================================
-- Product Migration: Conexão Maçônica - Directory Context (Guia de Empresas)
-- ============================================================================
-- Extends Foundation businesses table and adds all directory-related tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Migration em public.businesses (Reutilizada da Foundation)
-- ---------------------------------------------------------------------------

-- Garante chave única composta (tenant_id, id) para integridade relacional de tabelas filhas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_businesses_tenant_id' 
    AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses ADD CONSTRAINT uq_businesses_tenant_id UNIQUE (tenant_id, id);
  END IF;
END $$;

-- Adiciona campos estendidos de diretório (SEM plan_tier) com status explícito de publicação
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS company_type TEXT NOT NULL DEFAULT 'commercial' CHECK (company_type IN ('commercial', 'masonic_store', 'service_provider'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'pending_approval', 'published', 'suspended', 'archived'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 2. business_members - Delegação, Convites e Ciclo de Vida
-- Substitui a restrição de proprietário único (owner_id), permitindo múltiplos gestores
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL se convite pendente
  invited_email TEXT,
  invite_token_hash TEXT,
  invite_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'revoked')),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_members UNIQUE (business_id, user_id),
  CONSTRAINT fk_business_members_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_business_members_user ON public.business_members(user_id);
CREATE INDEX idx_business_members_invite ON public.business_members(invited_email, invite_token_hash);
CREATE INDEX idx_business_members_business ON public.business_members(tenant_id, business_id);

CREATE OR REPLACE TRIGGER trg_business_members_updated_at
  BEFORE UPDATE ON public.business_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3. categories - Árvore de categorias
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_categories_global_slug ON public.categories(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX uq_categories_tenant_slug ON public.categories(tenant_id, slug) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_categories_parent ON public.categories(parent_id);

CREATE OR REPLACE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4. business_categories
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_categories (
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (business_id, category_id),
  CONSTRAINT fk_bus_cat_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 5. business_locations - Endereços com suporte a geolocalização
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Matriz',
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  is_headquarters BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bus_loc_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_business_locations_business ON public.business_locations(business_id);
CREATE INDEX idx_business_locations_city_state ON public.business_locations(city, state);
CREATE INDEX idx_business_locations_lat_lng ON public.business_locations(latitude, longitude);

CREATE OR REPLACE TRIGGER trg_business_locations_updated_at
  BEFORE UPDATE ON public.business_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 6. business_contacts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'phone', 'email', 'instagram', 'linkedin', 'facebook', 'website')),
  value TEXT NOT NULL,
  label TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bus_contacts_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 7. business_hours
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_business_hours_day UNIQUE (business_id, day_of_week),
  CONSTRAINT fk_bus_hours_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 8. business_media
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'document')),
  url TEXT NOT NULL,
  title TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bus_media_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 9. business_attributes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  attribute_key TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_attributes_key UNIQUE (business_id, attribute_key),
  CONSTRAINT fk_bus_attr_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_attributes ENABLE ROW LEVEL SECURITY;

-- business_members: business members can view; owner/co_owner can manage
CREATE POLICY "business_members can view own memberships"
  ON public.business_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    OR public.has_tenant_admin_access(tenant_id)
  );

CREATE POLICY "owner_co_owner can manage business_members"
  ON public.business_members
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- categories: public read for active tenant; tenant_admin manages
CREATE POLICY "Anyone can view active categories in tenant"
  ON public.categories
  FOR SELECT
  USING (
    (tenant_id IS NULL OR tenant_id = public.current_tenant_id())
    AND is_active = true
  );

CREATE POLICY "tenant_admin can manage categories"
  ON public.categories
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

-- business_categories: follows business permissions
CREATE POLICY "business_members can view business_categories"
  ON public.business_categories
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    OR public.has_tenant_admin_access(tenant_id)
  );

CREATE POLICY "owner_co_owner_manager can manage business_categories"
  ON public.business_categories
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_locations: public read for published businesses; managers manage
CREATE POLICY "Public can view locations of published businesses"
  ON public.business_locations
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_locations.business_id
        AND b.tenant_id = business_locations.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

CREATE POLICY "managers can manage business_locations"
  ON public.business_locations
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_contacts: similar to locations
CREATE POLICY "Public can view public contacts of published businesses"
  ON public.business_contacts
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_public = true
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_contacts.business_id
        AND b.tenant_id = business_contacts.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

CREATE POLICY "managers can manage business_contacts"
  ON public.business_contacts
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_hours: public read for published; managers manage
CREATE POLICY "Public can view hours of published businesses"
  ON public.business_hours
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_hours.business_id
        AND b.tenant_id = business_hours.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

CREATE POLICY "managers can manage business_hours"
  ON public.business_hours
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_media: public read for published; marketing/managers manage
CREATE POLICY "Public can view media of published businesses"
  ON public.business_media
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_media.business_id
        AND b.tenant_id = business_media.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

CREATE POLICY "marketing_managers can manage business_media"
  ON public.business_media
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_attributes: similar to contacts
CREATE POLICY "Public can view attributes of published businesses"
  ON public.business_attributes
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_attributes.business_id
        AND b.tenant_id = business_attributes.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

CREATE POLICY "managers can manage business_attributes"
  ON public.business_attributes
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );
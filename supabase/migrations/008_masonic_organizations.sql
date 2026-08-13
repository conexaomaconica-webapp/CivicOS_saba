-- ============================================================================
-- Product Migration: Conexão Maçônica - Masonic Organizations Context
-- ============================================================================
-- Domínio Institucional: Organizations, Units, People (MVP 1A)
-- Relationships & Memberships (MVP 1B - created as extensible tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. organizations - Lojas Simbólicas, Potências
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code_number INTEGER,
  potency TEXT NOT NULL,
  rite TEXT,
  foundation_date DATE,
  meeting_schedule TEXT,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_organizations_tenant_code UNIQUE (tenant_id, potency, code_number),
  CONSTRAINT uq_organizations_tenant_id UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_organizations_tenant ON public.organizations(tenant_id);

CREATE OR REPLACE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. organization_units - Subdivisões (ex: departamentos, comissões)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_units_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_units_org ON public.organization_units(tenant_id, organization_id);

-- ---------------------------------------------------------------------------
-- 3. organization_people - Pessoas vinculadas à instituição
-- Independem de possuir conta ativa no auth.users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Opcional
  full_name TEXT NOT NULL,
  cimb_code TEXT, -- Cadastro institucional
  masonic_degree TEXT,
  role_in_org TEXT NOT NULL DEFAULT 'membro',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'licensed', 'transferred', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_organization_people_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_org_people_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_people_org ON public.organization_people(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_people_user ON public.organization_people(user_id);

-- ---------------------------------------------------------------------------
-- 4. organization_memberships - MVP 1B (Proposta de extensão futura)
-- Vínculo formal de membros/dirigentes com histórico
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  person_id UUID NOT NULL,
  role TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_membership_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_org_membership_person FOREIGN KEY (tenant_id, person_id) REFERENCES public.organization_people(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_person ON public.organization_memberships(person_id);

-- ---------------------------------------------------------------------------
-- 5. organization_relationships - MVP 1B (Proposta de extensão futura)
-- Hierarquias e obediências entre organizações
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_organization_id UUID NOT NULL,
  target_organization_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- 'subordinate', 'affiliated', 'partner', 'jurisdiction'
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_rel_source FOREIGN KEY (tenant_id, source_organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_org_rel_target FOREIGN KEY (tenant_id, target_organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT chk_org_rel_no_self CHECK (source_organization_id != target_organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_relationships_source ON public.organization_relationships(tenant_id, source_organization_id);
CREATE INDEX IF NOT EXISTS idx_org_relationships_target ON public.organization_relationships(tenant_id, target_organization_id);

-- ---------------------------------------------------------------------------
-- 6. organization_event_link - MVP 1B (Proposta de extensão futura)
-- Vincula eventos institucionais a organizações
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_event_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  event_id UUID NOT NULL, -- Referência a tabela events (content context)
  link_type TEXT NOT NULL DEFAULT 'organizer', -- 'organizer', 'host', 'participant', 'sponsor'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_event_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_event_link_org ON public.organization_event_link(tenant_id, organization_id);

-- ---------------------------------------------------------------------------
-- 7. organization_business_partnership - MVP 1B (Proposta de extensão futura)
-- Vínculo com empresas conveniadas (businesses do directory)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_business_partnership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  business_id UUID NOT NULL,
  partnership_type TEXT NOT NULL DEFAULT 'conveniada', -- 'conveniada', 'patrocinadora', 'fornecedora'
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_biz_partnership_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_org_biz_partnership_biz FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_biz_partnership_org ON public.organization_business_partnership(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_org_biz_partnership_biz ON public.organization_business_partnership(tenant_id, business_id);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_event_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_business_partnership ENABLE ROW LEVEL SECURITY;

-- organizations: public read for active; tenant_admin manages; organization_people with admin role can manage
DROP POLICY IF EXISTS "Public can view active organizations" ON public.organizations;
CREATE POLICY "Public can view active organizations"
  ON public.organizations
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_active = true
  );

DROP POLICY IF EXISTS "tenant_admin can manage organizations" ON public.organizations;
CREATE POLICY "tenant_admin can manage organizations"
  ON public.organizations
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "organization_admin can manage own organization" ON public.organizations;
CREATE POLICY "organization_admin can manage own organization"
  ON public.organizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_people op
      WHERE op.tenant_id = organizations.tenant_id
        AND op.organization_id = organizations.id
        AND op.user_id = auth.uid()
        AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente')
        AND op.status = 'active'
    )
  );

-- organization_units: similar to organizations
DROP POLICY IF EXISTS "Public can view units of active organizations" ON public.organization_units;
CREATE POLICY "Public can view units of active organizations"
  ON public.organization_units
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_units.organization_id
        AND o.tenant_id = organization_units.tenant_id
        AND o.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_admin and organization_admin can manage units" ON public.organization_units;
CREATE POLICY "tenant_admin and organization_admin can manage units"
  ON public.organization_units
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_people op
      WHERE op.tenant_id = organization_units.tenant_id
        AND op.organization_id = organization_units.organization_id
        AND op.user_id = auth.uid()
        AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente')
        AND op.status = 'active'
    )
  );

-- organization_people: public read limited; person can view own; admins manage
DROP POLICY IF EXISTS "Public can view active organization people" ON public.organization_people;
CREATE POLICY "Public can view active organization people"
  ON public.organization_people
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_people.organization_id
        AND o.tenant_id = organization_people.tenant_id
        AND o.is_active = true
    )
  );

DROP POLICY IF EXISTS "Person can view own record" ON public.organization_people;
CREATE POLICY "Person can view own record"
  ON public.organization_people
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin and organization_admin can manage people" ON public.organization_people;
CREATE POLICY "tenant_admin and organization_admin can manage people"
  ON public.organization_people
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_people op
      WHERE op.tenant_id = organization_people.tenant_id
        AND op.organization_id = organization_people.organization_id
        AND op.user_id = auth.uid()
        AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente')
        AND op.status = 'active'
    )
  );

-- organization_memberships: admins manage
DROP POLICY IF EXISTS "tenant_admin and organization_admin can manage memberships" ON public.organization_memberships;
CREATE POLICY "tenant_admin and organization_admin can manage memberships"
  ON public.organization_memberships
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_people op
      WHERE op.tenant_id = organization_memberships.tenant_id
        AND op.organization_id = organization_memberships.organization_id
        AND op.user_id = auth.uid()
        AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente')
        AND op.status = 'active'
    )
  );

-- organization_relationships: admins manage
DROP POLICY IF EXISTS "tenant_admin can manage organization_relationships" ON public.organization_relationships;
CREATE POLICY "tenant_admin can manage organization_relationships"
  ON public.organization_relationships
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

-- organization_event_link: admins manage
DROP POLICY IF EXISTS "tenant_admin can manage organization_event_link" ON public.organization_event_link;
CREATE POLICY "tenant_admin can manage organization_event_link"
  ON public.organization_event_link
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

-- organization_business_partnership: admins manage
DROP POLICY IF EXISTS "tenant_admin can manage organization_business_partnership" ON public.organization_business_partnership;
CREATE POLICY "tenant_admin can manage organization_business_partnership"
  ON public.organization_business_partnership
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

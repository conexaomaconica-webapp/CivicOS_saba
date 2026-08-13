-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Masonic Business Link (015)
-- ============================================================================
-- Vínculo comercial declarado: isolamento multi-tenant + ciclo de aprovação.
-- Público: somente vínculos aprovados/ativos de empresas publicadas.
-- Evidências e consentimentos são sensíveis: acesso restrito a declarante,
-- business members, tenant_admin e master.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- business_masonic_links
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved active links of published businesses" ON public.business_masonic_links;
CREATE POLICY "Public can view approved active links of published businesses"
  ON public.business_masonic_links
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND status IN ('approved', 'active')
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.tenant_id = business_masonic_links.tenant_id
        AND b.id = business_masonic_links.business_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "Declaring user can view own links" ON public.business_masonic_links;
CREATE POLICY "Declaring user can view own links"
  ON public.business_masonic_links
  FOR SELECT
  USING (declaring_user_id = auth.uid());

DROP POLICY IF EXISTS "Business members can view own business links" ON public.business_masonic_links;
CREATE POLICY "Business members can view own business links"
  ON public.business_masonic_links
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "Declaring user and business owners can manage own links" ON public.business_masonic_links;
CREATE POLICY "Declaring user and business owners can manage own links"
  ON public.business_masonic_links
  FOR ALL
  USING (
    declaring_user_id = auth.uid()
    OR public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant business_masonic_links" ON public.business_masonic_links;
CREATE POLICY "tenant_admin can manage tenant business_masonic_links"
  ON public.business_masonic_links
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all business_masonic_links" ON public.business_masonic_links;
CREATE POLICY "master can manage all business_masonic_links"
  ON public.business_masonic_links
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_evidence (armazenamento privado — acesso auditado)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to link can view evidence" ON public.business_masonic_link_evidence;
CREATE POLICY "Users with access to link can view evidence"
  ON public.business_masonic_link_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_evidence.tenant_id
        AND bml.id = business_masonic_link_evidence.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager', 'support'])
             OR public.has_tenant_admin_access(bml.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Declaring user can upload evidence for own links" ON public.business_masonic_link_evidence;
CREATE POLICY "Declaring user can upload evidence for own links"
  ON public.business_masonic_link_evidence
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_evidence.tenant_id
        AND bml.id = business_masonic_link_evidence.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager']))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage evidence" ON public.business_masonic_link_evidence;
CREATE POLICY "tenant_admin can manage evidence"
  ON public.business_masonic_link_evidence
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_evidence.tenant_id
        AND bml.id = business_masonic_link_evidence.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all evidence" ON public.business_masonic_link_evidence;
CREATE POLICY "master can manage all evidence"
  ON public.business_masonic_link_evidence
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_authorizations (registro empresarial auditável)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to link can view authorizations" ON public.business_masonic_link_authorizations;
CREATE POLICY "Users with access to link can view authorizations"
  ON public.business_masonic_link_authorizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_authorizations.tenant_id
        AND bml.id = business_masonic_link_authorizations.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'support', 'viewer'])
             OR public.has_tenant_admin_access(bml.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business owners and declaring user can manage authorizations" ON public.business_masonic_link_authorizations;
CREATE POLICY "Business owners and declaring user can manage authorizations"
  ON public.business_masonic_link_authorizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_authorizations.tenant_id
        AND bml.id = business_masonic_link_authorizations.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager']))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage authorizations" ON public.business_masonic_link_authorizations;
CREATE POLICY "tenant_admin can manage authorizations"
  ON public.business_masonic_link_authorizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_authorizations.tenant_id
        AND bml.id = business_masonic_link_authorizations.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all authorizations" ON public.business_masonic_link_authorizations;
CREATE POLICY "master can manage all authorizations"
  ON public.business_masonic_link_authorizations
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_publication_consents (consentimento granular LGPD)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_publication_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Declaring user can view own consents" ON public.business_masonic_link_publication_consents;
CREATE POLICY "Declaring user can view own consents"
  ON public.business_masonic_link_publication_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_publication_consents.tenant_id
        AND bml.id = business_masonic_link_publication_consents.link_id
        AND bml.declaring_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Declaring user can manage own consents" ON public.business_masonic_link_publication_consents;
CREATE POLICY "Declaring user can manage own consents"
  ON public.business_masonic_link_publication_consents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_publication_consents.tenant_id
        AND bml.id = business_masonic_link_publication_consents.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager']))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage consents" ON public.business_masonic_link_publication_consents;
CREATE POLICY "tenant_admin can manage consents"
  ON public.business_masonic_link_publication_consents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_publication_consents.tenant_id
        AND bml.id = business_masonic_link_publication_consents.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all consents" ON public.business_masonic_link_publication_consents;
CREATE POLICY "master can manage all consents"
  ON public.business_masonic_link_publication_consents
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_contests (entidade formal de contestação)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_contests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Opener can view own contests" ON public.business_masonic_link_contests;
CREATE POLICY "Opener can view own contests"
  ON public.business_masonic_link_contests
  FOR SELECT
  USING (opened_by = auth.uid());

DROP POLICY IF EXISTS "Users with access to link can view contests" ON public.business_masonic_link_contests;
CREATE POLICY "Users with access to link can view contests"
  ON public.business_masonic_link_contests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_contests.tenant_id
        AND bml.id = business_masonic_link_contests.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager', 'support'])
             OR public.has_tenant_admin_access(bml.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage contests" ON public.business_masonic_link_contests;
CREATE POLICY "tenant_admin can manage contests"
  ON public.business_masonic_link_contests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_contests.tenant_id
        AND bml.id = business_masonic_link_contests.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all contests" ON public.business_masonic_link_contests;
CREATE POLICY "master can manage all contests"
  ON public.business_masonic_link_contests
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_history (audit trail imutável)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to link can view history" ON public.business_masonic_link_history;
CREATE POLICY "Users with access to link can view history"
  ON public.business_masonic_link_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_history.tenant_id
        AND bml.id = business_masonic_link_history.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager', 'support', 'viewer'])
             OR public.has_tenant_admin_access(bml.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage history" ON public.business_masonic_link_history;
CREATE POLICY "tenant_admin can manage history"
  ON public.business_masonic_link_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_history.tenant_id
        AND bml.id = business_masonic_link_history.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all history" ON public.business_masonic_link_history;
CREATE POLICY "master can manage all history"
  ON public.business_masonic_link_history
  FOR ALL
  USING (public.has_global_platform_role('master'));

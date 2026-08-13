-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Contracts/LGPD (008) + Entitlements (009)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 008: legal_documents & legal_document_versions
-- ---------------------------------------------------------------------------

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view legal_documents in tenant" ON public.legal_documents;
CREATE POLICY "Public can view legal_documents in tenant"
  ON public.legal_documents
  FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_admin can manage legal_documents" ON public.legal_documents;
CREATE POLICY "tenant_admin can manage legal_documents"
  ON public.legal_documents
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all legal_documents" ON public.legal_documents;
CREATE POLICY "master can manage all legal_documents"
  ON public.legal_documents
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view legal_document_versions in tenant" ON public.legal_document_versions;
CREATE POLICY "Public can view legal_document_versions in tenant"
  ON public.legal_document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_documents d
      WHERE d.id = legal_document_versions.document_id
        AND (d.tenant_id IS NULL OR d.tenant_id = public.current_tenant_id())
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage legal_document_versions" ON public.legal_document_versions;
CREATE POLICY "tenant_admin can manage legal_document_versions"
  ON public.legal_document_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_documents d
      WHERE d.id = legal_document_versions.document_id
        AND public.has_tenant_admin_access(d.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all legal_document_versions" ON public.legal_document_versions;
CREATE POLICY "master can manage all legal_document_versions"
  ON public.legal_document_versions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 008: acceptance_records (evidência de aceite LGPD)
-- ---------------------------------------------------------------------------

ALTER TABLE public.acceptance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own acceptance_records" ON public.acceptance_records;
CREATE POLICY "User can view own acceptance_records"
  ON public.acceptance_records
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User can create own acceptance_records" ON public.acceptance_records;
CREATE POLICY "User can create own acceptance_records"
  ON public.acceptance_records
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_admin can manage acceptance_records of tenant" ON public.acceptance_records;
CREATE POLICY "tenant_admin can manage acceptance_records of tenant"
  ON public.acceptance_records
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all acceptance_records" ON public.acceptance_records;
CREATE POLICY "master can manage all acceptance_records"
  ON public.acceptance_records
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 008: consent_records & consent_withdrawals
-- ---------------------------------------------------------------------------

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own consent_records" ON public.consent_records;
CREATE POLICY "User can view own consent_records"
  ON public.consent_records
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User can create own consent_records" ON public.consent_records;
CREATE POLICY "User can create own consent_records"
  ON public.consent_records
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_admin can manage consent_records of tenant" ON public.consent_records;
CREATE POLICY "tenant_admin can manage consent_records of tenant"
  ON public.consent_records
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all consent_records" ON public.consent_records;
CREATE POLICY "master can manage all consent_records"
  ON public.consent_records
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.consent_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own consent_withdrawals" ON public.consent_withdrawals;
CREATE POLICY "User can view own consent_withdrawals"
  ON public.consent_withdrawals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.consent_records c
      WHERE c.id = consent_withdrawals.consent_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "User can create own consent_withdrawals" ON public.consent_withdrawals;
CREATE POLICY "User can create own consent_withdrawals"
  ON public.consent_withdrawals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consent_records c
      WHERE c.id = consent_withdrawals.consent_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage consent_withdrawals of tenant" ON public.consent_withdrawals;
CREATE POLICY "tenant_admin can manage consent_withdrawals of tenant"
  ON public.consent_withdrawals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.consent_records c
      WHERE c.id = consent_withdrawals.consent_id
        AND public.has_tenant_admin_access(c.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all consent_withdrawals" ON public.consent_withdrawals;
CREATE POLICY "master can manage all consent_withdrawals"
  ON public.consent_withdrawals
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 009: entitlement_definitions (catálogo global/por tenant)
-- ---------------------------------------------------------------------------

ALTER TABLE public.entitlement_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can view entitlement_definitions" ON public.entitlement_definitions;
CREATE POLICY "authenticated can view entitlement_definitions"
  ON public.entitlement_definitions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "master can manage entitlement_definitions" ON public.entitlement_definitions;
CREATE POLICY "master can manage entitlement_definitions"
  ON public.entitlement_definitions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 009: entitlement_sources
-- ---------------------------------------------------------------------------

ALTER TABLE public.entitlement_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage entitlement_sources" ON public.entitlement_sources;
CREATE POLICY "tenant_admin can manage entitlement_sources"
  ON public.entitlement_sources
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all entitlement_sources" ON public.entitlement_sources;
CREATE POLICY "master can manage all entitlement_sources"
  ON public.entitlement_sources
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 009: entitlement_grants
-- ---------------------------------------------------------------------------

ALTER TABLE public.entitlement_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own entitlement_grants" ON public.entitlement_grants;
CREATE POLICY "Business members can view own entitlement_grants"
  ON public.entitlement_grants
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage entitlement_grants" ON public.entitlement_grants;
CREATE POLICY "tenant_admin can manage entitlement_grants"
  ON public.entitlement_grants
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all entitlement_grants" ON public.entitlement_grants;
CREATE POLICY "master can manage all entitlement_grants"
  ON public.entitlement_grants
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 009: entitlement_usage & entitlement_overrides
-- ---------------------------------------------------------------------------

ALTER TABLE public.entitlement_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own entitlement_usage" ON public.entitlement_usage;
CREATE POLICY "Business members can view own entitlement_usage"
  ON public.entitlement_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.entitlement_grants g
      WHERE g.id = entitlement_usage.grant_id
        AND public.has_business_permission(g.tenant_id, g.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage entitlement_usage" ON public.entitlement_usage;
CREATE POLICY "tenant_admin can manage entitlement_usage"
  ON public.entitlement_usage
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.entitlement_grants g
      WHERE g.id = entitlement_usage.grant_id
        AND public.has_tenant_admin_access(g.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all entitlement_usage" ON public.entitlement_usage;
CREATE POLICY "master can manage all entitlement_usage"
  ON public.entitlement_usage
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.entitlement_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage entitlement_overrides" ON public.entitlement_overrides;
CREATE POLICY "tenant_admin can manage entitlement_overrides"
  ON public.entitlement_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.entitlement_grants g
      WHERE g.id = entitlement_overrides.grant_id
        AND public.has_tenant_admin_access(g.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all entitlement_overrides" ON public.entitlement_overrides;
CREATE POLICY "master can manage all entitlement_overrides"
  ON public.entitlement_overrides
  FOR ALL
  USING (public.has_global_platform_role('master'));

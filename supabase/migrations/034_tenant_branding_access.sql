-- ============================================================================
-- 034 — Tenant branding access (white-label)
-- ============================================================================
-- The tenants UPDATE policy (001) requires tenant_members.role = 'admin', but
-- the platform's operational tenant-admin role is 'socio_admin' (see
-- has_tenant_admin_access in 005/006). This blocked tenant admins from
-- persisting branding settings (white-label identity). Aligns the policy with
-- the platform-wide authorization function.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage tenant settings" ON public.tenants;

CREATE POLICY "Admins can manage tenant settings"
  ON public.tenants
  FOR UPDATE
  USING (public.has_tenant_admin_access(id))
  WITH CHECK (public.has_tenant_admin_access(id));
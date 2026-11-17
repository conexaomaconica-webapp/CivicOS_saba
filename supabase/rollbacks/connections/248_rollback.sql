-- ROLLBACK da migration 248: volta a has_business_permission da migration 040 (sem o atalho do dono por owner_id).
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

NOTIFY pgrst, 'reload schema';

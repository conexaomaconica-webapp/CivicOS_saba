-- Migration 085: Fix bml_guard_approval_flow to recognize service_role and admin access
-- Resolves constraint issue when updating business_masonic_links via Service Role / Platform Admin Actions

CREATE OR REPLACE FUNCTION public.bml_guard_approval_flow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_moderator BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('approved', 'active') THEN
      RAISE EXCEPTION 'Vínculos maçônicos são criados como rascunho';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_is_moderator := public.has_tenant_admin_access(NEW.tenant_id)
                    OR (auth.jwt() ->> 'role') = 'service_role'
                    OR current_setting('role', true) = 'service_role';

  -- Estados de aprovação/revisão exigem moderador (tenant_admin/master/service_role).
  IF NEW.status IN ('approved', 'active', 'under_review') AND NOT v_is_moderator THEN
    RAISE EXCEPTION 'Somente moderadores podem aprovar ou revisar vínculos maçônicos';
  END IF;

  RETURN NEW;
END;
$$;

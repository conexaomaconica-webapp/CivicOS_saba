-- Migration 047: Admin Audit Log, Quota Management & Independent Publication/Founder Status
-- Implements privileged administrative audit log (admin_audit_logs) and RPCs for quota changes,
-- business publication moderation, and founder allocation with strict before/after auditing.

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    before_value JSONB,
    after_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON public.admin_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity ON public.admin_audit_logs (entity_type, entity_id);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('platform_admin', 'tenant_admin')
    )
);

-- RPC: Update Plan Entitlements / Quotas with Audit Logging
CREATE OR REPLACE FUNCTION public.update_plan_entitlement_quota(
    p_tenant_id UUID,
    p_entitlement_id UUID,
    p_services_limit INT,
    p_benefits_limit INT,
    p_gallery_limit INT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_is_platform_admin BOOLEAN;
    v_before JSONB;
    v_after JSONB;
BEGIN
    -- Enforce platform_admin privilege
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_actor_id AND r.name = 'platform_admin'
    ) INTO v_is_platform_admin;

    IF NOT v_is_platform_admin THEN
        RAISE EXCEPTION 'Acesso negado: Apenas platform_admin pode alterar cotas de planos.' USING ERRCODE = '42501';
    END IF;

    -- Capture state before change
    SELECT to_jsonb(e.*) INTO v_before
    FROM public.plan_entitlements e
    WHERE e.id = p_entitlement_id;

    IF v_before IS NULL THEN
        RAISE EXCEPTION 'Registro de cota não encontrado para o ID %', p_entitlement_id USING ERRCODE = 'P0002';
    END IF;

    -- Perform update
    UPDATE public.plan_entitlements
    SET services_limit = COALESCE(p_services_limit, services_limit),
        benefits_limit = COALESCE(p_benefits_limit, benefits_limit),
        gallery_limit = COALESCE(p_gallery_limit, gallery_limit),
        updated_at = NOW()
    WHERE id = p_entitlement_id;

    -- Capture state after change
    SELECT to_jsonb(e.*) INTO v_after
    FROM public.plan_entitlements e
    WHERE e.id = p_entitlement_id;

    -- Insert Audit Log
    INSERT INTO public.admin_audit_logs (
        tenant_id,
        actor_id,
        entity_type,
        entity_id,
        action,
        before_value,
        after_value,
        reason
    ) VALUES (
        p_tenant_id,
        v_actor_id,
        'plan_entitlements',
        p_entitlement_id,
        'UPDATE_QUOTA',
        v_before,
        v_after,
        p_reason
    );

    RETURN v_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Moderate Business Publication Status (Independent of Founder status)
CREATE OR REPLACE FUNCTION public.moderate_business_publication_status(
    p_tenant_id UUID,
    p_business_id UUID,
    p_new_status VARCHAR(30),
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_before JSONB;
    v_after JSONB;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_actor_id AND r.name IN ('platform_admin', 'tenant_admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Acesso negado: Requer permissão administrativa.' USING ERRCODE = '42501';
    END IF;

    IF p_new_status NOT IN ('draft', 'pending_review', 'published', 'rejected', 'suspended') THEN
        RAISE EXCEPTION 'Status de publicação inválido: %', p_new_status USING ERRCODE = '22023';
    END IF;

    SELECT jsonb_build_object(
        'id', b.id,
        'publication_status', b.publication_status,
        'is_active', b.is_active
    ) INTO v_before
    FROM public.business_profiles b
    WHERE b.id = p_business_id AND b.tenant_id = p_tenant_id;

    IF v_before IS NULL THEN
        RAISE EXCEPTION 'Empresa não encontrada para moderação.' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.business_profiles
    SET publication_status = p_new_status,
        updated_at = NOW()
    WHERE id = p_business_id AND tenant_id = p_tenant_id;

    SELECT jsonb_build_object(
        'id', b.id,
        'publication_status', b.publication_status,
        'is_active', b.is_active
    ) INTO v_after
    FROM public.business_profiles b
    WHERE b.id = p_business_id AND b.tenant_id = p_tenant_id;

    INSERT INTO public.admin_audit_logs (
        tenant_id,
        actor_id,
        entity_type,
        entity_id,
        action,
        before_value,
        after_value,
        reason
    ) VALUES (
        p_tenant_id,
        v_actor_id,
        'business_profile',
        p_business_id,
        'MODERATE_PUBLICATION_STATUS',
        v_before,
        v_after,
        p_reason
    );

    RETURN v_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Allocate Founder Status (Does NOT alter publication_status)
CREATE OR REPLACE FUNCTION public.allocate_founder_status(
    p_tenant_id UUID,
    p_business_id UUID,
    p_is_founder BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_before JSONB;
    v_after JSONB;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_actor_id AND r.name IN ('platform_admin', 'tenant_admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Acesso negado: Requer permissão administrativa.' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'id', b.id,
        'is_founder', COALESCE(b.is_founder, false)
    ) INTO v_before
    FROM public.business_profiles b
    WHERE b.id = p_business_id AND b.tenant_id = p_tenant_id;

    IF v_before IS NULL THEN
        RAISE EXCEPTION 'Empresa não encontrada para alocação Founder.' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.business_profiles
    SET is_founder = p_is_founder,
        updated_at = NOW()
    WHERE id = p_business_id AND tenant_id = p_tenant_id;

    SELECT jsonb_build_object(
        'id', b.id,
        'is_founder', b.is_founder
    ) INTO v_after
    FROM public.business_profiles b
    WHERE b.id = p_business_id AND tenant_id = p_tenant_id;

    INSERT INTO public.admin_audit_logs (
        tenant_id,
        actor_id,
        entity_type,
        entity_id,
        action,
        before_value,
        after_value,
        reason
    ) VALUES (
        p_tenant_id,
        v_actor_id,
        'business_profile',
        p_business_id,
        'ALLOCATE_FOUNDER_STATUS',
        v_before,
        v_after,
        p_reason
    );

    RETURN v_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration 078: Atomic Admin Plan Rules Update & Mandatory Audit Logging
-- Implements admin_update_plan_payment_rule RPC with explicit SET search_path = ''
-- Guarantees atomic transaction for updating plan_payment_rules AND inserting admin_audit_logs.

CREATE OR REPLACE FUNCTION public.admin_update_plan_payment_rule(
    p_plan_code TEXT,
    p_amount_cents INTEGER,
    p_installments_max INTEGER,
    p_interest_free_installments INTEGER,
    p_payment_methods_allowed JSONB DEFAULT '["pix", "credit_card"]'::jsonb,
    p_reason TEXT DEFAULT 'Atualização de regra comercial pelo administrador de plataforma'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
    v_before_value JSONB;
    v_after_value JSONB;
    v_rule_id UUID;
BEGIN
    -- 1. Obter usuário autenticado
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Sessão expirada ou usuário não autenticado.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Verificar permissão de Admin de Plataforma via RPC canônica
    SELECT public.has_platform_admin_access() INTO v_is_admin;
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'FORBIDDEN: Requer acesso de administrador de plataforma.'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Obter estado anterior da regra comercial
    SELECT jsonb_build_object(
        'id', id,
        'plan_code', plan_code,
        'amount_cents', amount_cents,
        'installments_max', installments_max,
        'interest_free_installments', interest_free_installments,
        'payment_methods_allowed', payment_methods_allowed,
        'updated_at', updated_at
    ), id INTO v_before_value, v_rule_id
    FROM public.plan_payment_rules
    WHERE LOWER(plan_code) = LOWER(p_plan_code);

    IF v_before_value IS NULL THEN
        v_before_value := '{}'::jsonb;
        v_rule_id := gen_random_uuid();
    END IF;

    -- 4. Atualizar/Inserir a regra comercial em plan_payment_rules (Atômico)
    INSERT INTO public.plan_payment_rules (
        id,
        plan_code,
        amount_cents,
        installments_max,
        interest_free_installments,
        payment_methods_allowed,
        updated_at
    )
    VALUES (
        v_rule_id,
        LOWER(p_plan_code),
        p_amount_cents,
        p_installments_max,
        p_interest_free_installments,
        p_payment_methods_allowed,
        NOW()
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        amount_cents = EXCLUDED.amount_cents,
        installments_max = EXCLUDED.installments_max,
        interest_free_installments = EXCLUDED.interest_free_installments,
        payment_methods_allowed = EXCLUDED.payment_methods_allowed,
        updated_at = NOW();

    -- 5. Montar estado posterior
    v_after_value := jsonb_build_object(
        'plan_code', LOWER(p_plan_code),
        'amount_cents', p_amount_cents,
        'installments_max', p_installments_max,
        'interest_free_installments', p_interest_free_installments,
        'payment_methods_allowed', p_payment_methods_allowed,
        'updated_at', NOW()
    );

    -- 6. Inserir log de auditoria obrigatoriamente na MESMA transação
    INSERT INTO public.admin_audit_logs (
        tenant_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        before_value,
        after_value,
        reason
    )
    VALUES (
        '00000000-0000-0000-0000-000000000001'::uuid,
        v_user_id,
        'UPDATE_PLAN_PAYMENT_RULES',
        'plan_payment_rules',
        v_rule_id,
        v_before_value,
        v_after_value,
        COALESCE(p_reason, 'Atualização comercial efetuada no admin')
    );

    RETURN jsonb_build_object(
        'success', true,
        'plan_code', LOWER(p_plan_code),
        'amount_cents', p_amount_cents,
        'audited', true
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_plan_payment_rule(TEXT, INTEGER, INTEGER, INTEGER, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_plan_payment_rule(TEXT, INTEGER, INTEGER, INTEGER, JSONB, TEXT) TO service_role;

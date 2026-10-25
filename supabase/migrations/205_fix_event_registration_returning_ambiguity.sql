-- ===========================================================================
-- Migration: 205_fix_event_registration_returning_ambiguity.sql
-- Descrição: Corrige ambiguidade na cláusula RETURNING da RPC
--            upsert_event_registration (PostgreSQL erro 42702).
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.upsert_event_registration(
    p_event_id            UUID,
    p_full_name           TEXT,
    p_whatsapp            TEXT,
    p_email               TEXT        DEFAULT NULL,
    p_attendee_type       VARCHAR(30) DEFAULT 'convidado',
    p_masonic_organization TEXT       DEFAULT NULL,
    p_company_name        TEXT        DEFAULT NULL,
    p_city                TEXT        DEFAULT NULL,
    p_attendance_status   VARCHAR(20) DEFAULT 'confirmed',
    p_source              TEXT        DEFAULT NULL,
    p_utm_source          TEXT        DEFAULT NULL,
    p_utm_medium          TEXT        DEFAULT NULL,
    p_utm_campaign        TEXT        DEFAULT NULL
)
RETURNS TABLE (
    registration_id   UUID,
    confirmation_code TEXT,
    is_new            BOOLEAN,
    full_name         TEXT,
    attendance_status TEXT,
    checkin_token     UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
    v_tenant_id        UUID;
    v_event_date       DATE;
    v_reg_enabled      BOOLEAN;
    v_capacity         INT;
    v_current_count    INT;
    v_whatsapp_clean   TEXT;
    v_existing_id      UUID;
    v_existing_code    TEXT;
    v_existing_token   UUID;
    v_new_code         TEXT;
    v_result_id        UUID;
    v_result_code      TEXT;
    v_result_token     UUID;
    v_is_new           BOOLEAN;
BEGIN
    -- Normalizar WhatsApp: apenas dígitos
    v_whatsapp_clean := regexp_replace(p_whatsapp, '[^0-9]', '', 'g');

    IF length(v_whatsapp_clean) < 10 THEN
        RAISE EXCEPTION 'WhatsApp inválido: mínimo 10 dígitos.' USING ERRCODE = 'P0001';
    END IF;

    IF length(trim(p_full_name)) < 3 THEN
        RAISE EXCEPTION 'Nome completo deve ter pelo menos 3 caracteres.' USING ERRCODE = 'P0001';
    END IF;

    IF p_attendee_type NOT IN ('macom', 'cunhada', 'familiar', 'convidado') THEN
        RAISE EXCEPTION 'Tipo de participante inválido.' USING ERRCODE = 'P0001';
    END IF;

    IF p_attendance_status NOT IN ('confirmed', 'declined') THEN
        RAISE EXCEPTION 'Status de presença inválido.' USING ERRCODE = 'P0001';
    END IF;

    -- Buscar dados do evento
    SELECT e.tenant_id, e.event_date, e.registration_enabled, e.capacity
    INTO v_tenant_id, v_event_date, v_reg_enabled, v_capacity
    FROM public.platform_events e
    WHERE e.id = p_event_id AND e.status = 'published';

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Evento não encontrado ou não está disponível.' USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_reg_enabled THEN
        RAISE EXCEPTION 'As inscrições para este evento estão encerradas.' USING ERRCODE = 'P0003';
    END IF;

    -- Verificar capacidade (apenas para novos registros confirmados)
    IF v_capacity IS NOT NULL AND p_attendance_status = 'confirmed' THEN
        SELECT COUNT(*)::INT INTO v_current_count
        FROM public.event_registrations r
        WHERE r.event_id = p_event_id
          AND r.attendance_status = 'confirmed';

        SELECT r.id INTO v_existing_id
        FROM public.event_registrations r
        WHERE r.event_id = p_event_id AND r.whatsapp = v_whatsapp_clean;

        IF v_existing_id IS NULL AND v_current_count >= v_capacity THEN
            RAISE EXCEPTION 'Capacidade máxima do evento atingida.' USING ERRCODE = 'P0004';
        END IF;
    END IF;

    -- Verificar registro existente por WhatsApp
    SELECT r.id, r.confirmation_code, r.checkin_token
    INTO v_existing_id, v_existing_code, v_existing_token
    FROM public.event_registrations r
    WHERE r.event_id = p_event_id AND r.whatsapp = v_whatsapp_clean;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.event_registrations
        SET
            full_name            = trim(p_full_name),
            email                = lower(trim(p_email)),
            attendee_type        = p_attendee_type,
            masonic_organization = trim(p_masonic_organization),
            company_name         = trim(p_company_name),
            city                 = trim(p_city),
            attendance_status    = p_attendance_status,
            source               = COALESCE(p_source, source),
            utm_source           = COALESCE(p_utm_source, utm_source),
            utm_medium           = COALESCE(p_utm_medium, utm_medium),
            utm_campaign         = COALESCE(p_utm_campaign, utm_campaign),
            updated_at           = NOW()
        WHERE id = v_existing_id;

        v_result_id    := v_existing_id;
        v_result_code  := v_existing_code;
        v_result_token := v_existing_token;
        v_is_new       := false;
    ELSE
        v_new_code := public.generate_event_confirmation_code(v_event_date, 'CM');

        INSERT INTO public.event_registrations (
            event_id, tenant_id,
            full_name, whatsapp, email,
            attendee_type, masonic_organization, company_name, city,
            attendance_status, confirmation_code,
            source, utm_source, utm_medium, utm_campaign
        ) VALUES (
            p_event_id, v_tenant_id,
            trim(p_full_name), v_whatsapp_clean, lower(trim(p_email)),
            p_attendee_type, trim(p_masonic_organization), trim(p_company_name), trim(p_city),
            p_attendance_status, v_new_code,
            p_source, p_utm_source, p_utm_medium, p_utm_campaign
        )
        RETURNING event_registrations.id, event_registrations.checkin_token
        INTO v_result_id, v_result_token;

        v_result_code := v_new_code;
        v_is_new      := true;
    END IF;

    RETURN QUERY SELECT
        v_result_id,
        v_result_code,
        v_is_new,
        trim(p_full_name)::TEXT,
        p_attendance_status::TEXT,
        v_result_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_event_registration(UUID, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ===========================================================================
-- Migration: 113_undo_checkin_rpc.sql
-- Descrição: Adiciona checkin_token à tabela event_registrations, RPC para
--            desfazer check-in (exclusivo master/socio_admin), suporte a busca
--            por token e filtro por status de check-in.
-- Data: 2026-09-23
-- ===========================================================================

-- 1. Adicionar coluna checkin_token se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'event_registrations'
          AND column_name  = 'checkin_token'
    ) THEN
        ALTER TABLE public.event_registrations
        ADD COLUMN checkin_token UUID NOT NULL DEFAULT gen_random_uuid();

        CREATE UNIQUE INDEX idx_event_registrations_checkin_token
        ON public.event_registrations(checkin_token);
    END IF;
END $$;

-- 2. RPC: Desfazer Check-in (Admin master / socio_admin)
DROP FUNCTION IF EXISTS public.admin_undo_checkin_registration(UUID);
CREATE OR REPLACE FUNCTION public.admin_undo_checkin_registration(p_registration_id UUID)
RETURNS TABLE (
    registration_id   UUID,
    full_name         VARCHAR(255),
    confirmation_code VARCHAR(30),
    success           BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Guard: apenas master ou socio_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('master', 'socio_admin')
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado: apenas administradores master ou sócio admin podem desfazer check-in.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.event_registrations
    SET checked_in_at = NULL,
        updated_at = NOW()
    WHERE id = p_registration_id;

    RETURN QUERY
    SELECT r.id, r.full_name, r.confirmation_code, true
    FROM public.event_registrations r
    WHERE r.id = p_registration_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_undo_checkin_registration(UUID) TO authenticated;

-- 3. Atualizar RPC: Listar Inscrições com filtro p_has_checkin e retorno de checkin_token
DROP FUNCTION IF EXISTS public.admin_list_event_registrations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.admin_list_event_registrations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.admin_list_event_registrations(
    p_event_id          UUID,
    p_search            TEXT    DEFAULT NULL,
    p_attendance_status TEXT    DEFAULT NULL,
    p_attendee_type     TEXT    DEFAULT NULL,
    p_city              TEXT    DEFAULT NULL,
    p_source            TEXT    DEFAULT NULL,
    p_limit             INT     DEFAULT 50,
    p_offset            INT     DEFAULT 0,
    p_has_checkin       BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id                   UUID,
    full_name            VARCHAR(255),
    whatsapp             VARCHAR(20),
    email                VARCHAR(255),
    attendee_type        VARCHAR(30),
    masonic_organization VARCHAR(255),
    company_name         VARCHAR(255),
    city                 VARCHAR(100),
    attendance_status    VARCHAR(20),
    confirmation_code    VARCHAR(30),
    source               VARCHAR(100),
    utm_source           VARCHAR(100),
    utm_campaign         VARCHAR(100),
    checked_in_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ,
    total_count          BIGINT,
    checkin_token        UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Guard: apenas admins
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        r.id,
        r.full_name,
        r.whatsapp,
        r.email,
        r.attendee_type,
        r.masonic_organization,
        r.company_name,
        r.city,
        r.attendance_status,
        r.confirmation_code,
        r.source,
        r.utm_source,
        r.utm_campaign,
        r.checked_in_at,
        r.created_at,
        COUNT(*) OVER ()::BIGINT AS total_count,
        r.checkin_token
    FROM public.event_registrations r
    WHERE r.event_id = p_event_id
      AND (p_search IS NULL OR (
            r.full_name ILIKE '%' || p_search || '%'
            OR r.whatsapp ILIKE '%' || regexp_replace(p_search, '[^0-9]', '', 'g') || '%'
            OR r.confirmation_code ILIKE '%' || p_search || '%'
            OR r.checkin_token::text = p_search
          ))
      AND (p_attendance_status IS NULL OR r.attendance_status = p_attendance_status)
      AND (p_attendee_type     IS NULL OR r.attendee_type     = p_attendee_type)
      AND (p_city              IS NULL OR r.city ILIKE '%' || p_city || '%')
      AND (p_source            IS NULL OR COALESCE(r.source, 'direto') = p_source)
      AND (p_has_checkin       IS NULL OR (p_has_checkin = TRUE AND r.checked_in_at IS NOT NULL) OR (p_has_checkin = FALSE AND r.checked_in_at IS NULL))
    ORDER BY r.created_at DESC
    LIMIT  LEAST(GREATEST(p_limit, 1), 200)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_event_registrations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, BOOLEAN) TO authenticated;

-- 4. Atualizar RPC: upsert_event_registration para retornar checkin_token
DROP FUNCTION IF EXISTS public.upsert_event_registration(UUID, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, TEXT);
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
        RETURNING id, checkin_token INTO v_result_id, v_result_token;

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

-- 5. RPC: Buscar Inscrição por Checkin Token (Admin recepção)
DROP FUNCTION IF EXISTS public.admin_get_registration_by_token(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.admin_get_registration_by_token(
    p_event_id UUID,
    p_token    TEXT
)
RETURNS TABLE (
    id                   UUID,
    full_name            VARCHAR(255),
    whatsapp             VARCHAR(20),
    email                VARCHAR(255),
    attendee_type        VARCHAR(30),
    masonic_organization VARCHAR(255),
    company_name         VARCHAR(255),
    city                 VARCHAR(100),
    attendance_status    VARCHAR(20),
    confirmation_code    VARCHAR(30),
    checked_in_at        TIMESTAMPTZ,
    checkin_token        UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Guard: apenas admins
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        r.id,
        r.full_name,
        r.whatsapp,
        r.email,
        r.attendee_type,
        r.masonic_organization,
        r.company_name,
        r.city,
        r.attendance_status,
        r.confirmation_code,
        r.checked_in_at,
        r.checkin_token
    FROM public.event_registrations r
    WHERE r.event_id = p_event_id
      AND (r.checkin_token::text = trim(p_token) OR r.confirmation_code = trim(p_token))
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_registration_by_token(UUID, TEXT) TO authenticated;


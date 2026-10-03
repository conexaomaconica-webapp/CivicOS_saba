-- Corrige buscas textuais que antes geravam ILIKE '%%' no campo WhatsApp.
CREATE OR REPLACE FUNCTION public.admin_list_event_registrations(
    p_event_id UUID, p_search TEXT DEFAULT NULL, p_attendance_status TEXT DEFAULT NULL,
    p_attendee_type TEXT DEFAULT NULL, p_city TEXT DEFAULT NULL, p_source TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50, p_offset INT DEFAULT 0, p_has_checkin BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id UUID, full_name VARCHAR(255), whatsapp VARCHAR(20), email VARCHAR(255),
    attendee_type VARCHAR(30), masonic_organization VARCHAR(255), company_name VARCHAR(255),
    city VARCHAR(100), attendance_status VARCHAR(20), confirmation_code VARCHAR(30),
    source VARCHAR(100), utm_source VARCHAR(100), utm_campaign VARCHAR(100),
    checked_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ, total_count BIGINT, checkin_token UUID
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_search TEXT := NULLIF(BTRIM(p_search), '');
    v_search_digits TEXT := NULLIF(regexp_replace(COALESCE(p_search, ''), '[^0-9]', '', 'g'), '');
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
          AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT r.id, r.full_name, r.whatsapp, r.email, r.attendee_type,
        r.masonic_organization, r.company_name, r.city, r.attendance_status,
        r.confirmation_code, r.source, r.utm_source, r.utm_campaign,
        r.checked_in_at, r.created_at, COUNT(*) OVER ()::BIGINT, r.checkin_token
    FROM public.event_registrations r
    WHERE r.event_id = p_event_id
      AND (v_search IS NULL OR (
        r.full_name ILIKE '%' || v_search || '%'
        OR (v_search_digits IS NOT NULL AND r.whatsapp ILIKE '%' || v_search_digits || '%')
        OR r.confirmation_code ILIKE '%' || v_search || '%'
        OR r.checkin_token::text = v_search
      ))
      AND (p_attendance_status IS NULL OR r.attendance_status = p_attendance_status)
      AND (p_attendee_type IS NULL OR r.attendee_type = p_attendee_type)
      AND (p_city IS NULL OR r.city ILIKE '%' || p_city || '%')
      AND (p_source IS NULL OR COALESCE(r.source, 'direto') = p_source)
      AND (p_has_checkin IS NULL OR (p_has_checkin AND r.checked_in_at IS NOT NULL)
           OR (NOT p_has_checkin AND r.checked_in_at IS NULL))
    ORDER BY r.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200) OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_event_registrations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, BOOLEAN) TO authenticated;

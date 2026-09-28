-- Migration 116: Fix Event Dashboard Metrics Count (Eliminate Cartesian Product in admin_get_event_dashboard)
-- CivicOS SABA / Conexão Maçônica

CREATE OR REPLACE FUNCTION public.admin_get_event_dashboard(p_event_id UUID)
RETURNS TABLE (
    total_registrations  BIGINT,
    total_confirmed      BIGINT,
    total_declined       BIGINT,
    total_checkins       BIGINT,
    by_attendee_type     JSONB,
    by_source            JSONB
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
    WITH metrics AS (
        SELECT
            COUNT(*)::BIGINT                                                   AS total_registrations,
            COUNT(*) FILTER (WHERE r.attendance_status = 'confirmed')::BIGINT  AS total_confirmed,
            COUNT(*) FILTER (WHERE r.attendance_status = 'declined')::BIGINT   AS total_declined,
            COUNT(*) FILTER (WHERE r.checked_in_at IS NOT NULL)::BIGINT        AS total_checkins
        FROM public.event_registrations r
        WHERE r.event_id = p_event_id
    ),
    types AS (
        SELECT jsonb_object_agg(attendee_type, cnt) AS by_attendee_type
        FROM (
            SELECT attendee_type, COUNT(*)::BIGINT AS cnt
            FROM public.event_registrations
            WHERE event_id = p_event_id
            GROUP BY attendee_type
        ) t
    ),
    sources AS (
        SELECT jsonb_object_agg(source, cnt) AS by_source
        FROM (
            SELECT COALESCE(source, 'direto') AS source, COUNT(*)::BIGINT AS cnt
            FROM public.event_registrations
            WHERE event_id = p_event_id
            GROUP BY COALESCE(source, 'direto')
        ) s
    )
    SELECT
        m.total_registrations,
        m.total_confirmed,
        m.total_declined,
        m.total_checkins,
        COALESCE(t.by_attendee_type, '{}'::jsonb),
        COALESCE(s.by_source, '{}'::jsonb)
    FROM metrics m
    CROSS JOIN types t
    CROSS JOIN sources s;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_event_dashboard(UUID) TO authenticated;

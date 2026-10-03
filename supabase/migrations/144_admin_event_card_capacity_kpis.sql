-- KPIs adicionais dos cards administrativos de eventos.
DROP FUNCTION IF EXISTS public.admin_list_platform_events();
CREATE OR REPLACE FUNCTION public.admin_list_platform_events()
RETURNS TABLE (
    id UUID, slug VARCHAR(120), title VARCHAR(255), event_date DATE, start_time TIME,
    venue_name VARCHAR(255), city VARCHAR(100), status VARCHAR(30),
    registration_enabled BOOLEAN, capacity INT, total_registrations BIGINT,
    total_confirmed BIGINT, total_declined BIGINT, total_checkins BIGINT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
          AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT e.id, e.slug, e.title, e.event_date, e.start_time, e.venue_name,
        e.city, e.status, e.registration_enabled, e.capacity,
        COUNT(r.id)::BIGINT,
        COUNT(r.id) FILTER (WHERE r.attendance_status = 'confirmed')::BIGINT,
        COUNT(r.id) FILTER (WHERE r.attendance_status = 'declined')::BIGINT,
        COUNT(r.id) FILTER (WHERE r.checked_in_at IS NOT NULL)::BIGINT,
        e.created_at
    FROM public.platform_events e
    LEFT JOIN public.event_registrations r ON r.event_id = e.id
    GROUP BY e.id, e.slug, e.title, e.event_date, e.start_time, e.venue_name,
        e.city, e.status, e.registration_enabled, e.capacity, e.created_at
    ORDER BY e.event_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_platform_events() TO authenticated;

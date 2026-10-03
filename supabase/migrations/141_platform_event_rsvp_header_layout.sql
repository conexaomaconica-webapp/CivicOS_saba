-- Controles visuais do cabeçalho público RSVP.
ALTER TABLE public.platform_events
  ADD COLUMN IF NOT EXISTS header_media_size TEXT NOT NULL DEFAULT 'medium'
    CHECK (header_media_size IN ('small', 'medium', 'large', 'full')),
  ADD COLUMN IF NOT EXISTS header_media_position TEXT NOT NULL DEFAULT 'center'
    CHECK (header_media_position IN ('left', 'center', 'right')),
  ADD COLUMN IF NOT EXISTS badge_text TEXT NOT NULL DEFAULT 'Convite';

DROP FUNCTION IF EXISTS public.get_platform_event_by_slug(TEXT);
CREATE OR REPLACE FUNCTION public.get_platform_event_by_slug(p_slug TEXT)
RETURNS TABLE (
    id UUID,
    slug VARCHAR(120),
    title VARCHAR(255),
    subtitle TEXT,
    description TEXT,
    event_date DATE,
    start_time TIME,
    end_time TIME,
    timezone VARCHAR(50),
    venue_name VARCHAR(255),
    venue_address TEXT,
    city VARCHAR(100),
    cover_image_url TEXT,
    header_media_type TEXT,
    header_media_size TEXT,
    header_media_position TEXT,
    badge_text TEXT,
    registration_enabled BOOLEAN,
    capacity INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id, e.slug, e.title, e.subtitle, e.description, e.event_date,
        e.start_time, e.end_time, e.timezone, e.venue_name,
        e.venue_address, e.city, e.cover_image_url, e.header_media_type,
        e.header_media_size, e.header_media_position, e.badge_text,
        e.registration_enabled, e.capacity
    FROM public.platform_events e
    WHERE e.slug = p_slug
      AND e.status = 'published'
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_event_by_slug(TEXT) TO anon, authenticated;

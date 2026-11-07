-- ============================================================================
-- Migration 222: Fix profiles full_name column & add platform_events organizer_name
-- 1. Garante compatibilidade bidirecional da coluna full_name em public.profiles.
-- 2. Corrige a função interna public._mask_user_display_name para usar COALESCE(name, full_name).
-- 3. Adiciona organizer_name em public.platform_events e atualiza RPC get_platform_event_by_slug.
-- ============================================================================

-- 1. Garante a coluna full_name em public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

UPDATE public.profiles
SET full_name = name
WHERE full_name IS NULL AND name IS NOT NULL;

-- Trigger para manter sincronizados name e full_name
CREATE OR REPLACE FUNCTION public.trg_sync_profiles_name_and_full_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.name IS NOT NULL AND (NEW.full_name IS NULL OR NEW.full_name = '') THEN
    NEW.full_name := NEW.name;
  ELSIF NEW.full_name IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
    NEW.name := NEW.full_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_names ON public.profiles;
CREATE TRIGGER trg_profiles_sync_names
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_profiles_name_and_full_name();

-- 2. Corrige a função _mask_user_display_name para nunca falhar se full_name ou name for nulo
CREATE OR REPLACE FUNCTION public._mask_user_display_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
  v_first_name TEXT;
  v_last_initial TEXT;
  v_parts TEXT[];
BEGIN
  SELECT COALESCE(p.name, p.full_name) INTO v_name
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF v_name IS NULL OR TRIM(v_name) = '' THEN
    RETURN 'Irmão M.';
  END IF;

  v_parts := regexp_split_to_array(TRIM(v_name), '\s+');
  v_first_name := v_parts[1];

  IF array_length(v_parts, 1) > 1 THEN
    v_last_initial := UPPER(SUBSTRING(v_parts[array_length(v_parts, 1)] FROM 1 FOR 1)) || '.';
    RETURN v_first_name || ' ' || v_last_initial;
  ELSE
    RETURN v_first_name;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public._mask_user_display_name(UUID) TO anon, authenticated;

-- 3. Adiciona organizer_name em platform_events
ALTER TABLE public.platform_events
  ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255);

-- Atualiza a RPC get_platform_event_by_slug para incluir organizer_name
DROP FUNCTION IF EXISTS public.get_platform_event_by_slug(TEXT);
CREATE OR REPLACE FUNCTION public.get_platform_event_by_slug(p_slug TEXT)
RETURNS TABLE (
    id UUID, slug VARCHAR(120), title VARCHAR(255), subtitle TEXT, description TEXT,
    event_date DATE, start_time TIME, end_time TIME, timezone VARCHAR(50),
    venue_name VARCHAR(255), venue_address TEXT, city VARCHAR(100), cover_image_url TEXT,
    header_media_type TEXT, header_media_size TEXT, header_media_position TEXT,
    badge_text TEXT, footer_information TEXT, registration_enabled BOOLEAN, capacity INT,
    organizer_name VARCHAR(255)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.slug, e.title, e.subtitle, e.description, e.event_date,
        e.start_time, e.end_time, e.timezone, e.venue_name, e.venue_address,
        e.city, e.cover_image_url, e.header_media_type, e.header_media_size,
        e.header_media_position, e.badge_text, e.footer_information,
        e.registration_enabled, e.capacity, e.organizer_name
    FROM public.platform_events e
    WHERE e.slug = p_slug AND e.status = 'published'
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_event_by_slug(TEXT) TO anon, authenticated;


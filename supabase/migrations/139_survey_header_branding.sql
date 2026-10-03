ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS header_color TEXT NOT NULL DEFAULT '#4B161B',
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_header_color_format;
ALTER TABLE public.surveys
  ADD CONSTRAINT surveys_header_color_format CHECK (header_color ~ '^#[0-9A-Fa-f]{6}$');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('survey-assets', 'survey-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "survey_assets_public_read" ON storage.objects;
CREATE POLICY "survey_assets_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'survey-assets');

DROP POLICY IF EXISTS "survey_assets_admin_manage" ON storage.objects;
CREATE POLICY "survey_assets_admin_manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'survey-assets' AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND LOWER(COALESCE(p.role, '')) IN ('admin', 'superadmin', 'platform_admin', 'master', 'socio_admin')
  ))
  WITH CHECK (bucket_id = 'survey-assets' AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND LOWER(COALESCE(p.role, '')) IN ('admin', 'superadmin', 'platform_admin', 'master', 'socio_admin')
  ));

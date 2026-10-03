-- Imagem configurável no topo dos eventos da plataforma.
ALTER TABLE public.platform_events
  ADD COLUMN IF NOT EXISTS header_media_type TEXT NOT NULL DEFAULT 'logo'
  CHECK (header_media_type IN ('logo', 'banner'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-assets',
  'event-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "event_assets_public_read" ON storage.objects;
CREATE POLICY "event_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-assets');

DROP POLICY IF EXISTS "event_assets_admin_manage" ON storage.objects;
CREATE POLICY "event_assets_admin_manage"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'event-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(COALESCE(p.role, '')) IN ('admin', 'superadmin', 'platform_admin', 'master', 'socio_admin')
    )
  )
  WITH CHECK (
    bucket_id = 'event-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(COALESCE(p.role, '')) IN ('admin', 'superadmin', 'platform_admin', 'master', 'socio_admin')
    )
  );

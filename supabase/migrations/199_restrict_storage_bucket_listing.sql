-- =============================================================================
-- Migration 199: Restringir listagem pública de buckets de storage sensíveis
-- =============================================================================
-- Remove a permissão de listagem anônima (SELECT público em storage.objects)
-- nos buckets 'member-avatars', 'business-assets' e 'event-assets'.
-- 
-- IMPORTANTE: A exibição pública de imagens via URL direta continua totalmente
-- operacional, pois os buckets permanecem configurados com public = true.
-- =============================================================================

-- 1. member-avatars (Fotos de membros)
DROP POLICY IF EXISTS "Permitir leitura pública no member-avatars" ON storage.objects;
DROP POLICY IF EXISTS "member_avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "member_avatars_authenticated_read" ON storage.objects;

-- Permite SELECT no storage.objects apenas para o próprio membro (para o seu folder) ou administradores
CREATE POLICY "member_avatars_authenticated_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'member-avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'superadmin', 'platform_admin', 'master')
      )
    )
  );

-- 2. business-assets (Imagens de empresas e banners)
DROP POLICY IF EXISTS "business_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "business_assets_authenticated_read" ON storage.objects;

-- Permite SELECT apenas para usuários autenticados (para upload/gestão) e administradores
CREATE POLICY "business_assets_authenticated_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'business-assets'
  );

-- 3. event-assets (Imagens de eventos)
DROP POLICY IF EXISTS "event_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "event_assets_authenticated_read" ON storage.objects;

-- Permite SELECT apenas para usuários autenticados
CREATE POLICY "event_assets_authenticated_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-assets'
  );

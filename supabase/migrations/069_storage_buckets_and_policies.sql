-- Migration 069: Supabase Storage Buckets and Policies
-- Projeto Oficial: rwvztwsjcjljphqttiws
-- 
-- Convenção de paths:
--   business-assets/{tenant_id}/{business_id}/logo/{filename}
--   business-assets/{tenant_id}/{business_id}/cover/{filename}
--   business-assets/{tenant_id}/{business_id}/gallery/{filename}

-- =============================================================================
-- 1. CRIAR BUCKET business-assets (público para leitura)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. POLICIES PARA storage.objects NO BUCKET business-assets
-- =============================================================================

-- Remação de policies antigas se existirem
DROP POLICY IF EXISTS "business_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "business_assets_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "business_assets_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "business_assets_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "business_assets_admin_all" ON storage.objects;

-- 2a. SELECT: Qualquer pessoa pode ler (bucket é público)
CREATE POLICY "business_assets_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'business-assets');

-- 2b. INSERT: Anunciante autenticado no path da própria empresa
CREATE POLICY "business_assets_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[2]
        AND b.tenant_id::text = (storage.foldername(name))[1]
        AND b.owner_id = auth.uid()
    )
  );

-- 2c. UPDATE: Anunciante autenticado no path da própria empresa
CREATE POLICY "business_assets_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[2]
        AND b.tenant_id::text = (storage.foldername(name))[1]
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'business-assets'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[2]
        AND b.tenant_id::text = (storage.foldername(name))[1]
        AND b.owner_id = auth.uid()
    )
  );

-- 2d. DELETE: Anunciante autenticado no path da própria empresa
CREATE POLICY "business_assets_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[2]
        AND b.tenant_id::text = (storage.foldername(name))[1]
        AND b.owner_id = auth.uid()
    )
  );

-- 2e. Admin pode gerenciar qualquer asset (roles: admin, superadmin, platform_admin, master, socio_admin)
CREATE POLICY "business_assets_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(COALESCE(p.role, '')) IN ('admin', 'superadmin', 'platform_admin', 'master', 'socio_admin')
    )
  )
  WITH CHECK (
    bucket_id = 'business-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(COALESCE(p.role, '')) IN ('admin', 'superadmin', 'platform_admin', 'master', 'socio_admin')
    )
  );

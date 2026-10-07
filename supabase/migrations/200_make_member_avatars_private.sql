-- =============================================================================
-- Migration 200: Tornar o bucket member-avatars estritamente privado (public = false)
-- CivicOS SABA / Conexão Maçônica - LGPD & Proteção de Fotos de Membros
-- =============================================================================
-- Altera a flag de visibilidade pública no registro do bucket 'member-avatars'.
-- As imagens deixam de ser acessíveis via HTTP pública não autenticada (/public/).
-- O acesso passa a exigir URLs Assinadas (createSignedUrl) ou tokens de sessão.
-- =============================================================================

UPDATE storage.buckets
SET public = false
WHERE id = 'member-avatars';

-- Garantir que as tabelas de storage mantenham as RLS restritivas para member-avatars
DROP POLICY IF EXISTS "Permitir leitura pública no member-avatars" ON storage.objects;
DROP POLICY IF EXISTS "member_avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "member_avatars_authenticated_read" ON storage.objects;

-- Permite SELECT apenas para usuários autenticados para a própria pasta (ou administradores de plataforma)
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

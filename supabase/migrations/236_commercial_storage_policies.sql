-- 236 - Módulo Comercial Nacional · Gate 1B · Políticas do bucket PRIVADO commercial-documents
--
-- Convenção de caminho: {tenant_id}/{representative_id}/{arquivo}
-- * LEITURA: o próprio representante ATIVO (pasta do seu id) ou quem tem 'documents.read' no tenant.
-- * ESCRITA/REMOÇÃO: nenhuma policy para 'authenticated' → somente o servidor (service role), que gera
--   URLs assinadas de upload/download depois de autorizar. Link direto nunca abre sem URL assinada.
-- Reversão: supabase/rollbacks/commercial/236_rollback.sql

DROP POLICY IF EXISTS commercial_documents_select ON storage.objects;
CREATE POLICY commercial_documents_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'commercial-documents'
    AND (
      public.has_commercial_permission(public.commercial_try_uuid((storage.foldername(name))[1]), 'documents.read')
      OR public.commercial_rep_access(
        public.commercial_try_uuid((storage.foldername(name))[1]),
        public.commercial_try_uuid((storage.foldername(name))[2]),
        'operational'
      )
    )
  );

NOTIFY pgrst, 'reload schema';

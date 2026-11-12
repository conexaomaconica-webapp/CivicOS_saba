-- ROLLBACK da migration 236 (policy de leitura do bucket commercial-documents). Sem dados envolvidos.
-- Fora de supabase/migrations de propósito. Após o rollback, o bucket fica acessível só ao servidor.

DROP POLICY IF EXISTS commercial_documents_select ON storage.objects;

NOTIFY pgrst, 'reload schema';

-- ROLLBACK da migration 246: remove a consulta pública individual (a página /conexoes/[id] passa a responder 404).
DROP FUNCTION IF EXISTS public.public_connection_detail(TEXT, UUID);
NOTIFY pgrst, 'reload schema';

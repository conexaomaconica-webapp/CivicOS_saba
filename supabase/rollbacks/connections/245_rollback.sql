-- ROLLBACK da migration 245: remove a listagem pública do Mural (a página /conexoes passa a mostrar o estado de erro).
DROP FUNCTION IF EXISTS public.public_connections_list(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER);
NOTIFY pgrst, 'reload schema';

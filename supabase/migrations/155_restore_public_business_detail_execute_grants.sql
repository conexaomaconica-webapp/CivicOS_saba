-- 155 - Restaura o acesso anonimo ao detalhe publico de empresas.
--
-- A migration 042 removeu e recriou public_business_detail(TEXT, TEXT).
-- DROP FUNCTION tambem remove os grants concedidos pela migration 041, mas a
-- funcao recriada nao recebeu novamente EXECUTE para anon/authenticated. Isso
-- fazia o perfil funcionar em sessoes administrativas (pelo fallback sujeito a
-- RLS) e retornar 404 para visitantes, especialmente percebido em celulares.

ALTER FUNCTION public.public_business_detail(TEXT, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.public_business_detail(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.public_business_detail(TEXT, TEXT)
  TO anon, authenticated;

COMMENT ON FUNCTION public.public_business_detail(TEXT, TEXT) IS
  'Detalhe publico de empresa, isolado por host/tenant e limitado a empresas ativas e publicadas.';

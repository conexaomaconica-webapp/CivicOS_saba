-- 246 - Mural de Conexões · página individual /conexoes/[id]: consulta pública de UMA conexão
--
-- Identificador público = o próprio id da conexão (UUID v4 aleatório, não sequencial, não adivinhável). Ele JÁ é público:
-- o feed e a listagem o devolvem para curtir/denunciar. Por isso não foi criada coluna nova.
-- Mesmas regras de visibilidade do feed/listagem: conexão CONFIRMADA pela empresa, com CONSENTIMENTO para o Mural
-- (share_on_mural), empresa PUBLICADA e ATIVA, do tenant do domínio; a foto só é devolvida quando APROVADA na moderação.
-- Qualquer outra situação (pendente, recusada, removida, consentimento retirado, empresa despublicada/inativa, outro tenant,
-- id inexistente) devolve NULL: a página responde 404 sem revelar se o registro existe.
-- Só devolve campos públicos (primeiro nome do membro, como no feed). Não grava nada.
-- Reversão: supabase/rollbacks/connections/246_rollback.sql

CREATE OR REPLACE FUNCTION public.public_connection_detail(
  p_host TEXT,
  p_connection_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  IF p_connection_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', c.id,
    'connection_type', c.connection_type,
    'item_description', c.item_description,
    'message', c.message,
    'photo_url', CASE WHEN c.photo_moderation_status = 'aprovada' THEN c.photo_url ELSE NULL END,
    'member_first_name', public._connection_member_first_name(c.member_user_id),
    'confirmed_at', c.confirmed_at,
    'business_name', b.name,
    'business_slug', b.slug,
    'business_logo_url', b.logo_url
  )
  INTO v_result
  FROM public.business_connections c
  JOIN public.businesses b ON b.id = c.business_id
  WHERE c.id = p_connection_id
    AND c.tenant_id = v_tenant_id
    AND c.status = 'confirmada'
    AND c.share_on_mural = true
    AND b.publication_status = 'published'
    AND b.is_active = true;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_connection_detail(TEXT, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

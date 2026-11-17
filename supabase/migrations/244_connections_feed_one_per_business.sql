-- 244 - Mural de Conexões · vitrines compactas: 1 conexão por empresa (escolhida NA CONSULTA) e ordem por recência
--
-- A Home e a landing exibem até 3 conexões de empresas DISTINTAS. A diversidade é decidida no banco (uma linha por empresa
-- antes do LIMIT): buscar só 3 e remover repetidas depois deixaria a vitrine com 1 ou 2 itens mesmo havendo outras
-- empresas elegíveis. Nada é limitado no armazenamento: a mesma empresa continua com quantas conexões tiver, visíveis no
-- perfil, no mural completo (/conexoes) e na consulta padrão.
--
-- Parâmetros novos, ambos opcionais e com padrão = comportamento atual:
--   p_one_per_business (padrão false): no máximo 1 conexão por empresa;
--   p_prefer_photo     (padrão true):  true = foto aprovada primeiro, depois a mais recente (como hoje);
--                                      false = somente a mais recente (vitrines compactas, que não mostram foto).
-- Regras de visibilidade INALTERADAS (confirmada pela empresa + consentimento para o Mural + empresa publicada e ativa;
-- foto só quando aprovada na moderação). O app Android/iOS publicado chama com 3 argumentos e continua idêntico.
-- Reversão: supabase/rollbacks/connections/244_rollback.sql (recria a função de 3 argumentos da migration 184).

DROP FUNCTION IF EXISTS public.public_connections_feed(TEXT, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.public_connections_feed(TEXT, INTEGER, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION public.public_connections_feed(
  p_host TEXT,
  p_limit INTEGER DEFAULT 6,
  p_only_with_photo BOOLEAN DEFAULT false,
  p_one_per_business BOOLEAN DEFAULT false,
  p_prefer_photo BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 6), 1), 24);
  v_me UUID := auth.uid();
  v_prefer_photo BOOLEAN := COALESCE(p_prefer_photo, true);
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', x.id,
      'connection_type', x.connection_type,
      'item_description', x.item_description,
      'message', x.message,
      'photo_url', x.public_photo,
      'member_first_name', public._connection_member_first_name(x.member_user_id),
      'confirmed_at', x.confirmed_at,
      'business_name', x.business_name,
      'business_slug', x.business_slug,
      'like_count', (SELECT count(*) FROM public.connection_likes l WHERE l.connection_id = x.id),
      'liked_by_me', (v_me IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.connection_likes l WHERE l.connection_id = x.id AND l.user_id = v_me
      ))
    ) ORDER BY (v_prefer_photo AND x.public_photo IS NOT NULL) DESC, x.confirmed_at DESC, x.id)
    FROM (
      SELECT r.*
      FROM (
        SELECT c.*, b.name AS business_name, b.slug AS business_slug,
          CASE WHEN c.photo_moderation_status = 'aprovada' THEN c.photo_url ELSE NULL END AS public_photo,
          -- 1 = a melhor conexão da empresa (foto aprovada primeiro quando p_prefer_photo; depois a mais recente)
          ROW_NUMBER() OVER (
            PARTITION BY c.business_id
            ORDER BY (v_prefer_photo AND c.photo_moderation_status = 'aprovada' AND c.photo_url IS NOT NULL) DESC, c.confirmed_at DESC, c.id
          ) AS business_rank
        FROM public.business_connections c
        JOIN public.businesses b ON b.id = c.business_id
        WHERE c.tenant_id = v_tenant_id
          AND c.status = 'confirmada'
          AND c.share_on_mural = true
          AND b.publication_status = 'published'
          AND b.is_active = true
          AND (NOT COALESCE(p_only_with_photo, false) OR (c.photo_url IS NOT NULL AND c.photo_moderation_status = 'aprovada'))
      ) r
      WHERE NOT COALESCE(p_one_per_business, false) OR r.business_rank = 1
      ORDER BY (v_prefer_photo AND r.photo_moderation_status = 'aprovada' AND r.photo_url IS NOT NULL) DESC, r.confirmed_at DESC, r.id
      LIMIT v_limit
    ) x
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_connections_feed(TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- 252 - Corrige get_admin_lodges_list (lista de lojas do admin): colunas inexistentes e CTE fora de escopo
--
-- Problemas da função original (migration 065), confirmados contra o banco oficial:
--   1. Lia organizations.phone e organizations.email, que NÃO existem. A tabela tem contact_email; telefones e e-mails
--      adicionais ficam em organization_contacts (type 'phone', 'whatsapp', 'email'). Erro: column o.phone does not exist.
--   2. A CTE "filtered" era usada em duas instruções separadas (contagem e página), mas uma CTE só existe dentro da instrução
--      em que é declarada. A segunda instrução falharia mesmo depois de corrigir as colunas.
-- Resultado: a RPC sempre falhava e o painel caía no caminho de reserva (leitura direta da tabela, com indicadores limitados).
--
-- Correção: telefone e e-mail vêm de organization_contacts (e-mail com reserva em contact_email), e total + página são
-- calculados em UMA instrução, com as duas CTEs. A trava interna da migration 250 (apenas servidor) é mantida e os privilégios
-- não mudam. O formato da resposta é o mesmo (items, total, page, page_size, total_pages, kpis; cada item com phone e email).
-- Reversão: supabase/rollbacks/connections/252_rollback.sql (volta à versão da migration 250, que continua com o defeito).

CREATE OR REPLACE FUNCTION public.get_admin_lodges_list(
  p_query TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_potency TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_missing_coords BOOLEAN DEFAULT false,
  p_missing_emblem BOOLEAN DEFAULT false,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 50);
  v_offset INTEGER := (v_page - 1) * v_page_size;
  v_total INTEGER := 0;
  v_total_pages INTEGER := 0;
  v_items JSONB := '[]'::jsonb;
  v_kpis JSONB;
BEGIN
  -- Trava interna (migration 250): função administrativa, somente para o servidor (service_role).
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN: Função restrita ao servidor.';
  END IF;

  -- KPIs Consolidados
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'published', COALESCE(COUNT(*) FILTER (WHERE is_active = true), 0),
    'inactive', COALESCE(COUNT(*) FILTER (WHERE is_active = false), 0),
    'missing_coords', COALESCE(COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL), 0),
    'missing_emblem', COALESCE(COUNT(*) FILTER (WHERE emblem_url IS NULL OR emblem_url = ''), 0),
    'possible_duplicates', 0
  ) INTO v_kpis
  FROM public.organizations;

  -- Total e página na MESMA instrução (a CTE "filtered" só existe dentro dela).
  WITH filtered AS (
    SELECT
      o.id,
      o.name,
      COALESCE(o.slug, o.id::text) AS slug,
      o.code_number,
      o.potency,
      o.rite,
      o.city,
      o.state,
      o.address,
      o.meeting_schedule,
      c.phone,
      c.email,
      o.emblem_url,
      o.latitude,
      o.longitude,
      o.is_active,
      COALESCE(o.provenance, 'manual') AS provenance,
      o.created_at,
      -- Calculo de Completude Real (%)
      ROUND(
        (
          (CASE WHEN o.name IS NOT NULL AND o.name != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.potency IS NOT NULL AND o.potency != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.meeting_schedule IS NOT NULL AND o.meeting_schedule != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.city IS NOT NULL AND o.city != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.latitude IS NOT NULL AND o.longitude IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN o.emblem_url IS NOT NULL AND o.emblem_url != '' THEN 1 ELSE 0 END) +
          (CASE WHEN c.phone IS NOT NULL OR c.email IS NOT NULL THEN 1 ELSE 0 END)
        )::numeric / 7.0 * 100.0
      ) AS completeness_percent
    FROM public.organizations o
    -- Telefone: primeiro contato do tipo phone (senão whatsapp). E-mail: primeiro contato do tipo email (senão contact_email).
    CROSS JOIN LATERAL (
      SELECT
        (SELECT oc.value FROM public.organization_contacts oc
          WHERE oc.organization_id = o.id AND oc.type IN ('phone', 'whatsapp') AND NULLIF(btrim(oc.value), '') IS NOT NULL
          ORDER BY (oc.type = 'phone') DESC, oc.sort_order, oc.created_at LIMIT 1) AS phone,
        COALESCE(
          (SELECT oc.value FROM public.organization_contacts oc
            WHERE oc.organization_id = o.id AND oc.type = 'email' AND NULLIF(btrim(oc.value), '') IS NOT NULL
            ORDER BY oc.sort_order, oc.created_at LIMIT 1),
          NULLIF(btrim(o.contact_email), '')
        ) AS email
    ) c
    WHERE (p_query IS NULL OR lower(o.name) LIKE '%' || lower(p_query) || '%' OR lower(o.city) LIKE '%' || lower(p_query) || '%' OR o.code_number::text LIKE '%' || p_query || '%')
      AND (p_state IS NULL OR lower(o.state) = lower(p_state))
      AND (p_potency IS NULL OR lower(o.potency) = lower(p_potency))
      AND (p_status IS NULL OR (p_status = 'published' AND o.is_active = true) OR (p_status = 'inactive' AND o.is_active = false))
      AND (p_missing_coords IS FALSE OR (o.latitude IS NULL OR o.longitude IS NULL))
      AND (p_missing_emblem IS FALSE OR (o.emblem_url IS NULL OR o.emblem_url = ''))
  ),
  page AS (
    SELECT * FROM filtered
    ORDER BY created_at DESC, id
    LIMIT v_page_size OFFSET v_offset
  )
  SELECT
    (SELECT COUNT(*) FROM filtered),
    COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC, p.id) FROM page p), '[]'::jsonb)
  INTO v_total, v_items;

  v_total_pages := CEIL(v_total::numeric / v_page_size);

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages,
    'kpis', v_kpis
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_lodges_list(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_lodges_list(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';

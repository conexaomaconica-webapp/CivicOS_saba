-- 166 - Busca inteligente de Lojas Maçônicas feita no próprio banco.
--
-- Antes, p_query era comparado como uma frase única só com nome, número e cidade, e o filtro
-- de dia/rito/potência dependia de valores exatos. Agora a frase é dividida em termos e a loja
-- aparece quando TODOS os termos são encontrados em algum destes campos:
-- nome, número, cidade, estado (sigla e nome), potência, rito, venerável (se público),
-- endereço (se público) e dia(s) de reunião.
--
-- Exemplos: "sexta"                    -> lojas que reúnem na sexta
--           "feira de santana sexta"   -> lojas de Feira de Santana que reúnem na sexta
--           "GOB quarta salvador"      -> lojas GOB em Salvador que reúnem na quarta
--
-- Também: o filtro de potência é unificado (CMSB/BA e CMSB/RJ contam como CMSB); ignora acentos e maiúsculas; "quartas" e "sexta-feira" equivalem a "quarta" e "sexta";
-- palavras genéricas ("lojas", "em", "que reúnem"...) são ignoradas; devolve primary_meeting
-- (dia/horário) para os cards; filtros de rito/potência/cidade/dia não dependem mais de IDs
-- de catálogo nem de acentuação. Mesma assinatura e mesmo escopo de tenant (= v_tenant_id).

-- Potência-base: "CMSB/BA", "CMSB-RJ" e "cmsb sp" -> "cmsb" (sem acento, minúscula). Só remove o sufixo se for uma UF válida
-- e a base não ficar vazia. Os dados continuam gravados por estado (a chave única é potência + número); a unificação é na leitura.
CREATE OR REPLACE FUNCTION public._canonical_potency(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT public._normalize_search(
    regexp_replace(
      btrim(COALESCE(p_text, '')),
      '^(.+?)[[:space:]/–-]+(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)[[:space:]]*$',
      '\1',
      'i'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public._canonical_potency(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.public_lodges_search(
  p_host text,
  p_query text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_potency text DEFAULT NULL,
  p_rite text DEFAULT NULL,
  p_meeting_day text DEFAULT NULL,
  p_user_lat numeric DEFAULT NULL,
  p_user_lng numeric DEFAULT NULL,
  p_max_distance_km numeric DEFAULT NULL,
  p_sort text DEFAULT 'name',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_query TEXT;
  v_norm TEXT;
  v_tokens TEXT[];
  v_state TEXT;
  v_city TEXT;
  v_potency TEXT;
  v_rite TEXT;
  v_meeting_day TEXT;
  v_sort TEXT;
  v_page INTEGER;
  v_page_size INTEGER;
  v_offset INTEGER;
  v_total INTEGER;
  v_total_pages INTEGER;
  v_items JSONB;
  v_stopwords CONSTANT TEXT[] := ARRAY[
    'loja','lojas','maconica','maconicas','maconico','oficina','oficinas','de','do','da','dos','das','em','no','na',
    'nos','nas','que','se','reune','reunem','reuniao','reunioes','sessao','sessoes','dia','dias','as','aos','a','o',
    'e','com','para','por','perto','todas','todos','n','nr','numero'
  ];
  v_state_names CONSTANT JSONB := '{
    "AC":"acre","AL":"alagoas","AP":"amapa","AM":"amazonas","BA":"bahia","CE":"ceara","DF":"distrito federal",
    "ES":"espirito santo","GO":"goias","MA":"maranhao","MT":"mato grosso","MS":"mato grosso do sul",
    "MG":"minas gerais","PA":"para","PB":"paraiba","PR":"parana","PE":"pernambuco","PI":"piaui",
    "RJ":"rio de janeiro","RN":"rio grande do norte","RS":"rio grande do sul","RO":"rondonia","RR":"roraima",
    "SC":"santa catarina","SP":"sao paulo","SE":"sergipe","TO":"tocantins"
  }'::jsonb;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'items', '[]'::jsonb,
      'total', 0,
      'page', 1,
      'page_size', 12,
      'total_pages', 0,
      'has_next_page', false,
      'has_previous_page', false
    );
  END IF;

  v_query := NULLIF(btrim(p_query), '');
  v_state := NULLIF(btrim(p_state), '');
  v_city := NULLIF(btrim(p_city), '');
  v_potency := NULLIF(btrim(p_potency), '');
  v_rite := NULLIF(btrim(p_rite), '');
  v_meeting_day := NULLIF(regexp_replace(public._normalize_search(btrim(COALESCE(p_meeting_day, ''))), 'feiras?|[^a-z]', '', 'g'), '');
  v_sort := COALESCE(lower(btrim(p_sort)), 'name');
  v_page := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 50);
  v_offset := (v_page - 1) * v_page_size;

  -- Termos da busca: sem acentos, sem pontuação, "sexta-feira"/"quartas" -> "sexta"/"quarta", sem palavras genéricas.
  IF v_query IS NOT NULL THEN
    v_norm := regexp_replace(public._normalize_search(v_query), '[^a-z0-9]+', ' ', 'g');
    v_norm := regexp_replace(v_norm, '\m(segunda|terca|quarta|quinta|sexta) +feiras?\M', '\1', 'g');
    v_norm := regexp_replace(v_norm, '\m(segunda|terca|quarta|quinta|sexta|sabado|domingo)s\M', '\1', 'g');
    v_tokens := ARRAY(
      SELECT DISTINCT t
      FROM unnest(string_to_array(btrim(v_norm), ' ')) AS t
      WHERE t <> '' AND NOT (t = ANY (v_stopwords))
    );
    IF COALESCE(cardinality(v_tokens), 0) = 0 THEN
      v_tokens := NULL;
    END IF;
  END IF;

  WITH lodge_raw AS (
    SELECT
      o.id,
      COALESCE(o.slug, regexp_replace(lower(o.name), '[^a-z0-9]+', '-', 'g')) AS slug,
      o.name,
      o.code_number,
      COALESCE(p.name, o.potency) AS potency_name,
      COALESCE(p.abbreviation, o.potency) AS potency_abbreviation,
      p.slug AS potency_slug,
      o.potency AS potency_text,
      COALESCE(r.name, o.rite) AS rite_name,
      r.slug AS rite_slug,
      o.rite AS rite_text,
      o.city,
      o.state,
      o.address,
      o.latitude,
      o.longitude,
      o.logo_url,
      o.cover_url,
      CASE WHEN o.show_worshipful_master = true THEN o.worshipful_master_name ELSE NULL END AS worshipful_master_name,
      o.show_address,
      o.is_featured,
      (
        CASE
          WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL THEN
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(p_user_lat)) * cos(radians(o.latitude)) *
                cos(radians(o.longitude) - radians(p_user_lng)) +
                sin(radians(p_user_lat)) * sin(radians(o.latitude))
              ))
            )
          ELSE NULL
        END
      ) AS distance_km,
      pm.primary_meeting,
      COALESCE(md.days_text, '') AS days_text,
      ' ' || regexp_replace(
        public._normalize_search(concat_ws(' ',
          o.name,
          o.code_number::text,
          o.city,
          o.state,
          v_state_names ->> upper(COALESCE(o.state, '')),
          o.potency,
          p.abbreviation,
          p.name,
          o.rite,
          r.name,
          CASE WHEN o.show_worshipful_master = true THEN o.worshipful_master_name END,
          CASE WHEN o.show_address = true THEN o.address END
        )),
        '[^a-z0-9]+', ' ', 'g'
      ) || ' ' || COALESCE(md.days_text, '') || ' ' AS haystack
    FROM public.organizations o
    LEFT JOIN public.masonic_potencies p ON p.id = o.potency_id
    LEFT JOIN public.masonic_rites r ON r.id = o.rite_id
    LEFT JOIN LATERAL (
      SELECT jsonb_build_object('day', m.meeting_day, 'time', m.meeting_time, 'label', m.label) AS primary_meeting
      FROM public.organization_meetings m
      WHERE m.tenant_id = o.tenant_id AND m.organization_id = o.id AND m.is_public = true
      ORDER BY m.sort_order ASC, m.created_at ASC
      LIMIT 1
    ) pm ON true
    LEFT JOIN LATERAL (
      SELECT string_agg(
        DISTINCT regexp_replace(public._normalize_search(m.meeting_day), 'feiras?|[^a-z]', '', 'g'),
        ' '
      ) AS days_text
      FROM public.organization_meetings m
      WHERE m.tenant_id = o.tenant_id AND m.organization_id = o.id AND m.is_public = true
    ) md ON true
    WHERE o.tenant_id = v_tenant_id
      AND o.is_active = true
      AND o.is_published = true
  ),
  lodge_base AS (
    SELECT *
    FROM lodge_raw l
    WHERE
      -- Busca inteligente: todos os termos precisam aparecer em algum campo da loja.
      (
        v_tokens IS NULL
        OR NOT EXISTS (
          -- Termos de 1–2 letras (ex.: "ba") só casam como palavra inteira, para não achar "bahia", "barbosa"...
          SELECT 1 FROM unnest(v_tokens) AS tok
          WHERE position(CASE WHEN length(tok) <= 2 THEN ' ' || tok || ' ' ELSE tok END IN l.haystack) = 0
        )
      )
      AND (v_state IS NULL OR lower(l.state) = lower(v_state))
      AND (v_city IS NULL OR public._normalize_search(l.city) = public._normalize_search(v_city))
      AND (
        v_potency IS NULL
        OR public._normalize_search(l.potency_slug) = public._normalize_search(v_potency)
        OR public._normalize_search(l.potency_name) = public._normalize_search(v_potency)
        -- Potência unificada: filtrar por "CMSB" traz CMSB/BA, CMSB/RJ etc.
        OR public._canonical_potency(l.potency_abbreviation) = public._canonical_potency(v_potency)
        OR public._canonical_potency(l.potency_text) = public._canonical_potency(v_potency)
      )
      AND (
        v_rite IS NULL
        OR public._normalize_search(l.rite_slug) = public._normalize_search(v_rite)
        OR public._normalize_search(l.rite_name) LIKE '%' || public._normalize_search(v_rite) || '%'
        OR public._normalize_search(l.rite_text) LIKE '%' || public._normalize_search(v_rite) || '%'
      )
      AND (v_meeting_day IS NULL OR position(v_meeting_day IN l.days_text) > 0)
      AND (p_max_distance_km IS NULL OR l.distance_km IS NULL OR l.distance_km <= p_max_distance_km)
  ),
  total_count AS (
    SELECT COUNT(*) AS total_rows FROM lodge_base
  ),
  paginated_items AS (
    SELECT
      jsonb_build_object(
        'id', id,
        'slug', slug,
        'name', name,
        'code_number', code_number,
        'potency', potency_abbreviation,
        'potency_name', potency_name,
        'rite', rite_name,
        'city', city,
        'state', state,
        'address', CASE WHEN show_address = true THEN address ELSE NULL END,
        'latitude', latitude,
        'longitude', longitude,
        'distance_km', ROUND(distance_km::numeric, 1),
        'logo_url', logo_url,
        'cover_url', cover_url,
        'worshipful_master_name', worshipful_master_name,
        'primary_meeting', primary_meeting,
        'is_featured', is_featured
      ) AS item_json
    FROM lodge_base
    ORDER BY
      is_featured DESC,
      CASE WHEN v_sort = 'distance' THEN distance_km END ASC NULLS LAST,
      CASE WHEN v_sort = 'code' THEN code_number END ASC NULLS LAST,
      name ASC
    LIMIT v_page_size OFFSET v_offset
  )
  SELECT
    (SELECT total_rows FROM total_count),
    COALESCE(jsonb_agg(item_json), '[]'::jsonb)
  INTO v_total, v_items
  FROM paginated_items;

  v_total := COALESCE(v_total, 0);
  v_total_pages := CEIL(v_total::NUMERIC / GREATEST(v_page_size, 1)::NUMERIC);

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages,
    'has_next_page', v_page < v_total_pages,
    'has_previous_page', v_page > 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_lodges_search(
  text, text, text, text, text, text, text, numeric, numeric, numeric, text, integer, integer
) TO anon, authenticated;

COMMENT ON FUNCTION public.public_lodges_search(
  text, text, text, text, text, text, text, numeric, numeric, numeric, text, integer, integer
) IS 'Busca pública de Lojas por host, com busca inteligente por termos (nome, número, cidade, UF, potência, rito, venerável, endereço e dia de reunião) e primary_meeting.';

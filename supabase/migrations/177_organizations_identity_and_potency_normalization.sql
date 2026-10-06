-- Migration 177: identidade da loja por potencia + numero + nome + cidade e normalizacao das potencias
-- (remove sufixo /UF e parentese final: "GRANDE LOJA - CMSB/RJ" -> "GRANDE LOJA - CMSB").
-- Rodar o arquivo inteiro de uma vez (nao colar em partes). Publicar junto o importador
-- (onConflict 'tenant_id,potency,code_number,name,city').

BEGIN;

CREATE OR REPLACE FUNCTION public._normalize_potency(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $fn$
DECLARE
  v TEXT := p_value;
  v_uf TEXT := '(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)';
BEGIN
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  v := btrim(v);
  v := regexp_replace(v, '\s*\([^)]*\)?\s*$', '');
  v := regexp_replace(v, '\s*\)+\s*$', '');
  v := regexp_replace(v, '\s*/\s*' || v_uf || '\s*$', '', 'i');
  v := regexp_replace(v, '\s*[-–—]\s*$', '');
  v := regexp_replace(v, '\s+', ' ', 'g');
  v := btrim(v);
  RETURN NULLIF(v, '');
END;
$fn$;

-- Cidade faz parte da chave unica: nunca NULL (vazia = ''), senao NULLs seriam sempre "distintos".
UPDATE public.organizations SET city = '' WHERE city IS NULL;

CREATE OR REPLACE FUNCTION public.organizations_city_not_null()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  NEW.city := COALESCE(NEW.city, '');
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_organizations_city_not_null ON public.organizations;
CREATE TRIGGER trg_organizations_city_not_null
  BEFORE INSERT OR UPDATE OF city ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.organizations_city_not_null();

-- Guarda: so sobra colisao se for a MESMA loja (mesma potencia, numero, nome e cidade). Aborta sem alterar nada.
DO $guard$
DECLARE
  v_total INTEGER;
  v_list TEXT;
BEGIN
  SELECT count(*),
         string_agg(format('%s | nº %s | %s | %s (%s registros)', potency_norm, code_number, name, city, n), E'\n')
    INTO v_total, v_list
  FROM (
    SELECT public._normalize_potency(o.potency) AS potency_norm, o.code_number, o.name, o.city, count(*) AS n
    FROM public.organizations o
    WHERE o.code_number IS NOT NULL
    GROUP BY o.tenant_id, public._normalize_potency(o.potency), o.code_number, o.name, o.city
    HAVING count(*) > 1
    LIMIT 50
  ) c;

  IF v_total > 0 THEN
    RAISE EXCEPTION E'Lojas realmente duplicadas (mesma potencia, numero, nome e cidade), exemplos:\n%\nMescle ou corrija essas lojas e rode novamente.', v_list;
  END IF;
END
$guard$;

-- Nova chave unica (constraint, para o upsert do importador funcionar com onConflict)
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS uq_organizations_tenant_code;
ALTER TABLE public.organizations
  ADD CONSTRAINT uq_organizations_lodge_identity UNIQUE (tenant_id, potency, code_number, name, city);

-- masonic_potencies: reaponta lojas das duplicadas para a mais antiga
WITH ranked AS (
  SELECT
    p.id,
    first_value(p.id) OVER (
      PARTITION BY p.tenant_id, lower(public._normalize_potency(p.abbreviation)), lower(public._normalize_potency(p.name))
      ORDER BY p.created_at, p.id
    ) AS keep_id
  FROM public.masonic_potencies p
)
UPDATE public.organizations o
SET potency_id = r.keep_id
FROM ranked r
WHERE o.potency_id = r.id AND r.id <> r.keep_id;

-- masonic_potencies: remove as duplicadas
DELETE FROM public.masonic_potencies p
USING (
  SELECT id, first_value(id) OVER (
    PARTITION BY tenant_id, lower(public._normalize_potency(abbreviation)), lower(public._normalize_potency(name))
    ORDER BY created_at, id
  ) AS keep_id
  FROM public.masonic_potencies
) r
WHERE p.id = r.id AND r.id <> r.keep_id;

-- masonic_potencies: normaliza nome e sigla
UPDATE public.masonic_potencies
SET name = COALESCE(public._normalize_potency(name), name),
    abbreviation = COALESCE(public._normalize_potency(abbreviation), abbreviation),
    updated_at = now()
WHERE name IS DISTINCT FROM COALESCE(public._normalize_potency(name), name)
   OR abbreviation IS DISTINCT FROM COALESCE(public._normalize_potency(abbreviation), abbreviation);

-- organizations.potency
UPDATE public.organizations
SET potency = public._normalize_potency(potency)
WHERE potency IS NOT NULL
  AND public._normalize_potency(potency) IS NOT NULL
  AND potency IS DISTINCT FROM public._normalize_potency(potency);

DROP FUNCTION public._normalize_potency(TEXT);

COMMIT;

-- Conferencia apos aplicar:
-- SELECT potency, count(*) FROM public.organizations GROUP BY 1 ORDER BY 1;

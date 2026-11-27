-- ============================================================================
-- Migration 256: Link em Benefícios, Imagem/Banner em Serviços e Deduplicação de Categorias
-- ============================================================================
-- 1. Adiciona image_url em public.business_services e garante external_url/cta_label em business_benefits.
-- 2. Limpa discount_percentage <= 0 para NULL em business_benefits.
-- 3. Projeta image_url (serviços) e external_url/cta_label (benefícios) em public_business_detail.
-- 4. Unifica categorias duplicadas com/sem acento e remove redundâncias principal vs secundária.
-- ============================================================================

ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.business_benefits
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS cta_label VARCHAR(60);

UPDATE public.business_benefits
SET discount_percentage = NULL
WHERE discount_percentage IS NOT NULL
  AND discount_percentage <= 0;

-- Helper de normalização de nome de categoria (sem acentos, lowercase, espaços únicos)
CREATE OR REPLACE FUNCTION public._normalize_category_key(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(
    lower(
      translate(
        btrim(COALESCE(p_name, '')),
        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
      )
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  );
$$;

-- Corrige grafia acentuada de categorias conhecidas e unifica duplicadas (ex.: Espirtitualidade -> Espiritualidade, Maquinas -> Máquinas)
DO $$
DECLARE
  r RECORD;
  v_keep_id UUID;
  v_dup_id UUID;
BEGIN
  -- 1. Corrige typo conhecido "Espirtitualidade" para "Espiritualidade" antes de agrupar
  UPDATE public.categories
  SET name = 'Espiritualidade'
  WHERE lower(btrim(name)) = 'espirtitualidade';

  -- 2. Para cada grupo de categorias globais com mesma chave normalizada, mantém a melhor grafia (com acento)
  FOR r IN
    SELECT public._normalize_category_key(name) AS norm_key
    FROM public.categories
    WHERE tenant_id IS NULL
    GROUP BY public._normalize_category_key(name)
    HAVING count(*) > 1
  LOOP
    -- Escolhe a categoria com acento (octet_length > char_length) ou ativa mais antiga
    SELECT id INTO v_keep_id
    FROM public.categories
    WHERE tenant_id IS NULL
      AND public._normalize_category_key(name) = r.norm_key
    ORDER BY
      (octet_length(name) > char_length(name)) DESC,
      is_active DESC,
      created_at ASC
    LIMIT 1;

    FOR v_dup_id IN
      SELECT id
      FROM public.categories
      WHERE tenant_id IS NULL
        AND public._normalize_category_key(name) = r.norm_key
        AND id <> v_keep_id
    LOOP
      -- Se a empresa já tem a categoria canônica e a duplicada era principal, promove a canônica a principal
      UPDATE public.business_categories bc_keep
      SET is_primary = true
      FROM public.business_categories bc_dup
      WHERE bc_keep.business_id = bc_dup.business_id
        AND bc_keep.category_id = v_keep_id
        AND bc_dup.category_id = v_dup_id
        AND bc_dup.is_primary = true;

      -- Remove vínculos duplicados onde a empresa já possui a categoria canônica
      DELETE FROM public.business_categories bc_dup
      USING public.business_categories bc_keep
      WHERE bc_dup.business_id = bc_keep.business_id
        AND bc_dup.category_id = v_dup_id
        AND bc_keep.category_id = v_keep_id;

      -- Migra vínculos restantes para a categoria canônica
      UPDATE public.business_categories
      SET category_id = v_keep_id
      WHERE category_id = v_dup_id;

      -- Remove a categoria duplicada órfã
      DELETE FROM public.categories
      WHERE id = v_dup_id;
    END LOOP;
  END LOOP;

  -- 3. Padroniza acentuação em categorias únicas sem acento
  UPDATE public.categories SET name = 'Negócios' WHERE tenant_id IS NULL AND name = 'Negocios';
  UPDATE public.categories SET name = 'Comércio e Varejo' WHERE tenant_id IS NULL AND name = 'Comercio e Varejo';
  UPDATE public.categories SET name = 'Segurança' WHERE tenant_id IS NULL AND name = 'Seguranca';
  UPDATE public.categories SET name = 'Máquinas' WHERE tenant_id IS NULL AND name = 'Maquinas';
  UPDATE public.categories SET name = 'Construção e Imóveis' WHERE tenant_id IS NULL AND name = 'Construcao e Imoveis';
END
$$;

-- Atualiza public_business_detail / _public_business_detail_legacy para retornar image_url nos serviços e external_url/cta_label nos benefícios
DO $$
DECLARE
  v_proc RECORD;
  v_def TEXT;
  v_new TEXT;
BEGIN
  FOR v_proc IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('public_business_detail', '_public_business_detail_legacy')
  LOOP
    v_def := pg_get_functiondef(v_proc.oid);
    v_new := v_def;

    IF position('''price_info'', s.price_info' IN v_new) > 0 AND position('''image_url'', s.image_url' IN v_new) = 0 THEN
      v_new := replace(
        v_new,
        '''price_info'', s.price_info',
        '''price_info'', s.price_info, ''image_url'', s.image_url'
      );
    END IF;

    IF position('''valid_until'', bf.valid_until' IN v_new) > 0 AND position('''external_url'', bf.external_url' IN v_new) = 0 THEN
      v_new := replace(
        v_new,
        '''valid_until'', bf.valid_until',
        '''valid_until'', bf.valid_until, ''external_url'', bf.external_url, ''cta_label'', bf.cta_label'
      );
    END IF;

    IF v_new <> v_def THEN
      EXECUTE v_new;
    END IF;
  END LOOP;
END
$$;

NOTIFY pgrst, 'reload schema';


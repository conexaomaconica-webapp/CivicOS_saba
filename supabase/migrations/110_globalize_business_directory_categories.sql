-- O catalogo de categorias da Conexao Maconica e global.
-- Promove categorias legadas vinculadas a tenants e reconcilia slugs repetidos
-- sem perder associacoes de empresas, destaques ou hierarquia.

DO $$
DECLARE
  scoped_category RECORD;
  global_category_id UUID;
BEGIN
  FOR scoped_category IN
    SELECT id, slug
    FROM public.categories
    WHERE tenant_id IS NOT NULL
    ORDER BY created_at, id
  LOOP
    SELECT id
    INTO global_category_id
    FROM public.categories
    WHERE tenant_id IS NULL
      AND slug = scoped_category.slug
      AND id <> scoped_category.id
    LIMIT 1;

    IF global_category_id IS NULL THEN
      UPDATE public.categories
      SET tenant_id = NULL
      WHERE id = scoped_category.id;
      CONTINUE;
    END IF;

    -- Evita conflito da PK (business_id, category_id) ao mesclar referencias.
    DELETE FROM public.business_categories scoped_link
    WHERE scoped_link.category_id = scoped_category.id
      AND EXISTS (
        SELECT 1
        FROM public.business_categories global_link
        WHERE global_link.business_id = scoped_link.business_id
          AND global_link.category_id = global_category_id
      );

    UPDATE public.business_categories
    SET category_id = global_category_id
    WHERE category_id = scoped_category.id;

    -- Evita conflito da restricao (tenant_id, category_id) nos destaques.
    DELETE FROM public.directory_featured_categories scoped_feature
    WHERE scoped_feature.category_id = scoped_category.id
      AND EXISTS (
        SELECT 1
        FROM public.directory_featured_categories global_feature
        WHERE global_feature.tenant_id = scoped_feature.tenant_id
          AND global_feature.category_id = global_category_id
      );

    UPDATE public.directory_featured_categories
    SET category_id = global_category_id
    WHERE category_id = scoped_category.id;

    UPDATE public.categories
    SET parent_id = global_category_id
    WHERE parent_id = scoped_category.id;

    DELETE FROM public.categories
    WHERE id = scoped_category.id;
  END LOOP;
END;
$$;

-- Garante por contrato que novos registros administrativos usem o catalogo
-- global; categorias tenant-scoped deixam de ser parte do modelo ativo.
CREATE OR REPLACE FUNCTION public.enforce_global_directory_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RAISE EXCEPTION 'Categorias do Guia Conexao Maconica devem ser globais (tenant_id NULL)'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_require_global_scope ON public.categories;
CREATE TRIGGER trg_categories_require_global_scope
  BEFORE INSERT OR UPDATE OF tenant_id ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_global_directory_category();

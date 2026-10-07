-- 196 - SEO das empresas: campos de personalização e histórico de slug (redirect 301 quando o endereço muda).
--
-- 1) businesses.seo_*: sobrescritas opcionais do que a página pública mostra no Google e nas redes sociais.
--    Vazio = a plataforma gera automaticamente (nome | categoria em cidade - UF).
--    seo_indexable = false tira a empresa do sitemap e marca a página como noindex.
-- 2) business_slug_history: guarda os slugs antigos. Quem acessar o endereço antigo é redirecionado ao atual,
--    preservando links, favoritos e posição no Google.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_indexable BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.business_slug_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, old_slug)
);

CREATE INDEX IF NOT EXISTS idx_business_slug_history_business ON public.business_slug_history (business_id);

ALTER TABLE public.business_slug_history ENABLE ROW LEVEL SECURITY;

-- O slug é dado público (já aparece na URL): leitura aberta, para o redirect funcionar sem service role.
DROP POLICY IF EXISTS business_slug_history_public_read ON public.business_slug_history;
CREATE POLICY business_slug_history_public_read ON public.business_slug_history
  FOR SELECT TO anon, authenticated USING (true);

-- Escrita só pelo trigger (SECURITY DEFINER): nenhuma policy de INSERT/UPDATE/DELETE para clientes.

CREATE OR REPLACE FUNCTION public.record_business_slug_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.slug IS NOT NULL AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    INSERT INTO public.business_slug_history (tenant_id, business_id, old_slug)
    VALUES (OLD.tenant_id, OLD.id, OLD.slug)
    ON CONFLICT (tenant_id, old_slug) DO UPDATE SET business_id = EXCLUDED.business_id;
    -- Se a empresa voltou a um slug antigo dela, ele deixa de ser "antigo".
    DELETE FROM public.business_slug_history
     WHERE tenant_id = NEW.tenant_id AND old_slug = NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_slug_history ON public.businesses;
CREATE TRIGGER trg_business_slug_history
  AFTER UPDATE OF slug ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.record_business_slug_change();

NOTIFY pgrst, 'reload schema';

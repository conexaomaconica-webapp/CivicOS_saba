-- 202 - Corrige o tenant do evento de lançamento (conexao-empresarial-2026).
--
-- A migration 112 criou o evento com "FROM public.tenants t LIMIT 1", sem ORDER BY: o banco escolheu o primeiro tenant
-- que encontrou, a "Loja Luz do Oriente" (...0011), em vez da Conexão Maçônica (...0000). Efeito: o evento do lançamento
-- (24/11) e as inscrições feitas por ele ficaram no tenant de outra organização, e a Conexão não o enxerga nas listas
-- por tenant nem no sitemap (public_seo_events filtra pelo tenant do domínio).
--
-- Esta correção move o evento e as suas inscrições para o tenant da Conexão (...0000). Só altera tenant_id; nenhum dado
-- pessoal é lido nem modificado. É idempotente: se o evento já está no tenant certo, não faz nada. Se faltar o tenant
-- da Conexão ou já existir outro evento com o mesmo slug nele, aborta sem alterar nada.
--
-- Importante: a lista de inscrições tem UNIQUE (event_id, whatsapp), que não envolve tenant, então não há conflito.

DO $$
DECLARE
  v_target uuid := '00000000-0000-0000-0000-000000000000';
  v_slug text := 'conexao-empresarial-2026';
  v_event_id uuid;
  v_moved_regs integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_target AND slug = 'conexao-maconica') THEN
    RAISE EXCEPTION 'Tenant da Conexão Maçônica (%) não encontrado: nada foi alterado.', v_target;
  END IF;

  SELECT e.id INTO v_event_id
  FROM public.platform_events e
  WHERE e.slug = v_slug AND e.tenant_id <> v_target
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE NOTICE 'Evento % já está no tenant da Conexão (ou não existe): nada a fazer.', v_slug;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.platform_events e WHERE e.tenant_id = v_target AND e.slug = v_slug) THEN
    RAISE EXCEPTION 'Já existe um evento % no tenant da Conexão: abortado, nada foi alterado.', v_slug;
  END IF;

  UPDATE public.event_registrations SET tenant_id = v_target WHERE event_id = v_event_id;
  GET DIAGNOSTICS v_moved_regs = ROW_COUNT;

  UPDATE public.platform_events SET tenant_id = v_target WHERE id = v_event_id;

  RAISE NOTICE 'Evento % movido para o tenant da Conexão; % inscrição(ões) acompanharam.', v_slug, v_moved_regs;
END;
$$;

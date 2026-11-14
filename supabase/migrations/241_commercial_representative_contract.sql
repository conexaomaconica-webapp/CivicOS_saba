-- 241 - Módulo Comercial Nacional · Gate 1C.2 · Contrato do representante com aceite no primeiro acesso
--
-- O TEXTO do contrato é fornecido e publicado pela equipe (settings.manage); nada de texto jurídico vem do código.
--   * commercial_contract_versions: versões publicadas, IMUTÁVEIS (só is_active pode passar de true para false); uma única
--     versão ativa por tenant; nada é apagado (histórico do que cada representante aceitou).
--   * O aceite grava versão, instante e SHA-256 do texto exato aceito (calculado no banco, não no navegador).
--   * Publicar uma nova versão exige novo aceite de quem aceitou a anterior (a aplicação compara as versões).
-- Escrita e leitura: somente service_role (as funções abaixo). Reversão: supabase/rollbacks/commercial/241_rollback.sql

CREATE TABLE IF NOT EXISTS public.commercial_contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  version TEXT NOT NULL CHECK (length(btrim(version)) BETWEEN 1 AND 40),
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 160),
  content_text TEXT NOT NULL CHECK (length(btrim(content_text)) BETWEEN 200 AND 200000),
  content_sha256 TEXT NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_contract_one_active
  ON public.commercial_contract_versions (tenant_id) WHERE is_active;

ALTER TABLE public.commercial_contract_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_contract_versions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.commercial_contract_versions TO service_role;

CREATE OR REPLACE FUNCTION public.commercial_guard_contract_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'commercial_contract_versions não admite exclusão (histórico do que foi aceito).'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.content_text IS DISTINCT FROM OLD.content_text
     OR NEW.content_sha256 IS DISTINCT FROM OLD.content_sha256
     OR NEW.published_at IS DISTINCT FROM OLD.published_at
     OR (NEW.is_active AND NOT OLD.is_active)
  THEN
    RAISE EXCEPTION 'commercial_contract_versions é imutável (apenas desativar a versão é permitido).'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_guard_contract_version ON public.commercial_contract_versions;
CREATE TRIGGER trg_commercial_guard_contract_version
  BEFORE UPDATE OR DELETE ON public.commercial_contract_versions
  FOR EACH ROW EXECUTE FUNCTION public.commercial_guard_contract_version();

-- Evidência do aceite no representante (versão e instante já existem desde a 228).
ALTER TABLE public.commercial_representatives ADD COLUMN IF NOT EXISTS contract_sha256 TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commercial_representatives_contract_sha256_check') THEN
    ALTER TABLE public.commercial_representatives
      ADD CONSTRAINT commercial_representatives_contract_sha256_check
      CHECK (contract_sha256 IS NULL OR contract_sha256 ~ '^[0-9a-f]{64}$');
  END IF;
END $$;
GRANT SELECT (contract_sha256) ON public.commercial_representatives TO authenticated;

-- ---------------------------------------------------------------------------
-- Publicar nova versão (desativa a anterior e cria a nova na mesma transação)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_publish_contract_version(
  p_tenant_id UUID, p_version TEXT, p_title TEXT, p_content TEXT, p_actor UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('commercial_contract:' || p_tenant_id::text, 0));
  UPDATE public.commercial_contract_versions SET is_active = false WHERE tenant_id = p_tenant_id AND is_active;
  INSERT INTO public.commercial_contract_versions (tenant_id, version, title, content_text, content_sha256, published_by)
  VALUES (p_tenant_id, btrim(p_version), btrim(p_title), p_content,
          encode(sha256(convert_to(p_content, 'UTF8')), 'hex'), p_actor)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Aceite do representante (versão conferida no banco; hash calculado no banco)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_accept_representative_contract(
  p_tenant_id UUID, p_user_id UUID, p_version TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rep public.commercial_representatives%ROWTYPE;
  v_contract public.commercial_contract_versions%ROWTYPE;
BEGIN
  SELECT * INTO v_rep FROM public.commercial_representatives
   WHERE tenant_id = p_tenant_id AND user_id = p_user_id FOR UPDATE;
  IF v_rep.id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF v_rep.status NOT IN ('invited', 'pending_review', 'active') THEN
    RETURN jsonb_build_object('result', 'inactive');
  END IF;

  SELECT * INTO v_contract FROM public.commercial_contract_versions WHERE tenant_id = p_tenant_id AND is_active;
  IF v_contract.id IS NULL THEN RETURN jsonb_build_object('result', 'no_active_contract'); END IF;
  IF p_version IS DISTINCT FROM v_contract.version THEN
    RETURN jsonb_build_object('result', 'version_changed', 'version', v_contract.version);
  END IF;
  IF v_rep.contract_accepted_at IS NOT NULL AND v_rep.contract_version = v_contract.version THEN
    RETURN jsonb_build_object('result', 'already_accepted', 'version', v_contract.version);
  END IF;

  UPDATE public.commercial_representatives
     SET contract_version = v_contract.version,
         contract_accepted_at = now(),
         contract_sha256 = v_contract.content_sha256
   WHERE id = v_rep.id;
  RETURN jsonb_build_object('result', 'accepted', 'version', v_contract.version,
                            'representative_id', v_rep.id, 'sha256', v_contract.content_sha256);
END;
$$;

REVOKE ALL ON FUNCTION public.commercial_publish_contract_version(UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commercial_accept_representative_contract(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commercial_publish_contract_version(UUID, TEXT, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.commercial_accept_representative_contract(UUID, UUID, TEXT) TO service_role;

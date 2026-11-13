-- ROLLBACK da migration 239 (atribuição automática por link). Fora de supabase/migrations de propósito.
-- Recusa se existir QUALQUER dado que a 239 criou (tokens, pendências/conflitos, atribuições por link):
-- apagar isso perderia a origem das indicações. Restaura o guard de imutabilidade da evidência da 229.

DO $$
DECLARE
  n BIGINT;
BEGIN
  IF to_regclass('public.commercial_attribution_issues') IS NOT NULL THEN
    SELECT count(*) INTO n FROM public.commercial_attribution_issues;
    IF n > 0 THEN
      RAISE EXCEPTION 'Rollback 239 recusado: % pendência(s)/conflito(s) de atribuição registrados.', n;
    END IF;
  END IF;
  SELECT count(*) INTO n FROM public.commercial_referral_evidence WHERE visit_token_hash IS NOT NULL OR valid_until IS NOT NULL OR consumed_at IS NOT NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'Rollback 239 recusado: % evidência(s) com token/validade (origem de indicações).', n;
  END IF;
  SELECT count(*) INTO n FROM public.commercial_settings WHERE link_auto_attribution_enabled;
  IF n > 0 THEN
    RAISE EXCEPTION 'Rollback 239 recusado: atribuição automática ainda ligada em % tenant(s).', n;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.commercial_claim_referral(UUID, UUID, UUID, TEXT, UUID, TEXT[], TIMESTAMPTZ, UUID, UUID, INT);
DROP FUNCTION IF EXISTS public.commercial_record_attribution_issue(UUID, UUID, UUID, UUID, TEXT, UUID, TIMESTAMPTZ, JSONB, UUID);
DROP TABLE IF EXISTS public.commercial_attribution_issues;

-- O guard volta à definição da 229 ANTES de remover as colunas.
CREATE OR REPLACE FUNCTION public.commercial_guard_evidence_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.representative_id IS DISTINCT FROM OLD.representative_id
     OR NEW.evidence_type IS DISTINCT FROM OLD.evidence_type
     OR NEW.reference_code IS DISTINCT FROM OLD.reference_code
     OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
     OR NEW.evidence IS DISTINCT FROM OLD.evidence
     OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
     OR (OLD.lead_id IS NOT NULL AND NEW.lead_id IS DISTINCT FROM OLD.lead_id)
     OR (OLD.business_id IS NOT NULL AND NEW.business_id IS DISTINCT FROM OLD.business_id)
     OR (OLD.signup_invite_id IS NOT NULL AND NEW.signup_invite_id IS DISTINCT FROM OLD.signup_invite_id)
  THEN
    RAISE EXCEPTION 'commercial_referral_evidence é imutável (apenas vínculos podem ser preenchidos).'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP INDEX IF EXISTS public.uq_commercial_evidence_visit_token;
ALTER TABLE public.commercial_referral_evidence DROP CONSTRAINT IF EXISTS commercial_referral_evidence_token_hash_format;
ALTER TABLE public.commercial_referral_evidence DROP COLUMN IF EXISTS visit_token_hash;
ALTER TABLE public.commercial_referral_evidence DROP COLUMN IF EXISTS valid_until;
ALTER TABLE public.commercial_referral_evidence DROP COLUMN IF EXISTS consumed_at;
ALTER TABLE public.commercial_settings DROP COLUMN IF EXISTS link_auto_attribution_enabled;

NOTIFY pgrst, 'reload schema';

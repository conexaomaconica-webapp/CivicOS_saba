-- ROLLBACK da migration 241 (contrato do representante). Fora de supabase/migrations de propósito.
-- Recusa se existir versão publicada ou aceite com hash: apagar perderia a prova do que cada representante aceitou.
DO $$
DECLARE
  n BIGINT;
BEGIN
  IF to_regclass('public.commercial_contract_versions') IS NOT NULL THEN
    SELECT count(*) INTO n FROM public.commercial_contract_versions;
    IF n > 0 THEN
      RAISE EXCEPTION 'Rollback 241 recusado: % versão(ões) de contrato publicadas.', n;
    END IF;
  END IF;
  SELECT count(*) INTO n FROM public.commercial_representatives WHERE contract_sha256 IS NOT NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'Rollback 241 recusado: % aceite(s) de contrato com evidência (hash).', n;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.commercial_accept_representative_contract(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.commercial_publish_contract_version(UUID, TEXT, TEXT, TEXT, UUID);
DROP TABLE IF EXISTS public.commercial_contract_versions;
DROP FUNCTION IF EXISTS public.commercial_guard_contract_version();
ALTER TABLE public.commercial_representatives DROP CONSTRAINT IF EXISTS commercial_representatives_contract_sha256_check;
ALTER TABLE public.commercial_representatives DROP COLUMN IF EXISTS contract_sha256;

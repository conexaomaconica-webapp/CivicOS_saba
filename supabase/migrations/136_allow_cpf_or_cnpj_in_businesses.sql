-- Migration 136: Allow CPF (11 digits) or CNPJ (14 digits) in businesses.cnpj and ensure cnpj_cpf column
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT;

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS chk_businesses_cnpj_digits;
ALTER TABLE public.businesses ADD CONSTRAINT chk_businesses_cnpj_digits
  CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{11}$' OR cnpj ~ '^[0-9]{14}$');

DROP INDEX IF EXISTS public.uq_businesses_cnpj_tenant;
CREATE UNIQUE INDEX IF NOT EXISTS uq_businesses_cnpj_tenant
  ON public.businesses (tenant_id, cnpj)
  WHERE cnpj IS NOT NULL;

-- Notifica o PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';

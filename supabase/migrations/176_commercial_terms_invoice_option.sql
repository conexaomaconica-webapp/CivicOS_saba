-- 176 - Nota fiscal opcional no onboarding comercial.
--
-- Por padrão nada muda: o cliente paga logo após assinar. Quando o admin marca "nota fiscal solicitada",
-- o pagamento fica em espera até o admin registrar a nota como emitida (número opcional).

ALTER TABLE public.business_commercial_terms
  ADD COLUMN IF NOT EXISTS invoice_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(60),
  ADD COLUMN IF NOT EXISTS invoice_issued_by UUID REFERENCES auth.users(id);

NOTIFY pgrst, 'reload schema';

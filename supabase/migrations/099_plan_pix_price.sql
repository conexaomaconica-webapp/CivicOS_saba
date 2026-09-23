-- Stores an explicit discounted PIX price alongside the installment price.
ALTER TABLE public.plan_payment_rules
  ADD COLUMN IF NOT EXISTS pix_amount_cents INTEGER;

UPDATE public.plan_payment_rules
SET pix_amount_cents = amount_cents
WHERE pix_amount_cents IS NULL;

ALTER TABLE public.plan_payment_rules
  ALTER COLUMN pix_amount_cents SET NOT NULL;

ALTER TABLE public.plan_payment_rules
  DROP CONSTRAINT IF EXISTS plan_payment_rules_pix_amount_check;

ALTER TABLE public.plan_payment_rules
  ADD CONSTRAINT plan_payment_rules_pix_amount_check
  CHECK (pix_amount_cents >= 0 AND pix_amount_cents <= amount_cents);

COMMENT ON COLUMN public.plan_payment_rules.pix_amount_cents IS
  'Final amount charged for PIX payments; amount_cents remains the interest-free installment total.';

-- Migration 061: Plan Payment Rules and Admin Configuration
-- Configures installments_max, interest_free_installments and payment_methods_allowed per plan.

CREATE TABLE IF NOT EXISTS public.plan_payment_rules (
  plan_code TEXT PRIMARY KEY,
  amount_cents INTEGER NOT NULL DEFAULT 178800,
  payment_methods_allowed TEXT[] NOT NULL DEFAULT ARRAY['pix', 'credit_card'],
  installments_max INTEGER NOT NULL DEFAULT 6,
  interest_free_installments INTEGER NOT NULL DEFAULT 6,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.plan_payment_rules ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone can read plan payment rules
CREATE POLICY "Public read plan_payment_rules"
  ON public.plan_payment_rules FOR SELECT
  USING (true);

-- Admin policy: Admins can update/insert plan payment rules
CREATE POLICY "Admins can manage plan_payment_rules"
  ON public.plan_payment_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin')
    )
  );

-- Seed default canonical plan payment rules
INSERT INTO public.plan_payment_rules (plan_code, amount_cents, payment_methods_allowed, installments_max, interest_free_installments)
VALUES
  ('bronze', 0, ARRAY['pix', 'credit_card'], 3, 3),
  ('prata', 178800, ARRAY['pix', 'credit_card'], 6, 6),
  ('ouro', 238800, ARRAY['pix', 'credit_card'], 12, 12)
ON CONFLICT (plan_code) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  installments_max = EXCLUDED.installments_max,
  interest_free_installments = EXCLUDED.interest_free_installments,
  updated_at = NOW();

-- RPC for updating plan payment rules safely from Admin
CREATE OR REPLACE FUNCTION public.update_plan_payment_rules(
  p_plan_code TEXT,
  p_amount_cents INTEGER,
  p_installments_max INTEGER,
  p_interest_free_installments INTEGER,
  p_payment_methods TEXT[] DEFAULT ARRAY['pix', 'credit_card']
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'socio_admin')
  ) THEN
    -- Fallback allow service role / dev
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Apenas administradores podem atualizar regras de pagamento.';
    END IF;
  END IF;

  INSERT INTO public.plan_payment_rules (
    plan_code,
    amount_cents,
    payment_methods_allowed,
    installments_max,
    interest_free_installments,
    updated_at
  )
  VALUES (
    p_plan_code,
    p_amount_cents,
    p_payment_methods,
    p_installments_max,
    p_interest_free_installments,
    NOW()
  )
  ON CONFLICT (plan_code) DO UPDATE SET
    amount_cents = EXCLUDED.amount_cents,
    payment_methods_allowed = EXCLUDED.payment_methods_allowed,
    installments_max = EXCLUDED.installments_max,
    interest_free_installments = EXCLUDED.interest_free_installments,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'ok', true,
    'plan_code', p_plan_code,
    'amount_cents', p_amount_cents,
    'installments_max', p_installments_max,
    'interest_free_installments', p_interest_free_installments
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_plan_payment_rules(TEXT, INTEGER, INTEGER, INTEGER, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_plan_payment_rules(TEXT, INTEGER, INTEGER, INTEGER, TEXT[]) TO service_role;

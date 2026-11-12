-- 231 - Módulo Comercial Nacional · Gate 1A · Eventos financeiros normalizados (transactional outbox)
--
-- Captura a operação econômica real de public.invoices dentro da MESMA transação do pagamento:
--   * identidade do evento = (fatura, sequência de estados de liquidação), NUNCA o horário do trigger;
--   * atualização repetida sem mudança de valor liquidado = nenhum evento (idempotente);
--   * pagamento parcial, ajuste para cima e reversão geram eventos com delta assinado;
--   * permuta/parceria/valor zero ficam registrados como 'skipped' (sem comissão automática).
-- Trigger INERTE por padrão (commercial_settings.capture_mode = 'off'). Em 'shadow' nunca bloqueia o
-- pagamento: falhas vão para commercial_capture_failures e o desvio é detectável em
-- commercial_capture_gaps + recuperável por commercial_reconcile_capture(). Em 'strict' o erro aborta.
-- Estorno/chargeback (fluxo Asaas/onboarding) são do Gate 1D: aqui só o esquema está preparado.
-- Reversão: supabase/rollbacks/commercial/231_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. commercial_financial_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_financial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('invoice_trigger', 'payment_refund', 'provider_webhook', 'manual')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'settlement', 'partial_settlement', 'settlement_adjustment', 'reversal',
    'refund', 'chargeback', 'chargeback_reversal', 'manual_correction'
  )),
  seq INT NOT NULL CHECK (seq >= 1),
  idempotency_key TEXT NOT NULL CHECK (length(btrim(idempotency_key)) > 0),
  delta_cents BIGINT NOT NULL CHECK (delta_cents <> 0),
  cumulative_settled_cents BIGINT NOT NULL CHECK (cumulative_settled_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT,
  commercial_modality TEXT,
  is_monetary BOOLEAN NOT NULL DEFAULT true,
  requires_review BOOLEAN NOT NULL DEFAULT false,
  source_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'skipped', 'failed', 'dead_letter')),
  skip_reason TEXT,
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_financial_events_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_commercial_financial_events_idempotency UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT fk_commercial_events_business
    FOREIGN KEY (tenant_id, business_id)
    REFERENCES public.businesses (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT commercial_events_skipped_has_reason CHECK (status <> 'skipped' OR skip_reason IS NOT NULL)
);

-- Uma sequência por fatura (impede evento duplicado/fora de ordem para a mesma fatura).
CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_events_invoice_seq
  ON public.commercial_financial_events (invoice_id, seq) WHERE source_kind = 'invoice_trigger';
CREATE INDEX IF NOT EXISTS idx_commercial_events_queue
  ON public.commercial_financial_events (next_attempt_at NULLS FIRST, created_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_commercial_events_business
  ON public.commercial_financial_events (tenant_id, business_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- 2. commercial_capture_failures · falha de captura nunca passa despercebida
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_capture_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID,
  sqlstate TEXT,
  error_message TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_capture_failures_open
  ON public.commercial_capture_failures (tenant_id, created_at DESC) WHERE resolved_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Funções de captura (SECURITY DEFINER: faturas são atualizadas também por 'authenticated',
--    que não tem acesso às tabelas comerciais; search_path fixo e objetos qualificados)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_settled_cents(p_status TEXT, p_amount_paid NUMERIC)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN p_status IN ('paid', 'open', 'overdue') AND COALESCE(p_amount_paid, 0) > 0
      THEN round(p_amount_paid * 100)::BIGINT
    ELSE 0::BIGINT
  END
$$;

CREATE OR REPLACE FUNCTION public.commercial_capture_invoice(p_invoice public.invoices)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_mode TEXT;
  v_starts_at TIMESTAMPTZ;
  v_settled BIGINT;
  v_prev BIGINT := 0;
  v_seq INT := 0;
  v_delta BIGINT;
  v_type TEXT;
  v_modality TEXT;
  v_terms_amount BIGINT;
  v_monetary BOOLEAN;
  v_status TEXT := 'pending';
  v_skip TEXT;
  v_review BOOLEAN := false;
  v_occurred TIMESTAMPTZ;
  v_last RECORD;
BEGIN
  SELECT s.capture_mode, s.capture_starts_at INTO v_mode, v_starts_at
  FROM public.commercial_settings s
  WHERE s.tenant_id = p_invoice.tenant_id;

  IF v_mode IS NULL OR v_mode = 'off' THEN
    RETURN;
  END IF;

  v_settled := public.commercial_settled_cents(p_invoice.status, p_invoice.amount_paid);

  -- Serializa a captura por fatura (concorrência entre webhook, polling e baixa manual).
  PERFORM pg_advisory_xact_lock(hashtextextended('commercial_capture:' || p_invoice.id::text, 0));

  SELECT e.seq, e.cumulative_settled_cents INTO v_last
  FROM public.commercial_financial_events e
  WHERE e.invoice_id = p_invoice.id AND e.source_kind = 'invoice_trigger'
  ORDER BY e.seq DESC
  LIMIT 1;
  IF FOUND THEN
    v_seq := v_last.seq;
    v_prev := v_last.cumulative_settled_cents;
  END IF;

  -- Mesma operação econômica já capturada: nada a fazer (idempotência por estado, não por execução).
  IF v_settled = v_prev THEN
    RETURN;
  END IF;

  v_delta := v_settled - v_prev;
  v_seq := v_seq + 1;
  v_occurred := CASE WHEN v_delta > 0 THEN COALESCE(p_invoice.paid_at, now()) ELSE now() END;

  v_type := CASE
    WHEN v_delta < 0 THEN 'reversal'
    WHEN v_prev > 0 THEN 'settlement_adjustment'
    WHEN p_invoice.status = 'paid' THEN 'settlement'
    ELSE 'partial_settlement'
  END;
  -- Redução de valor liquidado sem estorno do provedor exige revisão humana.
  IF v_delta < 0 THEN
    v_review := true;
  END IF;

  -- Permuta, parceria e valor zero: registrados, porém sem comissão automática.
  SELECT t.commercial_modality, t.amount_cents INTO v_modality, v_terms_amount
  FROM public.business_commercial_terms t
  WHERE t.business_id = p_invoice.business_id
  LIMIT 1;
  v_monetary := COALESCE(v_modality, 'padrao') = 'padrao' AND COALESCE(v_terms_amount, 1) > 0;

  IF NOT v_monetary THEN
    v_status := 'skipped';
    v_skip := 'non_monetary_modality';
    v_review := true;
  ELSIF v_starts_at IS NOT NULL AND v_prev = 0 AND v_occurred < v_starts_at THEN
    v_status := 'skipped';
    v_skip := 'before_capture_start';
  END IF;

  INSERT INTO public.commercial_financial_events (
    tenant_id, business_id, invoice_id, source_kind, event_type, seq, idempotency_key,
    delta_cents, cumulative_settled_cents, occurred_at, payment_method, commercial_modality,
    is_monetary, requires_review, source_ref, status, skip_reason
  ) VALUES (
    p_invoice.tenant_id, p_invoice.business_id, p_invoice.id, 'invoice_trigger', v_type, v_seq,
    'invoice:' || p_invoice.id::text || ':seq:' || v_seq::text,
    v_delta, v_settled, v_occurred, p_invoice.payment_method, v_modality,
    v_monetary, v_review,
    jsonb_build_object(
      'invoice_number', p_invoice.invoice_number,
      'invoice_status', p_invoice.status,
      'amount_due_cents', round(p_invoice.amount_due * 100)::BIGINT
    ),
    v_status, v_skip
  )
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_trg_invoice_capture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_mode TEXT;
  v_state TEXT;
  v_msg TEXT;
BEGIN
  BEGIN
    PERFORM public.commercial_capture_invoice(NEW);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    BEGIN
      SELECT s.capture_mode INTO v_mode FROM public.commercial_settings s WHERE s.tenant_id = NEW.tenant_id;
    EXCEPTION WHEN OTHERS THEN
      v_mode := 'shadow';
    END;

    -- strict (homologação): a falha de captura aborta a transação do pagamento.
    IF v_mode = 'strict' THEN
      RAISE EXCEPTION '%', v_msg USING ERRCODE = v_state;
    END IF;

    -- shadow: nunca bloqueia o pagamento; registra a falha para reprocesso.
    BEGIN
      INSERT INTO public.commercial_capture_failures (tenant_id, invoice_id, sqlstate, error_message, detail)
      VALUES (NEW.tenant_id, NEW.id, v_state, v_msg,
              jsonb_build_object('invoice_status', NEW.status, 'amount_paid', NEW.amount_paid));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'commercial capture: falha ao registrar erro (invoice %): %', NEW.id, SQLERRM;
    END;
    RAISE WARNING 'commercial capture falhou (invoice %): % [%]', NEW.id, v_msg, v_state;
  END;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.commercial_capture_invoice(public.invoices) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commercial_trg_invoice_capture() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commercial_capture_invoice(public.invoices) TO service_role;

-- Trigger em invoices: AFTER (não altera a linha) e restrito às colunas que definem a liquidação.
DROP TRIGGER IF EXISTS trg_commercial_invoice_capture ON public.invoices;
CREATE TRIGGER trg_commercial_invoice_capture
  AFTER INSERT OR UPDATE OF status, amount_paid, amount_due, paid_at ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.commercial_trg_invoice_capture();

-- ---------------------------------------------------------------------------
-- 4. Detecção e recuperação de eventos perdidos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.commercial_capture_gaps
WITH (security_invoker = true) AS
SELECT
  i.id AS invoice_id,
  i.tenant_id,
  i.business_id,
  i.status AS invoice_status,
  i.amount_paid,
  public.commercial_settled_cents(i.status, i.amount_paid) AS settled_cents,
  COALESCE(l.cumulative_settled_cents, 0) AS captured_cents
FROM public.invoices i
JOIN public.commercial_settings s
  ON s.tenant_id = i.tenant_id AND s.capture_mode <> 'off' AND i.updated_at >= s.capture_starts_at
LEFT JOIN LATERAL (
  SELECT e.cumulative_settled_cents
  FROM public.commercial_financial_events e
  WHERE e.invoice_id = i.id AND e.source_kind = 'invoice_trigger'
  ORDER BY e.seq DESC
  LIMIT 1
) l ON true
WHERE public.commercial_settled_cents(i.status, i.amount_paid) <> COALESCE(l.cumulative_settled_cents, 0);

CREATE OR REPLACE FUNCTION public.commercial_reconcile_capture(p_tenant_id UUID, p_limit INT DEFAULT 500)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  r public.invoices;
  v_count INT := 0;
BEGIN
  FOR r IN
    SELECT i.*
    FROM public.invoices i
    JOIN public.commercial_capture_gaps g ON g.invoice_id = i.id
    WHERE g.tenant_id = p_tenant_id
    ORDER BY i.updated_at
    LIMIT GREATEST(p_limit, 1)
  LOOP
    PERFORM public.commercial_capture_invoice(r);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.commercial_reconcile_capture(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commercial_reconcile_capture(UUID, INT) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. updated_at + RLS habilitada + sem acesso direto (service_role apenas)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['commercial_financial_events', 'commercial_capture_failures']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role_all', t
    );
  END LOOP;
END $$;

REVOKE ALL ON public.commercial_capture_gaps FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.commercial_capture_gaps TO service_role;

DROP TRIGGER IF EXISTS trg_commercial_financial_events_updated_at ON public.commercial_financial_events;
CREATE TRIGGER trg_commercial_financial_events_updated_at
  BEFORE UPDATE ON public.commercial_financial_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

NOTIFY pgrst, 'reload schema';

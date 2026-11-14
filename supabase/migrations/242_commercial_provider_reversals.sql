-- 242 - Módulo Comercial Nacional · Gate 1D · Estornos e chargebacks do provedor como eventos financeiros
--
-- Hoje o webhook do Asaas registra estorno/chargeback apenas em auditoria: a fatura NÃO é alterada, logo o trigger de
-- captura (231) nunca enxerga a reversão. Esta migration registra o estorno/chargeback como EVENTO FINANCEIRO próprio
-- (source_kind 'provider_webhook'), sem alterar invoices e sem tocar no fluxo de pagamento:
--   * só com captura ligada (commercial_settings.capture_mode <> 'off'); desligada = nenhuma ação;
--   * idempotente pela chave do evento do provedor (reentrega do webhook não duplica);
--   * limitado ao valor líquido ainda liquidado da fatura (nunca estorna mais do que foi recebido);
--   * se a liquidação original nunca gerou comissão (antes do marco de captura / permuta), o evento nasce 'skipped';
--   * estorno parcial aceita o TOTAL acumulado informado pelo provedor (o delta é calculado aqui);
--   * 'chargeback_reversal' devolve valor já contestado (disputa vencida), limitado ao que foi revertido.
-- A reversão da COMISSÃO (lançamento compensatório) é feita pelo motor de comissões (Gate 1E).
-- Reversão: supabase/rollbacks/commercial/242_rollback.sql

-- Sequência por fatura também para eventos do provedor (invoice_trigger já tem a sua).
CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_events_provider_seq
  ON public.commercial_financial_events (invoice_id, seq) WHERE source_kind <> 'invoice_trigger';

CREATE OR REPLACE FUNCTION public.commercial_record_provider_reversal(
  p_tenant_id UUID,
  p_invoice_id UUID,
  p_kind TEXT,
  p_amount_cents BIGINT,
  p_amount_is_cumulative BOOLEAN,
  p_occurred_at TIMESTAMPTZ,
  p_idempotency_key TEXT,
  p_source_ref JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_mode TEXT;
  v_business UUID;
  v_gross BIGINT := 0;
  v_net BIGINT;
  v_prev_refunded BIGINT := 0;
  v_prev_reversed BIGINT := 0;
  v_chargeback_open BIGINT := 0;
  v_delta BIGINT;
  v_seq INT;
  v_status TEXT := 'pending';
  v_skip TEXT;
  v_has_live_settlement BOOLEAN;
  v_event_id UUID;
BEGIN
  IF p_kind NOT IN ('refund', 'chargeback', 'chargeback_reversal') THEN
    RETURN jsonb_build_object('result', 'invalid_kind');
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) = 0 THEN
    RETURN jsonb_build_object('result', 'invalid_key');
  END IF;
  IF p_amount_cents IS NOT NULL AND p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('result', 'invalid_amount');
  END IF;

  SELECT s.capture_mode INTO v_mode FROM public.commercial_settings s WHERE s.tenant_id = p_tenant_id;
  IF v_mode IS NULL OR v_mode = 'off' THEN
    RETURN jsonb_build_object('result', 'capture_off');
  END IF;

  -- Mesma trava da captura da fatura: serializa webhook, polling e baixa manual.
  PERFORM pg_advisory_xact_lock(hashtextextended('commercial_capture:' || p_invoice_id::text, 0));

  SELECT i.business_id INTO v_business FROM public.invoices i WHERE i.id = p_invoice_id AND i.tenant_id = p_tenant_id;
  IF v_business IS NULL THEN
    RETURN jsonb_build_object('result', 'invoice_not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.commercial_financial_events e WHERE e.tenant_id = p_tenant_id AND e.idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('result', 'duplicate');
  END IF;

  SELECT e.cumulative_settled_cents INTO v_gross
  FROM public.commercial_financial_events e
  WHERE e.invoice_id = p_invoice_id AND e.source_kind = 'invoice_trigger'
  ORDER BY e.seq DESC LIMIT 1;
  IF v_gross IS NULL THEN
    RETURN jsonb_build_object('result', 'no_settlement');
  END IF;

  SELECT COALESCE(-SUM(e.delta_cents) FILTER (WHERE e.event_type = 'refund'), 0),
         COALESCE(-SUM(e.delta_cents), 0),
         COALESCE(-SUM(e.delta_cents) FILTER (WHERE e.event_type IN ('chargeback', 'chargeback_reversal')), 0)
    INTO v_prev_refunded, v_prev_reversed, v_chargeback_open
  FROM public.commercial_financial_events e
  WHERE e.invoice_id = p_invoice_id AND e.source_kind = 'provider_webhook' AND e.status <> 'failed';

  -- Líquido atual = recebido - (estornos + chargebacks) + chargebacks revertidos.
  v_net := v_gross - v_prev_reversed;

  IF p_kind = 'chargeback_reversal' THEN
    v_delta := LEAST(COALESCE(p_amount_cents, v_chargeback_open), v_chargeback_open);
    IF v_delta <= 0 THEN RETURN jsonb_build_object('result', 'nothing_to_restore'); END IF;
  ELSE
    IF v_net <= 0 THEN RETURN jsonb_build_object('result', 'nothing_to_reverse'); END IF;
    IF p_kind = 'refund' AND p_amount_cents IS NOT NULL AND COALESCE(p_amount_is_cumulative, false) THEN
      -- Total acumulado informado pelo provedor: este evento vale a diferença para o que já foi estornado.
      v_delta := -LEAST(p_amount_cents - v_prev_refunded, v_net);
      IF p_amount_cents - v_prev_refunded <= 0 THEN RETURN jsonb_build_object('result', 'already_recorded'); END IF;
    ELSE
      v_delta := -LEAST(COALESCE(p_amount_cents, v_net), v_net);
    END IF;
  END IF;

  -- Sem liquidação "viva" (tudo pulado: antes do marco de captura, permuta), não houve comissão a reverter.
  SELECT EXISTS (
    SELECT 1 FROM public.commercial_financial_events e
    WHERE e.invoice_id = p_invoice_id AND e.source_kind = 'invoice_trigger' AND e.delta_cents > 0 AND e.status <> 'skipped'
  ) INTO v_has_live_settlement;
  IF NOT v_has_live_settlement THEN
    v_status := 'skipped';
    v_skip := 'original_settlement_skipped';
  END IF;

  SELECT COALESCE(MAX(e.seq), 0) + 1 INTO v_seq
  FROM public.commercial_financial_events e
  WHERE e.invoice_id = p_invoice_id AND e.source_kind <> 'invoice_trigger';

  INSERT INTO public.commercial_financial_events (
    tenant_id, business_id, invoice_id, source_kind, event_type, seq, idempotency_key,
    delta_cents, cumulative_settled_cents, occurred_at, is_monetary, requires_review, source_ref, status, skip_reason
  ) VALUES (
    p_tenant_id, v_business, p_invoice_id, 'provider_webhook', p_kind, v_seq, p_idempotency_key,
    v_delta, v_net + v_delta, COALESCE(p_occurred_at, now()), true, false, COALESCE(p_source_ref, '{}'::jsonb), v_status, v_skip
  )
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('result', 'duplicate');
  END IF;
  RETURN jsonb_build_object('result', 'recorded', 'event_id', v_event_id, 'delta_cents', v_delta, 'status', v_status);
END;
$$;

REVOKE ALL ON FUNCTION public.commercial_record_provider_reversal(UUID, UUID, TEXT, BIGINT, BOOLEAN, TIMESTAMPTZ, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commercial_record_provider_reversal(UUID, UUID, TEXT, BIGINT, BOOLEAN, TIMESTAMPTZ, TEXT, JSONB) TO service_role;

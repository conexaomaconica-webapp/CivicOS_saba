-- 164 - Aviso operacional de nova resposta de pesquisa.
--
-- operational_notifications.event_type aceita apenas uma lista fixa (migrações 066 e 068).
-- Esta migração recria a restrição com a lista atual mais 'survey_response_received'.

ALTER TABLE public.operational_notifications
  DROP CONSTRAINT IF EXISTS operational_notifications_event_type_check;

ALTER TABLE public.operational_notifications
  ADD CONSTRAINT operational_notifications_event_type_check
  CHECK (event_type IN (
    'registration_completed',
    'contract_signed',
    'payment_confirmed',
    'payment_pending',
    'payment_overdue',
    'company_approved',
    'company_rejected',
    'company_suspended',
    'correction_requested',
    'masonic_link_verified',
    'subscription_expiring',
    'quota_reached',
    'survey_response_received'
  ));

-- Cada resposta de pesquisa gera aviso próprio. A deduplicação de 10 minutos existe para
-- evitar repetição de eventos da mesma empresa; ela suprimiria avisos de respostas distintas.
DO $$
DECLARE
  v_oid oid;
  v_def text;
  v_new text;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'trigger_operational_notification'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'RPC public.trigger_operational_notification não encontrada';
  END IF;

  v_def := pg_get_functiondef(v_oid);
  v_new := replace(
    v_def,
    'IF v_recent_count > 0 THEN',
    'IF v_recent_count > 0 AND p_event_type <> ''survey_response_received'' THEN'
  );

  IF v_new = v_def THEN
    RAISE EXCEPTION 'Condição de deduplicação não localizada em trigger_operational_notification';
  END IF;

  EXECUTE v_new;
END;
$$;

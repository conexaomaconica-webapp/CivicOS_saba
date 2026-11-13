-- 238 - Módulo Comercial Nacional · Gate 1C · Operações atômicas de leads e atribuições
--
-- Funções SECURITY DEFINER executáveis SOMENTE por service_role (chamadas pelos serviços de backend depois da
-- autorização explícita). Garantem em UMA transação: conversão lead→anunciante com a origem preservada,
-- confirmação de atribuição sem conflito, qualificação/atividade com a reserva de lead e expiração por inatividade.
-- Não altera nenhuma tabela existente além de ampliar os tipos de evidência (commercial_referral_evidence).
-- Reversão: supabase/rollbacks/commercial/238_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. Novos tipos de evidência (registro direto pelo representante e conversão)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.commercial_referral_evidence'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%evidence_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.commercial_referral_evidence DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.commercial_referral_evidence
  ADD CONSTRAINT commercial_referral_evidence_evidence_type_check
  CHECK (evidence_type IN (
    'referral_link_visit', 'signup_invite', 'signup_form_submission', 'landing_form',
    'admin_registration', 'representative_registration', 'lead_conversion', 'document'
  ));

-- ---------------------------------------------------------------------------
-- 1B. Registrar lead de um representante ATIVO (lead + evidência de origem, atômico)
--     A chave de duplicidade é calculada pela aplicação (HMAC); o índice único parcial impede dois
--     representantes com o mesmo prospect ativo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_register_lead(
  p_tenant_id UUID, p_representative_id UUID, p_actor UUID, p_company_name TEXT, p_dedupe_key TEXT,
  p_contact_name TEXT DEFAULT NULL, p_contact_email TEXT DEFAULT NULL, p_contact_phone TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL, p_state TEXT DEFAULT NULL, p_plan TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_status TEXT;
  v_lead UUID;
BEGIN
  SELECT r.status INTO v_status FROM public.commercial_representatives r
  WHERE r.id = p_representative_id AND r.tenant_id = p_tenant_id;
  IF v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'representative_not_active' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.commercial_leads
    (tenant_id, representative_id, source, company_name, contact_name, contact_email, contact_phone,
     city, state, interested_plan_code, dedupe_key, notes, created_by)
  VALUES
    (p_tenant_id, p_representative_id, 'representative', btrim(p_company_name), NULLIF(btrim(p_contact_name), ''),
     NULLIF(btrim(p_contact_email), ''), NULLIF(btrim(p_contact_phone), ''), NULLIF(btrim(p_city), ''),
     NULLIF(btrim(p_state), ''), NULLIF(p_plan, ''), p_dedupe_key, p_notes, p_actor)
  RETURNING id INTO v_lead;

  INSERT INTO public.commercial_referral_evidence
    (tenant_id, representative_id, evidence_type, lead_id, evidence, created_by)
  VALUES (p_tenant_id, p_representative_id, 'representative_registration', v_lead,
          jsonb_build_object('registered_at', now()), p_actor);

  INSERT INTO public.commercial_lead_activities (tenant_id, lead_id, activity_type, actor_user_id, note)
  VALUES (p_tenant_id, v_lead, 'note', p_actor, 'Lead cadastrado pelo representante');

  RETURN v_lead;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Registrar atividade do lead (renova a reserva)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_log_lead_activity(
  p_tenant_id UUID, p_lead_id UUID, p_type TEXT, p_actor UUID, p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_lead RECORD;
  v_days INT;
  v_activity UUID;
BEGIN
  SELECT * INTO v_lead FROM public.commercial_leads
  WHERE id = p_lead_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_lead.status IN ('won', 'lost', 'expired') THEN
    RAISE EXCEPTION 'lead_closed' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE((SELECT s.lead_reservation_days FROM public.commercial_settings s WHERE s.tenant_id = p_tenant_id), 60)
    INTO v_days;

  INSERT INTO public.commercial_lead_activities (tenant_id, lead_id, activity_type, actor_user_id, note)
  VALUES (p_tenant_id, p_lead_id, p_type, p_actor, p_note)
  RETURNING id INTO v_activity;

  UPDATE public.commercial_leads
     SET last_activity_at = now(),
         status = CASE WHEN status = 'new' AND p_type IN ('contact', 'meeting', 'proposal_sent', 'follow_up') THEN 'contacted' ELSE status END,
         reserved_until = CASE WHEN status IN ('qualified', 'proposal') THEN now() + make_interval(days => v_days) ELSE reserved_until END
   WHERE id = p_lead_id;

  RETURN v_activity;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Qualificar lead: exige atividade real de contato; inicia a reserva (padrão 60 dias)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_qualify_lead(p_tenant_id UUID, p_lead_id UUID, p_actor UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_lead RECORD;
  v_days INT;
  v_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_lead FROM public.commercial_leads
  WHERE id = p_lead_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_lead.status IN ('won', 'lost', 'expired', 'qualified', 'proposal') THEN
    RAISE EXCEPTION 'lead_not_qualifiable' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.commercial_lead_activities a
    WHERE a.tenant_id = p_tenant_id AND a.lead_id = p_lead_id
      AND a.activity_type IN ('contact', 'meeting', 'proposal_sent', 'follow_up')
  ) THEN
    RAISE EXCEPTION 'lead_requires_activity' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE((SELECT s.lead_reservation_days FROM public.commercial_settings s WHERE s.tenant_id = p_tenant_id), 60)
    INTO v_days;
  v_until := now() + make_interval(days => v_days);

  UPDATE public.commercial_leads
     SET status = 'qualified', qualified_at = now(), reserved_until = v_until, last_activity_at = now()
   WHERE id = p_lead_id;

  INSERT INTO public.commercial_lead_activities (tenant_id, lead_id, activity_type, actor_user_id, note)
  VALUES (p_tenant_id, p_lead_id, 'qualification', p_actor, 'Lead qualificado; reserva até ' || to_char(v_until, 'YYYY-MM-DD'));

  RETURN v_until;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Converter lead em anunciante (preserva a origem da indicação) → atribuição CONFIRMADA
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_convert_lead(
  p_tenant_id UUID, p_lead_id UUID, p_business_id UUID, p_actor UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_lead RECORD;
  v_rep_status TEXT;
  v_evidence UUID;
  v_attr UUID;
BEGIN
  SELECT * INTO v_lead FROM public.commercial_leads
  WHERE id = p_lead_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_lead.status IN ('won', 'lost', 'expired') THEN
    RAISE EXCEPTION 'lead_not_convertible' USING ERRCODE = 'P0001';
  END IF;
  IF v_lead.representative_id IS NULL THEN
    RAISE EXCEPTION 'lead_without_representative' USING ERRCODE = 'P0001';
  END IF;

  SELECT r.status INTO v_rep_status FROM public.commercial_representatives r
  WHERE r.id = v_lead.representative_id AND r.tenant_id = p_tenant_id;
  IF v_rep_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'representative_not_active' USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1 FROM public.businesses b WHERE b.id = p_business_id AND b.tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'business_not_found' USING ERRCODE = 'P0002'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.commercial_attributions a
    WHERE a.tenant_id = p_tenant_id AND a.business_id = p_business_id AND a.status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'attribution_conflict' USING ERRCODE = 'P0001';
  END IF;

  -- Origem preservada: reaproveita a evidência mais antiga do lead; senão registra a conversão.
  SELECT e.id INTO v_evidence FROM public.commercial_referral_evidence e
  WHERE e.tenant_id = p_tenant_id AND e.lead_id = p_lead_id
  ORDER BY e.captured_at LIMIT 1;

  IF v_evidence IS NULL THEN
    INSERT INTO public.commercial_referral_evidence
      (tenant_id, representative_id, evidence_type, lead_id, evidence, created_by)
    VALUES (p_tenant_id, v_lead.representative_id, 'lead_conversion', p_lead_id,
            jsonb_build_object('lead_created_at', v_lead.created_at), p_actor)
    RETURNING id INTO v_evidence;
  END IF;

  UPDATE public.commercial_referral_evidence SET business_id = p_business_id
  WHERE id = v_evidence AND business_id IS NULL;

  INSERT INTO public.commercial_attributions
    (tenant_id, business_id, representative_id, lead_id, origin_evidence_id, attribution_type,
     status, confirmed_at, confirmed_by, created_by)
  VALUES (p_tenant_id, p_business_id, v_lead.representative_id, p_lead_id, v_evidence, 'lead_registration',
          'confirmed', now(), p_actor, p_actor)
  RETURNING id INTO v_attr;

  UPDATE public.commercial_leads
     SET status = 'won', converted_business_id = p_business_id, converted_at = now(),
         qualified_at = COALESCE(qualified_at, now()), last_activity_at = now()
   WHERE id = p_lead_id;

  INSERT INTO public.commercial_lead_activities (tenant_id, lead_id, activity_type, actor_user_id, note)
  VALUES (p_tenant_id, p_lead_id, 'status_change', p_actor, 'Convertido em anunciante');

  RETURN v_attr;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Confirmar atribuição pendente (sem conflito)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_confirm_attribution(p_tenant_id UUID, p_attribution_id UUID, p_actor UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_attr RECORD;
  v_rep_status TEXT;
BEGIN
  SELECT * INTO v_attr FROM public.commercial_attributions
  WHERE id = p_attribution_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'attribution_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_attr.status <> 'pending' THEN RAISE EXCEPTION 'attribution_not_pending' USING ERRCODE = 'P0001'; END IF;
  IF v_attr.valid_until IS NOT NULL AND v_attr.valid_until < now() THEN
    RAISE EXCEPTION 'attribution_expired' USING ERRCODE = 'P0001';
  END IF;

  SELECT r.status INTO v_rep_status FROM public.commercial_representatives r
  WHERE r.id = v_attr.representative_id AND r.tenant_id = p_tenant_id;
  IF v_rep_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'representative_not_active' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.commercial_attributions a
    WHERE a.tenant_id = p_tenant_id AND a.business_id = v_attr.business_id
      AND a.status = 'confirmed' AND a.id <> v_attr.id
  ) THEN
    RAISE EXCEPTION 'attribution_conflict' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.commercial_attributions
     SET status = 'confirmed', confirmed_at = now(), confirmed_by = p_actor
   WHERE id = p_attribution_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Expirar reservas inativas e atribuições pendentes vencidas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_expire_stale(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_days INT;
  v_leads INT;
  v_attrs INT;
BEGIN
  SELECT COALESCE((SELECT s.lead_reservation_days FROM public.commercial_settings s WHERE s.tenant_id = p_tenant_id), 60)
    INTO v_days;

  -- Reserva só se mantém com atividade dentro da janela (regra de atividade).
  WITH expired AS (
    UPDATE public.commercial_leads l
       SET status = 'expired'
     WHERE l.tenant_id = p_tenant_id
       AND l.status IN ('new', 'contacted', 'qualified', 'proposal')
       AND COALESCE(l.reserved_until, l.last_activity_at + make_interval(days => v_days)) < now()
     RETURNING 1
  )
  SELECT count(*) INTO v_leads FROM expired;

  WITH expired AS (
    UPDATE public.commercial_attributions a
       SET status = 'expired'
     WHERE a.tenant_id = p_tenant_id AND a.status = 'pending'
       AND a.valid_until IS NOT NULL AND a.valid_until < now()
     RETURNING 1
  )
  SELECT count(*) INTO v_attrs FROM expired;

  RETURN jsonb_build_object('leads_expired', v_leads, 'attributions_expired', v_attrs);
END;
$$;

DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'commercial_register_lead(uuid, uuid, uuid, text, text, text, text, text, text, text, text, text)',
    'commercial_log_lead_activity(uuid, uuid, text, uuid, text)',
    'commercial_qualify_lead(uuid, uuid, uuid)',
    'commercial_convert_lead(uuid, uuid, uuid, uuid)',
    'commercial_confirm_attribution(uuid, uuid, uuid)',
    'commercial_expire_stale(uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

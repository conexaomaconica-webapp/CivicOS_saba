-- 239 - Módulo Comercial Nacional · Gate 1C.1 · Atribuição automática (pendente) pelo link de indicação
--
-- O cookie do navegador deixa de carregar o código do representante: passa a carregar um TOKEN ALEATÓRIO cujo
-- hash SHA-256 fica na evidência (commercial_referral_evidence.visit_token_hash). O token NUNCA é prova de
-- titularidade: apenas aponta para uma evidência registrada e validada no servidor.
--
-- Regras (decisões aprovadas):
--   * first-touch válido: a primeira evidência elegível dentro da validade prevalece (a troca de cookie é feita pela
--     aplicação; aqui o banco garante uso único e conflitos);
--   * precedência: atribuição confirmada > lead qualificado com reserva vigente > primeira evidência elegível >
--     indicação posterior/manual (fila administrativa);
--   * a atribuição criada é SEMPRE 'pending' e vale, no máximo, até o fim da validade da evidência;
--   * uma evidência só pode ser vinculada a UMA empresa (transação com trava); nada é perdido em conflito/expiração:
--     o motivo vai para a fila commercial_attribution_issues, com a evidência preservada.
-- Não altera nenhuma tabela fora do módulo comercial. Reversão: supabase/rollbacks/commercial/239_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. Evidência: hash do token e validade congelada na captura
-- ---------------------------------------------------------------------------
ALTER TABLE public.commercial_referral_evidence
  ADD COLUMN IF NOT EXISTS visit_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  -- Carimbo de uso único: preenchido na primeira reivindicação e nunca apagado, mesmo que a empresa seja excluída.
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

ALTER TABLE public.commercial_referral_evidence
  DROP CONSTRAINT IF EXISTS commercial_referral_evidence_token_hash_format;
ALTER TABLE public.commercial_referral_evidence
  ADD CONSTRAINT commercial_referral_evidence_token_hash_format
  CHECK (visit_token_hash IS NULL OR visit_token_hash ~ '^[0-9a-f]{64}$');

CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_evidence_visit_token
  ON public.commercial_referral_evidence (visit_token_hash) WHERE visit_token_hash IS NOT NULL;

-- Imutabilidade: acrescenta hash, validade e carimbo de uso. Vínculos continuam preenchíveis (NULL → valor) e o vínculo
-- com a empresa pode voltar a NULL apenas pela exclusão da empresa (ON DELETE SET NULL da FK); trocar por OUTRA empresa
-- continua proibido e o carimbo consumed_at impede reutilizar o token depois disso.
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
     OR NEW.visit_token_hash IS DISTINCT FROM OLD.visit_token_hash
     OR NEW.valid_until IS DISTINCT FROM OLD.valid_until
     OR (OLD.consumed_at IS NOT NULL AND NEW.consumed_at IS DISTINCT FROM OLD.consumed_at)
     OR (OLD.lead_id IS NOT NULL AND NEW.lead_id IS DISTINCT FROM OLD.lead_id)
     OR (OLD.business_id IS NOT NULL AND NEW.business_id IS NOT NULL AND NEW.business_id IS DISTINCT FROM OLD.business_id)
     OR (OLD.signup_invite_id IS NOT NULL AND NEW.signup_invite_id IS DISTINCT FROM OLD.signup_invite_id)
  THEN
    RAISE EXCEPTION 'commercial_referral_evidence é imutável (apenas vínculos podem ser preenchidos).'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Chave própria da atribuição automática (terceira camada, além da env e de module_enabled)
-- ---------------------------------------------------------------------------
ALTER TABLE public.commercial_settings
  ADD COLUMN IF NOT EXISTS link_auto_attribution_enabled BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 3. Fila de pendências/conflitos da atribuição automática (recuperação sem depender do cookie)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_attribution_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  evidence_id UUID,
  representative_id UUID,
  kind TEXT NOT NULL CHECK (kind IN (
    'transient_error', 'evidence_expired', 'evidence_used_by_other_business', 'rep_inactive', 'self_referral',
    'conflict_confirmed', 'reserved_by_other', 'competing_pending'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'discarded')),
  claim_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Momento em que o anunciante criou a empresa: a validade da evidência é avaliada nesta data, também no reprocessamento.
  claim_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INT NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_attribution_issues_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_commercial_issues_evidence
    FOREIGN KEY (tenant_id, evidence_id)
    REFERENCES public.commercial_referral_evidence (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_issues_representative
    FOREIGN KEY (tenant_id, representative_id)
    REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT commercial_issues_closed_requires_decision
    CHECK (status = 'open' OR (resolved_at IS NOT NULL AND resolution_note IS NOT NULL AND length(btrim(resolution_note)) >= 10))
);

CREATE INDEX IF NOT EXISTS idx_commercial_issues_open
  ON public.commercial_attribution_issues (tenant_id, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_commercial_issues_business
  ON public.commercial_attribution_issues (business_id) WHERE business_id IS NOT NULL;

ALTER TABLE public.commercial_attribution_issues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_attribution_issues FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.commercial_attribution_issues TO service_role;
DROP POLICY IF EXISTS commercial_attribution_issues_service_role_all ON public.commercial_attribution_issues;
CREATE POLICY commercial_attribution_issues_service_role_all ON public.commercial_attribution_issues
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_commercial_attribution_issues_updated_at ON public.commercial_attribution_issues;
CREATE TRIGGER trg_commercial_attribution_issues_updated_at
  BEFORE UPDATE ON public.commercial_attribution_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Registro de pendência (interno): atualiza a pendência aberta do mesmo caso em vez de duplicar
--    Chamado sempre sob a trava por empresa de commercial_claim_referral.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_record_attribution_issue(
  p_tenant_id UUID, p_business_id UUID, p_evidence_id UUID, p_representative_id UUID, p_kind TEXT,
  p_claim_user UUID, p_claim_at TIMESTAMPTZ, p_detail JSONB, p_issue_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_issue_id IS NOT NULL THEN
    UPDATE public.commercial_attribution_issues
    SET kind = p_kind, attempts = attempts + 1, last_attempt_at = now(), detail = COALESCE(p_detail, '{}'::jsonb)
    WHERE id = p_issue_id AND tenant_id = p_tenant_id AND status = 'open'
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  SELECT id INTO v_id
  FROM public.commercial_attribution_issues
  WHERE tenant_id = p_tenant_id AND status = 'open' AND kind = p_kind
    AND business_id IS NOT DISTINCT FROM p_business_id AND evidence_id IS NOT DISTINCT FROM p_evidence_id
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.commercial_attribution_issues
    SET attempts = attempts + 1, last_attempt_at = now(), detail = COALESCE(p_detail, '{}'::jsonb)
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.commercial_attribution_issues
    (tenant_id, business_id, evidence_id, representative_id, kind, claim_user_id, claim_at, detail)
  VALUES
    (p_tenant_id, p_business_id, p_evidence_id, p_representative_id, p_kind, p_claim_user, COALESCE(p_claim_at, now()), COALESCE(p_detail, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Reivindicação da evidência por uma empresa → atribuição PENDENTE (ou pendência para decisão da equipe)
--    Retorno JSON: {result, attribution_id?, issue_id?}.
--    result: created | already_attributed | disabled | invalid_token | business_not_found | issue
--    (quando 'issue', issue_kind informa o motivo). Nunca confirma, nunca substitui atribuição existente.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_claim_referral(
  p_tenant_id UUID,
  p_business_id UUID,
  p_claim_user UUID,
  p_token_hash TEXT,
  p_evidence_id UUID DEFAULT NULL,
  p_dedupe_keys TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_claim_at TIMESTAMPTZ DEFAULT now(),
  p_actor UUID DEFAULT NULL,
  p_issue_id UUID DEFAULT NULL,
  p_recovery_days INT DEFAULT 7
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_settings public.commercial_settings%ROWTYPE;
  v_ev public.commercial_referral_evidence%ROWTYPE;
  v_rep public.commercial_representatives%ROWTYPE;
  v_att public.commercial_attributions%ROWTYPE;
  v_lead public.commercial_leads%ROWTYPE;
  v_valid_until TIMESTAMPTZ;
  v_lead_id UUID;
  v_new_id UUID;
  v_issue UUID;
  v_notes TEXT := NULL;
  v_claim_at TIMESTAMPTZ := COALESCE(p_claim_at, now());
BEGIN
  IF p_tenant_id IS NULL OR p_business_id IS NULL THEN
    RAISE EXCEPTION 'claim_invalid_arguments' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF (p_token_hash IS NULL) = (p_evidence_id IS NULL) THEN
    RAISE EXCEPTION 'claim_requires_token_or_evidence' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_settings FROM public.commercial_settings WHERE tenant_id = p_tenant_id;
  IF NOT FOUND OR NOT v_settings.module_enabled OR NOT v_settings.link_auto_attribution_enabled THEN
    RETURN jsonb_build_object('result', 'disabled');
  END IF;

  -- Serializa reivindicações da mesma empresa (idempotência e concorrência).
  PERFORM pg_advisory_xact_lock(hashtextextended('commercial_claim:' || p_tenant_id::text || ':' || p_business_id::text, 0));

  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id AND tenant_id = p_tenant_id) THEN
    RETURN jsonb_build_object('result', 'business_not_found');
  END IF;

  -- Trava a evidência: duas empresas não reivindicam a mesma evidência ao mesmo tempo.
  SELECT * INTO v_ev
  FROM public.commercial_referral_evidence
  WHERE tenant_id = p_tenant_id
    AND evidence_type = 'referral_link_visit'
    AND ((p_token_hash IS NOT NULL AND visit_token_hash = p_token_hash) OR (p_evidence_id IS NOT NULL AND id = p_evidence_id))
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'invalid_token');
  END IF;

  -- Evidência já usada por OUTRA empresa: uso único (sem replay).
  IF (v_ev.business_id IS NOT NULL AND v_ev.business_id <> p_business_id)
     OR (v_ev.consumed_at IS NOT NULL AND v_ev.business_id IS NULL) THEN
    v_issue := public.commercial_record_attribution_issue(
      p_tenant_id, p_business_id, v_ev.id, v_ev.representative_id, 'evidence_used_by_other_business',
      p_claim_user, v_claim_at, jsonb_build_object('used_by_business_id', v_ev.business_id), p_issue_id);
    RETURN jsonb_build_object('result', 'issue', 'issue_kind', 'evidence_used_by_other_business', 'issue_id', v_issue);
  END IF;

  SELECT * INTO v_rep FROM public.commercial_representatives
  WHERE id = v_ev.representative_id AND tenant_id = p_tenant_id;

  -- 1) Atribuição já existente para a empresa (idempotência / precedência da confirmada).
  SELECT * INTO v_att FROM public.commercial_attributions
  WHERE tenant_id = p_tenant_id AND business_id = p_business_id AND status = 'confirmed';
  IF FOUND THEN
    IF v_att.representative_id = v_ev.representative_id THEN
      UPDATE public.commercial_referral_evidence SET business_id = p_business_id, consumed_at = COALESCE(consumed_at, now()) WHERE id = v_ev.id AND business_id IS NULL AND consumed_at IS NULL;
      RETURN jsonb_build_object('result', 'already_attributed', 'attribution_id', v_att.id);
    END IF;
    UPDATE public.commercial_referral_evidence SET business_id = p_business_id, consumed_at = COALESCE(consumed_at, now()) WHERE id = v_ev.id AND business_id IS NULL AND consumed_at IS NULL;
    v_issue := public.commercial_record_attribution_issue(
      p_tenant_id, p_business_id, v_ev.id, v_ev.representative_id, 'conflict_confirmed',
      p_claim_user, v_claim_at, jsonb_build_object('confirmed_attribution_id', v_att.id), p_issue_id);
    RETURN jsonb_build_object('result', 'issue', 'issue_kind', 'conflict_confirmed', 'issue_id', v_issue);
  END IF;

  SELECT * INTO v_att FROM public.commercial_attributions
  WHERE tenant_id = p_tenant_id AND business_id = p_business_id AND representative_id = v_ev.representative_id AND status = 'pending';
  IF FOUND THEN
    UPDATE public.commercial_referral_evidence SET business_id = p_business_id, consumed_at = COALESCE(consumed_at, now()) WHERE id = v_ev.id AND business_id IS NULL AND consumed_at IS NULL;
    IF p_issue_id IS NOT NULL THEN
      UPDATE public.commercial_attribution_issues
      SET status = 'resolved', resolution = 'already_attributed', resolved_at = now(), resolved_by = p_actor,
          resolution_note = 'Atribuição pendente já existente para este representante.'
      WHERE id = p_issue_id AND tenant_id = p_tenant_id AND status = 'open';
    END IF;
    RETURN jsonb_build_object('result', 'already_attributed', 'attribution_id', v_att.id);
  END IF;

  -- Daqui em diante a evidência fica vinculada a ESTA empresa (uso único), qualquer que seja o desfecho.
  UPDATE public.commercial_referral_evidence SET business_id = p_business_id, consumed_at = COALESCE(consumed_at, now()) WHERE id = v_ev.id AND business_id IS NULL AND consumed_at IS NULL;

  -- 2) Validade avaliada no momento em que a empresa foi criada.
  IF v_ev.valid_until IS NULL OR v_ev.valid_until <= v_claim_at THEN
    v_issue := public.commercial_record_attribution_issue(
      p_tenant_id, p_business_id, v_ev.id, v_ev.representative_id, 'evidence_expired',
      p_claim_user, v_claim_at, jsonb_build_object('valid_until', v_ev.valid_until), p_issue_id);
    RETURN jsonb_build_object('result', 'issue', 'issue_kind', 'evidence_expired', 'issue_id', v_issue);
  END IF;

  -- 3) Representante precisa estar ativo.
  IF v_rep.id IS NULL OR v_rep.status <> 'active' THEN
    v_issue := public.commercial_record_attribution_issue(
      p_tenant_id, p_business_id, v_ev.id, v_ev.representative_id, 'rep_inactive',
      p_claim_user, v_claim_at, jsonb_build_object('status', v_rep.status), p_issue_id);
    RETURN jsonb_build_object('result', 'issue', 'issue_kind', 'rep_inactive', 'issue_id', v_issue);
  END IF;

  -- 4) Autoindicação.
  IF v_rep.user_id IS NOT NULL AND p_claim_user IS NOT NULL AND v_rep.user_id = p_claim_user THEN
    v_issue := public.commercial_record_attribution_issue(
      p_tenant_id, p_business_id, v_ev.id, v_ev.representative_id, 'self_referral',
      p_claim_user, v_claim_at, '{}'::jsonb, p_issue_id);
    RETURN jsonb_build_object('result', 'issue', 'issue_kind', 'self_referral', 'issue_id', v_issue);
  END IF;

  -- 5) Lead de OUTRO representante com reserva vigente prevalece sobre o link.
  IF array_length(p_dedupe_keys, 1) IS NOT NULL THEN
    SELECT * INTO v_lead FROM public.commercial_leads
    WHERE tenant_id = p_tenant_id
      AND dedupe_key = ANY (p_dedupe_keys)
      AND status IN ('qualified', 'proposal')
      AND reserved_until IS NOT NULL AND reserved_until > v_claim_at
      AND representative_id IS DISTINCT FROM v_rep.id
    ORDER BY reserved_until DESC
    LIMIT 1;
    IF FOUND THEN
      v_issue := public.commercial_record_attribution_issue(
        p_tenant_id, p_business_id, v_ev.id, v_ev.representative_id, 'reserved_by_other',
        p_claim_user, v_claim_at, jsonb_build_object('lead_id', v_lead.id, 'reserved_until', v_lead.reserved_until), p_issue_id);
      RETURN jsonb_build_object('result', 'issue', 'issue_kind', 'reserved_by_other', 'issue_id', v_issue);
    END IF;
  END IF;

  -- 6) Outro representante já tem atribuição pendente: o posterior NÃO substitui; a equipe arbitra.
  IF EXISTS (
    SELECT 1 FROM public.commercial_attributions
    WHERE tenant_id = p_tenant_id AND business_id = p_business_id AND status = 'pending'
      AND representative_id <> v_rep.id AND (valid_until IS NULL OR valid_until > v_claim_at)
  ) THEN
    v_issue := public.commercial_record_attribution_issue(
      p_tenant_id, p_business_id, v_ev.id, v_ev.representative_id, 'competing_pending',
      p_claim_user, v_claim_at, '{}'::jsonb, p_issue_id);
    RETURN jsonb_build_object('result', 'issue', 'issue_kind', 'competing_pending', 'issue_id', v_issue);
  END IF;

  -- 7) Caso limpo: atribuição PENDENTE, vinculada à evidência original, sem prazo além da evidência.
  --    Pendências do mesmo caso (reprocessamento tardio): a validade avaliada acima usou o momento do cadastro; se o
  --    prazo da evidência já passou na hora de aplicar, a equipe recebe uma janela curta e declarada para decidir.
  v_valid_until := v_ev.valid_until;
  IF v_valid_until <= now() THEN
    v_valid_until := now() + make_interval(days => GREATEST(1, LEAST(COALESCE(p_recovery_days, 7), 30)));
    v_notes := 'Recuperação tardia: evidência válida no cadastro da empresa; janela curta para decisão da equipe.';
  END IF;

  -- Vínculo ao lead do MESMO representante, quando existir e ainda não tiver atribuição viva.
  v_lead_id := NULL;
  IF array_length(p_dedupe_keys, 1) IS NOT NULL THEN
    SELECT l.id INTO v_lead_id
    FROM public.commercial_leads l
    WHERE l.tenant_id = p_tenant_id AND l.dedupe_key = ANY (p_dedupe_keys)
      AND l.representative_id = v_rep.id AND l.status IN ('new', 'contacted', 'qualified', 'proposal')
      AND NOT EXISTS (
        SELECT 1 FROM public.commercial_attributions a
        WHERE a.tenant_id = l.tenant_id AND a.lead_id = l.id AND a.status IN ('pending', 'confirmed'))
    ORDER BY l.created_at
    LIMIT 1;
  END IF;

  INSERT INTO public.commercial_attributions
    (tenant_id, business_id, representative_id, lead_id, origin_evidence_id, attribution_type, status, attributed_at, valid_until, notes, created_by)
  VALUES
    (p_tenant_id, p_business_id, v_rep.id, v_lead_id, v_ev.id, 'referral_link', 'pending', now(), v_valid_until, v_notes, p_actor)
  RETURNING id INTO v_new_id;

  IF v_lead_id IS NOT NULL THEN
    UPDATE public.commercial_referral_evidence SET lead_id = v_lead_id WHERE id = v_ev.id AND lead_id IS NULL;
  END IF;

  IF p_issue_id IS NOT NULL THEN
    UPDATE public.commercial_attribution_issues
    SET status = 'resolved', resolution = 'retry_created', resolved_at = now(), resolved_by = p_actor,
        resolution_note = 'Reprocessado: atribuição pendente criada automaticamente.'
    WHERE id = p_issue_id AND tenant_id = p_tenant_id AND status = 'open';
  END IF;

  RETURN jsonb_build_object('result', 'created', 'attribution_id', v_new_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Permissões: somente service_role
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.commercial_record_attribution_issue(UUID, UUID, UUID, UUID, TEXT, UUID, TIMESTAMPTZ, JSONB, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commercial_claim_referral(UUID, UUID, UUID, TEXT, UUID, TEXT[], TIMESTAMPTZ, UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commercial_record_attribution_issue(UUID, UUID, UUID, UUID, TEXT, UUID, TIMESTAMPTZ, JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.commercial_claim_referral(UUID, UUID, UUID, TEXT, UUID, TEXT[], TIMESTAMPTZ, UUID, UUID, INT) TO service_role;

NOTIFY pgrst, 'reload schema';

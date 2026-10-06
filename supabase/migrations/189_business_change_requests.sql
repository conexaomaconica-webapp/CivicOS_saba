-- 189 - Alterações do anunciante que exigem validação da plataforma antes de publicar.
--
-- Regra de produto: identidade (nome, razão social, CNPJ, categoria, descrição), mídias (logo, capa, fotos, vídeo) e
-- benefícios/ofertas passam por análise; contatos, horário, endereço, serviços, eventos e publicações publicam direto.
-- O anunciante envia a alteração; a versão atual continua no ar. O administrador aprova (a alteração é aplicada aqui,
-- numa única transação) ou recusa com motivo. Toda escrita passa por funções SECURITY DEFINER; a tabela é só leitura via RLS.
-- Depende de has_business_permission / has_tenant_admin_access (005/006), operational_notifications (066/164/185),
-- admin_audit_logs (047), business_media, business_benefits (086) e business_categories.

CREATE TABLE IF NOT EXISTS public.business_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('profile', 'logo', 'cover', 'gallery', 'video', 'benefit', 'plan')),
  entity_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create', 'update')),
  payload JSONB NOT NULL,
  previous JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'superseded')),
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  CONSTRAINT chk_change_request_payload_size CHECK (pg_column_size(payload) < 20000)
);

CREATE INDEX IF NOT EXISTS idx_change_requests_queue ON public.business_change_requests (tenant_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_requests_business ON public.business_change_requests (business_id, status, submitted_at DESC);

ALTER TABLE public.business_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business team reads own change requests" ON public.business_change_requests;
CREATE POLICY "Business team reads own change requests"
  ON public.business_change_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "Tenant admin reads change requests" ON public.business_change_requests;
CREATE POLICY "Tenant admin reads change requests"
  ON public.business_change_requests FOR SELECT
  USING (public.has_tenant_admin_access(tenant_id));

REVOKE ALL ON public.business_change_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.business_change_requests TO authenticated;
GRANT ALL ON public.business_change_requests TO service_role;

-- Tipos de aviso das decisões (lista completa atual: 066/068/164/185 + os dois novos).
ALTER TABLE public.operational_notifications DROP CONSTRAINT IF EXISTS operational_notifications_event_type_check;
ALTER TABLE public.operational_notifications
  ADD CONSTRAINT operational_notifications_event_type_check
  CHECK (event_type IN (
    'registration_completed', 'contract_signed', 'payment_confirmed', 'payment_pending', 'payment_overdue',
    'company_approved', 'company_rejected', 'company_suspended', 'correction_requested', 'masonic_link_verified',
    'subscription_expiring', 'quota_reached', 'survey_response_received', 'business_milestone',
    'change_request_approved', 'change_request_rejected'
  ));

-- ---------------------------------------------------------------------------
-- Envio pelo anunciante
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_business_change_request(
  p_business_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_payload JSONB,
  p_previous JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_biz RECORD;
  v_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;
  IF p_entity_type NOT IN ('profile', 'logo', 'cover', 'gallery', 'video', 'benefit', 'plan') OR p_action NOT IN ('create', 'update') THEN
    RAISE EXCEPTION 'INVALID: Tipo de alteração inválido.';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR p_payload = '{}'::jsonb THEN
    RAISE EXCEPTION 'INVALID: Nenhuma alteração informada.';
  END IF;

  SELECT b.id, b.tenant_id, b.owner_id INTO v_biz FROM public.businesses b WHERE b.id = p_business_id;
  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: Empresa não encontrada.';
  END IF;
  IF v_biz.owner_id IS DISTINCT FROM v_user
     AND NOT public.has_business_permission(v_biz.tenant_id, v_biz.id, ARRAY['owner', 'co_owner', 'manager']) THEN
    RAISE EXCEPTION 'FORBIDDEN: Você não pode alterar esta empresa.';
  END IF;

  -- Um novo envio do mesmo item substitui o anterior ainda pendente (não há fila de versões velhas).
  IF p_entity_type IN ('profile', 'logo', 'cover', 'video', 'plan') OR (p_entity_type = 'benefit' AND p_entity_id IS NOT NULL) THEN
    UPDATE public.business_change_requests
    SET status = 'superseded', reviewed_at = now()
    WHERE business_id = p_business_id AND entity_type = p_entity_type
      AND entity_id IS NOT DISTINCT FROM p_entity_id AND status = 'pending';
  END IF;

  INSERT INTO public.business_change_requests
    (tenant_id, business_id, entity_type, entity_id, action, payload, previous, submitted_by)
  VALUES
    (v_biz.tenant_id, v_biz.id, p_entity_type, p_entity_id, p_action, p_payload, p_previous, v_user)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_business_change_request(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_req public.business_change_requests;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;
  SELECT * INTO v_req FROM public.business_change_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL OR v_req.status <> 'pending' THEN
    RETURN false;
  END IF;
  IF v_req.submitted_by <> v_user
     AND NOT public.has_business_permission(v_req.tenant_id, v_req.business_id, ARRAY['owner', 'co_owner', 'manager'])
     AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_req.business_id AND b.owner_id = v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para cancelar este envio.';
  END IF;
  UPDATE public.business_change_requests SET status = 'cancelled', reviewed_at = now() WHERE id = p_request_id;
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- Aplicação da alteração aprovada (uso interno, chamada só por decide_business_change_request)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._apply_business_change_request(p_req public.business_change_requests, p_actor UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_p JSONB := p_req.payload;
  v_cat UUID;
  v_next INTEGER;
  v_type TEXT;
BEGIN
  IF p_req.entity_type = 'profile' THEN
    UPDATE public.businesses b SET
      name = COALESCE(NULLIF(btrim(v_p ->> 'name'), ''), b.name),
      legal_name = CASE WHEN v_p ? 'legal_name' THEN NULLIF(btrim(v_p ->> 'legal_name'), '') ELSE b.legal_name END,
      cnpj = CASE WHEN v_p ? 'document_number' THEN NULLIF(btrim(v_p ->> 'document_number'), '') ELSE b.cnpj END,
      cnpj_cpf = CASE WHEN v_p ? 'document_number' THEN NULLIF(btrim(v_p ->> 'document_number'), '') ELSE b.cnpj_cpf END,
      category = CASE WHEN v_p ? 'category' THEN NULLIF(btrim(v_p ->> 'category'), '') ELSE b.category END,
      description = CASE WHEN v_p ? 'description' THEN v_p ->> 'description' ELSE b.description END,
      updated_at = now()
    WHERE b.id = p_req.business_id;

    -- Categoria do catálogo oficial, quando o nome existir: vira a principal (o Guia lê business_categories primeiro).
    IF v_p ? 'category' THEN
      SELECT c.id INTO v_cat FROM public.categories c
      WHERE c.tenant_id = p_req.tenant_id AND lower(c.name) = lower(btrim(v_p ->> 'category')) AND c.is_active = true
      LIMIT 1;
      IF v_cat IS NOT NULL THEN
        UPDATE public.business_categories SET is_primary = false WHERE business_id = p_req.business_id;
        INSERT INTO public.business_categories (tenant_id, business_id, category_id, is_primary)
        VALUES (p_req.tenant_id, p_req.business_id, v_cat, true)
        ON CONFLICT (business_id, category_id) DO UPDATE SET is_primary = true;
      END IF;
    END IF;

  ELSIF p_req.entity_type = 'logo' THEN
    UPDATE public.businesses SET logo_url = v_p ->> 'url', updated_at = now() WHERE id = p_req.business_id;

  ELSIF p_req.entity_type = 'cover' THEN
    DELETE FROM public.business_media WHERE business_id = p_req.business_id AND media_type = 'image' AND display_order = 0;
    INSERT INTO public.business_media (tenant_id, business_id, media_type, url, title, display_order)
    VALUES (p_req.tenant_id, p_req.business_id, 'image', v_p ->> 'url', 'Imagem de Capa', 0);

  ELSIF p_req.entity_type = 'gallery' THEN
    SELECT COALESCE(max(display_order), 0) + 1 INTO v_next
    FROM public.business_media WHERE business_id = p_req.business_id AND media_type = 'image' AND display_order > 0;
    INSERT INTO public.business_media (tenant_id, business_id, media_type, url, title, display_order)
    VALUES (p_req.tenant_id, p_req.business_id, 'image', v_p ->> 'url', COALESCE(NULLIF(btrim(v_p ->> 'title'), ''), 'Foto ' || v_next), v_next);

  ELSIF p_req.entity_type = 'video' THEN
    DELETE FROM public.business_media WHERE business_id = p_req.business_id AND media_type = 'video';
    INSERT INTO public.business_media (tenant_id, business_id, media_type, url, title, display_order)
    VALUES (p_req.tenant_id, p_req.business_id, 'video', v_p ->> 'url', COALESCE(NULLIF(btrim(v_p ->> 'title'), ''), 'Vídeo institucional'), 0);

  ELSIF p_req.entity_type = 'plan' THEN
    -- Mudança de plano é um processo comercial (contrato e pagamento): aprovar aqui apenas registra o aceite do pedido;
    -- a troca do plano em si é feita pela equipe em Empresas > Contratação.
    NULL;

  ELSIF p_req.entity_type = 'benefit' THEN
    v_type := COALESCE(NULLIF(v_p ->> 'benefit_type', ''), 'special_condition');
    IF v_type NOT IN ('percentage_discount', 'fixed_discount', 'special_price', 'gift', 'special_condition', 'buy_x_get_y', 'free_service', 'custom') THEN
      v_type := 'special_condition';
    END IF;
    IF p_req.action = 'create' THEN
      INSERT INTO public.business_benefits
        (tenant_id, business_id, title, description, benefit_type, discount_code, redeem_instructions, status, created_by)
      VALUES
        (p_req.tenant_id, p_req.business_id, btrim(v_p ->> 'title'), COALESCE(btrim(v_p ->> 'description'), ''), v_type,
         NULLIF(btrim(v_p ->> 'discount_code'), ''), NULLIF(btrim(v_p ->> 'redeem_instructions'), ''), 'active', p_req.submitted_by);
    ELSE
      UPDATE public.business_benefits SET
        title = COALESCE(NULLIF(btrim(v_p ->> 'title'), ''), title),
        description = COALESCE(btrim(v_p ->> 'description'), description),
        benefit_type = v_type,
        discount_code = NULLIF(btrim(v_p ->> 'discount_code'), ''),
        redeem_instructions = NULLIF(btrim(v_p ->> 'redeem_instructions'), ''),
        updated_at = now()
      WHERE id = p_req.entity_id AND business_id = p_req.business_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._apply_business_change_request(public.business_change_requests, UUID) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Decisão do administrador
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decide_business_change_request(p_request_id UUID, p_decision TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_req public.business_change_requests;
  v_note TEXT := NULLIF(btrim(COALESCE(p_note, '')), '');
  v_email TEXT;
  v_label TEXT;
  v_biz_name TEXT;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'INVALID: Decisão inválida.';
  END IF;

  SELECT * INTO v_req FROM public.business_change_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Solicitação não encontrada.';
  END IF;
  IF NOT public.has_tenant_admin_access(v_req.tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para analisar esta solicitação.';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'ALREADY_DECIDED: Esta solicitação já foi analisada ou substituída.';
  END IF;
  IF p_decision = 'reject' AND (v_note IS NULL OR char_length(v_note) < 3) THEN
    RAISE EXCEPTION 'NOTE_REQUIRED: Informe o motivo da recusa.';
  END IF;

  IF p_decision = 'approve' THEN
    PERFORM public._apply_business_change_request(v_req, v_admin);
  END IF;

  UPDATE public.business_change_requests
  SET status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END,
      reviewed_by = v_admin, reviewed_at = now(), review_note = v_note
  WHERE id = p_request_id;

  BEGIN
    INSERT INTO public.admin_audit_logs (tenant_id, actor_id, entity_type, entity_id, action, before_value, after_value, reason)
    VALUES (v_req.tenant_id, v_admin, 'business_change_request', v_req.id,
            CASE WHEN p_decision = 'approve' THEN 'APPROVE_CHANGE_REQUEST' ELSE 'REJECT_CHANGE_REQUEST' END,
            v_req.previous, v_req.payload, v_note);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- auditoria não bloqueia a decisão
  END;

  -- Aviso in-app a quem enviou.
  BEGIN
    SELECT p.email INTO v_email FROM public.profiles p WHERE p.id = v_req.submitted_by;
    SELECT b.name INTO v_biz_name FROM public.businesses b WHERE b.id = v_req.business_id;
    v_label := CASE v_req.entity_type
      WHEN 'profile' THEN 'dados da empresa' WHEN 'logo' THEN 'logomarca' WHEN 'cover' THEN 'imagem de capa'
      WHEN 'gallery' THEN 'foto da galeria' WHEN 'video' THEN 'vídeo institucional' WHEN 'plan' THEN 'mudança de plano' ELSE 'oferta' END;
    IF v_email IS NOT NULL THEN
      INSERT INTO public.operational_notifications
        (tenant_id, recipient_id, recipient_email, event_type, title, body, action_url, channel, status, sent_at)
      VALUES
        (v_req.tenant_id, v_req.submitted_by, v_email,
         CASE WHEN p_decision = 'approve' THEN 'change_request_approved' ELSE 'change_request_rejected' END,
         CASE WHEN p_decision = 'approve' THEN 'Alteração aprovada: ' || v_label ELSE 'Alteração não aprovada: ' || v_label END,
         CASE WHEN p_decision = 'approve' AND v_req.entity_type = 'plan'
              THEN 'Sua solicitação de mudança de plano foi aceita. Nossa equipe comercial entrará em contato para concluir a contratação.'
              WHEN p_decision = 'approve'
              THEN 'Sua alteração (' || v_label || ') foi aprovada e já está publicada no Guia.'
              ELSE 'Sua alteração (' || v_label || ') não foi aprovada. Motivo: ' || v_note END,
         '/anunciante/empresa', 'in_app', 'sent', now());
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('id', v_req.id, 'status', CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_business_change_request(UUID, TEXT, UUID, TEXT, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_business_change_request(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_business_change_request(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_business_change_request(UUID, TEXT, UUID, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_business_change_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_business_change_request(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

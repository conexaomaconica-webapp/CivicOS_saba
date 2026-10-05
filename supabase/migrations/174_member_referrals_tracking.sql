-- 174 - "Indicar esta empresa": indicações pessoais com rastreamento.
--
-- Um membro logado gera um link com o próprio código (/guia/{empresa}?ref=CODIGO). Quem abre o link vira uma
-- "indicação pessoal" da empresa. O funil é automático:
--   indicação (abriu o link) -> contato (WhatsApp/telefone/site/rota) -> benefício resgatado -> conexão confirmada.
--
-- Regras:
--  - Uma pessoa (navegador, identificado por um id aleatório do cookie) conta UMA vez por empresa: vale o primeiro
--    toque por 30 dias; depois disso uma nova indicação pode substituir a anterior.
--  - O próprio indicador nunca conta para si.
--  - Limite de 300 novas indicações por indicador a cada 24 h (proteção contra inflar o número).
--  - Tudo é lido e gravado por funções SECURITY DEFINER; as tabelas não têm acesso direto.
--  - O público vê só o total ("N indicações pessoais"); nomes (mascarados) só a empresa e a plataforma.

-- ---------------------------------------------------------------------------
-- 1. Código de indicação do membro
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_referral_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6,12}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.member_referral_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_referral_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_referral_codes TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code TEXT;
  v_alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_attempt INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Entre na sua conta para indicar empresas.';
  END IF;

  SELECT code INTO v_code FROM public.member_referral_codes WHERE user_id = v_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;

    BEGIN
      INSERT INTO public.member_referral_codes (user_id, code) VALUES (v_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      -- Concorrência no mesmo usuário: devolve o já criado; colisão de código: tenta outro.
      SELECT code INTO v_code FROM public.member_referral_codes WHERE user_id = v_user_id;
      IF v_code IS NOT NULL THEN
        RETURN v_code;
      END IF;
      IF v_attempt >= 10 THEN
        RAISE EXCEPTION 'CODE_GENERATION_FAILED: Não foi possível gerar o código agora.';
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_code() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Indicações
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL CHECK (char_length(visitor_key) BETWEEN 16 AND 64),
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contacted_at TIMESTAMPTZ,
  contact_channel TEXT,
  benefit_at TIMESTAMPTZ,
  connection_at TIMESTAMPTZ,
  UNIQUE (business_id, visitor_key)
);

CREATE INDEX IF NOT EXISTS idx_business_referrals_business ON public.business_referrals (business_id, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_referrals_referrer ON public.business_referrals (referrer_user_id, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_referrals_referred ON public.business_referrals (referred_user_id) WHERE referred_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_referrals_visitor ON public.business_referrals (visitor_key);

ALTER TABLE public.business_referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_referrals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.business_referrals TO service_role;

-- Abriu o link de indicação (chamada pela página pública da empresa; visitante pode estar sem login).
CREATE OR REPLACE FUNCTION public.record_referral_visit(
  p_host TEXT,
  p_business_slug TEXT,
  p_code TEXT,
  p_visitor_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_tenant_id UUID;
  v_business_id UUID;
  v_referrer UUID;
  v_existing public.business_referrals;
  v_code TEXT := upper(btrim(COALESCE(p_code, '')));
  v_key TEXT := btrim(COALESCE(p_visitor_key, ''));
BEGIN
  IF char_length(v_key) < 16 OR char_length(v_key) > 64 OR v_code !~ '^[A-Z0-9]{6,12}$' THEN
    RETURN jsonb_build_object('counted', false, 'reason', 'invalid');
  END IF;

  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('counted', false, 'reason', 'tenant');
  END IF;

  SELECT b.id INTO v_business_id
  FROM public.businesses b
  WHERE b.tenant_id = v_tenant_id
    AND lower(b.slug) = lower(btrim(COALESCE(p_business_slug, '')))
    AND b.is_active = true
    AND b.publication_status = 'published';
  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('counted', false, 'reason', 'business');
  END IF;

  SELECT user_id INTO v_referrer FROM public.member_referral_codes WHERE code = v_code;
  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('counted', false, 'reason', 'code');
  END IF;

  -- O próprio indicador não conta para si.
  IF v_me IS NOT NULL AND v_me = v_referrer THEN
    RETURN jsonb_build_object('counted', false, 'reason', 'self');
  END IF;

  SELECT * INTO v_existing FROM public.business_referrals
  WHERE business_id = v_business_id AND visitor_key = v_key
  FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    -- Primeiro toque vale por 30 dias; só depois outra indicação pode substituir.
    IF v_existing.referrer_user_id <> v_referrer AND v_existing.first_seen_at < now() - interval '30 days' THEN
      UPDATE public.business_referrals
      SET referrer_user_id = v_referrer, first_seen_at = now(), last_seen_at = now(),
          referred_user_id = CASE WHEN v_me IS NOT NULL AND v_me <> v_referrer THEN v_me ELSE NULL END,
          contacted_at = NULL, contact_channel = NULL, benefit_at = NULL, connection_at = NULL
      WHERE id = v_existing.id;
      RETURN jsonb_build_object('counted', true, 'reason', 'renewed');
    END IF;

    UPDATE public.business_referrals
    SET last_seen_at = now(),
        referred_user_id = COALESCE(referred_user_id, CASE WHEN v_me IS NOT NULL AND v_me <> referrer_user_id THEN v_me END)
    WHERE id = v_existing.id;
    RETURN jsonb_build_object('counted', false, 'reason', 'already');
  END IF;

  -- Proteção contra inflar o número: limite diário de novas indicações por indicador.
  IF (SELECT count(*) FROM public.business_referrals r
      WHERE r.referrer_user_id = v_referrer AND r.first_seen_at > now() - interval '24 hours') >= 300 THEN
    RETURN jsonb_build_object('counted', false, 'reason', 'limit');
  END IF;

  INSERT INTO public.business_referrals (tenant_id, business_id, referrer_user_id, visitor_key, referred_user_id)
  VALUES (v_tenant_id, v_business_id, v_referrer, v_key, CASE WHEN v_me IS NOT NULL AND v_me <> v_referrer THEN v_me END)
  ON CONFLICT (business_id, visitor_key) DO NOTHING;

  RETURN jsonb_build_object('counted', true, 'reason', 'new');
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_referral_visit(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Liga o navegador (visitor_key) à conta da pessoa quando ela entra/se cadastra.
CREATE OR REPLACE FUNCTION public.link_referrals_to_user(p_visitor_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_me IS NULL OR char_length(btrim(COALESCE(p_visitor_key, ''))) < 16 THEN
    RETURN 0;
  END IF;

  UPDATE public.business_referrals
  SET referred_user_id = v_me
  WHERE visitor_key = btrim(p_visitor_key)
    AND referred_user_id IS NULL
    AND referrer_user_id <> v_me;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.link_referrals_to_user(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_referrals_to_user(TEXT) TO authenticated;

-- Contato (WhatsApp/telefone/site/rota): gravado pelo servidor, que conhece o cookie do visitante.
CREATE OR REPLACE FUNCTION public.referral_record_contact(
  p_business_id UUID,
  p_visitor_key TEXT,
  p_channel TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.business_referrals
  SET contacted_at = COALESCE(contacted_at, now()),
      contact_channel = COALESCE(contact_channel, left(p_channel, 24)),
      last_seen_at = now()
  WHERE business_id = p_business_id
    AND visitor_key = btrim(COALESCE(p_visitor_key, ''));
$$;

REVOKE ALL ON FUNCTION public.referral_record_contact(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.referral_record_contact(UUID, TEXT, TEXT) TO service_role;

-- Benefício resgatado pela pessoa indicada.
CREATE OR REPLACE FUNCTION public.referral_mark_benefit(p_business_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.business_referrals
  SET benefit_at = COALESCE(benefit_at, now())
  WHERE business_id = p_business_id
    AND referred_user_id = auth.uid()
    AND auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.referral_mark_benefit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.referral_mark_benefit(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Conexão confirmada pela empresa fecha o funil (apenas compra/serviço/parceria; visita não conta)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decide_business_connection(
  p_connection_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conn public.business_connections;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  IF p_action IS NULL OR p_action NOT IN ('confirmar', 'recusar') THEN
    RAISE EXCEPTION 'INVALID_ACTION: Ação inválida.';
  END IF;

  SELECT * INTO v_conn
  FROM public.business_connections
  WHERE id = p_connection_id
  FOR UPDATE;

  IF v_conn.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Conexão não encontrada.';
  END IF;

  IF NOT public.has_business_permission(
       v_conn.tenant_id, v_conn.business_id,
       ARRAY['owner', 'co_owner', 'manager', 'marketing', 'support']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para decidir conexões desta empresa.';
  END IF;

  IF v_conn.status <> 'pendente' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Esta conexão já foi respondida.';
  END IF;

  IF p_action = 'confirmar' THEN
    UPDATE public.business_connections
    SET status = 'confirmada', confirmed_at = now(), confirmed_by = v_user_id, updated_at = now()
    WHERE id = v_conn.id
    RETURNING * INTO v_conn;

    IF v_conn.connection_type <> 'visita' THEN
      UPDATE public.business_referrals
      SET connection_at = COALESCE(connection_at, now())
      WHERE business_id = v_conn.business_id AND referred_user_id = v_conn.member_user_id;
    END IF;
  ELSE
    UPDATE public.business_connections
    SET status = 'recusada', declined_at = now(), confirmed_by = v_user_id, updated_at = now()
    WHERE id = v_conn.id
    RETURNING * INTO v_conn;
  END IF;

  RETURN jsonb_build_object('id', v_conn.id, 'status', v_conn.status);
END;
$$;

REVOKE ALL ON FUNCTION public.decide_business_connection(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_business_connection(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Leituras
-- ---------------------------------------------------------------------------
-- Total público: "esta empresa recebeu N indicações pessoais".
CREATE OR REPLACE FUNCTION public.public_business_referral_count(p_host TEXT, p_business_slug TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN 0;
  END IF;

  RETURN COALESCE((
    SELECT count(*)::INTEGER
    FROM public.business_referrals r
    JOIN public.businesses b ON b.id = r.business_id
    WHERE b.tenant_id = v_tenant_id
      AND lower(b.slug) = lower(btrim(COALESCE(p_business_slug, '')))
      AND b.is_active = true
      AND b.publication_status = 'published'
  ), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_business_referral_count(TEXT, TEXT) TO anon, authenticated;

-- Funil e ranking de indicadores de uma empresa (empresa e administração).
CREATE OR REPLACE FUNCTION public.business_referral_metrics(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  SELECT b.tenant_id INTO v_tenant_id FROM public.businesses b WHERE b.id = p_business_id;
  IF v_tenant_id IS NULL OR NOT public.has_business_permission(
       v_tenant_id, p_business_id,
       ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para ver as indicações desta empresa.';
  END IF;

  RETURN jsonb_build_object(
    'total', (SELECT count(*) FROM public.business_referrals WHERE business_id = p_business_id),
    'last_30_days', (SELECT count(*) FROM public.business_referrals WHERE business_id = p_business_id AND first_seen_at > now() - interval '30 days'),
    'contacts', (SELECT count(*) FROM public.business_referrals WHERE business_id = p_business_id AND contacted_at IS NOT NULL),
    'benefits', (SELECT count(*) FROM public.business_referrals WHERE business_id = p_business_id AND benefit_at IS NOT NULL),
    'connections', (SELECT count(*) FROM public.business_referrals WHERE business_id = p_business_id AND connection_at IS NOT NULL),
    'top_referrers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', public._mask_user_display_name(t.referrer_user_id),
        'indications', t.indications,
        'contacts', t.contacts,
        'connections', t.connections
      ) ORDER BY t.indications DESC, t.connections DESC)
      FROM (
        SELECT r.referrer_user_id,
               count(*) AS indications,
               count(*) FILTER (WHERE r.contacted_at IS NOT NULL) AS contacts,
               count(*) FILTER (WHERE r.connection_at IS NOT NULL) AS connections
        FROM public.business_referrals r
        WHERE r.business_id = p_business_id
        GROUP BY r.referrer_user_id
        ORDER BY count(*) DESC
        LIMIT 5
      ) t
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.business_referral_metrics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_referral_metrics(UUID) TO authenticated;

-- "Minhas indicações" do membro: código e resultado por empresa.
CREATE OR REPLACE FUNCTION public.my_referral_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  RETURN jsonb_build_object(
    'code', (SELECT code FROM public.member_referral_codes WHERE user_id = v_me),
    'total', (SELECT count(*) FROM public.business_referrals WHERE referrer_user_id = v_me),
    'connections', (SELECT count(*) FROM public.business_referrals WHERE referrer_user_id = v_me AND connection_at IS NOT NULL),
    'by_business', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'business_name', x.name,
        'business_slug', x.slug,
        'indications', x.indications,
        'contacts', x.contacts,
        'benefits', x.benefits,
        'connections', x.connections
      ) ORDER BY x.indications DESC)
      FROM (
        SELECT b.name, b.slug,
               count(*) AS indications,
               count(*) FILTER (WHERE r.contacted_at IS NOT NULL) AS contacts,
               count(*) FILTER (WHERE r.benefit_at IS NOT NULL) AS benefits,
               count(*) FILTER (WHERE r.connection_at IS NOT NULL) AS connections
        FROM public.business_referrals r
        JOIN public.businesses b ON b.id = r.business_id
        WHERE r.referrer_user_id = v_me
        GROUP BY b.name, b.slug
        ORDER BY count(*) DESC
        LIMIT 100
      ) x
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.my_referral_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_summary() TO authenticated;

NOTIFY pgrst, 'reload schema';

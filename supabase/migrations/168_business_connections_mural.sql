-- 168 - Mural de Conexões ("Comprei na Conexão"), versão 1.
--
-- O membro registra uma conexão comercial com uma empresa (compra realizada, serviço contratado ou parceria
-- realizada), com produto/serviço e foto opcionais. A empresa confirma o atendimento (sem revelar preço).
-- Só conexões CONFIRMADAS entram nos números e no mural públicos; antes disso ficam "pendentes", visíveis apenas
-- para o membro e para a empresa.
--
-- Segurança:
--  - RLS ligado; escrita só por funções SECURITY DEFINER (registrar e decidir), nunca direto na tabela.
--  - Autorização da empresa usa os helpers canônicos (has_business_permission / has_tenant_admin_access).
--  - Dados públicos mostram só o primeiro nome do membro.
--  - Limites: 5 registros por membro a cada 24 h e no máximo 1 pendente por empresa e tipo; a empresa não
--    registra conexão consigo mesma.

-- ---------------------------------------------------------------------------
-- 1. Tabela
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('compra', 'servico', 'parceria')),
  item_description TEXT CHECK (item_description IS NULL OR char_length(item_description) <= 160),
  message TEXT CHECK (message IS NULL OR char_length(message) <= 400),
  photo_url TEXT CHECK (photo_url IS NULL OR char_length(photo_url) <= 600),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmada', 'recusada', 'removida')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_connections_business_status
  ON public.business_connections (business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_connections_member
  ON public.business_connections (member_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_connections_tenant_confirmed
  ON public.business_connections (tenant_id, status, confirmed_at DESC);

ALTER TABLE public.business_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Member reads own connections" ON public.business_connections;
CREATE POLICY "Member reads own connections" ON public.business_connections
  FOR SELECT TO authenticated
  USING (member_user_id = auth.uid());

DROP POLICY IF EXISTS "Business staff reads its connections" ON public.business_connections;
CREATE POLICY "Business staff reads its connections" ON public.business_connections
  FOR SELECT TO authenticated
  USING (
    public.has_business_permission(
      tenant_id, business_id,
      ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
    )
  );

DROP POLICY IF EXISTS "Tenant admin manages connections" ON public.business_connections;
CREATE POLICY "Tenant admin manages connections" ON public.business_connections
  FOR ALL TO authenticated
  USING (public.has_tenant_admin_access(tenant_id))
  WITH CHECK (public.has_tenant_admin_access(tenant_id));

REVOKE ALL ON public.business_connections FROM PUBLIC, anon;
GRANT SELECT ON public.business_connections TO authenticated;
GRANT ALL ON public.business_connections TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------
-- Primeiro nome do membro (exibição pública). Lê name/full_name sem depender de qual coluna existe.
CREATE OR REPLACE FUNCTION public._connection_member_first_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(split_part(btrim(COALESCE(to_jsonb(p) ->> 'full_name', to_jsonb(p) ->> 'name', '')), ' ', 1), ''),
    'Membro'
  )
  FROM (SELECT 1) AS d
  LEFT JOIN public.profiles p ON p.id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public._connection_member_first_name(UUID) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Membro registra uma conexão
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_business_connection(
  p_business_id UUID,
  p_type TEXT,
  p_item TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_biz RECORD;
  v_item TEXT := NULLIF(btrim(COALESCE(p_item, '')), '');
  v_message TEXT := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_photo TEXT := NULLIF(btrim(COALESCE(p_photo_url, '')), '');
  v_row public.business_connections;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Entre na sua conta para registrar uma conexão.';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('compra', 'servico', 'parceria') THEN
    RAISE EXCEPTION 'INVALID_TYPE: Tipo de conexão inválido.';
  END IF;

  IF v_item IS NOT NULL AND char_length(v_item) > 160 THEN
    RAISE EXCEPTION 'INVALID_ITEM: Descreva o produto ou serviço em até 160 caracteres.';
  END IF;
  IF v_message IS NOT NULL AND char_length(v_message) > 400 THEN
    RAISE EXCEPTION 'INVALID_MESSAGE: O relato pode ter até 400 caracteres.';
  END IF;

  -- A foto, se houver, precisa ter sido enviada por este próprio membro ao bucket de conexões.
  IF v_photo IS NOT NULL AND v_photo NOT LIKE '%/storage/v1/object/public/connection-photos/' || v_user_id::text || '/%' THEN
    RAISE EXCEPTION 'INVALID_PHOTO: Foto inválida.';
  END IF;

  SELECT b.id, b.tenant_id, b.owner_id, b.name
  INTO v_biz
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND b.publication_status = 'published'
    AND b.is_active = true;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: Empresa não encontrada ou indisponível.';
  END IF;

  -- Sem auto-registro: quem faz parte da empresa não registra conexão com ela mesma.
  IF v_biz.owner_id = v_user_id OR public.has_business_permission(
       v_biz.tenant_id, v_biz.id,
       ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Você faz parte desta empresa e não pode registrar uma conexão com ela.';
  END IF;

  IF (SELECT count(*) FROM public.business_connections c
      WHERE c.member_user_id = v_user_id AND c.created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT: Você já registrou várias conexões hoje. Tente novamente amanhã.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.business_connections c
             WHERE c.member_user_id = v_user_id AND c.business_id = v_biz.id
               AND c.connection_type = p_type AND c.status = 'pendente') THEN
    RAISE EXCEPTION 'DUPLICATE: Você já tem uma conexão deste tipo aguardando confirmação desta empresa.';
  END IF;

  INSERT INTO public.business_connections
    (tenant_id, business_id, member_user_id, connection_type, item_description, message, photo_url)
  VALUES
    (v_biz.tenant_id, v_biz.id, v_user_id, p_type, v_item, v_message, v_photo)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'business_id', v_row.business_id,
    'business_name', v_biz.name,
    'connection_type', v_row.connection_type,
    'status', v_row.status,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_business_connection(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_business_connection(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Empresa confirma (ou recusa) o atendimento
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
-- 5. Listagem para a empresa (com nome do membro mascarado, ex.: "João S.")
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_business_connections(
  p_business_id UUID,
  p_status TEXT DEFAULT NULL
)
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
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para ver as conexões desta empresa.';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'connection_type', c.connection_type,
      'item_description', c.item_description,
      'message', c.message,
      'photo_url', c.photo_url,
      'status', c.status,
      'member_name', public._mask_user_display_name(c.member_user_id),
      'created_at', c.created_at,
      'confirmed_at', c.confirmed_at
    ) ORDER BY (c.status = 'pendente') DESC, c.created_at DESC)
    FROM (
      SELECT * FROM public.business_connections
      WHERE business_id = p_business_id
        AND (p_status IS NULL OR status = p_status)
      ORDER BY created_at DESC
      LIMIT 200
    ) c
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.list_business_connections(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_business_connections(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Métricas por empresa (Prontuário 360 e painel do anunciante)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.business_connection_metrics(p_business_id UUID)
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
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para ver as métricas desta empresa.';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total', count(*),
      'confirmed', count(*) FILTER (WHERE status = 'confirmada'),
      'pending', count(*) FILTER (WHERE status = 'pendente'),
      'declined', count(*) FILTER (WHERE status = 'recusada'),
      'confirmed_last_30_days', count(*) FILTER (WHERE status = 'confirmada' AND confirmed_at > now() - interval '30 days'),
      'with_photo', count(*) FILTER (WHERE status = 'confirmada' AND photo_url IS NOT NULL),
      'by_type', jsonb_build_object(
        'compra', count(*) FILTER (WHERE status = 'confirmada' AND connection_type = 'compra'),
        'servico', count(*) FILTER (WHERE status = 'confirmada' AND connection_type = 'servico'),
        'parceria', count(*) FILTER (WHERE status = 'confirmada' AND connection_type = 'parceria')
      ),
      'confirmation_rate', CASE
        WHEN count(*) FILTER (WHERE status IN ('confirmada', 'recusada')) = 0 THEN NULL
        ELSE round(100.0 * count(*) FILTER (WHERE status = 'confirmada')
                   / count(*) FILTER (WHERE status IN ('confirmada', 'recusada')))
      END,
      'last_confirmed_at', max(confirmed_at)
    )
    FROM public.business_connections
    WHERE business_id = p_business_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.business_connection_metrics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_connection_metrics(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Leituras públicas (somente conexões confirmadas)
-- ---------------------------------------------------------------------------
-- Total de negócios confirmados na rede (contador da página principal).
CREATE OR REPLACE FUNCTION public.public_confirmed_connections_count(p_host TEXT)
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

  RETURN (
    SELECT count(*)::INTEGER
    FROM public.business_connections c
    JOIN public.businesses b ON b.id = c.business_id
    WHERE c.tenant_id = v_tenant_id
      AND c.status = 'confirmada'
      AND b.publication_status = 'published'
      AND b.is_active = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_confirmed_connections_count(TEXT) TO anon, authenticated;

-- Mural público de uma empresa: total confirmado + as mais recentes (só primeiro nome do membro).
CREATE OR REPLACE FUNCTION public.public_business_connections(
  p_host TEXT,
  p_business_slug TEXT,
  p_limit INTEGER DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_business_id UUID;
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 6), 1), 24);
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('confirmed_count', 0, 'items', '[]'::jsonb);
  END IF;

  SELECT b.id INTO v_business_id
  FROM public.businesses b
  WHERE b.tenant_id = v_tenant_id
    AND b.slug = p_business_slug
    AND b.publication_status = 'published'
    AND b.is_active = true;

  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('confirmed_count', 0, 'items', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'confirmed_count', (
      SELECT count(*) FROM public.business_connections c
      WHERE c.business_id = v_business_id AND c.status = 'confirmada'
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', x.id,
        'connection_type', x.connection_type,
        'item_description', x.item_description,
        'message', x.message,
        'photo_url', x.photo_url,
        'member_first_name', public._connection_member_first_name(x.member_user_id),
        'confirmed_at', x.confirmed_at
      ) ORDER BY x.confirmed_at DESC)
      FROM (
        SELECT * FROM public.business_connections c
        WHERE c.business_id = v_business_id AND c.status = 'confirmada'
        ORDER BY c.confirmed_at DESC
        LIMIT v_limit
      ) x
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_business_connections(TEXT, TEXT, INTEGER) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Fotos das conexões (bucket público; o membro só grava na própria pasta)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('connection-photos', 'connection-photos', true)
  ON CONFLICT (id) DO NOTHING;

  DROP POLICY IF EXISTS "Connection photos are public" ON storage.objects;
  CREATE POLICY "Connection photos are public" ON storage.objects
    FOR SELECT USING (bucket_id = 'connection-photos');

  DROP POLICY IF EXISTS "Members upload own connection photos" ON storage.objects;
  CREATE POLICY "Members upload own connection photos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'connection-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

  DROP POLICY IF EXISTS "Members remove own connection photos" ON storage.objects;
  CREATE POLICY "Members remove own connection photos" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'connection-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Bucket/políticas de connection-photos não puderam ser criados aqui (%). Crie o bucket público "connection-photos" no painel do Supabase e reaplique esta parte.', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Migration 088: Benefit Redemption Validation & Confirmation (BENEFITS-004)
-- RPC get_business_benefit_redemption_by_code with privacy masking & dynamic expiration,
-- RPC confirm_business_benefit_redemption with FOR UPDATE locking, sale_amount validation,
-- canonical permission checks, and strict status state machine enforcement.
-- ============================================================================

-- Helper interno para mascarar nome do usuário em formato seguro (ex.: "Eduardo S.")
CREATE OR REPLACE FUNCTION public._mask_user_display_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_initial TEXT;
  v_parts TEXT[];
BEGIN
  SELECT full_name INTO v_full_name
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_full_name IS NULL OR TRIM(v_full_name) = '' THEN
    RETURN 'Usuário M.';
  END IF;

  v_parts := regexp_split_to_array(TRIM(v_full_name), '\s+');
  v_first_name := v_parts[1];

  IF array_length(v_parts, 1) > 1 THEN
    v_last_initial := UPPER(SUBSTRING(v_parts[array_length(v_parts, 1)] FROM 1 FOR 1)) || '.';
    RETURN v_first_name || ' ' || v_last_initial;
  ELSE
    RETURN v_first_name;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. RPC get_business_benefit_redemption_by_code (Consulta de Resgate)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_business_benefit_redemption_by_code(
  p_public_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_public_code TEXT;
  v_redemption RECORD;
  v_effective_status TEXT;
  v_user_display_name TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  IF p_public_code IS NULL OR TRIM(p_public_code) = '' THEN
    RAISE EXCEPTION 'INVALID_CODE: Código público é obrigatório.';
  END IF;

  -- Normalização de entrada (trim + uppercase)
  v_public_code := UPPER(TRIM(p_public_code));

  -- Leitura do resgate por código público
  SELECT
    r.id,
    r.tenant_id,
    r.business_id,
    r.benefit_id,
    r.user_id,
    r.public_code,
    r.status,
    r.redeemed_at,
    r.expires_at,
    r.used_at,
    r.used_confirmed_by,
    r.sale_amount,
    r.cancelled_at,
    r.benefit_snapshot
  INTO v_redemption
  FROM public.business_benefit_redemptions r
  WHERE r.public_code = v_public_code;

  IF v_redemption.id IS NULL THEN
    RAISE EXCEPTION 'REDEMPTION_NOT_FOUND: Código de resgate não encontrado.';
  END IF;

  -- Checagem Canônica de Permissão da Empresa
  IF NOT (
    public.has_tenant_admin_access(v_redemption.tenant_id) OR
    public.has_business_permission(
      v_redemption.tenant_id,
      v_redemption.business_id,
      ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
    )
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para consultar resgates desta empresa.';
  END IF;

  -- Cálculo Semântico de Expiração Dinâmica
  v_effective_status := v_redemption.status;
  IF v_redemption.status = 'redeemed' AND v_redemption.expires_at IS NOT NULL AND v_redemption.expires_at < now() THEN
    v_effective_status := 'expired';
  END IF;

  -- Mascaramento de Privacidade para Dados do Usuário
  v_user_display_name := public._mask_user_display_name(v_redemption.user_id);

  RETURN jsonb_build_object(
    'id', v_redemption.id,
    'public_code', v_redemption.public_code,
    'status', v_effective_status,
    'raw_status', v_redemption.status,
    'redeemed_at', v_redemption.redeemed_at,
    'expires_at', v_redemption.expires_at,
    'used_at', v_redemption.used_at,
    'sale_amount', v_redemption.sale_amount,
    'benefit_snapshot', v_redemption.benefit_snapshot,
    'user_display_name', v_user_display_name
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. RPC confirm_business_benefit_redemption (Confirmação de Utilização)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_business_benefit_redemption(
  p_public_code TEXT,
  p_sale_amount NUMERIC(10,2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_public_code TEXT;
  v_redemption RECORD;
  v_effective_status TEXT;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  IF p_public_code IS NULL OR TRIM(p_public_code) = '' THEN
    RAISE EXCEPTION 'INVALID_CODE: Código público é obrigatório.';
  END IF;

  -- Validação de Valor de Venda (Permite NULL ou >= 0)
  IF p_sale_amount IS NOT NULL AND p_sale_amount < 0 THEN
    RAISE EXCEPTION 'INVALID_SALE_AMOUNT: Valor da venda não pode ser negativo.';
  END IF;

  -- Normalização do Código
  v_public_code := UPPER(TRIM(p_public_code));

  -- Lock Transacional no Resgate
  SELECT
    r.id,
    r.tenant_id,
    r.business_id,
    r.benefit_id,
    r.user_id,
    r.public_code,
    r.status,
    r.redeemed_at,
    r.expires_at,
    r.used_at,
    r.sale_amount
  INTO v_redemption
  FROM public.business_benefit_redemptions r
  WHERE r.public_code = v_public_code
  FOR UPDATE OF r;

  IF v_redemption.id IS NULL THEN
    RAISE EXCEPTION 'REDEMPTION_NOT_FOUND: Código de resgate não encontrado.';
  END IF;

  -- Checagem Canônica de Permissão da Empresa (Membros/Admins)
  IF NOT (
    public.has_tenant_admin_access(v_redemption.tenant_id) OR
    public.has_business_permission(
      v_redemption.tenant_id,
      v_redemption.business_id,
      ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
    )
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para confirmar resgates desta empresa.';
  END IF;

  -- Validação Semântica de Estados Efetivos
  IF v_redemption.status = 'used' THEN
    RAISE EXCEPTION 'ALREADY_USED: Este benefício já foi utilizado em % às %.',
      to_char(v_redemption.used_at AT TIME ZONE 'UTC', 'DD/MM/YYYY'),
      to_char(v_redemption.used_at AT TIME ZONE 'UTC', 'HH24:MI');
  END IF;

  IF v_redemption.status = 'cancelled' THEN
    RAISE EXCEPTION 'REDEMPTION_CANCELLED: Benefício cancelado.';
  END IF;

  IF v_redemption.status = 'expired' OR (v_redemption.status = 'redeemed' AND v_redemption.expires_at IS NOT NULL AND v_redemption.expires_at < now()) THEN
    RAISE EXCEPTION 'REDEMPTION_EXPIRED: Benefício expirado.';
  END IF;

  IF v_redemption.status <> 'redeemed' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Resgate em estado inválido para confirmação (%).', v_redemption.status;
  END IF;

  -- Atualização Transacional para Status 'used'
  UPDATE public.business_benefit_redemptions
  SET
    status = 'used',
    used_at = now(),
    used_confirmed_by = v_user_id,
    sale_amount = COALESCE(p_sale_amount, sale_amount),
    updated_at = now()
  WHERE id = v_redemption.id
  RETURNING row_to_json(business_benefit_redemptions)::jsonb INTO v_result;

  RETURN v_result;
END;
$$;

-- Permissões de Execução Estritas (Bloqueio de Anon)
REVOKE ALL ON FUNCTION public.get_business_benefit_redemption_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_benefit_redemption_by_code(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.confirm_business_benefit_redemption(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_business_benefit_redemption(TEXT, NUMERIC) TO authenticated;

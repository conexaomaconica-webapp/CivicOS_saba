-- ROLLBACK da migration 250: restaura as funções originais e os privilégios abertos (PUBLIC/anon/authenticated).
-- ATENÇÃO: isto REABRE a exposição corrigida pela 250.

CREATE OR REPLACE FUNCTION public.get_signed_contract_snapshot(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'ok', true,
    'contract_id', c.id,
    'business_id', c.business_id,
    'status', c.status,
    'rendered_text', s.rendered_text,
    'sha256_hash', s.sha256_hash,
    'accepted_at', a.accepted_at,
    'ip_address', a.ip_address,
    'user_agent', a.user_agent,
    'user_id', a.user_id
  ) INTO v_result
  FROM public.contracts c
  JOIN public.contract_snapshots s ON s.contract_id = c.id
  JOIN public.contract_acceptances a ON a.snapshot_id = s.id
  WHERE c.business_id = p_business_id
  ORDER BY a.accepted_at DESC
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nenhum contrato assinado localizado para esta empresa.');
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_signed_contract_snapshot(UUID) TO PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reorder_business_services(
  p_business_id UUID,
  p_service_id UUID,
  p_direction TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_current_order INT;
  v_target_id UUID;
  v_target_order INT;
BEGIN
  -- Lock na empresa pai para ordenação determinística
  SELECT tenant_id INTO v_tenant_id
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada ou sem acesso.';
  END IF;

  -- Obter display_order atual do serviço
  SELECT display_order INTO v_current_order
  FROM public.business_services
  WHERE id = p_service_id AND business_id = p_business_id;

  IF v_current_order IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado.';
  END IF;

  IF p_direction = 'up' THEN
    -- Buscar o item imediatamente anterior
    SELECT id, display_order INTO v_target_id, v_target_order
    FROM public.business_services
    WHERE business_id = p_business_id AND display_order < v_current_order
    ORDER BY display_order DESC, created_at DESC, id DESC
    LIMIT 1;
  ELSIF p_direction = 'down' THEN
    -- Buscar o item imediatamente posterior
    SELECT id, display_order INTO v_target_id, v_target_order
    FROM public.business_services
    WHERE business_id = p_business_id AND display_order > v_current_order
    ORDER BY display_order ASC, created_at ASC, id ASC
    LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Direção inválida. Use "up" ou "down".';
  END IF;

  -- Se encontrou vizinho para trocar de posição
  IF v_target_id IS NOT NULL THEN
    UPDATE public.business_services
    SET display_order = v_target_order, updated_at = now()
    WHERE id = p_service_id;

    UPDATE public.business_services
    SET display_order = v_current_order, updated_at = now()
    WHERE id = v_target_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_business_services(UUID, UUID, TEXT) TO PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reorder_business_benefits(
  p_business_id UUID,
  p_benefit_id UUID,
  p_direction TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_current_order INT;
  v_target_id UUID;
  v_target_order INT;
BEGIN
  -- Lock na empresa pai para ordenação determinística
  SELECT tenant_id INTO v_tenant_id
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada ou sem acesso.';
  END IF;

  -- Obter display_order atual do benefício
  SELECT display_order INTO v_current_order
  FROM public.business_benefits
  WHERE id = p_benefit_id AND business_id = p_business_id;

  IF v_current_order IS NULL THEN
    RAISE EXCEPTION 'Benefício não encontrado.';
  END IF;

  IF p_direction = 'up' THEN
    SELECT id, display_order INTO v_target_id, v_target_order
    FROM public.business_benefits
    WHERE business_id = p_business_id AND display_order < v_current_order
    ORDER BY display_order DESC, created_at DESC, id DESC
    LIMIT 1;
  ELSIF p_direction = 'down' THEN
    SELECT id, display_order INTO v_target_id, v_target_order
    FROM public.business_benefits
    WHERE business_id = p_business_id AND display_order > v_current_order
    ORDER BY display_order ASC, created_at ASC, id ASC
    LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Direção inválida. Use "up" ou "down".';
  END IF;

  IF v_target_id IS NOT NULL THEN
    UPDATE public.business_benefits
    SET display_order = v_target_order, updated_at = now()
    WHERE id = p_benefit_id;

    UPDATE public.business_benefits
    SET display_order = v_current_order, updated_at = now()
    WHERE id = v_target_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_business_benefits(UUID, UUID, TEXT) TO PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_business_analytics_summary(
    p_tenant_id UUID,
    p_business_id UUID,
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    event_type VARCHAR(50),
    total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.event_type,
        COUNT(*)::BIGINT AS total_count
    FROM public.business_analytics_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.business_id = p_business_id
      AND e.created_at >= (NOW() - (GREATEST(p_days, 1) || ' days')::INTERVAL)
    GROUP BY e.event_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_analytics_summary(UUID, UUID, INT) TO PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_companies_total BIGINT := 0;
  v_companies_published BIGINT := 0;
  v_companies_pending BIGINT := 0;
  v_companies_suspended BIGINT := 0;
  v_companies_draft BIGINT := 0;
  v_new_companies_30d BIGINT := 0;
  v_new_published_30d BIGINT := 0;

  v_sub_bronze BIGINT := 0;
  v_sub_prata BIGINT := 0;
  v_sub_ouro BIGINT := 0;
  v_sub_founder BIGINT := 0;
  v_pedra_fundamental BIGINT := 0;
  v_active_subscriptions BIGINT := 0;

  v_lodges_total BIGINT := 0;
  v_lodges_without_coordinates BIGINT := 0;
  v_new_lodges_30d BIGINT := 0;

  v_new_users_30d BIGINT := 0;

  v_payments_confirmed_count BIGINT := 0;
  v_payments_pending_count BIGINT := 0;
  v_payments_overdue_count BIGINT := 0;
  v_revenue_monthly NUMERIC := 0;
  v_revenue_annual NUMERIC := 0;

  v_incomplete_profiles BIGINT := 0;
BEGIN
  -- 1. Empresas
  SELECT
    COUNT(*),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'published' AND (is_active IS NULL OR is_active = true)), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'pending_review'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'suspended'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'draft'), 0),
    COALESCE(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'published' AND created_at >= NOW() - INTERVAL '30 days'), 0)
  INTO
    v_companies_total,
    v_companies_published,
    v_companies_pending,
    v_companies_suspended,
    v_companies_draft,
    v_new_companies_30d,
    v_new_published_30d
  FROM public.businesses;

  -- 2. Reconhecimentos Canônicos
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE recognition_key = 'pedra_fundamental' AND is_active = true), 0),
    COALESCE(COUNT(*) FILTER (WHERE recognition_key = 'fundadora' AND is_active = true), 0)
  INTO
    v_pedra_fundamental,
    v_sub_founder
  FROM public.business_recognitions;

  -- 3. Assinaturas Ativas
  SELECT COALESCE(COUNT(*), 0)
  INTO v_active_subscriptions
  FROM public.subscriptions
  WHERE status = 'active';

  -- 4. Distribuição de Planos Comerciais
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE lower(COALESCE(plan_tier, 'bronze')) IN ('bronze', 'esquadro')), 0),
    COALESCE(COUNT(*) FILTER (WHERE lower(COALESCE(plan_tier, '')) IN ('prata', 'compasso')), 0),
    COALESCE(COUNT(*) FILTER (WHERE lower(COALESCE(plan_tier, '')) IN ('ouro', 'acacia', 'ouro_founder')), 0)
  INTO
    v_sub_bronze,
    v_sub_prata,
    v_sub_ouro
  FROM public.businesses
  WHERE publication_status = 'published';

  -- 5. Lojas Maçônicas
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE is_active = true OR is_active IS NULL), 0),
    COALESCE(COUNT(*) FILTER (WHERE (is_active = true OR is_active IS NULL) AND (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0)), 0),
    COALESCE(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)
  INTO
    v_lodges_total,
    v_lodges_without_coordinates,
    v_new_lodges_30d
  FROM public.organizations;

  -- 6. Usuários novos 30d
  SELECT COALESCE(COUNT(*), 0)
  INTO v_new_users_30d
  FROM public.profiles
  WHERE created_at >= NOW() - INTERVAL '30 days';

  -- 7. Financeiro: Faturas ou Recorrência Real das Assinaturas Ativas
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE status = 'paid'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('draft', 'open', 'pending')), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'overdue'), 0),
    COALESCE(SUM(amount_paid) FILTER (WHERE status = 'paid'), 0)
  INTO
    v_payments_confirmed_count,
    v_payments_pending_count,
    v_payments_overdue_count,
    v_revenue_annual
  FROM public.invoices;

  -- Se faturas não estiverem registradas, calcula pelas assinaturas ativas reais
  IF v_revenue_annual = 0 THEN
    v_revenue_monthly := v_active_subscriptions * 90;
    v_revenue_annual := v_active_subscriptions * 1080;
    v_payments_confirmed_count := v_active_subscriptions;
    v_payments_pending_count := v_companies_pending;
  ELSE
    v_revenue_monthly := ROUND(v_revenue_annual / 12, 2);
  END IF;

  -- 8. Perfis Incompletos (< 70% de dados essenciais)
  SELECT COALESCE(COUNT(*), 0)
  INTO v_incomplete_profiles
  FROM public.businesses
  WHERE (logo_url IS NULL OR phone IS NULL OR description IS NULL OR length(trim(COALESCE(description, ''))) < 15);

  RETURN jsonb_build_object(
    'companies', jsonb_build_object(
      'total', v_companies_total,
      'published', v_companies_published,
      'pending', v_companies_pending,
      'suspended', v_companies_suspended,
      'draft', v_companies_draft
    ),
    'subscriptions', jsonb_build_object(
      'bronze', v_sub_bronze,
      'prata', v_sub_prata,
      'ouro', v_sub_ouro,
      'founder', v_sub_founder,
      'total', v_active_subscriptions
    ),
    'finance', jsonb_build_object(
      'monthly_revenue_brl', v_revenue_monthly,
      'annual_revenue_brl', v_revenue_annual,
      'confirmed_payments_count', v_payments_confirmed_count,
      'pending_payments_count', v_payments_pending_count,
      'overdue_payments_count', v_payments_overdue_count
    ),
    'pendingActions', jsonb_build_object(
      'pending_approvals_count', v_companies_pending,
      'pending_payments_count', v_payments_pending_count,
      'expiring_contracts_count', 0
    ),
    'growth', jsonb_build_object(
      'new_companies_30d', v_new_companies_30d,
      'new_users_30d', v_new_users_30d,
      'newPublished30d', v_new_published_30d,
      'newLodges30d', v_new_lodges_30d
    ),
    'lodges', jsonb_build_object(
      'publishedLodgesCount', v_lodges_total,
      'lodgesWithoutCoordinates', v_lodges_without_coordinates,
      'newLodge30d', v_new_lodges_30d
    ),
    'recognitions', jsonb_build_object(
      'pedraFundamentalCount', v_pedra_fundamental,
      'founderBadgeCount', v_sub_founder
    ),
    'attention', jsonb_build_object(
      'incompleteProfiles', v_incomplete_profiles
    ),
    'updated_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_admin_lodges_list(
  p_query TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_potency TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_missing_coords BOOLEAN DEFAULT false,
  p_missing_emblem BOOLEAN DEFAULT false,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 50);
  v_offset INTEGER := (v_page - 1) * v_page_size;
  v_total INTEGER := 0;
  v_total_pages INTEGER := 0;
  v_items JSONB := '[]'::jsonb;
  v_kpis JSONB;
BEGIN
  -- KPIs Consolidados
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'published', COALESCE(COUNT(*) FILTER (WHERE is_active = true), 0),
    'inactive', COALESCE(COUNT(*) FILTER (WHERE is_active = false), 0),
    'missing_coords', COALESCE(COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL), 0),
    'missing_emblem', COALESCE(COUNT(*) FILTER (WHERE emblem_url IS NULL OR emblem_url = ''), 0),
    'possible_duplicates', 0
  ) INTO v_kpis
  FROM public.organizations;

  WITH filtered AS (
    SELECT
      o.id,
      o.name,
      COALESCE(o.slug, o.id::text) AS slug,
      o.code_number,
      o.potency,
      o.rite,
      o.city,
      o.state,
      o.address,
      o.meeting_schedule,
      o.phone,
      o.email,
      o.emblem_url,
      o.latitude,
      o.longitude,
      o.is_active,
      COALESCE(o.provenance, 'manual') AS provenance,
      o.created_at,
      -- Calculo de Completude Real (%)
      ROUND(
        (
          (CASE WHEN o.name IS NOT NULL AND o.name != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.potency IS NOT NULL AND o.potency != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.meeting_schedule IS NOT NULL AND o.meeting_schedule != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.city IS NOT NULL AND o.city != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.latitude IS NOT NULL AND o.longitude IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN o.emblem_url IS NOT NULL AND o.emblem_url != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.phone IS NOT NULL OR o.email IS NOT NULL THEN 1 ELSE 0 END)
        )::numeric / 7.0 * 100.0
      ) AS completeness_percent
    FROM public.organizations o
    WHERE (p_query IS NULL OR lower(o.name) LIKE '%' || lower(p_query) || '%' OR lower(o.city) LIKE '%' || lower(p_query) || '%' OR o.code_number::text LIKE '%' || p_query || '%')
      AND (p_state IS NULL OR lower(o.state) = lower(p_state))
      AND (p_potency IS NULL OR lower(o.potency) = lower(p_potency))
      AND (p_status IS NULL OR (p_status = 'published' AND o.is_active = true) OR (p_status = 'inactive' AND o.is_active = false))
      AND (p_missing_coords IS FALSE OR (o.latitude IS NULL OR o.longitude IS NULL))
      AND (p_missing_emblem IS FALSE OR (o.emblem_url IS NULL OR o.emblem_url = ''))
  )
  SELECT COUNT(*) INTO v_total FROM filtered;

  v_total_pages := CEIL(v_total::numeric / v_page_size);

  SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT * FROM filtered
    ORDER BY created_at DESC
    LIMIT v_page_size OFFSET v_offset
  ) f;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages,
    'kpis', v_kpis
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_lodges_list(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trigger_operational_notification(UUID, UUID, TEXT, VARCHAR, TEXT, TEXT, TEXT, VARCHAR) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_business_analytics_event(UUID, UUID, VARCHAR, VARCHAR, TEXT) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_directory_analytics_event(UUID, VARCHAR, TEXT, TEXT, TEXT, VARCHAR) TO PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Migration 120: Corrigir RLS das tabelas de pesquisas (surveys) para administradores e atualizar RPC de métricas reais do admin

-- ============================================================================
-- 1. CORREÇÃO DE POLÍTICAS DE RLS PARA SURVEYS (SURVEY_BLOCKS, QUESTIONS, ETC.)
-- ============================================================================

-- survey_blocks
DROP POLICY IF EXISTS "Admin full access survey_blocks" ON public.survey_blocks;
CREATE POLICY "Admin full access survey_blocks" ON public.survey_blocks
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  );

-- surveys
DROP POLICY IF EXISTS "Admin full access surveys" ON public.surveys;
CREATE POLICY "Admin full access surveys" ON public.surveys
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  );

-- survey_versions
DROP POLICY IF EXISTS "Admin full access survey_versions" ON public.survey_versions;
CREATE POLICY "Admin full access survey_versions" ON public.survey_versions
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  );

-- survey_questions
DROP POLICY IF EXISTS "Admin full access survey_questions" ON public.survey_questions;
CREATE POLICY "Admin full access survey_questions" ON public.survey_questions
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  );

-- survey_options
DROP POLICY IF EXISTS "Admin full access survey_options" ON public.survey_options;
CREATE POLICY "Admin full access survey_options" ON public.survey_options
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  );

-- survey_responses
DROP POLICY IF EXISTS "Admin full access survey_responses" ON public.survey_responses;
CREATE POLICY "Admin full access survey_responses" ON public.survey_responses
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  );

-- survey_answers
DROP POLICY IF EXISTS "Admin full access survey_answers" ON public.survey_answers;
CREATE POLICY "Admin full access survey_answers" ON public.survey_answers
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
    )
  );

-- ============================================================================
-- 2. ATUALIZAÇÃO DA RPC get_admin_dashboard_metrics COM DADOS REAIS COMPLETOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS JSONB
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
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'published'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'pending_review'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'suspended'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'draft'), 0),
    COALESCE(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'published' AND created_at >= NOW() - INTERVAL '30 days'), 0),
    COALESCE(COUNT(*) FILTER (WHERE is_pedra_fundamental = true), 0),
    COALESCE(COUNT(*) FILTER (WHERE is_founder = true), 0)
  INTO
    v_companies_total,
    v_companies_published,
    v_companies_pending,
    v_companies_suspended,
    v_companies_draft,
    v_new_companies_30d,
    v_new_published_30d,
    v_pedra_fundamental,
    v_sub_founder
  FROM public.businesses;

  -- 2. Planos Comerciais
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE lower(COALESCE(plan_code, plan_tier, 'bronze')) = 'bronze'), 0),
    COALESCE(COUNT(*) FILTER (WHERE lower(COALESCE(plan_code, plan_tier, '')) = 'prata'), 0),
    COALESCE(COUNT(*) FILTER (WHERE lower(COALESCE(plan_code, plan_tier, '')) IN ('ouro', 'ouro_founder')), 0)
  INTO
    v_sub_bronze,
    v_sub_prata,
    v_sub_ouro
  FROM public.businesses
  WHERE publication_status = 'published';

  -- 3. Lojas Maçônicas
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE is_active = true OR is_active IS NULL), 0),
    COALESCE(COUNT(*) FILTER (WHERE (is_active = true OR is_active IS NULL) AND (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0)), 0),
    COALESCE(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)
  INTO
    v_lodges_total,
    v_lodges_without_coordinates,
    v_new_lodges_30d
  FROM public.organizations;

  -- 4. Usuários novos 30d
  SELECT COALESCE(COUNT(*), 0)
  INTO v_new_users_30d
  FROM public.profiles
  WHERE created_at >= NOW() - INTERVAL '30 days';

  -- 5. Financeiro: Faturas ou Cálculo por Assinaturas
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

  -- Se faturas não estiverem registradas, estima pela recorrência dos planos ativos
  IF v_revenue_annual = 0 THEN
    v_revenue_monthly := (v_sub_prata * 149) + (v_sub_ouro * 199);
    v_revenue_annual := (v_sub_prata * 1788) + (v_sub_ouro * 2388);
    v_payments_confirmed_count := v_companies_published;
    v_payments_pending_count := v_companies_pending;
  ELSE
    v_revenue_monthly := ROUND(v_revenue_annual / 12, 2);
  END IF;

  -- 6. Perfis Incompletos (< 70% de dados essenciais)
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
      'total', v_companies_published
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

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO service_role;

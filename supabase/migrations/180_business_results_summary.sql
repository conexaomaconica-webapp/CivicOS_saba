-- 180 - Resultado da empresa por período (dashboard do anunciante: resultado -> oportunidade -> interesse -> visibilidade).
--
-- Leitura agregada, sem dados pessoais. Depende de 168/172 (business_connections) e 178 (origin, value_range, eventos do funil).
-- "Negócios declarados" = conexões comerciais informadas por membros; faixa de valor é declaratória e NÃO é faturamento auditado.

CREATE OR REPLACE FUNCTION public.business_results_summary(p_business_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  SELECT b.tenant_id INTO v_tenant_id FROM public.businesses b WHERE b.id = p_business_id;
  IF v_tenant_id IS NULL OR NOT public.has_business_permission(
       v_tenant_id, p_business_id,
       ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para ver os resultados desta empresa.';
  END IF;

  v_since := now() - make_interval(days => v_days);

  SELECT jsonb_build_object(
    'days', v_days,
    'connections', (
      SELECT jsonb_build_object(
        'registered', count(*),
        'commercial', count(*) FILTER (WHERE connection_type <> 'visita'),
        'visits', count(*) FILTER (WHERE connection_type = 'visita'),
        'confirmed', count(*) FILTER (WHERE status = 'confirmada'),
        'confirmed_commercial', count(*) FILTER (WHERE status = 'confirmada' AND connection_type <> 'visita'),
        'pending', count(*) FILTER (WHERE status = 'pendente'),
        'declined', count(*) FILTER (WHERE status = 'recusada'),
        'with_value', count(*) FILTER (WHERE connection_type <> 'visita' AND value_range IS NOT NULL AND value_range <> 'nao_informar'),
        'by_value_range', COALESCE((
          SELECT jsonb_object_agg(vr, n) FROM (
            SELECT value_range AS vr, count(*) AS n
            FROM public.business_connections
            WHERE business_id = p_business_id AND created_at >= v_since
              AND connection_type <> 'visita' AND status <> 'removida' AND value_range IS NOT NULL
            GROUP BY value_range
          ) v
        ), '{}'::jsonb),
        'by_origin', COALESCE((
          SELECT jsonb_object_agg(o, n) FROM (
            SELECT origin AS o, count(*) AS n
            FROM public.business_connections
            WHERE business_id = p_business_id AND created_at >= v_since
              AND status <> 'removida' AND origin IS NOT NULL
            GROUP BY origin
          ) x
        ), '{}'::jsonb)
      )
      FROM public.business_connections
      WHERE business_id = p_business_id AND created_at >= v_since AND status <> 'removida'
    ),
    'events', COALESCE((
      SELECT jsonb_object_agg(event_name, n) FROM (
        SELECT event_name, count(*) AS n
        FROM public.analytics_events
        WHERE business_id = p_business_id AND created_at >= v_since
          AND event_name IN ('search_impression', 'share', 'referral', 'referral_contact', 'benefit_claim', 'benefit_redeemed')
        GROUP BY event_name
      ) e
    ), '{}'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.business_results_summary(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_results_summary(UUID, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';

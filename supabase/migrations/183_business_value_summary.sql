-- 183 - Resumo de valor do mês e contadores para marcos automáticos (dashboard do anunciante).
--
-- Leitura agregada, sem dados pessoais. Calcula tudo sob demanda (nada é gravado), então é idempotente:
-- os marcos (10ª indicação, 25ª conexão...) são derivados dos contadores acumulados no app.
-- Mês corrente = do dia 1º até agora (America/Sao_Paulo); mês anterior = mês cheio anterior.
-- Depende de 168/172/178 (business_connections, analytics_events) e 174 (business_referrals).

CREATE OR REPLACE FUNCTION public.business_value_summary(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_created TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_prev_start TIMESTAMPTZ := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') - interval '1 month') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  SELECT b.tenant_id, b.created_at INTO v_tenant_id, v_created FROM public.businesses b WHERE b.id = p_business_id;
  IF v_tenant_id IS NULL OR NOT public.has_business_permission(
       v_tenant_id, p_business_id,
       ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para ver o resumo desta empresa.';
  END IF;

  RETURN jsonb_build_object(
    'month_label', to_char(v_month_start AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM'),
    'member_since', v_created,
    'months_on_platform', GREATEST(0, (extract(year FROM age(now(), v_created)) * 12 + extract(month FROM age(now(), v_created)))::int),
    'active_benefits', (
      SELECT count(*) FROM public.business_benefits bb
      WHERE bb.business_id = p_business_id AND bb.is_active = true
        AND (bb.valid_until IS NULL OR bb.valid_until > now())
    ),
    'current', public._business_period_counters(p_business_id, v_month_start, now()),
    'previous', public._business_period_counters(p_business_id, v_prev_start, v_month_start),
    'lifetime', public._business_period_counters(p_business_id, '-infinity'::timestamptz, now())
  );
END;
$$;

-- Contadores de um período [p_from, p_to). Uso interno (chamada só a partir de business_value_summary).
CREATE OR REPLACE FUNCTION public._business_period_counters(p_business_id UUID, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'connections', (SELECT count(*) FROM public.business_connections c
                    WHERE c.business_id = p_business_id AND c.status <> 'removida'
                      AND c.created_at >= p_from AND c.created_at < p_to),
    'commercial', (SELECT count(*) FROM public.business_connections c
                   WHERE c.business_id = p_business_id AND c.status <> 'removida' AND c.connection_type <> 'visita'
                     AND c.created_at >= p_from AND c.created_at < p_to),
    'confirmed', (SELECT count(*) FROM public.business_connections c
                  WHERE c.business_id = p_business_id AND c.status = 'confirmada'
                    AND c.created_at >= p_from AND c.created_at < p_to),
    'referrals', (SELECT count(*) FROM public.business_referrals r
                  WHERE r.business_id = p_business_id
                    AND r.first_seen_at >= p_from AND r.first_seen_at < p_to),
    'views', (SELECT count(*) FROM public.analytics_events e
              WHERE e.business_id = p_business_id AND e.event_name = 'view'
                AND e.created_at >= p_from AND e.created_at < p_to),
    'shares', (SELECT count(*) FROM public.analytics_events e
               WHERE e.business_id = p_business_id AND e.event_name = 'share'
                 AND e.created_at >= p_from AND e.created_at < p_to)
  );
$$;

REVOKE ALL ON FUNCTION public._business_period_counters(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.business_value_summary(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_value_summary(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

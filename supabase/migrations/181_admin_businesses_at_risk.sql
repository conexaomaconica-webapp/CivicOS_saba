-- 181 - Dashboard Master: empresas com risco de baixa percepção de valor (retenção proativa).
--
-- Leitura agregada para administradores do tenant. Sem dados pessoais. Heurística simples e explicável:
-- cada sinal soma pontos e é devolvido em `reasons`, para a equipe saber o que dizer à empresa.
-- Depende de 042 (business_benefits), 168/172 (business_connections) e analytics_events.
-- Pontos: perfil parado >60d (+1) ou >120d (+2); sem benefício ativo (+1); 0 conexões em 90d (+2);
-- <10 views em 30d (+1); 0 contatos em 30d (+1); conexão pendente >7d sem resposta da empresa (+1).
-- Nível: >=5 alto, 3-4 médio. Empresas abaixo de 3 pontos não são listadas.

CREATE OR REPLACE FUNCTION public.admin_businesses_at_risk(p_limit INTEGER DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(r) ORDER BY r.score DESC, r.days_since_update DESC)
    FROM (
      SELECT
        t.business_id, t.name, t.slug, t.days_since_update, t.active_benefits, t.views_30d,
        t.interactions_30d, t.connections_90d, t.pending_over_7d, t.score,
        CASE WHEN t.score >= 5 THEN 'alto' ELSE 'medio' END AS risk_level,
        array_remove(ARRAY[
          CASE WHEN t.days_since_update > 60 THEN 'Perfil sem atualização há ' || t.days_since_update || ' dias' END,
          CASE WHEN t.active_benefits = 0 THEN 'Nenhum benefício ou oferta ativo' END,
          CASE WHEN t.connections_90d = 0 THEN 'Nenhuma conexão registrada nos últimos 90 dias' END,
          CASE WHEN t.views_30d < 10 THEN 'Poucos acessos recentes (' || t.views_30d || ' em 30 dias)' END,
          CASE WHEN t.interactions_30d = 0 THEN 'Nenhum contato (WhatsApp, rota, site) em 30 dias' END,
          CASE WHEN t.pending_over_7d > 0 THEN t.pending_over_7d || ' conexão(ões) aguardando confirmação há mais de 7 dias' END
        ], NULL) AS reasons
      FROM (
        SELECT
          s.*,
          (
            (CASE WHEN s.days_since_update > 120 THEN 2 WHEN s.days_since_update > 60 THEN 1 ELSE 0 END)
            + (CASE WHEN s.active_benefits = 0 THEN 1 ELSE 0 END)
            + (CASE WHEN s.connections_90d = 0 THEN 2 ELSE 0 END)
            + (CASE WHEN s.views_30d < 10 THEN 1 ELSE 0 END)
            + (CASE WHEN s.interactions_30d = 0 THEN 1 ELSE 0 END)
            + (CASE WHEN s.pending_over_7d > 0 THEN 1 ELSE 0 END)
          )::int AS score
        FROM (
          SELECT
            b.id AS business_id,
            b.name,
            b.slug,
            (now()::date - b.updated_at::date) AS days_since_update,
            (SELECT count(*) FROM public.business_benefits bb
              WHERE bb.business_id = b.id AND bb.is_active = true
                AND (bb.valid_until IS NULL OR bb.valid_until > now()))::int AS active_benefits,
            (SELECT count(*) FROM public.analytics_events e
              WHERE e.business_id = b.id AND e.event_name = 'view'
                AND e.created_at > now() - interval '30 days')::int AS views_30d,
            (SELECT count(*) FROM public.analytics_events e
              WHERE e.business_id = b.id
                AND e.event_name IN ('whatsapp_click', 'phone_click', 'website_click', 'directions_click', 'social_click', 'instagram_click')
                AND e.created_at > now() - interval '30 days')::int AS interactions_30d,
            (SELECT count(*) FROM public.business_connections c
              WHERE c.business_id = b.id AND c.status <> 'removida'
                AND c.created_at > now() - interval '90 days')::int AS connections_90d,
            (SELECT count(*) FROM public.business_connections c
              WHERE c.business_id = b.id AND c.status = 'pendente'
                AND c.created_at < now() - interval '7 days')::int AS pending_over_7d
          FROM public.businesses b
          WHERE b.is_active = true
            AND b.publication_status = 'published'
            AND public.has_tenant_admin_access(b.tenant_id)
        ) s
      ) t
      WHERE t.score >= 3
      ORDER BY t.score DESC, t.days_since_update DESC
      LIMIT v_limit
    ) r
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_businesses_at_risk(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_businesses_at_risk(INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';

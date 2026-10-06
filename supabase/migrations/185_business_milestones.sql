-- 185 - Marcos automáticos do anunciante, com aviso no portal (in-app).
--
-- Cada marco (ex.: views-500, referrals-10, connections-25, months-6) é gravado UMA vez por empresa
-- (UNIQUE business_id + milestone_key) e gera um aviso em operational_notifications para o dono da empresa.
-- Os limiares espelham apps/web/src/lib/advertiser/value-summary.ts (mantenha os dois alinhados).
-- Disparo: triggers em conexões e indicações; visualizações e meses de casa são avaliados em
-- sync_business_milestones(), chamada quando o anunciante abre o painel de resultados.
-- Na primeira avaliação de uma empresa antiga, todos os marcos passados são gravados, mas só o MAIOR de
-- cada categoria gera aviso (evita enxurrada de notificações). Só canal in-app; sem e-mail nesta etapa.
-- Não altera trigger_operational_notification: insere direto, pois a deduplicação de 10 minutos dela
-- suprimiria marcos distintos. Depende de 066/068/164 (operational_notifications), 168/172, 174, 178.

-- ---------------------------------------------------------------------------
-- 1. Tabela de marcos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL CHECK (char_length(milestone_key) BETWEEN 3 AND 40),
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS idx_business_milestones_business ON public.business_milestones (business_id, achieved_at DESC);

ALTER TABLE public.business_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own milestones" ON public.business_milestones;
CREATE POLICY "Business members can view own milestones"
  ON public.business_milestones FOR SELECT
  USING (public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']));

DROP POLICY IF EXISTS "Tenant admin can view milestones" ON public.business_milestones;
CREATE POLICY "Tenant admin can view milestones"
  ON public.business_milestones FOR SELECT
  USING (public.has_tenant_admin_access(tenant_id));

-- Escrita só pelas funções SECURITY DEFINER abaixo.
REVOKE ALL ON public.business_milestones FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.business_milestones TO authenticated;
GRANT ALL ON public.business_milestones TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Tipo de aviso 'business_milestone' (lista completa atual das migrações 066/068/164 + o novo)
-- ---------------------------------------------------------------------------
ALTER TABLE public.operational_notifications
  DROP CONSTRAINT IF EXISTS operational_notifications_event_type_check;

ALTER TABLE public.operational_notifications
  ADD CONSTRAINT operational_notifications_event_type_check
  CHECK (event_type IN (
    'registration_completed',
    'contract_signed',
    'payment_confirmed',
    'payment_pending',
    'payment_overdue',
    'company_approved',
    'company_rejected',
    'company_suspended',
    'correction_requested',
    'masonic_link_verified',
    'subscription_expiring',
    'quota_reached',
    'survey_response_received',
    'business_milestone'
  ));

-- ---------------------------------------------------------------------------
-- 3. Avaliação dos marcos (uso interno) + RPC para o painel
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._evaluate_business_milestones(p_business_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_biz RECORD;
  v_email TEXT;
  v_counts JSONB;
  v_cat RECORD;
  v_t INTEGER;
  v_inserted INTEGER;
  v_new_total INTEGER := 0;
  v_best INTEGER;
  v_title TEXT;
BEGIN
  SELECT b.id, b.tenant_id, b.owner_id, b.created_at INTO v_biz
  FROM public.businesses b
  WHERE b.id = p_business_id AND b.is_active = true AND b.publication_status = 'published';
  IF v_biz.id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT p.email INTO v_email FROM public.profiles p WHERE p.id = v_biz.owner_id;

  v_counts := jsonb_build_object(
    'views', (SELECT count(*) FROM public.analytics_events e WHERE e.business_id = p_business_id AND e.event_name = 'view'),
    'referrals', (SELECT count(*) FROM public.business_referrals r WHERE r.business_id = p_business_id),
    'connections', (SELECT count(*) FROM public.business_connections c WHERE c.business_id = p_business_id AND c.status <> 'removida'),
    'months', GREATEST(0, (extract(year FROM age(now(), v_biz.created_at)) * 12 + extract(month FROM age(now(), v_biz.created_at)))::int)
  );

  FOR v_cat IN
    SELECT * FROM (VALUES
      ('views', ARRAY[100, 500, 1000, 5000]),
      ('referrals', ARRAY[1, 10, 25, 50]),
      ('connections', ARRAY[1, 10, 25, 50, 100]),
      ('months', ARRAY[3, 6, 12, 24])
    ) AS t(cat, thresholds)
  LOOP
    v_best := NULL;
    FOREACH v_t IN ARRAY v_cat.thresholds LOOP
      IF (v_counts ->> v_cat.cat)::int >= v_t THEN
        INSERT INTO public.business_milestones (tenant_id, business_id, milestone_key)
        VALUES (v_biz.tenant_id, p_business_id, v_cat.cat || '-' || v_t)
        ON CONFLICT (business_id, milestone_key) DO NOTHING;
        GET DIAGNOSTICS v_inserted = ROW_COUNT;
        IF v_inserted > 0 THEN
          v_best := v_t;
          v_new_total := v_new_total + 1;
        END IF;
      END IF;
    END LOOP;

    -- Aviso só do maior marco novo da categoria.
    IF v_best IS NOT NULL AND v_email IS NOT NULL THEN
      v_title := CASE v_cat.cat
        WHEN 'views' THEN 'Sua empresa atingiu ' || replace(to_char(v_best, 'FM999,999'), ',', '.') || ' visualizações.'
        WHEN 'referrals' THEN 'Você recebeu sua ' || v_best || 'ª indicação.'
        WHEN 'connections' THEN 'Sua empresa registrou a ' || v_best || 'ª conexão.'
        ELSE 'Parabéns: sua empresa completou ' || v_best || ' meses na Conexão.'
      END;
      BEGIN
        INSERT INTO public.operational_notifications
          (tenant_id, recipient_id, recipient_email, event_type, title, body, action_url, channel, status, sent_at)
        VALUES
          (v_biz.tenant_id, v_biz.owner_id, v_email, 'business_milestone', v_title,
           'Acompanhe seus resultados e veja como a Conexão está movimentando o seu negócio.',
           '/anunciante/resultados', 'in_app', 'sent', now());
      EXCEPTION WHEN OTHERS THEN
        NULL; -- aviso nunca bloqueia a operação de negócio
      END;
    END IF;
  END LOOP;

  RETURN v_new_total;
END;
$$;

REVOKE ALL ON FUNCTION public._evaluate_business_milestones(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_business_milestones(p_business_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
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
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para esta empresa.';
  END IF;

  RETURN public._evaluate_business_milestones(p_business_id);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_business_milestones(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_business_milestones(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Triggers: novas conexões e indicações reavaliam os marcos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_check_business_milestones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM public._evaluate_business_milestones(NEW.business_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_check_business_milestones() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_business_connections_milestones ON public.business_connections;
CREATE TRIGGER trg_business_connections_milestones
  AFTER INSERT ON public.business_connections
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_business_milestones();

DO $do$
BEGIN
  IF to_regclass('public.business_referrals') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_business_referrals_milestones ON public.business_referrals;
    CREATE TRIGGER trg_business_referrals_milestones
      AFTER INSERT ON public.business_referrals
      FOR EACH ROW EXECUTE FUNCTION public.trg_check_business_milestones();
  END IF;
END
$do$;

NOTIFY pgrst, 'reload schema';

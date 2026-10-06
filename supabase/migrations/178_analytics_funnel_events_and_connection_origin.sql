-- 178 - Funil Conexão: eventos analíticos de conexões/indicações + origem e faixa de valor da conexão.
--
-- Aditiva e idempotente. Não remove nem altera funções/tabelas existentes.
--  1. analytics_events ganha contexto estruturado (source, ref_type, ref_id, device).
--  2. business_connections ganha origem ("como aconteceu") e faixa de valor opcional.
--  3. Triggers gravam em analytics_events (fonte canônica) cada fato do funil, sem depender
--     de alterar as RPCs de registro. Falha de telemetria NUNCA bloqueia a operação de negócio.
-- Privacidade: nenhum IP, nenhum user_id em claro nos eventos; apenas ref_id do registro.

-- ---------------------------------------------------------------------------
-- 1. analytics_events: contexto estruturado
-- ---------------------------------------------------------------------------
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS ref_type TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS ref_id UUID;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS device TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_events_ref
  ON public.analytics_events (ref_type, ref_id) WHERE ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_business_event
  ON public.analytics_events (business_id, event_name, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. business_connections: origem e faixa de valor (ambos opcionais)
-- ---------------------------------------------------------------------------
ALTER TABLE public.business_connections ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE public.business_connections ADD COLUMN IF NOT EXISTS value_range TEXT;

ALTER TABLE public.business_connections DROP CONSTRAINT IF EXISTS business_connections_origin_check;
ALTER TABLE public.business_connections
  ADD CONSTRAINT business_connections_origin_check
  CHECK (origin IS NULL OR origin IN (
    'busca', 'oferta', 'indicacao', 'evento', 'compartilhamento', 'qr_empresa', 'ja_conhecia', 'outro'
  ));

ALTER TABLE public.business_connections DROP CONSTRAINT IF EXISTS business_connections_value_range_check;
ALTER TABLE public.business_connections
  ADD CONSTRAINT business_connections_value_range_check
  CHECK (value_range IS NULL OR value_range IN (
    'ate_250', '251_500', '501_1000', '1001_5000', 'acima_5000', 'nao_informar'
  ));

-- ---------------------------------------------------------------------------
-- 3. Triggers do funil -> analytics_events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_connection_to_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event TEXT;
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      v_event := CASE NEW.connection_type
        WHEN 'compra' THEN 'connection_purchase'
        WHEN 'servico' THEN 'connection_service'
        WHEN 'parceria' THEN 'connection_partnership'
        WHEN 'visita' THEN 'connection_visit'
        ELSE NULL
      END;
    ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      v_event := CASE NEW.status
        WHEN 'confirmada' THEN 'connection_confirmed'
        WHEN 'recusada' THEN 'connection_declined'
        ELSE NULL
      END;
    END IF;

    IF v_event IS NOT NULL THEN
      INSERT INTO public.analytics_events
        (tenant_id, business_id, event_name, source, ref_type, ref_id, metadata)
      VALUES
        (NEW.tenant_id, NEW.business_id, v_event, NEW.origin, 'business_connection', NEW.id,
         jsonb_build_object('connection_type', NEW.connection_type, 'value_range', NEW.value_range));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- telemetria nunca bloqueia o registro
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_connections_analytics ON public.business_connections;
CREATE TRIGGER trg_business_connections_analytics
  AFTER INSERT OR UPDATE OF status ON public.business_connections
  FOR EACH ROW EXECUTE FUNCTION public.trg_connection_to_analytics();

CREATE OR REPLACE FUNCTION public.trg_referral_to_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event TEXT;
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      v_event := 'referral';
    ELSIF NEW.contacted_at IS NOT NULL AND OLD.contacted_at IS NULL THEN
      v_event := 'referral_contact';
    ELSIF NEW.benefit_at IS NOT NULL AND OLD.benefit_at IS NULL THEN
      v_event := 'referral_benefit';
    ELSIF NEW.connection_at IS NOT NULL AND OLD.connection_at IS NULL THEN
      v_event := 'referral_connection';
    END IF;

    IF v_event IS NOT NULL THEN
      INSERT INTO public.analytics_events
        (tenant_id, business_id, event_name, source, ref_type, ref_id, metadata)
      VALUES
        (NEW.tenant_id, NEW.business_id, v_event, 'indicacao', 'business_referral', NEW.id,
         jsonb_build_object('channel', NEW.contact_channel));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- Só liga o trigger se a 174 (indicações) já foi aplicada; caso contrário, reaplique esta migration depois dela.
DO $do$
BEGIN
  IF to_regclass('public.business_referrals') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_business_referrals_analytics ON public.business_referrals;
    CREATE TRIGGER trg_business_referrals_analytics
      AFTER INSERT OR UPDATE OF contacted_at, benefit_at, connection_at ON public.business_referrals
      FOR EACH ROW EXECUTE FUNCTION public.trg_referral_to_analytics();
  ELSE
    RAISE NOTICE 'business_referrals não existe: trigger de indicações NÃO criado (aplique a 174 e reexecute a 178).';
  END IF;
END
$do$;

REVOKE ALL ON FUNCTION public.trg_connection_to_analytics() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_referral_to_analytics() FROM PUBLIC, anon, authenticated;

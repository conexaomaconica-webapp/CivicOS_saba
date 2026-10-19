-- 205 - Compatibilidade dos identificadores de plano na quota de serviços
-- Homologa a transição bronze/prata/ouro -> esquadro/compasso/acacia.
-- Não altera dados comerciais nem quotas de outros recursos.

CREATE OR REPLACE FUNCTION public._trg_enforce_business_service_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_effective_plan TEXT;
  v_max_services INT;
  v_active_count INT;
BEGIN
  PERFORM 1
  FROM public.businesses
  WHERE tenant_id = NEW.tenant_id AND id = NEW.business_id
  FOR UPDATE;

  SELECT plan_code INTO v_effective_plan
  FROM public._effective_business_plan(NEW.tenant_id, NEW.business_id);

  v_max_services := CASE
    WHEN v_effective_plan IN ('acacia', 'ouro') THEN 25
    WHEN v_effective_plan IN ('compasso', 'prata') THEN 10
    WHEN v_effective_plan IN ('esquadro', 'bronze') THEN 3
    ELSE 0
  END;

  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO v_active_count
    FROM public.business_services
    WHERE tenant_id = NEW.tenant_id
      AND business_id = NEW.business_id
      AND is_active = true
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    IF (v_active_count + 1) > v_max_services THEN
      RAISE EXCEPTION 'Quota de serviços ativos excedida para o plano % (Máximo: %)',
        COALESCE(v_effective_plan, 'none'), v_max_services;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public._trg_enforce_business_service_quota() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public._trg_enforce_business_benefit_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_effective_plan TEXT;
  v_max_benefits INT;
  v_new_from TIMESTAMPTZ;
  v_new_until TIMESTAMPTZ;
  v_test_instant TIMESTAMPTZ;
  v_instant_count INT;
BEGIN
  PERFORM 1 FROM public.businesses
  WHERE tenant_id = NEW.tenant_id AND id = NEW.business_id FOR UPDATE;

  SELECT plan_code INTO v_effective_plan
  FROM public._effective_business_plan(NEW.tenant_id, NEW.business_id);

  v_max_benefits := CASE
    WHEN v_effective_plan IN ('acacia', 'ouro') THEN 3
    WHEN v_effective_plan IN ('compasso', 'prata') THEN 1
    WHEN v_effective_plan IN ('esquadro', 'bronze') THEN 0
    ELSE 0
  END;

  IF NEW.is_active = true THEN
    v_new_from := COALESCE(NEW.valid_from, NEW.created_at, now());
    v_new_until := COALESCE(NEW.valid_until, '9999-12-31 23:59:59+00'::timestamptz);

    FOR v_test_instant IN
      SELECT DISTINCT t FROM (
        SELECT v_new_from AS t
        UNION
        SELECT COALESCE(b.valid_from, b.created_at, now())
        FROM public.business_benefits b
        WHERE b.tenant_id = NEW.tenant_id AND b.business_id = NEW.business_id
          AND b.is_active = true
          AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) points
      WHERE points.t >= v_new_from AND points.t < v_new_until
    LOOP
      SELECT COUNT(*) INTO v_instant_count FROM (
        SELECT NEW.id AS benefit_id
        WHERE v_test_instant >= v_new_from AND v_test_instant < v_new_until
        UNION ALL
        SELECT b.id FROM public.business_benefits b
        WHERE b.tenant_id = NEW.tenant_id AND b.business_id = NEW.business_id
          AND b.is_active = true
          AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND v_test_instant >= COALESCE(b.valid_from, b.created_at, now())
          AND v_test_instant < COALESCE(b.valid_until, '9999-12-31 23:59:59+00'::timestamptz)
      ) active_at_instant;

      IF v_instant_count > v_max_benefits THEN
        RAISE EXCEPTION 'Quota de benefícios simultaneamente ativos excedida para o plano % (Máximo: % no instante %)',
          COALESCE(v_effective_plan, 'none'), v_max_benefits, v_test_instant;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public._trg_enforce_business_benefit_quota() OWNER TO postgres;

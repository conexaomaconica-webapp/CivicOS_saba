-- Migration 043: Functions transacionais de reordenação e gestão de benefícios e serviços
-- Garante a troca atômica de display_order entre itens da mesma empresa sem race conditions ou duplicidade de ordenação.

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

GRANT EXECUTE ON FUNCTION public.reorder_business_services(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reorder_business_benefits(UUID, UUID, TEXT) TO authenticated, service_role;

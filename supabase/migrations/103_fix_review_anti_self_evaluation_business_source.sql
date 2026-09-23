-- Corrige a origem canônica usada pela proteção contra autoavaliação.
-- A migration 046 consultava `business_profiles`, enquanto o diretório e a FK
-- de `business_reviews.business_id` usam `public.businesses`.

CREATE OR REPLACE FUNCTION public.check_review_anti_self_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_is_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = NEW.business_id
      AND b.tenant_id = NEW.tenant_id
      AND b.owner_id = NEW.author_id
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RAISE EXCEPTION 'Anunciantes e proprietários não podem avaliar a própria empresa.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = NEW.business_id
      AND bm.user_id = NEW.author_id
  ) INTO v_is_member;

  IF v_is_member THEN
    RAISE EXCEPTION 'Membros do estabelecimento não podem avaliar a própria empresa.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

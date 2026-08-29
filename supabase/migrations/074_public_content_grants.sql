-- ============================================================================
-- Migration 074: Public Content Table Grants & RLS Policies for Anon / Authenticated
-- ============================================================================
-- Permite leitura pública de business_services, business_benefits, business_events
-- e business_posts quando is_active = true para os papéis anon e authenticated.
-- ============================================================================

GRANT SELECT ON public.business_services TO anon, authenticated;
GRANT SELECT ON public.business_benefits TO anon, authenticated;
GRANT SELECT ON public.business_events TO anon, authenticated;
GRANT SELECT ON public.business_posts TO anon, authenticated;

-- RLS Policies para leitura de conteúdos ativos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'business_services' AND policyname = 'Allow public read on active business services'
  ) THEN
    CREATE POLICY "Allow public read on active business services"
      ON public.business_services FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'business_benefits' AND policyname = 'Allow public read on active business benefits'
  ) THEN
    CREATE POLICY "Allow public read on active business benefits"
      ON public.business_benefits FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'business_events' AND policyname = 'Allow public read on active business events'
  ) THEN
    CREATE POLICY "Allow public read on active business events"
      ON public.business_events FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'business_posts' AND policyname = 'Allow public read on active business posts'
  ) THEN
    CREATE POLICY "Allow public read on active business posts"
      ON public.business_posts FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

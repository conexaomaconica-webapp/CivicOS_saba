-- Remove as policies legadas que ainda permitiam SELECT anonimo direto nas
-- tabelas-fonte. A superficie publica canonica permanece exclusivamente nas
-- RPCs SECURITY DEFINER definidas em 041_public_read_contracts.sql.

DROP POLICY IF EXISTS "Public can read active businesses" ON public.businesses;
DROP POLICY IF EXISTS "Public can read active banners" ON public.business_banners;
DROP POLICY IF EXISTS "Public can read reviews" ON public.business_reviews;

-- Nomes anteriores, mantidos aqui para tornar a correcao idempotente em
-- ambientes que percorreram historicos diferentes de migrations.
DROP POLICY IF EXISTS "Anyone can view businesses within active tenant" ON public.businesses;
DROP POLICY IF EXISTS "Anyone can view active banners in active tenant" ON public.business_banners;
DROP POLICY IF EXISTS "Anyone can view reviews in active tenant" ON public.business_reviews;

REVOKE SELECT ON TABLE
  public.businesses,
  public.business_banners,
  public.business_reviews
FROM anon;


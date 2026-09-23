BEGIN;

SELECT plan(6);

SELECT is(
  (SELECT count(*)::BIGINT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'businesses' AND policyname IN ('Public can read active businesses', 'Anyone can view businesses within active tenant')),
  0::BIGINT,
  'anon nao possui policy legada de businesses'
);

SELECT is(
  (SELECT count(*)::BIGINT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_banners' AND policyname IN ('Public can read active banners', 'Anyone can view active banners in active tenant')),
  0::BIGINT,
  'anon nao possui policy legada de business_banners'
);

SELECT is(
  (SELECT count(*)::BIGINT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_reviews' AND policyname IN ('Public can read reviews', 'Anyone can view reviews in active tenant')),
  0::BIGINT,
  'anon nao possui policy legada de business_reviews'
);

SELECT ok(NOT has_table_privilege('anon', 'public.businesses', 'SELECT'), 'anon sem SELECT em businesses');
SELECT ok(NOT has_table_privilege('anon', 'public.business_banners', 'SELECT'), 'anon sem SELECT em business_banners');
SELECT ok(NOT has_table_privilege('anon', 'public.business_reviews', 'SELECT'), 'anon sem SELECT em business_reviews');

SELECT * FROM finish();
ROLLBACK;

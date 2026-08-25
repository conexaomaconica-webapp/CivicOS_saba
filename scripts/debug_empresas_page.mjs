import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Supabase URL or Key not set in environment variables.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log('--- Testing public_directory_home_data ---');
  const { data: homeData, error: homeErr } = await supabase.rpc('public_directory_home_data', {
    p_host: 'localhost:3000',
    p_city: null,
  });
  console.log('homeErr:', homeErr);
  console.log('homeData available_cities:', homeData?.available_cities);

  console.log('--- Testing public_businesses_search (056 signature) ---');
  const { data: res056, error: err056 } = await supabase.rpc('public_businesses_search', {
    p_host: 'localhost:3000',
    p_query: null,
    p_state: null,
    p_city: null,
    p_category_slug: null,
    p_subcategory_slug: null,
    p_relationships: null,
    p_recognitions: null,
    p_plans: null,
    p_verified: null,
    p_has_benefits: null,
    p_user_lat: null,
    p_user_lng: null,
    p_max_distance_km: null,
    p_sort: 'relevance',
    p_page: 1,
    p_page_size: 12,
  });
  console.log('err056:', err056);
  console.log('res056 total:', res056?.total);

  console.log('--- Testing public_businesses_search (055 signature) ---');
  const { data: res055, error: err055 } = await supabase.rpc('public_businesses_search', {
    p_host: 'localhost:3000',
    p_query: null,
    p_city: null,
    p_category_slug: null,
    p_verified: null,
    p_has_benefits: null,
    p_sort: 'relevance',
    p_page: 1,
    p_page_size: 12,
  });
  console.log('err055:', err055);
  console.log('res055 total:', res055?.total);
}

debug().catch(console.error);

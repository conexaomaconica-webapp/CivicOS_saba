import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function canonicalHost() {
  const configured = process.env.MOBILE_CANONICAL_HOST?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return 'localhost:3000';
  return null;
}

export async function GET(request: Request) {
  const host = canonicalHost();
  if (!host) {
    return NextResponse.json(
      { error: 'MOBILE_CANONICAL_HOST não configurado' },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
    );
  }

  const params = new URL(request.url).searchParams;
  const city = params.get('city')?.trim() || null;
  const query = params.get('q')?.trim() || null;
  const category = params.get('category')?.trim() || null;
  const page = Math.max(1, Number(params.get('page') || 1) || 1);
  const pageSize = Math.min(24, Math.max(1, Number(params.get('page_size') || 12) || 12));
  if (city && city.length > 120) return NextResponse.json({ error: 'Cidade inválida' }, { status: 400 });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase público não configurado' }, { status: 503 });
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const db = supabase as any;
    const [{ data: settings, error: settingsError }, { data: homeData, error: homeError }, { data: activeCategories }] = await Promise.all([
      db
        .rpc('_resolve_public_tenant_id', { p_host: host })
        .then(async ({ data: tenantId, error }: { data: string | null; error: Error | null }) => {
          if (error || !tenantId) return { data: null, error: error ?? new Error('Tenant não resolvido') };
          return db
            .from('directory_home_settings')
            .select('hero_title, hero_subtitle, hero_search_placeholder, sections_config')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        }),
      db.rpc('public_directory_home_data', { p_host: host, p_city: city }),
      db.rpc('public_directory_categories', { p_host: host }).catch(() => ({ data: null })),
    ]);

    if (settingsError || homeError) {
      return NextResponse.json(
        { error: 'Guia indisponível' },
        { status: 503, headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
      );
    }
    const payload = (homeData && typeof homeData === 'object' ? homeData : {}) as Record<string, unknown>;
    const { data: searchData, error: searchError } = await db.rpc('public_businesses_search', { p_host: host, p_query: query, p_city: city, p_category_slug: category, p_verified: null, p_has_benefits: null, p_sort: 'relevance', p_page: page, p_page_size: pageSize });
    if (searchError) {
      return NextResponse.json(
        { error: 'Empresas indisponíveis' },
        { status: 503, headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
      );
    }

    const activeCatsArray = Array.isArray(activeCategories) ? activeCategories : [];
    const homeCatsArray = Array.isArray(payload.categories) ? payload.categories : [];
    const seenSlugs = new Set<string>();
    const mergedCats: any[] = [];
    for (const c of activeCatsArray) {
      if (c?.slug && !seenSlugs.has(c.slug)) {
        seenSlugs.add(c.slug);
        mergedCats.push(c);
      }
    }
    for (const c of homeCatsArray) {
      if (c?.slug && !seenSlugs.has(c.slug)) {
        seenSlugs.add(c.slug);
        mergedCats.push(c);
      }
    }

    const rpcSettings = (payload.settings && typeof payload.settings === 'object' ? payload.settings : {}) as Record<string, unknown>;
    return NextResponse.json({
      settings: settings ?? rpcSettings,
      banners: Array.isArray(payload.banners) ? payload.banners : [],
      categories: mergedCats,
      sponsored: Array.isArray(payload.sponsored) ? payload.sponsored : [],
      businesses: Array.isArray(searchData?.items) ? searchData.items : [],
      pagination: { page, page_size: pageSize, total: Number(searchData?.total || 0), total_pages: Number(searchData?.total_pages || 0) },
      available_cities: Array.isArray(payload.available_cities) ? payload.available_cities : [],
    }, { headers: { 'Cache-Control': 'no-store', Vary: 'Accept, X-Client-Version', ...corsHeaders } });
  } catch {
    return NextResponse.json(
      { error: 'Guia indisponível' },
      { status: 503, headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
    );
  }
}

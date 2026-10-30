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
  return 'conexaomaconica.com.br';
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
  const slugParam = params.get('slug')?.trim() || null;
  const hasBenefitsParam = params.get('has_benefits') === 'true' ? true : null;
  const city = params.get('city')?.trim() || null;
  const query = params.get('q')?.trim() || null;
  const category = params.get('category')?.trim() || null;
  const page = Math.max(1, Number(params.get('page') || 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get('page_size') || 12) || 12));
  if (city && city.length > 120) return NextResponse.json({ error: 'Cidade inválida' }, { status: 400 });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase público não configurado' }, { status: 503 });
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const dbReader = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
      : supabase;
    const db = supabase as any;
    const adminDb = dbReader as any;

    if (slugParam) {
      const { data: detailRows } = await db.rpc('public_business_detail', { p_host: host, p_business_slug: slugParam });
      const detail = Array.isArray(detailRows) && detailRows[0] ? { ...detailRows[0] } : null;
      if (!detail) {
        return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404, headers: { 'Cache-Control': 'no-store', ...corsHeaders } });
      }
      const bizId = detail.business_id || detail.id;
      if (bizId) {
        const [{ count: vCount }, { data: attrRows }] = await Promise.all([
          adminDb
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', bizId)
            .eq('event_name', 'view')
            .then((r: any) => r, () => ({ count: 0 })),
          adminDb
            .from('business_attributes')
            .select('attribute_key, attribute_value')
            .eq('business_id', bizId)
            .then((r: any) => r, () => ({ data: [] })),
        ]);
        detail.views_count = typeof vCount === 'number' ? vCount : 0;
        if (Array.isArray(attrRows)) {
          for (const attr of attrRows) {
            if (attr.attribute_key === 'cover_offset_y') detail.cover_offset_y = Number(attr.attribute_value);
            if (attr.attribute_key === 'cover_zoom') detail.cover_zoom = Number(attr.attribute_value);
            if (attr.attribute_key === 'cover_fit_mode') detail.cover_fit_mode = attr.attribute_value;
            if (attr.attribute_key === 'cover_background_color') detail.cover_background_color = attr.attribute_value;
            if (attr.attribute_key === 'logo_background_color' || attr.attribute_key === 'logo_bg_color') detail.logo_background_color = attr.attribute_value;
          }
        }
      }
      return NextResponse.json({ detail }, { headers: { 'Cache-Control': 'no-store', ...corsHeaders } });
    }

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
    const { data: searchData, error: searchError } = await db.rpc('public_businesses_search', {
      p_host: host,
      p_query: query,
      p_city: city,
      p_category_slug: category,
      p_verified: null,
      p_has_benefits: hasBenefitsParam,
      p_sort: 'relevance',
      p_page: page,
      p_page_size: pageSize,
    });
    if (searchError) {
      return NextResponse.json(
        { error: 'Empresas indisponíveis' },
        { status: 503, headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
      );
    }

    const rawBusinesses: any[] = Array.isArray(searchData?.items) ? searchData.items : [];
    const rawSponsored: any[] = Array.isArray(payload.sponsored) ? payload.sponsored : [];
    const allBizIds = Array.from(
      new Set(
        [...rawBusinesses, ...rawSponsored]
          .map((b: any) => b?.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    const viewsMap = new Map<string, number>();
    const attrsMap = new Map<string, Record<string, any>>();

    if (allBizIds.length > 0 && serviceRoleKey) {
      const [{ data: viewEvents }, { data: attrRows }] = await Promise.all([
        adminDb
          .from('analytics_events')
          .select('business_id')
          .in('business_id', allBizIds)
          .eq('event_name', 'view')
          .then((r: any) => r, () => ({ data: [] })),
        adminDb
          .from('business_attributes')
          .select('business_id, attribute_key, attribute_value')
          .in('business_id', allBizIds)
          .in('attribute_key', ['cover_offset_y', 'cover_zoom', 'cover_fit_mode', 'cover_background_color', 'logo_background_color', 'logo_bg_color'])
          .then((r: any) => r, () => ({ data: [] })),
      ]);

      if (Array.isArray(viewEvents)) {
        for (const ev of viewEvents) {
          if (ev?.business_id) {
            viewsMap.set(ev.business_id, (viewsMap.get(ev.business_id) ?? 0) + 1);
          }
        }
      }

      if (Array.isArray(attrRows)) {
        for (const row of attrRows) {
          if (!row?.business_id) continue;
          const current = attrsMap.get(row.business_id) || {};
          if (row.attribute_key === 'cover_offset_y') current.cover_offset_y = Number(row.attribute_value);
          if (row.attribute_key === 'cover_zoom') current.cover_zoom = Number(row.attribute_value);
          if (row.attribute_key === 'cover_fit_mode') current.cover_fit_mode = row.attribute_value;
          if (row.attribute_key === 'cover_background_color') current.cover_background_color = row.attribute_value;
          if (row.attribute_key === 'logo_background_color' || row.attribute_key === 'logo_bg_color') current.logo_background_color = row.attribute_value;
          attrsMap.set(row.business_id, current);
        }
      }
    }

    const enrichBiz = (b: any) => {
      if (!b || typeof b !== 'object') return b;
      const extra = attrsMap.get(b.id) || {};
      return {
        ...b,
        views_count: viewsMap.get(b.id) ?? b.views_count ?? 0,
        ...extra,
      };
    };

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
      sponsored: rawSponsored.map(enrichBiz),
      businesses: rawBusinesses.map(enrichBiz),
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

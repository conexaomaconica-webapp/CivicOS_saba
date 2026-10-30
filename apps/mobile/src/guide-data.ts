export type MobileGuideSection = {
  id: string;
  enabled: boolean;
  order: number;
};

export type MobileGuideSettings = {
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_search_placeholder: string | null;
  sections_config: MobileGuideSection[];
};

export type MobileGuideBanner = { id: string; title: string | null; subtitle: string | null; cta_text: string | null; cta_url: string | null; image_mobile_url: string | null; image_desktop_url: string | null };
export type MobileGuideCategory = { id: string; name: string; slug: string; icon_name: string | null; business_count?: number };
export type MobileGuideSponsoredBusiness = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  category_name: string | null;
  category_slug: string | null;
  plan_tier: string | null;
  is_featured: boolean;
  is_pedra_fundamental?: boolean;
  views_count?: number;
  cover_offset_y?: number | null;
  cover_zoom?: number | null;
  cover_fit_mode?: 'cover' | 'contain' | null;
  cover_background_color?: string | null;
  logo_background_color?: string | null;
};

export type MobileGuideHomeData = {
  settings: MobileGuideSettings;
  banners: MobileGuideBanner[];
  categories: MobileGuideCategory[];
  sponsored: MobileGuideSponsoredBusiness[];
  businesses: MobileGuideSponsoredBusiness[];
  available_cities: string[];
};

export class MobileGuideServiceError extends Error {}

function normalizeSectionConfig(value: unknown): MobileGuideSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .filter((item) => typeof item.id === 'string')
    .map((item, index) => ({
      id: String(item.id),
      enabled: item.enabled !== false,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
    }))
    .sort((a, b) => a.order - b.order);
}

function parseHomeData(value: unknown, activeCategoriesList?: unknown[]): MobileGuideHomeData {
  if (!value || typeof value !== 'object') throw new MobileGuideServiceError('Resposta inválida do Guia');
  const payload = value as Record<string, unknown>;
  const rawSettings = (payload.settings && typeof payload.settings === 'object' ? payload.settings : {}) as Record<string, unknown>;
  const asRecord = (item: unknown) => item && typeof item === 'object' ? item as Record<string, unknown> : {};
  const banners = (Array.isArray(payload.banners) ? payload.banners : []).map((item) => { const row = asRecord(item); return { id: String(row.id ?? ''), title: typeof row.title === 'string' ? row.title : null, subtitle: typeof row.subtitle === 'string' ? row.subtitle : null, cta_text: typeof row.cta_text === 'string' ? row.cta_text : null, cta_url: typeof row.cta_url === 'string' ? row.cta_url : null, image_mobile_url: typeof row.image_mobile_url === 'string' ? row.image_mobile_url : null, image_desktop_url: typeof row.image_desktop_url === 'string' ? row.image_desktop_url : null }; }).filter((item) => item.id);

  const rawActiveCats = (Array.isArray(activeCategoriesList) ? activeCategoriesList : [])
    .map((item) => {
      const row = asRecord(item);
      return {
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        slug: String(row.slug ?? ''),
        icon_name: typeof row.icon_name === 'string' ? row.icon_name : null,
        business_count: Number(row.business_count) || 0,
      };
    })
    .filter((item) => item.id && item.name && item.slug);

  const rawHomeCats = (Array.isArray(payload.categories) ? payload.categories : [])
    .map((item) => {
      const row = asRecord(item);
      return {
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        slug: String(row.slug ?? ''),
        icon_name: typeof row.icon_name === 'string' ? row.icon_name : null,
        business_count: Number(row.business_count) || 0,
      };
    })
    .filter((item) => item.id && item.name && item.slug);

  const seenSlugs = new Set<string>();
  const categories: MobileGuideCategory[] = [];

  for (const cat of rawActiveCats) {
    if (!seenSlugs.has(cat.slug)) {
      seenSlugs.add(cat.slug);
      categories.push(cat);
    }
  }
  for (const cat of rawHomeCats) {
    if (!seenSlugs.has(cat.slug)) {
      seenSlugs.add(cat.slug);
      categories.push(cat);
    }
  }

  categories.sort((a, b) => {
    const aCount = a.business_count ?? 0;
    const bCount = b.business_count ?? 0;
    if (aCount > 0 && bCount === 0) return -1;
    if (aCount === 0 && bCount > 0) return 1;
    if (aCount > 0 && bCount > 0) return bCount - aCount;
    return 0;
  });
  const parseBusinesses = (items: unknown[]): MobileGuideSponsoredBusiness[] =>
    items
      .map((item): MobileGuideSponsoredBusiness => {
        const row = asRecord(item);
        return {
          id: String(row.id ?? ''),
          name: String(row.name ?? ''),
          slug: String(row.slug ?? ''),
          city: typeof row.city === 'string' ? row.city : null,
          state: typeof row.state === 'string' ? row.state : null,
          logo_url: typeof row.logo_url === 'string' ? row.logo_url : null,
          cover_url: typeof row.cover_url === 'string' ? row.cover_url : null,
          description:
            typeof row.description === 'string'
              ? row.description
              : typeof row.short_description === 'string'
                ? row.short_description
                : null,
          category_name: typeof row.category_name === 'string' ? row.category_name : null,
          category_slug: typeof row.category_slug === 'string' ? row.category_slug : null,
          plan_tier:
            typeof row.plan_tier === 'string'
              ? row.plan_tier
              : typeof row.plan_code === 'string'
                ? row.plan_code
                : null,
          latitude:
            typeof row.latitude === 'number'
              ? row.latitude
              : typeof row.latitude === 'string' && !isNaN(Number(row.latitude))
                ? Number(row.latitude)
                : null,
          longitude:
            typeof row.longitude === 'number'
              ? row.longitude
              : typeof row.longitude === 'string' && !isNaN(Number(row.longitude))
                ? Number(row.longitude)
                : null,
          address: typeof row.address === 'string' ? row.address : null,
          is_featured: row.is_featured === true,
          is_pedra_fundamental: row.is_pedra_fundamental === true,
          views_count: typeof row.views_count === 'number' ? row.views_count : undefined,
          cover_offset_y:
            typeof row.cover_offset_y === 'number'
              ? row.cover_offset_y
              : typeof row.cover_offset_y === 'string' && !isNaN(Number(row.cover_offset_y))
                ? Number(row.cover_offset_y)
                : null,
          cover_zoom:
            typeof row.cover_zoom === 'number'
              ? row.cover_zoom
              : typeof row.cover_zoom === 'string' && !isNaN(Number(row.cover_zoom))
                ? Number(row.cover_zoom)
                : null,
          cover_fit_mode:
            row.cover_fit_mode === 'contain' || row.cover_fit_mode === 'cover'
              ? row.cover_fit_mode
              : null,
          cover_background_color:
            typeof row.cover_background_color === 'string' ? row.cover_background_color : null,
          logo_background_color:
            typeof row.logo_background_color === 'string' ? row.logo_background_color : null,
        };
      })
      .filter((item) => item.id && item.name);

  return {
    settings: {
      hero_title: typeof rawSettings.hero_title === 'string' ? rawSettings.hero_title : null,
      hero_subtitle: typeof rawSettings.hero_subtitle === 'string' ? rawSettings.hero_subtitle : null,
      hero_search_placeholder: typeof rawSettings.hero_search_placeholder === 'string' ? rawSettings.hero_search_placeholder : null,
      sections_config: normalizeSectionConfig(rawSettings.sections_config),
    },
    banners,
    categories,
    sponsored: parseBusinesses(Array.isArray(payload.sponsored) ? payload.sponsored : []),
    businesses: parseBusinesses(Array.isArray(payload.businesses) ? payload.businesses : []),
    available_cities: Array.isArray(payload.available_cities)
      ? payload.available_cities.filter((city): city is string => typeof city === 'string')
      : [],
  };
}

async function loadFromDirectSupabase(
  fetchImpl: typeof fetch,
  filters?: GuideFilters | string,
): Promise<MobileGuideHomeData> {
  const supabaseUrl = 'https://rwvztwsjcjljphqttiws.supabase.co';
  const anonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dnp0d3NqY2psanBocXR0aXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODk4MTIsImV4cCI6MjEwMTM2NTgxMn0.1p7e82BNjYQBKkOdbSlXZ0WLiV-Hl8T-IGicUTn9GHc';
  const host = 'localhost:3000';

  let cityParam: string | null = null;
  let queryParam: string | null = null;
  let categoryParam: string | null = null;
  let hasBenefitsParam: boolean | null = null;

  if (typeof filters === 'string') {
    cityParam = filters.trim() || null;
  } else if (filters) {
    cityParam = filters.city?.trim() || null;
    queryParam = filters.query?.trim() || null;
    categoryParam = filters.category?.trim() || null;
    hasBenefitsParam = filters.hasBenefits === true ? true : null;
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  };

  const bffUrl = new URL('https://conexaomaconica.com.br/api/mobile/guide');
  if (cityParam) bffUrl.searchParams.set('city', cityParam);
  if (queryParam) bffUrl.searchParams.set('q', queryParam);
  if (categoryParam) bffUrl.searchParams.set('category', categoryParam);
  if (hasBenefitsParam) bffUrl.searchParams.set('has_benefits', 'true');
  bffUrl.searchParams.set('page_size', '100');

  const [homeRes, searchRes, categoriesRes, bffRes] = await Promise.all([
    fetchImpl(`${supabaseUrl}/rest/v1/rpc/public_directory_home_data`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_host: host, p_city: cityParam }),
    }),
    fetchImpl(`${supabaseUrl}/rest/v1/rpc/public_businesses_search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_host: host,
        p_query: queryParam,
        p_city: cityParam,
        p_category_slug: categoryParam,
        p_verified: null,
        p_has_benefits: hasBenefitsParam,
        p_sort: 'relevance',
        p_page: 1,
        p_page_size: 100,
      }),
    }),
    fetchImpl(`${supabaseUrl}/rest/v1/rpc/public_directory_categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_host: host }),
    }).catch(() => null),
    fetchWithTimeout(fetchImpl, bffUrl.toString(), { headers: { Accept: 'application/json' } }, 1800).catch(() => null),
  ]);

  if (!homeRes.ok) throw new MobileGuideServiceError(`Guia indisponível (${homeRes.status})`);
  const homePayload = await homeRes.json();
  const searchPayload = searchRes.ok ? await searchRes.json() : { items: [] };
  const categoriesPayload = categoriesRes && categoriesRes.ok ? await categoriesRes.json() : [];
  const bffPayload = bffRes && bffRes.ok ? await bffRes.json().catch(() => null) : null;

  const extraById = new Map<string, Record<string, unknown>>();
  if (bffPayload && typeof bffPayload === 'object') {
    const bffBizs = [
      ...(Array.isArray(bffPayload.businesses) ? bffPayload.businesses : []),
      ...(Array.isArray(bffPayload.sponsored) ? bffPayload.sponsored : []),
    ];
    for (const item of bffBizs) {
      if (item && typeof item === 'object' && typeof item.id === 'string') {
        extraById.set(item.id, item as Record<string, unknown>);
      }
    }
  }

  const mergeExtra = (list: unknown[]) =>
    list.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === 'string' ? row.id : '';
      const extra = id ? extraById.get(id) : undefined;
      return extra ? { ...row, ...extra } : row;
    });

  return parseHomeData(
    {
      ...homePayload,
      sponsored: mergeExtra(Array.isArray(homePayload?.sponsored) ? homePayload.sponsored : []),
      businesses: mergeExtra(Array.isArray(searchPayload?.items) ? searchPayload.items : []),
    },
    Array.isArray(categoriesPayload) ? categoriesPayload : [],
  );
}

export type GuideFilters = {
  city?: string;
  query?: string;
  category?: string;
  hasBenefits?: boolean;
};

export type MobileBusinessDetail = {
  business_id: string;
  business_name: string;
  business_slug: string;
  effective_plan_code: string;
  primary_category_name: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url?: string | null;
  cover_offset_y?: number | null;
  cover_zoom?: number | null;
  cover_fit_mode?: 'cover' | 'contain' | null;
  cover_background_color?: string | null;
  logo_background_color?: string | null;
  views_count?: number;
  is_pedra_fundamental: boolean;
  is_coluna_honra: boolean;
  is_founder: boolean;
  is_verified: boolean;
  rating_average: number;
  rating_count: number;
  lodge_name: string | null;
  responsible: {
    name?: string;
    business_role?: string;
    community_label?: string;
    whatsapp?: string;
    avatar_url?: string;
  } | null;
  contacts: Array<{ id: string; type: string; label: string | null; value: string }>;
  media: Array<{
    id: string;
    url: string;
    title: string | null;
    media_type: 'image' | 'video';
    display_order: number;
  }>;
  services: Array<{
    id: string;
    title: string;
    description?: string;
    price?: number;
  }>;
  benefits: Array<{
    id: string;
    title: string;
    description?: string;
    discount_percentage?: number;
  }>;
};

export type MobileLodgeMeetingData = {
  day?: string | null;
  time?: string | null;
  label?: string | null;
};

export type MobileLodgeCardData = {
  id: string;
  slug: string;
  name: string;
  code_number?: number | null;
  potency?: string | null;
  potency_name?: string | null;
  rite?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  logo_url?: string | null;
  cover_url?: string | null;
  worshipful_master_name?: string | null;
  primary_meeting?: MobileLodgeMeetingData | null;
  is_featured?: boolean;
};

export type MobileLodgeDetail = {
  id: string;
  slug: string;
  name: string;
  code_number?: number | null;
  potency?: string | null;
  potency_name?: string | null;
  rite?: string | null;
  foundation_date?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  cover_url?: string | null;
  worshipful_master_name?: string | null;
  show_worshipful_master?: boolean;
  show_address?: boolean;
  contacts: Array<{ id: string; type: string; value: string; label?: string | null }>;
  meetings: Array<{ id: string; day?: string | null; time?: string | null; label?: string | null }>;
  gallery: Array<{ id: string; url: string; alt?: string | null; type?: string | null }>;
};

export type MobileLodgeFilterState = {
  state?: string;
  city?: string;
  potency?: string;
  rite?: string;
  meetingDay?: string;
  query?: string;
};

export type MobileEventItem = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  event_date: string | null;
  location_label: string | null;
  city: string | null;
  state: string | null;
  organizer_name: string | null;
  organizer_type: 'business' | 'lodge';
  cover_url: string | null;
  cta_url: string | null;
};

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 1500,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(input, { ...init, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function loadBusinessDetailFromDirectSupabase(
  fetchImpl: typeof fetch,
  slug: string,
): Promise<MobileBusinessDetail | null> {
  const supabaseUrl = 'https://rwvztwsjcjljphqttiws.supabase.co';
  const anonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dnp0d3NqY2psanBocXR0aXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODk4MTIsImV4cCI6MjEwMTM2NTgxMn0.1p7e82BNjYQBKkOdbSlXZ0WLiV-Hl8T-IGicUTn9GHc';
  const host = 'localhost:3000';

  try {
    const bffDetailUrl = `https://conexaomaconica.com.br/api/mobile/guide?slug=${encodeURIComponent(slug)}`;
    const [res, bffRes] = await Promise.all([
      fetchImpl(`${supabaseUrl}/rest/v1/rpc/public_business_detail`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_host: host, p_business_slug: slug }),
      }),
      fetchWithTimeout(fetchImpl, bffDetailUrl, { headers: { Accept: 'application/json' } }, 1800).catch(() => null),
    ]);

    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list) || !list[0]) return null;
    const bffJson = bffRes && bffRes.ok ? await bffRes.json().catch(() => null) : null;
    const b = {
      ...list[0],
      ...(bffJson?.detail && typeof bffJson.detail === 'object' ? bffJson.detail : {}),
    };

    return {
      business_id: String(b.business_id || ''),
      business_name: String(b.business_name || ''),
      business_slug: String(b.business_slug || slug),
      effective_plan_code: String(b.effective_plan_code || 'bronze').toLowerCase(),
      primary_category_name: typeof b.primary_category_name === 'string' ? b.primary_category_name : null,
      city: typeof b.city === 'string' ? b.city : null,
      state: typeof b.state === 'string' ? b.state : null,
      address: typeof b.address === 'string' ? b.address : null,
      description: typeof b.description === 'string' ? b.description : null,
      logo_url: typeof b.logo_url === 'string' ? b.logo_url : null,
      cover_url: typeof b.cover_url === 'string' ? b.cover_url : null,
      cover_offset_y:
        typeof b.cover_offset_y === 'number'
          ? b.cover_offset_y
          : typeof b.cover_offset_y === 'string' && !isNaN(Number(b.cover_offset_y))
            ? Number(b.cover_offset_y)
            : null,
      cover_zoom:
        typeof b.cover_zoom === 'number'
          ? b.cover_zoom
          : typeof b.cover_zoom === 'string' && !isNaN(Number(b.cover_zoom))
            ? Number(b.cover_zoom)
            : null,
      cover_fit_mode:
        b.cover_fit_mode === 'contain' || b.cover_fit_mode === 'cover' ? b.cover_fit_mode : null,
      cover_background_color:
        typeof b.cover_background_color === 'string' ? b.cover_background_color : null,
      logo_background_color:
        typeof b.logo_background_color === 'string' ? b.logo_background_color : null,
      views_count: typeof b.views_count === 'number' ? b.views_count : undefined,
      is_pedra_fundamental: b.is_pedra_fundamental === true,
      is_coluna_honra: b.is_coluna_honra === true,
      is_founder: b.is_founder === true,
      is_verified: b.is_verified === true,
      rating_average: Number(b.rating_average) || 5,
      rating_count: Number(b.rating_count) || 0,
      lodge_name: typeof b.lodge_name === 'string' ? b.lodge_name : null,
      responsible: b.responsible && typeof b.responsible === 'object' ? b.responsible : null,
      contacts: Array.isArray(b.contacts) ? b.contacts : [],
      media: Array.isArray(b.media) ? b.media : [],
      services: Array.isArray(b.services) ? b.services : [],
      benefits: Array.isArray(b.benefits) ? b.benefits : [],
    };
  } catch {
    return null;
  }
}

export async function loadLodgesFromDirectSupabase(
  fetchImpl: typeof fetch,
  filters?: MobileLodgeFilterState,
  page = 1,
  pageSize = 12,
): Promise<{ items: MobileLodgeCardData[]; total: number }> {
  const supabaseUrl = 'https://rwvztwsjcjljphqttiws.supabase.co';
  const anonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dnp0d3NqY2psanBocXR0aXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODk4MTIsImV4cCI6MjEwMTM2NTgxMn0.1p7e82BNjYQBKkOdbSlXZ0WLiV-Hl8T-IGicUTn9GHc';
  const host = 'localhost:3000';

  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      `${supabaseUrl}/rest/v1/rpc/public_lodges_search`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_host: host,
          p_state: filters?.state?.trim() || null,
          p_city: filters?.city?.trim() || null,
          p_potency: filters?.potency?.trim() || null,
          p_rite: filters?.rite?.trim() || null,
          p_meeting_day: filters?.meetingDay?.trim() || null,
          p_sort: 'name',
          p_page: page,
          p_page_size: pageSize,
        }),
      },
      3000,
    );

    if (!res.ok) {
      return { items: [], total: 0 };
    }

    const payload = await res.json();
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];
    const items: MobileLodgeCardData[] = rawItems.map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      slug: String(item.slug || ''),
      name: String(item.name || ''),
      code_number: item.code_number != null ? Number(item.code_number) : null,
      potency: typeof item.potency === 'string' ? item.potency : null,
      potency_name: typeof item.potency_name === 'string' ? item.potency_name : null,
      rite: typeof item.rite === 'string' ? item.rite : null,
      city: typeof item.city === 'string' ? item.city : null,
      state: typeof item.state === 'string' ? item.state : null,
      address: typeof item.address === 'string' ? item.address : null,
      latitude: item.latitude != null ? Number(item.latitude) : null,
      longitude: item.longitude != null ? Number(item.longitude) : null,
      distance_km: item.distance_km != null ? Number(item.distance_km) : null,
      logo_url: typeof item.logo_url === 'string' ? item.logo_url : null,
      cover_url: typeof item.cover_url === 'string' ? item.cover_url : null,
      worshipful_master_name: typeof item.worshipful_master_name === 'string' ? item.worshipful_master_name : null,
      primary_meeting: (item.primary_meeting && typeof item.primary_meeting === 'object') ? (item.primary_meeting as MobileLodgeMeetingData) : null,
      is_featured: item.is_featured === true,
    }));

    return {
      items,
      total: Number(payload?.total ?? items.length),
    };
  } catch (err) {
    console.error('loadLodgesFromDirectSupabase error:', err);
    return { items: [], total: 0 };
  }
}

export async function loadLodgeDetailFromDirectSupabase(
  fetchImpl: typeof fetch,
  slug: string,
): Promise<MobileLodgeDetail | null> {
  const supabaseUrl = 'https://rwvztwsjcjljphqttiws.supabase.co';
  const anonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dnp0d3NqY2psanBocXR0aXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODk4MTIsImV4cCI6MjEwMTM2NTgxMn0.1p7e82BNjYQBKkOdbSlXZ0WLiV-Hl8T-IGicUTn9GHc';
  const host = 'localhost:3000';

  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      `${supabaseUrl}/rest/v1/rpc/public_lodge_detail`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_host: host,
          p_lodge_slug: slug,
        }),
      },
      3000,
    );

    if (!res.ok) return null;
    const l = (await res.json()) as Record<string, unknown>;
    if (!l || typeof l !== 'object' || !l.name) return null;

    return {
      id: String(l.id || ''),
      slug: String(l.slug || slug),
      name: String(l.name || ''),
      code_number: l.code_number != null ? Number(l.code_number) : null,
      potency: typeof l.potency === 'string' ? l.potency : null,
      potency_name: typeof l.potency_name === 'string' ? l.potency_name : null,
      rite: typeof l.rite === 'string' ? l.rite : null,
      foundation_date: typeof l.foundation_date === 'string' ? l.foundation_date : null,
      city: typeof l.city === 'string' ? l.city : null,
      state: typeof l.state === 'string' ? l.state : null,
      cep: typeof l.cep === 'string' ? l.cep : null,
      address: typeof l.address === 'string' ? l.address : null,
      latitude: l.latitude != null ? Number(l.latitude) : null,
      longitude: l.longitude != null ? Number(l.longitude) : null,
      logo_url: typeof l.logo_url === 'string' ? l.logo_url : null,
      cover_url: typeof l.cover_url === 'string' ? l.cover_url : null,
      worshipful_master_name: typeof l.worshipful_master_name === 'string' ? l.worshipful_master_name : null,
      show_worshipful_master: l.show_worshipful_master !== false,
      show_address: l.show_address !== false,
      contacts: Array.isArray(l.contacts) ? (l.contacts as Array<{ id: string; type: string; value: string; label?: string | null }>) : [],
      meetings: Array.isArray(l.meetings) ? (l.meetings as Array<{ id: string; day?: string | null; time?: string | null; label?: string | null }>) : [],
      gallery: Array.isArray(l.gallery) ? (l.gallery as Array<{ id: string; url: string; alt?: string | null; type?: string | null }>) : [],
    };
  } catch (err) {
    console.error('loadLodgeDetailFromDirectSupabase error:', err);
    return null;
  }
}

export function createMobileGuideService(
  fetchImpl: typeof fetch = fetch,
  endpoint = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_MOBILE_GUIDE_API_URL)?.trim() || '',
) {
  return {
    async loadHome(filters?: GuideFilters | string): Promise<MobileGuideHomeData> {
      // Se um endpoint explícito e externo foi configurado (como em testes unitários ou BFF isolado), consome diretamente
      const isCustomEndpoint = Boolean(
        endpoint &&
        !endpoint.includes('10.0.0.158') &&
        !endpoint.includes('192.168.') &&
        !endpoint.startsWith('http://localhost')
      );

      if (isCustomEndpoint) {
        const url = new URL(endpoint);

        let cityParam: string | undefined;
        let queryParam: string | undefined;
        let categoryParam: string | undefined;
        let hasBenefitsParam: boolean | undefined;

        if (typeof filters === 'string') {
          cityParam = filters;
        } else if (filters) {
          cityParam = filters.city;
          queryParam = filters.query;
          categoryParam = filters.category;
          hasBenefitsParam = filters.hasBenefits;
        }

        if (cityParam?.trim()) url.searchParams.set('city', cityParam.trim());
        if (queryParam?.trim()) url.searchParams.set('q', queryParam.trim());
        if (categoryParam?.trim()) url.searchParams.set('category', categoryParam.trim());
        if (hasBenefitsParam) url.searchParams.set('has_benefits', 'true');

        const response = await fetchWithTimeout(fetchImpl, url, { headers: { Accept: 'application/json' } }, 1500);
        if (!response.ok) {
          throw new MobileGuideServiceError(`Guia indisponível (${response.status})`);
        }
        return parseHomeData(await response.json());
      }

      // Conexão direta com o Supabase oficial: HTTPS de altíssima performance (<250ms) e disponível em qualquer rede móvel (Wi-Fi/4G/5G)
      return await loadFromDirectSupabase(fetchImpl, filters);
    },

    async loadBusinessDetail(slug: string): Promise<MobileBusinessDetail | null> {
      return await loadBusinessDetailFromDirectSupabase(fetchImpl, slug);
    },

    async searchLodges(filters?: MobileLodgeFilterState, page = 1, pageSize = 12): Promise<{ items: MobileLodgeCardData[]; total: number }> {
      return await loadLodgesFromDirectSupabase(fetchImpl, filters, page, pageSize);
    },

    async loadLodgeDetail(slug: string): Promise<MobileLodgeDetail | null> {
      return await loadLodgeDetailFromDirectSupabase(fetchImpl, slug);
    },
  };
}

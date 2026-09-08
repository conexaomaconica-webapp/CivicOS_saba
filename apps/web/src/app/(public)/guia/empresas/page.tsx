import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ChevronRight, Search, Sparkles } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { BusinessDirectoryClient } from '@/components/public/directory/BusinessDirectoryClient';
import type { FilterState } from '@/components/public/directory/BusinessFilters';
import type { ViewMode } from '@/components/public/directory/BusinessResultsToolbar';
import type { BusinessCardData } from '@/components/public/directory/BusinessCard';
import { StructuredData } from '@/components/seo/StructuredData';
import '@/styles/directory-home.css';

function appUrl(path: string) {
  return `https://conexaomaconica.com.br${path}`;
}

type Props = {
  searchParams: Promise<{
    q?: string;
    state?: string;
    city?: string;
    cidade?: string;
    cat?: string;
    subcat?: string;
    rel?: string | string[];
    rec?: string | string[];
    plan?: string | string[];
    verified?: string;
    dist?: string;
    sort?: string;
    view?: string;
    page?: string;
    page_size?: string;
  }>;
};


export const metadata: Metadata = {
  title: 'Empresas e Serviços Maçônicos | Conexão Maçônica',
  description:
    'Diretório completo de empresas, profissionais e serviços de confiança dentro da rede Conexão Maçônica. Pesquise por categoria, cidade, vínculo e distâncias.',
  openGraph: {
    title: 'Empresas e Serviços Maçônicos | Conexão Maçônica',
    description: 'Descubra empresas e profissionais de confiança na rede Conexão Maçônica.',
  },
};

export default async function BusinessDirectoryPage({ searchParams }: Props) {
  const rawParams = searchParams ? await searchParams : {};
  const params = rawParams || {};
  const headerList = await headers();
  const host = headerList.get('host') || 'localhost:3000';

  const q = params.q || '';
  const stateParam = params.state || '';
  const city = params.city || params.cidade || '';
  const cat = params.cat || '';
  const subcat = params.subcat || '';
  
  // Array parameters parsing
  const relArr = Array.isArray(params.rel) ? params.rel : params.rel ? [params.rel] : [];
  const recArr = Array.isArray(params.rec) ? params.rec : params.rec ? [params.rec] : [];
  const planArr = Array.isArray(params.plan) ? params.plan : params.plan ? [params.plan] : [];
  
  const verified = params.verified === 'true';
  const maxDist = params.dist ? Number(params.dist) : undefined;
  const sort = params.sort || 'relevance';
  const viewMode: ViewMode = (params.view as ViewMode) || 'grid';
  const page = Number(params.page || 1);
  const pageSize = Number(params.page_size || 12);

  const supabase = await createServerSideClient();
  const tenantBrand = await resolveTenantBrandContext();

  // 1. Fetch Tenant Directory Home metadata & categories
  let homeData: any = null;
  try {
    const { data } = await (supabase as any).rpc('public_directory_home_data', {
      p_host: host,
      p_city: city || null,
    });
    homeData = data;
  } catch {
    // Fallback
  }

  let availableCities: string[] = homeData?.available_cities || [];

  if (!availableCities || availableCities.length === 0) {
    try {
      const { data: activeBiz } = await (supabase as any)
        .from('businesses')
        .select('id, city, business_locations(city)')
        .eq('publication_status', 'published')
        .eq('is_active', true);

      if (activeBiz && activeBiz.length > 0) {
        const citySet = new Set<string>();
        activeBiz.forEach((b: any) => {
          if (b.city && typeof b.city === 'string' && b.city.trim()) {
            citySet.add(b.city.trim());
          }
          const locs = Array.isArray(b.business_locations) ? b.business_locations : [];
          locs.forEach((l: any) => {
            if (l.city && typeof l.city === 'string' && l.city.trim()) {
              citySet.add(l.city.trim());
            }
          });
        });
        availableCities = Array.from(citySet).sort();
      }
    } catch (_e) {}
  }

  const categories = homeData?.categories || [];



  // 2. Execute Business Search Query RPC with fallback for 055/056 schema compatibility
  let searchDataRaw: any = null;
  const { data: res056, error: err056 } = await (supabase as any).rpc('public_businesses_search', {
    p_host: host,
    p_query: q || null,
    p_state: stateParam || null,
    p_city: city || null,
    p_category_slug: cat || null,
    p_subcategory_slug: subcat || null,
    p_relationships: relArr.length > 0 ? relArr : null,
    p_recognitions: recArr.length > 0 ? recArr : null,
    p_plans: planArr.length > 0 ? planArr : null,
    p_verified: verified || null,
    p_has_benefits: null,
    p_user_lat: null,
    p_user_lng: null,
    p_max_distance_km: maxDist || null,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  });

  if (!err056 && res056) {
    searchDataRaw = res056;
  } else {
    const { data: res055 } = await (supabase as any).rpc('public_businesses_search', {
      p_host: host,
      p_query: q || null,
      p_city: city || null,
      p_category_slug: cat || null,
      p_verified: verified || null,
      p_has_benefits: null,
      p_sort: sort,
      p_page: page,
      p_page_size: pageSize,
    });
    searchDataRaw = res055;
  }

  if (!searchDataRaw || !searchDataRaw.items || searchDataRaw.items.length === 0) {
    try {
      let directQuery = (supabase as any)
        .from('businesses')
        .select('id, slug, name, description, logo_url, plan_tier, publication_status, is_active, category, business_locations(city, state)')
        .eq('publication_status', 'published')
        .eq('is_active', true);

      if (q) {
        directQuery = directQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data: directBiz, count } = await directQuery;
      let filteredBiz = directBiz || [];

      if (cat) {
        const normCat = cat.toLowerCase();
        filteredBiz = filteredBiz.filter((b: any) => b.category?.toLowerCase() === normCat);
      }

      if (city) {
        const normCity = city.toLowerCase();
        filteredBiz = filteredBiz.filter((b: any) => {
          const locs = Array.isArray(b.business_locations) ? b.business_locations : [];
          return locs.some((l: any) => l.city?.toLowerCase().includes(normCity));
        });
      }

      if (filteredBiz.length > 0) {
        searchDataRaw = {
          items: filteredBiz.map((b: any) => ({
            id: b.id,
            slug: b.slug,
            name: b.name,
            short_description: b.description ? b.description.slice(0, 200) : '',
            logo_url: b.logo_url,
            cover_url: null,
            category_slug: b.category,
            category_name: b.category,
            city: Array.isArray(b.business_locations) && b.business_locations[0] ? b.business_locations[0].city : null,
            state: Array.isArray(b.business_locations) && b.business_locations[0] ? b.business_locations[0].state : null,
            is_verified: true,
            is_founder: false,
            effective_plan_code: b.plan_tier || 'prata',
          })),
          total: count || filteredBiz.length,
          page: 1,
          page_size: 12,
          total_pages: 1,
        };
      }
    } catch (_fallbackErr) {}
  }


  const searchData = searchDataRaw || {
    items: [],
    total: 0,
    page: 1,
    page_size: 12,
    total_pages: 0,
  };

  const businessItems: BusinessCardData[] = (searchData.items as BusinessCardData[]) || [];
  const activeCategory = categories.find((c: { slug: string }) => c.slug === cat);

  const initialFilters: FilterState = {
    state: stateParam,
    city,
    category: cat,
    relationships: relArr,
    recognitions: recArr,
    plans: planArr,
    verified,
    maxDistanceKm: maxDist,
  };

  return (
    <FavoritesProvider>
      <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] font-sans antialiased relative">
        <StructuredData
          schema={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Diretório Completo de Empresas | Conexão Maçônica',
            url: appUrl('/guia/empresas'),
          }}
        />

        {/* Top Header */}
        <DirectoryHeader
          appName={tenantBrand?.appName || 'Conexão Maçônica'}
          logoUrl={tenantBrand?.logoUrl}
          selectedCity={city}
          availableCities={availableCities}
        />

        {/* Breadcrumb & Sub-Hero */}
        <section className="bg-gradient-to-b from-[#3b0b14] to-[#2b060d] text-white py-10 px-4 relative overflow-hidden">
          <div className="dh-container relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-amber-200/80 mb-3" aria-label="Breadcrumb">
              <Link href="/guia" className="hover:text-amber-300 transition-colors">
                Início
              </Link>
              <ChevronRight className="w-3 h-3 text-amber-400/60" />
              <span className="text-white font-semibold">
                {activeCategory ? `Empresas > ${activeCategory.name}` : 'Empresas'}
              </span>
            </nav>

            <h1 className="font-serif font-bold text-2xl md:text-3xl text-white">
              {activeCategory ? `Empresas em ${activeCategory.name}` : 'Encontre Empresas e Serviços de Confiança'}
            </h1>
            <p className="text-xs md:text-sm text-amber-100/80 max-w-2xl mt-1.5">
              Descubra oportunidades comerciais, parceiros e negócios com vínculo maçônico verificado na plataforma.
            </p>

            {/* Barra de Busca Principal */}
            <form action="/guia/empresas" method="GET" className="dh-search-box mt-6 max-w-3xl">
              <Sparkles className="w-5 h-5 text-amber-500 ml-3 shrink-0" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Busque por empresa, serviço, profissional ou especialidade..."
                className="dh-search-box__input text-gray-900"
              />
              {city && <input type="hidden" name="city" value={city} />}
              {cat && <input type="hidden" name="cat" value={cat} />}
              <button type="submit" className="dh-search-box__btn">
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </form>
          </div>
        </section>

        {/* Conteúdo Principal com Interatividade Client-Side */}
        <main className="dh-container py-8">
          <BusinessDirectoryClient
            initialFilters={initialFilters}
            initialViewMode={viewMode}
            initialSort={sort}
            initialPage={page}
            initialPageSize={pageSize}
            total={searchData.total}
            totalPages={searchData.total_pages}
            businessItems={businessItems}
            availableCities={availableCities}
            categories={categories}
            activeCategoryName={activeCategory?.name}
            queryParam={q}
          />
        </main>

        {/* Footer */}
        <DirectoryFooter />

        {/* Modal de Favoritos */}
        <DirectoryFavoritesModal />
      </div>
    </FavoritesProvider>
  );
}

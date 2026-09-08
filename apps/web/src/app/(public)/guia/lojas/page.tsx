import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ChevronRight, Search, Landmark, Sparkles } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { LodgeDirectoryClient } from '@/components/public/directory/LodgeDirectoryClient';
import type { LodgeFilterState } from '@/components/public/directory/LodgeFilters';
import type { ViewMode } from '@/components/public/directory/BusinessResultsToolbar';
import type { LodgeCardData } from '@/components/public/directory/LodgeCard';
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
    potency?: string;
    rite?: string;
    day?: string;
    sort?: string;
    view?: string;
    page?: string;
    page_size?: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Lojas Maçônicas | Conexão Maçônica',
  description:
    'Diretório completo de Lojas Maçônicas. Pesquise por nome, número, cidade, potência, rito e dia de reunião para visitas institucionais.',
  openGraph: {
    title: 'Lojas Maçônicas | Conexão Maçônica',
    description: 'Encontre Lojas Maçônicas, horários de reunião e informações para sua visita.',
  },
};

export default async function MasonicLodgesDirectoryPage({ searchParams }: Props) {
  const rawParams = searchParams ? await searchParams : {};
  const params = rawParams || {};
  const headerList = await headers();
  const host = headerList.get('host') || 'localhost:3000';

  const q = params.q || '';
  const stateParam = params.state || '';
  const city = params.city || '';
  const potency = params.potency || '';
  const rite = params.rite || '';
  const day = params.day || '';

  const sort = params.sort || 'name';
  const viewMode: ViewMode = (params.view as ViewMode) || 'grid';
  const page = Number(params.page || 1);
  const pageSize = Number(params.page_size || 12);

  const supabase = await createServerSideClient();
  const tenantBrand = await resolveTenantBrandContext();

  // Fetch cities, potencies and rites safely
  let homeData: any = null;
  let potenciesData: any = null;
  let ritesData: any = null;

  try {
    const [potRes, riteRes, homeRes] = await Promise.all([
      (supabase as any).from('masonic_potencies').select('id, slug, name, abbreviation').eq('is_active', true),
      (supabase as any).from('masonic_rites').select('id, slug, name').eq('is_active', true),
      (supabase as any).rpc('public_directory_home_data', { p_host: host, p_city: city || null }),
    ]);
    potenciesData = potRes?.data;
    ritesData = riteRes?.data;
    homeData = homeRes?.data;
  } catch (err) {
    console.error('Error fetching initial lodges page data:', err);
  }

  const availableCities: string[] = homeData?.available_cities || [];
  const potencies = (potenciesData as any[]) || [];
  const rites = (ritesData as any[]) || [];

  // Execute search RPC with graceful fallback
  let searchRes: any = null;
  try {
    const rpcResult = await (supabase as any).rpc('public_lodges_search', {
      p_host: host,
      p_query: q || null,
      p_state: stateParam || null,
      p_city: city || null,
      p_potency: potency || null,
      p_rite: rite || null,
      p_meeting_day: day || null,
      p_sort: sort,
      p_page: page,
      p_page_size: pageSize,
    });
    if (rpcResult.data) {
      searchRes = rpcResult.data;
    }
  } catch (err) {
    console.error('RPC public_lodges_search fallback:', err);
  }

  if (!searchRes || !searchRes.items) {
    searchRes = {
      items: [],
      total: 0,
      page: 1,
      page_size: pageSize,
      total_pages: 0,
      has_next_page: false,
      has_previous_page: false,
    };
  }

  const searchData = searchRes;
  const lodgeItems: LodgeCardData[] = (searchRes.items as LodgeCardData[]) || [];

  const initialFilters: LodgeFilterState = {
    state: stateParam,
    city,
    potency,
    rite,
    meetingDay: day,
  };

  return (
    <FavoritesProvider>
      <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] font-sans antialiased relative">
        <StructuredData
          schema={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Diretório de Lojas Maçônicas | Conexão Maçônica',
            url: appUrl('/guia/lojas'),
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
              <span className="text-white font-semibold">Lojas Maçônicas</span>
            </nav>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Landmark className="w-4 h-4" />
              <span>Diretório Institucional</span>
            </div>

            <h1 className="font-serif font-bold text-2xl md:text-3xl text-white">
              Lojas Maçônicas
            </h1>
            <p className="text-xs md:text-sm text-amber-100/80 max-w-2xl mt-1.5">
              Encontre oficinas, potências, ritos, dias de reunião e informações para sua visita fraternal na rede Conexão Maçônica.
            </p>

            {/* Barra de Busca Principal */}
            <form action="/guia/lojas" method="GET" className="dh-search-box mt-6 max-w-3xl">
              <Sparkles className="w-5 h-5 text-amber-500 ml-3 shrink-0" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Busque por nome da Loja, número, cidade ou potência..."
                className="dh-search-box__input text-gray-900"
              />
              {city && <input type="hidden" name="city" value={city} />}
              {potency && <input type="hidden" name="potency" value={potency} />}
              <button type="submit" className="dh-search-box__btn">
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </form>
          </div>
        </section>

        {/* Conteúdo Principal com Interatividade Client-Side */}
        <main className="dh-container py-8">
          <LodgeDirectoryClient
            initialFilters={initialFilters}
            initialViewMode={viewMode}
            initialSort={sort}
            initialPage={page}
            initialPageSize={pageSize}
            total={searchData.total}
            totalPages={searchData.total_pages}
            lodgeItems={lodgeItems}
            availableCities={availableCities}
            potencies={potencies}
            rites={rites}
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

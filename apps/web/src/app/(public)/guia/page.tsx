import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { StructuredData } from '@/components/seo/StructuredData';
import { appUrl } from '@/lib/seo/app-url';
import '@/styles/directory-home.css';

// Directory Components
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryHero } from '@/components/public/directory/DirectoryHero';
import { DirectoryCarousel, type DirectoryBannerItem } from '@/components/public/directory/DirectoryCarousel';
import { DirectoryCategories, type DirectoryCategoryItem } from '@/components/public/directory/DirectoryCategories';
import { DirectorySponsored, type DirectorySponsoredItem } from '@/components/public/directory/DirectorySponsored';
import { DirectoryAllBusinesses, type PublicSearchResultItem } from '@/components/public/directory/DirectoryAllBusinesses';
import { DirectoryMapExplore } from '@/components/public/directory/DirectoryMapExplore';
import { DirectoryLodgesGuide, type PublicMasonicLodgeItem } from '@/components/public/directory/DirectoryLodgesGuide';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';

type Props = {
  searchParams: Promise<{
    q?: string;
    city?: string;
    cat?: string;
    verified?: string;
    benefits?: string;
    sort?: string;
    page?: string;
    potency?: string;
    rite?: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Guia Comercial e Maçônico — Conexão Maçônica',
  description:
    'Encontre empresas, serviços, benefícios e Lojas Maçônicas de irmãos verificados dentro de uma rede de credibilidade.',
  alternates: { canonical: '/guia' },
  openGraph: {
    title: 'Guia Comercial e Maçônico — Conexão Maçônica',
    description: 'Busque empresas, serviços e Lojas Maçônicas na rede Conexão Maçônica.',
    url: appUrl('/guia'),
    type: 'website',
  },
};

export default async function GuiaPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q || '';
  const city = params.city || '';
  const cat = params.cat || '';
  const verified = params.verified === 'true';
  const benefits = params.benefits === 'true';
  const sort = params.sort || 'relevance';
  const page = parseInt(params.page || '1', 10) || 1;
  const potency = params.potency || '';
  const rite = params.rite || '';

  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const supabase = await createServerSideClient();
  const brand = await resolveTenantBrandContext();

  // Parallel RPC execution
  const [homeDataRes, searchRes, lodgesRes] = await Promise.all([
    (supabase as any).rpc('public_directory_home_data', {
      p_host: host,
      p_city: city || null,
    }),
    (supabase as any).rpc('public_businesses_search', {
      p_host: host,
      p_query: q || null,
      p_city: city || null,
      p_category_slug: cat || null,
      p_verified: verified || null,
      p_has_benefits: benefits || null,
      p_sort: sort,
      p_page: page,
      p_page_size: 12,
    }),
    (supabase as any).rpc('public_organizations_search', {
      p_host: host,
      p_city: city || null,
      p_potency: potency || null,
      p_rite: rite || null,
      p_page: 1,
      p_page_size: 12,
    }),
  ]);

  const homeData: any = homeDataRes.data || {
    settings: {
      hero_title: 'Encontre empresas, serviços e conexões de confiança',
      hero_subtitle: 'Descubra oportunidades dentro de uma rede que valoriza relacionamento, credibilidade e propósito.',
      hero_search_placeholder: 'Pergunte à busca inteligente...',
      default_page_size: 12,
      sections_config: [
        { id: 'hero', enabled: true, order: 1 },
        { id: 'carousel', enabled: true, order: 2 },
        { id: 'categories', enabled: true, order: 3 },
        { id: 'sponsored', enabled: true, order: 4 },
        { id: 'all_businesses', enabled: true, order: 5 },
        { id: 'map', enabled: true, order: 6 },
        { id: 'lodges', enabled: true, order: 7 },
      ],
    },
    banners: [],
    categories: [],
    sponsored: [],
    available_cities: [],
  };

  const searchData: any = searchRes.data || {
    items: [],
    total: 0,
    page: 1,
    page_size: 12,
    total_pages: 1,
    has_next_page: false,
    has_previous_page: false,
  };

  const lodgesData: any = lodgesRes.data || {
    items: [],
    total: 0,
    page: 1,
    page_size: 12,
    total_pages: 1,
    has_next_page: false,
    has_previous_page: false,
  };

  const settings = homeData.settings || {};
  const banners = (homeData.banners as DirectoryBannerItem[]) || [];
  const categories = (homeData.categories as DirectoryCategoryItem[]) || [];
  const sponsored = (homeData.sponsored as DirectorySponsoredItem[]) || [];
  const availableCities = (homeData.available_cities as string[]) || [];

  const businessItems = (searchData.items as PublicSearchResultItem[]) || [];
  const lodgeItems = (lodgesData.items as PublicMasonicLodgeItem[]) || [];

  return (
    <FavoritesProvider>
      <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] font-sans antialiased relative">
        <StructuredData
          schema={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: brand.appName || 'Conexão Maçônica',
            url: appUrl('/guia'),
          }}
        />

        {/* Top Navigation Header */}
        <DirectoryHeader
          appName={brand.appName || 'Conexão Maçônica'}
          logoUrl={brand.logoUrl}
          selectedCity={city}
          availableCities={availableCities}
        />

        {/* Hero Section */}
        <DirectoryHero
          title={settings.hero_title}
          subtitle={settings.hero_subtitle}
          searchPlaceholder={settings.hero_search_placeholder}
          selectedCity={city}
        />

        {/* Carrossel Destaque da Semana */}
        <DirectoryCarousel banners={banners} />

        {/* Categorias em Destaque */}
        <DirectoryCategories categories={categories} />

        {/* Empresas Patrocinadas */}
        <DirectorySponsored items={sponsored} />

        {/* Diretório Completo "Todas as Empresas" */}
        <DirectoryAllBusinesses
          items={businessItems}
          total={searchData.total}
          page={searchData.page}
          pageSize={searchData.page_size}
          totalPages={searchData.total_pages}
          hasNextPage={searchData.has_next_page}
          hasPreviousPage={searchData.has_previous_page}
          availableCities={availableCities}
          categories={categories}
          searchQuery={q}
          selectedCity={city}
          selectedCategory={cat}
          verifiedOnly={verified}
          hasBenefitsOnly={benefits}
          sortBy={sort}
        />

        {/* Explore perto de você (Mapa) */}
        <DirectoryMapExplore businesses={businessItems} selectedCity={city} />

        {/* Guia de Lojas Maçônicas */}
        <DirectoryLodgesGuide lodges={lodgeItems} availableCities={availableCities} />

        {/* Footer */}
        <DirectoryFooter />

        {/* Favoritos Drawer/Modal */}
        <DirectoryFavoritesModal />
      </div>
    </FavoritesProvider>
  );
}

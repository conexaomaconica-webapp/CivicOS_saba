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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    q?: string;
    city?: string;
    cidade?: string;
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

function SectionDivider() {
  return (
    <div className="dh-container py-10 sm:py-16 my-2">
      <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
    </div>
  );
}

export default async function GuiaPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q || '';
  const city = params.city || params.cidade || '';
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

  // Resolve primeiro as preferências do tenant público para que Hero, busca e
  // paginação não dependam do sucesso da RPC agregadora da Home.
  let directPublicSettings: any = null;
  try {
    const { data: publicTenantId } = await (supabase as any)
      .rpc('_resolve_public_tenant_id', { p_host: host });
    if (publicTenantId) {
      const { data } = await (supabase as any)
        .from('directory_home_settings')
        .select('hero_title, hero_subtitle, hero_search_placeholder, default_page_size, sections_config, sponsored_display_mode, sponsored_marquee_speed, sponsored_logo_style')
        .eq('tenant_id', publicTenantId)
        .maybeSingle();
      directPublicSettings = data;
    }
  } catch (_settingsErr) {}
  const configuredPageSize = Math.min(100, Math.max(1, Number(directPublicSettings?.default_page_size) || 12));

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
      p_page_size: configuredPageSize,
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
      default_page_size: configuredPageSize,
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

  let searchData: any = searchRes.data;

  if (!searchData || !searchData.items || searchData.items.length === 0) {
    try {
      let directQuery = (supabase as any)
        .from('businesses')
        .select('id, slug, name, description, logo_url, plan_tier, publication_status, is_active, category, business_locations(city, state)')
        .eq('publication_status', 'published')
        .eq('is_active', true);

      if (q) {
        directQuery = directQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data: directBiz } = await directQuery;
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
        // Ordenação por prioridade de plano comercial e desempate por nome alfabético A-Z
        const getPlanWeight = (plan?: string | null) => {
          const p = (plan || '').toLowerCase();
          if (p === 'acacia' || p === 'ouro') return 30;
          if (p === 'compasso' || p === 'prata') return 20;
          if (p === 'esquadro' || p === 'bronze') return 10;
          return 0;
        };

        filteredBiz.sort((a: any, b: any) => {
          if (sort === 'name') {
            return (a.name || '').localeCompare(b.name || '');
          }
          if (sort === 'recent') {
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          }
          const weightDiff = getPlanWeight(b.plan_tier) - getPlanWeight(a.plan_tier);
          if (weightDiff !== 0) return weightDiff;
          return (a.name || '').localeCompare(b.name || '');
        });

        const totalItems = filteredBiz.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / configuredPageSize));
        const safePage = Math.max(1, Math.min(page, totalPages));
        const startIndex = (safePage - 1) * configuredPageSize;
        const paginatedBiz = filteredBiz.slice(startIndex, startIndex + configuredPageSize);

        searchData = {
          items: paginatedBiz.map((b: any) => ({
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
            is_pedra_fundamental: Boolean(b.is_pedra_fundamental),
            effective_plan_code: b.plan_tier || 'esquadro',
          })),
          total: totalItems,
          page: safePage,
          page_size: configuredPageSize,
          total_pages: totalPages,
          has_next_page: safePage < totalPages,
          has_previous_page: safePage > 1,
        };
      }
    } catch (_fallbackErr) {}
  }

  if (!searchData) {
    searchData = {
      items: [],
      total: 0,
      page: 1,
      page_size: configuredPageSize,
      total_pages: 1,
      has_next_page: false,
      has_previous_page: false,
    };
  }

  const lodgesData: any = lodgesRes.data || {
    items: [],
    total: 0,
    page: 1,
    page_size: 12,
    total_pages: 1,
    has_next_page: false,
    has_previous_page: false,
  };

  const settings = {
    ...(homeData.settings || {}),
    ...(directPublicSettings || {}),
  };
  let sponsoredDisplayMode: 'cards' | 'logos' = settings.sponsored_display_mode === 'logos' ? 'logos' : 'cards';
  let sponsoredSpeed = Number(settings.sponsored_marquee_speed) || 45;
  let sponsoredLogoStyle: 'standard' | 'clean' = settings.sponsored_logo_style === 'clean' ? 'clean' : 'standard';

  // Compatibilidade com schemas que persistem as preferências no bloco patrocinado.
  if (Array.isArray(settings.sections_config)) {
    const sponsoredConfig = settings.sections_config.find((section: any) => section.id === 'sponsored');
    if (sponsoredConfig) {
      // O editor administrativo persiste a configuração atual também no bloco
      // sponsored. Ele é a fonte mais recente quando colunas legadas/default
      // ainda retornam "cards" pela RPC ou pelo cache de schema.
      if (['cards', 'logos'].includes(sponsoredConfig.display_mode)) {
        sponsoredDisplayMode = sponsoredConfig.display_mode;
      }
      if (Number(sponsoredConfig.speed) > 0) {
        sponsoredSpeed = Number(sponsoredConfig.speed);
      }
      if (['standard', 'clean'].includes(sponsoredConfig.logo_style)) {
        sponsoredLogoStyle = sponsoredConfig.logo_style;
      }
    }
  }


  let banners = (homeData.banners as DirectoryBannerItem[]) || [];
  let categories = (homeData.categories as DirectoryCategoryItem[]) || [];
  let sponsored = (homeData.sponsored as DirectorySponsoredItem[]) || [];

  // Respeitar rigorosamente as Categorias em Destaque cadastradas e ativas no painel administrativo
  try {
    const { data: featCats } = await (supabase as any)
      .from('directory_featured_categories')
      .select('id, custom_title, icon_name, display_order, categories(id, name, slug, icon)')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (featCats && featCats.length > 0) {
      const parsedFeat = featCats
        .filter((fc: any) => fc.categories)
        .map((fc: any) => ({
          id: fc.categories.id,
          name: fc.custom_title || fc.categories.name,
          slug: fc.categories.slug,
          icon_name: fc.icon_name || fc.categories.icon,
        }));

      if (parsedFeat.length > 0) {
        categories = parsedFeat;
      }
    }
  } catch (_fcErr) {}
  
  // Normalização explícita de available_cities
  const rawCities = homeData.available_cities || homeData.availableCities;
  let availableCities: string[] = Array.isArray(rawCities)
    ? rawCities.filter(
        (c): c is string => typeof c === 'string' && c.trim().length > 0
      )
    : [];

  // Fallback para Banners se a RPC falhar ou retornar vazio
  if (!banners || banners.length === 0) {
    try {
      const { data: dbBanners } = await (supabase as any)
        .from('directory_banners')
        .select('id, title, subtitle, cta_text, cta_url, image_desktop_url')
        .eq('is_active', true)
        .order('display_order');

      if (dbBanners && dbBanners.length > 0) {
        banners = dbBanners.map((b: any) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          cta_text: b.cta_text,
          cta_url: b.cta_url,
          image_desktop_url: b.image_desktop_url,
        }));
      }
    } catch (_banErr) {}
  }

  // Fallback para Categorias se não houver destaques nem retorno da RPC
  if (!categories || categories.length === 0) {
    try {
      const { data: dbCats } = await (supabase as any)
        .from('categories')
        .select('id, name, slug, icon')
        .eq('is_active', true)
        .order('name')
        .limit(12);

      if (dbCats && dbCats.length > 0) {
        categories = dbCats.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon_name: c.icon,
        }));
      }
    } catch (_catErr) {}
  }

  // Fallback para Empresas Patrocinadas / Destaques se a RPC falhar ou retornar vazio
  if (!sponsored || sponsored.length === 0) {
    try {
      const { data: dbSponsored } = await (supabase as any)
        .from('businesses')
        .select('id, slug, name, description, logo_url, plan_tier, category, business_locations(city, state), business_media(url, media_type, display_order)')
        .eq('publication_status', 'published')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (dbSponsored && dbSponsored.length > 0) {
        sponsored = dbSponsored.map((b: any) => {
          const locs = Array.isArray(b.business_locations) && b.business_locations[0] ? b.business_locations[0] : {};
          const medias = Array.isArray(b.business_media) ? b.business_media : [];
          const coverMedia = medias.find((m: any) => m.media_type === 'image') || medias[0];
          return {
            id: b.id,
            slug: b.slug,
            name: b.name,
            short_description: b.description ? b.description.slice(0, 200) : '',
            logo_url: b.logo_url,
            cover_url: coverMedia ? coverMedia.url : null,
            category_name: b.category,
            city: locs.city || null,
            state: locs.state || null,
          };
        });
      }
    } catch (_spErr) {}
  }

  // Fallback exclusivo de empresas comerciais publicadas (SEM incluir organizações/Lojas Maçônicas)
  if (!availableCities || availableCities.length === 0) {
    try {
      const citySet = new Set<string>();

      const { data: activeBiz } = await (supabase as any)
        .from('businesses')
        .select('id, business_locations(city)')
        .eq('publication_status', 'published')
        .eq('is_active', true);

      if (activeBiz && activeBiz.length > 0) {
        activeBiz.forEach((b: any) => {
          const locs = Array.isArray(b.business_locations) ? b.business_locations : [];
          locs.forEach((l: any) => {
            if (l.city && typeof l.city === 'string' && l.city.trim()) {
              citySet.add(l.city.trim());
            }
          });
        });
      }

      availableCities = Array.from(citySet).sort();
    } catch (_e) {}
  }

  console.log('[GuiaPage Server Log] availableCities immediately before render:', availableCities);

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

        <SectionDivider />

        {/* Categorias em Destaque */}
        <DirectoryCategories categories={categories} />

        <SectionDivider />

        {/* Empresas Patrocinadas */}
        <DirectorySponsored
          items={sponsored}
          displayMode={sponsoredDisplayMode}
          speed={sponsoredSpeed}
          logoStyle={sponsoredLogoStyle}
        />

        <SectionDivider />

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

        <SectionDivider />

        {/* Explore perto de você (Mapa) */}
        <DirectoryMapExplore businesses={businessItems} selectedCity={city} />

        <SectionDivider />

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

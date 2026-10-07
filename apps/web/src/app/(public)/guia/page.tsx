import { needsDividerBetween, normalizeHomeSections } from '@/lib/directory/home-sections';
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
import { DirectoryLodgesGuide } from '@/components/public/directory/DirectoryLodgesGuide';
import { fetchLodgeGuideFacets } from '@/lib/lodges/lodge-facets';
import { fetchFilterCategories } from '@/lib/directory/filter-categories';
import { getConfirmedConnectionsCountAction, getConnectionsFeedAction } from '@/app/actions/connections';
import { DirectoryConnectionsMural } from '@/components/public/directory/DirectoryConnectionsMural';
import { DirectoryConnectionsCta } from '@/components/public/directory/DirectoryConnectionsCta';
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

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, unknown>> }): Promise<Metadata> {
  const hasFilters = Object.keys((await searchParams) ?? {}).length > 0;
  return {
    title: { absolute: 'Guia Comercial e Maçônico — Conexão Maçônica' },
    description:
      'Encontre empresas, serviços, benefícios e Lojas Maçônicas de irmãos verificados dentro de uma rede de credibilidade.',
    alternates: { canonical: appUrl('/guia') },
    robots: hasFilters ? { index: false, follow: true } : undefined,
    openGraph: {
      title: 'Guia Comercial e Maçônico — Conexão Maçônica',
      description: 'Busque empresas, serviços e Lojas Maçônicas na rede Conexão Maçônica.',
      url: appUrl('/guia'),
      type: 'website',
    },
  };
}

// Localização de exibição: a sede (is_headquarters) tem prioridade sobre as demais.
function pickHeadquarters(
  locations: Array<{ city?: string | null; state?: string | null; latitude?: number | null; longitude?: number | null; is_headquarters?: boolean | null }> | null | undefined,
) {
  if (!Array.isArray(locations) || locations.length === 0) return null;
  return locations.find((location) => location.is_headquarters === true) ?? locations[0] ?? null;
}

function SectionDivider() {
  return (
    <div className="dh-container py-5 sm:py-8 my-2">
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
  const [homeDataRes, searchRes, lodgeFacets, confirmedConnections, connectionsFeed] = await Promise.all([
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
    // Opções reais dos filtros da seção "Guia de Lojas" (a lista de lojas só carrega depois de filtrar).
    fetchLodgeGuideFacets(supabase),
    // Mural de Conexões: total de negócios confirmados pelas empresas (aparece no hero quando maior que zero).
    getConfirmedConnectionsCountAction(),
    getConnectionsFeedAction(5),
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
        .select('id, slug, name, description, logo_url, plan_tier, publication_status, is_active, category, business_locations(city, state, latitude, longitude, is_headquarters)')
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
            city: pickHeadquarters(b.business_locations)?.city ?? null,
            state: pickHeadquarters(b.business_locations)?.state ?? null,
            latitude: pickHeadquarters(b.business_locations)?.latitude ?? null,
            longitude: pickHeadquarters(b.business_locations)?.longitude ?? null,
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

  // Banner sem imagem utilizável (a RPC devolve null quando a URL é rejeitada) quebraria o carrossel.
  // Imagens de protótipo (/visual-lab/...) não existem em produção e também não servem.
  const isUsableBannerImage = (url: unknown): url is string =>
    typeof url === 'string' && url.trim().length > 0 && !url.startsWith('/visual-lab/');
  banners = (banners || []).filter((banner) => isUsableBannerImage(banner?.image_desktop_url));

  // Fallback para Banners se a RPC falhar, retornar vazio ou só trouxer banners sem imagem válida
  if (banners.length === 0) {
    try {
      const { data: dbBanners } = await (supabase as any)
        .from('directory_banners')
        .select('id, title, subtitle, cta_text, cta_url, image_desktop_url, image_mobile_url, start_at, end_at')
        .eq('is_active', true)
        .order('display_order');

      const now = Date.now();
      const scheduled = (dbBanners || []).filter(
        (b: any) =>
          isUsableBannerImage(b.image_desktop_url) &&
          (!b.start_at || new Date(b.start_at).getTime() <= now) &&
          (!b.end_at || new Date(b.end_at).getTime() >= now),
      );

      if (scheduled.length > 0) {
        banners = scheduled.map((b: any) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          cta_text: b.cta_text,
          cta_url: b.cta_url,
          image_desktop_url: b.image_desktop_url,
          image_mobile_url: b.image_mobile_url || null,
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
        .select('id, slug, name, description, logo_url, plan_tier, category, business_locations(city, state, is_headquarters, created_at), business_media(url, media_type, display_order)')
        .eq('publication_status', 'published')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (dbSponsored && dbSponsored.length > 0) {
        sponsored = dbSponsored.map((b: any) => {
          const locs = pickHeadquarters(b.business_locations) ?? { city: null, state: null };
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

  let businessItems = (searchData.items as PublicSearchResultItem[]) || [];

  // O mapa precisa do endereço da sede de cada empresa. A busca só devolve cidade/UF/coordenadas
  // (e empresas novas costumam não ter coordenadas), então completamos com business_locations.
  if (businessItems.length > 0) {
    try {
      const { data: locRows } = await (supabase as any)
        .from('business_locations')
        .select('business_id, street, number, neighborhood, city, state, postal_code, latitude, longitude, is_headquarters, created_at')
        .in('business_id', businessItems.map((b) => b.id))
        .order('is_headquarters', { ascending: false })
        .order('created_at', { ascending: true });

      const headquartersByBusiness = new Map<string, any>();
      for (const row of locRows || []) {
        if (!headquartersByBusiness.has(row.business_id)) headquartersByBusiness.set(row.business_id, row);
      }

      businessItems = businessItems.map((item) => {
        const loc = headquartersByBusiness.get(item.id);
        if (!loc) return item;
        const street = [loc.street, loc.number].filter(Boolean).join(', ');
        const cityState = [loc.city, loc.state].filter(Boolean).join(' - ');
        const addressLine = [street, loc.neighborhood, cityState, loc.postal_code, 'Brasil']
          .filter(Boolean)
          .join(', ');
        return {
          ...item,
          city: item.city ?? loc.city ?? null,
          state: item.state ?? loc.state ?? null,
          latitude: item.latitude ?? loc.latitude ?? null,
          longitude: item.longitude ?? loc.longitude ?? null,
          address_line: loc.street ? addressLine : null,
        };
      });
    } catch (_locErr) {}
  }


  // Opções do filtro "Todas as Categorias": todas as que têm empresas publicadas.
  const filterCategories = await fetchFilterCategories(supabase, host, categories);

  // Seções da home: ordem e visibilidade vêm de /admin/guia/geral (a configuração gravada é completada com as seções reais).
  const sectionNodes: Record<string, React.ReactNode> = {
    hero: (
      <DirectoryHero
        title={settings.hero_title}
        subtitle={settings.hero_subtitle}
        searchPlaceholder={settings.hero_search_placeholder}
        selectedCity={city}
        confirmedConnections={confirmedConnections}
      />
    ),
    // Carrossel Destaque da Semana
    carousel: <DirectoryCarousel banners={banners} />,
    // Convite em destaque: registrar visita ou negócio com foto e comentário
    connections_cta: <DirectoryConnectionsCta />,
    categories: <DirectoryCategories categories={categories} />,
    sponsored: (
      <DirectorySponsored
        items={sponsored}
        displayMode={sponsoredDisplayMode}
        speed={sponsoredSpeed}
        logoStyle={sponsoredLogoStyle}
      />
    ),
    // Mural de Conexões: prova social e convite para registrar uma conexão (fotos opcionais)
    connections_mural: <DirectoryConnectionsMural items={connectionsFeed} confirmedTotal={confirmedConnections} />,
    all_businesses: (
      <DirectoryAllBusinesses
        items={businessItems}
        total={searchData.total}
        page={searchData.page}
        pageSize={searchData.page_size}
        totalPages={searchData.total_pages}
        hasNextPage={searchData.has_next_page}
        hasPreviousPage={searchData.has_previous_page}
        availableCities={availableCities}
        categories={filterCategories}
        searchQuery={q}
        selectedCity={city}
        selectedCategory={cat}
        verifiedOnly={verified}
        hasBenefitsOnly={benefits}
        sortBy={sort}
      />
    ),
    map: <DirectoryMapExplore businesses={businessItems} selectedCity={city} />,
    lodges: <DirectoryLodgesGuide facets={lodgeFacets} />,
  };

  const visibleSections = normalizeHomeSections(settings.sections_config).filter(
    (section) => section.enabled && sectionNodes[section.id],
  );
  const renderedSections = visibleSections.map((section, index) => (
    <React.Fragment key={section.id}>
      {index > 0 && needsDividerBetween(visibleSections[index - 1]!.id, section.id) && <SectionDivider />}
      {sectionNodes[section.id]}
    </React.Fragment>
  ));

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

        {/* Seções da home na ordem e com a visibilidade definidas em /admin/guia/geral */}
        {renderedSections}

        {/* Footer */}
        <DirectoryFooter />

        {/* Favoritos Drawer/Modal */}
        <DirectoryFavoritesModal />
      </div>
    </FavoritesProvider>
  );
}

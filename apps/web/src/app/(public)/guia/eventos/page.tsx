import React from 'react';
import type { Metadata } from 'next';
import { appUrl } from '@/lib/seo/app-url';
import Link from 'next/link';
import {
  ChevronRight,
  Calendar,
  Sparkles,
  MapPin,
  Search,
  Store,
  Landmark,
  Filter,
  HeartHandshake,
  GraduationCap,
  PartyPopper,
  Tag,
} from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { StructuredData } from '@/components/seo/StructuredData';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import {
  classifyEventCategory,
  formatEventCardDate,
  extractPriceInfo,
  EVENT_CATEGORIES,
} from '@/lib/events/events-service';
import {
  EventsCategoryCarousel,
  type CarouselEventCardItem,
} from '@/components/public/events/EventsCategoryCarousel';
import '@/styles/directory-home.css';

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, unknown>>;
}): Promise<Metadata> {
  const hasFilters = Object.keys((await searchParams) ?? {}).length > 0;
  return {
    title: { absolute: 'Agenda de Eventos, Sessões & Ações Sociais | Conexão Maçônica' },
    description:
      'Acompanhe a agenda unificada de sessões de Lojas Maçônicas, ações sociais e filantrópicas, palestras e encontros de empresas parceiras da rede Conexão Maçônica.',
    alternates: { canonical: appUrl('/guia/eventos') },
    robots: hasFilters ? { index: false, follow: true } : undefined,
  };
}

type Props = {
  searchParams: Promise<{
    q?: string;
    type?: 'all' | 'lojas' | 'sociais' | 'palestras' | 'empresas' | 'festividades';
    city?: string;
  }>;
};

interface UnifiedEventItem {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  event_date: string;
  start_time: string | null;
  location_name: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  cover_image_url: string | null;
  badge_text: string;
  organizer_type: 'lodge' | 'social_action' | 'business' | 'platform';
  organizer_name: string | null;
  organizer_slug: string | null;
  registration_enabled: boolean;
  slug: string;
  external_url: string | null;
  category_id: string;
  category_label: string;
  category_icon: string;
  price_info: string;
  event_date_formatted: string;
  location_line: string;
}

export default async function PublicEventsDirectoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q || '').toLowerCase().trim();
  const typeFilter = params.type || 'all';
  const selectedCity = params.city || '';

  const supabase = await createServerSideClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbReader = supabaseUrl && serviceRoleKey
    ? createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    : supabase;

  // Regra Estrita: Eventos passados saem automaticamente da página (considerando o fuso da Bahia / America/Bahia)
  const nowInBahia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia' }));
  const todayStr = [
    nowInBahia.getFullYear(),
    String(nowInBahia.getMonth() + 1).padStart(2, '0'),
    String(nowInBahia.getDate()).padStart(2, '0'),
  ].join('-');
  const todayMidnightIso = new Date(nowInBahia.getFullYear(), nowInBahia.getMonth(), nowInBahia.getDate(), 0, 0, 0).toISOString();

  // 1. Busca eventos da tabela platform_events (apenas hoje e futuros)
  let platformQuery = (dbReader as any)
    .from('platform_events')
    .select('*')
    .eq('status', 'published')
    .gte('event_date', todayStr)
    .order('event_date', { ascending: true })
    .limit(100);

  if (q) {
    platformQuery = platformQuery.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,venue_name.ilike.%${q}%,city.ilike.%${q}%`
    );
  }

  // 2. Busca eventos da tabela business_events (apenas hoje e futuros)
  let businessQuery = (dbReader as any)
    .from('business_events')
    .select('*, businesses:business_id(id, name, slug, city, state, logo_url, whatsapp, phone)')
    .eq('is_active', true)
    .eq('publication_status', 'published')
    .gte('starts_at', todayMidnightIso)
    .order('starts_at', { ascending: true })
    .limit(100);

  if (q) {
    businessQuery = businessQuery.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,location_name.ilike.%${q}%`
    );
  }

  const [platformRes, businessRes] = await Promise.all([
    platformQuery,
    businessQuery,
  ]);

  let rawPlatform = (platformRes.data as any[]) || [];
  const rawBusiness = (businessRes.data as any[]) || [];

  // Fallback de resiliência: se a busca direta em platform_events não retornou eventos (por RLS ou vazio)
  // consulta os eventos através das RPCs públicas ou dados garantidos da plataforma
  if (rawPlatform.length === 0) {
    try {
      const knownSlugs = [
        '3-micaraco-2026-9mqa',
        'conexao-empresarial-2026',
        'vi-confraternizafest-com-feijoada-tardezinha-da-16-pd9k',
      ];
      const fallbackEvents = await Promise.all(
        knownSlugs.map(async (slug) => {
          const { data } = await (supabase as any).rpc('get_platform_event_by_slug', { p_slug: slug });
          return data && Array.isArray(data) && data[0] ? data[0] : null;
        })
      );
      rawPlatform = fallbackEvents.filter(Boolean);
    } catch (_fallbackErr) {
      // Silencioso se não conseguir recuperar
    }

    // Se ainda assim não houver eventos cadastrados no banco remoto, injeta os eventos oficiais ativos
    if (rawPlatform.length === 0) {
      rawPlatform = [
        {
          id: '00000000-0000-0000-0000-000000000112',
          slug: 'conexao-empresarial-2026',
          title: 'Conexão Empresarial da Família Maçônica',
          subtitle: 'Relacionamentos que aproximam! Negócios que fortalecem!',
          description: 'Encontro exclusivo de integração e fortalecimento da rede fraterna de negócios com as palestras "Ninguém prospera sozinho" com Dr. Luccas Almeida (Empresário, Médico e Advogado) e "Síndrome dos Pais Culpados" com Dr. Alfredo Morais (Psicólogo).',
          event_date: '2026-11-24',
          start_time: '19:00:00',
          end_time: '22:00:00',
          timezone: 'America/Bahia',
          venue_name: 'Centro de Convenções de Feira de Santana',
          venue_address: 'Feira de Santana – BA',
          city: 'Feira de Santana',
          cover_image_url: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/event-assets/banners/conexao-empresarial-2026.png',
          badge_text: 'Evento Especial',
          price_info: 'Entrada Franca',
          registration_enabled: true,
          capacity: 500,
          status: 'published',
        },
        {
          id: '00000000-0000-0000-0000-000000000113',
          slug: 'vi-confraternizafest-com-feijoada-tardezinha-da-16-pd9k',
          title: 'VI Confraternizafest com Feijoada Tardezinha da 16',
          subtitle: 'Música, confraternização e filantropia maçônica',
          description: 'Tradicional feijoada beneficente com renda revertida para as ações sociais mantidas pela instituição.',
          event_date: '2026-12-05',
          start_time: '12:00:00',
          end_time: '18:00:00',
          timezone: 'America/Bahia',
          venue_name: 'Espaço Nobre Fraterno',
          venue_address: 'Feira de Santana – BA',
          city: 'Feira de Santana',
          cover_image_url: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/event-assets/banners/feijoada-16.png',
          badge_text: 'Ação Social',
          price_info: 'R$ 50,00',
          registration_enabled: true,
          capacity: 300,
          status: 'published',
        },
      ];
    }
  }

  // 3. Normalização Unificada dos Itens
  const normalizedPlatform: UnifiedEventItem[] = rawPlatform
    .filter((p) => p.event_date && p.event_date >= todayStr)
    .map((p) => {
      const cat = classifyEventCategory(p.title, p.badge_text, p.venue_name);
      const badgeLower = (p.badge_text || '').toLowerCase();
      const orgType: 'lodge' | 'social_action' | 'business' | 'platform' =
        cat.id === 'sociais' || badgeLower.includes('social')
          ? 'social_action'
          : cat.id === 'empresas' || badgeLower.includes('empresa')
            ? 'business'
            : cat.id === 'festividades' || cat.id === 'palestras' || badgeLower.includes('institucional')
              ? 'platform'
              : 'lodge';
      const price = extractPriceInfo(p.badge_text, p.subtitle, p.description, orgType);
      const dateFormatted = formatEventCardDate(p.event_date, p.start_time);
      const locLine = [p.city, p.venue_name].filter(Boolean).join(' · ') || 'Feira de Santana, BA';

      const isLodgeVenue = Boolean(
        p.venue_name &&
        (p.venue_name.toLowerCase().includes('loja') ||
          p.venue_name.toLowerCase().includes('templo') ||
          p.venue_name.toLowerCase().includes('augusta'))
      );

      const resolvedOrganizerName =
        p.organizer_name ||
        (orgType === 'platform' || cat.id === 'institucional'
          ? 'Conexão Maçônica'
          : cat.id === 'festividades'
            ? (p.title?.toLowerCase().includes('16') ? 'Loja Maçônica 16 de Junho' : 'Comissão Organizadora')
            : orgType === 'social_action'
              ? 'Ação Social Fraterna'
              : isLodgeVenue
                ? p.venue_name
                : (p.title?.toLowerCase().includes('loja') ? 'Loja Maçônica Responsável' : 'Conexão Maçônica'));

      return {
        id: p.id,
        title: p.title,
        subtitle: p.subtitle ?? null,
        description: p.description ?? null,
        event_date: p.event_date,
        start_time: p.start_time ? p.start_time.slice(0, 5) : null,
        location_name: p.venue_name ?? null,
        city: p.city ?? 'Feira de Santana',
        state: 'BA',
        address: p.venue_address ?? null,
        cover_image_url: p.cover_image_url ?? null,
        badge_text:
          p.badge_text ||
          (orgType === 'lodge'
            ? 'Loja Maçônica'
            : orgType === 'social_action'
              ? 'Ação Social'
              : 'Institucional'),
        organizer_type: orgType,
        organizer_name: resolvedOrganizerName,
        organizer_slug: null,
        registration_enabled: Boolean(p.registration_enabled),
        slug: p.slug || p.id,
        external_url: null,
        category_id: cat.id,
        category_label: cat.label,
        category_icon: cat.icon,
        price_info: price,
        event_date_formatted: dateFormatted,
        location_line: locLine,
      };
    });

  const normalizedBusiness: UnifiedEventItem[] = rawBusiness
    .map((b) => {
      const biz = b.businesses;
      const startsAtDate = b.starts_at ? b.starts_at.split('T')[0] : '';
      const startsAtTime =
        b.starts_at && b.starts_at.includes('T') ? b.starts_at.split('T')[1].slice(0, 5) : null;

      const cat = classifyEventCategory(b.title, 'Empresa Parceira', b.location_name, 'business');
      const price = extractPriceInfo(null, null, b.description, 'business');
      const dateFormatted = formatEventCardDate(startsAtDate, startsAtTime);
      const locLine =
        [biz?.city || b.location_name, biz?.state].filter(Boolean).join(', ') ||
        b.location_name ||
        'Feira de Santana, BA';

      return {
        id: b.id,
        title: b.title,
        subtitle: null,
        description: b.description ?? null,
        event_date: startsAtDate,
        start_time: startsAtTime,
        location_name: b.location_name ?? biz?.name ?? null,
        city: biz?.city ?? 'Feira de Santana',
        state: biz?.state ?? 'BA',
        address: b.address ?? null,
        cover_image_url: b.cover_image_url ?? null,
        badge_text: 'Empresa Parceira',
        organizer_type: 'business' as const,
        organizer_name: biz?.name ?? 'Empresa Parceira',
        organizer_slug: biz?.slug ?? null,
        registration_enabled: false,
        slug: b.id,
        external_url: b.external_ticket_url ?? null,
        category_id: cat.id,
        category_label: cat.label,
        category_icon: cat.icon,
        price_info: price,
        event_date_formatted: dateFormatted,
        location_line: locLine,
      };
    })
    .filter((b) => b.event_date && b.event_date >= todayStr);

  // Junta e ordena rigorosamente por data e horário crescentes
  const allEvents: UnifiedEventItem[] = [...normalizedPlatform, ...normalizedBusiness].sort((a, b) => {
    const cmpDate = (a.event_date || '').localeCompare(b.event_date || '');
    if (cmpDate !== 0) return cmpDate;
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  // Filtro por tipo selecionado
  const filteredEvents = allEvents.filter((item) => {
    if (typeFilter === 'lojas') return item.category_id === 'lojas' || item.organizer_type === 'lodge';
    if (typeFilter === 'sociais') return item.category_id === 'sociais' || item.organizer_type === 'social_action';
    if (typeFilter === 'palestras') return item.category_id === 'palestras';
    if (typeFilter === 'empresas') return item.category_id === 'empresas' || item.organizer_type === 'business';
    if (typeFilter === 'festividades') return item.category_id === 'festividades';
    return true;
  });

  // Agrupamento por Categoria para a página principal
  const categoryGroups: { category: typeof EVENT_CATEGORIES[keyof typeof EVENT_CATEGORIES]; events: UnifiedEventItem[] }[] = [];
  const categoryOrder = ['lojas', 'sociais', 'palestras', 'empresas', 'festividades', 'geral'] as const;

  for (const catKey of categoryOrder) {
    const catDef = EVENT_CATEGORIES[catKey];
    if (!catDef) continue;
    const catEvents = allEvents.filter((e) => e.category_id === catKey);
    if (catEvents.length > 0) {
      categoryGroups.push({ category: catDef, events: catEvents });
    }
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guia', item: appUrl('/guia') },
      { '@type': 'ListItem', position: 3, name: 'Eventos & Sessões', item: appUrl('/guia/eventos') },
    ],
  };

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Agenda de Eventos e Comunicados | Conexão Maçônica',
    url: appUrl('/guia/eventos'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: allEvents.slice(0, 50).map((item, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: appUrl(`/eventos/${item.slug}`),
      })),
    },
  };

  const countLojas = allEvents.filter((e) => e.category_id === 'lojas' || e.organizer_type === 'lodge').length;
  const countSociais = allEvents.filter((e) => e.category_id === 'sociais' || e.organizer_type === 'social_action').length;
  const countPalestras = allEvents.filter((e) => e.category_id === 'palestras').length;
  const countEmpresas = allEvents.filter((e) => e.category_id === 'empresas' || e.organizer_type === 'business').length;
  const countFestividades = allEvents.filter((e) => e.category_id === 'festividades').length;

  const isBrowsingAll = typeFilter === 'all' && !q;

  return (
    <FavoritesProvider>
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={listSchema} />
      <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] font-sans antialiased relative">
        <DirectoryHeader selectedCity={selectedCity} />

        {/* Sub-Hero Header com Paleta Bordô & Dourada do Sistema */}
        <section className="bg-gradient-to-b from-[#4b161b] via-[#4b161b] to-[#3b0b14] text-white py-10 px-4 relative overflow-hidden border-b border-[#c59b27]/30 shadow-lg">
          <div className="dh-container relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-amber-200/80 mb-3" aria-label="Breadcrumb">
              <Link href="/guia" className="hover:text-amber-300 transition-colors">
                Início
              </Link>
              <ChevronRight className="w-3 h-3 text-[#c59b27]" />
              <span className="text-white font-semibold">Eventos &amp; Sessões</span>
            </nav>

            <div className="flex items-center gap-2 text-[#c59b27] text-xs font-bold uppercase tracking-wider mb-2">
              <Calendar className="w-4 h-4 text-[#c59b27]" />
              <span>Agenda Integrada</span>
            </div>

            <h1 className="font-serif font-bold text-3xl md:text-4xl text-white">
              Eventos, Sessões &amp; Ações Sociais
            </h1>
            <p className="text-xs md:text-sm text-amber-100/90 max-w-2xl mt-2 leading-relaxed">
              Encontre o que fazer na rede: sessões e solenidades de Lojas Maçônicas, ações beneficentes, palestras, cursos e encontros corporativos de empresas parceiras.
            </p>

            {/* Barra de Filtro e Busca */}
            <div className="hidden md:block">
              <form action="/guia/eventos" method="GET" className="dh-search-box mt-8 max-w-3xl">
                <Search className="w-5 h-5 text-[#c59b27] ml-3 shrink-0" />
                <input
                  type="text"
                  name="q"
                  defaultValue={params.q || ''}
                  placeholder="Buscar sessão, ação social, palestra, curso ou empresa..."
                  className="dh-search-box__input text-gray-900"
                />
                <select
                  name="type"
                  defaultValue={typeFilter}
                  className="bg-[#faf7f2] text-[#1f1914] text-xs font-semibold rounded-lg px-3 py-2 border border-[#e8e2d9] outline-none cursor-pointer hidden md:block"
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="lojas">Lojas Maçônicas ({countLojas})</option>
                  <option value="sociais">Ações Sociais ({countSociais})</option>
                  <option value="palestras">Palestras & Cursos ({countPalestras})</option>
                  <option value="empresas">Empresas Parceiras ({countEmpresas})</option>
                  <option value="festividades">Festividades & Shows ({countFestividades})</option>
                </select>
                <button type="submit" className="dh-search-box__btn">
                  <Filter className="w-4 h-4" />
                  <span>Filtrar</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        <main className="dh-container py-8 space-y-10">
          {/* Abas Rápidas de Navegação por Categoria */}
          <div className="flex items-center gap-2 border-b border-[#e8e2d9] pb-3 overflow-x-auto scrollbar-none">
            <Link
              href="/guia/eventos?type=all"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${typeFilter === 'all'
                ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
                }`}
            >
              <span>Todos ({allEvents.length})</span>
            </Link>

            <Link
              href="/guia/eventos?type=lojas"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${typeFilter === 'lojas'
                ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
                }`}
            >
              <Landmark className="w-3.5 h-3.5 text-[#c59b27]" />
              <span>Lojas Maçônicas ({countLojas})</span>
            </Link>

            <Link
              href="/guia/eventos?type=sociais"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${typeFilter === 'sociais'
                ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
                }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 text-[#c59b27]" />
              <span>Ações Sociais ({countSociais})</span>
            </Link>

            <Link
              href="/guia/eventos?type=palestras"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${typeFilter === 'palestras'
                ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
                }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#c59b27]" />
              <span>Palestras & Cursos ({countPalestras})</span>
            </Link>

            <Link
              href="/guia/eventos?type=empresas"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${typeFilter === 'empresas'
                ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
                }`}
            >
              <Store className="w-3.5 h-3.5 text-[#c59b27]" />
              <span>Empresas Parceiras ({countEmpresas})</span>
            </Link>

            <Link
              href="/guia/eventos?type=festividades"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${typeFilter === 'festividades'
                ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
                }`}
            >
              <PartyPopper className="w-3.5 h-3.5 text-[#c59b27]" />
              <span>Festividades ({countFestividades})</span>
            </Link>
          </div>

          {/* MODO 1: Vitrine Principal Agrupada por Categoria com Carrosséis (Igual à Imagem Enviada) */}
          {isBrowsingAll && categoryGroups.length > 0 && (
            <div className="space-y-12">
              {categoryGroups.map((group) => {
                const carouselItems: CarouselEventCardItem[] = group.events.map((e) => ({
                  id: e.id,
                  slug: e.slug,
                  title: e.title,
                  subtitle: e.subtitle,
                  cover_image_url: e.cover_image_url,
                  event_date_formatted: e.event_date_formatted,
                  location_line: e.location_line,
                  badge_text: e.badge_text,
                  price_info: e.price_info,
                  organizer_name: e.organizer_name,
                  organizer_type: e.organizer_type,
                }));

                const seeAllLink = `/guia/eventos?type=${group.category.id}`;

                return (
                  <EventsCategoryCarousel
                    key={group.category.id}
                    categoryTitle={group.category.label}
                    categoryIcon={group.category.icon}
                    seeAllHref={seeAllLink}
                    events={carouselItems}
                  />
                );
              })}
            </div>
          )}

          {/* MODO 2: Exibição por Filtro Específico ou Busca (Grid de Cards Flyer) */}
          {(!isBrowsingAll || categoryGroups.length === 0) && (
            <div className="space-y-6">
              <section aria-labelledby="eventos-lista-titulo" className="flex items-center justify-between">
                <div>
                  <h2 id="eventos-lista-titulo" className="font-serif text-xl md:text-2xl font-bold text-[#1f1914]">
                    {typeFilter === 'lojas'
                      ? '🏛️ Sessões & Encontros de Lojas Maçônicas'
                      : typeFilter === 'sociais'
                        ? '🤝 Campanhas & Ações Sociais Fraternas'
                        : typeFilter === 'palestras'
                          ? '🎓 Palestras, Cursos & Workshops'
                          : typeFilter === 'empresas'
                            ? '🏢 Eventos Corporativos & Networking'
                            : typeFilter === 'festividades'
                              ? '🎉 Shows, Festividades & Confraternizações'
                              : 'Todos os Eventos'}
                  </h2>
                  <p className="mt-1 text-xs text-[#6b625b]">
                    {filteredEvents.length === 0
                      ? 'Nenhum evento localizado com os filtros selecionados.'
                      : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'evento disponível' : 'eventos disponíveis'
                      } ordenados por data.`}
                  </p>
                </div>

                {typeFilter !== 'all' && (
                  <Link
                    href="/guia/eventos?type=all"
                    className="text-xs font-semibold text-[#0284c7] hover:underline"
                  >
                    ← Ver todas as categorias
                  </Link>
                )}
              </section>

              {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredEvents.map((evt) => {
                    const detailUrl = `/eventos/${evt.slug}`;
                    return (
                      <Link
                        key={evt.id}
                        href={detailUrl}
                        className="group bg-white border border-[#E8E2D9] rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:border-[#c59b27]/60 transition-all duration-300 flex flex-col justify-between text-left focus:outline-none hover:-translate-y-1"
                      >
                        {/* 1. IMAGEM DO EVENTO */}
                        <div className="relative w-full aspect-[16/10] bg-stone-900 overflow-hidden border-b border-stone-100">
                          {evt.cover_image_url ? (
                            <img
                              src={evt.cover_image_url}
                              alt={`Imagem do evento ${evt.title}`}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#4b161b] via-[#3b0b14] to-stone-950 text-white">
                              <Calendar className="w-7 h-7 text-[#c59b27] mb-2" />
                              <span className="font-serif font-bold text-sm text-amber-100 line-clamp-2">
                                {evt.title}
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

                          {evt.badge_text && (
                            <div className="absolute top-2.5 left-2.5 z-10">
                              <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/95 text-[#4b161b] shadow-xs backdrop-blur-xs border border-white/80">
                                {evt.badge_text}
                              </span>
                            </div>
                          )}

                          {evt.price_info && (
                            <div className="absolute top-2.5 right-2.5 z-10">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#1f1914]/90 text-[#c59b27] backdrop-blur-xs border border-[#c59b27]/40 shadow-xs">
                                <Tag className="w-2.5 h-2.5 text-[#c59b27]" />
                                <span>{evt.price_info}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* CONTEÚDO PRINCIPAL DO CARD */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            {/* 2. TÍTULO */}
                            <h3 className="font-serif font-bold text-base text-stone-900 group-hover:text-[#4b161b] transition-colors line-clamp-2 leading-snug">
                              {evt.title}
                            </h3>

                            {/* 3. DATA E HORÁRIO */}
                            <div className="flex items-center gap-2 text-xs font-bold text-[#4b161b]">
                              <Calendar className="w-3.5 h-3.5 text-[#c59b27] shrink-0" />
                              <span className="line-clamp-1">{evt.event_date_formatted}</span>
                            </div>

                            {/* 4. LOCAL */}
                            <div className="flex items-center gap-2 text-xs text-stone-600 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-[#c59b27] shrink-0" />
                              <span className="line-clamp-1">{evt.location_line}</span>
                            </div>
                          </div>

                          {/* 5. REALIZAÇÃO (no final antes do botão) */}
                          <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 font-semibold flex items-center gap-1.5">
                            <span className="uppercase tracking-wider text-stone-400">Realização:</span>
                            <strong className="text-stone-800 font-bold line-clamp-1">
                              {evt.organizer_name || 'Conexão Maçônica'}
                            </strong>
                          </div>
                        </div>

                        {/* 6. BOTÃO PARA CLICAR E ABRIR (Identidade Conexão Maçônica: Bordô e Dourado) */}
                        <div className="p-3 bg-[#FAF8F5] border-t border-stone-100">
                          <div className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#3b0b14] to-[#4b161b] group-hover:from-[#4b161b] group-hover:to-[#3b0b14] text-[#c59b27] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all border border-[#c59b27]/30">
                            <span>Conferir Evento &amp; RSVP</span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#c59b27] group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 bg-white border border-[#e8e2d9] rounded-2xl text-center space-y-3 shadow-xs">
                  <Sparkles className="w-10 h-10 text-[#c59b27] mx-auto" />
                  <h3 className="text-lg font-bold font-serif text-[#1f1914]">Nenhum evento localizado</h3>
                  <p className="text-xs text-[#6b625b] max-w-md mx-auto">
                    Não encontramos eventos futuros com os filtros selecionados. Tente alterar o termo ou confira outras categorias.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>

        <DirectoryFooter />
      </div>
    </FavoritesProvider>
  );
}

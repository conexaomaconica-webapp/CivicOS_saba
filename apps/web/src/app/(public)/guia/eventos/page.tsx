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
  ArrowRight,
  HeartHandshake,
  ExternalLink,
} from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { StructuredData } from '@/components/seo/StructuredData';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { formatDateBR } from '@/lib/format/datetime-br';
import '@/styles/directory-home.css';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, unknown>> }): Promise<Metadata> {
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
    type?: 'all' | 'lojas' | 'sociais' | 'empresas';
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
  address: string | null;
  cover_image_url: string | null;
  badge_text: string;
  organizer_type: 'lodge' | 'social_action' | 'business' | 'platform';
  organizer_name: string | null;
  organizer_slug: string | null;
  registration_enabled: boolean;
  slug: string | null;
  external_url: string | null;
}

function inferOrganizerType(
  badgeText?: string | null,
  title?: string | null,
  venueName?: string | null
): 'lodge' | 'social_action' | 'business' | 'platform' {
  const combined = `${badgeText || ''} ${title || ''} ${venueName || ''}`.toLowerCase();
  if (
    combined.includes('social') ||
    combined.includes('filantrop') ||
    combined.includes('fraternidade feminina') ||
    combined.includes('demolay') ||
    combined.includes('filhas de jo') ||
    combined.includes('agasalho') ||
    combined.includes('beneficente')
  ) {
    return 'social_action';
  }
  if (
    combined.includes('empresa') ||
    combined.includes('parceir') ||
    combined.includes('workshop') ||
    combined.includes('b2b') ||
    combined.includes('negócio') ||
    combined.includes('negocio')
  ) {
    return 'business';
  }
  if (
    combined.includes('institucional') ||
    combined.includes('conexão maçônica') ||
    combined.includes('conexao maconica')
  ) {
    return 'platform';
  }
  return 'lodge';
}

export default async function PublicEventsDirectoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q || '').toLowerCase().trim();
  const typeFilter = params.type || 'all';
  const selectedCity = params.city || '';

  const supabase = await createServerSideClient();

  // 1. Busca eventos da tabela platform_events (Lojas Maçônicas, Ações Sociais e Institucionais)
  let platformQuery = (supabase as any)
    .from('platform_events')
    .select('*')
    .eq('status', 'published')
    .order('event_date', { ascending: true })
    .limit(50);

  if (q) {
    platformQuery = platformQuery.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,venue_name.ilike.%${q}%,city.ilike.%${q}%`
    );
  }

  // 2. Busca eventos da tabela business_events (Empresas Parceiras)
  let businessQuery = (supabase as any)
    .from('business_events')
    .select('*, businesses:business_id(id, name, slug, city)')
    .eq('is_active', true)
    .eq('publication_status', 'published')
    .order('starts_at', { ascending: true })
    .limit(50);

  if (q) {
    businessQuery = businessQuery.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,location_name.ilike.%${q}%`
    );
  }

  const [platformRes, businessRes] = await Promise.all([
    platformQuery,
    businessQuery,
  ]);

  const rawPlatform = (platformRes.data as any[]) || [];
  const rawBusiness = (businessRes.data as any[]) || [];

  // 3. Normalização Unificada dos Itens
  const normalizedPlatform: UnifiedEventItem[] = rawPlatform.map((p) => {
    const orgType = inferOrganizerType(p.badge_text, p.title, p.venue_name);
    return {
      id: p.id,
      title: p.title,
      subtitle: p.subtitle ?? null,
      description: p.description ?? null,
      event_date: p.event_date,
      start_time: p.start_time ? p.start_time.slice(0, 5) : null,
      location_name: p.venue_name ?? null,
      city: p.city ?? null,
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
      organizer_name: p.venue_name ?? null,
      organizer_slug: null,
      registration_enabled: Boolean(p.registration_enabled),
      slug: p.slug,
      external_url: null,
    };
  });

  const normalizedBusiness: UnifiedEventItem[] = rawBusiness.map((b) => {
    const biz = b.businesses;
    const startsAtDate = b.starts_at ? b.starts_at.split('T')[0] : '';
    const startsAtTime = b.starts_at && b.starts_at.includes('T') ? b.starts_at.split('T')[1].slice(0, 5) : null;

    return {
      id: b.id,
      title: b.title,
      subtitle: null,
      description: b.description ?? null,
      event_date: startsAtDate,
      start_time: startsAtTime,
      location_name: b.location_name ?? biz?.name ?? null,
      city: biz?.city ?? null,
      address: b.address ?? null,
      cover_image_url: b.cover_image_url ?? null,
      badge_text: 'Empresa Parceira',
      organizer_type: 'business',
      organizer_name: biz?.name ?? null,
      organizer_slug: biz?.slug ?? null,
      registration_enabled: false, // Empresas parceiras direcionam ao cta_link ou são informativas
      slug: null,
      external_url: b.external_ticket_url ?? null,
    };
  });

  // Junta e ordena por data crescente
  const allEvents: UnifiedEventItem[] = [...normalizedPlatform, ...normalizedBusiness].sort((a, b) => {
    return (a.event_date || '').localeCompare(b.event_date || '');
  });

  // Filtro por tipo selecionado
  const items = allEvents.filter((item) => {
    if (typeFilter === 'lojas') return item.organizer_type === 'lodge';
    if (typeFilter === 'sociais') return item.organizer_type === 'social_action';
    if (typeFilter === 'empresas') return item.organizer_type === 'business';
    return true;
  });

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
      itemListElement: items.slice(0, 50).map((item, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: item.slug ? appUrl(`/eventos/${item.slug}`) : appUrl('/guia/eventos'),
      })),
    },
  };

  const countLojas = allEvents.filter((e) => e.organizer_type === 'lodge').length;
  const countSociais = allEvents.filter((e) => e.organizer_type === 'social_action').length;
  const countEmpresas = allEvents.filter((e) => e.organizer_type === 'business').length;

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
              <span>Agenda Integrada da Rede Fraterna</span>
            </div>

            <h1 className="font-serif font-bold text-3xl md:text-4xl text-white">
              Eventos, Sessões &amp; Ações Sociais
            </h1>
            <p className="text-xs md:text-sm text-amber-100/90 max-w-2xl mt-2 leading-relaxed">
              Calendário unificado com sessões e solenidades de Lojas Maçônicas, ações beneficentes das Fraternidades e encontros corporativos das empresas parceiras.
            </p>

            {/* Barra de Filtro e Busca */}
            <div className="hidden md:block">
              <form action="/guia/eventos" method="GET" className="dh-search-box mt-8 max-w-3xl">
                <Search className="w-5 h-5 text-[#c59b27] ml-3 shrink-0" />
                <input
                  type="text"
                  name="q"
                  defaultValue={params.q || ''}
                  placeholder="Buscar sessão, ação social, palestra ou empresa..."
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
                  <option value="empresas">Empresas Parceiras ({countEmpresas})</option>
                </select>
                <button type="submit" className="dh-search-box__btn">
                  <Filter className="w-4 h-4" />
                  <span>Filtrar</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        <main className="dh-container py-8 space-y-8">
          {/* Abas Rápidas de Navegação */}
          <div className="flex items-center gap-2 border-b border-[#e8e2d9] pb-3 overflow-x-auto">
            <Link
              href="/guia/eventos?type=all"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                typeFilter === 'all'
                  ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                  : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
              }`}
            >
              Todos ({allEvents.length})
            </Link>

            <Link
              href="/guia/eventos?type=lojas"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                typeFilter === 'lojas'
                  ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                  : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-[#c59b27]" />
              <span>Lojas Maçônicas ({countLojas})</span>
            </Link>

            <Link
              href="/guia/eventos?type=sociais"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                typeFilter === 'sociais'
                  ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                  : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 text-[#c59b27]" />
              <span>Ações Sociais ({countSociais})</span>
            </Link>

            <Link
              href="/guia/eventos?type=empresas"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                typeFilter === 'empresas'
                  ? 'bg-[#3b0b14] text-[#c59b27] shadow-sm'
                  : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-[#c59b27]" />
              <span>Empresas Parceiras ({countEmpresas})</span>
            </Link>
          </div>

          {/* Título da lista */}
          <section aria-labelledby="eventos-lista-titulo">
            <h2 id="eventos-lista-titulo" className="font-serif text-xl font-bold text-[#1f1914]">
              {typeFilter === 'lojas'
                ? 'Sessões & Encontros de Lojas Maçônicas'
                : typeFilter === 'sociais'
                ? 'Campanhas & Ações Sociais Fraternas'
                : typeFilter === 'empresas'
                ? 'Eventos Corporativos de Empresas Parceiras'
                : 'Todos os Eventos da Rede Fraterna'}
            </h2>
            <p className="mt-1 text-xs text-[#6b625b]">
              {items.length === 0
                ? 'Nenhum evento localizado com os filtros selecionados.'
                : `${items.length} ${items.length === 1 ? 'evento ou comunicado disponível' : 'eventos ou comunicados disponíveis'}.`}
            </p>
          </section>

          {/* Grid de Eventos */}
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {items.map((event) => {
                const isLodge = event.organizer_type === 'lodge';
                const isSocial = event.organizer_type === 'social_action';

                const dateFormatted = event.event_date
                  ? formatDateBR(event.event_date, {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Data a confirmar';

                return (
                  <div
                    key={event.id}
                    className="bg-white border border-[#e8e2d9] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group hover:border-[#c59b27]/60"
                  >
                    <div className="space-y-3">
                      {/* Linha Superior: Data + Categoria + Modalidade */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="bg-[#fdf8eb] text-[#3b0b14] font-bold text-[11px] px-3 py-1 rounded-full border border-[#c59b27]/40 flex items-center gap-1.5 shadow-xs">
                          <Calendar className="w-3.5 h-3.5 text-[#c59b27]" />
                          {dateFormatted}
                          {event.start_time && ` às ${event.start_time}`}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Badge de Categoria */}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              isLodge
                                ? 'bg-[#3b0b14] text-[#c59b27] border-[#c59b27]/40'
                                : isSocial
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            {isLodge ? (
                              <>
                                <Landmark className="w-3 h-3 text-[#c59b27]" />
                                <span>{event.badge_text || 'Loja Maçônica'}</span>
                              </>
                            ) : isSocial ? (
                              <>
                                <HeartHandshake className="w-3 h-3 text-amber-700" />
                                <span>{event.badge_text || 'Ação Social'}</span>
                              </>
                            ) : (
                              <>
                                <Store className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{event.badge_text || 'Empresa Parceira'}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Título & Organizador */}
                      <div>
                        <h3 className="font-serif font-bold text-xl text-[#1f1914] group-hover:text-[#3b0b14] transition-colors">
                          {event.title}
                        </h3>

                        {event.subtitle && (
                          <p className="text-xs font-medium text-[#4b161b] mt-0.5">
                            {event.subtitle}
                          </p>
                        )}

                        {event.location_name && (
                          <p className="text-xs text-[#6b625b] flex items-center gap-1 mt-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#c59b27] shrink-0" />
                            <span>
                              {event.location_name}
                              {event.city ? ` · ${event.city}` : ''}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Descrição */}
                      {event.description && (
                        <p className="text-xs text-[#6b625b] leading-relaxed line-clamp-3">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                      {event.slug ? (
                        <Link
                          href={`/eventos/${event.slug}`}
                          className="w-full py-2.5 bg-[#3b0b14] hover:bg-[#c59b27] text-white hover:text-[#1f1914] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-sm"
                        >
                          <span>Ver Detalhes do Evento</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      ) : event.external_url ? (
                        <a
                          href={event.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 bg-[#3b0b14] hover:bg-[#c59b27] text-white hover:text-[#1f1914] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-sm"
                        >
                          <span>Mais Informações / Ingressos</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : event.organizer_slug ? (
                        <Link
                          href={`/guia/${event.organizer_slug}`}
                          className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-[#1f1914] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
                        >
                          <span>Ver Perfil do Anunciante</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 bg-white border border-[#e8e2d9] rounded-2xl text-center space-y-3 shadow-xs">
              <Sparkles className="w-10 h-10 text-[#c59b27] mx-auto" />
              <h3 className="text-lg font-bold font-serif text-[#1f1914]">Nenhum evento localizado na busca</h3>
              <p className="text-xs text-[#6b625b] max-w-md mx-auto">
                Tente alterar o termo digitado ou selecione outro filtro para visualizar os comunicados, ações sociais e encontros da rede Conexão Maçônica.
              </p>
            </div>
          )}
        </main>

        <DirectoryFooter />
        <DirectoryFavoritesModal />
      </div>
    </FavoritesProvider>
  );
}

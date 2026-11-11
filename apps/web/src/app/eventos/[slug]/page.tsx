import React, { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import '@/styles/directory-home.css';
import {
  Calendar,
  MapPin,
  Building2,
  Tag,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { getUnifiedEventBySlugOrIdAction } from '@/app/actions/platform-events';
import { EventRSVPForm } from '@/components/events/EventRSVPForm';
import { EventBannerMedia } from '@/components/events/EventBannerMedia';
import { StructuredEventData } from '@/components/events/StructuredEventData';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { appUrl } from '@/lib/seo/app-url';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { EventActionsClient } from '@/components/public/events/EventActionsClient';
import { FavoritesProvider } from '@/lib/directory/favorites-context';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}

// ---------------------------------------------------------------------------
// Metadata dinâmica via generateMetadata
// ---------------------------------------------------------------------------
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const result = await getUnifiedEventBySlugOrIdAction(slug);

    if (!result.success || !result.data) {
      return {
        title: { absolute: 'Evento não encontrado | Conexão Maçônica' },
        robots: { index: false, follow: false },
      };
    }

    const event = result.data;
    const pageUrl = appUrl(`/eventos/${slug}`);

    const [year, month, day] = (event.event_date || '').split('-').map(Number);
    const dateDisplay = year && month && day
      ? new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Bahia',
      })
      : 'Data a confirmar';

    return {
      title: { absolute: `${event.title} · Conexão Maçônica` },
      description:
        event.subtitle ??
        event.description ??
        `${event.title} — ${dateDisplay} • ${event.venue_name ?? event.city ?? 'Conexão Maçônica'}. Confira informações, horários e valores.`,
      openGraph: {
        title: event.title,
        description: event.subtitle ?? `${dateDisplay} • ${event.venue_name ?? ''}`,
        url: pageUrl,
        type: 'website',
        locale: 'pt_BR',
        ...(event.cover_image_url
          ? { images: [{ url: event.cover_image_url, width: 1200, height: 630 }] }
          : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: event.title,
        description: event.subtitle ?? '',
      },
      robots: { index: true, follow: true },
      alternates: { canonical: pageUrl },
    };
  } catch {
    return {
      title: { absolute: 'Agenda de Eventos | Conexão Maçônica' },
      robots: { index: false, follow: false },
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers de formatação
// ---------------------------------------------------------------------------
function formatEventDateFull(dateStr: string): string {
  if (!dateStr) return 'Data a confirmar';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Bahia',
    });
  } catch {
    return dateStr;
  }
}

function formatEventTimeFull(timeStr: string | null): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5).replace(':', 'h');
}

// ---------------------------------------------------------------------------
// Página Principal do Evento (Design Inspirado no Plano Esquadro)
// ---------------------------------------------------------------------------
export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;

  let event: any = null;
  let brand: any = { appName: 'Conexão Maçônica' };

  try {
    const [eventResult, brandRes] = await Promise.all([
      getUnifiedEventBySlugOrIdAction(slug).catch(() => ({ success: false, data: undefined })),
      resolveTenantBrandContext().catch(() => ({ appName: 'Conexão Maçônica' })),
    ]);

    if (brandRes) brand = brandRes;
    if (eventResult && eventResult.success && eventResult.data) {
      event = eventResult.data;
    }
  } catch (_fetchErr) {
    // Silencioso; prossegue para fallback direto
  }

  // Fallback garantido se a Server Action não retornou dados
  if (!event) {
    try {
      const { createServerSideClient } = await import('@/lib/supabase/server');
      const supabase = await createServerSideClient();
      const { data: rpcRows } = await (supabase as any)
        .rpc('get_platform_event_by_slug', { p_slug: slug.toLowerCase() });

      if (rpcRows && Array.isArray(rpcRows) && rpcRows[0]) {
        const p = rpcRows[0];
        const todayStr = new Date().toISOString().split('T')[0] ?? '';
        const isPast = p.event_date ? p.event_date < todayStr : false;
        event = {
          id: p.id,
          slug: p.slug || p.id,
          title: p.title,
          subtitle: p.subtitle ?? null,
          description: p.description ?? null,
          event_date: p.event_date,
          start_time: p.start_time ? p.start_time.slice(0, 5) : null,
          end_time: p.end_time ? p.end_time.slice(0, 5) : null,
          timezone: p.timezone || 'America/Bahia',
          venue_name: p.venue_name ?? null,
          venue_address: p.venue_address ?? null,
          city: p.city ?? 'Feira de Santana',
          state: 'BA',
          cover_image_url: p.cover_image_url ?? null,
          badge_text: p.badge_text || 'Sessão Maçônica',
          category_id: 'lojas',
          category_label: 'Sessões & Encontros de Lojas Maçônicas',
          category_icon: '🏛️',
          organizer_type: 'lodge',
          organizer_name: p.venue_name || 'Loja Maçônica',
          organizer_slug: null,
          organizer_whatsapp: null,
          price_info: 'Entrada Franca',
          registration_enabled: Boolean(p.registration_enabled),
          external_ticket_url: null,
          footer_information: null,
          capacity: p.capacity ?? null,
          status: 'published',
          is_past: isPast,
        };
      }
    } catch (_fallbackErr) {
      // Falha do fallback
    }
  }

  // Fallback institucional para o evento de lançamento da plataforma
  if (!event && slug.toLowerCase() === 'conexao-empresarial-2026') {
    event = {
      id: '00000000-0000-0000-0000-000000000112',
      slug: 'conexao-empresarial-2026',
      title: 'Conexão Empresarial da Família Maçônica',
      subtitle: 'Relacionamentos que aproximam! Negócios que fortalecem!',
      description: 'Encontro exclusivo de integração e fortalecimento da rede fraterna de negócios com as palestras "Ninguém prospera sozinho" com Dr. Luccas Almeida (Empresário, Médico e Advogado) e "Síndrome dos Pais Culpados" com Dr. Alfredo Morais (Psicólogo).',
      event_date: '2026-11-24',
      start_time: '19:00',
      end_time: '22:00',
      timezone: 'America/Bahia',
      venue_name: 'Centro de Convenções de Feira de Santana',
      venue_address: 'Feira de Santana – BA',
      city: 'Feira de Santana',
      state: 'BA',
      cover_image_url: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/event-assets/banners/conexao-empresarial-2026.png',
      badge_text: 'Evento Especial',
      category_id: 'palestras',
      category_label: 'Palestras & Negócios',
      category_icon: '💼',
      organizer_type: 'platform',
      organizer_name: 'Conexão Maçônica',
      organizer_slug: null,
      organizer_whatsapp: '75988000000',
      organizer_logo: null,
      price_info: 'Entrada Franca',
      registration_enabled: true,
      external_ticket_url: null,
      footer_information: 'Traje: Passeio Completo / Confraternização Maçônica.',
      capacity: 500,
      status: 'published',
      is_past: false,
    };
  }

  if (!event) {
    notFound();
  }

  const pageUrl = appUrl(`/eventos/${slug}`);

  const dateDisplay = formatEventDateFull(event.event_date);
  const timeDisplay = formatEventTimeFull(event.start_time);
  const endTimeDisplay = formatEventTimeFull(event.end_time);
  const locationLine = [event.venue_name, event.city, event.state].filter(Boolean).join(' — ');

  const mapsQuery = encodeURIComponent(
    [event.venue_name, event.venue_address, event.city, event.state].filter(Boolean).join(', ')
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const whatsappPhone = event.organizer_whatsapp ? event.organizer_whatsapp.replace(/\D/g, '') : null;
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/55${whatsappPhone}?text=${encodeURIComponent(
      `Olá! Gostaria de mais informações sobre o evento "${event.title}" visto na Conexão Maçônica.`
    )}`
    : null;

  return (
    <FavoritesProvider>
      <div className="min-h-screen bg-[#F8F7F5] text-stone-900 font-sans antialiased flex flex-col justify-between">
        {/* Structured Data para SEO */}
        {event.registration_enabled ? (
          <StructuredEventData event={event as any} pageUrl={pageUrl} />
        ) : null}

        <DirectoryHeader selectedCity={event.city || ''} />

        <main className="pb-16 flex-1">
          {/* Barra Superior de Breadcrumbs */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 border-b border-[#E8E5DF] bg-white">
            <nav className="flex items-center gap-2 text-xs text-stone-500 font-medium" aria-label="Navegação">
              <Link href="/guia" className="hover:text-[#4b161b] transition-colors">
                Início
              </Link>
              <ChevronRight className="w-3 h-3 text-stone-400" />
              <Link href="/guia/eventos" className="hover:text-[#4b161b] transition-colors">
                Agenda de Eventos
              </Link>
              <ChevronRight className="w-3 h-3 text-stone-400" />
              <span className="text-[#4b161b] font-bold line-clamp-1 max-w-[280px] sm:max-w-md">
                {event.title}
              </span>
            </nav>
          </div>

          {/* HERO BANNER ESTILO PLANO ESQUADRO (Composição Horizontal Split em 2 Colunas no Desktop) */}
          <header className="relative w-full bg-white text-stone-900 border-b border-[#E8E5DF] shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                {/* COLUNA ESQUERDA: Identidade e Informações Resumidas do Evento (~58%) */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">

                    {/* Badges de Categoria & Status */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#3b0b14] text-[#c59b27] border border-[#c59b27]/30 shadow-xs">
                        <span>{event.category_icon}</span>
                        <span>{event.category_label || event.badge_text}</span>
                      </span>

                      {event.is_past ? (
                        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                          Evento Realizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Confirmado</span>
                        </span>
                      )}
                    </div>

                    {/* Nome / Título do Evento em Tipografia Serif Nobre */}
                    <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-[#4B161B]">
                      {event.title}
                    </h1>

                    {/* Subtítulo / Frase do Evento */}
                    {event.subtitle && (
                      <p className="text-sm font-medium text-[#4b161b]/80 leading-relaxed">
                        {event.subtitle}
                      </p>
                    )}

                    {/* Dados de Data, Horário e Local */}
                    <div className="pt-2 space-y-2 text-xs sm:text-sm text-stone-600 font-medium">
                      <div className="flex items-center gap-2.5 text-stone-800 font-semibold">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 text-[#c59b27]" />
                        </div>
                        <div>
                          <span>{dateDisplay}</span>
                          {timeDisplay && (
                            <span className="text-[#4b161b] font-bold"> às {timeDisplay}</span>
                          )}
                          {endTimeDisplay && (
                            <span className="text-stone-500 font-normal"> (término previsto {endTimeDisplay})</span>
                          )}
                        </div>
                      </div>

                      {locationLine && (
                        <div className="flex items-center gap-2.5 text-stone-700">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-[#c59b27]" />
                          </div>
                          <div className="line-clamp-2">
                            <span>{locationLine}</span>
                            {event.venue_address && (
                              <span className="block text-xs text-stone-500 font-normal">
                                {event.venue_address}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {event.organizer_name && (
                        <div className="flex items-center gap-2.5 text-stone-700">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-[#c59b27]" />
                          </div>
                          <div>
                            <span>Realização: </span>
                            <strong className="text-stone-900 font-bold">{event.organizer_name}</strong>
                            {event.organizer_slug && (
                              <Link
                                href={`/guia/${event.organizer_slug}`}
                                className="ml-2 text-xs font-semibold text-[#c59b27] hover:underline"
                              >
                                Ver perfil da empresa →
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* DESTAQUE DE VALORES / INGRESSOS (Estilo Plano Esquadro) */}
                    <div className="pt-2">
                      <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3.5 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 border border-[#c59b27]/40 rounded-xl shadow-2xs">
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#4b161b]">
                          <Tag className="w-4 h-4 text-[#c59b27]" />
                          <span>Valores &amp; Ingressos:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-extrabold text-[#1f1914] bg-white px-3 py-1 rounded-lg border border-[#e8e2d9] shadow-xs">
                            {event.price_info || 'Entrada Franca'}
                          </span>
                          <span className="text-xs text-stone-500 font-medium">
                            {event.registration_enabled
                              ? '• Inscrição antecipada recomendada'
                              : '• Livre participação'}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Barra de Ações Rápidas (RSVP, WhatsApp, Maps, Compartilhar) */}
                  <EventActionsClient
                    title={event.title}
                    slug={event.slug}
                    dateDisplay={dateDisplay}
                    locationLine={locationLine}
                    whatsappUrl={whatsappUrl}
                    mapsUrl={mapsUrl}
                    registrationEnabled={event.registration_enabled}
                    externalTicketUrl={event.external_ticket_url}
                  />
                </div>

                {/* COLUNA DIREITA: Banner do Evento com Ajuste Automático e Lightbox (~45%) */}
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <EventBannerMedia
                    imageUrl={event.cover_image_url}
                    title={event.title}
                    appName={brand.appName ?? 'Conexão Maçônica'}
                    priority
                  />
                </div>

              </div>
            </div>
          </header>

          {/* CONTEÚDO PRINCIPAL (Grid de Detalhes, Valores, Localização e Inscrição) */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* COLUNA PRINCIPAL (Esquerda: Descrição, Programação e RSVP) */}
              <div className="lg:col-span-8 space-y-8">

                {/* Seção 1: Sobre o Evento */}
                <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E8E5DF] shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4b161b] border-b border-stone-100 pb-3">
                    <Info className="w-4 h-4 text-[#c59b27]" />
                    <span>Sobre o Evento</span>
                  </div>

                  {event.description ? (
                    <div className="text-stone-700 text-sm sm:text-base leading-relaxed whitespace-pre-line space-y-3 font-normal">
                      {event.description}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500 italic">
                      Evento comemorativo e integrativo promovido na Conexão Maçônica.
                    </p>
                  )}
                </section>

                {/* Seção 2: Informações de Valores e Acesso */}
                <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E8E5DF] shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4b161b] border-b border-stone-100 pb-3">
                    <Tag className="w-4 h-4 text-[#c59b27]" />
                    <span>Informações de Acesso &amp; Valores</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E5DF] space-y-1">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        Investimento / Entrada
                      </span>
                      <p className="text-lg font-extrabold text-[#4b161b]">
                        {event.price_info || 'Entrada Franca'}
                      </p>
                      <p className="text-xs text-stone-600">
                        Valor:
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E5DF] space-y-1">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        Modalidade de Confirmação
                      </span>
                      <p className="text-lg font-extrabold text-[#1f1914]">
                        {event.registration_enabled ? 'Inscrição RSVP Obrigatória' : 'Livre'}
                      </p>
                      <p className="text-xs text-stone-600">
                        {event.capacity ? `Vagas limitadas a ${event.capacity} participantes.` : 'Sem restrição rígida de lotação.'}
                      </p>
                    </div>
                  </div>

                  {event.footer_information && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm text-amber-950 leading-relaxed mt-2">
                      <strong className="block font-bold text-amber-900 mb-1">Observações da Organização:</strong>
                      <span>{event.footer_information}</span>
                    </div>
                  )}
                </section>

                {/* Seção 3: Formulário de Confirmação de Presença (RSVP) */}
                {event.registration_enabled && (
                  <section id="rsvp-form" className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E8E5DF] shadow-xs space-y-4 scroll-mt-20">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4b161b] border-b border-stone-100 pb-3">
                      <ShieldCheck className="w-4 h-4 text-[#c59b27]" />
                      <span>Confirmação de Presença Fraterna</span>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      Preencha o formulário abaixo para registrar sua presença antecipada e receber a confirmação oficial no seu WhatsApp.
                    </p>

                    <Suspense fallback={<div className="p-8 text-center text-sm text-stone-500">Carregando formulário seguro...</div>}>
                      <EventRSVPForm event={event as any} />
                    </Suspense>
                  </section>
                )}

              </div>

              {/* COLUNA LATERAL (Direita: Localização no Mapa e Card do Organizador) */}
              <div className="lg:col-span-4 space-y-6">

                {/* Card de Localização & Rota */}
                <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] shadow-xs space-y-4">
                  <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#c59b27]" />
                    <span>Localização</span>
                  </h3>

                  <div className="space-y-1.5 text-xs text-stone-600">
                    {event.venue_name && (
                      <p className="font-bold text-stone-900 text-sm">
                        {event.venue_name}
                      </p>
                    )}
                    {event.venue_address && <p>{event.venue_address}</p>}
                    <p className="font-medium text-stone-700">
                      {[event.city, event.state].filter(Boolean).join(' - ')}
                    </p>
                  </div>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#4b161b] font-bold text-xs flex items-center justify-center gap-2 transition-all border border-stone-200"
                  >
                    <MapPin className="w-4 h-4 text-[#c59b27]" />
                    <span>Traçar Rota no Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                  </a>
                </div>

                {/* Card do Organizador / Realização do Evento */}
                <div className="bg-white rounded-2xl p-6 border border-[#E8E5DF] shadow-xs space-y-4">
                  <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#c59b27]" />
                    <span>Realização &amp; Organização</span>
                  </h3>

                  <div className="space-y-2">
                    {(() => {
                      let displayOrganizer = event.organizer_name?.trim() || '';

                      if (
                        !displayOrganizer ||
                        displayOrganizer.toLowerCase() === 'loja maçônica promotora' ||
                        displayOrganizer.toLowerCase() === 'loja maçônica'
                      ) {
                        if (
                          event.venue_name &&
                          (event.venue_name.toLowerCase().includes('loja') ||
                            event.venue_name.toLowerCase().includes('templo') ||
                            event.venue_name.toLowerCase().includes('augusta') ||
                            event.venue_name.toLowerCase().includes('cavaleiro') ||
                            event.venue_name.toLowerCase().includes('calaveiro') ||
                            event.venue_name.toLowerCase().includes('16'))
                        ) {
                          displayOrganizer = event.venue_name;
                        } else if (event.title?.toLowerCase().includes('16')) {
                          displayOrganizer = 'Loja Maçônica 16 de Junho';
                        } else if (
                          event.title?.toLowerCase().includes('calaveiro') ||
                          event.title?.toLowerCase().includes('cavaleiro')
                        ) {
                          displayOrganizer = 'Loja Maçônica Cavaleiros de Aço';
                        } else if (event.organizer_type === 'platform' || event.category_id === 'institucional') {
                          displayOrganizer = 'Conexão Maçônica';
                        } else if (event.organizer_type === 'social_action') {
                          displayOrganizer = 'Ação Social Fraterna';
                        } else if (event.category_id === 'festividades') {
                          displayOrganizer = 'Comissão Organizadora & Conexão Maçônica';
                        } else {
                          displayOrganizer = event.venue_name || 'Loja Maçônica Realizadora';
                        }
                      }

                      const explanationText =
                        event.organizer_type === 'platform' || event.category_id === 'institucional'
                          ? 'Evento oficial promovido e coordenado pela plataforma Conexão Maçônica.'
                          : event.organizer_type === 'social_action'
                            ? 'Iniciativa beneficente fraterna em prol da solidariedade e assistência social.'
                            : event.organizer_type === 'business'
                              ? 'Empresa parceira com perfil homologado na vitrine comercial do Guia.'
                              : event.category_id === 'festividades'
                                ? `Organização e realização de ${displayOrganizer}, integrando a comunidade e a rede fraterna.`
                                : `Realização oficial de ${displayOrganizer}, integrada à rede fraterna Conexão Maçônica.`;

                      return (
                        <>
                          <p className="font-bold text-sm text-[#4b161b]">
                            {displayOrganizer}
                          </p>
                          <p className="text-xs text-stone-500 leading-relaxed">
                            {explanationText}
                          </p>
                        </>
                      );
                    })()}

                    {event.organizer_slug && (
                      <div className="pt-2">
                        <Link
                          href={`/guia/${event.organizer_slug}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c59b27] hover:underline"
                        >
                          <span>Conhecer Empresa no Guia</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}

                    {whatsappUrl && (
                      <div className="pt-2">
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>Contato WhatsApp do Organizador</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Voltar à Agenda */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-center space-y-2">
                  <span className="text-xs text-stone-600">Quer conferir outros eventos da comunidade?</span>
                  <Link
                    href="/guia/eventos"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-xl bg-[#3b0b14] text-white text-xs font-bold hover:bg-[#c59b27] hover:text-[#1f1914] transition-all shadow-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para Todos os Eventos</span>
                  </Link>
                </div>

              </div>

            </div>
          </div>
        </main>

        <DirectoryFooter />
        <DirectoryFavoritesModal />
      </div>
    </FavoritesProvider>
  );
}

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Calendar, Sparkles, MapPin, Search, Store, Landmark, Filter, ArrowRight } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import '@/styles/directory-home.css';

export const metadata: Metadata = {
  title: 'Agenda de Eventos e Comunicados · Conexão Maçônica',
  description:
    'Acompanhe eventos, palestras, sessões abertas de Lojas Maçônicas e comunicados de empresas da rede Conexão Maçônica.',
};

type Props = {
  searchParams: Promise<{
    q?: string;
    type?: 'all' | 'empresas' | 'lojas';
    city?: string;
  }>;
};

export default async function PublicEventsDirectoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q || '';
  const typeFilter = params.type || 'all';
  const selectedCity = params.city || '';

  const supabase = await createServerSideClient();

  // Fetch events from events_and_posts table
  let query = (supabase as any)
    .from('events_and_posts')
    .select('*')
    .eq('is_published', true)
    .order('event_date', { ascending: true })
    .limit(30);

  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  const { data: rawEvents } = await query;
  const allEvents = (rawEvents as any[]) || [];

  // Filter items based on organizer type
  const items = allEvents.filter((item) => {
    if (typeFilter === 'empresas') return item.organizer_type !== 'lodge';
    if (typeFilter === 'lojas') return item.organizer_type === 'lodge';
    return true;
  });

  return (
    <FavoritesProvider>
      <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] font-sans antialiased relative">
        <DirectoryHeader selectedCity={selectedCity} />

        {/* Sub-Hero Header com Paleta Bordô & Dourada do Sistema */}
        <section className="bg-gradient-to-b from-[#3b0b14] via-[#3b0b14] to-[#2b060d] text-white py-10 px-4 relative overflow-hidden border-b border-[#c59b27]/30 shadow-lg">
          <div className="dh-container relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-amber-200/80 mb-3" aria-label="Breadcrumb">
              <Link href="/guia" className="hover:text-amber-300 transition-colors">
                Início
              </Link>
              <ChevronRight className="w-3 h-3 text-[#c59b27]" />
              <span className="text-white font-semibold">Eventos & Comunicados</span>
            </nav>

            <div className="flex items-center gap-2 text-[#c59b27] text-xs font-bold uppercase tracking-wider mb-2">
              <Calendar className="w-4 h-4 text-[#c59b27]" />
              <span>Agenda Integrada da Rede Fraterna</span>
            </div>

            <h1 className="font-serif font-bold text-3xl md:text-4xl text-white">
              Eventos, Palestras & Comunicados
            </h1>
            <p className="text-xs md:text-sm text-amber-100/90 max-w-2xl mt-2 leading-relaxed">
              Calendário completo com encontros de negócios de empresas parceiras e comunicados/sessões institucionais de Lojas Maçônicas.
            </p>

            {/* Barra de Filtro e Busca */}
            <form action="/guia/eventos" method="GET" className="dh-search-box mt-6 max-w-3xl">
              <Search className="w-5 h-5 text-[#c59b27] ml-3 shrink-0" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Buscar evento, palestra ou comunicado..."
                className="dh-search-box__input text-gray-900"
              />
              <select
                name="type"
                defaultValue={typeFilter}
                className="bg-[#faf7f2] text-[#1f1914] text-xs font-semibold rounded-lg px-3 py-2 border border-[#e8e2d9] outline-none cursor-pointer hidden md:block"
              >
                <option value="all">Todos os Eventos</option>
                <option value="empresas">Empresas Parceiras</option>
                <option value="lojas">Lojas Maçônicas</option>
              </select>
              <button type="submit" className="dh-search-box__btn">
                <Filter className="w-4 h-4" />
                <span>Filtrar</span>
              </button>
            </form>
          </div>
        </section>

        <main className="dh-container py-8 space-y-8">
          {/* Abas Rápidas de Navegação */}
          <div className="flex items-center gap-2 border-b border-[#e8e2d9] pb-3 overflow-x-auto">
            <Link
              href="/guia/eventos?type=all"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                typeFilter === 'all'
                  ? 'bg-[#3b0b14] text-white shadow-sm'
                  : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
              }`}
            >
              Todos ({allEvents.length})
            </Link>

            <Link
              href="/guia/eventos?type=empresas"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                typeFilter === 'empresas'
                  ? 'bg-[#3b0b14] text-white shadow-sm'
                  : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-[#c59b27]" /> Empresas Parceiras
            </Link>

            <Link
              href="/guia/eventos?type=lojas"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                typeFilter === 'lojas'
                  ? 'bg-[#3b0b14] text-white shadow-sm'
                  : 'bg-white border border-[#e8e2d9] text-[#6b625b] hover:border-[#c59b27] hover:text-[#3b0b14]'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-[#c59b27]" /> Lojas Maçônicas
            </Link>
          </div>

          {/* Lista de Eventos */}
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {items.map((event) => {
                const isLodge = event.organizer_type === 'lodge';
                const dateFormatted = event.event_date
                  ? new Date(event.event_date).toLocaleDateString('pt-BR', {
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
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="bg-[#fdf8eb] text-[#3b0b14] font-bold text-[11px] px-3 py-1 rounded-full border border-[#c59b27]/40 flex items-center gap-1.5 shadow-xs">
                          <Calendar className="w-3.5 h-3.5 text-[#c59b27]" />
                          {dateFormatted}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                            isLodge
                              ? 'bg-[#3b0b14] text-[#c59b27] border-[#c59b27]/40'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {isLodge ? (
                            <>
                              <Landmark className="w-3 h-3 text-[#c59b27]" /> Loja Maçônica
                            </>
                          ) : (
                            <>
                              <Store className="w-3.5 h-3.5 text-emerald-600" /> Empresa Parceira
                            </>
                          )}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-serif font-bold text-xl text-[#1f1914] group-hover:text-[#3b0b14] transition-colors">
                          {event.title}
                        </h3>
                        {event.organizer_name && (
                          <p className="text-xs font-semibold text-[#3b0b14] mt-1">
                            Organizado por: {event.organizer_name}
                          </p>
                        )}
                        {event.location_name && (
                          <p className="text-xs text-[#6b625b] flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-[#c59b27]" />
                            <span>{event.location_name}</span>
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-[#6b625b] leading-relaxed line-clamp-3">
                        {event.description}
                      </p>
                    </div>

                    {event.organizer_slug && (
                      <Link
                        href={isLodge ? `/guia/lojas/${event.organizer_slug}` : `/guia/${event.organizer_slug}`}
                        className="w-full py-2.5 bg-[#3b0b14] hover:bg-[#c59b27] text-white hover:text-[#1f1914] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-sm mt-2"
                      >
                        <span>{isLodge ? 'Ver Detalhes da Loja' : 'Ver Perfil da Empresa'}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 bg-white border border-[#e8e2d9] rounded-2xl text-center space-y-3 shadow-xs">
              <Sparkles className="w-10 h-10 text-[#c59b27] mx-auto" />
              <h3 className="text-lg font-bold font-serif text-[#1f1914]">Nenhum evento localizado na busca</h3>
              <p className="text-xs text-[#6b625b] max-w-md mx-auto">
                Tente alterar o termo digitado ou selecione outro tipo no filtro para localizar os comunicados e encontros da rede Conexão Maçônica.
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


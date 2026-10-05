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
import { canonicalPotencyCode, KNOWN_POTENCY_NAMES } from '@/lib/lodges/potency';
import { interpretLodgeQueryByRules, describeInterpretation } from '@/lib/lodges/smart-search';
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

  let availableCities: string[] = homeData?.available_cities || [];
  let potencies = (potenciesData as any[]) || [];
  let rites = (ritesData as any[]) || [];
  let availableStates: string[] = [];
  const citiesByState: Record<string, string[]> = {};

  // Os catálogos podem estar protegidos por RLS, mas as opções públicas também
  // podem ser derivadas com segurança das próprias Lojas ativas e publicadas.
  try {
    const { data: publicLodgeFacets } = await (supabase as any)
      .from('organizations')
      .select('city, state, potency, rite')
      .eq('is_active', true)
      .eq('is_published', true);

    const facetRows = publicLodgeFacets || [];
    availableCities = Array.from(new Set([
      ...availableCities,
      ...facetRows.map((row: any) => row.city).filter(Boolean),
    ])).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Estados que têm lojas e, para cada um, suas cidades (a lista de cidades acompanha o estado escolhido).
    const statesSet = new Set<string>();
    for (const row of facetRows as Array<{ city?: string | null; state?: string | null }>) {
      const uf = (row.state || '').trim().toUpperCase();
      if (!uf) continue;
      statesSet.add(uf);
      if (row.city) {
        const list = (citiesByState[uf] ||= []);
        if (!list.includes(row.city)) list.push(row.city);
      }
    }
    availableStates = [...statesSet].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    for (const uf of Object.keys(citiesByState)) citiesByState[uf]!.sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Potências: catálogo + as que existem nas lojas, unificadas (CMSB/BA e CMSB/RJ viram CMSB).
    const catalogByCode = new Map<string, { name?: string }>(
      potencies.map((p: any) => [canonicalPotencyCode(p.abbreviation || p.slug || p.name), { name: p.name }]),
    );
    const potencyCodes = new Set<string>(catalogByCode.keys());
    for (const row of facetRows as Array<{ potency?: string | null }>) {
      const code = canonicalPotencyCode(row.potency);
      if (code) potencyCodes.add(code);
    }
    potencies = [...potencyCodes]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((code) => {
        const name = catalogByCode.get(code)?.name || KNOWN_POTENCY_NAMES[code] || code;
        return { id: code, slug: code, name, abbreviation: code };
      });
    if (rites.length === 0) {
      const riteValues: string[] = facetRows
        .map((row: any) => row.rite)
        .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);
      rites = Array.from(new Set<string>(riteValues))
        .sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'))
        .map((value: string) => ({ id: value, slug: value, name: value }));
    }
  } catch (_facetError) { }

  // Busca inteligente: a frase inteira vai para o banco (public_lodges_search), que divide em termos e
  // exige todos eles em nome, número, cidade, UF, potência, rito, venerável, endereço ou dia de reunião.
  // Ex.: "feira de santana sexta". Os filtros da barra lateral continuam valendo em conjunto.
  const interpreted = q.trim()
    ? interpretLodgeQueryByRules(q, {
      cities: availableCities,
      potencies: potencies.map((p: any) => ({ abbreviation: p.abbreviation, name: p.name, slug: p.slug })),
      rites: rites.map((r: any) => ({ name: r.name, slug: r.slug })),
    })
    : null;

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
    if (rpcResult.data && rpcResult.data.items) searchRes = rpcResult.data;
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

  // A função de busca do banco não devolve o dia/horário da reunião; completamos aqui.
  if (Array.isArray(searchRes.items) && searchRes.items.length > 0) {
    try {
      const { data: meetingRows } = await (supabase as any)
        .from('organization_meetings')
        .select('organization_id, meeting_day, meeting_time, label, sort_order, created_at')
        .in('organization_id', searchRes.items.map((item: any) => item.id))
        .eq('is_public', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      const firstMeeting = new Map<string, { day: string; time: string; label: string | null }>();
      for (const row of meetingRows || []) {
        if (!firstMeeting.has(row.organization_id)) {
          firstMeeting.set(row.organization_id, { day: row.meeting_day, time: row.meeting_time, label: row.label ?? null });
        }
      }
      searchRes.items = searchRes.items.map((item: any) => ({
        ...item,
        primary_meeting: item.primary_meeting ?? firstMeeting.get(item.id) ?? null,
      }));
    } catch (_meetingErr) { }
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
              <span>DIRETÓRIO NACIONAL</span>
            </div>

            <h1 className="font-serif font-bold text-2xl md:text-3xl text-white">
              Lojas Maçônicas do Brasil
            </h1>
            <p className="text-xs md:text-sm text-amber-100/80 max-w-2xl mt-1.5">
              Pesquise por cidade, estado, potência, rito e dia de reunião para planejar sua visita
            </p>

            {/* Barra de Busca Principal */}
            <form action="/guia/lojas" method="GET" className="dh-search-box mt-8 max-w-3xl">
              <Sparkles className="w-5 h-5 text-amber-500 ml-3 shrink-0" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Busca inteligente: ex. feira de santana sexta · GOB quarta · loja 1842"
                className="dh-search-box__input text-gray-900"
              />
              {city && <input type="hidden" name="city" value={city} />}
              {potency && <input type="hidden" name="potency" value={potency} />}
              <button type="submit" className="dh-search-box__btn">
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </form>

            {interpreted && q.trim() && describeInterpretation(interpreted).length > 0 && (
              <div className="mt-3 max-w-3xl flex flex-wrap items-center gap-1.5 text-[11px]" aria-live="polite">
                <span className="text-amber-200/90 font-semibold inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Filtrando por:
                </span>
                {describeInterpretation(interpreted).map((chip) => (
                  <span key={chip} className="bg-white/10 border border-amber-300/30 text-amber-50 px-2 py-0.5 rounded-full">
                    {chip}
                  </span>
                ))}
              </div>
            )}
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
            availableStates={availableStates}
            citiesByState={citiesByState}
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

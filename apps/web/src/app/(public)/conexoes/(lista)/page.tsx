import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Handshake } from 'lucide-react';
import { getPublicConnectionsListAction } from '@/app/actions/connections';
import { appUrl } from '@/lib/seo/app-url';
import '@/styles/directory-home.css';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { StructuredData } from '@/components/seo/StructuredData';
import { ConnectionCard } from '@/components/public/connections/ConnectionCard';
import { ConnectionsFilters } from '@/components/public/connections/ConnectionsFilters';
import { ConnectionsPagination } from '@/components/public/connections/ConnectionsPagination';
import { ConnectionsEmptyState, ConnectionsErrorState, ConnectionsNoResults } from '@/components/public/connections/ConnectionsStates';
import { buildConnectionsUrl, hasActiveFilters, parseConnectionsListParams } from '@/lib/directory/connections-list';

export const dynamic = 'force-dynamic';

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

const TITLE = 'Mural de Conexões | Conexão Maçônica';
const DESCRIPTION =
  'Conexões reais entre irmãos, familiares e empresas da rede Conexão Maçônica: compras, serviços, parcerias e visitas confirmadas pelas empresas e publicadas com autorização.';

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = parseConnectionsListParams(searchParams ? await searchParams : undefined);
  // Página filtrada/buscada não vai para o índice (aponta para a página principal do mural); a paginação simples é indexável.
  const filtered = hasActiveFilters(params);
  const canonicalPath = filtered ? '/conexoes' : buildConnectionsUrl({ page: params.page });
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: appUrl(canonicalPath) },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title: TITLE, description: DESCRIPTION, url: appUrl(canonicalPath), type: 'website', siteName: 'Conexão Maçônica' },
  };
}

export default async function ConexoesPage({ searchParams }: Props) {
  const params = parseConnectionsListParams(searchParams ? await searchParams : undefined);
  const result = await getPublicConnectionsListAction(params);

  // Página além do fim (ex.: link antigo): leva à última página existente.
  if (result.ok && result.total > 0 && result.items.length === 0 && params.page > result.totalPages) {
    redirect(buildConnectionsUrl({ ...params, page: result.totalPages }));
  }

  const filtered = hasActiveFilters(params);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guia', item: appUrl('/guia') },
      { '@type': 'ListItem', position: 3, name: 'Mural de Conexões', item: appUrl('/conexoes') },
    ],
  };
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: appUrl('/conexoes'),
    isPartOf: { '@type': 'WebSite', name: 'Conexão Maçônica', url: appUrl('/') },
  };

  return (
    <FavoritesProvider>
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={pageSchema} />
      <div className="min-h-screen bg-[#faf7f2] font-sans text-[#1f1914] antialiased">
        <DirectoryHeader />

        <section className="relative overflow-hidden border-b border-[#c59b27]/30 bg-gradient-to-b from-[#4b161b] via-[#4b161b] to-[#3b0b14] px-4 py-10 text-white shadow-lg">
          <div className="dh-container relative z-10">
            <nav className="mb-3 flex items-center gap-2 text-xs text-amber-200/80" aria-label="Breadcrumb">
              <Link href="/" className="text-amber-200 hover:text-white">Início</Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <Link href="/guia" className="text-amber-200 hover:text-white">Guia</Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="font-bold text-white" aria-current="page">Mural de Conexões</span>
            </nav>
            <h1 className="flex items-center gap-2.5 font-serif text-3xl font-bold sm:text-4xl">
              <Handshake className="h-8 w-8 text-[#c59b27]" aria-hidden="true" />
              Mural de Conexões
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-amber-100/90 sm:text-base">
              Negócios e relacionamentos que acontecem dentro da Conexão Maçônica. Cada registro é confirmado pela empresa e publicado com autorização.
            </p>
          </div>
        </section>

        <main className="dh-container space-y-6 py-8" id="conteudo">
          {params.empresa && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#C9A227]/40 bg-white px-4 py-3 text-sm text-stone-700">
              <span>
                Mostrando as conexões de{' '}
                <Link href={`/guia/${params.empresa}?src=connections_wall`} className="font-bold text-[#4B161B] hover:underline">
                  {result.ok && result.items[0] ? result.items[0].business_name : 'esta empresa'}
                </Link>
              </span>
              <Link href={buildConnectionsUrl({ ...params, empresa: '', page: 1 })} className="text-xs font-bold text-[#4B161B] underline-offset-2 hover:underline">
                Ver todas as empresas
              </Link>
            </div>
          )}
          <ConnectionsFilters params={params} />

          {!result.ok ? (
            <ConnectionsErrorState retryHref={buildConnectionsUrl(params)} />
          ) : result.total === 0 ? (
            filtered ? <ConnectionsNoResults /> : <ConnectionsEmptyState />
          ) : (
            <>
              <p className="text-xs font-semibold text-stone-500" role="status" aria-live="polite">
                {result.total} {result.total === 1 ? 'conexão' : 'conexões'}
                {filtered ? ' encontradas' : ''}
                {result.totalPages > 1 ? ` · página ${result.page} de ${result.totalPages}` : ''}
              </p>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Conexões">
                {result.items.map((item) => (
                  <li key={item.id}>
                    <ConnectionCard item={item} loginRedirect={buildConnectionsUrl(params)} />
                  </li>
                ))}
              </ul>
              <ConnectionsPagination params={params} page={result.page} totalPages={result.totalPages} />
            </>
          )}
        </main>

        <DirectoryFooter />
      </div>
    </FavoritesProvider>
  );
}

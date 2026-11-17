import React, { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BadgeCheck, ChevronRight, Handshake, MapPin, ShoppingBag, Wrench } from 'lucide-react';
import { getPublicConnectionDetailAction } from '@/app/actions/connections';
import { appUrl } from '@/lib/seo/app-url';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { StructuredData } from '@/components/seo/StructuredData';
import { ConnectionShareButtons } from '@/components/public/connections/ConnectionShareButtons';
import { ConnectionsErrorState } from '@/components/public/connections/ConnectionsStates';
import { ReportConnectionButton } from '@/components/public/business/sections/ReportConnectionButton';
import { CONNECTION_TYPE_NAME, buildConnectionMetadata, buildWhatsAppShareUrl, connectionPath, connectionSentence } from '@/lib/directory/connections-share';
import '@/styles/directory-home.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

// A mesma consulta serve ao <head> (metadados) e à página, sem ir duas vezes ao banco na mesma requisição.
const loadConnection = cache((id: string) => getPublicConnectionDetailAction(id));

const TYPE_ICON = { compra: ShoppingBag, servico: Wrench, parceria: Handshake, visita: MapPin } as const;
const FALLBACK_IMAGE = '/logoconexao_red.png';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await loadConnection(id);

  // Inexistente, inelegível ou com falha: nada do conteúdo vai para título, descrição ou prévia, e a página não é indexada.
  if (result.status !== 'ok') {
    return { title: { absolute: 'Conexão não encontrada | Conexão Maçônica' }, robots: { index: false, follow: false } };
  }

  const meta = buildConnectionMetadata(result.item, appUrl(FALLBACK_IMAGE));
  const url = appUrl(connectionPath(result.item.id));
  const image = { url: meta.imageUrl, width: 738, height: 423, alt: 'Conexão Maçônica' };

  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: url },
    openGraph: { type: 'article', title: meta.title, description: meta.description, url, siteName: 'Conexão Maçônica', locale: 'pt_BR', images: [image] },
    twitter: { card: 'summary', title: meta.title, description: meta.description, images: [meta.imageUrl] },
  };
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function ConnectionPage({ params }: Props) {
  const { id } = await params;
  const result = await loadConnection(id);
  if (result.status === 'not_found') notFound();

  const header = (
    <>
      <DirectoryHeader />
      <section className="relative overflow-hidden border-b border-[#c59b27]/30 bg-gradient-to-b from-[#4b161b] via-[#4b161b] to-[#3b0b14] px-4 py-8 text-white shadow-lg">
        <div className="dh-container relative z-10">
          <nav className="flex flex-wrap items-center gap-2 text-xs" aria-label="Breadcrumb">
            <Link href="/" className="text-amber-200 hover:text-white">Início</Link>
            <ChevronRight className="h-3 w-3 text-amber-200/70" aria-hidden="true" />
            <Link href="/guia" className="text-amber-200 hover:text-white">Guia</Link>
            <ChevronRight className="h-3 w-3 text-amber-200/70" aria-hidden="true" />
            <Link href="/conexoes" className="text-amber-200 hover:text-white">Mural de Conexões</Link>
            <ChevronRight className="h-3 w-3 text-amber-200/70" aria-hidden="true" />
            <span className="font-bold text-white" aria-current="page">Conexão</span>
          </nav>
        </div>
      </section>
    </>
  );

  if (result.status === 'error') {
    return (
      <FavoritesProvider>
        <div className="min-h-screen bg-[#faf7f2] font-sans text-[#1f1914] antialiased">
          {header}
          <main className="dh-container py-10"><ConnectionsErrorState retryHref={connectionPath(id)} /></main>
          <DirectoryFooter />
        </div>
      </FavoritesProvider>
    );
  }

  const { item } = result;
  const Icon = TYPE_ICON[item.connection_type] ?? Handshake;
  const url = appUrl(connectionPath(item.id));
  const businessUrl = appUrl(`/guia/${item.business_slug}`);
  const date = formatDate(item.confirmed_at);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guia', item: appUrl('/guia') },
      { '@type': 'ListItem', position: 3, name: 'Mural de Conexões', item: appUrl('/conexoes') },
      { '@type': 'ListItem', position: 4, name: `${CONNECTION_TYPE_NAME[item.connection_type]} em ${item.business_name}`, item: url },
    ],
  };
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${CONNECTION_TYPE_NAME[item.connection_type]} em ${item.business_name}`,
    url,
    isPartOf: { '@type': 'CollectionPage', name: 'Mural de Conexões', url: appUrl('/conexoes') },
    about: { '@type': 'Organization', name: item.business_name, url: businessUrl },
  };

  return (
    <FavoritesProvider>
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={pageSchema} />
      <div className="min-h-screen bg-[#faf7f2] font-sans text-[#1f1914] antialiased">
        {header}

        <main className="dh-container py-8" id="conteudo">
          <article className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            {item.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photo_url} alt={`Registro de ${item.member_first_name} em ${item.business_name}`} className="max-h-[420px] w-full object-cover" />
            )}

            <div className="space-y-5 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4B161B]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#4B161B]">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {CONNECTION_TYPE_NAME[item.connection_type]}
                </span>
                {date && <time dateTime={item.confirmed_at} className="text-xs text-stone-500">{date}</time>}
              </div>

              <h1 className="font-serif text-2xl font-bold leading-snug text-[#2a0a10] sm:text-3xl">
                {connectionSentence(item)}
              </h1>

              {item.message && (
                <blockquote className="border-l-4 border-[#C9A227] pl-4 text-base italic leading-relaxed text-stone-700">
                  “{item.message}”
                </blockquote>
              )}

              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Conexão confirmada pela empresa
              </p>

              <div className="flex flex-col gap-4 border-t border-stone-100 pt-5">
                <Link
                  href={`/guia/${item.business_slug}?src=connection_page`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4B161B] px-6 py-3 text-sm font-bold text-[#F3EEDD] shadow-xs transition hover:bg-[#3B0B14] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/60"
                >
                  Conhecer esta empresa
                  <ArrowRight className="h-4 w-4 text-[#C9A227]" aria-hidden="true" />
                </Link>
                <ConnectionShareButtons url={url} whatsappHref={buildWhatsAppShareUrl(item, url)} />
              </div>
            </div>
          </article>

          <div className="mx-auto mt-5 flex max-w-2xl items-center justify-between text-xs">
            <Link href="/conexoes" className="inline-flex items-center gap-1.5 font-bold text-[#4B161B] hover:underline">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Ver todas as conexões
            </Link>
            <ReportConnectionButton connectionId={item.id} loginRedirect={connectionPath(item.id)} />
          </div>
        </main>

        <DirectoryFooter />
      </div>
    </FavoritesProvider>
  );
}

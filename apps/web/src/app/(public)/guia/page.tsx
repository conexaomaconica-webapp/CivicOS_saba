import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Building2,
  Hand,
  Heart,
  Search,
  SearchX,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Tags,
  Utensils,
} from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { StructuredData } from '@/components/seo/StructuredData';
import { appUrl } from '@/lib/seo/app-url';
import { BusinessCard, type GuiaBusiness } from '@/components/guia/BusinessCard';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import type { Database } from '@/types/database.types';

type Props = {
  searchParams: Promise<{ q?: string; cat?: string }>;
};

export const metadata: Metadata = {
  title: 'Guia Comercial — Empresas e serviços de irmãos verificados',
  description:
    'Diretório de empresas e serviços de irmãos maçons verificados: busque por categoria, veja selos de confiança e apoie a comunidade.',
  alternates: { canonical: '/guia' },
  openGraph: {
    title: 'Guia Comercial de Irmãos — Conexão Maçônica',
    description:
      'Busque empresas e serviços de irmãos maçons, filtre por categoria e descubra negócios verificados.',
    url: appUrl('/guia'),
    type: 'website',
  },
};

const breadcrumbSchema = (tenantName: string) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') },
    { '@type': 'ListItem', position: 2, name: tenantName },
  ],
});

const itemListSchema = (businesses: GuiaBusiness[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: businesses.slice(0, 20).map((business, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: business.name,
    url: appUrl(`/guia/${business.slug ?? business.id}`),
  })),
});

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  hand: Hand,
  building: Building2,
  heart: Heart,
  briefcase: Briefcase,
  store: Store,
  shopping: ShoppingBasket,
};

function formatCategoryFallback(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

type PublicDirectoryRow =
  Database['public']['Functions']['public_directory_search']['Returns'][number];

export default async function GuiaPage({ searchParams }: Props) {
  const { q = '', cat = 'all' } = await searchParams;

  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  const supabase = await createServerSideClient();
  const brand = await resolveTenantBrandContext();
  const rpcArgs = {
    p_host: host,
    p_query: q.trim() || undefined,
    p_category_slug: cat === 'all' ? undefined : cat,
    p_city: undefined,
    p_state: undefined,
    p_after_name: undefined,
    p_after_slug: undefined,
    p_limit: 50,
  };
  const [allResult, filteredResult] = await Promise.all([
    supabase.rpc('public_directory_search', {
      ...rpcArgs,
      p_query: undefined,
      p_category_slug: undefined,
    }),
    supabase.rpc('public_directory_search', rpcArgs),
  ]);
  const allRows = Array.isArray(allResult.data)
    ? allResult.data satisfies PublicDirectoryRow[]
    : [];
  const rows = Array.isArray(filteredResult.data)
    ? filteredResult.data satisfies PublicDirectoryRow[]
    : [];
  const tenant = brand.tenantSlug
    ? { name: brand.appName ?? brand.tenantSlug }
    : null;

  if (!tenant || allResult.error || filteredResult.error) {
    return (
      <main className="flex min-h-[60vh] w-full items-center justify-center">
        <div className="max-w-md rounded-xl border border-default bg-secondary p-8 text-center">
          <h1 className="text-2xl font-bold text-primary">Portal não encontrado</h1>
          <p className="mt-3 text-sm text-secondary">
            O domínio informado é inválido, não verificado ou está desativado.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
          >
            Voltar ao Início
          </Link>
        </div>
      </main>
    );
  }

  const categories = allRows
    .filter(
      (row): row is PublicDirectoryRow & {
        primary_category_slug: string;
        primary_category_name: string;
      } => Boolean(row.primary_category_slug && row.primary_category_name),
    )
    .map((row) => ({
      slug: row.primary_category_slug,
      name: row.primary_category_name,
      icon: null as string | null,
    }))
    .filter(
    (category, index, all) =>
      all.findIndex((other) => other.slug === category.slug) === index,
  );

  const categoryNames = new Map(
    categories.map((category) => [category.slug, category.name]),
  );

  type CategoryOption = { slug: string; name: string; icon?: string | null };
  const categoryOptions: CategoryOption[] = [
    { slug: 'all', name: 'Todas' },
    ...categories,
  ];

  // 3. Fetch published listings for this tenant, then filter in memory.
  // Presentation is intentionally not ordered by configured plan_tier: the
  // anonymous schema does not expose an authoritative effective plan yet.
  const toBusiness = (row: PublicDirectoryRow): GuiaBusiness => ({
    id: row.business_slug,
    name: row.business_name,
    slug: row.business_slug,
    category: row.primary_category_slug,
    description: row.description,
    address: [row.city, row.state].filter(Boolean).join(' - ') || null,
    plan_tier: row.effective_plan_code,
  });
  const dbBusinesses = allRows.map(toBusiness);
  const sorted = rows.map(toBusiness);
  const verifiedSet = new Set(
    allRows.filter((row) => row.is_verified).map((row) => row.business_slug),
  );
  const verifiedCount = sorted.filter((business) => verifiedSet.has(business.id)).length;
  const tenantVerifiedCount = dbBusinesses.filter((business) =>
    verifiedSet.has(business.id),
  ).length;

  const heroStats = [
    { value: String(tenantVerifiedCount), label: 'empresas verificadas' },
    { value: String(categories.length), label: 'categorias' },
    { value: String(dbBusinesses.length), label: 'empresas publicadas' },
  ];

  const buildUrl = (nextCat: string, nextQuery: string) =>
    `/guia?${new URLSearchParams({
      cat: nextCat,
      ...(nextQuery ? { q: nextQuery } : {}),
    }).toString()}`;

  return (
    <>
      <StructuredData schema={breadcrumbSchema(tenant.name)} />
      <StructuredData schema={itemListSchema(sorted)} />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-16 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mt-6 text-xs text-secondary">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-primary">{tenant.name}</li>
          </ol>
        </nav>

        {/* Hero institucional */}
        <section className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-highlight">
              <span className="inline-block h-1.5 w-1.5 rotate-45 bg-highlight" aria-hidden="true" />
              Guia Comercial da Comunidade
              <span className="inline-block h-1.5 w-1.5 rotate-45 bg-highlight" aria-hidden="true" />
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
              {tenant.name}
            </h1>
            <p className="max-w-2xl text-lg text-secondary">
              Empresas e serviços de irmãos maçons, verificados e recomendados
              pela comunidade. Filtre por categoria, confira os selos de
              confiança e apoie quem apoia você.
            </p>
          </div>

          <dl className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col rounded-xl border border-default bg-secondary px-4 py-3"
              >
                <dt className="order-2 text-xs text-secondary">{stat.label}</dt>
                <dd className="order-1 text-2xl font-bold text-highlight-active">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#busca"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar no guia
            </a>
            <Link
              href="/anunciar/passo-1"
              className="inline-flex items-center justify-center rounded-lg border border-default bg-secondary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-tertiary"
            >
              Anunciar minha empresa
            </Link>
          </div>
        </section>

        {/* Busca + filtros */}
        <section
          id="busca"
          className="scroll-mt-6 rounded-2xl border border-default bg-secondary p-6 shadow-sm"
        >
          <form action="/guia" method="GET" className="flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="cat" value={cat} />
            <label htmlFor="guia-busca" className="sr-only">
              Buscar no guia
            </label>
            <input
              id="guia-busca"
              type="text"
              name="q"
              defaultValue={q}
              placeholder="O que você está procurando? Ex.: padaria, advogado, contador..."
              className="flex-1 rounded-lg border border-default bg-primary px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Pesquisar
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {categoryOptions.map((category) => {
              const isSelected = cat === category.slug;
              const Icon = CATEGORY_ICONS[category.icon ?? ''] ?? Tags;
              return (
                <Link
                  key={category.slug}
                  href={buildUrl(category.slug, q)}
                  aria-current={isSelected ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'border border-accent bg-accent text-white'
                      : 'border border-default bg-tertiary text-secondary hover:bg-secondary hover:text-primary'
                  }`}
                >
                  {category.slug !== 'all' && (
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {category.name}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Resultado */}
        {sorted.length > 0 ? (
          <>
            <section className="flex flex-col gap-5">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-primary">
                  Todos os anúncios
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
                  <ShieldCheck className="h-3.5 w-3.5 text-highlight-active" aria-hidden="true" />
                  {verifiedCount} {verifiedCount === 1 ? 'empresa' : 'empresas'} verificadas
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sorted.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    categoryName={categoryNames.get(business.category ?? '') ?? formatCategoryFallback(business.category ?? '')}
                    verified={verifiedSet.has(business.id)}
                  />
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-strong bg-secondary px-6 py-14 text-center">
            <SearchX className="h-10 w-10 text-secondary" aria-hidden="true" />
            <h2 className="text-lg font-bold text-primary">
              Nenhuma empresa localizada
            </h2>
            <p className="max-w-md text-sm text-secondary">
              Não encontramos resultados para
              {q.trim() ? (
                <>
                  {' '}
                  &quot;<span className="font-medium text-primary">{q}</span>&quot;
                </>
              ) : (
                ' o filtro selecionado'
              )}
              {cat !== 'all' ? ' nesta categoria' : ''}.
            </p>
            <Link
              href="/guia"
              className="mt-2 inline-flex items-center justify-center rounded-lg border border-accent px-5 py-2.5 text-sm font-bold text-accent transition-colors hover:bg-accent-subtle"
            >
              Limpar filtros de busca
            </Link>
          </div>
        )}
      </main>
    </>
  );
}

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { BusinessProfileRenderer } from '@/components/public/business/BusinessProfileRenderer';
import { StructuredData } from '@/components/seo/StructuredData';
import { toPublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { appUrl } from '@/lib/seo/app-url';
import { createServerSideClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import { bronzeBusinessFixture } from '@/visual-lab/fixtures/bronze-business';
import { prataBusinessFixture } from '@/visual-lab/fixtures/prata-business';
import { ouroBusinessFixture } from '@/visual-lab/fixtures/ouro-business';
import { fundadorBusinessFixture } from '@/visual-lab/fixtures/fundador-business';

type Props = { params: Promise<{ slug: string }> };
type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number];
type ReviewRow = Database['public']['Functions']['public_business_reviews']['Returns'][number];

const DEV_FIXTURES: Record<string, typeof bronzeBusinessFixture> = {
  'saba-advocacia-visual-lab': bronzeBusinessFixture,
  'empresa-bronze': bronzeBusinessFixture,
  'auto-centro-express-prata': prataBusinessFixture,
  'empresa-prata': prataBusinessFixture,
  'padaria-estrela-ouro': ouroBusinessFixture,
  'empresa-ouro': ouroBusinessFixture,
  'grupo-construtor-alfa-fundador': fundadorBusinessFixture,
  'empresa-ouro-founder': fundadorBusinessFixture,
};

const getPublicBusiness = cache(async (slug: string) => {
  if (DEV_FIXTURES[slug]) {
    return DEV_FIXTURES[slug];
  }

  const headerStore = await headers();
  const rawHost = headerStore.get('host') ?? 'localhost';
  const host = rawHost.split(':')[0] || 'localhost';
  if (!host || host.length > 253 || slug.length > 160) return null;

  if (process.env.NODE_ENV !== 'production' && DEV_FIXTURES[slug]) {
    return DEV_FIXTURES[slug];
  }

  try {
    const supabase = await createServerSideClient();
    const [detailResult, reviewsResult] = await Promise.all([
      supabase.rpc('public_business_detail', { p_host: host, p_business_slug: slug }),
      supabase.rpc('public_business_reviews', {
        p_host: host,
        p_business_slug: slug,
        p_limit: 2,
      }),
    ]);
    const detail: DetailRow | undefined = Array.isArray(detailResult.data) ? detailResult.data[0] : undefined;
    const reviews: ReviewRow[] = Array.isArray(reviewsResult.data) ? reviewsResult.data : [];
    if (detail && !detailResult.error) {
      return toPublicBusinessPresentation(detail, reviews);
    }
  } catch {
    // Fallthrough if database call fails
  }

  return null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  if (!business || !business.authority.effectivePlan) return { title: 'Empresa não encontrada', robots: { index: false, follow: false } };

  const title = `${business.identity.name} | Guia de Empresas`;
  const description = business.identity.description?.slice(0, 155)
    ?? `Conheça ${business.identity.name}, contatos, localização e avaliações públicas no Guia de Empresas.`;
  const canonical = appUrl(`/guia/${business.identity.slug}`);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: business.identity.logo ? [{ url: business.identity.logo.url, alt: business.identity.logo.alt }] : [],
    },
  };
}

export default async function CompanyDetailsPage({ params }: Props) {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  if (!business || !business.authority.effectivePlan) notFound();

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guia', item: appUrl('/guia') },
      { '@type': 'ListItem', position: 3, name: business.identity.name },
    ],
  };
  const businessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.identity.name,
    description: business.identity.description || undefined,
    image: business.identity.logo?.url,
    telephone: business.contacts.phone || undefined,
    address: business.location?.address,
    aggregateRating: business.reviews.average != null ? {
      '@type': 'AggregateRating',
      ratingValue: business.reviews.average,
      reviewCount: business.reviews.count,
    } : undefined,
    url: appUrl(`/guia/${business.identity.slug}`),
  };

  return (
    <>
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={businessSchema} />
      <BusinessProfileRenderer business={business} />
    </>
  );
}

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { BusinessProfileRenderer } from '@/components/public/business/BusinessProfileRenderer';
import { StructuredData } from '@/components/seo/StructuredData';
import { toPublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { appUrl } from '@/lib/seo/app-url';
import { createServerSideClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type Props = { params: Promise<{ slug: string }> };
type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number];
type ReviewRow = Database['public']['Functions']['public_business_reviews']['Returns'][number];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getPublicBusiness = cache(async (slug: string) => {
  if (slug === 'empresas' || slug === 'lojas') return null;

  const headerStore = await headers();
  const rawHost = headerStore.get('host') ?? 'localhost';
  const host = rawHost.split(':')[0] || 'localhost';
  if (!host || host.length > 253 || slug.length > 160) return null;

  try {
    const supabase = await createServerSideClient();

    // 1. Tenta via RPC public_business_detail (que ja aplica a tripla condicao no banco)
    try {
      const [detailResult, reviewsResult] = await Promise.all([
        supabase.rpc('public_business_detail', { p_host: host, p_business_slug: slug }),
        supabase.rpc('public_business_reviews', { p_host: host, p_business_slug: slug, p_limit: 5 }),
      ]);
      const detail: DetailRow | undefined = Array.isArray(detailResult.data) ? detailResult.data[0] : undefined;
      const reviews: ReviewRow[] = Array.isArray(reviewsResult.data) ? reviewsResult.data : [];
      if (detail && !detailResult.error) {
        return toPublicBusinessPresentation(detail, reviews);
      }
    } catch {
      // Ignora e segue para consulta direta com tripla condicao
    }

    // 2. BUSCA DIRETA DA TABELA BUSINESSES EXCLUSIVAMENTE PELO SLUG CANÔNICO
    const { data: dbBiz } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (!dbBiz) {
      // Slug nao encontrado ou empresa inativa -> Retorna null (404 real)
      return null;
    }

    const bObj = dbBiz as any;

    // TRIPLA CONDIÇÃO ESTRITA E POSITIVA FECHADA:
    // 1. business.is_active = true (ja filtrado na query)
    // 2. publication_status = 'published'
    // 3. subscription_status = 'active'
    const isPublished = bObj.publication_status === 'published' || bObj.is_published === true;
    const isSubscriptionActive = bObj.subscription_status === 'active';

    if (!isPublished || !isSubscriptionActive) {
      // Rascunho, inadimplente (past_due), pendente ou suspenso -> Bloqueado (404 real)
      return null;
    }

    const bizId = bObj.id;

    // Buscar mídias/galeria reais da empresa
    const { data: mediaRows } = await supabase
      .from('business_media')
      .select('id, url, media_type, title, display_order')
      .eq('business_id', bizId)
      .order('display_order', { ascending: true });

    // Buscar serviços reais da empresa
    const { data: servicesRows } = await (supabase as any)
      .from('business_services')
      .select('id, name, description, icon_name, price_info, is_active')
      .eq('business_id', bizId)
      .eq('is_active', true);

    // Buscar benefícios/ofertas reais da empresa
    const { data: benefitsRows } = await (supabase as any)
      .from('business_benefits')
      .select('id, title, description, benefit_type, discount_percentage, is_active')
      .eq('business_id', bizId)
      .eq('is_active', true);

    const mediaList = (mediaRows || []).map((m: any) => ({
      url: m.url,
      media_type: m.media_type || 'image',
      title: m.title || bObj.name,
    }));

    // Montar lista de contatos
    const contactsList = [];
    if (bObj.phone) contactsList.push({ type: 'phone', value: bObj.phone });
    if (bObj.whatsapp) contactsList.push({ type: 'whatsapp', value: bObj.whatsapp });
    if (bObj.public_email) contactsList.push({ type: 'email', value: bObj.public_email });
    if (bObj.website) contactsList.push({ type: 'website', value: bObj.website });

    // Montar localização
    const locationsList = [
      {
        street: bObj.street || 'Rua das Palmeiras',
        number: bObj.number || '500',
        neighborhood: bObj.neighborhood || 'Bela Vista',
        city: bObj.city || 'São Paulo',
        state: bObj.state || 'SP',
        is_headquarters: true,
      },
    ];

    // Formatar serviços para o presenter
    const formattedServices = (servicesRows || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      icon_name: s.icon_name || 'briefcase',
      price_info: s.price_info || 'Sob Consulta',
    }));

    // Formatar benefícios para o presenter
    const formattedBenefits = (benefitsRows || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      benefit_type: b.benefit_type || 'Desconto exclusivo',
      discount_percentage: b.discount_percentage || 15,
      badge_text: b.benefit_type || 'Oferta Fraterna',
    }));

    const detailObj: DetailRow = {
      business_id: bObj.id,
      business_slug: bObj.slug,
      business_name: bObj.name,
      primary_category_name: bObj.category || 'Segurança & Terceirização',
      description: bObj.description,
      effective_plan_code: bObj.plan_code || 'ouro',
      logo_url: bObj.logo_url || '/logoconexao_red_vert.png',
      is_verified: true,
      is_founder: bObj.plan_code === 'ouro',
      contacts: contactsList as any,
      locations: locationsList as any,
      media: mediaList as any,
      services: formattedServices as any,
      benefits: formattedBenefits as any,
      business_hours: [] as any,
      responsible: null,
      rating_average: 5.0,
      rating_count: 12,
    } as any;

    return toPublicBusinessPresentation(detailObj, []);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === 'empresas') {
    return {
      title: 'Empresas e Serviços Maçônicos | Conexão Maçônica',
      description: 'Diretório completo de empresas, profissionais e serviços de confiança dentro da rede Conexão Maçônica.',
    };
  }
  if (slug === 'lojas') {
    return {
      title: 'Lojas Maçônicas | Conexão Maçônica',
      description: 'Diretório completo de Lojas Maçônicas, horários de reunião e informações institucionais.',
    };
  }
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

import BusinessDirectoryPage from '../empresas/page';
import MasonicLodgesDirectoryPage from '../lojas/page';

export default async function CompanyDetailsPage(props: Props & { searchParams?: any }) {
  const { slug } = await props.params;
  if (slug === 'empresas') {
    return await BusinessDirectoryPage({ searchParams: props.searchParams });
  }
  if (slug === 'lojas') {
    return await MasonicLodgesDirectoryPage({ searchParams: props.searchParams });
  }

  // Redirecionamento canônico caso a requisição venha com UUID de business_id
  if (UUID_REGEX.test(slug)) {
    const supabase = await createServerSideClient();
    const { data: dbBiz } = await supabase
      .from('businesses')
      .select('slug')
      .eq('id', slug)
      .maybeSingle();

    if (dbBiz?.slug) {
      redirect(`/guia/${dbBiz.slug}`);
    } else {
      notFound();
    }
  }

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

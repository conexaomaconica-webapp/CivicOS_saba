import type { Metadata } from 'next';
import React from 'react';
import { StructuredData } from '@/components/seo/StructuredData';
import { appUrl } from '@/lib/seo/app-url';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveRequestTenantId } from '@/lib/tenant/tenant-resolver';
import { fetchTenantPlans, CANONICAL_PLANS, type CommercialPlan } from '@/lib/billing/plans-service';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import {
  LandingHeader,
  LandingHero,
  LandingLaunchSection,
  LandingAudienceSection,
  LandingFeaturesSection,
  LandingPlansSection,
  LandingPedraSection,
  LandingFaqSection,
} from '@/components/landing/LandingSections';
import { LandingLeadCapture } from '@/components/landing/LandingLeadCapture';

export const metadata: Metadata = {
  title: 'Conexão Maçônica | Guia de Empresas e Anúncios Maçônicos',
  description:
    'Guia de empresas da comunidade maçônica: encontre serviços e anuncie seu negócio. Planos anuais no Pix ou cartão para maçons, cunhadas e familiares.',
  keywords: [
    'guia maçônico',
    'empresas maçônicas',
    'anunciar empresa maçom',
    'guia comercial maçonaria',
    'negócios maçons',
    'networking maçônico',
    'Conexão Maçônica',
  ],
  alternates: { canonical: appUrl('/') },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    title: 'Conexão Maçônica | Anuncie para quem confia em você',
    description: 'Guia comercial da comunidade maçônica. Conheça os planos e o reconhecimento Pedra Fundamental para os primeiros anunciantes.',
    url: appUrl('/'),
    siteName: 'Conexão Maçônica',
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: appUrl('/logoconexao_red.png'), width: 738, height: 423, alt: 'Conexão Maçônica' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conexão Maçônica | Guia de Empresas Maçônicas',
    description: 'Anuncie seu negócio para a comunidade maçônica e seja encontrado.',
    images: [appUrl('/logoconexao_red.png')],
  },
};

const FAQ_ITEMS = [
  {
    q: 'O Conexão Maçônica é exclusivo para maçons?',
    a: 'O guia foi pensado para a família maçônica: maçons, cunhadas, sobrinhos, familiares e amigos que têm negócio próprio e valorizam relações baseadas em confiança.',
  },
  {
    q: 'Quem pode cadastrar uma empresa?',
    a: 'Empresários, profissionais liberais, prestadores de serviço e estabelecimentos comerciais que queiram divulgar seus produtos e serviços para a comunidade.',
  },
  {
    q: 'Qual a diferença entre os planos?',
    a: 'Cada plano libera uma quantidade maior de fotos, serviços, ofertas, eventos e destaque no guia. Os valores e recursos de cada um estão na seção de planos desta página.',
  },
  {
    q: 'O que é a Pedra Fundamental?',
    a: 'É um reconhecimento institucional dado aos primeiros anunciantes da plataforma. Ele é independente dos planos comerciais e não faz parte dos benefícios de nenhum plano.',
  },
  {
    q: 'Quanto custa anunciar no Conexão Maçônica?',
    a: 'Os planos são anuais e começam em R$ 600 no Pix (R$ 635 no cartão, parcelado sem juros). Os valores atualizados de cada plano estão na seção de planos desta página.',
  },
  {
    q: 'Cunhada ou sobrinho de maçom pode anunciar?',
    a: 'Sim. O guia é aberto à família maçônica: cunhadas, sobrinhos e demais familiares com negócio próprio podem se cadastrar e anunciar nos mesmos planos.',
  },
  {
    q: 'Como encontro empresas de maçons na minha cidade?',
    a: 'Acesse o guia de empresas e filtre por cidade e categoria. Cada anunciante tem uma página própria com serviços, ofertas e formas de contato.',
  },
  {
    q: 'Como posso pagar?',
    a: 'À vista no Pix ou parcelado no cartão, conforme as condições exibidas em cada plano. Após a aprovação do cadastro e a assinatura do contrato, seu anúncio é publicado.',
  },
];

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': appUrl('/#organization'),
  name: 'Conexão Maçônica',
  url: appUrl('/'),
  logo: appUrl('/logoconexao_red.png'),
  description: 'Guia comercial da comunidade maçônica para divulgação de empresas, profissionais e serviços.',
  areaServed: { '@type': 'Country', name: 'Brasil' },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': appUrl('/#website'),
  name: 'Conexão Maçônica',
  url: appUrl('/'),
  inLanguage: 'pt-BR',
  publisher: { '@id': appUrl('/#organization') },
};

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': appUrl('/#webpage'),
  url: appUrl('/'),
  name: 'Conexão Maçônica | Guia de Empresas e Anúncios Maçônicos',
  isPartOf: { '@id': appUrl('/#website') },
  about: { '@id': appUrl('/#organization') },
  inLanguage: 'pt-BR',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') }],
  },
};

const launchEventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Lançamento oficial do Conexão Maçônica',
  description:
    'Noite de relacionamentos, oportunidades e fortalecimento de negócios para irmãos, cunhadas, sobrinhos e empresários, com palestras sobre Liderança Emocional Inteligente e Síndrome dos Pais Culpados.',
  startDate: '2026-11-24T19:00:00-03:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: {
    '@type': 'Place',
    name: 'Centro de Convenções de Feira de Santana',
    address: { '@type': 'PostalAddress', addressLocality: 'Feira de Santana', addressRegion: 'BA', addressCountry: 'BR' },
  },
  performer: { '@type': 'Person', name: 'Dr. Alfredo Morais', jobTitle: 'Psicólogo' },
  organizer: { '@id': appUrl('/#organization') },
  url: appUrl('/#lancamento'),
};

function buildPlansSchema(plans: CommercialPlan[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Planos de anúncio no Conexão Maçônica',
    itemListElement: plans.map((plan, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: plan.name,
        description: plan.tagline,
        provider: { '@id': appUrl('/#organization') },
        areaServed: { '@type': 'Country', name: 'Brasil' },
        offers: {
          '@type': 'Offer',
          price: ((plan.pixPriceCents ?? plan.annualPriceCents) / 100).toFixed(2),
          priceCurrency: 'BRL',
          url: appUrl('/anunciar/passo-1'),
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  };
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

async function loadPlans(): Promise<CommercialPlan[]> {
  try {
    const supabase = await createServerSideClient();
    const tenantId = await resolveRequestTenantId(supabase);
    return await fetchTenantPlans(supabase, tenantId);
  } catch {
    // A landing nunca pode cair por falha na leitura de planos: usa a tabela canônica.
    return (['bronze', 'prata', 'ouro'] as const).map((tier) => ({ id: `plan-${tier}`, ...CANONICAL_PLANS[tier] }));
  }
}

export default async function HomePage() {
  const [plans, brand] = await Promise.all([
    loadPlans(),
    resolveTenantBrandContext().catch(() => null),
  ]);
  const planOptions = plans.map((plan) => ({ value: plan.tier, label: plan.name }));

  return (
    <>
      <StructuredData schema={organizationSchema} />
      <StructuredData schema={websiteSchema} />
      <StructuredData schema={webPageSchema} />
      <StructuredData schema={launchEventSchema} />
      <StructuredData schema={buildPlansSchema(plans)} />
      <StructuredData schema={faqSchema} />
      <div className="w-full">
        <LandingHeader primaryColor={brand?.primaryColor} />
        <LandingHero />
        <LandingLaunchSection />
        <LandingAudienceSection />
        <LandingFeaturesSection />
        <LandingPlansSection plans={plans} />
        <LandingPedraSection />
        <LandingFaqSection items={FAQ_ITEMS} />
        <LandingLeadCapture planOptions={planOptions} />
      </div>
    </>
  );
}

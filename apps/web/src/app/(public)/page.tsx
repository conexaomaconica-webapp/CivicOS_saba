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
  LandingPlansSection,
  LandingPedraSection,
  LandingFaqSection,
} from '@/components/landing/LandingSections';
import { LandingDifferentialsSection } from '@/components/landing/LandingDifferentialsSection';
import { LandingConnectionsMuralSection } from '@/components/landing/LandingConnectionsMuralSection';
import { LandingMetricsPreviewSection } from '@/components/landing/LandingMetricsPreviewSection';
import { LandingHowItWorksSection } from '@/components/landing/LandingHowItWorksSection';
import { LandingLeadCapture } from '@/components/landing/LandingLeadCapture';
import { getConfirmedConnectionsCountAction, getConnectionsFeedAction } from '@/app/actions/connections';

export const metadata: Metadata = {
  title: { absolute: 'Conexão Maçônica — Empresas, Benefícios e Conexões' },
  description:
    'Descubra empresas, profissionais, benefícios e oportunidades. Uma iniciativa que aproxima irmãos, cunhadas e sobrinhos, fortalece negócios, relacionamentos e a fraternidade.',
  keywords: [
    'Conexão Maçônica',
    'empresas maçônicas',
    'profissionais maçônicos',
    'benefícios maçonaria',
    'guia maçônico',
    'networking maçônico',
    'negócios maçons',
    'família maçônica',
  ],
  alternates: { canonical: appUrl('/') },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    title: 'Conexão Maçônica — Tradição que une, conexão que nos fortalece.',
    description: 'Conheça uma plataforma que valoriza negócios, aproxima irmãos, cunhadas e sobrinhos, fortalece negócios, relacionamentos e a fraternidade.',
    url: appUrl('/'),
    siteName: 'Conexão Maçônica',
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: appUrl('/logoconexao_red.png'), width: 738, height: 423, alt: 'Conexão Maçônica' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conexão Maçônica — Empresas, Benefícios e Conexões',
    description: 'Descubra empresas, serviços e benefícios. Conheça a Conexão Maçônica e faça parte dessa iniciativa.',
    images: [appUrl('/logoconexao_red.png')],
  },
};

const FAQ_ITEMS = [
  {
    q: 'A Conexão Maçônica é exclusiva para maçons?',
    a: 'A Conexão Maçônica foi criada para aproximar irmãos, cunhadas e sobrinhos, valorizando os laços de confiança que nos unem. A plataforma permite descobrir empresas, profissionais, produtos, serviços e benefícios, além de oferecer oportunidades de divulgação para negócios participantes da comunidade.',
  },
  {
    q: 'Quem pode cadastrar uma empresa?',
    a: 'Empresários, profissionais liberais e prestadores de serviços que atendam aos critérios de participação da Conexão Maçônica podem cadastrar seus negócios e apresentar produtos e serviços à comunidade.',
  },
  {
    q: 'Qual a diferença entre os planos?',
    a: 'Os planos Esquadro, Compasso e Acácia oferecem diferentes níveis de apresentação e destaque no guia, com recursos que variam conforme a modalidade contratada. Compare as funcionalidades e condições na seção de planos desta página.',
  },
  {
    q: 'O que é a Pedra Fundamental?',
    a: 'É um reconhecimento institucional destinado aos primeiros participantes da plataforma, independente dos planos comerciais e não vinculado como benefício de nenhuma modalidade.',
  },
  {
    q: 'Quanto custa participar da Conexão Maçônica?',
    a: 'A participação possui vigência anual com condições acessíveis, opção de parcelamento sem juros no cartão ou condição especial à vista no Pix. Os valores atualizados e limites de parcelas de cada categoria (Esquadro, Compasso e Acácia) estão detalhados na seção de planos desta página.',
  },
  {
    q: 'Cunhadas ou sobrinhos podem anunciar?',
    a: 'Sim. A plataforma é aberta para cunhadas e sobrinhos com negócio próprio ou atuação profissional. Podem se cadastrar e participar dos planos. As informações serão analisadas para verificação do irmão (maçon).',
  },
  {
    q: 'Como encontro empresas na minha cidade?',
    a: 'Acesse o guia de empresas e filtre por cidade e categoria. Cada participante tem uma página própria com informações, serviços, ofertas e formas diretas de contato.',
  },
  {
    q: 'Como funciona o processo até a publicação?',
    a: 'Você preenche os dados do seu negócio, escolhe o plano, assina o contrato digital e realiza o pagamento via Pix ou cartão. Após a verificação cadastral e a confirmação do pagamento quando aplicável, seu perfil é publicado oficialmente no guia.',
  },
];

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': appUrl('/#organization'),
  name: 'Conexão Maçônica',
  url: appUrl('/'),
  logo: appUrl('/logoconexao_red.png'),
  description: 'Plataforma de divulgação de empresas e profissionais, descoberta de benefícios e fortalecimento de conexões entre irmãos, cunhadas e sobrinhos.',
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
  name: 'Conexão Maçônica — Empresas, Benefícios e Conexões',
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
  name: 'Lançamento oficial da Conexão Maçônica',
  description:
    'Noite de relacionamentos, oportunidades e fortalecimento de negócios para irmãos, cunhadas e sobrinhos empresários, com palestras sobre Liderança Emocional Inteligente e Síndrome dos Pais Culpados.',
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
    name: 'Planos de participação na Conexão Maçônica',
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
  const [plans, brand, confirmedConnections, connectionsFeed] = await Promise.all([
    loadPlans(),
    resolveTenantBrandContext().catch(() => null),
    getConfirmedConnectionsCountAction().catch((err) => {
      console.error('[Mural/ConnectionsCount] Erro ao carregar total de conexões:', err);
      return 0;
    }),
    getConnectionsFeedAction(6).catch((err) => {
      console.error('[Mural/ConnectionsFeed] Erro ao carregar feed de conexões:', err);
      return [];
    }),
  ]);
  const planOrder: Record<string, number> = { ouro: 0, prata: 1, bronze: 2 };
  const sortedPlans = [...plans].sort((a, b) => (planOrder[a.tier] ?? 99) - (planOrder[b.tier] ?? 99));
  const planOptions = sortedPlans.map((plan) => ({ value: plan.tier, label: plan.name }));

  return (
    <>
      <StructuredData schema={organizationSchema} />
      <StructuredData schema={websiteSchema} />
      <StructuredData schema={webPageSchema} />
      <StructuredData schema={launchEventSchema} />
      <StructuredData schema={buildPlansSchema(sortedPlans)} />
      <StructuredData schema={faqSchema} />
      <div className="w-full">
        {/* 1. Hero institucional */}
        <LandingHeader primaryColor={brand?.primaryColor} />
        <LandingHero />

        {/* 2. Para quem é */}
        <LandingAudienceSection />

        {/* 3. Diferenciais do ecossistema */}
        <LandingDifferentialsSection />

        {/* 4. Mural de Conexões */}
        <LandingConnectionsMuralSection items={connectionsFeed} confirmedTotal={confirmedConnections} />

        {/* 5. Visibilidade e resultados */}
        <LandingMetricsPreviewSection />

        {/* 6. Como participar */}
        <LandingHowItWorksSection />

        {/* 7. Planos comerciais Esquadro, Compasso e Acácia */}
        <LandingPlansSection plans={plans} />

        {/* 8. Pedra Fundamental */}
        <LandingPedraSection />

        {/* 9. Lançamento oficial de 24/11/2026 */}
        <LandingLaunchSection />

        {/* 10. FAQ e captação de interessados */}
        <LandingFaqSection items={FAQ_ITEMS} />
        <LandingLeadCapture planOptions={planOptions} />
      </div>
    </>
  );
}

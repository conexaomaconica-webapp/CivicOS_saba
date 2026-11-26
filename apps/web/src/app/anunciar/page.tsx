import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { resolveRequestTenantId } from '@/lib/tenant/tenant-resolver';
import { fetchTenantPlans, CANONICAL_PLANS, type CommercialPlan } from '@/lib/billing/plans-service';
import {
  buildLegacyStep1RedirectUrl,
  isAdvertiseLandingEnabled,
  pickAllowedAttributionParams,
  toPublicAdvertisePlan,
} from '@/lib/billing/advertise-landing';
import { getAppUrl } from '@/lib/seo/app-url';
import { StructuredData } from '@/components/seo/StructuredData';
import { TrackEvent } from '@/components/analytics/TrackEvent';
import AdvertiseLandingClient from '@/components/anunciar/AdvertiseLandingClient';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const enabled = isAdvertiseLandingEnabled();
  const brand = await resolveTenantBrandContext().catch(() => null);
  const appName = brand?.appName || 'Conexão Maçônica';
  const baseUrl = getAppUrl();
  const canonicalUrl = `${baseUrl}/anunciar`;
  const title = `Anuncie sua empresa | ${appName}`;
  const description =
    'Apresente sua empresa no Guia Comercial Oficial, aplicativos Android e iOS, Mural de Conexões e Clube de Vantagens. Conheça os planos Esquadro, Compasso e Acácia.';

  if (!enabled) {
    return {
      title: `Cadastrar empresa | ${appName}`,
      robots: { index: false, follow: true },
    };
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: appName,
      type: 'website',
      locale: 'pt_BR',
    },
    robots: { index: true, follow: true },
  };
}

export default async function AnunciarIndexPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!isAdvertiseLandingEnabled()) {
    redirect(buildLegacyStep1RedirectUrl(params));
  }

  const brand = await resolveTenantBrandContext().catch(() => null);
  const appName = brand?.appName || 'Conexão Maçônica';
  const supabase = await createServerSideClient();
  const tenantId = await resolveRequestTenantId(supabase).catch(() => null);

  let plans: CommercialPlan[] = [];
  try {
    plans = await fetchTenantPlans(supabase, tenantId);
  } catch {
    plans = [
      { id: 'plan-bronze', ...CANONICAL_PLANS.bronze },
      { id: 'plan-prata', ...CANONICAL_PLANS.prata },
      { id: 'plan-ouro', ...CANONICAL_PLANS.ouro },
    ];
  }

  // Detecta se o visitante já possui cadastro iniciado para oferecer retomada rápida
  let continueStepHref: string | null = null;
  let continueBusinessName: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: draftBiz } = await (supabase as any)
        .from('businesses')
        .select('id, name, plan_tier, publication_status')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (draftBiz && draftBiz.publication_status !== 'published') {
        continueBusinessName = draftBiz.name ?? null;
        if (draftBiz.plan_tier && draftBiz.plan_tier !== 'bronze_draft') {
          continueStepHref = '/anunciar/passo-5';
        } else {
          continueStepHref = '/anunciar/passo-3';
        }
      }
    }
  } catch {
    // Segue sem bloquear a página pública
  }

  const baseUrl = getAppUrl();
  const structuredSchemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `Planos para Anunciantes — ${appName}`,
      serviceType: 'Divulgação Empresarial em Guia Comercial',
      provider: {
        '@type': 'Organization',
        name: appName,
        url: baseUrl,
      },
      areaServed: 'BR',
      url: `${baseUrl}/anunciar`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'Anunciar', item: `${baseUrl}/anunciar` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Como funciona o cadastro da empresa?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Você escolhe o plano desejado, preenche os dados do responsável e da empresa, informa o vínculo maçônico e finaliza a contratação online.',
          },
        },
        {
          '@type': 'Question',
          name: 'Posso alterar o plano antes ou depois de iniciar o cadastro?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. Ao clicar em um plano aqui, ele já vai pré-selecionado para o onboarding, mas você pode alterá-lo livremente na etapa de confirmação antes do contrato.',
          },
        },
        {
          '@type': 'Question',
          name: 'Onde minha empresa será exibida após a ativação?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sua empresa passa a constar no Guia Comercial da Conexão Maçônica na Web e nos aplicativos oficiais para Android e iOS.',
          },
        },
      ],
    },
  ];

  const publicPlans = plans.map(toPublicAdvertisePlan);
  const safeAttributionParams = pickAllowedAttributionParams(params);
  const allowPricingPreview =
    process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';
  const pricingDisplayMode =
    allowPricingPreview && params.pricing === 'visible' ? 'visible' : 'collapsed';

  return (
    <>
      <StructuredData schema={structuredSchemas} />
      <TrackEvent
        name="generate_lead"
        onceKey="advertise_landing_view"
        params={{
          source_page: 'anunciar_landing',
          lead_type: 'advertise_landing_view',
        }}
      />
      <AdvertiseLandingClient
        appName={appName}
        logoUrl={brand?.logoUrl ?? null}
        plans={publicPlans}
        attributionParams={safeAttributionParams}
        continueStepHref={continueStepHref}
        continueBusinessName={continueBusinessName}
        pricingDisplayMode={pricingDisplayMode}
      />
    </>
  );
}

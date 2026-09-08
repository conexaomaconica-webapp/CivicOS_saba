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

import { getInstitutionalRecognitionsAction } from '@/app/actions/institutional-recognitions';

type Props = { params: Promise<{ slug: string }> };
type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number];
type ReviewRow = Database['public']['Functions']['public_business_reviews']['Returns'][number];

import { bronzeBusinessFixture } from '@/visual-lab/fixtures/bronze-business';
import { prataBusinessFixture } from '@/visual-lab/fixtures/prata-business';
import { ouroBusinessFixture } from '@/visual-lab/fixtures/ouro-business';
import { fundadorBusinessFixture } from '@/visual-lab/fixtures/fundador-business';
import { pedraFundamentalBusinessFixture } from '@/visual-lab/fixtures/pedra-fundamental-business';
import { colunaHonraBusinessFixture } from '@/visual-lab/fixtures/coluna-honra-business';

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
      const [detailResult, reviewsResult, recognitionsResult] = await Promise.all([
        supabase.rpc('public_business_detail', { p_business_slug: slug, p_host: host }),
        supabase.rpc('public_business_reviews', { p_host: host, p_business_slug: slug, p_limit: 5 }),
        getInstitutionalRecognitionsAction(),
      ]);
      const detail: DetailRow | undefined = Array.isArray(detailResult.data) ? detailResult.data[0] : undefined;
      const reviews: ReviewRow[] = Array.isArray(reviewsResult.data) ? reviewsResult.data : [];
      const catalog = recognitionsResult?.data || undefined;

      if (detail && !detailResult.error) {
        const detailObj = detail as any;
        let bizId = detailObj.business_id || detailObj.id;

        if (!bizId && (detailObj.business_slug || slug)) {
          try {
            const targetSlug = detailObj.business_slug || slug;
            const { data: bRow } = await (supabase as any)
              .from('businesses')
              .select('id')
              .eq('slug', targetSlug)
              .maybeSingle();
            if (bRow?.id) {
              bizId = bRow.id;
              detailObj.business_id = bRow.id;
            }
          } catch (_e) {}
        }

        if (bizId) {
          const { data: resp } = await (supabase as any)
            .from('business_responsibles')
            .select('name, business_role, community_label, organization, avatar_url')
            .eq('business_id', bizId)
            .maybeSingle();

          if (resp) {
            detailObj.responsible = {
              name: resp.name,
              business_role: resp.business_role || 'Proprietário',
              community_label: resp.community_label || 'Ir.\'.',
              organization: resp.organization,
              avatar_url: resp.avatar_url,
            };
          }

          try {
            const { data: bFlags } = await (supabase as any)
              .from('businesses')
              .select('*')
              .eq('id', bizId)
              .maybeSingle();

            if (bFlags) {
              if (bFlags.is_pedra_fundamental !== undefined) detailObj.is_pedra_fundamental = Boolean(bFlags.is_pedra_fundamental);
              if (bFlags.is_coluna_honra !== undefined) detailObj.is_coluna_honra = Boolean(bFlags.is_coluna_honra);
              if (bFlags.is_verified !== undefined) detailObj.is_verified = Boolean(bFlags.is_verified);
              if (bFlags.plan_tier || bFlags.plan_code) detailObj.effective_plan_code = bFlags.plan_tier || bFlags.plan_code;
            }
          } catch (_e) {}

          // Resolução canônica via business_recognitions
          try {
            const { data: recList } = await (supabase as any)
              .from('business_recognitions')
              .select('recognition_key, is_active')
              .eq('business_id', bizId)
              .eq('is_active', true);
            if (recList && recList.length > 0) {
              recList.forEach((r: any) => {
                if (r.recognition_key === 'pedra_fundamental') detailObj.is_pedra_fundamental = true;
                if (r.recognition_key === 'coluna_de_honra') {
                  detailObj.is_coluna_honra = true;
                  detailObj.is_founder = true;
                }
              });
            }
          } catch (_e) {}

          try {
            const { data: mLink } = await (supabase as any)
              .from('business_masonic_links')
              .select('status, organizations(name)')
              .eq('business_id', bizId)
              .maybeSingle();
            if (mLink?.status === 'verified' || mLink?.status === 'approved' || mLink?.status === 'active') {
              detailObj.is_verified = true;
            }
            if (mLink?.organizations?.name) {
              detailObj.lodge_name = mLink.organizations.name;
              if (detailObj.responsible && !detailObj.responsible.organization) {
                detailObj.responsible.organization = mLink.organizations.name;
              }
            }
          } catch (_e) {}

          try {
            const { data: bLoc } = await (supabase as any)
              .from('business_locations')
              .select('city, state, address, street, number')
              .eq('business_id', bizId)
              .maybeSingle();

            if (bLoc) {
              if (!detailObj.city) detailObj.city = bLoc.city;
              if (!detailObj.state) detailObj.state = bLoc.state;
              if (!detailObj.address) detailObj.address = bLoc.address || (bLoc.street ? `${bLoc.street}${bLoc.number ? ', ' + bLoc.number : ''}` : undefined);
            }
          } catch (_e) {}

          try {
            const { data: bContacts } = await (supabase as any)
              .from('business_contacts')
              .select('type, value')
              .eq('business_id', bizId)
              .eq('is_public', true);

            if (bContacts && bContacts.length > 0) {
              bContacts.forEach((c: any) => {
                if (c.type === 'phone' && !detailObj.phone) detailObj.phone = c.value;
                if (c.type === 'whatsapp' && !detailObj.whatsapp) detailObj.whatsapp = c.value;
                if (c.type === 'email' && !detailObj.email) detailObj.email = c.value;
                if (c.type === 'website' && !detailObj.website) detailObj.website = c.value;
              });
            }
          } catch (_e) {}
        }

        return toPublicBusinessPresentation(detailObj, reviews, catalog);
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
      // Fallback amigável para homologação dos perfis de teste na rota pública real /guia/[slug]
      if (slug === 'saba-advocacia-visual-lab') return bronzeBusinessFixture;
      if (slug === 'auto-centro-express-prata') return prataBusinessFixture;
      if (slug === 'padaria-estrela-ouro') return ouroBusinessFixture;
      if (slug === 'grupo-construtor-alfa-fundador') return fundadorBusinessFixture;
      if (slug === 'padaria-estrela-pedra-fundamental') return pedraFundamentalBusinessFixture;
      if (slug === 'padaria-estrela-coluna-honra') return colunaHonraBusinessFixture;
      return null;
    }

    const bObj = dbBiz as any;

    // Buscar status da assinatura na tabela subscriptions
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('business_id', bObj.id)
      .order('created_at', { ascending: false })
      .maybeSingle();

    const subStatus = subData?.status || bObj.subscription_status || 'active';

    // TRIPLA CONDIÇÃO ESTRITA E POSITIVA FECHADA:
    // 1. business.is_active = true (ja filtrado na query)
    // 2. publication_status = 'published' ou is_published = true
    // 3. subscription_status em ('active', 'trialing', 'trailing')
    const isPublished = bObj.publication_status === 'published' || bObj.is_published === true;
    const isSubscriptionActive = ['active', 'trialing', 'trailing'].includes(subStatus);

    if (!isPublished || !isSubscriptionActive) {
      // Rascunho, inadimplente (past_due), pendente ou suspenso -> Bloqueado (404 real)
      return null;
    }

    const bizId = bObj.id;

    // Buscar mídias, serviços, benefícios, responsável, reconhecimentos e vínculo maçônico em paralelo
    const [
      { data: mediaRows },
      { data: servicesRows },
      { data: benefitsRows },
      { data: contactsRows },
      { data: respRow },
      { data: recRows },
      { data: linkRow },
    ] = await Promise.all([
      (supabase as any).from('business_media').select('*').eq('business_id', bizId).order('display_order', { ascending: true }),
      (supabase as any).from('business_services').select('*').eq('business_id', bizId).eq('is_active', true).order('display_order', { ascending: true }),
      (supabase as any).from('business_benefits').select('*').eq('business_id', bizId).eq('is_active', true).order('display_order', { ascending: true }),
      (supabase as any).from('business_contacts').select('*').eq('business_id', bizId),
      (supabase as any).from('business_responsibles').select('name, business_role, community_label, organization, avatar_url').eq('business_id', bizId).maybeSingle(),
      (supabase as any).from('business_recognitions').select('recognition_key, is_active').eq('business_id', bizId).eq('is_active', true),
      (supabase as any).from('business_masonic_links').select('status, organizations(name)').eq('business_id', bizId).maybeSingle(),
    ]);

    const lodgeNameFromLink = linkRow?.organizations?.name || bObj.masonic_lodge || null;

    const responsibleObj = respRow
      ? {
          name: respRow.name,
          business_role: respRow.business_role || 'Proprietário',
          community_label: respRow.community_label || 'Ir.\'.',
          organization: respRow.organization || lodgeNameFromLink,
          avatar_url: respRow.avatar_url,
        }
      : bObj.owner_name
      ? {
          name: bObj.owner_name,
          business_role: 'Proprietário',
          community_label: 'Ir.\'.',
          organization: bObj.organization || lodgeNameFromLink,
          avatar_url: bObj.owner_avatar_url || null,
        }
      : null;

    const effectivePlanCode = bObj.plan_tier || bObj.plan_code || 'ouro';

    const activeRecKeys = (recRows || []).map((r: any) => r.recognition_key);
    const isPedraFund = activeRecKeys.includes('pedra_fundamental');
    const isColunaHonra = activeRecKeys.includes('coluna_de_honra');
    const isVerified = linkRow?.status === 'approved' || linkRow?.status === 'active' || linkRow?.status === 'verified' || Boolean(bObj.is_verified);

    const detailObj: DetailRow = {
      business_id: bObj.id,
      business_slug: bObj.slug,
      business_name: bObj.name,
      primary_category_name: bObj.category || 'Empresa Maçônica',
      description: bObj.description,
      effective_plan_code: effectivePlanCode,
      logo_url: bObj.logo_url,
      is_verified: isVerified,
      is_founder: isColunaHonra,
      is_pedra_fundamental: isPedraFund,
      is_coluna_honra: isColunaHonra,
      lodge_name: lodgeNameFromLink,
      contacts: (contactsRows || []) as any,
      locations: [
        {
          street: bObj.street || 'Rua das Palmeiras',
          number: bObj.number || '500',
          neighborhood: bObj.neighborhood || 'Bela Vista',
          city: bObj.city || 'São Paulo',
          state: bObj.state || 'SP',
          is_headquarters: true,
        },
      ] as any,
      media: (mediaRows || []) as any,
      services: (servicesRows || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon_name: s.icon_name || 'briefcase',
        price_info: s.price_info || 'Sob Consulta',
      })) as any,
      benefits: (benefitsRows || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        benefit_type: b.benefit_type || 'Desconto exclusivo',
        discount_percentage: b.discount_percentage || 15,
        badge_text: b.benefit_type || 'Oferta Fraterna',
      })) as any,
      business_hours: [] as any,
      responsible: responsibleObj as any,
      rating_average: 5.0,
      rating_count: 12,
    } as any;

    const recognitionsResult = await getInstitutionalRecognitionsAction();
    return toPublicBusinessPresentation(detailObj, [], recognitionsResult?.data);

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
  if (!business) return { title: 'Empresa não encontrada', robots: { index: false, follow: false } };

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

import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import '@/styles/directory-home.css';

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
  if (!business) notFound();

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
    <FavoritesProvider>
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={businessSchema} />
      <DirectoryHeader />
      <BusinessProfileRenderer business={business} />
      <DirectoryFavoritesModal />
      <DirectoryFooter />
    </FavoritesProvider>
  );
}


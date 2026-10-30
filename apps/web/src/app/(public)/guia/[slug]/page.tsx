import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { cache } from 'react';
import { BusinessProfileRenderer } from '@/components/public/business/BusinessProfileRenderer';
import { BusinessContactTracker } from '@/components/public/business/BusinessContactTracker';
import { StructuredData } from '@/components/seo/StructuredData';
import { toPublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { appUrl } from '@/lib/seo/app-url';
import { buildLowercaseSlugRedirect } from '@/lib/seo/slug-redirect';
import { BusinessBreadcrumb } from '@/components/public/business/BusinessBreadcrumb';
import { breadcrumbJsonLd, buildBusinessBreadcrumb } from '@/lib/seo/business-breadcrumb';
import { getDirectoryIndex } from '@/lib/seo/directory-seo-server';
import {
  buildBusinessDescription,
  buildBusinessTitle,
  buildLocalBusinessSchema,
  businessCanonicalUrl,
  isBusinessIndexable,
  type BusinessSeoOverrides,
} from '@/lib/seo/business-seo';
import { createClient } from '@supabase/supabase-js';
import { createServerSideClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

import { getInstitutionalRecognitionsAction } from '@/app/actions/institutional-recognitions';
import { resolveResponsibleRole, resolveTreatmentLabel } from '@/lib/business/responsible-role-resolver';
import { BusinessPreviewApprovalBar } from '@/components/public/business/preview/BusinessPreviewApprovalBar';

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };
type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number] & {
  views_count?: number;
  views?: number;
  [key: string]: any;
};
type ReviewRow = Database['public']['Functions']['public_business_reviews']['Returns'][number];

import { bronzeBusinessFixture } from '@/visual-lab/fixtures/bronze-business';
import { prataBusinessFixture } from '@/visual-lab/fixtures/prata-business';
import { ouroBusinessFixture } from '@/visual-lab/fixtures/ouro-business';
import { fundadorBusinessFixture } from '@/visual-lab/fixtures/fundador-business';
import { pedraFundamentalBusinessFixture } from '@/visual-lab/fixtures/pedra-fundamental-business';
import { colunaHonraBusinessFixture } from '@/visual-lab/fixtures/coluna-honra-business';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getPublicBusiness = cache(async (slug: string, isPreview: boolean = false) => {
  if (slug === 'empresas' || slug === 'lojas') return null;

  const headerStore = await headers();
  const rawHost = headerStore.get('host') ?? 'localhost';
  const host = rawHost.split(':')[0] || 'localhost';
  if (!host || host.length > 253 || slug.length > 160) return null;

  try {
    const supabase = await createServerSideClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbReader = supabaseUrl && serviceRoleKey
      ? createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : supabase;

    // 1. Tenta via RPC public_business_detail (que aplica a tripla condição no banco caso esteja publicado)
    if (!isPreview) {
      try {
        const [detailResult, reviewsResult, recognitionsResult] = await Promise.all([
          supabase.rpc('public_business_detail', { p_business_slug: slug, p_host: host }),
          supabase.rpc('public_business_reviews', { p_host: host, p_business_slug: slug, p_limit: 50 }),
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
            const { data: bRow } = await (dbReader as any)
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
          const [{ data: resp }, { data: link }, { data: attrRows }] = await Promise.all([
            (dbReader as any)
              .from('business_responsibles')
              .select('name, business_role, community_label, organization, whatsapp, avatar_url')
              .eq('business_id', bizId)
              .maybeSingle(),
            (dbReader as any)
              .from('business_masonic_links')
              .select('status, eligibility_type, reference_mason_name, reference_mason_cim, family_relationship, organizations(name)')
              .eq('business_id', bizId)
              .maybeSingle(),
            (dbReader as any)
              .from('business_attributes')
              .select('attribute_key, attribute_value')
              .eq('business_id', bizId),
          ]);

          if (attrRows && Array.isArray(attrRows)) {
            for (const attr of attrRows) {
              if (attr.attribute_key === 'short_description') (detailObj as any).short_description = attr.attribute_value;
              if (attr.attribute_key === 'logo_background_color' || attr.attribute_key === 'logo_bg_color') (detailObj as any).logo_background_color = attr.attribute_value;
              if (attr.attribute_key === 'cover_offset_y') (detailObj as any).cover_offset_y = attr.attribute_value;
              if (attr.attribute_key === 'cover_zoom') (detailObj as any).cover_zoom = attr.attribute_value;
              if (attr.attribute_key === 'cover_fit_mode') (detailObj as any).cover_fit_mode = attr.attribute_value;
              if (attr.attribute_key === 'cover_background_color') (detailObj as any).cover_background_color = attr.attribute_value;
              if (attr.attribute_key === 'client_approved_at') (detailObj as any).client_approved_at = attr.attribute_value;
              if (attr.attribute_key === 'client_approved_by') (detailObj as any).client_approved_by = attr.attribute_value;
            }
          }

          if (resp) {
            const isLinkApproved = link?.status === 'approved' || link?.status === 'active' || isPreview;
            const categoryName = (detailObj as any).primary_category_name || null;
            detailObj.responsible = {
              name: resp.name,
              business_role: resolveResponsibleRole({
                businessRole: resp.business_role,
                communityLabel: resp.community_label,
                category: categoryName,
                eligibilityType: link?.eligibility_type,
                familyRelationship: link?.family_relationship,
              }),
              community_label: resolveTreatmentLabel({
                communityLabel: resp.community_label,
                eligibilityType: link?.eligibility_type,
                familyRelationship: link?.family_relationship,
              }),
              organization: resp.organization || link?.organizations?.name || null,
              whatsapp: resp.whatsapp,
              avatar_url: resp.avatar_url,
              reference_mason_name: isLinkApproved ? (link?.reference_mason_name || null) : null,
              family_relationship: link?.family_relationship || null,
              eligibility_type: link?.eligibility_type || null,
              is_masonic_verified: isLinkApproved,
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
              if (bFlags.publication_status) (detailObj as any).publication_status = bFlags.publication_status;
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
              detailObj.contacts = bContacts;
              bContacts.forEach((c: any) => {
                if (c.type === 'phone' && !detailObj.phone) detailObj.phone = c.value;
                if (c.type === 'whatsapp' && !detailObj.whatsapp) detailObj.whatsapp = c.value;
                if (c.type === 'email' && !detailObj.email) detailObj.email = c.value;
                if (c.type === 'website' && !detailObj.website) detailObj.website = c.value;
                if (c.type === 'youtube' && !detailObj.youtube) detailObj.youtube = c.value;
                if (c.type === 'instagram' && !detailObj.instagram) detailObj.instagram = c.value;
                if (c.type === 'facebook' && !detailObj.facebook) detailObj.facebook = c.value;
                if (c.type === 'linkedin' && !detailObj.linkedin) detailObj.linkedin = c.value;
              });
            }
          } catch (_e) {}

          try {
            const { data: bMedia } = await (dbReader as any)
              .from('business_media')
              .select('*')
              .eq('business_id', bizId)
              .order('display_order', { ascending: true });

            if (bMedia && bMedia.length > 0) {
              detailObj.media = bMedia;
            }
          } catch (_e) {}

          // Contagem de visualizações da página da empresa por atualização (event_name = 'view')
          try {
            const { count: vCount } = await (dbReader as any)
              .from('analytics_events')
              .select('id', { count: 'exact', head: true })
              .eq('business_id', bizId)
              .eq('event_name', 'view');
            detailObj.views_count = typeof vCount === 'number' ? vCount : 0;
            detailObj.views = detailObj.views_count;
          } catch (_e) {}
        }

        try {
          const planCode = detailObj.effective_plan_code === 'ouro_founder'
            ? 'ouro'
            : detailObj.effective_plan_code || 'bronze';
          const { data: planRule } = await (supabase as any)
            .from('plan_payment_rules')
            .select('profile_section_order')
            .eq('plan_code', planCode)
            .maybeSingle();
          if (Array.isArray(planRule?.profile_section_order)) {
            detailObj.profile_section_order = planRule.profile_section_order;
          }
        } catch (_e) {}

        const presentation = toPublicBusinessPresentation(detailObj, reviews, catalog);
        presentation.isPreview = isPreview;
        presentation.publicationStatus = (detailObj as any).publication_status || 'published';
        (presentation as any).clientApprovedAt = (detailObj as any).client_approved_at || null;
        (presentation as any).clientApprovedBy = (detailObj as any).client_approved_by || null;
        (presentation as any).isClientApproved = Boolean((detailObj as any).client_approved_at);
        return presentation;
      }
    } catch {
      // Ignora e segue para consulta direta
    }
  }

    // 2. BUSCA DIRETA DA TABELA BUSINESSES (PELO SLUG CANÔNICO OU ID)
    let bizQuery = dbReader
      .from('businesses')
      .select('*');

    if (UUID_REGEX.test(slug)) {
      bizQuery = bizQuery.eq('id', slug);
    } else {
      bizQuery = bizQuery.eq('slug', slug);
    }

    if (!isPreview) {
      bizQuery = bizQuery.eq('is_active', true);
    }

    const { data: dbBiz } = await bizQuery.maybeSingle();

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
    const { data: subData } = await dbReader
      .from('subscriptions')
      .select('status')
      .eq('business_id', bObj.id)
      .order('created_at', { ascending: false })
      .maybeSingle();

    const subStatus = subData?.status || bObj.subscription_status || 'active';

    // TRIPLA CONDIÇÃO ESTRITA E POSITIVA FECHADA (apenas para acesso público indexável, ignorada em pré-visualização):
    const isPublished = bObj.publication_status === 'published';
    const isSubscriptionActive = ['active', 'trialing', 'trailing'].includes(subStatus);

    if (!isPreview && (!isPublished || !isSubscriptionActive)) {
      // Rascunho, inadimplente (past_due), pendente ou suspenso -> Bloqueado (404 real)
      return null;
    }

    const bizId = bObj.id;

    // Buscar mídias, serviços, benefícios, responsável, reconhecimentos, vínculo maçônico, localização e horários em paralelo
    const [
      { data: mediaRows },
      { data: servicesRows },
      { data: benefitsRows },
      { data: contactsRows },
      { data: respRow },
      { data: recRows },
      { data: linkRow },
      { data: categoryRows },
      { data: locationRow },
      { data: hoursRows },
      { data: attrRows },
    ] = await Promise.all([
      (dbReader as any).from('business_media').select('*').eq('business_id', bizId).order('display_order', { ascending: true }),
      (dbReader as any).from('business_services').select('*').eq('business_id', bizId).eq('is_active', true).order('display_order', { ascending: true }),
      (dbReader as any).from('business_benefits').select('*').eq('business_id', bizId).eq('is_active', true).order('display_order', { ascending: true }),
      (dbReader as any).from('business_contacts').select('*').eq('business_id', bizId),
      (dbReader as any).from('business_responsibles').select('name, business_role, community_label, organization, whatsapp, avatar_url').eq('business_id', bizId).maybeSingle(),
      (dbReader as any).from('business_recognitions').select('recognition_key, is_active').eq('business_id', bizId).eq('is_active', true),
      (dbReader as any).from('business_masonic_links').select('status, eligibility_type, reference_mason_name, reference_mason_cim, family_relationship, organizations(name)').eq('business_id', bizId).maybeSingle(),
      (dbReader as any).from('business_categories').select('is_primary, categories(name)').eq('business_id', bizId).order('is_primary', { ascending: false }).limit(1),
      (dbReader as any).from('business_locations').select('city, state, address, street, number, postal_code, neighborhood, latitude, longitude').eq('business_id', bizId).maybeSingle(),
      (dbReader as any).from('business_hours').select('*').eq('business_id', bizId),
      (dbReader as any).from('business_attributes').select('attribute_key, attribute_value').eq('business_id', bizId),
    ]);

    let shortDescription: string | null = null;
    let logoBackgroundColor: string | null = null;
    let coverOffsetY: string | null = null;
    let coverZoom: string | null = null;
    let coverFitMode: string | null = null;
    let coverBackgroundColor: string | null = null;
    let clientApprovedAt: string | null = null;
    let clientApprovedBy: string | null = null;

    if (attrRows && Array.isArray(attrRows)) {
      for (const attr of attrRows) {
        if (attr.attribute_key === 'short_description') shortDescription = attr.attribute_value;
        if (attr.attribute_key === 'logo_background_color' || attr.attribute_key === 'logo_bg_color') logoBackgroundColor = attr.attribute_value;
        if (attr.attribute_key === 'cover_offset_y') coverOffsetY = attr.attribute_value;
        if (attr.attribute_key === 'cover_zoom') coverZoom = attr.attribute_value;
        if (attr.attribute_key === 'cover_fit_mode') coverFitMode = attr.attribute_value;
        if (attr.attribute_key === 'cover_background_color') coverBackgroundColor = attr.attribute_value;
        if (attr.attribute_key === 'client_approved_at') clientApprovedAt = attr.attribute_value;
        if (attr.attribute_key === 'client_approved_by') clientApprovedBy = attr.attribute_value;
      }
    }

    const lodgeNameFromLink = linkRow?.organizations?.name || bObj.masonic_lodge || null;

    const isVerified = linkRow?.status === 'approved' || linkRow?.status === 'active' || linkRow?.status === 'verified' || Boolean(bObj.is_verified) || isPreview;

    const categoryName = categoryRows?.[0]?.categories?.name || bObj.category || null;

    const responsibleObj = respRow
      ? {
          name: respRow.name,
          business_role: resolveResponsibleRole({
            businessRole: respRow.business_role,
            communityLabel: respRow.community_label,
            category: categoryName,
            eligibilityType: linkRow?.eligibility_type,
            familyRelationship: linkRow?.family_relationship,
          }),
          community_label: resolveTreatmentLabel({
            communityLabel: respRow.community_label,
            eligibilityType: linkRow?.eligibility_type,
            familyRelationship: linkRow?.family_relationship,
          }),
          organization: respRow.organization || lodgeNameFromLink,
          whatsapp: respRow.whatsapp,
          avatar_url: respRow.avatar_url,
          reference_mason_name: isVerified ? (linkRow?.reference_mason_name || null) : null,
          family_relationship: linkRow?.family_relationship || null,
          eligibility_type: linkRow?.eligibility_type || null,
          is_masonic_verified: isVerified,
        }
      : bObj.owner_name
      ? {
          name: bObj.owner_name,
          business_role: resolveResponsibleRole({
            businessRole: 'Proprietário',
            communityLabel: 'Ir.\'.',
            category: categoryName,
            eligibilityType: linkRow?.eligibility_type,
            familyRelationship: linkRow?.family_relationship,
          }),
          community_label: 'Ir.\'.',
          organization: bObj.organization || lodgeNameFromLink,
          avatar_url: bObj.owner_avatar_url || null,
          reference_mason_name: isVerified ? (linkRow?.reference_mason_name || null) : null,
          family_relationship: linkRow?.family_relationship || null,
          eligibility_type: linkRow?.eligibility_type || null,
          is_masonic_verified: isVerified,
        }
      : null;

    const effectivePlanCode = bObj.plan_tier || bObj.plan_code || 'ouro';

    const activeRecKeys = (recRows || []).map((r: any) => r.recognition_key);
    const isPedraFund = activeRecKeys.includes('pedra_fundamental') || Boolean(bObj.is_pedra_fundamental);
    const isColunaHonra = activeRecKeys.includes('coluna_de_honra') || Boolean(bObj.is_founder);

    const detailObj: DetailRow = {
      business_id: bObj.id,
      business_slug: bObj.slug,
      business_name: bObj.name,
      primary_category_name: categoryRows?.[0]?.categories?.name || bObj.category || 'Empresa Maçônica',
      description: bObj.description,
      effective_plan_code: effectivePlanCode,
      logo_url: bObj.logo_url,
      is_verified: isVerified,
      is_founder: isColunaHonra,
      is_pedra_fundamental: isPedraFund,
      is_coluna_honra: isColunaHonra,
      lodge_name: lodgeNameFromLink,
      contacts: (contactsRows || []) as any,
      city: locationRow?.city || bObj.city || null,
      state: locationRow?.state || bObj.state || null,
      address: locationRow?.address || (locationRow?.street ? `${locationRow.street}${locationRow.number ? ', ' + locationRow.number : ''}` : null) || bObj.address || null,
      locations: locationRow ? [locationRow] : [] as any,
      media: (mediaRows || []) as any,
      services: (servicesRows || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon_name: s.icon_name || 'briefcase',
        price_info: s.price_info ? s.price_info.trim() : null,
      })) as any,
      benefits: (benefitsRows || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        benefit_type: b.benefit_type || 'Desconto exclusivo',
        discount_percentage: b.discount_percentage || 15,
        badge_text: b.benefit_type || 'Oferta Fraterna',
      })) as any,
      business_hours: (hoursRows || []) as any,
      responsible: responsibleObj as any,
      rating_average: null,
      rating_count: 0,
      publication_status: bObj.publication_status,
      short_description: shortDescription,
      logo_background_color: logoBackgroundColor,
      cover_offset_y: coverOffsetY,
      cover_zoom: coverZoom,
      cover_fit_mode: coverFitMode,
      cover_background_color: coverBackgroundColor,
    } as any;

    try {
      const planCode = detailObj.effective_plan_code === 'ouro_founder'
        ? 'ouro'
        : detailObj.effective_plan_code || 'bronze';
      const { data: planRule } = await (supabase as any)
        .from('plan_payment_rules')
        .select('profile_section_order')
        .eq('plan_code', planCode)
        .maybeSingle();
      if (Array.isArray(planRule?.profile_section_order)) {
        (detailObj as any).profile_section_order = planRule.profile_section_order;
      }
    } catch (_e) {}

    // Contagem de visualizações da página da empresa por atualização (event_name = 'view')
    try {
      const { count: vCount } = await (dbReader as any)
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', bizId)
        .eq('event_name', 'view');
      detailObj.views_count = typeof vCount === 'number' ? vCount : 0;
      detailObj.views = detailObj.views_count;
    } catch (_e) {}

    const recognitionsResult = await getInstitutionalRecognitionsAction();
    const presentation = toPublicBusinessPresentation(detailObj, [], recognitionsResult?.data);
    presentation.isPreview = isPreview;
    presentation.publicationStatus = bObj.publication_status || dbBiz.publication_status || 'published';
    (presentation as any).clientApprovedAt = clientApprovedAt;
    (presentation as any).clientApprovedBy = clientApprovedBy;
    (presentation as any).isClientApproved = Boolean(clientApprovedAt);
    return presentation;

  } catch {
    return null;
  }
});

async function requestHost(): Promise<string> {
  const raw = (await headers()).get('host') ?? 'localhost';
  return raw.split(':')[0] || 'localhost';
}

/**
 * Personalização de SEO gravada pelo admin, lida pela função pública do banco (o visitante anônimo não lê a tabela).
 * Se a função ainda não existe ou falha, usamos o SEO automático.
 */
const getBusinessSeoOverrides = cache(async (slug: string): Promise<BusinessSeoOverrides | null> => {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await (supabase as any).rpc('public_business_seo_overrides', { p_host: await requestHost(), p_slug: slug });
    if (error) return null;
    return (Array.isArray(data) ? data[0] : data) ?? null;
  } catch {
    return null;
  }
});

/** Slug antigo -> slug atual (empresa que mudou de endereço). Devolve null quando não há histórico. */
async function resolveRenamedBusinessSlug(slug: string): Promise<string | null> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await (supabase as any).rpc('public_business_slug_redirect', { p_host: await requestHost(), p_slug: slug });
    return !error && typeof data === 'string' && data && data !== slug ? data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const isPreview = sp.preview === 'true' || sp.preview === '1' || sp.preview === 'draft';
  const hasFilters = Object.keys(sp).length > 0;
  if (slug === 'empresas') {
    return {
      title: 'Empresas e Serviços Maçônicos | Conexão Maçônica',
      description: 'Diretório completo de empresas, profissionais e serviços de confiança dentro da rede Conexão Maçônica.',
      alternates: { canonical: appUrl('/guia/empresas') },
      robots: hasFilters ? { index: false, follow: true } : undefined,
    };
  }
  if (slug === 'lojas') {
    return {
      title: 'Lojas Maçônicas | Conexão Maçônica',
      description: 'Diretório completo de Lojas Maçônicas, horários de reunião e informações institucionais.',
      alternates: { canonical: appUrl('/guia/lojas') },
      robots: hasFilters ? { index: false, follow: true } : undefined,
    };
  }
  const business = await getPublicBusiness(slug, isPreview);
  if (!business) return { title: 'Empresa não encontrada', robots: { index: false, follow: false } };

  if (isPreview || business.publicationStatus !== 'published') {
    return {
      title: `[Pré-visualização] ${business.identity.name} | Conexão Maçônica`,
      description: `Pré-visualização da empresa ${business.identity.name} para aprovação antes da publicação.`,
      robots: { index: false, follow: false },
    };
  }

  const overrides = await getBusinessSeoOverrides(slug);
  const seoInput = {
    slug: business.identity.slug,
    name: business.identity.name,
    category: business.identity.category,
    description: business.identity.description,
    city: business.location?.city ?? null,
    state: business.location?.state ?? null,
  };
  const title = buildBusinessTitle(seoInput, overrides);
  const description = buildBusinessDescription(seoInput, overrides);
  const canonical = businessCanonicalUrl(business.identity.slug);
  const image = overrides?.seo_og_image_url || business.media.cover?.url || business.identity.logo?.url;
  const imageAlt = business.media.cover?.alt || business.identity.logo?.alt || business.identity.name;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: isBusinessIndexable(overrides) ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: 'Conexão Maçônica',
      locale: 'pt_BR',
      images: image ? [{ url: image, alt: imageAlt }] : [],
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : [] },
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
  const sp = props.searchParams ? await props.searchParams : {};
  const isPreview = sp.preview === 'true' || sp.preview === '1' || sp.preview === 'draft';

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
      redirect(`/guia/${dbBiz.slug}${isPreview ? '?preview=true' : ''}`);
    } else if (!isPreview) {
      notFound();
    }
  }

  // Endereço com maiúsculas (ex.: /guia/OpticaCirculo) é a mesma página: redireciona de forma permanente para a forma minúscula.
  const lowercaseTarget = buildLowercaseSlugRedirect(slug, sp);
  if (lowercaseTarget) permanentRedirect(lowercaseTarget);

  const business = await getPublicBusiness(slug, isPreview);
  if (!business) {
    // Empresa que mudou de endereço: redirect permanente para o slug atual.
    const renamedTo = await resolveRenamedBusinessSlug(slug);
    if (renamedTo) permanentRedirect(`/guia/${renamedTo}${isPreview ? '?preview=true' : ''}`);
    notFound();
  }

  // Caminho visível e JSON-LD saem da mesma lista: Início > Guia > Cidade > Categoria > Empresa (cidade e categoria só
  // quando essas páginas existem). Falha ao ler o índice do guia nunca derruba a página: cai para Início > Guia > Empresa.
  const breadcrumbItems = buildBusinessBreadcrumb(
    {
      name: business.identity.name,
      slug: business.identity.slug,
      city: business.location?.city ?? null,
      state: business.location?.state ?? null,
      category: business.identity.category,
    },
    await getDirectoryIndex().catch(() => []),
  );
  const breadcrumbSchema = breadcrumbJsonLd(breadcrumbItems, business.identity.slug);
  const businessSchema = buildLocalBusinessSchema({
    slug: business.identity.slug,
    name: business.identity.name,
    category: business.identity.category,
    description: business.identity.description,
    city: business.location?.city ?? null,
    state: business.location?.state ?? null,
    imageUrls: [business.media.cover?.url, business.identity.logo?.url].filter((u): u is string => Boolean(u)),
    phone: business.contacts.phone,
    email: business.contacts.email,
    website: business.contacts.website,
    socialUrls: [business.contacts.instagram, business.contacts.facebook, business.contacts.linkedin, business.contacts.youtube],
    address: business.location?.address ?? null,
    latitude: business.location?.latitude ?? null,
    longitude: business.location?.longitude ?? null,
    hours: business.hours,
    ratingAverage: business.reviews.average,
    ratingCount: business.reviews.count,
  });

  return (
    <FavoritesProvider>
      {/* Barra de pré-visualização para aprovação: exibida exclusivamente em empresas que ainda não foram publicadas */}
      {business.publicationStatus !== 'published' && (
        <BusinessPreviewApprovalBar
          businessId={business.identity.id}
          businessName={business.identity.name}
          publicationStatus={business.publicationStatus}
          isClientApproved={Boolean((business as any).isClientApproved || (business as any).clientApprovedAt)}
          clientApprovedAt={(business as any).clientApprovedAt}
          clientApprovedBy={(business as any).clientApprovedBy}
        />
      )}
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={businessSchema} />
      <DirectoryHeader
        selectedCity={business.location?.city || ''}
        availableCities={business.location?.city ? [business.location.city] : []}
        hideMobileSearchAndCategories
      />
      <BusinessBreadcrumb items={breadcrumbItems} />
      <BusinessContactTracker
        business={{
          id: business.identity.id,
          slug: business.identity.slug,
          name: business.identity.name,
          category: business.identity.category,
          city: business.location?.city ?? null,
          state: business.location?.state ?? null,
          plan: business.plan.commercialPlan,
          isPedraFundamental: business.recognition.pedraFundamental,
        }}
      >
        <BusinessProfileRenderer business={business} />
      </BusinessContactTracker>
      <DirectoryFavoritesModal />
      <DirectoryFooter />
    </FavoritesProvider>
  );
}


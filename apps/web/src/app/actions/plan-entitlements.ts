'use server';

import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface CommercialPlanFullData {
  plan_code: 'bronze' | 'prata' | 'ouro';
  title: string;
  slogan: string;
  description: string;
  amount_cents: number;
  pix_amount_cents: number;
  installments_max: number;
  interest_free_installments: number;
  payment_methods_allowed: string[];
  is_popular: boolean;
  is_active: boolean;
  display_order: number;
  commercial_features: string[];
  services_limit: number;
  gallery_photos_limit: number;
  benefits_limit: number;
  events_limit: number;
  posts_limit: number;
  business_video_limit: number;
  profile_section_order: string[];
}

export interface UpdateCommercialPlanInput {
  plan_code: 'bronze' | 'prata' | 'ouro';
  title: string;
  slogan: string;
  description: string;
  amount_cents: number;
  pix_amount_cents?: number;
  installments_max: number;
  interest_free_installments: number;
  is_popular: boolean;
  is_active: boolean;
  commercial_features: string[];
  services_limit: number;
  gallery_photos_limit: number;
  benefits_limit: number;
  events_limit: number;
  posts_limit: number;
  business_video_limit?: number;
  profile_section_order?: string[];
}

const PROFILE_SECTION_KEYS = ['about', 'services', 'video', 'gallery', 'benefits', 'events', 'posts'] as const;
const DEFAULT_PROFILE_SECTION_ORDER = [...PROFILE_SECTION_KEYS];

export async function getPlanEntitlementsAction() {
  try {
    const supabase = await createServerSideClient();

    const tenantId = await resolveTenantIdServer();

    const { data: rules } = await (supabase as any)
      .from('plan_payment_rules')
      .select('*')
      .in('plan_code', ['bronze', 'prata', 'ouro']);

    const { data: entitlements } = await (supabase as any)
      .from('plan_entitlements')
      .select('plan_code, feature_code, max_limit')
      .eq('tenant_id', tenantId)
      .in('plan_code', ['bronze', 'prata', 'ouro']);

    const defaults: Record<string, CommercialPlanFullData> = {
      bronze: {
        plan_code: 'bronze',
        title: 'Plano Esquadro',
        slogan: 'Entrada gratuita no Guia Maçônico',
        description: 'Ideal para pequenos negócios fraternos iniciando a presença digital no guia comercial.',
        amount_cents: 0,
        pix_amount_cents: 0,
        installments_max: 3,
        interest_free_installments: 3,
        payment_methods_allowed: ['pix', 'credit_card'],
        is_popular: false,
        is_active: true,
        display_order: 1,
        commercial_features: [
          'Presença básica no Guia Comercial',
          'Até 3 Fotos na Galeria',
          'Até 2 Serviços cadastrados',
          'Parcelamento em até 3x sem juros',
        ],
        services_limit: 2,
        gallery_photos_limit: 3,
        benefits_limit: 0,
        events_limit: 0,
        posts_limit: 0,
        business_video_limit: 0,
        profile_section_order: DEFAULT_PROFILE_SECTION_ORDER,
      },
      prata: {
        plan_code: 'prata',
        title: 'Plano Compasso',
        slogan: 'Excelente visibilidade comercial e mídias',
        description: 'Recomendado para empresas estabelecidas buscando destaque fraterno e canal direto no WhatsApp.',
        amount_cents: 178800,
        pix_amount_cents: 178800,
        installments_max: 6,
        interest_free_installments: 6,
        payment_methods_allowed: ['pix', 'credit_card'],
        is_popular: true,
        is_active: true,
        display_order: 2,
        commercial_features: [
          'Destaque no Guia Comercial',
          'Até 6 Fotos na Galeria',
          'Até 5 Serviços cadastrados',
          'Até 3 Ofertas/Benefícios ativos',
          'Publicação de Eventos e Comunicados',
          'Parcelamento em até 6x sem juros',
        ],
        services_limit: 5,
        gallery_photos_limit: 6,
        benefits_limit: 3,
        events_limit: 2,
        posts_limit: 2,
        business_video_limit: 0,
        profile_section_order: DEFAULT_PROFILE_SECTION_ORDER,
      },
      ouro: {
        plan_code: 'ouro',
        title: 'Plano Acácia',
        slogan: 'Máxima presença, topo do guia e analytics',
        description: 'Presença de elite para grandes parceiros com prioridade máxima de busca, mídias e analytics avançado.',
        amount_cents: 238800,
        pix_amount_cents: 238800,
        installments_max: 12,
        interest_free_installments: 12,
        payment_methods_allowed: ['pix', 'credit_card'],
        is_popular: false,
        is_active: true,
        display_order: 3,
        commercial_features: [
          'Topo das Buscas e Maior Destaque',
          'Até 10 Fotos na Galeria',
          'Até 10 Serviços cadastrados',
          'Até 5 Ofertas/Benefícios ativos',
          'Publicação Ilimitada de Eventos',
          'Analytics Avançado (7, 30 e 90 dias)',
          'Parcelamento em até 12x sem juros',
        ],
        services_limit: 10,
        gallery_photos_limit: 10,
        benefits_limit: 5,
        events_limit: 10,
        posts_limit: 10,
        business_video_limit: 1,
        profile_section_order: DEFAULT_PROFILE_SECTION_ORDER,
      },
    };

    if (rules && rules.length > 0) {
      for (const r of rules) {
        if (r.plan_code && defaults[r.plan_code]) {
          defaults[r.plan_code]!.title = r.title || defaults[r.plan_code]!.title;
          defaults[r.plan_code]!.slogan = r.slogan || defaults[r.plan_code]!.slogan;
          defaults[r.plan_code]!.description = r.description || defaults[r.plan_code]!.description;
          defaults[r.plan_code]!.amount_cents = r.amount_cents ?? defaults[r.plan_code]!.amount_cents;
          defaults[r.plan_code]!.pix_amount_cents = r.pix_amount_cents ?? defaults[r.plan_code]!.amount_cents;
          defaults[r.plan_code]!.installments_max = r.installments_max ?? defaults[r.plan_code]!.installments_max;
          defaults[r.plan_code]!.interest_free_installments = r.interest_free_installments ?? defaults[r.plan_code]!.interest_free_installments;
          defaults[r.plan_code]!.is_popular = r.is_popular ?? defaults[r.plan_code]!.is_popular;
          defaults[r.plan_code]!.is_active = r.is_active ?? defaults[r.plan_code]!.is_active;
          if (r.commercial_features && r.commercial_features.length > 0) {
            defaults[r.plan_code]!.commercial_features = r.commercial_features;
          }
          if (Array.isArray(r.profile_section_order)) {
            const validOrder = r.profile_section_order.filter((key: string) =>
              PROFILE_SECTION_KEYS.includes(key as (typeof PROFILE_SECTION_KEYS)[number])
            );
            if (validOrder.length === PROFILE_SECTION_KEYS.length && new Set(validOrder).size === PROFILE_SECTION_KEYS.length) {
              defaults[r.plan_code]!.profile_section_order = validOrder;
            }
          }
        }
      }
    }

    if (entitlements && entitlements.length > 0) {
      for (const e of entitlements) {
        if (e.plan_code && defaults[e.plan_code] && e.feature_code in defaults[e.plan_code]!) {
          (defaults[e.plan_code] as any)[e.feature_code] = e.max_limit;
        }
      }
    }

    return { success: true, data: Object.values(defaults) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor.' };
  }
}

export async function updateCommercialPlanAction(input: UpdateCommercialPlanInput) {
  try {
    const pixAmountCents = input.pix_amount_cents ?? input.amount_cents;
    const businessVideoLimit = input.business_video_limit ?? 0;
    const sectionOrder = (input.profile_section_order ?? DEFAULT_PROFILE_SECTION_ORDER).filter((key) =>
      PROFILE_SECTION_KEYS.includes(key as (typeof PROFILE_SECTION_KEYS)[number])
    );
    if (sectionOrder.length !== PROFILE_SECTION_KEYS.length || new Set(sectionOrder).size !== PROFILE_SECTION_KEYS.length) {
      return { success: false, error: 'A ordem das seções do perfil é inválida.' };
    }
    if (!Number.isInteger(pixAmountCents) || pixAmountCents < 0 || pixAmountCents > input.amount_cents) {
      return { success: false, error: 'O valor no PIX deve ser válido e não pode superar o valor a prazo.' };
    }
    if (input.interest_free_installments > input.installments_max) {
      return { success: false, error: 'As parcelas sem juros não podem superar o máximo de parcelas.' };
    }

    const supabase = await createServerSideClient();

    const tenantId = await resolveTenantIdServer();

    const { error: ruleError } = await (supabase as any).from('plan_payment_rules').upsert({
      plan_code: input.plan_code,
      amount_cents: input.amount_cents,
      pix_amount_cents: pixAmountCents,
      installments_max: input.installments_max,
      interest_free_installments: input.interest_free_installments,
      title: input.title,
      slogan: input.slogan,
      description: input.description,
      is_popular: input.is_popular,
      is_active: input.is_active,
      commercial_features: input.commercial_features,
      profile_section_order: sectionOrder,
      updated_at: new Date().toISOString(),
    });
    if (ruleError) return { success: false, error: `Falha ao salvar regras comerciais: ${ruleError.message}` };

    const upsertEntitlements = [
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'services_limit', max_limit: input.services_limit },
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'gallery_photos_limit', max_limit: input.gallery_photos_limit },
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'benefits_limit', max_limit: input.benefits_limit },
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'events_limit', max_limit: input.events_limit },
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'posts_limit', max_limit: input.posts_limit },
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'business_video_limit', max_limit: businessVideoLimit },
    ];

    const { error: entitlementError } = await (supabase as any)
      .from('plan_entitlements')
      .upsert(upsertEntitlements, { onConflict: 'tenant_id,plan_code,feature_code' });
    if (entitlementError) return { success: false, error: `Falha ao salvar cotas: ${entitlementError.message}` };

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: tenantId,
      admin_user_id: 'system-admin',
      action_type: 'UPDATE_COMMERCIAL_PLAN',
      entity_type: 'plan',
      entity_id: input.plan_code,
      after_state: {
        plan_code: input.plan_code,
        amount_cents: input.amount_cents,
        pix_amount_cents: pixAmountCents,
        installments_max: input.installments_max,
        gallery_photos_limit: input.gallery_photos_limit,
        profile_section_order: sectionOrder,
      },
    });

    revalidatePath('/admin/planos');
    revalidatePath('/admin/pagamentos');
    revalidatePath('/anunciar/passo-3');
    revalidatePath('/anunciar/passo-4');
    revalidatePath('/anunciante/plano');
    revalidatePath('/anunciante');
    revalidatePath('/guia');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar plano.' };
  }
}

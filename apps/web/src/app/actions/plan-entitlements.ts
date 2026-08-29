'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface CommercialPlanFullData {
  plan_code: 'bronze' | 'prata' | 'ouro';
  title: string;
  slogan: string;
  description: string;
  amount_cents: number;
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
}

export interface UpdateCommercialPlanInput {
  plan_code: 'bronze' | 'prata' | 'ouro';
  title: string;
  slogan: string;
  description: string;
  amount_cents: number;
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
}

export async function getPlanEntitlementsAction() {
  try {
    const supabase = await createServerSideClient();

    const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
    const tenantId = tenants && tenants.length > 0 ? tenants[0]!.id : '00000000-0000-0000-0000-000000000010';

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
        title: 'Plano Bronze',
        slogan: 'Entrada gratuita no Guia Maçônico',
        description: 'Ideal para pequenos negócios fraternos iniciando a presença digital no guia comercial.',
        amount_cents: 0,
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
          '1 Oferta/Benefício ativo',
          'Parcelamento em até 3x sem juros',
        ],
        services_limit: 2,
        gallery_photos_limit: 3,
        benefits_limit: 1,
        events_limit: 0,
        posts_limit: 0,
      },
      prata: {
        plan_code: 'prata',
        title: 'Plano Prata',
        slogan: 'Excelente visibilidade comercial e mídias',
        description: 'Recomendado para empresas estabelecidas buscando destaque fraterno e canal direto no WhatsApp.',
        amount_cents: 178800,
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
      },
      ouro: {
        plan_code: 'ouro',
        title: 'Plano Ouro',
        slogan: 'Máxima presença, topo do guia e analytics',
        description: 'Presença de elite para grandes parceiros com prioridade máxima de busca, mídias e analytics avançado.',
        amount_cents: 238800,
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
      },
    };

    if (rules && rules.length > 0) {
      for (const r of rules) {
        if (r.plan_code && defaults[r.plan_code]) {
          defaults[r.plan_code]!.title = r.title || defaults[r.plan_code]!.title;
          defaults[r.plan_code]!.slogan = r.slogan || defaults[r.plan_code]!.slogan;
          defaults[r.plan_code]!.description = r.description || defaults[r.plan_code]!.description;
          defaults[r.plan_code]!.amount_cents = r.amount_cents ?? defaults[r.plan_code]!.amount_cents;
          defaults[r.plan_code]!.installments_max = r.installments_max ?? defaults[r.plan_code]!.installments_max;
          defaults[r.plan_code]!.interest_free_installments = r.interest_free_installments ?? defaults[r.plan_code]!.interest_free_installments;
          defaults[r.plan_code]!.is_popular = r.is_popular ?? defaults[r.plan_code]!.is_popular;
          defaults[r.plan_code]!.is_active = r.is_active ?? defaults[r.plan_code]!.is_active;
          if (r.commercial_features && r.commercial_features.length > 0) {
            defaults[r.plan_code]!.commercial_features = r.commercial_features;
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
    const supabase = await createServerSideClient();

    const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
    const tenantId = tenants && tenants.length > 0 ? tenants[0]!.id : '00000000-0000-0000-0000-000000000010';

    await (supabase as any).from('plan_payment_rules').upsert({
      plan_code: input.plan_code,
      amount_cents: input.amount_cents,
      installments_max: input.installments_max,
      interest_free_installments: input.interest_free_installments,
      title: input.title,
      slogan: input.slogan,
      description: input.description,
      is_popular: input.is_popular,
      is_active: input.is_active,
      commercial_features: input.commercial_features,
      updated_at: new Date().toISOString(),
    });

    const upsertEntitlements = [
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'services_limit', max_limit: input.services_limit },
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'gallery_photos_limit', max_limit: input.gallery_photos_limit },
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'benefits_limit', max_limit: input.benefits_limit },
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'events_limit', max_limit: input.events_limit },
      { tenant_id: tenantId, plan_code: input.plan_code, feature_code: 'posts_limit', max_limit: input.posts_limit },
    ];

    await (supabase as any)
      .from('plan_entitlements')
      .upsert(upsertEntitlements, { onConflict: 'tenant_id,plan_code,feature_code' });

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: tenantId,
      admin_user_id: 'system-admin',
      action_type: 'UPDATE_COMMERCIAL_PLAN',
      entity_type: 'plan',
      entity_id: input.plan_code,
      after_state: {
        plan_code: input.plan_code,
        amount_cents: input.amount_cents,
        installments_max: input.installments_max,
        gallery_photos_limit: input.gallery_photos_limit,
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

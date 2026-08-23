'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface PlanEntitlementsData {
  plan_code: 'bronze' | 'prata' | 'ouro';
  services_limit: number;
  gallery_photos_limit: number;
  benefits_limit: number;
  events_limit: number;
  posts_limit: number;
}

export interface UpdatePlanInput {
  plan: 'bronze' | 'prata' | 'ouro';
  services_limit: number;
  gallery_photos_limit: number;
  benefits_limit: number;
  events_limit: number;
  posts_limit: number;
}

export async function getPlanEntitlementsAction() {
  try {
    const supabase = await createServerSideClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // Verifica permissão de admin no banco
    const { data: isAdmin } = await (supabase as any).rpc('has_platform_admin_access');
    if (!isAdmin) {
      return { success: false, error: 'Acesso negado. Requer permissão de administrador.' };
    }

    // Pega o ID do tenant padrão (Conexão Maçônica)
    const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
    if (!tenants || tenants.length === 0 || !tenants[0]?.id) {
      return { success: false, error: 'Tenant não encontrado no sistema.' };
    }
    const tenantId = tenants[0].id;

    // Busca os entitlements atuais
    const { data: entitlements, error } = await supabase
      .from('plan_entitlements')
      .select('plan_code, feature_code, max_limit')
      .eq('tenant_id', tenantId)
      .in('plan_code', ['bronze', 'prata', 'ouro']);

    if (error) {
      return { success: false, error: error.message };
    }

    // Transforma no formato do manager
    const result: Record<string, PlanEntitlementsData> = {
      bronze: { plan_code: 'bronze', services_limit: 0, gallery_photos_limit: 0, benefits_limit: 0, events_limit: 0, posts_limit: 0 },
      prata: { plan_code: 'prata', services_limit: 0, gallery_photos_limit: 0, benefits_limit: 0, events_limit: 0, posts_limit: 0 },
      ouro: { plan_code: 'ouro', services_limit: 0, gallery_photos_limit: 0, benefits_limit: 0, events_limit: 0, posts_limit: 0 },
    };

    if (entitlements) {
      for (const e of entitlements) {
        if (result[e.plan_code] && e.feature_code in (result[e.plan_code] as any)) {
          (result[e.plan_code] as any)[e.feature_code] = e.max_limit;
        }
      }
    }

    return { success: true, data: Object.values(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor.' };
  }
}

export async function updatePlanEntitlementsAction(input: UpdatePlanInput) {
  try {
    const validatedData = input;
    if (!['bronze', 'prata', 'ouro'].includes(validatedData.plan)) {
      throw new Error('Plano inválido.');
    }
    if (
      validatedData.services_limit < 0 ||
      validatedData.gallery_photos_limit < 0 ||
      validatedData.benefits_limit < 0 ||
      validatedData.events_limit < 0 ||
      validatedData.posts_limit < 0
    ) {
      throw new Error('Limites não podem ser negativos.');
    }

    const supabase = await createServerSideClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const { data: isAdmin } = await (supabase as any).rpc('has_platform_admin_access');
    if (!isAdmin) {
      return { success: false, error: 'Acesso negado. Requer permissão de administrador.' };
    }

    const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
    if (!tenants || tenants.length === 0 || !tenants[0]?.id) {
      return { success: false, error: 'Tenant principal não encontrado.' };
    }
    const tenantId = tenants[0].id;

    const upsertPayload = [
      { tenant_id: tenantId, plan_code: validatedData.plan, feature_code: 'services_limit', max_limit: validatedData.services_limit },
      { tenant_id: tenantId, plan_code: validatedData.plan, feature_code: 'gallery_photos_limit', max_limit: validatedData.gallery_photos_limit },
      { tenant_id: tenantId, plan_code: validatedData.plan, feature_code: 'benefits_limit', max_limit: validatedData.benefits_limit },
      { tenant_id: tenantId, plan_code: validatedData.plan, feature_code: 'events_limit', max_limit: validatedData.events_limit },
      { tenant_id: tenantId, plan_code: validatedData.plan, feature_code: 'posts_limit', max_limit: validatedData.posts_limit },
    ];

    const { error } = await supabase
      .from('plan_entitlements')
      .upsert(upsertPayload, { onConflict: 'tenant_id,plan_code,feature_code' });

    if (error) {
      return { success: false, error: error.message };
    }

    // Revalidação do cache para garantir que a UI reflita os novos limites globalmente
    revalidatePath('/admin/planos');
    revalidatePath('/dashboard');
    revalidatePath('/guia');
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor.' };
  }
}

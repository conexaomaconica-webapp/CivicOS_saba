'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Valida a autorização server-side do usuário para a empresa informada.
 * NUNCA confia em tenant_id, role, quota ou plano enviados pelo cliente.
 */
async function authorizeBusinessAccess(businessId: string) {
  const headerStore = await headers();
  const rawHost = headerStore.get('host') ?? 'localhost';
  const host = rawHost.split(':')[0] || 'localhost';

  const supabase = await createServerSideClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Sessão expirada ou usuário não autenticado.');
  }

  // Buscar tenant a partir do host
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('id')
    .eq('hostname', host)
    .single();

  const tenantId = tenantData?.id;

  // Verificar se o usuário é membro da empresa no tenant
  let memberQuery = supabase
    .from('business_members')
    .select('role')
    .eq('business_id', businessId)
    .eq('user_id', user.id);

  if (tenantId) {
    memberQuery = memberQuery.eq('tenant_id', tenantId);
  }

  const { data: memberData } = await memberQuery.single();

  // Permite acesso se for membro ou admin da plataforma
  const { data: isAdmin } = await (supabase as unknown as { rpc: (fn: string) => Promise<{ data: boolean }> }).rpc('has_platform_admin_access');

  if (!memberData && !isAdmin) {
    throw new Error('Você não possui permissão para gerenciar esta empresa.');
  }

  // Client tipado defensivamente para as tabelas e RPCs das migrations 042 e 043
  const db = supabase as unknown as {
    from: (table: string) => {
      insert: (payload: Record<string, unknown>) => {
        select: () => {
          single: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string; code?: string } | null }>;
        };
      };
      update: (payload: Record<string, unknown>) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            select: () => {
              single: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string; code?: string } | null }>;
            };
          };
        };
      };
      delete: () => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => Promise<{ error: { message?: string } | null }>;
        };
      };
    };
    rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
  };

  return { supabase: db, user, tenantId, role: memberData?.role };
}

/* ============================================================================
 * SERVIÇOS — SERVER ACTIONS
 * Campos: name, description, iconName, priceInfo, isActive, displayOrder
 * ============================================================================ */

export async function createBusinessServiceAction(
  businessId: string,
  payload: {
    name: string;
    description?: string | null;
    iconName?: string | null;
    priceInfo?: string | null;
    isActive?: boolean;
    displayOrder?: number;
  }
): Promise<ActionResult> {
  try {
    const { supabase } = await authorizeBusinessAccess(businessId);

    const { data, error } = await supabase
      .from('business_services')
      .insert({
        business_id: businessId,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        icon_name: payload.iconName?.trim() || null,
        price_info: payload.priceInfo?.trim() || null,
        is_active: payload.isActive ?? true,
        display_order: payload.displayOrder ?? 0,
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('quota') || error.code === 'P0001') {
        return { success: false, error: 'Cota máxima de serviços ativos atingida para o plano atual da empresa.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/empresas/${businessId}/servicos`);
    revalidatePath('/guia/[slug]', 'page');
    revalidateTag('public-business-detail');

    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao criar serviço.' };
  }
}

export async function updateBusinessServiceAction(
  businessId: string,
  serviceId: string,
  payload: {
    name?: string;
    description?: string | null;
    iconName?: string | null;
    priceInfo?: string | null;
    isActive?: boolean;
    displayOrder?: number;
  }
): Promise<ActionResult> {
  try {
    const { supabase } = await authorizeBusinessAccess(businessId);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) updateData.name = payload.name.trim();
    if (payload.description !== undefined) updateData.description = payload.description?.trim() || null;
    if (payload.iconName !== undefined) updateData.icon_name = payload.iconName?.trim() || null;
    if (payload.priceInfo !== undefined) updateData.price_info = payload.priceInfo?.trim() || null;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;
    if (payload.displayOrder !== undefined) updateData.display_order = payload.displayOrder;

    const { data, error } = await supabase
      .from('business_services')
      .update(updateData)
      .eq('id', serviceId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('quota') || error.code === 'P0001') {
        return { success: false, error: 'Cota máxima de serviços ativos atingida para o plano atual.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/empresas/${businessId}/servicos`);
    revalidatePath('/guia/[slug]', 'page');
    revalidateTag('public-business-detail');

    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao atualizar serviço.' };
  }
}

export async function toggleBusinessServiceActiveAction(
  businessId: string,
  serviceId: string,
  isActive: boolean
): Promise<ActionResult> {
  return updateBusinessServiceAction(businessId, serviceId, { isActive });
}

export async function reorderBusinessServiceAction(
  businessId: string,
  serviceId: string,
  direction: 'up' | 'down'
): Promise<ActionResult> {
  try {
    const { supabase } = await authorizeBusinessAccess(businessId);

    const { error } = await supabase.rpc('reorder_business_services', {
      p_business_id: businessId,
      p_service_id: serviceId,
      p_direction: direction,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/empresas/${businessId}/servicos`);
    revalidatePath('/guia/[slug]', 'page');
    revalidateTag('public-business-detail');

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao reordenar serviços.' };
  }
}

export async function deleteBusinessServiceAction(
  businessId: string,
  serviceId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await authorizeBusinessAccess(businessId);

    const { error } = await supabase
      .from('business_services')
      .delete()
      .eq('id', serviceId)
      .eq('business_id', businessId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/empresas/${businessId}/servicos`);
    revalidatePath('/guia/[slug]', 'page');
    revalidateTag('public-business-detail');

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao excluir serviço.' };
  }
}

/* ============================================================================
 * BENEFÍCIOS — SERVER ACTIONS
 * Campos: title, description, benefitType, discountPercentage, discountAmount,
 * discountCode, badgeText, redeemInstructions, validFrom, validUntil, isActive, displayOrder
 * ============================================================================ */

export async function createBusinessBenefitAction(
  businessId: string,
  payload: {
    title: string;
    description: string;
    benefitType?: string | null;
    discountPercentage?: number | null;
    discountAmount?: number | null;
    discountCode?: string | null;
    badgeText?: string | null;
    redeemInstructions?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
    isActive?: boolean;
    displayOrder?: number;
  }
): Promise<ActionResult> {
  try {
    const { supabase } = await authorizeBusinessAccess(businessId);

    const { data, error } = await supabase
      .from('business_benefits')
      .insert({
        business_id: businessId,
        title: payload.title.trim(),
        description: payload.description.trim(),
        benefit_type: payload.benefitType?.trim() || 'discount',
        discount_percentage: payload.discountPercentage ?? null,
        discount_amount: payload.discountAmount ?? null,
        discount_code: payload.discountCode?.trim() || null,
        badge_text: payload.badgeText?.trim() || null,
        redeem_instructions: payload.redeemInstructions?.trim() || null,
        valid_from: payload.validFrom || new Date().toISOString(),
        valid_until: payload.validUntil || null,
        is_active: payload.isActive ?? true,
        display_order: payload.displayOrder ?? 0,
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('quota') || error.code === 'P0001') {
        return { success: false, error: 'Cota máxima de benefícios ativos simultaneamente atingida para o plano atual da empresa.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/empresas/${businessId}/beneficios`);
    revalidatePath('/guia/[slug]', 'page');
    revalidateTag('public-business-detail');

    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao criar benefício.' };
  }
}

export async function updateBusinessBenefitAction(
  businessId: string,
  benefitId: string,
  payload: {
    title?: string;
    description?: string;
    benefitType?: string | null;
    discountPercentage?: number | null;
    discountAmount?: number | null;
    discountCode?: string | null;
    badgeText?: string | null;
    redeemInstructions?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
    isActive?: boolean;
    displayOrder?: number;
  }
): Promise<ActionResult> {
  try {
    const { supabase } = await authorizeBusinessAccess(businessId);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.title !== undefined) updateData.title = payload.title.trim();
    if (payload.description !== undefined) updateData.description = payload.description.trim();
    if (payload.benefitType !== undefined) updateData.benefit_type = payload.benefitType;
    if (payload.discountPercentage !== undefined) updateData.discount_percentage = payload.discountPercentage;
    if (payload.discountAmount !== undefined) updateData.discount_amount = payload.discountAmount;
    if (payload.discountCode !== undefined) updateData.discount_code = payload.discountCode?.trim() || null;
    if (payload.badgeText !== undefined) updateData.badge_text = payload.badgeText?.trim() || null;
    if (payload.redeemInstructions !== undefined) updateData.redeem_instructions = payload.redeemInstructions?.trim() || null;
    if (payload.validFrom !== undefined) updateData.valid_from = payload.validFrom;
    if (payload.validUntil !== undefined) updateData.valid_until = payload.validUntil;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;
    if (payload.displayOrder !== undefined) updateData.display_order = payload.displayOrder;

    const { data, error } = await supabase
      .from('business_benefits')
      .update(updateData)
      .eq('id', benefitId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('quota') || error.code === 'P0001') {
        return { success: false, error: 'Cota máxima de benefícios ativos simultaneamente atingida para o plano atual.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/empresas/${businessId}/beneficios`);
    revalidatePath('/guia/[slug]', 'page');
    revalidateTag('public-business-detail');

    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao atualizar benefício.' };
  }
}

export async function toggleBusinessBenefitActiveAction(
  businessId: string,
  benefitId: string,
  isActive: boolean
): Promise<ActionResult> {
  return updateBusinessBenefitAction(businessId, benefitId, { isActive });
}

export async function reorderBusinessBenefitAction(
  businessId: string,
  benefitId: string,
  direction: 'up' | 'down'
): Promise<ActionResult> {
  try {
    const { supabase } = await authorizeBusinessAccess(businessId);

    const { error } = await supabase.rpc('reorder_business_benefits', {
      p_business_id: businessId,
      p_benefit_id: benefitId,
      p_direction: direction,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/empresas/${businessId}/beneficios`);
    revalidatePath('/guia/[slug]', 'page');
    revalidateTag('public-business-detail');

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao reordenar benefícios.' };
  }
}

export async function deleteBusinessBenefitAction(
  businessId: string,
  benefitId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await authorizeBusinessAccess(businessId);

    const { error } = await supabase
      .from('business_benefits')
      .delete()
      .eq('id', benefitId)
      .eq('business_id', businessId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/empresas/${businessId}/beneficios`);
    revalidatePath('/guia/[slug]', 'page');
    revalidateTag('public-business-detail');

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao excluir benefício.' };
  }
}

'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
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
  const supabase = await createServerSideClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Sessão expirada ou usuário não autenticado.');
  }

  // 1. Autoridade Server-side: Executa RPC de permissão administrativa da plataforma
  const { data: rpcIsAdmin, error: rpcErr } = await (supabase as unknown as { rpc: (fn: string) => Promise<{ data: boolean; error: { message?: string } | null }> }).rpc('has_platform_admin_access');

  if (rpcErr) {
    throw new Error(`Erro de infraestrutura ao validar permissões administrativas: ${rpcErr.message || 'Falha na RPC'}`);
  }

  const isPlatformAdmin = Boolean(rpcIsAdmin);

  // 2. Se for admin de plataforma autorizado pela RPC, permite acesso imediato
  if (isPlatformAdmin) {
    return { supabase, user, tenantId: null, role: 'platform_admin' };
  }

  // 3. Caso contrário, valida a empresa e a propriedade/membership tenant-aware
  const { data: bizData, error: bizErr } = await supabase
    .from('businesses')
    .select('id, owner_id, tenant_id')
    .eq('id', businessId)
    .maybeSingle();

  if (bizErr || !bizData) {
    throw new Error('Empresa não encontrada.');
  }

  const isOwner = bizData.owner_id === user.id;

  // 4. Valida se o usuário possui vinculo de membro ativo e tenant-aware em business_members
  const { data: memberData } = await supabase
    .from('business_members')
    .select('role')
    .eq('tenant_id', bizData.tenant_id)
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .maybeSingle();

  const isMember = Boolean(isOwner || memberData);

  if (!isMember) {
    throw new Error('Você não possui permissão para gerenciar esta empresa.');
  }

  return { supabase: supabase as any, user, tenantId: bizData.tenant_id, role: memberData?.role || 'owner' };
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

/* ============================================================================
 * EXCLUSÃO / ARQUIVAMENTO ADMINISTRATIVO DE ANUNCIANTE (Soft & Hard Delete)
 * ============================================================================ */

export async function deleteBusinessAdminAction(
  businessId: string,
  mode: 'archive' | 'hard_delete',
  confirmationName?: string
): Promise<ActionResult<{ businessId: string; mode: string }>> {
  try {
    const { supabase, user } = await authorizeBusinessAccess(businessId);

    // 1. Obter registro da empresa para verificação e auditoria
    const { data: biz, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select('id, name, slug, tenant_id')
      .eq('id', businessId)
      .maybeSingle();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }

    if (mode === 'archive') {
      // SOFT DELETE (Inativação / Desativação Segura que preserva dados financeiros)
      const { error: archiveErr } = await (supabase as any)
        .from('businesses')
        .update({
          is_active: false,
          publication_status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (archiveErr) {
        return { success: false, error: `Falha ao inativar empresa: ${archiveErr.message}` };
      }

      // Auditoria
      try {
        await (supabase as any).from('admin_audit_logs').insert({
          actor_id: user.id,
          action: 'ARCHIVE_BUSINESS',
          entity_type: 'businesses',
          entity_id: businessId,
          after_value: { is_active: false, publication_status: 'suspended' },
        });
      } catch {}

      revalidatePath('/admin/empresas');
      revalidatePath('/guia', 'layout');

      return {
        success: true,
        data: { businessId, mode: 'archive' },
      };
    } else {
      // HARD DELETE (Exclusão Permanente Físico do Banco de Dados)
      if (!confirmationName || confirmationName.trim().toLowerCase() !== biz.name.trim().toLowerCase()) {
        return {
          success: false,
          error: `O nome digitado ("${confirmationName || ''}") não coincide exatamente com o nome da empresa ("${biz.name}").`,
        };
      }

      // Remover tabelas dependentes
      const childTables = [
        'business_media',
        'business_contacts',
        'business_locations',
        'business_hours',
        'business_benefits',
        'business_services',
        'business_events',
        'business_posts',
        'business_members',
        'business_categories',
        'business_reviews',
        'business_favorites',
      ];

      for (const table of childTables) {
        try {
          await (supabase as any).from(table).delete().eq('business_id', businessId);
        } catch {
          // Continua para próxima tabela
        }
      }

      // Remover o registro em businesses
      const { error: deleteErr } = await (supabase as any)
        .from('businesses')
        .delete()
        .eq('id', businessId);

      if (deleteErr) {
        return {
          success: false,
          error: `Falha na exclusão física do banco de dados: ${deleteErr.message}`,
        };
      }

      // Auditoria
      try {
        await (supabase as any).from('admin_audit_logs').insert({
          actor_id: user.id,
          action: 'HARD_DELETE_BUSINESS',
          entity_type: 'businesses',
          entity_id: businessId,
          before_value: { name: biz.name, slug: biz.slug },
        });
      } catch {}

      revalidatePath('/admin/empresas');
      revalidatePath('/guia', 'layout');

      return {
        success: true,
        data: { businessId, mode: 'hard_delete' },
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao processar solicitação de exclusão.' };
  }
}

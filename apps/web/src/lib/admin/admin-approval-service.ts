'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { dispatchNotificationAction } from '@/lib/notifications/notification-service';
import { getCommercialPlanName } from '@/lib/admin/approval-display';

export interface ApprovalRequirement {
  id: string;
  label: string;
  satisfied: boolean;
  blocking: boolean;
  detail?: string;
}

export interface ApprovalDirectoryItem {
  id: string;
  tenant_id: string;
  name: string | null;
  category: string | null;
  publication_status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended' | 'correction_requested';
  owner_email?: string;
  owner_name?: string;
  plan_code?: string;
  created_at: string;
  is_founder: boolean;
  is_pedra_fundamental: boolean;
  is_coluna_honra: boolean;
  has_responsible: boolean;
  has_business_data: boolean;
  has_masonic_link: boolean;
  has_signed_contract: boolean;
  has_valid_payment: boolean;
  is_ready_for_approval: boolean;
  completeness_percent: number;
  cnpj?: string;
  city?: string;
}

export interface ApprovalDossier360 {
  business_id: string;
  tenant_id: string;
  publication_status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended' | 'correction_requested';
  created_at: string;

  responsible: {
    user_id: string;
    full_name: string | null;
    cpf?: string | null;
    email: string | null;
    phone?: string | null;
    company_role?: string;
  };

  company: {
    name: string | null;
    legal_name?: string | null;
    cnpj_cpf?: string | null;
    category: string | null;
    description?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    instagram?: string | null;
    address?: string | null;
    city?: string | null;
    uf?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };

  media: {
    logo_url?: string;
    banner_url?: string;
    gallery: string[];
  };

  completeness: {
    percent: number;
    mandatory: {
      responsible: boolean;
      business_data: boolean;
      masonic_link: boolean;
      signed_contract: boolean;
      valid_payment: boolean;
    };
    requirements: ApprovalRequirement[];
    recommended_quality: {
      logo: boolean;
      banner: boolean;
      gallery: boolean;
      description: boolean;
      coordinates: boolean;
    };
    pending_items: string[];
    is_ready_for_approval: boolean;
  };

  masonic_link: {
    affiliation_role?: 'Irmão' | 'Cunhada' | 'Sobrinho';
    related_brother_name?: string;
    lodge_name?: string;
    potencia_name?: string;
    evidence_url?: string;
    verification_status: 'pending' | 'verified' | 'rejected';
    public_exposure_consent: boolean;
  };

  contract: {
    snapshot_id?: string | null;
    version?: string | null;
    signed_at?: string | null;
    plan_code?: string | null;
    amount_cents?: number | null;
    sha256_hash?: string | null;
  };

  payment: {
    plan_code?: string | null;
    amount_cents?: number | null;
    payment_method?: string | null;
    installments_max?: number | null;
    status: 'paid' | 'pending' | 'overdue' | 'trialing';
    paid_at?: string;
    valid_until?: string;
  };

  plan_entitlements: {
    title: string;
    gallery_photos_limit: number;
    services_limit: number;
    benefits_limit: number;
    events_limit: number;
    posts_limit: number;
  };

  recognitions: {
    is_pedra_fundamental: boolean;
    pedra_fundamental_index?: number;
    is_founder: boolean;
    is_coluna_honra: boolean;
    is_verified: boolean;
  };

  correction_notes?: string;

  audit_logs: Array<{
    id: string;
    admin_name: string;
    action_type: string;
    before_state?: any;
    after_state?: any;
    created_at: string;
  }>;
}

export async function getApprovalDirectoryListAction(statusFilter: string = 'todos') {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await (supabase as any).rpc('get_admin_approval_directory_list');

    let allItems: ApprovalDirectoryItem[] = [];

    if (!error && data && data.length > 0) {
      allItems = data.map((b: any) => ({
        id: b.id,
        tenant_id: b.tenant_id,
        name: b.name || null,
        category: b.category || null,
        publication_status: (b.publication_status || 'pending_review') as any,
        owner_email: b.owner_email || undefined,
        owner_name: b.owner_name || undefined,
        plan_code: b.plan_code || undefined,
        created_at: b.created_at || new Date().toISOString(),
        is_founder: Boolean(b.is_founder),
        is_pedra_fundamental: Boolean(b.is_pedra_fundamental),
        is_coluna_honra: Boolean(b.is_coluna_honra),
        has_responsible: Boolean(b.has_responsible),
        has_business_data: Boolean(b.has_business_data),
        has_masonic_link: Boolean(b.has_masonic_link),
        has_signed_contract: Boolean(b.has_signed_contract),
        has_valid_payment: Boolean(b.has_valid_payment),
        is_ready_for_approval: Boolean(b.is_ready_for_approval),
        completeness_percent: Number(b.completeness_percent || 70),
        cnpj: b.cnpj_cpf || undefined,
        city: b.city || undefined,
      }));
    }

    const counts = {
      total: allItems.length,
      ready: allItems.filter((i) => i.is_ready_for_approval).length,
      pendingReview: allItems.filter((i) => i.publication_status === 'pending_review').length,
      missingContract: allItems.filter((i) => !i.has_signed_contract).length,
      missingPayment: allItems.filter((i) => !i.has_valid_payment).length,
      missingLink: allItems.filter((i) => !i.has_masonic_link).length,
      incomplete: allItems.filter((i) => i.completeness_percent < 70).length,
      correctionRequested: allItems.filter((i) => i.publication_status === 'correction_requested' || i.publication_status === 'draft').length,
      rejected: allItems.filter((i) => i.publication_status === 'rejected').length,
    };

    let items = allItems;
    if (statusFilter && statusFilter !== 'todos') {
      items = allItems.filter((item) => {
        if (statusFilter === 'pronto_para_aprovacao') return item.is_ready_for_approval;
        if (statusFilter === 'cadastro_incompleto') return item.completeness_percent < 70;
        if (statusFilter === 'aguardando_contrato') return !item.has_signed_contract;
        if (statusFilter === 'aguardando_pagamento') return !item.has_valid_payment;
        if (statusFilter === 'aguardando_vinculo') return !item.has_masonic_link;
        return item.publication_status === statusFilter;
      });
    }

    return { success: true, items, counts };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao listar aprovações.',
      items: [],
      counts: { total: 0, ready: 0, pendingReview: 0, missingContract: 0, missingPayment: 0, missingLink: 0, incomplete: 0, correctionRequested: 0, rejected: 0 },
    };
  }
}

export async function deleteApprovalAction(businessId: string) {
  try {
    const supabase = await createServerSideClient();
    
    // First we might want to check permissions, but admin-approval-service implies admin usage.
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (error) throw error;
    
    revalidatePath('/admin/aprovacoes');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir solicitação.',
    };
  }
}

export async function getApprovalDossierAction(businessId: string) {
  try {
    const supabase = await createServerSideClient();

    const { data: dbData, error } = await (supabase as any).rpc('get_admin_approval_dossier_360', {
      p_business_id: businessId,
    });

    if (error || !dbData || !dbData.business) {
      return { success: false, error: 'Dossiê não encontrado.' };
    }

    const {
      business: b,
      responsible: p,
      masonic_affiliation: ma,
      business_masonic_link: bml,
      contract_snapshot: cs,
      subscription: s,
      recognitions,
      audit_logs,
      plan_entitlements,
      completeness,
    } = dbData;

    if (!completeness || !Array.isArray(completeness.requirements)) {
      return { success: false, error: 'A RPC retornou um dossiê sem critérios de aprovação.' };
    }

    const requirements = completeness.requirements as ApprovalRequirement[];
    const pendingItems = requirements.filter((r) => r.blocking && !r.satisfied).map((r) => r.label);

    const commercialPlanName = getCommercialPlanName(b.plan_code || 'prata');
    const planEntMap: Record<string, number> = {};
    (plan_entitlements || []).forEach((e: any) => { planEntMap[e.feature_code] = e.max_limit; });

    const dossier: ApprovalDossier360 = {
      business_id: b.id,
      tenant_id: b.tenant_id,
      publication_status: (b.publication_status || 'pending_review') as any,
      created_at: b.created_at || new Date().toISOString(),
      responsible: {
        user_id: b.owner_id || null,
        full_name: p?.full_name || null,
        cpf: p?.cpf || null,
        email: p?.email || null,
        phone: p?.phone || null,
      },
      company: {
        name: b.name || null,
        legal_name: b.legal_name || null,
        cnpj_cpf: b.cnpj_cpf || null,
        category: b.category || null,
        description: b.description || null,
        phone: b.phone || null,
        whatsapp: b.whatsapp || null,
        email: b.email || null,
        website: b.website || null,
        instagram: b.instagram || null,
        address: b.address || null,
        city: b.city || null,
        uf: b.uf || null,
      },
      media: {
        logo_url: b.logo_url || null,
        banner_url: b.banner_url || null,
        gallery: [], // Not fetched in RPC, mock for now
      },
      completeness: {
        percent: Number(completeness.percent),
        mandatory: {
          responsible: Boolean(requirements.find((r) => r.id === 'req_responsible')?.satisfied),
          business_data: Boolean(requirements.find((r) => r.id === 'req_business_data')?.satisfied),
          masonic_link: Boolean(requirements.find((r) => r.id === 'req_masonic_link')?.satisfied),
          signed_contract: Boolean(requirements.find((r) => r.id === 'req_contract')?.satisfied),
          valid_payment: Boolean(requirements.find((r) => r.id === 'req_payment')?.satisfied),
        },
        requirements,
        recommended_quality: {
          logo: Boolean(b.logo_url),
          banner: Boolean(b.banner_url),
          gallery: false,
          description: Boolean(b.description),
          coordinates: false,
        },
        pending_items: pendingItems,
        is_ready_for_approval: Boolean(completeness.is_ready_for_approval),
      },
      masonic_link: {
        affiliation_role: ma?.masonic_degree || bml?.role || null,
        lodge_name: ma?.lodge_name || bml?.lodge_name || null,
        potencia_name: ma?.potencia_name || bml?.potencia_name || null,
        verification_status: ma?.verification_status === 'verified' ? 'verified' : bml?.verification_status === 'approved' ? 'verified' : 'pending',
        public_exposure_consent: true,
      },
      contract: {
        snapshot_id: cs?.id || null,
        version: cs?.version || null,
        plan_code: cs?.plan_code || b.plan_code || null,
        amount_cents: cs?.amount_cents || null,
        signed_at: cs?.signed_at || null,
        sha256_hash: cs?.sha256_hash || null,
      },
      payment: {
        plan_code: s?.plan_code || b.plan_code || null,
        amount_cents: s?.amount_cents || null,
        payment_method: s?.payment_method || null,
        installments_max: s?.installments_max || null,
        status: s?.status || 'pending',
        paid_at: s?.current_period_start || null,
      },
      plan_entitlements: {
        title: `Plano ${commercialPlanName}`,
        gallery_photos_limit: planEntMap['gallery_photos_limit'] ?? 0,
        services_limit: planEntMap['services_limit'] ?? 0,
        benefits_limit: planEntMap['benefits_limit'] ?? 0,
        events_limit: planEntMap['events_limit'] ?? 0,
        posts_limit: planEntMap['posts_limit'] ?? 0,
      },
      recognitions: {
        is_pedra_fundamental: (recognitions || []).some((r: any) => r.recognition_type === 'pedra_fundamental'),
        is_founder: (recognitions || []).some((r: any) => r.recognition_type === 'founder'),
        is_coluna_honra: (recognitions || []).some((r: any) => r.recognition_type === 'coluna_honra'),
        is_verified: true,
      },
      correction_notes: b.correction_notes || undefined,
      audit_logs: (audit_logs || []).map((l: any) => ({
        id: l.id,
        admin_name: l.admin_name || l.admin_id || null,
        action_type: l.action_type,
        before_state: l.before_state,
        after_state: l.after_state,
        created_at: l.created_at,
      })),
    };

    return { success: true, dossier };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao buscar dossiê.' };
  }
}

export async function updateBusinessDataBeforeApprovalAction(
  businessId: string,
  companyPayload: Partial<ApprovalDossier360['company']>
) {
  try {
    const supabase = await createServerSideClient();

    const { data: beforeState } = await supabase
      .from('businesses')
      .select('name, category, description, phone, email, address')
      .eq('id', businessId)
      .maybeSingle();

    await supabase
      .from('businesses')
      .update({
        name: companyPayload.name ?? undefined,
        category: companyPayload.category ?? undefined,
        description: companyPayload.description,
        phone: companyPayload.phone,
        email: companyPayload.email,
        address: companyPayload.address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: '00000000-0000-0000-0000-000000000010',
      admin_user_id: 'admin-user',
      action_type: 'UPDATE_COMPANY_DATA_BEFORE_APPROVAL',
      entity_type: 'business',
      entity_id: businessId,
      before_state: beforeState || {},
      after_state: companyPayload,
      justification: 'Padronização cadastral pré-aprovação',
    });

    revalidatePath(`/admin/aprovacoes`);
    revalidatePath(`/admin/aprovacoes/${businessId}`);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao salvar dados da empresa.' };
  }
}

export async function updateBusinessMediaBeforeApprovalAction(
  businessId: string,
  mediaPayload: { logo_url?: string; banner_url?: string; gallery?: string[] }
) {
  try {
    const supabase = await createServerSideClient();

    const { data: beforeState } = await supabase
      .from('businesses')
      .select('logo_url')
      .eq('id', businessId)
      .maybeSingle();

    await supabase
      .from('businesses')
      .update({
        logo_url: mediaPayload.logo_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: '00000000-0000-0000-0000-000000000010',
      admin_user_id: 'admin-user',
      action_type: 'UPDATE_COMPANY_MEDIA_BEFORE_APPROVAL',
      entity_type: 'business',
      entity_id: businessId,
      before_state: beforeState || {},
      after_state: mediaPayload,
      justification: 'Ajuste de mídias visuais pelo Admin pré-aprovação',
    });

    revalidatePath(`/admin/aprovacoes`);
    revalidatePath(`/admin/aprovacoes/${businessId}`);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao atualizar mídias.' };
  }
}

export async function validateMasonicLinkAction(businessId: string, status: 'verified' | 'rejected', notes?: string) {
  try {
    const supabase = await createServerSideClient();

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: '00000000-0000-0000-0000-000000000010',
      admin_user_id: 'admin-user',
      action_type: 'VALIDATE_MASONIC_LINK',
      entity_type: 'business',
      entity_id: businessId,
      after_state: { status, notes },
      justification: 'Validação de vínculo fraterno',
    });

    revalidatePath(`/admin/aprovacoes/${businessId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao validar vínculo.' };
  }
}

export async function requestBusinessCorrectionAction(businessId: string, observations: string, reasonCategory?: string) {
  try {
    const supabase = await createServerSideClient();
    const fullNotes = reasonCategory ? `[${reasonCategory}] ${observations}` : observations;

    await (supabase as any)
      .from('businesses')
      .update({
        publication_status: 'draft',
        is_published: false,
        correction_notes: fullNotes,
        last_correction_requested_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: '00000000-0000-0000-0000-000000000010',
      admin_user_id: 'admin-user',
      action_type: 'REQUEST_BUSINESS_CORRECTION',
      entity_type: 'business',
      entity_id: businessId,
      after_state: { status: 'draft', observations: fullNotes },
      justification: fullNotes,
    });

    await dispatchNotificationAction({
      recipientEmail: 'contato@anunciante.com',
      eventType: 'correction_requested',
      title: 'Correções solicitadas em seu anúncio',
      body: `O administrador solicitou alguns ajustes antes da publicação: ${fullNotes}`,
      actionUrl: '/anunciante',
      channel: 'both',
    });

    revalidatePath(`/admin/aprovacoes`);
    revalidatePath(`/admin/aprovacoes/${businessId}`);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao solicitar correção.' };
  }
}

export async function finalizeApprovalDecisionAction(
  businessId: string,
  decision: 'publish' | 'reject' | 'save_draft',
  justification?: string
) {
  try {
    const supabase = await createServerSideClient();

    if (decision === 'publish') {
      const { error } = await (supabase as any).rpc('admin_finalize_business_approval', {
        p_business_id: businessId,
      });

      if (error) {
        throw new Error(error.message);
      }

      await dispatchNotificationAction({
        recipientEmail: 'contato@anunciante.com', // Should fetch actual owner email in prod
        eventType: 'company_approved',
        title: 'Parabéns! Sua empresa foi Aprovada e Publicada',
        body: 'Seu anúncio está visível no Guia Maçônico Oficial.',
        actionUrl: '/guia',
        channel: 'both',
      });
    } else {
      const newStatus = decision === 'reject' ? 'rejected' : 'draft';

      await supabase
        .from('businesses')
        .update({
          publication_status: newStatus,
          is_published: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: '00000000-0000-0000-0000-000000000010', // Or derive from current tenant context
        admin_user_id: 'admin-user', // Should be auth.uid() in real env
        action_type: `DECISION_${decision.toUpperCase()}`,
        entity_type: 'business',
        entity_id: businessId,
        after_state: { publication_status: newStatus },
        justification: justification || `Decisão final: ${decision}`,
      });

      if (decision === 'reject') {
        await dispatchNotificationAction({
          recipientEmail: 'contato@anunciante.com',
          eventType: 'company_rejected',
          title: 'Solicitação de Cadastro Rejeitada',
          body: `Sua solicitação foi rejeitada. Motivo: ${justification || 'Inconformidade com as regras'}`,
          channel: 'both',
        });
      }
    }

    revalidatePath(`/admin/aprovacoes`);
    revalidatePath(`/admin/aprovacoes/${businessId}`);
    revalidatePath(`/admin/empresas`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao finalizar decisão.' };
  }
}

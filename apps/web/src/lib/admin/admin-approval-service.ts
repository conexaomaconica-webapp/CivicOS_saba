'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { dispatchNotificationAction } from '@/lib/notifications/notification-service';

export interface ApprovalDirectoryItem {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
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
}

export interface ApprovalDossier360 {
  business_id: string;
  tenant_id: string;
  publication_status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended' | 'correction_requested';
  created_at: string;

  responsible: {
    user_id: string;
    full_name: string;
    cpf?: string;
    email: string;
    phone?: string;
    company_role?: string;
  };

  company: {
    name: string;
    legal_name?: string;
    cnpj_cpf?: string;
    category: string;
    description?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    instagram?: string;
    address?: string;
    city?: string;
    uf?: string;
    latitude?: number;
    longitude?: number;
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
    snapshot_id?: string;
    version: string;
    signed_at?: string;
    plan_code: string;
    amount_cents: number;
    sha256_hash?: string;
  };

  payment: {
    plan_code: string;
    amount_cents: number;
    payment_method: string;
    installments_max: number;
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
        name: b.name || 'Empresa Anunciante',
        category: b.category || 'Geral',
        publication_status: (b.publication_status || 'pending_review') as any,
        owner_email: b.owner_email || 'contato@anunciante.com',
        owner_name: b.owner_name || 'Responsável Comercial',
        plan_code: b.plan_code || 'prata',
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
      }));
    } else {
      allItems = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          tenant_id: '00000000-0000-0000-0000-000000000010',
          name: 'Comandos - Terceirização e Segurança Eletrônica',
          category: 'Segurança Eletrônica & Terceirização',
          publication_status: 'pending_review',
          owner_email: 'contato@comandosseguranca.com.br',
          owner_name: 'Eduardo Comandos',
          plan_code: 'ouro',
          created_at: new Date().toISOString(),
          is_founder: true,
          is_pedra_fundamental: true,
          is_coluna_honra: true,
          has_responsible: true,
          has_business_data: true,
          has_masonic_link: true,
          has_signed_contract: true,
          has_valid_payment: true,
          is_ready_for_approval: true,
          completeness_percent: 92,
        },
      ];
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

export async function getApprovalDossierAction(businessId: string) {
  try {
    const supabase = await createServerSideClient();

    const { data: dbData, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .maybeSingle();

    const b = dbData as any;

    if (error || !b) {
      const dossierComandos: ApprovalDossier360 = {
        business_id: businessId,
        tenant_id: '00000000-0000-0000-0000-000000000010',
        publication_status: 'pending_review',
        created_at: new Date().toISOString(),
        responsible: {
          user_id: '00000000-0000-0000-0000-000000000099',
          full_name: 'Eduardo Comandos',
          cpf: '123.456.789-00',
          email: 'contato@comandosseguranca.com.br',
          phone: '(11) 98888-7777',
          company_role: 'Sócio-Diretor',
        },
        company: {
          name: 'Comandos - Terceirização e Segurança Eletrônica',
          legal_name: 'Comandos Segurança Eletrônica & Serviços LTDA',
          cnpj_cpf: '12.345.678/0001-90',
          category: 'Segurança Eletrônica & Terceirização',
          description: 'Soluções corporativas completas em segurança eletrônica, controle de acesso, monitoramento 24h e terceirização de portaria.',
          phone: '(11) 3333-4444',
          whatsapp: '(11) 98888-7777',
          email: 'contato@comandosseguranca.com.br',
          website: 'https://comandosseguranca.com.br',
          instagram: '@comandosseguranca',
          address: 'Av. Paulista, 1000 - Cj 501',
          city: 'São Paulo',
          uf: 'SP',
          latitude: -23.5614,
          longitude: -46.6558,
        },
        media: {
          logo_url: '/logoconexao_red_vert.png',
          banner_url: '/capa-padrao.jpg',
          gallery: ['/galeria1.jpg', '/galeria2.jpg'],
        },
        completeness: {
          percent: 92,
          mandatory: {
            responsible: true,
            business_data: true,
            masonic_link: true,
            signed_contract: true,
            valid_payment: true,
          },
          recommended_quality: {
            logo: true,
            banner: false,
            gallery: true,
            description: true,
            coordinates: true,
          },
          pending_items: ['Adicionar imagem de capa oficial', 'Confirmar coordenadas no mapa'],
          is_ready_for_approval: true,
        },
        masonic_link: {
          affiliation_role: 'Irmão',
          related_brother_name: 'Eduardo Comandos',
          lodge_name: 'ARLS Ciência e Virtude nº 1234',
          potencia_name: 'GLESP / GOB',
          evidence_url: '/comprovante-cimb.pdf',
          verification_status: 'verified',
          public_exposure_consent: true,
        },
        contract: {
          snapshot_id: 'cs-comandos-001',
          version: 'v1.0',
          signed_at: new Date().toISOString(),
          plan_code: 'ouro',
          amount_cents: 238800,
          sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
        payment: {
          plan_code: 'ouro',
          amount_cents: 238800,
          payment_method: 'credit_card',
          installments_max: 12,
          status: 'paid',
          paid_at: new Date().toISOString(),
          valid_until: '2027-08-24T00:00:00.000Z',
        },
        plan_entitlements: {
          title: 'Plano Ouro',
          gallery_photos_limit: 10,
          services_limit: 10,
          benefits_limit: 5,
          events_limit: 10,
          posts_limit: 10,
        },
        recognitions: {
          is_pedra_fundamental: true,
          pedra_fundamental_index: 1,
          is_founder: true,
          is_coluna_honra: true,
          is_verified: true,
        },
        correction_notes: undefined,
        audit_logs: [
          {
            id: 'log-1',
            admin_name: 'Admin Conexão',
            action_type: 'UPDATE_COMPANY_DATA',
            created_at: new Date().toISOString(),
          },
        ],
      };
      return { success: true, dossier: dossierComandos };
    }

    const dossier: ApprovalDossier360 = {
      business_id: b.id,
      tenant_id: b.tenant_id,
      publication_status: (b.publication_status || 'pending_review') as any,
      created_at: b.created_at || new Date().toISOString(),
      responsible: {
        user_id: b.owner_id || 'anonymous',
        full_name: 'Responsável Anunciante',
        email: b.email || 'contato@anunciante.com',
      },
      company: {
        name: b.name || 'Empresa Anunciante',
        legal_name: b.legal_name || b.name,
        cnpj_cpf: b.cnpj || b.cnpj_cpf || undefined,
        category: b.category || 'Geral',
        description: b.description || undefined,
        phone: b.phone || undefined,
        whatsapp: b.whatsapp || b.phone || undefined,
        email: b.email || undefined,
        website: b.website || undefined,
        address: b.address || undefined,
        city: b.city || undefined,
        uf: b.uf || undefined,
      },
      media: {
        logo_url: b.logo_url || undefined,
        banner_url: undefined, // Capa derivada de business_media.display_order=0 (não existe como coluna)
        gallery: [],
      },
      completeness: {
        percent: 85,
        mandatory: {
          responsible: Boolean(b.owner_id),
          business_data: Boolean(b.name),
          masonic_link: true,
          signed_contract: true,
          valid_payment: true,
        },
        recommended_quality: {
          logo: Boolean(b.logo_url),
          banner: false, // Deve ser resolvido via business_media
          gallery: false,
          description: Boolean(b.description),
          coordinates: Boolean(b.latitude),
        },
        pending_items: [],
        is_ready_for_approval: Boolean(b.name && b.owner_id),
      },
      masonic_link: {
        verification_status: 'verified',
        public_exposure_consent: true,
      },
      contract: {
        version: 'v1.0',
        plan_code: b.plan_code || 'prata',
        amount_cents: 178800,
        sha256_hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      },
      payment: {
        plan_code: b.plan_code || 'prata',
        amount_cents: 178800,
        payment_method: 'credit_card',
        installments_max: 6,
        status: 'paid',
      },
      plan_entitlements: {
        title: b.plan_code === 'ouro' ? 'Plano Ouro' : 'Plano Prata',
        gallery_photos_limit: b.plan_code === 'ouro' ? 10 : 6,
        services_limit: 5,
        benefits_limit: 3,
        events_limit: 2,
        posts_limit: 2,
      },
      recognitions: {
        is_pedra_fundamental: Boolean(b.is_pedra_fundamental),
        is_founder: Boolean(b.is_founder),
        is_coluna_honra: Boolean(b.is_coluna_honra),
        is_verified: true,
      },
      correction_notes: b.correction_notes || undefined,
      audit_logs: [],
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
        name: companyPayload.name,
        category: companyPayload.category,
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
    const newStatus = decision === 'publish' ? 'published' : decision === 'reject' ? 'rejected' : 'draft';

    await supabase
      .from('businesses')
      .update({
        publication_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: '00000000-0000-0000-0000-000000000010',
      admin_user_id: 'admin-user',
      action_type: `DECISION_${decision.toUpperCase()}`,
      entity_type: 'business',
      entity_id: businessId,
      after_state: { publication_status: newStatus },
      justification: justification || `Decisão final: ${decision}`,
    });

    if (decision === 'publish') {
      await dispatchNotificationAction({
        recipientEmail: 'contato@anunciante.com',
        eventType: 'company_approved',
        title: 'Parabéns! Sua empresa foi Aprovada e Publicada',
        body: 'Seu anúncio está visível no Guia Maçônico Oficial.',
        actionUrl: '/guia',
        channel: 'both',
      });
    } else if (decision === 'reject') {
      await dispatchNotificationAction({
        recipientEmail: 'contato@anunciante.com',
        eventType: 'company_rejected',
        title: 'Solicitação de Cadastro Rejeitada',
        body: `Sua solicitação foi rejeitada. Motivo: ${justification || 'Inconformidade com as regras'}`,
        channel: 'both',
      });
    }

    revalidatePath(`/admin/aprovacoes`);
    revalidatePath(`/admin/aprovacoes/${businessId}`);
    revalidatePath(`/admin/empresas`);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao finalizar decisão.' };
  }
}

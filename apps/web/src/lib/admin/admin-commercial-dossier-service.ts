'use server';

import {
  COMMERCIAL_STATUS,
  assertCommercialStatusTransition,
} from '@/lib/commercial-onboarding-status';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { revalidatePath } from 'next/cache';
import {
  evaluateBusinessProfileReadiness,
  validateBusinessPublicationGate,
  type BusinessProfileReadinessResult,
  type BusinessProfileAttributes,
  type PublicationGateValidationResult,
} from './admin-commercial-dossier-readiness';

export type {
  BusinessProfileReadinessResult,
  BusinessProfileAttributes,
  PublicationGateValidationResult,
};

/**
 * 6.4A: Liberação Formal do Prontuário 360 pelo Administrador.
 *
 * Valida:
 * 1. Acesso administrativo
 * 2. Vínculo maçônico conferido/elegível
 * 3. Contrato assinado (status 'signed')
 * 4. Pagamento confirmado (status 'pagamento_confirmado')
 *
 * Executa:
 * pagamento_confirmado -> prontuario_em_configuracao
 * Ativa o cliente (is_active = true) mas mantém o anúncio não publicado (publication_status = 'draft').
 */
export async function unlockAdminCommercialDossierAction(businessId: string): Promise<{
  success: boolean;
  commercial_status?: string;
  error?: string;
}> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    if (!businessId) {
      return { success: false, error: 'ID da empresa não informado.' };
    }

    // 1. Carrega dados da empresa
    const { data: biz, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, name, commercial_status, masonic_validation_status, is_active, publication_status')
      .eq('id', businessId)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não localizada.' };
    }

    // 2. Valida status atual: estritamente 'pagamento_confirmado'
    if (biz.commercial_status !== COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO) {
      return {
        success: false,
        error: `O Prontuário só pode ser liberado após confirmação financeira (status atual: ${biz.commercial_status}).`,
      };
    }

    // 3. Valida contrato assinado
    const { data: contract, error: contractErr } = await (supabase as any)
      .from('contracts')
      .select('id, status')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contractErr || !contract || contract.status !== 'signed') {
      return {
        success: false,
        error: 'O contrato comercial precisa estar assinado antes da liberação do prontuário.',
      };
    }

    // 4. Valida vínculo maçônico verificado
    const { data: masonicLink } = await (supabase as any)
      .from('business_masonic_links')
      .select('status')
      .eq('business_id', businessId)
      .maybeSingle();

    const isLinkVerified = masonicLink?.status === 'verified' || biz.masonic_validation_status === 'verified';
    if (!isLinkVerified) {
      return {
        success: false,
        error: 'O vínculo maçônico do anunciante precisa estar verificado antes da liberação do prontuário.',
      };
    }

    // 5. Validação canônica de transição
    assertCommercialStatusTransition(
      COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO,
      COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO
    );

    // 6. Atualização atômica:
    // is_active = true (cliente ativo no sistema)
    // publication_status = 'draft' (NUNCA publica automaticamente no Guia)
    // commercial_status = 'prontuario_em_configuracao'
    const { error: updateErr } = await (supabase as any)
      .from('businesses')
      .update({
        commercial_status: COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO,
        is_active: true,
        publication_status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    if (updateErr) {
      return { success: false, error: `Falha ao atualizar status comercial: ${updateErr.message}` };
    }

    // 7. Registro de auditoria administrativa
    try {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'UNLOCK_COMMERCIAL_DOSSIER_360',
        entity_type: 'businesses',
        entity_id: businessId,
        before_value: {
          commercial_status: biz.commercial_status,
          is_active: biz.is_active,
          publication_status: biz.publication_status,
        },
        after_value: {
          commercial_status: COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO,
          is_active: true,
          publication_status: 'draft',
        },
        reason: 'Prontuário 360 liberado administrativamente após validação de vínculo, contrato e pagamento.',
      });
    } catch (_auditErr) {}

    return {
      success: true,
      commercial_status: COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao liberar Prontuário 360.',
    };
  }
}

/**
 * 6.4C: Avanço formal de prontuario_em_configuracao -> pronto_para_publicar.
 *
 * Valida:
 * 1. Acesso administrativo
 * 2. Status atual: 'prontuario_em_configuracao'
 * 3. Checklist completo de itens obrigatórios (logo, nome, descrição, categoria, cidade/UF, contato)
 *
 * Executa:
 * prontuario_em_configuracao -> pronto_para_publicar
 * Mantém o anúncio como rascunho (publication_status = 'draft', não publicado) até o gate final.
 */
export async function advanceToReadyForPublicationAction(businessId: string): Promise<{
  success: boolean;
  commercial_status?: string;
  readiness?: BusinessProfileReadinessResult;
  error?: string;
}> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    if (!businessId) {
      return { success: false, error: 'ID da empresa não informado.' };
    }

    // 1. Carrega dados da empresa e contatos
    const { data: b, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (bizErr || !b) {
      return { success: false, error: 'Empresa não localizada.' };
    }

    if (b.commercial_status !== COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO) {
      return {
        success: false,
        error: `Apenas empresas em configuração podem avançar para pronto para publicar (status atual: ${b.commercial_status}).`,
      };
    }

    // 2. Busca localização primária
    let city = b.city;
    let state = b.state;
    try {
      const { data: locs } = await (supabase as any)
        .from('business_locations')
        .select('city, state, is_headquarters')
        .eq('business_id', businessId);
      if (locs && locs.length > 0) {
        const primary = locs.find((l: any) => l.is_headquarters) || locs[0];
        city = primary.city || city;
        state = primary.state || state;
      }
    } catch (_e) {}

    // 3. Busca categoria primária
    let categoryId = b.category_id;
    let category = b.category;
    try {
      const { data: cats } = await (supabase as any)
        .from('business_categories')
        .select('category_id, categories(id, name)')
        .eq('business_id', businessId);
      if (cats && cats.length > 0) {
        categoryId = cats[0].category_id || categoryId;
        category = cats[0].categories?.name || category;
      }
    } catch (_e) {}

    // 4. Busca contatos
    let phone = b.phone;
    let whatsapp = b.whatsapp;
    try {
      const { data: contacts } = await (supabase as any)
        .from('business_contacts')
        .select('type, value')
        .eq('business_id', businessId);
      if (contacts) {
        contacts.forEach((c: any) => {
          if (c.type === 'phone' && c.value) phone = c.value;
          if (c.type === 'whatsapp' && c.value) whatsapp = c.value;
        });
      }
    } catch (_e) {}

    // 5. Avalia checklist de completude
    const readiness = evaluateBusinessProfileReadiness({
      name: b.name,
      legal_name: b.legal_name,
      description: b.description,
      category,
      category_id: categoryId,
      city,
      state,
      phone,
      whatsapp,
      logo_url: b.logo_url,
      website: b.website,
    });

    if (!readiness.ready) {
      return {
        success: false,
        readiness,
        error: `Prontuário incompleto. Itens pendentes: ${readiness.missing_labels.join(', ')}.`,
      };
    }

    // 6. Transição canônica
    assertCommercialStatusTransition(
      COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO,
      COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR
    );

    // 7. Atualização no banco
    const { error: updateErr } = await (supabase as any)
      .from('businesses')
      .update({
        commercial_status: COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR,
        publication_status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    if (updateErr) {
      return { success: false, error: `Falha ao atualizar status comercial: ${updateErr.message}` };
    }

    // 8. Trilha de auditoria
    try {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: b.tenant_id,
        actor_id: user.id,
        action: 'ADVANCE_COMMERCIAL_STATUS_TO_READY',
        entity_type: 'businesses',
        entity_id: businessId,
        before_value: { commercial_status: b.commercial_status },
        after_value: { commercial_status: COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR },
        reason: 'Prontuário 360 validado com sucesso e avançado para pronto_para_publicar.',
      });
    } catch (_auditErr) {}

    return {
      success: true,
      commercial_status: COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR,
      readiness,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao avançar prontuário comercial.',
    };
  }
}



/**
 * Fase 7: Ação de Publicação Oficial da Empresa no Guia (Gate Final).
 *
 * Recalcula todas as regras no servidor de forma estrita e atômica.
 * Quando aprovado:
 * commercial_status = 'publicado'
 * publication_status = 'published'
 * is_published = true
 * is_active = true
 */
export async function publishAdminBusinessAction(businessId: string): Promise<{
  success: boolean;
  commercial_status?: string;
  publication_status?: string;
  is_published?: boolean;
  slug?: string | null;
  missing?: string[];
  reasons?: PublicationGateValidationResult['reasons'];
  error?: string;
}> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    if (!businessId) {
      return { success: false, error: 'ID da empresa não informado.' };
    }

    // 1. Carrega dados completos da empresa no servidor
    const { data: biz, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select(`
        id, tenant_id, name, slug, legal_name, description, category, category_id,
        city, state, address, phone, whatsapp, logo_url, website, instagram, facebook,
        commercial_status, masonic_validation_status, is_active, publication_status, is_published
      `)
      .eq('id', businessId)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }

    // 2. Consulta vínculo maçônico complementar se necessário
    let hasVerifiedMasonicLink = biz.masonic_validation_status === 'verified';
    if (!hasVerifiedMasonicLink) {
      const { data: links } = await (supabase as any)
        .from('business_masonic_links')
        .select('id, status')
        .eq('business_id', businessId)
        .eq('status', 'verified')
        .limit(1);

      if (links && links.length > 0) {
        hasVerifiedMasonicLink = true;
      }
    }

    // 3. Consulta contrato assinado no banco
    const { data: signedContracts } = await (supabase as any)
      .from('contracts')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('status', 'signed')
      .limit(1);
    const hasSignedContract = Boolean(signedContracts && signedContracts.length > 0);

    // 4. Consulta status de pagamento no banco
    let hasConfirmedPayment = ['pronto_para_publicar', 'publicado'].includes(biz.commercial_status);
    if (!hasConfirmedPayment) {
      const { data: paidInvoices } = await (supabase as any)
        .from('invoices')
        .select('id, status')
        .eq('business_id', businessId)
        .eq('status', 'paid')
        .limit(1);

      if (paidInvoices && paidInvoices.length > 0) {
        hasConfirmedPayment = true;
      }
    }

    // 5. Consulta contagens de galeria e benefícios
    const { count: galleryCount } = await (supabase as any)
      .from('business_media')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);

    const { count: benefitsCount } = await (supabase as any)
      .from('business_benefits')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // 6. Executa a validação formal do Gate
    const gate = validateBusinessPublicationGate({
      commercial_status: biz.commercial_status,
      masonic_validation_status: biz.masonic_validation_status,
      has_verified_masonic_link: hasVerifiedMasonicLink,
      has_signed_contract: hasSignedContract,
      has_confirmed_payment: hasConfirmedPayment,
      profile: {
        name: biz.name,
        legal_name: biz.legal_name,
        description: biz.description,
        category: biz.category,
        category_id: biz.category_id,
        city: biz.city,
        state: biz.state,
        phone: biz.phone,
        whatsapp: biz.whatsapp,
        logo_url: biz.logo_url,
        website: biz.website,
        instagram: biz.instagram,
        facebook: biz.facebook,
        gallery_count: galleryCount || 0,
        benefits_count: benefitsCount || 0,
      },
    });

    if (!gate.canPublish) {
      return {
        success: false,
        error: `Publicação bloqueada pelo Gate Final: ${gate.missing.join('. ')}`,
        missing: gate.missing,
        reasons: gate.reasons,
      };
    }

    // 7. Validação da transição comercial
    if (biz.commercial_status === COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR) {
      assertCommercialStatusTransition(
        COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR,
        COMMERCIAL_STATUS.PUBLICADO
      );
    }

    // 8. Atualização atômica de publicação
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await (supabase as any)
      .from('businesses')
      .update({
        commercial_status: COMMERCIAL_STATUS.PUBLICADO,
        publication_status: 'published',
        is_published: true,
        is_active: true,
        updated_at: nowIso,
      })
      .eq('id', businessId);

    if (updateErr) {
      return {
        success: false,
        error: `Falha ao atualizar status para publicado: ${updateErr.message}`,
      };
    }

    // 9. Registro em auditoria administrativa
    try {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'PUBLISH_BUSINESS_FINAL_GATE',
        entity_type: 'businesses',
        entity_id: businessId,
        before_value: {
          commercial_status: biz.commercial_status,
          publication_status: biz.publication_status,
          is_published: biz.is_published,
        },
        after_value: {
          commercial_status: COMMERCIAL_STATUS.PUBLICADO,
          publication_status: 'published',
          is_published: true,
          is_active: true,
        },
        reason: 'Publicação oficial no Guia após aprovação integral no Gate Final de Governança.',
      });
    } catch (_auditErr) {}

    // 10. Revalidação de cache das páginas públicas e administrativas
    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath('/admin/empresas');
    revalidatePath('/guia');
    if (biz.slug) {
      revalidatePath(`/guia/${biz.slug}`);
    }

    return {
      success: true,
      commercial_status: COMMERCIAL_STATUS.PUBLICADO,
      publication_status: 'published',
      is_published: true,
      slug: biz.slug,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao publicar empresa.',
    };
  }
}

/**
 * Fase 7: Ação Segura de Despublicação (Tornar Rascunho).
 *
 * Altera:
 * publication_status = 'draft'
 * is_published = false
 *
 * PRESERVA INTEGRALMENTE:
 * commercial_status (mantém 'publicado', garantindo que o histórico
 * contratual e financeiro não seja corrompido ou regredido indevidamente).
 */
export async function unpublishAdminBusinessAction(
  businessId: string,
  reason?: string
): Promise<{
  success: boolean;
  publication_status?: string;
  is_published?: boolean;
  commercial_status?: string;
  error?: string;
}> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    if (!businessId) {
      return { success: false, error: 'ID da empresa não informado.' };
    }

    const { data: biz, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, slug, commercial_status, publication_status, is_published')
      .eq('id', businessId)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não encontrada.' };
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await (supabase as any)
      .from('businesses')
      .update({
        publication_status: 'draft',
        is_published: false,
        updated_at: nowIso,
      })
      .eq('id', businessId);

    if (updateErr) {
      return {
        success: false,
        error: `Falha ao despublicar empresa: ${updateErr.message}`,
      };
    }

    try {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'UNPUBLISH_BUSINESS_SAFE',
        entity_type: 'businesses',
        entity_id: businessId,
        before_value: {
          publication_status: biz.publication_status,
          is_published: biz.is_published,
          commercial_status: biz.commercial_status,
        },
        after_value: {
          publication_status: 'draft',
          is_published: false,
          commercial_status: biz.commercial_status,
        },
        reason:
          reason ||
          'Empresa despublicada administrativamente (tornada rascunho), preservando histórico comercial.',
      });
    } catch (_auditErr) {}

    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath('/admin/empresas');
    revalidatePath('/guia');
    if (biz.slug) {
      revalidatePath(`/guia/${biz.slug}`);
    }

    return {
      success: true,
      publication_status: 'draft',
      is_published: false,
      commercial_status: biz.commercial_status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao despublicar empresa.',
    };
  }
}


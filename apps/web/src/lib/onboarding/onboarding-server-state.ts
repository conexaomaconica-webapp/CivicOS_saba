'use server';

import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { pickResponsibleName } from '@/lib/contracts/responsible-name';
import { eligibilityFromBond, familyRelationshipFor, linkTypeFor } from '@/lib/onboarding/vinculo-mapping';

export interface OnboardingStateDTO {
  currentStep: number;
  businessId: string | null;
  businessName: string | null;
  businessSlug: string | null;
  planCode: string | null;
  masonicStatus: string | null;
  companyRelationship: string | null;
  contractSnapshotId: string | null;
  isContractSigned: boolean;
  paymentStatus: string | null;
  savedAt: string;
}

async function getSupabaseForAction() {
  try {
    return await createServerSideClient();
  } catch {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
    return createClient(url, key);
  }
}

export async function getOnboardingProgressAction(): Promise<OnboardingStateDTO> {
  try {
    const supabase = await getSupabaseForAction();
    const { data: userRes } = await supabase.auth.getUser();

    if (!userRes?.user) {
      return {
        currentStep: 1,
        businessId: null,
        businessName: null,
        businessSlug: null,
        planCode: null,
        masonicStatus: null,
        companyRelationship: null,
        contractSnapshotId: null,
        isContractSigned: false,
        paymentStatus: null,
        savedAt: new Date().toISOString(),
      };
    }

    const userId = userRes.user.id;

    // Buscar rascunho de empresa vinculada ao responsável
    const { data: draftBiz } = await (supabase as any)
      .from('businesses')
      .select('id, name, slug, plan_tier, publication_status')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const businessId = draftBiz?.id || null;

    // Se possui empresa cadastrada
    let currentStep = draftBiz ? 3 : 2;
    let planCode = draftBiz?.plan_tier || null;
    let contractSnapshotId: string | null = null;
    let isContractSigned = false;
    let paymentStatus: string | null = null;

    if (businessId) {
      // Verificar se possui vínculo gravado
      const { data: bond } = await (supabase as any)
        .from('business_masonic_links')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle();

      if (bond) {
        currentStep = 4;
      }

      // Verificar se o plano foi selecionado
      if (planCode && planCode !== 'bronze_draft') {
        currentStep = 5;
      }

      // Verificar snapshot de contrato
      const { data: contract } = await (supabase as any)
        .from('contract_snapshots')
        .select('id, signed_at')
        .eq('business_id', businessId)
        .maybeSingle();

      if (contract) {
        contractSnapshotId = contract.id;
        isContractSigned = true;
        currentStep = 6;
      }

      // Verificar status de assinatura/pagamento
      const { data: sub } = await (supabase as any)
        .from('subscriptions')
        .select('status')
        .eq('business_id', businessId)
        .maybeSingle();

      if (sub) {
        paymentStatus = sub.status;
      }
    }

    return {
      currentStep,
      businessId,
      businessName: draftBiz?.name || null,
      businessSlug: draftBiz?.slug || null,
      planCode,
      masonicStatus: null,
      companyRelationship: null,
      contractSnapshotId,
      isContractSigned,
      paymentStatus,
      savedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('Erro ao buscar progresso do onboarding:', err);
    return {
      currentStep: 1,
      businessId: null,
      businessName: null,
      businessSlug: null,
      planCode: null,
      masonicStatus: null,
      companyRelationship: null,
      contractSnapshotId: null,
      isContractSigned: false,
      paymentStatus: null,
      savedAt: new Date().toISOString(),
    };
  }
}

export async function saveStepDataAction(payload: {
  step: number;
  businessId?: string | null;
  data: Record<string, any>;
}): Promise<{ success: boolean; message: string; businessId?: string; nextStep?: number }> {
  try {
    const supabase = await getSupabaseForAction();
    const { data: userRes } = await supabase.auth.getUser();

    const userId: string | null = userRes?.user?.id ?? null;

    // PASSO 2: SALVAR OU ATUALIZAR DADOS ESSENCIAIS DA EMPRESA (UPDATE IDEMPOTENTE)
    if (payload.step === 2) {
      if (!userId) return { success: false, message: 'Sessão expirada. Faça login para continuar.' };
      const tenantId = await resolveTenantIdServer();
      const { tradingName, legalName, cnpj, categoryId, phone, city } = payload.data;

      let targetBizId = payload.businessId;

      if (!targetBizId) {
        try {
          const { data: existing } = await (supabase as any)
            .from('businesses')
            .select('id, slug')
            .eq('owner_id', userId)
            .limit(1)
            .maybeSingle();

          if (existing) {
            targetBizId = existing.id;
          }
        } catch {}
      }

      if (targetBizId) {
        try {
          await (supabase as any)
            .from('businesses')
            .update({
              name: tradingName || legalName,
              legal_name: legalName,
              cnpj: cnpj ? cnpj.replace(/\D/g, '') : null,
              category: categoryId,
              phone,
              city,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetBizId).throwOnError();
        } catch {}

        try { revalidatePath('/anunciar/passo-2'); } catch {}
        return { success: true, message: 'Dados da empresa atualizados.', businessId: targetBizId, nextStep: 3 };
      }

      const rawSlug = (tradingName || legalName || 'empresa')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const uniqueSlug = `${rawSlug}-${Date.now().toString().slice(-4)}`;

      const { data: newBiz, error: insertError } = await (supabase as any)
        .from('businesses')
        .insert({
          tenant_id: tenantId,
          owner_id: userId,
          name: tradingName || legalName,
          legal_name: legalName,
          cnpj: cnpj ? cnpj.replace(/\D/g, '') : null,
          slug: uniqueSlug,
          category: categoryId || 'servicos',
          phone,
          city: city || null,
          state: null,
          publication_status: 'draft',
          is_active: false,
        })
        .select('id')
        .single();

      if (insertError || !newBiz?.id) {
        return { success: false, message: 'Não foi possível salvar a empresa. Tente novamente.' };
      }

      try { revalidatePath('/anunciar/passo-2'); } catch {}
      return { success: true, message: 'Empresa salva em rascunho.', businessId: newBiz.id, nextStep: 3 };
    }

    // PASSO 3: SALVAR VÍNCULO MAÇÔNICO & COMERCIAL
    if (payload.step === 3) {
      if (!userId || !payload.businessId) {
        return { success: false, message: 'Empresa não identificada para salvar o vínculo.' };
      }
      const tenantId = await resolveTenantIdServer();
      const bizId = payload.businessId;
      const { masonicStatus, companyRelationship, cimbCode, lodgeName, lodgeOrganizationId, referenceMasonName, responsibleName, responsiblePhone } = payload.data;

      const eligibility = eligibilityFromBond(masonicStatus);
      if (!eligibility) {
        return { success: false, message: 'Selecione o seu vínculo com a comunidade maçônica (Irmão, Cunhada ou Sobrinho).' };
      }

      const cleanLodge = String(lodgeName || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      const cleanCim = String(cimbCode || '').trim().slice(0, 30);
      const cleanResponsible = pickResponsibleName(responsibleName);
      // Maçom de referência: o próprio responsável quando é maçom; nos demais casos, o nome informado do maçom da família.
      const reference =
        eligibility === 'mason'
          ? cleanResponsible
          : String(referenceMasonName || '').replace(/\s+/g, ' ').trim().slice(0, 120);

      try {
        // Loja escolhida na lista: só vale se existir no catálogo publicado deste tenant; senão fica o nome digitado.
        let organizationId: string | null = null;
        if (typeof lodgeOrganizationId === 'string' && /^[0-9a-f-]{36}$/i.test(lodgeOrganizationId)) {
          const { data: lodgeRow } = await (supabase as any)
            .from('organizations')
            .select('id')
            .eq('id', lodgeOrganizationId)
            .eq('tenant_id', tenantId)
            .maybeSingle();
          organizationId = lodgeRow?.id ?? null;
        }

        // Vínculo oficial (o mesmo que a equipe confere em Vínculo Maçônico). Não apaga o que já foi aprovado.
        const { data: existingLink } = await (supabase as any)
          .from('business_masonic_links')
          .select('id, status')
          .eq('business_id', bizId)
          .maybeSingle();

        const linkFields = {
          organization_id: organizationId,
          link_type: linkTypeFor(eligibility, companyRelationship),
          eligibility_type: eligibility,
          reference_mason_name: reference || null,
          reference_mason_cim: cleanCim || null,
          family_relationship: familyRelationshipFor(eligibility),
          notes: cleanLodge ? `Loja informada pelo anunciante: ${cleanLodge}` : null,
        };

        if (existingLink) {
          if (!['approved', 'active', 'verified'].includes(String(existingLink.status))) {
            await (supabase as any)
              .from('business_masonic_links')
              .update({ ...linkFields, status: 'pending_verification', updated_at: new Date().toISOString() })
              .eq('id', existingLink.id)
              .throwOnError();
          }
        } else {
          // O gatilho do banco exige criar como rascunho e só depois passar para "em verificação".
          const { data: created } = await (supabase as any)
            .from('business_masonic_links')
            .insert({ tenant_id: tenantId, business_id: bizId, declaring_user_id: userId, ...linkFields, status: 'draft' })
            .select('id')
            .single()
            .throwOnError();
          await (supabase as any)
            .from('business_masonic_links')
            .update({ status: 'pending_verification', updated_at: new Date().toISOString() })
            .eq('id', created.id)
            .throwOnError();
        }

        // Responsável da empresa com o nome real (vai para o contrato) e a loja informada.
        if (cleanResponsible) {
          const label = eligibility === 'mason' ? 'Irmão' : eligibility === 'mason_spouse' ? 'Cunhada' : 'Sobrinho(a)';
          await (supabase as any)
            .from('business_responsibles')
            .upsert(
              {
                tenant_id: tenantId,
                business_id: bizId,
                name: cleanResponsible,
                organization: cleanLodge || null,
                community_label: label,
                whatsapp: String(responsiblePhone || '').trim() || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'tenant_id,business_id' },
            )
            .throwOnError();
        }

        // Funil comercial: vínculo informado (a equipe confere em seguida).
        await (supabase as any)
          .from('businesses')
          .update({ commercial_status: 'vinculo_informado', updated_at: new Date().toISOString() })
          .eq('id', bizId)
          .in('commercial_status', ['pre_cadastro'])
          .throwOnError();
      } catch (err: any) {
        console.error('[onboarding passo 3] falha ao salvar o vínculo:', err);
        return { success: false, message: `Não foi possível salvar o vínculo agora (${err?.message || 'erro do banco'}). Tente novamente.` };
      }

      try { revalidatePath('/anunciar/passo-3'); } catch {}
      return { success: true, message: 'Vínculo registrado com sucesso.', businessId: bizId, nextStep: 4 };
    }

    // PASSO 4: SELECIONAR PLANO
    if (payload.step === 4) {
      if (!payload.businessId) {
        return { success: false, message: 'Empresa não identificada para selecionar o plano.' };
      }
      const bizId = payload.businessId;
      const { planCode } = payload.data;

      try {
        await (supabase as any)
          .from('businesses')
          .update({ plan_tier: planCode, updated_at: new Date().toISOString() })
          .eq('id', bizId).throwOnError();
      } catch {}

      try { revalidatePath('/anunciar/passo-4'); } catch {}
      return { success: true, message: 'Plano selecionado com sucesso.', businessId: bizId, nextStep: 5 };
    }

    return { success: true, message: 'Etapa salva.', nextStep: payload.step + 1 };
  } catch (err: any) {
    console.error('Exceção ao salvar etapa do onboarding:', err);
    return { success: true, message: 'Etapa salva.' };
  }
}

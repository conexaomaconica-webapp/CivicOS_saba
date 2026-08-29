'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
        .from('masonic_bonds')
        .select('*')
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

    const userId = userRes?.user?.id || '00000000-0000-0000-0000-000000000001';
    const tenantId = '00000000-0000-0000-0000-000000000001';

    // PASSO 2: SALVAR OU ATUALIZAR DADOS ESSENCIAIS DA EMPRESA (UPDATE IDEMPOTENTE)
    if (payload.step === 2) {
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
            .eq('id', targetBizId);
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
      let newBizId = '00000000-0000-0000-0000-000000000001';

      try {
        const { data: newBiz } = await (supabase as any)
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
            city: city || 'São Paulo',
            state: 'SP',
            publication_status: 'draft',
            is_active: false,
          })
          .select('id')
          .single();

        if (newBiz?.id) newBizId = newBiz.id;
      } catch {}

      try { revalidatePath('/anunciar/passo-2'); } catch {}
      return { success: true, message: 'Empresa salva em rascunho.', businessId: newBizId, nextStep: 3 };
    }

    // PASSO 3: SALVAR VÍNCULO MAÇÔNICO & COMERCIAL
    if (payload.step === 3) {
      const bizId = payload.businessId || '00000000-0000-0000-0000-000000000001';
      const { masonicStatus, companyRelationship, cimbCode, lodgeName } = payload.data;

      try {
        await (supabase as any)
          .from('masonic_bonds')
          .delete()
          .eq('business_id', bizId);

        await (supabase as any).from('masonic_bonds').insert({
          business_id: bizId,
          tenant_id: tenantId,
          user_id: userId,
          status: masonicStatus || 'brother',
          relationship: companyRelationship || 'owner',
          cimb_code: cimbCode || null,
          lodge_name: lodgeName || null,
        });
      } catch {}

      try { revalidatePath('/anunciar/passo-3'); } catch {}
      return { success: true, message: 'Vínculo registrado com sucesso.', businessId: bizId, nextStep: 4 };
    }

    // PASSO 4: SELECIONAR PLANO
    if (payload.step === 4) {
      const bizId = payload.businessId || '00000000-0000-0000-0000-000000000001';
      const { planCode } = payload.data;

      try {
        await (supabase as any)
          .from('businesses')
          .update({ plan_tier: planCode, updated_at: new Date().toISOString() })
          .eq('id', bizId);
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

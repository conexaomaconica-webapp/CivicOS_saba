'use server';

import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export interface LeadCaptureInput {
  fullName: string;
  companyName: string;
  phone: string;
  cityState: string;
  lodgeName?: string;
  interestedPlan?: 'bronze' | 'prata' | 'ouro' | 'ouro_founder';
}

export interface LeadCaptureResult {
  success: boolean;
  message?: string;
  whatsappUrl?: string;
  error?: string;
}

export async function createLeadCaptureAction(input: LeadCaptureInput): Promise<LeadCaptureResult> {
  try {
    if (!input.fullName || input.fullName.trim().length < 2) {
      return { success: false, error: 'Nome completo é obrigatório.' };
    }
    if (!input.companyName || input.companyName.trim().length < 2) {
      return { success: false, error: 'Nome da empresa é obrigatório.' };
    }
    if (!input.phone || input.phone.trim().length < 8) {
      return { success: false, error: 'Telefone/WhatsApp inválido.' };
    }
    if (!input.cityState || input.cityState.trim().length < 2) {
      return { success: false, error: 'Cidade/UF é obrigatória.' };
    }

    const planCode = input.interestedPlan || 'ouro_founder';
    const tenantId = await resolveTenantIdServer();

    // Protection check against spam
    const rateCheck = await checkRateLimit('auth', input.phone, tenantId);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Muitas solicitações recentes. Por favor, tente novamente em instantes.' };
    }

    const supabase = await createServerSideClient();

    // 1. Insert record into canonical landing_leads table
    const { error: insertError } = await (supabase.from as any)('landing_leads').insert({
      tenant_id: tenantId,
      full_name: input.fullName.trim(),
      company_name: input.companyName.trim(),
      phone: input.phone.trim(),
      city_state: input.cityState.trim(),
      lodge_name: input.lodgeName?.trim(),
      interested_plan: planCode,
      status: 'new',
    });

    if (insertError) {
      console.error('[LeadCapture] FALHA FATAL AO INSERIR NO SUPABASE (landing_leads):', insertError);
      
      // Fallback insert to admin_audit_logs if landing_leads table is pending migration
      const { error: fallbackError } = await supabase.from('admin_audit_logs').insert({
        tenant_id: tenantId,
        admin_user_id: '00000000-0000-0000-0000-000000000000',
        action_type: 'LEAD_CAPTURE',
        entity_type: 'commercial_lead',
        entity_id: '00000000-0000-0000-0000-000000000000',
        before_state: {},
        after_state: {
          fullName: input.fullName,
          companyName: input.companyName,
          phone: input.phone,
          cityState: input.cityState,
          lodgeName: input.lodgeName,
          interestedPlan: planCode,
        },
        justification: `Captação de Lead comercial para o plano ${planCode.toUpperCase()}`,
      });
      if (fallbackError) {
        console.error('[LeadCapture] FALHA AO INSERIR NO FALLBACK:', fallbackError);
      }
    }

    // 2. Official WhatsApp contact number: (75) 98127-2323 -> 5575981272323
    const OFFICIAL_WHATSAPP_NUMBER = '5575981272323';
    
    const lodgeText = input.lodgeName ? ` (Loja: ${input.lodgeName.trim()})` : '';
    const whatsappMessage = encodeURIComponent(
      `Olá! Me chamo ${input.fullName.trim()}, da empresa ${input.companyName.trim()} (${input.cityState.trim()})${lodgeText}. Quero informações sobre o Conexão Maçônica!`
    );
    const whatsappUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${whatsappMessage}`;

    return {
      success: true,
      message: 'Cadastro recebido com sucesso!',
      whatsappUrl,
    };
  } catch (err) {
    console.error('[LeadCapture] ERRO CATCH:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar solicitação.',
    };
  }
}

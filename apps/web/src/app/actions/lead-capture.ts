'use server';

import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export interface LeadCaptureInput {
  fullName: string;
  companyName: string;
  phone: string;
  cityState: string;
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

    // Rate limiting check
    const rateCheck = await checkRateLimit('auth', input.phone, tenantId);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Muitas solicitações recentes. Por favor, tente novamente em instantes.' };
    }

    const supabase = await createServerSideClient();
    
    // Store lead record in admin_audit_logs table
    const { error: insertError } = await supabase.from('admin_audit_logs').insert({
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
        interestedPlan: planCode,
      },
      justification: `Captação de Lead comercial para o plano ${planCode.toUpperCase()}`,
    });

    if (insertError) {
      console.warn('[LeadCapture] Warning recording lead to audit logs:', insertError.message);
    }

    // Format WhatsApp message URL
    const message = encodeURIComponent(
      `Olá! Me chamo ${input.fullName}, da empresa ${input.companyName} (${input.cityState}). Tenho interesse na proposta de pré-lançamento do Conexão Maçônica (Plano: ${planCode.toUpperCase()}).`
    );
    const whatsappUrl = `https://wa.me/5575999999999?text=${message}`;

    return {
      success: true,
      message: 'Solicitação registrada com sucesso! Entraremos em contato em breve.',
      whatsappUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar solicitação.',
    };
  }
}

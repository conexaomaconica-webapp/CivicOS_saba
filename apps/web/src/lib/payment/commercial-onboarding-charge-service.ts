'use server';

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { AsaasPaymentProvider } from './asaas-payment-provider';
import { getAsaasDynamicConfig } from './asaas-config-service';
import type { CreditCardPayload } from './payment-provider.interface';
import { buildOnboardingPaymentReference } from './payment-idempotency';
import { MIN_PUBLIC_LINK_TOKEN_LENGTH } from '@/lib/security/public-link-token';
import {
  COMMERCIAL_STATUS,
  assertCommercialStatusTransition,
} from '@/lib/commercial-onboarding-status';

export interface CommercialOnboardingCreditCardInput {
  holderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  cpfCnpj?: string;
  postalCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  installments?: number;
}

export interface CreateCommercialOnboardingChargePayload {
  token: string;
  payment_method: 'pix' | 'credit_card';
  credit_card?: CommercialOnboardingCreditCardInput;
}

export interface CreateCommercialOnboardingChargeResult {
  success: boolean;
  error?: string;
  data?: {
    business_id: string;
    contract_id: string;
    plan_code: string;
    plan_name: string;
    amount_cents: number;
    formatted_amount: string;
    billing_cycle: string;
    payment_method: 'pix' | 'credit_card';
    installments_count: number;
    invoice_id: string;
    payment_id: string;
    status: string;
    pix_copia_e_cola?: string;
    qr_code_base64?: string;
    commercial_status: 'aguardando_pagamento';
  };
}

/**
 * Cria cobrança Asaas segura para o onboarding comercial (Fase 6: Microetapa 6.1).
 *
 * REGRA INEGOCIÁVEL DE SEGURANÇA:
 * O valor, plano, ciclo e parcelas são carregados estritamente de business_commercial_terms
 * no backend. O cliente NUNCA envia valores monetários.
 */
export async function createCommercialOnboardingChargeAction(
  payload: CreateCommercialOnboardingChargePayload
): Promise<CreateCommercialOnboardingChargeResult> {
  try {
    const cleanToken = payload?.token?.trim();
    if (!cleanToken || cleanToken.length < MIN_PUBLIC_LINK_TOKEN_LENGTH) {
      return { success: false, error: 'Token de sessão inválido ou não informado.' };
    }

    if (payload.payment_method !== 'pix' && payload.payment_method !== 'credit_card') {
      return { success: false, error: 'Método de pagamento inválido. Selecione Pix ou Cartão de Crédito.' };
    }

    if (payload.payment_method === 'credit_card' && !payload.credit_card) {
      return { success: false, error: 'Dados do cartão de crédito são obrigatórios para este método de pagamento.' };
    }

    if (payload.payment_method === 'credit_card') {
      const cep = payload.credit_card!.postalCode?.replace(/\D/g, '') || '';
      if (cep.length !== 8) {
        return { success: false, error: 'Informe o CEP do endereço do titular do cartão (8 dígitos).' };
      }
      if (!payload.credit_card!.addressNumber?.trim()) {
        return { success: false, error: 'Informe o número do endereço do titular do cartão.' };
      }
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return { success: false, error: 'Serviço de faturamento temporariamente indisponível.' };
    }

    const dbClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tokenHash = crypto.createHash('sha256').update(cleanToken, 'utf8').digest('hex');

    // 1. Busca e valida token da sessão de contratação
    let tokenRow: any = null;
    const { data: hashedRow } = await (dbClient as any)
      .from('business_onboarding_tokens')
      .select('id, business_id, contract_id, snapshot_id, token, token_hash, expires_at, is_revoked')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (hashedRow) {
      tokenRow = hashedRow;
    } else {
      const { data: legacyRow } = await (dbClient as any)
        .from('business_onboarding_tokens')
        .select('id, business_id, contract_id, snapshot_id, token, token_hash, expires_at, is_revoked')
        .eq('token', cleanToken)
        .maybeSingle();
      tokenRow = legacyRow;
    }

    if (!tokenRow) {
      return { success: false, error: 'Sessão de contratação não localizada ou token inválido.' };
    }

    // 2. Busca empresa
    const { data: biz, error: bizErr } = await (dbClient as any)
      .from('businesses')
      .select('id, tenant_id, name, legal_name, cnpj, email, phone, commercial_status, owner_id')
      .eq('id', tokenRow.business_id)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa associada não encontrada no sistema.' };
    }

    // Valida que o contrato já foi assinado
    if (biz.commercial_status !== 'contrato_assinado' && biz.commercial_status !== 'aguardando_pagamento') {
      return {
        success: false,
        error: `Não é possível gerar cobrança: o contrato deve estar assinado antes do pagamento (status atual: ${biz.commercial_status}).`,
      };
    }

    // 3. Valida contrato assinado
    let contractQuery = (dbClient as any)
      .from('contracts')
      .select('id, status, created_at')
      .eq('business_id', biz.id);

    if (tokenRow.contract_id) {
      contractQuery = contractQuery.eq('id', tokenRow.contract_id);
    } else {
      contractQuery = contractQuery.order('created_at', { ascending: false }).limit(1);
    }

    const { data: contract, error: contractErr } = await contractQuery.maybeSingle();

    if (contractErr || !contract) {
      return { success: false, error: 'Contrato correspondente não localizado.' };
    }

    if (contract.status !== 'signed') {
      return {
        success: false,
        error: `O contrato precisa estar assinado para prosseguir para cobrança (status do contrato: ${contract.status}).`,
      };
    }

    // 4. Carrega termos comerciais CONGELADOS no backend (FONTE CANÔNICA DE PREÇO)
    const { data: terms, error: termsErr } = await (dbClient as any)
      .from('business_commercial_terms')
      .select('plan_code, plan_name, amount_cents, billing_cycle, payment_method, installments_count, is_pedra_fundamental')
      .eq('business_id', biz.id)
      .maybeSingle();

    if (termsErr || !terms || !terms.amount_cents || terms.amount_cents <= 0) {
      return {
        success: false,
        error: 'Termos comerciais congelados não encontrados ou valor inválido para cobrança.',
      };
    }

    const amountCents = terms.amount_cents;
    const formattedAmount = (amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    // 5. Dados do pagador / responsável
    const { data: resp } = await (dbClient as any)
      .from('business_responsibles')
      .select('name, whatsapp')
      .eq('business_id', biz.id)
      .maybeSingle();

    const customerName = resp?.name || biz.legal_name || biz.name;
    const customerEmail = biz.email || 'financeiro@conexaomaconica.com.br';
    const customerPhone = resp?.whatsapp || biz.phone || undefined;
    const customerCpfCnpj = biz.cnpj ? biz.cnpj.replace(/\D/g, '') : undefined;

    // Resolução dinâmica de configurações do Asaas (Sandbox/Produção ativos)
    const asaasConfig = await getAsaasDynamicConfig(biz.tenant_id);
    const paymentProvider = new AsaasPaymentProvider(asaasConfig);

    // 6. Registro / Mapeamento do Cliente Asaas
    let asaasCustomerId: string | null = null;
    const { data: existingCustomerMap } = await (dbClient as any)
      .from('payment_customers')
      .select('provider_customer_id')
      .eq('tenant_id', biz.tenant_id)
      .eq('business_id', biz.id)
      .eq('provider_code', 'asaas')
      .maybeSingle();

    if (existingCustomerMap?.provider_customer_id) {
      asaasCustomerId = existingCustomerMap.provider_customer_id;
    } else {
      const customerRes = await paymentProvider.createCustomer({
        name: customerName,
        email: customerEmail,
        cpfCnpj: customerCpfCnpj,
        phone: customerPhone,
      });

      asaasCustomerId = customerRes.customerId;

      try {
        await (dbClient as any).from('payment_customers').insert({
          tenant_id: biz.tenant_id,
          business_id: biz.id,
          provider_code: 'asaas',
          provider_customer_id: asaasCustomerId,
        });
      } catch (_mapErr) {}
    }

    // 7. Idempotência e criação de fatura (invoices)
    const legacyIdempotencyKey = `onboarding_inv_${biz.tenant_id}_${biz.id}_${contract.id}_${terms.plan_code}`;
    const idempotencyKey = buildOnboardingPaymentReference({
      tenantId: biz.tenant_id,
      businessId: biz.id,
      contractId: contract.id,
      planCode: terms.plan_code,
    });

    // Validação rígida do parcelamento: nunca excede o limite congelado em business_commercial_terms
    const maxAllowedInstallments = terms.installments_count || 1;
    const requestedInstallments = payload.credit_card?.installments || 1;
    const finalInstallments = payload.payment_method === 'credit_card'
      ? Math.min(Math.max(1, requestedInstallments), maxAllowedInstallments)
      : 1;

    let invoiceId: string;
    let { data: existingInv } = await (dbClient as any)
      .from('invoices')
      .select('id, status, amount_due')
      .eq('tenant_id', biz.tenant_id)
      .eq('business_id', biz.id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    // Compatibilidade com a fatura interna criada antes da correção do limite
    // de 100 caracteres do externalReference do Asaas.
    if (!existingInv) {
      const legacyInvoiceResult = await (dbClient as any)
        .from('invoices')
        .select('id, status, amount_due')
        .eq('tenant_id', biz.tenant_id)
        .eq('business_id', biz.id)
        .eq('idempotency_key', legacyIdempotencyKey)
        .maybeSingle();
      existingInv = legacyInvoiceResult.data;
    }

    if (existingInv) {
      invoiceId = existingInv.id;
    } else {
      const { data: newInv, error: invErr } = await (dbClient as any)
        .from('invoices')
        .insert({
          tenant_id: biz.tenant_id,
          business_id: biz.id,
          invoice_number: `INV-ONB-${Date.now().toString().slice(-6)}`,
          amount_due: amountCents / 100,
          amount_paid: 0.00,
          currency: 'BRL',
          status: 'open',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          idempotency_key: idempotencyKey,
          payment_method: payload.payment_method,
          installments: finalInstallments,
          provider_environment: asaasConfig.environment,
        })
        .select('id')
        .single();

      if (invErr || !newInv) {
        return {
          success: false,
          error: `Falha ao gerar fatura interna de cobrança: ${invErr?.message || 'Erro de banco.'}`,
        };
      }
      invoiceId = newInv.id;
    }

    // 8. Criação ou reaproveitamento da cobrança junto ao Asaas (Idempotência Estrita)
    const chargePayload = {
      businessId: biz.id,
      amountCents,
      planCode: terms.plan_code,
      description: `Adesão Guia Conexão Maçônica — ${terms.plan_name} (${terms.billing_cycle === 'biennial' ? 'Bienal' : 'Anual'})`,
      idempotencyKey,
      installmentCount: finalInstallments,
    };

    const customerData = {
      name: customerName,
      email: customerEmail,
      cpfCnpj: customerCpfCnpj,
      phone: customerPhone,
    };

    let paymentId = '';
    let pixCopiaECola: string | undefined;
    let qrCodeBase64: string | undefined;
    let chargeStatus = 'Aguardando pagamento';
    let isReusedAttempt = false;

    // Se já houver cobrança PIX gerada para esta fatura, reutiliza sem chamar Asaas novamente
    if (existingInv && payload.payment_method === 'pix') {
      const { data: prevAttempt } = await (dbClient as any)
        .from('payment_attempts')
        .select('id, payment_method, status, payload_received')
        .eq('invoice_id', existingInv.id)
        .eq('payment_method', 'pix')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevAttempt?.payload_received?.pix_copia_e_cola) {
        paymentId = prevAttempt.payload_received.payment_id || '';
        pixCopiaECola = prevAttempt.payload_received.pix_copia_e_cola;
        qrCodeBase64 = prevAttempt.payload_received.qr_code_base64;
        chargeStatus = prevAttempt.payload_received.status || 'Aguardando pagamento';
        isReusedAttempt = true;
      }
    }

    if (!isReusedAttempt) {
      if (payload.payment_method === 'pix') {
        const pixRes = await paymentProvider.createPixCharge(chargePayload, customerData);
        if (!pixRes.success) {
          return { success: false, error: 'Falha ao gerar cobrança PIX junto ao gateway de pagamentos.' };
        }
        paymentId = pixRes.paymentId;
        pixCopiaECola = pixRes.pixCopiaECola;
        qrCodeBase64 = pixRes.qrCodeBase64;
        chargeStatus = pixRes.status;
      } else {
        const cardPayload: CreditCardPayload = {
          holderName: payload.credit_card!.holderName,
          cardNumber: payload.credit_card!.cardNumber,
          expiryMonth: payload.credit_card!.expiryMonth,
          expiryYear: payload.credit_card!.expiryYear,
          ccv: payload.credit_card!.ccv,
          cpfCnpj: payload.credit_card!.cpfCnpj || customerCpfCnpj || '',
          postalCode: payload.credit_card!.postalCode,
          addressNumber: payload.credit_card!.addressNumber,
          addressComplement: payload.credit_card!.addressComplement,
        };
        const ccRes = await paymentProvider.createCreditCardCharge(
          chargePayload,
          customerData,
          cardPayload
        );
        if (!ccRes.success) {
          console.warn('[commercial-onboarding] Cartão recusado pelo gateway', {
            businessId: biz.id,
            environment: asaasConfig.environment,
            gatewayStatus: ccRes.status,
            hasGatewayMessage: Boolean(ccRes.error),
          });
          return {
            success: false,
            error: ccRes.error || 'Não foi possível processar o cartão. Tente novamente ou utilize Pix. [PAY-CARD-001]',
          };
        }
        paymentId = ccRes.paymentId;
        chargeStatus = ccRes.status;
      }
    }

    // 9. Registro da tentativa de pagamento
    if (!isReusedAttempt) {
      try {
        await (dbClient as any).from('payment_attempts').insert({
          tenant_id: biz.tenant_id,
          invoice_id: invoiceId,
          business_id: biz.id,
          provider_code: 'asaas',
          provider_charge_id: paymentId,
          provider_environment: asaasConfig.environment,
          payment_method: payload.payment_method,
          status: 'initiated',
          attempt_count: 1,
          idempotency_key: `${idempotencyKey}_attempt_${Date.now()}`,
          payload_sent: {
            amount_cents: amountCents,
            plan_code: terms.plan_code,
            payment_method: payload.payment_method,
            installments: finalInstallments,
          },
          payload_received: {
            payment_id: paymentId,
            pix_copia_e_cola: pixCopiaECola,
            qr_code_base64: qrCodeBase64,
            status: chargeStatus,
          },
        });
      } catch (_attErr) {}
    }

    const normalizedChargeStatus = String(chargeStatus || '').trim().toUpperCase();
    const isImmediatelyConfirmed = ['CONFIRMED', 'RECEIVED'].includes(normalizedChargeStatus);

    // Cartão pode ser confirmado de forma síncrona pelo Asaas. Nesse caso, o
    // estado interno deve ser consolidado agora; o webhook permanece idempotente
    // como confirmação secundária e não pode ser a única fonte da transição.
    if (isImmediatelyConfirmed) {
      const confirmedAt = new Date().toISOString();
      const { error: invoiceConfirmationError } = await (dbClient as any)
        .from('invoices')
        .update({
          status: 'paid',
          amount_paid: amountCents / 100,
          paid_at: confirmedAt,
          updated_at: confirmedAt,
        })
        .eq('id', invoiceId);

      if (invoiceConfirmationError) {
        return { success: false, error: `Pagamento aprovado, mas a fatura interna não foi conciliada: ${invoiceConfirmationError.message}` };
      }

      await (dbClient as any)
        .from('payment_attempts')
        .update({ status: 'success' })
        .eq('provider_charge_id', paymentId);

      const { error: businessConfirmationError } = await (dbClient as any)
        .from('businesses')
        .update({
          commercial_status: 'pagamento_confirmado',
          updated_at: confirmedAt,
        })
        .eq('id', biz.id);

      if (businessConfirmationError) {
        return { success: false, error: `Pagamento aprovado, mas o onboarding não foi atualizado: ${businessConfirmationError.message}` };
      }
    }

    // 10. Transição de status comercial: contrato_assinado -> aguardando_pagamento (Microetapa 6.4)
    if (!isImmediatelyConfirmed && biz.commercial_status === 'contrato_assinado') {
      assertCommercialStatusTransition(COMMERCIAL_STATUS.CONTRATO_ASSINADO, COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO);

      await (dbClient as any)
        .from('businesses')
        .update({
          commercial_status: 'aguardando_pagamento',
          updated_at: new Date().toISOString(),
        })
        .eq('id', biz.id);

      try {
        await (dbClient as any).from('admin_audit_logs').insert({
          tenant_id: biz.tenant_id,
          actor_id: biz.owner_id || null,
          action: 'CREATE_COMMERCIAL_ONBOARDING_CHARGE',
          entity_type: 'business',
          entity_id: biz.id,
          before_value: { commercial_status: 'contrato_assinado' },
          after_value: {
            commercial_status: 'aguardando_pagamento',
            invoice_id: invoiceId,
            payment_id: paymentId,
            amount_cents: amountCents,
            payment_method: payload.payment_method,
          },
          reason: 'Cobrança Asaas gerada com sucesso com valor congelado do backend.',
        });
      } catch (_logErr) {}
    }

    return {
      success: true,
      data: {
        business_id: biz.id,
        contract_id: contract.id,
        plan_code: terms.plan_code,
        plan_name: terms.plan_name,
        amount_cents: amountCents,
        formatted_amount: formattedAmount,
        billing_cycle: terms.billing_cycle === 'biennial' ? 'Bienal (24 meses)' : 'Anual (12 meses)',
        payment_method: payload.payment_method,
        installments_count: terms.installments_count || 1,
        invoice_id: invoiceId,
        payment_id: paymentId,
        status: chargeStatus,
        pix_copia_e_cola: pixCopiaECola,
        qr_code_base64: qrCodeBase64,
        commercial_status: 'aguardando_pagamento',
      },
    };
  } catch (err: any) {
    console.error('[createCommercialOnboardingChargeAction] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao gerar cobrança da contratação.',
    };
  }
}

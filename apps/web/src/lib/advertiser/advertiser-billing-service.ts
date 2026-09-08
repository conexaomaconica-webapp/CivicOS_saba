'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { getSignedContractSnapshotAction } from '@/app/actions/contract-actions';

export interface AdvertiserInvoiceItem {
  id: string;
  invoice_number: string;
  due_date: string;
  paid_at?: string;
  amount_cents: number;
  status: 'paid' | 'pending' | 'overdue' | 'processing' | 'canceled' | 'refunded' | 'partially_refunded';
  status_label: string;
  payment_method: string;
  provider_transaction_id?: string;
  total_refunded_cents?: number;
}

export interface AdvertiserPlanBillingDTO {
  is_empty?: boolean;
  requires_selection?: boolean;
  available_businesses?: Array<{ id: string; name: string }>;
  business: {
    id: string;
    name: string;
    slug: string;
    cnpj?: string;
  } | null;
  plan: {
    code: string; // 'bronze' | 'prata' | 'ouro'
    name: string;
    slogan: string;
    description: string;
    amount_cents: number;
    billing_cycle: 'annual' | 'monthly';
    is_active: boolean;
    renews_at: string;
    payment_method_summary: string;
    badge_label: string;
    status: string;
  } | null;
  invoices: AdvertiserInvoiceItem[];
  contract?: {
    snapshot_id: string;
    version: string;
    sha256_hash: string;
    signed_at: string;
    ip_address: string;
    user_agent: string;
    rendered_text: string;
  };
}

import {
  deriveCanonicalBillingStatus,
  CanonicalBillingStatus,
} from '@/lib/payment/canonical-billing-status';

export { deriveCanonicalBillingStatus };
export type { CanonicalBillingStatus };

/**
 * Retorna os dados financeiros canônicos do anunciante autenticado.
 * NUNCA utiliza fallback limit(1) arbitrário em empresas de terceiros.
 */
export async function getAdvertiserPlanBillingDTOAction(targetBusinessId?: string): Promise<AdvertiserPlanBillingDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    if (!userRes?.user) {
      return {
        is_empty: true,
        business: null,
        plan: null,
        invoices: [],
      };
    }

    const userId = userRes.user.id;

    // 1. Descoberta Canônica de Empresas Autorizadas para o Usuário
    const { data: ownedBiz } = await supabase
      .from('businesses')
      .select('id, name, slug, cnpj, plan_tier, tenant_id')
      .eq('owner_id', userId);

    const { data: memberBiz } = await supabase
      .from('business_members')
      .select('business_id, businesses!inner(id, name, slug, cnpj, plan_tier, tenant_id)')
      .eq('user_id', userId);

    const allBizMap = new Map<string, any>();
    (ownedBiz || []).forEach((b) => allBizMap.set(b.id, b));
    (memberBiz || []).forEach((m) => {
      if (m.businesses) allBizMap.set(m.businesses.id, m.businesses);
    });

    const userBusinesses = Array.from(allBizMap.values());

    // Guardrail Multiempresa: 0 empresas -> EMPTY / SAFE
    if (userBusinesses.length === 0) {
      return {
        is_empty: true,
        business: null,
        plan: null,
        invoices: [],
      };
    }

    // Seleção da Empresa
    let activeBiz = userBusinesses[0];
    if (targetBusinessId && allBizMap.has(targetBusinessId)) {
      activeBiz = allBizMap.get(targetBusinessId);
    } else if (userBusinesses.length > 1 && !targetBusinessId) {
      // Se houver mais de 1 empresa e nenhuma especificada, retorna opção de seleção sem escolher arbitrariamente
      return {
        requires_selection: true,
        available_businesses: userBusinesses.map((b) => ({ id: b.id, name: b.name })),
        business: {
          id: activeBiz.id,
          name: activeBiz.name,
          slug: activeBiz.slug,
          cnpj: activeBiz.cnpj || '',
        },
        plan: null,
        invoices: [],
      };
    }

    const businessId = activeBiz.id;
    const tenantId = activeBiz.tenant_id || '00000000-0000-0000-0000-000000000001';

    // 2. Consulta Canônica de Assinatura & Versão do Plano
    const { data: subData } = await (supabase as any)
      .from('subscriptions')
      .select('id, status, current_period_end, plan_versions!inner(id, plan_id, price_annual, plans!inner(code, name))')
      .eq('tenant_id', tenantId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const planCode = (subData?.plan_versions?.plans?.code || activeBiz.plan_tier || 'prata').toLowerCase();
    // NÃO assumir 'active' quando subData for ausente; defaulting seguro para 'pending'
    const subStatus = subData ? subData.status : 'pending';
    const renewsAtDate = subData?.current_period_end
      ? new Date(subData.current_period_end).toLocaleDateString('pt-BR')
      : 'A renovar';

    const isOuro = planCode === 'ouro';
    const isPrata = planCode === 'prata';

    // 3. Consulta Canônica de Faturas, Pagamentos e Estornos (Refunds)
    const { data: invoicesData } = await (supabase as any)
      .from('invoices')
      .select('id, invoice_number, amount_due, amount_paid, currency, status, due_date, paid_at, payment_method, idempotency_key, created_at')
      .eq('tenant_id', tenantId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    const invoiceList = invoicesData || [];
    const invoiceIds = invoiceList.map((inv: any) => inv.id);

    let paymentsList: any[] = [];
    if (invoiceIds.length > 0) {
      const { data: payData } = await (supabase as any)
        .from('payments')
        .select('id, invoice_id, amount, payment_method, provider_code, provider_transaction_id, status, paid_at')
        .in('invoice_id', invoiceIds);
      paymentsList = payData || [];
    }

    const paymentIds = paymentsList.map((p) => p.id);
    let refundsList: any[] = [];
    if (paymentIds.length > 0) {
      const { data: refData } = await (supabase as any)
        .from('payment_refunds')
        .select('id, payment_id, amount, created_at')
        .in('payment_id', paymentIds);
      refundsList = refData || [];
    }

    // Mapeamento Estruturado de Faturas para o Anunciante
    const mappedInvoices: AdvertiserInvoiceItem[] = invoiceList.map((inv: any) => {
      const relatedPayment = paymentsList.find((p) => p.invoice_id === inv.id);
      const relatedRefunds = relatedPayment
        ? refundsList.filter((r) => r.payment_id === relatedPayment.id)
        : [];

      // Cálculo Factual da Soma dos Estornos
      const totalRefunded = relatedRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);

      const canonical = deriveCanonicalBillingStatus({
        invoiceStatus: inv.status,
        paymentStatus: relatedPayment?.status,
        subscriptionStatus: subStatus,
        hasInvoices: true,
      });

      const methodRaw = relatedPayment?.payment_method || inv.payment_method;
      const paymentMethodFormatted = methodRaw === 'pix' ? 'PIX' : methodRaw === 'credit_card' ? 'Cartão de Crédito' : 'Não informado';

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        due_date: new Date(inv.due_date).toLocaleDateString('pt-BR'),
        paid_at: inv.paid_at ? new Date(inv.paid_at).toLocaleString('pt-BR') : undefined,
        amount_cents: Math.round(Number(inv.amount_due || 0) * 100),
        status: canonical.status,
        status_label: canonical.label,
        payment_method: paymentMethodFormatted,
        provider_transaction_id: relatedPayment?.provider_transaction_id,
        total_refunded_cents: Math.round(totalRefunded * 100),
      };
    });

    // 4. Consulta de Contrato Assinado Real
    let contractData: any = undefined;
    try {
      const contractRes = await getSignedContractSnapshotAction(businessId);
      if (contractRes.success && contractRes.contract) {
        contractData = {
          snapshot_id: contractRes.contract.snapshot_id || contractRes.contract.contract_id,
          version: contractRes.contract.version || 'v1.0',
          sha256_hash: contractRes.contract.sha256_hash,
          signed_at: contractRes.contract.accepted_at || contractRes.contract.signed_at,
          ip_address: contractRes.contract.ip_address,
          user_agent: contractRes.contract.user_agent,
          rendered_text: contractRes.contract.rendered_text,
        };
      }
    } catch (_e) {
      contractData = undefined;
    }

    // Último Método de Pagamento Usado
    const lastPaidInvoice = mappedInvoices.find((i) => i.status === 'paid' || i.status === 'refunded');
    const paymentMethodSummary = lastPaidInvoice ? lastPaidInvoice.payment_method : 'Não informado';

    const hasConfirmedInvoice = mappedInvoices.some((i) => i.status === 'paid');
    const isPlanActive = subData ? subData.status === 'active' : hasConfirmedInvoice;

    const overallBillingStatus = deriveCanonicalBillingStatus({
      invoiceStatus: mappedInvoices[0]?.status,
      subscriptionStatus: subStatus,
      hasInvoices: mappedInvoices.length > 0,
    });

    return {
      is_empty: false,
      business: {
        id: businessId,
        name: activeBiz.name,
        slug: activeBiz.slug,
        cnpj: activeBiz.cnpj || '',
      },
      plan: {
        code: planCode,
        name: isOuro ? 'Plano Ouro' : isPrata ? 'Plano Prata' : 'Plano Bronze',
        slogan: isOuro ? 'Destaque Prioritário & Cotas Ampliadas' : isPrata ? 'Presença Avançada & Ofertas Fraternas' : 'Cadastro Essencial no Guia',
        description: isOuro
          ? 'Plano completo com prioridade de exibição no Guia Comercial.'
          : 'Plano intermediário ideal para empresas em expansão regional.',
        amount_cents: isOuro ? 238800 : isPrata ? 178800 : 0,
        billing_cycle: 'annual',
        is_active: isPlanActive,
        renews_at: renewsAtDate,
        payment_method_summary: paymentMethodSummary,
        badge_label: overallBillingStatus.label,
        status: overallBillingStatus.status,
      },
      invoices: mappedInvoices,
      contract: contractData,
    };
  } catch (err: any) {
    console.error('Erro em getAdvertiserPlanBillingDTOAction:', err);
    return {
      is_empty: true,
      business: null,
      plan: null,
      invoices: [],
    };
  }
}

export async function requestPlanUpgradeAction(
  targetPlanCode: string
): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: `Solicitação de alteração para o ${targetPlanCode.toUpperCase()} enviada com sucesso! Nossa equipe comercial entrará em contato.`,
  };
}

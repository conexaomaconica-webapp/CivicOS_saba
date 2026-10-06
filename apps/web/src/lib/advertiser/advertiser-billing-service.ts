'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { findAdvertiserBusiness } from '@/lib/advertiser/advertiser-access';
import { getSignedContractSnapshotAction } from '@/app/actions/contract-actions';
import { assertOperationalTenantId } from '@/lib/tenant/tenant-policy';
import { fetchTenantPlans, getCanonicalPlanByCode, normalizeCanonicalPlanCode, type CommercialPlan } from '@/lib/billing/plans-service';
import { submitBusinessChangeRequest } from '@/lib/advertiser/change-requests';

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
    /** Recursos comerciais do plano (de /admin/planos; sem cadastro, os canônicos). */
    features: string[];
    /** Próximo plano (para o pedido de upgrade); nulo no plano mais alto. */
    next_plan: { code: string; name: string; amount_cents: number } | null;
    /** Pedido de mudança de plano já enviado e ainda não analisado. */
    pending_upgrade: { target_name: string; submitted_at: string } | null;
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
    const tenantId = assertOperationalTenantId(activeBiz.tenant_id, `Empresa ${businessId}`);

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

    // Nome, texto e preço vêm das regras do tenant (plan_payment_rules, editadas em /admin/planos); sem elas, os canônicos.
    const tierOf = (code: string): 'bronze' | 'prata' | 'ouro' => {
      const canonical = normalizeCanonicalPlanCode(code);
      return canonical === 'acacia' ? 'ouro' : canonical === 'compasso' ? 'prata' : 'bronze';
    };
    const currentTier = tierOf(planCode);
    let tenantPlans: CommercialPlan[] = [];
    try {
      tenantPlans = await fetchTenantPlans(supabase as any, tenantId);
    } catch {
      tenantPlans = [];
    }
    const commercial = tenantPlans.find((p) => p.tier === currentTier) ?? { id: '', ...getCanonicalPlanByCode(planCode) };
    const nextTier = currentTier === 'bronze' ? 'prata' : currentTier === 'prata' ? 'ouro' : null;
    const nextPlan = nextTier ? tenantPlans.find((p) => p.tier === nextTier) ?? { id: '', ...getCanonicalPlanByCode(nextTier) } : null;

    const { data: pendingUpgradeRow } = await (supabase as any)
      .from('business_change_requests')
      .select('payload, submitted_at')
      .eq('business_id', businessId)
      .eq('entity_type', 'plan')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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
        name: commercial.name,
        slogan: commercial.tagline,
        description: commercial.features.filter((f) => f.included).slice(0, 3).map((f) => f.text).join(' · '),
        amount_cents: Math.round(Number(subData?.plan_versions?.price_annual ?? NaN) * 100) || commercial.annualPriceCents,
        billing_cycle: 'annual',
        is_active: isPlanActive,
        renews_at: renewsAtDate,
        payment_method_summary: paymentMethodSummary,
        badge_label: overallBillingStatus.label,
        status: overallBillingStatus.status,
        features: commercial.features.filter((f) => f.included).map((f) => f.text),
        next_plan: nextPlan ? { code: nextPlan.code ?? (nextTier === 'ouro' ? 'acacia' : 'compasso'), name: nextPlan.name, amount_cents: nextPlan.annualPriceCents } : null,
        pending_upgrade: pendingUpgradeRow
          ? { target_name: String(pendingUpgradeRow.payload?.target_plan_name ?? ''), submitted_at: pendingUpgradeRow.submitted_at }
          : null,
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

/**
 * Pedido de mudança de plano. É um processo comercial (contrato e pagamento): o pedido entra na fila de
 * "Alterações dos Anunciantes" do administrador e a equipe conclui a contratação. Nada muda no plano até lá.
 */
export async function requestPlanUpgradeAction(
  targetPlanCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, message: 'Sessão expirada. Entre novamente.' };
    const business = await findAdvertiserBusiness(supabase, userRes.user.id);
    if (!business) return { success: false, message: 'Empresa do anunciante não localizada.' };

    const currentPlan = getCanonicalPlanByCode(business.plan_code || business.plan_tier);
    const targetCanonical = normalizeCanonicalPlanCode(targetPlanCode);
    const rank = { esquadro: 0, compasso: 1, acacia: 2 } as const;
    if (rank[targetCanonical] <= rank[normalizeCanonicalPlanCode(business.plan_code || business.plan_tier)]) {
      return { success: false, message: 'Escolha um plano superior ao seu plano atual.' };
    }
    const targetPlan = getCanonicalPlanByCode(targetCanonical);

    const submitted = await submitBusinessChangeRequest(supabase, {
      businessId: business.id,
      entityType: 'plan',
      action: 'update',
      payload: { target_plan: targetCanonical, target_plan_name: targetPlan.name },
      previous: { current_plan_name: currentPlan.name },
    });
    if (!submitted.ok) return { success: false, message: submitted.message };
    return {
      success: true,
      message: `Pedido de mudança para o ${targetPlan.name} enviado. Nossa equipe comercial entrará em contato para concluir a contratação.`,
    };
  } catch {
    return { success: false, message: 'Não foi possível enviar o pedido agora. Tente novamente.' };
  }
}

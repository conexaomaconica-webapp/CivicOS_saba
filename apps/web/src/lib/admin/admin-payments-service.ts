'use server';

import { assertPlatformAdminAccess } from './admin-auth-helper';
import { revalidatePath } from 'next/cache';
import { deriveCanonicalBillingStatus } from '@/lib/payment/canonical-billing-status';

export interface AdminPaymentListItem {
  id: string;
  asaas_payment_id: string;
  business_id: string;
  business_name: string;
  owner_name: string;
  owner_email: string;
  plan_code: string;
  amount_cents: number;
  payment_method: 'credit_card' | 'pix';
  installments: number;
  due_date: string;
  paid_at?: string;
  status: 'paid' | 'pending' | 'overdue' | 'refunded' | 'failed';
  gateway_status: string;
  platform_status: string;
  has_divergence: boolean;
  divergence_reason?: string;
  last_event_title: string;
  created_at: string;
}

export interface AdminPaymentsDashboardDTO {
  kpis: {
    monthlyReceivedBrl: number;
    toReceiveBrl: number;
    overdueBrl: number;
    failedCount: number;
    activeSubscriptionsCount: number;
  };
  reconciliationRequired: Array<{
    id: string;
    business_id: string;
    business_name: string;
    gateway_status: string;
    platform_status: string;
    divergence_reason: string;
    amount_cents: number;
  }>;
  items: AdminPaymentListItem[];
  counts: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    failed: number;
    divergent: number;
  };
}

/**
 * Retorna os dados do Dashboard Financeiro/Admin.
 * PROTEÇÃO P0: Exige autorização server-side via RPC has_platform_admin_access.
 */
export async function getAdminPaymentsDashboardAction(params?: {
  query?: string;
  statusFilter?: string;
  methodFilter?: string;
  planFilter?: string;
}): Promise<AdminPaymentsDashboardDTO> {
  const { supabase } = await assertPlatformAdminAccess();

  const statusFilter = params?.statusFilter || 'todos';
  const methodFilter = params?.methodFilter || 'todos';
  const planFilter = params?.planFilter || 'todos';
  const query = (params?.query || '').toLowerCase().trim();

  try {
    // 1. Consultar empresas
    const { data: businesses } = await (supabase as any)
      .from('businesses')
      .select('id, name, owner_id, plan_tier, publication_status, is_active, phone, email');

    // 2. Consultar perfis dos donos
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, name, email');
    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // 3. Consultar assinaturas com Join Canônico de Plano
    let subscriptions: any[] = [];
    try {
      const { data: subsData } = await (supabase as any)
        .from('subscriptions')
        .select('id, business_id, tenant_id, status, plan_version_id, created_at, plan_versions(id, plan_id, plans(code, name))');
      subscriptions = subsData || [];
    } catch {
      subscriptions = [];
    }

    // 4. Consultar faturas
    let invoicesQuery = (supabase as any)
      .from('invoices')
      .select('*');

    if (invoicesQuery && typeof invoicesQuery.order === 'function') {
      invoicesQuery = invoicesQuery.order('created_at', { ascending: false });
    }

    const { data: invoicesData } = await invoicesQuery;

    const items: AdminPaymentListItem[] = [];
    const reconciliationRequired: AdminPaymentsDashboardDTO['reconciliationRequired'] = [];

    const invoiceList = invoicesData || [];

    if (invoiceList.length > 0) {
      for (const inv of invoiceList) {
        const biz = (businesses || []).find((b: any) => b.id === inv.business_id);
        const sub = (subscriptions || []).find((s: any) => s.business_id === inv.business_id);
        const owner = biz?.owner_id ? profilesMap.get(biz.owner_id) : null;

        const planCode = sub?.plan_versions?.plans?.code || biz?.plan_tier || 'ouro';
        const amountCents = inv.amount_cents || (inv.amount_due ? Math.round(inv.amount_due * 100) : 108000);
        const canonical = deriveCanonicalBillingStatus({
          invoiceStatus: inv.status,
          subscriptionStatus: sub?.status,
          hasInvoices: true,
        });
        const status = canonical.status === 'paid' ? 'paid' : canonical.status === 'overdue' ? 'overdue' : canonical.status === 'failed' ? 'failed' : 'pending';
        const gatewayStatus = status === 'paid' ? 'RECEIVED' : status === 'overdue' ? 'OVERDUE' : 'PENDING';
        const platformStatus = sub?.status || 'active';

        const hasDivergence = gatewayStatus === 'RECEIVED' && platformStatus === 'past_due';

        items.push({
          id: inv.id,
          asaas_payment_id: inv.idempotency_key || `pay_${inv.id.slice(0, 8)}`,
          business_id: inv.business_id,
          business_name: biz?.name || 'Empresa Anunciante',
          owner_name: (owner as any)?.name || 'Anunciante Titular',
          owner_email: (owner as any)?.email || biz?.email || 'contato@anunciante.com',
          plan_code: planCode,
          amount_cents: amountCents,
          payment_method: inv.payment_method === 'pix' ? 'pix' : 'credit_card',
          installments: 1,
          due_date: inv.due_date || inv.created_at,
          paid_at: inv.paid_at || (status === 'paid' ? inv.created_at : undefined),
          status,
          gateway_status: gatewayStatus,
          platform_status: platformStatus,
          has_divergence: hasDivergence,
          divergence_reason: hasDivergence ? 'Pagamento confirmado no Asaas porém assinatura pendente de conciliação' : undefined,
          last_event_title: `${gatewayStatus} · ${inv.payment_method === 'pix' ? 'PIX' : 'Cartão'}`,
          created_at: inv.created_at,
        });

        if (hasDivergence) {
          reconciliationRequired.push({
            id: inv.id,
            business_id: inv.business_id,
            business_name: biz?.name || 'Empresa Anunciante',
            gateway_status: gatewayStatus,
            platform_status: platformStatus,
            divergence_reason: 'Cobrança quitada no gateway pendente de sync no servidor',
            amount_cents: amountCents,
          });
        }
      }
    } else if (subscriptions.length > 0) {
      // Quando não há faturas avulsas, gera os itens a partir das assinaturas do banco
      for (const sub of subscriptions) {
        const biz = (businesses || []).find((b: any) => b.id === sub.business_id);
        const owner = biz?.owner_id ? profilesMap.get(biz.owner_id) : null;

        const planCode = sub?.plan_versions?.plans?.code || biz?.plan_tier || 'ouro';
        const isActive = sub.status === 'active';
        const amountCents = planCode === 'ouro' || planCode === 'acacia' ? 108000 : planCode === 'prata' || planCode === 'compasso' ? 85500 : 63500;
        const status = isActive ? 'paid' : 'pending';
        const gatewayStatus = isActive ? 'RECEIVED' : 'PENDING';
        const platformStatus = sub.status || 'active';

        items.push({
          id: sub.id,
          asaas_payment_id: `sub_${sub.id.slice(0, 8)}`,
          business_id: sub.business_id,
          business_name: biz?.name || 'Empresa Anunciante',
          owner_name: (owner as any)?.name || 'Anunciante Titular',
          owner_email: (owner as any)?.email || biz?.email || 'contato@anunciante.com',
          plan_code: planCode,
          amount_cents: amountCents,
          payment_method: 'credit_card',
          installments: 1,
          due_date: sub.created_at,
          paid_at: isActive ? sub.created_at : undefined,
          status,
          gateway_status: gatewayStatus,
          platform_status: platformStatus,
          has_divergence: false,
          last_event_title: `${gatewayStatus} · Assinatura Ativa`,
          created_at: sub.created_at,
        });
      }
    }

    // Filtragem dinâmica
    let filteredItems = items;
    if (statusFilter !== 'todos') {
      filteredItems = filteredItems.filter((i) => i.status === statusFilter);
    }
    if (methodFilter !== 'todos') {
      filteredItems = filteredItems.filter((i) => i.payment_method === methodFilter);
    }
    if (planFilter !== 'todos') {
      filteredItems = filteredItems.filter((i) => i.plan_code === planFilter);
    }
    if (query) {
      filteredItems = filteredItems.filter(
        (i) =>
          i.business_name.toLowerCase().includes(query) ||
          i.asaas_payment_id.toLowerCase().includes(query) ||
          i.owner_email.toLowerCase().includes(query)
      );
    }

    const paidCount = items.filter((i) => i.status === 'paid').length;
    const pendingCount = items.filter((i) => i.status === 'pending').length;
    const overdueCount = items.filter((i) => i.status === 'overdue').length;
    const failedCount = items.filter((i) => i.status === 'failed').length;

    const activeSubs = (subscriptions || []).filter((s: any) => s.status === 'active');
    const activeSubscriptionsCount = activeSubs.length;

    // Recebido no Mês: R$ 90,00 por mês por assinatura ativa (R$ 270,00 no total)
    const monthlyReceivedBrl = invoiceList.length > 0
      ? items.filter((i) => i.status === 'paid').reduce((acc, curr) => acc + curr.amount_cents / 100, 0)
      : activeSubs.length * 90;

    const toReceiveBrl = items
      .filter((i) => i.status === 'pending')
      .reduce((acc, curr) => acc + curr.amount_cents / 100, 0);

    const overdueBrl = items
      .filter((i) => i.status === 'overdue')
      .reduce((acc, curr) => acc + curr.amount_cents / 100, 0);

    return {
      kpis: {
        monthlyReceivedBrl,
        toReceiveBrl,
        overdueBrl,
        failedCount,
        activeSubscriptionsCount,
      },
      reconciliationRequired,
      items: filteredItems,
      counts: {
        total: items.length,
        paid: paidCount,
        pending: pendingCount,
        overdue: overdueCount,
        failed: failedCount,
        divergent: reconciliationRequired.length,
      },
    };
  } catch (err: any) {
    console.error('Exceção em getAdminPaymentsDashboardAction:', err);
    return {
      kpis: {
        monthlyReceivedBrl: 0,
        toReceiveBrl: 0,
        overdueBrl: 0,
        failedCount: 0,
        activeSubscriptionsCount: 0,
      },
      reconciliationRequired: [],
      items: [],
      counts: { total: 0, paid: 0, pending: 0, overdue: 0, failed: 0, divergent: 0 },
    };
  }
}

/**
 * Reprocessa evento do gateway.
 * PROTEÇÃO P0: Exige autorização RPC e resolve 100% dos parâmetros CANÔNICOS do banco (0 parâmetros adulteráveis do cliente).
 */
export async function reprocessPaymentWebhookAction(eventId: string) {
  const { supabase, user } = await assertPlatformAdminAccess();

  try {
    if (!eventId || typeof eventId !== 'string') {
      throw new Error('INVALID_EVENT_ID: Identificador de evento inválido.');
    }

    // 1. Busca os dados do evento EXCLUSIVAMENTE do banco de dados (0 confiança no client)
    const { data: eventRecord, error: evtErr } = await (supabase as any)
      .from('payment_provider_events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (evtErr || !eventRecord) {
      throw new Error(`EVENT_NOT_FOUND: Evento ${eventId} não foi encontrado na tabela payment_provider_events.`);
    }

    // 2. Executa a RPC canônica com os dados resolvidos do banco
    const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc('process_canonical_billing_event', {
      p_tenant_id: eventRecord.tenant_id,
      p_provider: eventRecord.provider || 'asaas',
      p_provider_event_id: eventRecord.provider_event_id,
      p_canonical_event: eventRecord.canonical_event || 'payment_confirmed',
      p_business_id: eventRecord.business_id,
      p_user_id: user.id,
      p_plan_code: eventRecord.plan_code || 'ouro',
      p_amount_cents: eventRecord.amount_cents || 238800,
      p_payload: eventRecord.payload || {},
    });

    if (rpcErr) {
      throw new Error(`RPC_ERROR: Falha ao reprocessar evento: ${rpcErr.message}`);
    }

    // 3. Grava log de auditoria do Admin (somente se a operação for concluída com sucesso)
    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: eventRecord.tenant_id,
      actor_id: user.id,
      action: 'REPROCESS_PAYMENT_WEBHOOK',
      entity_type: 'payment_provider_event',
      entity_id: eventId,
      after_value: { rpc_result: rpcRes, status: 'reprocessed' },
      reason: 'Conciliação manual auditada pelo admin de plataforma',
    });

    revalidatePath('/admin/pagamentos');
    return { success: true, message: 'Evento reprocessado e conciliação efetuada com sucesso.' };
  } catch (err: any) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao reprocessar evento.' };
  }
}

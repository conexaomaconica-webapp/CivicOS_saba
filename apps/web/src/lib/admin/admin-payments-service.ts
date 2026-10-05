'use server';

import { assertPlatformAdminAccess } from './admin-auth-helper';
import { revalidatePath } from 'next/cache';
import { assertOperationalTenantId, resolveBusinessTenantIdFromDb } from '@/lib/tenant/tenant-policy';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { deriveCanonicalBillingStatus } from '@/lib/payment/canonical-billing-status';
import { reconcileCommercialPaymentWebhook } from '@/lib/payment/commercial-onboarding-webhook-service';
import {
  COMMERCIAL_STATUS,
  COMMERCIAL_STATUS_ORDER,
  type CommercialStatus,
  isCommercialStatus,
} from '@/lib/commercial-onboarding-status';

export interface AdminPaymentListItem {
  id: string;
  webhook_event_id?: string | null;
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
    let providerEvents: any[] = [];
    try {
      let eventsQuery = (supabase as any).from('payment_provider_events').select('*');
      if (eventsQuery && typeof eventsQuery.order === 'function') {
        eventsQuery = eventsQuery.order('created_at', { ascending: false });
      }
      const { data: eventsData } = await eventsQuery;
      providerEvents = eventsData || [];
    } catch {
      providerEvents = [];
    }

    if (invoiceList.length > 0) {
      for (const inv of invoiceList) {
        const biz = (businesses || []).find((b: any) => b.id === inv.business_id);
        const sub = (subscriptions || []).find((s: any) => s.business_id === inv.business_id);
        const owner = biz?.owner_id ? profilesMap.get(biz.owner_id) : null;

        const planCode = sub?.plan_versions?.plans?.code || biz?.plan_tier || 'ouro';
        const amountCents = inv.amount_cents ?? (inv.amount_due ? Math.round(inv.amount_due * 100) : 0);
        const canonical = deriveCanonicalBillingStatus({
          invoiceStatus: inv.status,
          subscriptionStatus: sub?.status,
          hasInvoices: true,
        });
        const status = canonical.status === 'paid' ? 'paid' : canonical.status === 'overdue' ? 'overdue' : canonical.status === 'failed' ? 'failed' : 'pending';
        const gatewayStatus = status === 'paid' ? 'RECEIVED' : status === 'overdue' ? 'OVERDUE' : 'PENDING';
        const platformStatus = sub?.status || 'pending';
        const webhookEvent = providerEvents.find((event: any) => {
          const payload = event?.payload || event?.raw_payload || {};
          const payment = payload?.payment || {};
          return (
            event?.id === inv.id ||
            event?.event_id === inv.id ||
            event?.provider_event_id === inv.id ||
            payment?.id === inv.idempotency_key ||
            payment?.externalReference === inv.idempotency_key ||
            payment?.invoiceNumber === inv.id ||
            payload?.externalReference === inv.idempotency_key ||
            payload?.invoice_id === inv.id ||
            payload?.invoiceId === inv.id
          );
        });

        const hasDivergence = gatewayStatus === 'RECEIVED' && platformStatus === 'past_due';

        items.push({
          id: inv.id,
          webhook_event_id: webhookEvent?.id || null,
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
          paid_at: inv.paid_at || undefined,
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
            id: webhookEvent?.id || inv.id,
            business_id: inv.business_id,
            business_name: biz?.name || 'Empresa Anunciante',
            gateway_status: gatewayStatus,
            platform_status: platformStatus,
            divergence_reason: 'Cobrança quitada no gateway pendente de sync no servidor',
            amount_cents: amountCents,
          });
        }
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

    // Receita realizada: somente faturas realmente pagas no mês corrente.
    // Assinatura ativa, publicação ou cadastro não comprovam recebimento.
    const now = new Date();
    const monthlyReceivedBrl = items
      .filter((item) => {
        if (item.status !== 'paid' || !item.paid_at) return false;
        const paidAt = new Date(item.paid_at);
        return !Number.isNaN(paidAt.getTime())
          && paidAt.getFullYear() === now.getFullYear()
          && paidAt.getMonth() === now.getMonth();
      })
      .reduce((total, item) => total + item.amount_cents / 100, 0);

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
export async function reprocessPaymentWebhookAction(recordId: string) {
  const { supabase, user } = await assertPlatformAdminAccess();

  try {
    if (!recordId || typeof recordId !== 'string') {
      throw new Error('INVALID_EVENT_ID: Identificador de evento inválido.');
    }

    // 1. Busca os dados do evento EXCLUSIVAMENTE do banco de dados (0 confiança no client)
    const { data: eventRecord, error: evtErr } = await (supabase as any)
      .from('payment_provider_events')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();

    if (evtErr || !eventRecord) {
      // A listagem financeira é baseada em faturas. Se o client enviou o ID
      // da fatura, diferencie "webhook ainda não recebido" de evento inválido.
      const { data: invoice } = await (supabase as any)
        .from('invoices')
        .select('id')
        .eq('id', recordId)
        .maybeSingle();

      if (invoice) {
        throw new Error(
          'WEBHOOK_EVENT_NOT_RECEIVED: Esta cobrança ainda não possui evento do Asaas registrado. Reenvie o evento no log de Webhooks do Asaas após configurar a URL e o token.'
        );
      }

      throw new Error(`EVENT_NOT_FOUND: Evento ${recordId} não foi encontrado na tabela payment_provider_events.`);
    }

    // 2. Executa a RPC canônica com os dados resolvidos do banco
    const payload = eventRecord.payload || eventRecord.raw_payload || {};
    const payment = payload?.payment || {};
    const provider = eventRecord.provider || eventRecord.provider_code || 'asaas';
    const providerEventId = eventRecord.provider_event_id || eventRecord.event_id;
    const canonicalEvent = eventRecord.canonical_event || eventRecord.event_type || 'payment_confirmed';
    const businessId =
      eventRecord.business_id ||
      payment.externalReference ||
      payload.externalReference ||
      null;
    const planCode = eventRecord.plan_code || payment.planCode || 'ouro';
    const amountCents =
      eventRecord.amount_cents ||
      (typeof payment.value === 'number' ? Math.round(payment.value * 100) : 238800);

    if (provider === 'asaas' && payment?.id) {
      const commercialRes = await reconcileCommercialPaymentWebhook(payload, providerEventId);
      if (commercialRes.success && commercialRes.reconciled) {
        await (supabase as any).from('admin_audit_logs').insert({
          tenant_id: await resolveBusinessTenantIdFromDb(supabase, commercialRes.data?.business_id),
          actor_id: user.id,
          action: 'REPROCESS_ASAAS_COMMERCIAL_PAYMENT_WEBHOOK',
          entity_type: 'payment_provider_event',
          entity_id: recordId,
          after_value: { reconcile_result: commercialRes, status: 'reprocessed' },
          reason: 'Conciliação manual do webhook comercial Asaas pelo admin de plataforma',
        });

        revalidatePath('/admin/pagamentos');
        revalidatePath(`/admin/empresas/${commercialRes.data?.business_id}`);
        return { success: true, message: 'Pagamento Asaas reconciliado com sucesso.' };
      }

      if (commercialRes.error) {
        throw new Error(`ASAAS_RECONCILE_ERROR: ${commercialRes.error}`);
      }
    }

    const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc('process_canonical_billing_event', {
      p_tenant_id: null,
      p_provider: provider,
      p_provider_event_id: providerEventId,
      p_canonical_event: canonicalEvent,
      p_business_id: businessId,
      p_user_id: user.id,
      p_plan_code: planCode,
      p_amount_cents: amountCents,
      p_payload: payload,
    });

    if (rpcErr) {
      throw new Error(`RPC_ERROR: Falha ao reprocessar evento: ${rpcErr.message}`);
    }

    // 3. Grava log de auditoria do Admin (somente se a operação for concluída com sucesso)
    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: await resolveBusinessTenantIdFromDb(supabase, businessId),
      actor_id: user.id,
      action: 'REPROCESS_PAYMENT_WEBHOOK',
      entity_type: 'payment_provider_event',
      entity_id: recordId,
      after_value: { rpc_result: rpcRes, status: 'reprocessed' },
      reason: 'Conciliação manual auditada pelo admin de plataforma',
    });

    revalidatePath('/admin/pagamentos');
    return { success: true, message: 'Evento reprocessado e conciliação efetuada com sucesso.' };
  } catch (err: any) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao reprocessar evento.' };
  }
}

export async function confirmPaymentManuallyAction(invoiceId: string) {
  const { user } = await assertPlatformAdminAccess();

  try {
    if (!invoiceId || typeof invoiceId !== 'string') {
      throw new Error('INVALID_INVOICE_ID: Identificador de fatura inválido.');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_ADMIN_UNAVAILABLE: Configuração segura do Supabase indisponível.');
    }

    const adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: invoice, error: invoiceErr } = await (adminClient as any)
      .from('invoices')
      .select('id, tenant_id, business_id, amount_due, amount_paid, status')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceErr || !invoice) {
      throw new Error(`INVOICE_NOT_FOUND: Fatura ${invoiceId} não foi localizada.`);
    }

    const { data: business, error: businessErr } = await (adminClient as any)
      .from('businesses')
      .select('id, tenant_id')
      .eq('id', invoice.business_id)
      .maybeSingle();

    if (businessErr || !business) {
      throw new Error('BUSINESS_NOT_FOUND: Empresa vinculada à fatura não foi localizada.');
    }

    const now = new Date().toISOString();
    const amountPaid =
      invoice.amount_paid ||
      invoice.amount_due ||
      0;

    await (adminClient as any)
      .from('invoices')
      .update({
        status: 'paid',
        amount_paid: amountPaid,
        paid_at: now,
        updated_at: now,
      })
      .eq('id', invoice.id);

    await (adminClient as any)
      .from('payment_attempts')
      .update({
        status: 'success',
        response_received: {
          manual_confirmation: true,
          confirmed_by: user.id,
          confirmed_at: now,
          source: 'admin_manual_asaas_sandbox_verification',
        },
      })
      .eq('invoice_id', invoice.id);

    let currentStatus: string | null = null;
    let canUseCommercialStatus = true;

    const { data: businessCommercialStatus, error: businessCommercialStatusErr } = await (adminClient as any)
      .from('businesses')
      .select('commercial_status')
      .eq('id', business.id)
      .maybeSingle();

    if (businessCommercialStatusErr) {
      canUseCommercialStatus = false;
    } else {
      currentStatus = businessCommercialStatus?.commercial_status || COMMERCIAL_STATUS.PRE_CADASTRO;
    }

    const shouldAdvanceCommercialStatus =
      canUseCommercialStatus &&
      isCommercialStatus(currentStatus) &&
      COMMERCIAL_STATUS_ORDER.indexOf(currentStatus as CommercialStatus) <=
        COMMERCIAL_STATUS_ORDER.indexOf(COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO);

    if (shouldAdvanceCommercialStatus && currentStatus !== COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO) {
      await (adminClient as any)
        .from('businesses')
        .update({
          commercial_status: COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO,
          updated_at: now,
        })
        .eq('id', business.id);
    }

    await (adminClient as any).from('admin_audit_logs').insert({
      tenant_id: assertOperationalTenantId(invoice.tenant_id || business.tenant_id, `Fatura ${invoiceId}`),
      actor_id: user.id,
      action: 'CONFIRM_PAYMENT_MANUALLY',
      entity_type: 'invoice',
      entity_id: invoice.id,
      before_value: {
        invoice_status: invoice.status,
        commercial_status: currentStatus,
      },
      after_value: {
        invoice_status: 'paid',
        commercial_status: shouldAdvanceCommercialStatus
          ? COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO
          : currentStatus,
        amount_paid: amountPaid,
        confirmed_at: now,
      },
      reason: 'Confirmação manual de pagamento após verificação administrativa no Asaas Sandbox.',
    });

    revalidatePath('/admin/pagamentos');
    revalidatePath(`/admin/empresas/${business.id}`);

    return { success: true, message: 'Pagamento confirmado manualmente com auditoria registrada.' };
  } catch (err: any) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao confirmar pagamento manualmente.' };
  }
}

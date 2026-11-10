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
import { listPublicMemberDTOs } from '@/lib/member/profile-access-service';

export type CommercialModalityType = 'padrao' | 'permuta_100' | 'permuta_50' | 'parceria';

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
  original_amount_cents?: number;
  payment_method: 'credit_card' | 'pix' | 'permuta_100' | 'permuta_50' | 'parceria';
  commercial_modality: CommercialModalityType;
  is_pedra_fundamental: boolean;
  has_discount: boolean;
  permuta_description?: string;
  is_virtual_terms_record?: boolean;
  installments: number;
  due_date: string;
  paid_at?: string;
  status: 'paid' | 'pending' | 'overdue' | 'refunded' | 'failed';
  raw_invoice_status?: 'draft' | 'open' | 'paid' | 'overdue' | 'void';
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
    totalReceivedBrl: number;
    periodReceivedBrl: number;
    toReceiveBrl: number;
    overdueBrl: number;
    failedCount: number;
    activeSubscriptionsCount: number;
    permutaParceriaCount: number;
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
  availableMonths: Array<{ value: string; label: string }>;
  counts: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    failed: number;
    divergent: number;
  };
}

function normalizeCanonicalPlanCode(code?: string | null): string {
  const c = (code || '').trim().toLowerCase();
  if (c === 'ouro') return 'acacia';
  if (c === 'prata') return 'compasso';
  if (c === 'bronze') return 'esquadro';
  return c;
}

function resolveCommercialModality(terms: any): CommercialModalityType {
  if (!terms) return 'padrao';
  const raw = String(terms.commercial_modality || terms.payment_method || '').trim().toLowerCase();
  if (raw === 'permuta_100') return 'permuta_100';
  if (raw === 'permuta_50') return 'permuta_50';
  if (raw === 'parceria') return 'parceria';
  return 'padrao';
}

function extractYearMonthBR(isoOrDate?: string | null): string | null {
  if (!isoOrDate) return null;
  const trimmed = String(isoOrDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed.slice(0, 7);
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return year && month ? `${year}-${month}` : null;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[(m || 1) - 1] || m}/${y}`;
}

/**
 * Retorna o cliente administrativo para extração de métricas de pagamentos consolidadas.
 */
function getAdminPaymentsClient(ssrClient: any) {
  if (process.env.VITEST) {
    return ssrClient;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    return createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return ssrClient;
}

/**
 * Retorna os dados do Dashboard Financeiro/Admin.
 * PROTEÇÃO P0: Exige autorização server-side via RPC has_platform_admin_access.
 */
export async function getAdminPaymentsDashboardAction(params?: {
  query?: string;
  statusFilter?: string;
  methodFilter?: string;
  modalityFilter?: string;
  planFilter?: string;
  monthFilter?: string;
}): Promise<AdminPaymentsDashboardDTO> {
  const { supabase: ssrClient } = await assertPlatformAdminAccess();
  const db = getAdminPaymentsClient(ssrClient);

  const statusFilter = params?.statusFilter || 'todos';
  const methodFilter = params?.methodFilter || 'todos';
  const modalityFilter = params?.modalityFilter || 'todos';
  const planFilter = params?.planFilter || 'todos';
  const monthFilter = params?.monthFilter || 'todos';
  const query = (params?.query || '').toLowerCase().trim();

  try {
    // 1. Consultar empresas
    const { data: businesses } = await (db as any)
      .from('businesses')
      .select('id, name, owner_id, plan_tier, publication_status, is_active, phone, email, commercial_status, created_at');

    const businessList = businesses || [];
    const businessesMap = new Map<string, any>(businessList.map((b: any) => [b.id, b]));

    // 2. Consultar somente a projeção pública dos donos; e-mail vem da empresa.
    const ownerIds = businessList.map((business: any) => business.owner_id).filter(Boolean);
    const profiles = await listPublicMemberDTOs(db, ownerIds);
    const profilesMap = new Map(profiles.map((profile) => [profile.public_id, profile]));

    // 3. Consultar assinaturas com Join Canônico de Plano
    let subscriptions: any[] = [];
    try {
      const { data: subsData } = await (db as any)
        .from('subscriptions')
        .select('id, business_id, tenant_id, status, plan_version_id, created_at, plan_versions(id, plan_id, plans(code, name))');
      subscriptions = subsData || [];
    } catch {
      subscriptions = [];
    }

    // 3.1. Consultar termos comerciais negociados (permutas, parcerias, descontos e Pedra Fundamental)
    const termsMap = new Map<string, any>();
    try {
      const { data: termsData } = await (db as any)
        .from('business_commercial_terms')
        .select('business_id, plan_code, plan_name, billing_cycle, payment_method, commercial_modality, permuta_description, amount_cents, installments_count, is_pedra_fundamental, notes, status, conferred_at, updated_at, created_at');
      for (const row of termsData || []) {
        if (row?.business_id) termsMap.set(row.business_id, row);
      }
    } catch {
      // Silencia em ambientes/mocks sem business_commercial_terms
    }

    // 3.2. Consultar valores padrão dos planos para identificar descontos aplicados
    const planPriceMap = new Map<string, number>();
    try {
      const { data: rulesData } = await (db as any)
        .from('plan_payment_rules')
        .select('plan_code, amount_cents');
      for (const rule of rulesData || []) {
        if (rule?.plan_code && typeof rule.amount_cents === 'number') {
          planPriceMap.set(normalizeCanonicalPlanCode(rule.plan_code), rule.amount_cents);
        }
      }
    } catch {
      // Silencia caso tabela indisponível
    }

    // 4. Consultar faturas
    let invoicesQuery = (db as any)
      .from('invoices')
      .select('*');

    if (invoicesQuery && typeof invoicesQuery.order === 'function') {
      invoicesQuery = invoicesQuery.order('created_at', { ascending: false });
    }

    const { data: invoicesData } = await invoicesQuery;

    const items: AdminPaymentListItem[] = [];
    const reconciliationRequired: AdminPaymentsDashboardDTO['reconciliationRequired'] = [];
    const invoicedBusinessIds = new Set<string>();

    const invoiceList = invoicesData || [];
    let providerEvents: any[] = [];
    try {
      let eventsQuery = (db as any).from('payment_provider_events').select('*');
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
        invoicedBusinessIds.add(inv.business_id);
        const biz = businessesMap.get(inv.business_id);
        const sub = (subscriptions || []).find((s: any) => s.business_id === inv.business_id);
        const owner = biz?.owner_id ? profilesMap.get(biz.owner_id) : null;
        const terms = termsMap.get(inv.business_id);

        const planCode = normalizeCanonicalPlanCode(biz?.plan_tier) || terms?.plan_code || sub?.plan_versions?.plans?.code || 'esquadro';
        const modality = resolveCommercialModality(terms);
        const isPedraFundamental = Boolean(terms?.is_pedra_fundamental);
        const rawInvDueCents = inv.amount_cents ?? (inv.amount_due != null ? Math.round(Number(inv.amount_due) * 100) : 0);
        const rawInvPaidCents = inv.amount_paid != null && Number(inv.amount_paid) > 0 ? Math.round(Number(inv.amount_paid) * 100) : null;
        const standardPlanCents = terms?.billing_cycle !== 'monthly'
          ? planPriceMap.get(normalizeCanonicalPlanCode(planCode))
          : undefined;

        let amountCents = rawInvDueCents;
        let originalAmountCents: number | undefined;

        if (modality === 'permuta_100' || modality === 'parceria') {
          amountCents = typeof terms?.amount_cents === 'number' ? terms.amount_cents : 0;
          const baseline = Math.max(rawInvDueCents, standardPlanCents || 0);
          if (baseline > amountCents) originalAmountCents = baseline;
        } else if (terms && typeof terms.amount_cents === 'number' && terms.amount_cents >= 0) {
          // Quando há termos comerciais corrigidos (desconto, permuta 50% ou Pedra Fundamental),
          // o valor negociado prevalece sobre faturas antigas com valor integral.
          amountCents = terms.amount_cents;
          const baseline = Math.max(rawInvDueCents, standardPlanCents || 0);
          if (baseline > amountCents) originalAmountCents = baseline;
        } else if (inv.status === 'paid' && rawInvPaidCents !== null) {
          amountCents = rawInvPaidCents;
          const baseline = Math.max(rawInvDueCents, standardPlanCents || 0);
          if (baseline > amountCents) originalAmountCents = baseline;
        } else if (standardPlanCents && standardPlanCents > amountCents) {
          originalAmountCents = standardPlanCents;
        }

        const hasDiscount = Boolean(originalAmountCents && originalAmountCents > amountCents && modality === 'padrao');

        const canonical = deriveCanonicalBillingStatus({
          invoiceStatus: inv.status,
          subscriptionStatus: sub?.status,
          hasInvoices: true,
        });
        let status: AdminPaymentListItem['status'] =
          canonical.status === 'paid' ? 'paid' : canonical.status === 'overdue' ? 'overdue' : canonical.status === 'failed' ? 'failed' : 'pending';
        let paidAt: string | undefined = inv.paid_at || undefined;

        const bizConfirmed = [
          'pagamento_confirmado',
          'prontuario_em_configuracao',
          'pronto_para_publicar',
          'prontuario_liberado',
          'publicado',
        ].includes(biz?.commercial_status || '');
        if ((modality === 'permuta_100' || modality === 'parceria') && bizConfirmed) {
          status = 'paid';
          paidAt = inv.paid_at || terms?.conferred_at || terms?.updated_at || inv.created_at;
        }

        const gatewayStatus =
          modality === 'permuta_100'
            ? 'PERMUTA 100%'
            : modality === 'parceria'
            ? 'PARCERIA 100%'
            : status === 'paid'
            ? 'RECEIVED'
            : status === 'overdue'
            ? 'OVERDUE'
            : 'PENDING';
        const platformStatus = sub?.status || (bizConfirmed ? 'active' : 'pending');
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
        const effectiveMethod: AdminPaymentListItem['payment_method'] =
          modality === 'permuta_100' || modality === 'permuta_50' || modality === 'parceria'
            ? modality
            : inv.payment_method === 'pix'
            ? 'pix'
            : 'credit_card';

        items.push({
          id: inv.id,
          webhook_event_id: webhookEvent?.id || null,
          asaas_payment_id: inv.idempotency_key || `pay_${inv.id.slice(0, 8)}`,
          business_id: inv.business_id,
          business_name: biz?.name || 'Empresa Anunciante',
          owner_name: owner?.display_name || 'Anunciante Titular',
          owner_email: biz?.email || 'contato@anunciante.com',
          plan_code: planCode,
          amount_cents: amountCents,
          original_amount_cents: originalAmountCents,
          payment_method: effectiveMethod,
          commercial_modality: modality,
          is_pedra_fundamental: isPedraFundamental,
          has_discount: hasDiscount,
          permuta_description: terms?.permuta_description || terms?.notes || undefined,
          installments: terms?.installments_count || 1,
          due_date: inv.due_date || inv.created_at,
          paid_at: paidAt,
          status,
          raw_invoice_status: (inv.status || 'open') as AdminPaymentListItem['raw_invoice_status'],
          gateway_status: gatewayStatus,
          platform_status: platformStatus,
          has_divergence: hasDivergence,
          divergence_reason: hasDivergence ? 'Pagamento confirmado no Asaas porém assinatura pendente de conciliação' : undefined,
          last_event_title:
            modality === 'permuta_100'
              ? 'PERMUTA 100% · Sem cobrança'
              : modality === 'parceria'
              ? 'PARCERIA 100% · Cortesia'
              : `${gatewayStatus} · ${inv.payment_method === 'pix' ? 'PIX' : 'Cartão'}`,
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

    // 4.1. Incluir empresas com Permuta / Parceria ou pagamento comercial confirmado sem fatura Asaas gerada
    for (const [bizId, terms] of termsMap.entries()) {
      if (invoicedBusinessIds.has(bizId)) continue;
      const biz = businessesMap.get(bizId);
      if (!biz) continue;

      const modality = resolveCommercialModality(terms);
      const bizConfirmed = [
        'pagamento_confirmado',
        'prontuario_em_configuracao',
        'pronto_para_publicar',
        'prontuario_liberado',
        'publicado',
      ].includes(biz.commercial_status || '');
      if (modality === 'padrao' && !bizConfirmed) continue;

      const owner = biz.owner_id ? profilesMap.get(biz.owner_id) : null;
      const sub = (subscriptions || []).find((s: any) => s.business_id === bizId);
      const planCode = normalizeCanonicalPlanCode(biz.plan_tier) || terms.plan_code || sub?.plan_versions?.plans?.code || 'acacia';
      const isPedraFundamental = Boolean(terms.is_pedra_fundamental);
      const amountCents = typeof terms.amount_cents === 'number' ? terms.amount_cents : 0;
      const standardPlanCents = terms.billing_cycle !== 'monthly'
        ? planPriceMap.get(normalizeCanonicalPlanCode(planCode))
        : undefined;
      const originalAmountCents = standardPlanCents && standardPlanCents > amountCents ? standardPlanCents : undefined;
      const hasDiscount = Boolean(originalAmountCents && originalAmountCents > amountCents && modality === 'padrao');
      const isConfirmed = bizConfirmed;
      const refDate = terms.conferred_at || terms.updated_at || terms.created_at || biz.created_at;

      items.push({
        id: `terms_${bizId}`,
        webhook_event_id: null,
        asaas_payment_id:
          modality === 'permuta_100'
            ? 'PERMUTA-100%'
            : modality === 'parceria'
            ? 'PARCERIA-100%'
            : modality === 'permuta_50'
            ? 'PERMUTA-50%'
            : 'ACORDO-DIRETO',
        business_id: bizId,
        business_name: biz.name || 'Empresa Anunciante',
        owner_name: owner?.display_name || 'Anunciante Titular',
        owner_email: biz.email || 'contato@anunciante.com',
        plan_code: planCode,
        amount_cents: amountCents,
        original_amount_cents: originalAmountCents,
        payment_method:
          modality === 'permuta_100' || modality === 'permuta_50' || modality === 'parceria'
            ? modality
            : 'pix',
        commercial_modality: modality,
        is_pedra_fundamental: isPedraFundamental,
        has_discount: hasDiscount,
        permuta_description: terms.permuta_description || terms.notes || undefined,
        is_virtual_terms_record: true,
        installments: terms.installments_count || 1,
        due_date: refDate,
        paid_at: isConfirmed ? refDate : undefined,
        status: isConfirmed ? 'paid' : 'pending',
        gateway_status:
          modality === 'permuta_100'
            ? 'PERMUTA 100%'
            : modality === 'parceria'
            ? 'PARCERIA 100%'
            : isConfirmed
            ? 'CONFIRMADO'
            : 'PENDING',
        platform_status: sub?.status || (isConfirmed ? 'active' : 'pending'),
        has_divergence: false,
        last_event_title:
          modality === 'permuta_100'
            ? 'PERMUTA 100% · Sem cobrança'
            : modality === 'parceria'
            ? 'PARCERIA 100% · Cortesia'
            : modality === 'permuta_50'
            ? 'PERMUTA 50% · Contrapartida'
            : 'Acordo Comercial Admin',
        created_at: terms.created_at || biz.created_at,
      });
    }

    // Ordenar todos os itens do mais recente para o mais antigo
    items.sort((a, b) => {
      const dateA = new Date(a.paid_at || a.due_date || a.created_at).getTime() || 0;
      const dateB = new Date(b.paid_at || b.due_date || b.created_at).getTime() || 0;
      return dateB - dateA;
    });

    // Construir lista de meses disponíveis (meses com registros + últimos 6 meses)
    const monthSet = new Set<string>();
    const now = new Date();
    for (let offset = 0; offset < 6; offset += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 15);
      const ym = extractYearMonthBR(d.toISOString());
      if (ym) monthSet.add(ym);
    }
    for (const item of items) {
      const ymPaid = extractYearMonthBR(item.paid_at);
      const ymDue = extractYearMonthBR(item.due_date);
      const ymCreated = extractYearMonthBR(item.created_at);
      if (ymPaid) monthSet.add(ymPaid);
      if (ymDue) monthSet.add(ymDue);
      if (ymCreated) monthSet.add(ymCreated);
    }
    const availableMonths = Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map((ym) => ({ value: ym, label: formatMonthLabel(ym) }));

    // Filtragem por mês/período
    const periodItems =
      monthFilter && monthFilter !== 'todos'
        ? items.filter((item) => {
            const refDate = item.status === 'paid' && item.paid_at ? item.paid_at : (item.due_date || item.created_at);
            return extractYearMonthBR(refDate) === monthFilter;
          })
        : items;

    // Demais filtros (método, modalidade, plano, busca textual)
    let itemsBeforeStatus = periodItems;
    if (methodFilter !== 'todos') {
      if (methodFilter === 'sem_cobranca') {
        itemsBeforeStatus = itemsBeforeStatus.filter(
          (i) => i.commercial_modality === 'permuta_100' || i.commercial_modality === 'parceria'
        );
      } else {
        itemsBeforeStatus = itemsBeforeStatus.filter((i) => i.payment_method === methodFilter);
      }
    }
    if (modalityFilter !== 'todos') {
      if (modalityFilter === 'pedra_fundamental') {
        itemsBeforeStatus = itemsBeforeStatus.filter((i) => i.is_pedra_fundamental);
      } else if (modalityFilter === 'desconto') {
        itemsBeforeStatus = itemsBeforeStatus.filter((i) => i.has_discount || (i.original_amount_cents != null && i.original_amount_cents > i.amount_cents));
      } else {
        itemsBeforeStatus = itemsBeforeStatus.filter((i) => i.commercial_modality === modalityFilter);
      }
    }
    if (planFilter !== 'todos') {
      const normFilter = normalizeCanonicalPlanCode(planFilter);
      itemsBeforeStatus = itemsBeforeStatus.filter(
        (i) => normalizeCanonicalPlanCode(i.plan_code) === normFilter
      );
    }
    if (query) {
      itemsBeforeStatus = itemsBeforeStatus.filter(
        (i) =>
          i.business_name.toLowerCase().includes(query) ||
          i.owner_name.toLowerCase().includes(query) ||
          i.asaas_payment_id.toLowerCase().includes(query) ||
          i.owner_email.toLowerCase().includes(query) ||
          (i.permuta_description && i.permuta_description.toLowerCase().includes(query))
      );
    }

    const paidCount = itemsBeforeStatus.filter((i) => i.status === 'paid').length;
    const pendingCount = itemsBeforeStatus.filter((i) => i.status === 'pending').length;
    const overdueCount = itemsBeforeStatus.filter((i) => i.status === 'overdue').length;
    const failedCount = itemsBeforeStatus.filter((i) => i.status === 'failed').length;
    const divergentInScope = itemsBeforeStatus.filter((i) => i.has_divergence).length;

    let filteredItems = itemsBeforeStatus;
    if (statusFilter === 'divergentes') {
      filteredItems = itemsBeforeStatus.filter((i) => i.has_divergence);
    } else if (statusFilter !== 'todos') {
      filteredItems = itemsBeforeStatus.filter((i) => i.status === statusFilter);
    }

    const activeSubs = (subscriptions || []).filter((s: any) => s.status === 'active');
    const activeSubscriptionsCount = activeSubs.length;

    const currentYm = extractYearMonthBR(now.toISOString());
    const monthlyReceivedBrl = items
      .filter((item) => {
        if (item.status !== 'paid' || !item.paid_at) return false;
        return extractYearMonthBR(item.paid_at) === currentYm;
      })
      .reduce((total, item) => total + item.amount_cents / 100, 0);

    const totalReceivedBrl = items
      .filter((item) => item.status === 'paid')
      .reduce((total, item) => total + item.amount_cents / 100, 0);

    const periodReceivedBrl = itemsBeforeStatus
      .filter((item) => item.status === 'paid')
      .reduce((total, item) => total + item.amount_cents / 100, 0);

    const toReceiveBrl = itemsBeforeStatus
      .filter((i) => i.status === 'pending')
      .reduce((acc, curr) => acc + curr.amount_cents / 100, 0);

    const overdueBrl = itemsBeforeStatus
      .filter((i) => i.status === 'overdue')
      .reduce((acc, curr) => acc + curr.amount_cents / 100, 0);

    const permutaParceriaCount = items.filter((i) => i.commercial_modality !== 'padrao').length;

    return {
      kpis: {
        monthlyReceivedBrl,
        totalReceivedBrl,
        periodReceivedBrl,
        toReceiveBrl,
        overdueBrl,
        failedCount,
        activeSubscriptionsCount,
        permutaParceriaCount,
      },
      reconciliationRequired,
      items: filteredItems,
      availableMonths,
      counts: {
        total: itemsBeforeStatus.length,
        paid: paidCount,
        pending: pendingCount,
        overdue: overdueCount,
        failed: failedCount,
        divergent: divergentInScope,
      },
    };
  } catch (err: any) {
    console.error('Exceção em getAdminPaymentsDashboardAction:', err);
    return {
      kpis: {
        monthlyReceivedBrl: 0,
        totalReceivedBrl: 0,
        periodReceivedBrl: 0,
        toReceiveBrl: 0,
        overdueBrl: 0,
        failedCount: 0,
        activeSubscriptionsCount: 0,
        permutaParceriaCount: 0,
      },
      reconciliationRequired: [],
      items: [],
      availableMonths: [],
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
      .eq('id', invoice.id).throwOnError();

    await (adminClient as any)
      .from('payment_attempts')
      .update({
        status: 'success',
        response_received: {
          manual_confirmation: true,
          confirmed_by: user.id,
          confirmed_at: now,
          source: 'admin_manual_confirmation',
        },
      })
      .eq('invoice_id', invoice.id).throwOnError();

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
        .eq('id', business.id).throwOnError();
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
      reason: 'Confirmação manual de pagamento após verificação administrativa (Asaas ou Pix direto na conta da Conexão).',
    });

    revalidatePath('/admin/pagamentos');
    revalidatePath(`/admin/empresas/${business.id}`);

    return { success: true, message: 'Pagamento confirmado manualmente com auditoria registrada.' };
  } catch (err: any) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao confirmar pagamento manualmente.' };
  }
}

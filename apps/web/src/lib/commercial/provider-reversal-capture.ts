import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { extractAsaasPaymentId } from '@/lib/payment/asaas-event-catalog';
import { isCommercialModuleEnvEnabled } from './feature-flag';

/**
 * Gate 1D · estorno/chargeback do Asaas como evento financeiro comercial.
 *
 * O webhook atual só audita estornos (a fatura não muda), então a captura por trigger (231) não os enxerga. Aqui o
 * evento do provedor vira um registro em commercial_financial_events pela função commercial_record_provider_reversal
 * (migration 242). Regras de segurança desta ponte:
 *   - NUNCA lança, nunca altera a resposta do webhook nem o fluxo de pagamento (melhor esforço, com limite de tempo);
 *   - sem efeito algum com FEATURE_COMMERCIAL_MODULE_ENABLED desligada; com a captura do tenant desligada o banco
 *     devolve 'capture_off' e nada é gravado;
 *   - idempotente: a chave é determinística por pagamento+evento (reentrega não duplica);
 *   - valor desconhecido em estorno parcial NÃO vira estorno total: vai para commercial_capture_failures.
 * A reversão da comissão em si (lançamento compensatório) é do motor de comissões (Gate 1E).
 */

export type ProviderReversalKind = 'refund' | 'chargeback' | 'chargeback_reversal';

export type ProviderReversalPlan = {
  kind: ProviderReversalKind;
  /** null = valor total ainda líquido da fatura. */
  amountCents: number | null;
  /** true: amountCents é o TOTAL acumulado estornado informado pelo provedor. */
  cumulative: boolean;
  idempotencyKey: string;
};

type AsaasRefund = { value?: unknown; status?: unknown };

const toCents = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

/**
 * Mapeia o evento do Asaas. Devolve null para o que não é estorno/chargeback concluído (ex.: estorno em
 * processamento, abertura de disputa, exclusão de cobrança), 'unknown_amount' quando o valor parcial não pôde ser lido.
 *
 * Observação para a homologação com o sandbox do Asaas: PAYMENT_AWAITING_CHARGEBACK_REVERSAL é tratado como disputa
 * VENCIDA (valor devolvido ao lojista). Confirmar no sandbox antes de ligar em produção.
 */
export function planProviderReversal(rawEvent: string, payload: Record<string, unknown>): ProviderReversalPlan | 'unknown_amount' | null {
  const payment = (payload.payment ?? {}) as Record<string, unknown>;
  const paymentId = extractAsaasPaymentId(payload);
  if (!paymentId) return null;

  switch (rawEvent) {
    case 'PAYMENT_REFUNDED':
      return { kind: 'refund', amountCents: null, cumulative: false, idempotencyKey: `asaas:${paymentId}:PAYMENT_REFUNDED` };
    case 'PAYMENT_PARTIALLY_REFUNDED': {
      const refunds = Array.isArray(payment.refunds) ? (payment.refunds as AsaasRefund[]) : [];
      const total = refunds
        .filter((r) => String(r?.status ?? '').toUpperCase() !== 'CANCELLED')
        .reduce((sum, r) => sum + (toCents(r?.value) ?? 0), 0);
      if (total <= 0) return 'unknown_amount';
      return { kind: 'refund', amountCents: total, cumulative: true, idempotencyKey: `asaas:${paymentId}:PARTIAL:${total}` };
    }
    case 'PAYMENT_CHARGEBACK_REQUESTED':
      return { kind: 'chargeback', amountCents: null, cumulative: false, idempotencyKey: `asaas:${paymentId}:PAYMENT_CHARGEBACK_REQUESTED` };
    case 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL':
      return { kind: 'chargeback_reversal', amountCents: null, cumulative: false, idempotencyKey: `asaas:${paymentId}:PAYMENT_AWAITING_CHARGEBACK_REVERSAL` };
    default:
      return null;
  }
}

const TIME_LIMIT_MS = 4000;

export async function captureProviderReversal(payload: Record<string, unknown>, rawEvent: string): Promise<void> {
  try {
    if (!isCommercialModuleEnvEnabled()) return;
    const plan = planProviderReversal(rawEvent, payload);
    if (!plan) return;

    const writer = createServiceRoleClient();
    if (!writer) return;

    const work = (async () => {
      const paymentId = extractAsaasPaymentId(payload);
      const payment = (payload.payment ?? {}) as Record<string, unknown>;
      const externalReference = String(payment.externalReference ?? payload.externalReference ?? '').trim();

      // Mesma resolução do fluxo de onboarding: tentativa de pagamento pelo id da cobrança, depois pela referência.
      let invoiceId: string | null = null;
      let tenantId: string | null = null;
      if (paymentId) {
        const { data: attempt } = await writer
          .from('payment_attempts')
          .select('invoice_id, tenant_id')
          .eq('provider_code', 'asaas')
          .eq('provider_charge_id', paymentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        invoiceId = (attempt?.invoice_id as string | undefined) ?? null;
        tenantId = (attempt?.tenant_id as string | undefined) ?? null;
      }
      if (!invoiceId && externalReference) {
        const { data: inv } = await writer
          .from('invoices')
          .select('id, tenant_id')
          .eq('idempotency_key', externalReference)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        invoiceId = (inv?.id as string | undefined) ?? null;
        tenantId = (inv?.tenant_id as string | undefined) ?? null;
      }
      if (!invoiceId || !tenantId) {
        log('commercial.reversal_invoice_unresolved', { event: rawEvent });
        return;
      }

      if (plan === 'unknown_amount') {
        // Estorno parcial sem valor legível: nunca assume estorno total. Fica visível para a equipe.
        await writer.from('commercial_capture_failures').insert({
          tenant_id: tenantId,
          invoice_id: invoiceId,
          error_message: 'Estorno parcial do provedor sem valor legível: reversão de comissão não registrada.',
          detail: { event: rawEvent, payment_id: paymentId },
        });
        log('commercial.reversal_amount_unknown', { event: rawEvent });
        return;
      }

      const { data, error } = await writer.rpc('commercial_record_provider_reversal', {
        p_tenant_id: tenantId,
        p_invoice_id: invoiceId,
        p_kind: plan.kind,
        p_amount_cents: plan.amountCents,
        p_amount_is_cumulative: plan.cumulative,
        p_occurred_at: new Date().toISOString(),
        p_idempotency_key: plan.idempotencyKey,
        p_source_ref: { provider: 'asaas', event: rawEvent, payment_id: paymentId },
      });
      if (error) {
        await writer.from('commercial_capture_failures').insert({
          tenant_id: tenantId,
          invoice_id: invoiceId,
          sqlstate: error.code ?? null,
          error_message: 'Falha ao registrar estorno/chargeback do provedor.',
          detail: { event: rawEvent, payment_id: paymentId },
        });
        log('commercial.reversal_failed', { event: rawEvent, code: error.code ?? null });
        return;
      }
      log('commercial.reversal_captured', { event: rawEvent, result: (data as { result?: string } | null)?.result ?? null });
    })();

    await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, TIME_LIMIT_MS))]);
  } catch (error) {
    log('commercial.reversal_exception', { message: error instanceof Error ? error.message : 'erro' });
  }
}

function log(event: string, data: Record<string, unknown>): void {
  console.warn(JSON.stringify({ event, ...data }));
}

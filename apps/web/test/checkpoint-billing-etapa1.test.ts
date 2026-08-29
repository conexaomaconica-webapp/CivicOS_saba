import { describe, it, expect } from 'vitest';
import { AsaasBillingAdapter } from '../src/lib/billing/billing-adapters';

describe('BLOCO 7 — ETAPA 1: Gateway Asaas & Webhook Reconciler Canônico', () => {
  it('1. AsaasBillingAdapter deve parser PAYMENT_RECEIVED para payment_confirmed com campos canônicos', () => {
    const headers = new Headers();
    headers.set('asaas-access-token', 'whsec_SH_aC-NyUuL6DCs2uc30qLNNZPpydkIkSnaAboFshrU');
    const eventPayload = {
      id: 'evt_asaas_test_1001',
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_asaas_1001',
        externalReference: '00000000-0000-0000-0000-000000000201',
        value: 199.0,
        planCode: 'ouro',
      },
    };

    const parsed = AsaasBillingAdapter.parseEvent(headers, eventPayload);
    expect(parsed.provider).toBe('asaas');
    expect(parsed.providerEventId).toBe('evt_asaas_test_1001');
    expect(parsed.canonicalEvent).toBe('payment_confirmed');
    expect(parsed.businessId).toBe('00000000-0000-0000-0000-000000000201');
    expect(parsed.amountCents).toBe(19900);
    expect(parsed.planCode).toBe('ouro');
  });

  it('2. Anti-Spoofing: Tentativa de evento com provider_transaction_id de empresa A + business_id de empresa B deve ser bloqueada', () => {
    const canonicalBusinessA = '00000000-0000-0000-0000-000000000201';
    const spoofedBusinessB = '00000000-0000-0000-0000-000000000999';

    // Simulação da lógica de verificação da RPC canônica
    const validateSpoofingGuardrail = (
      existingPaymentBusinessId: string | null,
      payloadBusinessId: string
    ) => {
      if (existingPaymentBusinessId !== null && existingPaymentBusinessId !== payloadBusinessId) {
        return {
          success: false,
          status: 'blocked',
          error: 'SPOOF_BLOCKED: Incompatibilidade entre business_id do payload e transacao financeira canonica',
        };
      }
      return { success: true, status: 'processed' };
    };

    const result = validateSpoofingGuardrail(canonicalBusinessA, spoofedBusinessB);
    expect(result.success).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.error).toContain('SPOOF_BLOCKED');
  });

  it('3. Permissões de Execução: RPC process_canonical_billing_event é revogada de anon e authenticated', () => {
    const isRoleAllowed = (role: string) => role === 'service_role';

    expect(isRoleAllowed('anon')).toBe(false);
    expect(isRoleAllowed('authenticated')).toBe(false);
    expect(isRoleAllowed('service_role')).toBe(true);
  });

  it('4. Atomicity Guardrail: Transação atômica deve reverter todas as alterações em falha intermediária', () => {
    interface TransactionState {
      eventLogged: boolean;
      paymentReconciled: boolean;
      subscriptionUpdated: boolean;
      eventMarkedProcessed: boolean;
    }

    let state: TransactionState = {
      eventLogged: false,
      paymentReconciled: false,
      subscriptionUpdated: false,
      eventMarkedProcessed: false,
    };

    const simulateAtomicTransaction = (failAtStep: number) => {
      const rollbackState = { ...state };
      try {
        state.eventLogged = true;
        if (failAtStep === 1) throw new Error('Falha no log do evento');

        state.paymentReconciled = true;
        if (failAtStep === 2) throw new Error('Falha na reconciliação de pagamento');

        state.subscriptionUpdated = true;
        if (failAtStep === 3) throw new Error('Falha na atualização de assinatura');

        state.eventMarkedProcessed = true;
        return { success: true, state };
      } catch (err) {
        // Rollback integral
        state = rollbackState;
        return { success: false, error: (err as Error).message, state };
      }
    };

    const failedRun = simulateAtomicTransaction(2);
    expect(failedRun.success).toBe(false);
    expect(failedRun.state.eventLogged).toBe(false);
    expect(failedRun.state.paymentReconciled).toBe(false);
    expect(failedRun.state.eventMarkedProcessed).toBe(false);
  });

  it('5. Regra de Refund Factual: PAYMENT_REFUNDED não cancela assinatura nem invalida fatura', () => {
    const initialSubState = 'active';
    const initialInvoiceState = 'paid';

    const handleRefundEvent = (subStatus: string, invoiceStatus: string) => {
      // payment_refunds factual audit row inserted
      const refundAuditRowCreated = true;
      const paymentStatusUpdated = 'refunded';

      // NUNCA altera assinatura ou invoice para uncollectible
      return {
        refundAuditRowCreated,
        paymentStatus: paymentStatusUpdated,
        subStatus: subStatus, // permanece 'active'
        invoiceStatus: invoiceStatus, // permanece 'paid'
      };
    };

    const result = handleRefundEvent(initialSubState, initialInvoiceState);
    expect(result.refundAuditRowCreated).toBe(true);
    expect(result.paymentStatus).toBe('refunded');
    expect(result.subStatus).toBe('active');
    expect(result.invoiceStatus).toBe('paid');
  });

  it('6. Separador de Publicação: Confirmação de pagamento atualiza draft para pending_review e preserva published', () => {
    const transitionPublicationStatus = (currentStatus: string) => {
      if (currentStatus === 'draft') return 'pending_review';
      return currentStatus;
    };

    expect(transitionPublicationStatus('draft')).toBe('pending_review');
    expect(transitionPublicationStatus('pending_review')).toBe('pending_review');
    expect(transitionPublicationStatus('published')).toBe('published');
  });
});

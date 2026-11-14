import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { planProviderReversal } from '@/lib/commercial/provider-reversal-capture';

const src = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', 'src', rel), 'utf8');

const payload = (payment: Record<string, unknown>) => ({ payment: { id: 'pay_123', ...payment } });

describe('planProviderReversal (Asaas → evento financeiro)', () => {
  it('estorno total e chargeback usam chave determinística por pagamento+evento', () => {
    expect(planProviderReversal('PAYMENT_REFUNDED', payload({}))).toEqual({
      kind: 'refund', amountCents: null, cumulative: false, idempotencyKey: 'asaas:pay_123:PAYMENT_REFUNDED',
    });
    expect(planProviderReversal('PAYMENT_CHARGEBACK_REQUESTED', payload({}))).toMatchObject({ kind: 'chargeback', amountCents: null });
    expect(planProviderReversal('PAYMENT_AWAITING_CHARGEBACK_REVERSAL', payload({}))).toMatchObject({ kind: 'chargeback_reversal' });
  });

  it('estorno parcial usa o TOTAL acumulado dos estornos não cancelados, em centavos', () => {
    const plan = planProviderReversal('PAYMENT_PARTIALLY_REFUNDED', payload({
      refunds: [{ value: 100.5, status: 'DONE' }, { value: 49.5, status: 'PENDING' }, { value: 999, status: 'CANCELLED' }],
    }));
    expect(plan).toEqual({ kind: 'refund', amountCents: 15000, cumulative: true, idempotencyKey: 'asaas:pay_123:PARTIAL:15000' });
  });

  it('estorno parcial sem valor legível NÃO vira estorno total', () => {
    expect(planProviderReversal('PAYMENT_PARTIALLY_REFUNDED', payload({}))).toBe('unknown_amount');
    expect(planProviderReversal('PAYMENT_PARTIALLY_REFUNDED', payload({ refunds: [{ value: 'x' }] }))).toBe('unknown_amount');
  });

  it('eventos que não são estorno/chargeback concluído são ignorados', () => {
    for (const ev of ['PAYMENT_REFUND_IN_PROCESSING', 'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_DELETED', 'PAYMENT_OVERDUE', 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']) {
      expect(planProviderReversal(ev, payload({}))).toBeNull();
    }
  });

  it('sem id de pagamento não há o que registrar', () => {
    expect(planProviderReversal('PAYMENT_REFUNDED', {})).toBeNull();
  });
});

describe('contratos de segurança da ponte (estático)', () => {
  const bridge = src('lib/commercial/provider-reversal-capture.ts');
  const webhook = src('app/api/webhooks/asaas/route.ts');

  it('só age com o módulo ligado e nunca lança', () => {
    expect(bridge).toMatch(/isCommercialModuleEnvEnabled\(\)\) return/);
    expect(bridge).toMatch(/catch \(error\)/);
    expect(bridge).toMatch(/Promise\.race/);
  });

  it('não escreve em invoices nem altera status de pagamento', () => {
    expect(bridge).not.toMatch(/from\('invoices'\)\s*\.\s*(update|insert|delete|upsert)/);
    expect(bridge).not.toMatch(/\.update\(/);
  });

  it('o webhook chama a ponte uma única vez, depois dos desvios técnicos/administrativos', () => {
    expect(webhook.match(/captureProviderReversal\(/g)?.length).toBe(1);
    const idx = webhook.indexOf('captureProviderReversal(');
    expect(idx).toBeGreaterThan(webhook.indexOf("eventClassification.category === 'unrecognized'"));
    expect(idx).toBeLessThan(webhook.indexOf('reconcileCommercialPaymentWebhook(payload, eventId)'));
  });
});

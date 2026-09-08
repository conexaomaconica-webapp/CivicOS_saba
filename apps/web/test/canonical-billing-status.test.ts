import { describe, it, expect } from 'vitest';
import { deriveCanonicalBillingStatus } from '../src/lib/payment/canonical-billing-status';

describe('CANONICAL BILLING STATUS — MATRIZ ÚNICA DE STATUS FINANCEIRO', () => {

  it('A. Sem subscription + sem payment/fatura: retorna status não iniciado (nunca ativo/pago)', () => {
    const res = deriveCanonicalBillingStatus({
      hasInvoices: false,
      subscriptionStatus: undefined,
    });

    expect(res.status).toBe('not_started');
    expect(res.label).toBe('Não iniciado');
  });

  it('B. Invoice/pagamento pending: retorna Aguardando confirmação do pagamento', () => {
    const res = deriveCanonicalBillingStatus({
      hasInvoices: true,
      invoiceStatus: 'open',
      paymentStatus: 'pending',
      subscriptionStatus: 'pending',
    });

    expect(res.status).toBe('pending');
    expect(res.label).toBe('Aguardando confirmação do pagamento');
  });

  it('C. Payment paid / invoice paid: retorna Pagamento confirmado', () => {
    const res = deriveCanonicalBillingStatus({
      hasInvoices: true,
      invoiceStatus: 'paid',
      paymentStatus: 'succeeded',
      subscriptionStatus: 'active',
    });

    expect(res.status).toBe('paid');
    expect(res.label).toBe('Pagamento confirmado');
  });

  it('D. Payment failed: retorna Pagamento não aprovado', () => {
    const res = deriveCanonicalBillingStatus({
      hasInvoices: true,
      invoiceStatus: 'failed',
      paymentStatus: 'failed',
      subscriptionStatus: 'pending',
    });

    expect(res.status).toBe('failed');
    expect(res.label).toBe('Pagamento não aprovado');
  });

  it('E. Refunded: retorna Pagamento estornado', () => {
    const res = deriveCanonicalBillingStatus({
      hasInvoices: true,
      invoiceStatus: 'refunded',
      paymentStatus: 'refunded',
    });

    expect(res.status).toBe('refunded');
    expect(res.label).toBe('Pagamento estornado');
  });

  it('F. Subscription active mas payment pending: pagamento continua pending', () => {
    const res = deriveCanonicalBillingStatus({
      hasInvoices: true,
      invoiceStatus: 'open',
      paymentStatus: 'pending',
      subscriptionStatus: 'active',
    });

    expect(res.status).toBe('pending');
    expect(res.label).toBe('Aguardando confirmação do pagamento');
  });

  it('G. Sem pagamento mas contrato assinado: pagamento permanece não confirmado', () => {
    const res = deriveCanonicalBillingStatus({
      hasInvoices: false,
      subscriptionStatus: 'pending',
    });

    expect(res.status).toBe('not_started');
    expect(res.label).toBe('Não iniciado');
  });

  it('H. Conexão com Visibilidade Pública: Payment pending bloqueia elegibilidade comercial', () => {
    const pendingBilling = deriveCanonicalBillingStatus({
      hasInvoices: true,
      invoiceStatus: 'open',
      paymentStatus: 'pending',
    });

    const isFinancialEligible = pendingBilling.status === 'paid';
    expect(pendingBilling.status).toBe('pending');
    expect(isFinancialEligible).toBe(false);
  });

  it('I. Conexão com Visibilidade Pública: Payment succeeded + invoice paid aprova elegibilidade comercial', () => {
    const paidBilling = deriveCanonicalBillingStatus({
      hasInvoices: true,
      invoiceStatus: 'paid',
      paymentStatus: 'succeeded',
    });

    const isFinancialEligible = paidBilling.status === 'paid';
    expect(paidBilling.status).toBe('paid');
    expect(isFinancialEligible).toBe(true);
  });
});

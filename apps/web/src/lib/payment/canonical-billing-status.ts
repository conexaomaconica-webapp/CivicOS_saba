export type CanonicalBillingStatus =
  | 'not_started'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'overdue'
  | 'canceled'
  | 'refunded';

export interface CanonicalBillingStatusResult {
  status: CanonicalBillingStatus;
  label: string;
  badgeClass: string;
}

export function deriveCanonicalBillingStatus(params: {
  invoiceStatus?: string | null;
  paymentStatus?: string | null;
  subscriptionStatus?: string | null;
  hasInvoices?: boolean;
  hasRefunds?: boolean;
}): CanonicalBillingStatusResult {
  const { invoiceStatus, paymentStatus, subscriptionStatus, hasInvoices, hasRefunds } = params;

  // 1. Sem faturas e sem assinatura iniciada -> Not Started
  if (!hasInvoices && (!subscriptionStatus || subscriptionStatus === 'draft' || subscriptionStatus === 'pending' || subscriptionStatus === 'not_started')) {
    return {
      status: 'not_started',
      label: 'Não iniciado',
      badgeClass: 'bg-stone-100 text-stone-600 border-stone-300',
    };
  }

  // 2. Reembolsos / Estornos (Refunds)
  if (hasRefunds || invoiceStatus === 'refunded' || paymentStatus === 'refunded') {
    return {
      status: 'refunded',
      label: 'Pagamento estornado',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    };
  }

  // 3. Pagamento Confirmado / Liquidado (Strict Check: invoices.status = paid OU payments.status = succeeded)
  if (invoiceStatus === 'paid' || paymentStatus === 'succeeded' || paymentStatus === 'paid') {
    return {
      status: 'paid',
      label: 'Pagamento confirmado',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  // 4. Falha / Rejeição de Transação
  if (invoiceStatus === 'failed' || paymentStatus === 'failed') {
    return {
      status: 'failed',
      label: 'Pagamento não aprovado',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
    };
  }

  // 5. Vencimento / Inadimplência
  if (invoiceStatus === 'overdue' || subscriptionStatus === 'past_due') {
    return {
      status: 'overdue',
      label: 'Vencido',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
    };
  }

  // 6. Cancelamento de Fatura / Anulação
  if (invoiceStatus === 'canceled' || invoiceStatus === 'void' || invoiceStatus === 'uncollectible' || subscriptionStatus === 'canceled') {
    return {
      status: 'canceled',
      label: 'Pagamento cancelado',
      badgeClass: 'bg-stone-100 text-stone-600 border-stone-300',
    };
  }

  // 7. Padrão Conservador Segura: Qualquer incerteza cai em "Aguardando confirmação do pagamento" (NUNCA em 'paid' ou 'active')
  return {
    status: 'pending',
    label: 'Aguardando confirmação do pagamento',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  };
}

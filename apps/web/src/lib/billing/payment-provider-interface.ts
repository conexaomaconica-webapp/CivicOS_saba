export interface CustomerInput {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}

export interface CustomerOutput {
  id: string;
  provider: 'asaas' | 'mercadopago' | 'infinitepay' | string;
  name: string;
  email: string;
}

export interface PaymentInput {
  customerId: string;
  value: number; // Valor em BRL (ex: 1.00 para R$ 1,00, 800.00 para R$ 800,00)
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  description: string;
  dueDate?: string;
  externalReference?: string;
  isTechnicalSmokeTest?: boolean;
}

export interface PaymentOutput {
  id: string;
  provider: 'asaas' | 'mercadopago' | 'infinitepay' | string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
  value: number;
  pixQrCodeUrl?: string;
  pixCopiaECola?: string;
  externalReference?: string;
}

export interface PaymentProvider {
  providerName: string;
  createCustomer(input: CustomerInput): Promise<CustomerOutput>;
  createPayment(input: PaymentInput): Promise<PaymentOutput>;
  getPayment(paymentId: string): Promise<PaymentOutput>;
  refundPayment(paymentId: string): Promise<PaymentOutput>;
  processWebhook(headers: Headers, payload: Record<string, unknown>): Promise<{
    processed: boolean;
    providerEventId: string;
    canonicalEvent: string;
  }>;
}

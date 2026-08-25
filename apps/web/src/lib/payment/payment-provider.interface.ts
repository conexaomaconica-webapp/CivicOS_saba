export interface PaymentCustomerData {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}

export interface PaymentChargeData {
  businessId: string;
  customerId?: string;
  planCode: string;
  amountCents: number;
  description: string;
  installmentCount?: number;
  idempotencyKey?: string;
}

export interface CreditCardPayload {
  holderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  cpfCnpj: string;
  postalCode?: string;
}

export interface PixChargeResult {
  success: boolean;
  paymentId: string;
  pixCopiaECola: string;
  qrCodeBase64?: string;
  amountCents: number;
  expirationDate?: string;
  status: string;
  error?: string;
}

export interface CreditCardChargeResult {
  success: boolean;
  paymentId: string;
  status: string;
  amountCents: number;
  installmentCount: number;
  installmentValueCents: number;
  error?: string;
}

export interface IPaymentProvider {
  createCustomer(data: PaymentCustomerData): Promise<{ customerId: string }>;
  createPixCharge(charge: PaymentChargeData, customer: PaymentCustomerData): Promise<PixChargeResult>;
  createCreditCardCharge(
    charge: PaymentChargeData,
    customer: PaymentCustomerData,
    card: CreditCardPayload
  ): Promise<CreditCardChargeResult>;
}

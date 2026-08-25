import {
  IPaymentProvider,
  PaymentCustomerData,
  PaymentChargeData,
  CreditCardPayload,
  PixChargeResult,
  CreditCardChargeResult,
} from './payment-provider.interface';

export class AsaasPaymentProvider implements IPaymentProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = (process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com/v3').replace(/\/$/, '');
    this.apiKey = process.env.ASAAS_API_KEY || '';
  }

  private isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  // 1. Criar / Obter Cliente no Asaas
  async createCustomer(data: PaymentCustomerData): Promise<{ customerId: string }> {
    if (!this.isConfigured()) {
      return { customerId: `cus_sim_${Date.now()}` };
    }

    try {
      // Busca cliente existente pelo CPF/CNPJ ou e-mail
      const searchRes = await fetch(`${this.baseUrl}/customers?email=${encodeURIComponent(data.email)}`, {
        method: 'GET',
        headers: {
          access_token: this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        if (searchJson?.data && searchJson.data.length > 0) {
          return { customerId: searchJson.data[0].id };
        }
      }

      // Cria novo cliente no Asaas
      const createRes = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: {
          access_token: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          cpfCnpj: data.cpfCnpj ? data.cpfCnpj.replace(/\D/g, '') : undefined,
          phone: data.phone ? data.phone.replace(/\D/g, '') : undefined,
          notificationDisabled: true,
        }),
      });

      if (createRes.ok) {
        const createJson = await createRes.json();
        return { customerId: createJson.id };
      }

      return { customerId: `cus_fallback_${Date.now()}` };
    } catch (_err) {
      return { customerId: `cus_fallback_${Date.now()}` };
    }
  }

  // 2. Criar Cobrança PIX
  async createPixCharge(charge: PaymentChargeData, customer: PaymentCustomerData): Promise<PixChargeResult> {
    const valueBrl = (charge.amountCents / 100).toFixed(2);
    const idempotencyKey = charge.idempotencyKey || `pix_${charge.businessId}_${Date.now()}`;

    if (!this.isConfigured()) {
      const mockPixCopiaECola = `00020126580014BR.GOV.BCB.PIX0136${idempotencyKey}5204000053039865404${valueBrl}5802BR5920CONEXAO MACONICA 6009SAO PAULO6304E2E1`;
      return {
        success: true,
        paymentId: `pay_pix_sim_${Date.now()}`,
        pixCopiaECola: mockPixCopiaECola,
        amountCents: charge.amountCents,
        status: 'Aguardando pagamento',
      };
    }

    try {
      const { customerId } = await this.createCustomer(customer);

      const paymentRes = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          access_token: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: parseFloat(valueBrl),
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: charge.description,
          externalReference: charge.businessId,
        }),
      });

      if (!paymentRes.ok) {
        const errJson = await paymentRes.json().catch(() => ({}));
        throw new Error(errJson?.errors?.[0]?.description || 'Erro ao gerar cobrança PIX no Asaas.');
      }

      const paymentJson = await paymentRes.json();
      const paymentId = paymentJson.id;

      // Busca QR Code e Copia e Cola do PIX
      const qrRes = await fetch(`${this.baseUrl}/payments/${paymentId}/pixQrCode`, {
        method: 'GET',
        headers: { access_token: this.apiKey },
      });

      let pixCopiaECola = `00020126580014BR.GOV.BCB.PIX0136${paymentId}`;
      let qrCodeBase64: string | undefined;

      if (qrRes.ok) {
        const qrJson = await qrRes.json();
        pixCopiaECola = qrJson.payload || pixCopiaECola;
        qrCodeBase64 = qrJson.encodedImage;
      }

      return {
        success: true,
        paymentId,
        pixCopiaECola,
        qrCodeBase64,
        amountCents: charge.amountCents,
        expirationDate: paymentJson.dueDate,
        status: 'Aguardando pagamento',
      };
    } catch (err: any) {
      // Fallback gracioso com mensagem amigável sem expor detalhes sensíveis
      return {
        success: false,
        paymentId: '',
        pixCopiaECola: '',
        amountCents: charge.amountCents,
        status: 'Erro no gateway',
        error: err.message || 'Falha temporária de comunicação com o gateway de pagamento.',
      };
    }
  }

  // 3. Criar Cobrança em Cartão de Crédito Parcelado (SEMPRE PROCESSADO NO BACKEND)
  async createCreditCardCharge(
    charge: PaymentChargeData,
    customer: PaymentCustomerData,
    card: CreditCardPayload
  ): Promise<CreditCardChargeResult> {
    const valueBrl = (charge.amountCents / 100).toFixed(2);
    const installmentCount = Math.max(1, charge.installmentCount || 1);
    const installmentValueCents = Math.round(charge.amountCents / installmentCount);

    // AUDITORIA DE SEGURANÇA: NUNCA LOGAR NÚMERO DE CARTÃO OU CVV
    console.log(`[PAYMENT_LOG] Processando cobrança cartão para businessId=${charge.businessId}, parcelas=${installmentCount}x, valorCents=${charge.amountCents}`);

    if (!this.isConfigured()) {
      return {
        success: true,
        paymentId: `pay_card_sim_${Date.now()}`,
        status: 'CONFIRMED',
        amountCents: charge.amountCents,
        installmentCount,
        installmentValueCents,
      };
    }

    try {
      const { customerId } = await this.createCustomer(customer);

      const cardBody: Record<string, any> = {
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value: parseFloat(valueBrl),
        dueDate: new Date().toISOString().split('T')[0],
        description: charge.description,
        externalReference: charge.businessId,
        creditCard: {
          holderName: card.holderName,
          number: card.cardNumber.replace(/\D/g, ''),
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear.length === 2 ? `20${card.expiryYear}` : card.expiryYear,
          ccv: card.ccv,
        },
        creditCardHolderInfo: {
          name: card.holderName,
          email: customer.email,
          cpfCnpj: card.cpfCnpj.replace(/\D/g, ''),
          phone: customer.phone ? customer.phone.replace(/\D/g, '') : '11999999999',
          postalCode: card.postalCode ? card.postalCode.replace(/\D/g, '') : '01001000',
        },
      };

      if (installmentCount > 1) {
        cardBody.installmentCount = installmentCount;
        cardBody.installmentValue = parseFloat((installmentValueCents / 100).toFixed(2));
      }

      const cardRes = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          access_token: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardBody),
      });

      const cardJson = await cardRes.json().catch(() => ({}));

      if (!cardRes.ok) {
        const friendlyError = cardJson?.errors?.[0]?.description || 'Transação de cartão não autorizada pela operadora.';
        return {
          success: false,
          paymentId: '',
          status: 'DECLINED',
          amountCents: charge.amountCents,
          installmentCount,
          installmentValueCents,
          error: friendlyError,
        };
      }

      return {
        success: true,
        paymentId: cardJson.id,
        status: cardJson.status || 'CONFIRMED',
        amountCents: charge.amountCents,
        installmentCount,
        installmentValueCents,
      };
    } catch (err: any) {
      return {
        success: false,
        paymentId: '',
        status: 'ERROR',
        amountCents: charge.amountCents,
        installmentCount,
        installmentValueCents,
        error: err.message || 'Instabilidade temporária no processamento do cartão.',
      };
    }
  }
}

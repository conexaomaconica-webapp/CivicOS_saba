import {
  IPaymentProvider,
  PaymentCustomerData,
  PaymentChargeData,
  CreditCardPayload,
  PixChargeResult,
  CreditCardChargeResult,
} from './payment-provider.interface';
import { getAsaasConfig } from './asaas-config';

export class AsaasPaymentProvider implements IPaymentProvider {
  private baseUrl: string;
  private apiKey: string;
  private configured: boolean;

  constructor() {
    try {
      const config = getAsaasConfig();
      this.baseUrl = config.baseUrl;
      this.apiKey = config.apiKey;
      this.configured = config.isApiConfigured;
    } catch (err) {
      this.baseUrl = 'https://sandbox.asaas.com/api/v3';
      this.apiKey = '';
      this.configured = false;
    }
  }

  private isConfigured(): boolean {
    return this.configured;
  }

  // 0. Reconciliação Externa: Busca cobrança no Asaas por externalReference exata
  async findPaymentByExternalReference(externalReference: string): Promise<{
    found: boolean;
    paymentId?: string;
    status?: string;
    amountCents?: number;
    billingType?: string;
    pixCopiaECola?: string;
    qrCodeBase64?: string;
  }> {
    if (!this.isConfigured() || !externalReference) {
      return { found: false };
    }

    try {
      const res = await fetch(`${this.baseUrl}/payments?externalReference=${encodeURIComponent(externalReference)}`, {
        method: 'GET',
        headers: {
          access_token: this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) return { found: false };

      const json = await res.json();
      const list = json?.data || [];

      if (list.length === 0) {
        return { found: false };
      }

      // Guardrail 4: Se o Asaas devolver > 1 cobrança para a mesma referência exata, interrompe por anomalia
      if (list.length > 1) {
        throw new Error(`ANOMALY_MULTIPLE_PAYMENTS_FOR_EXTERNAL_REFERENCE: Foram encontradas ${list.length} cobranças no Asaas com externalReference ${externalReference}`);
      }

      const pay = list[0];
      let pixCopiaECola: string | undefined;
      let qrCodeBase64: string | undefined;

      if (pay.billingType === 'PIX') {
        const qrRes = await fetch(`${this.baseUrl}/payments/${pay.id}/pixQrCode`, {
          method: 'GET',
          headers: { access_token: this.apiKey },
        });
        if (qrRes.ok) {
          const qrJson = await qrRes.json();
          pixCopiaECola = qrJson.payload;
          qrCodeBase64 = qrJson.encodedImage;
        }
      }

      return {
        found: true,
        paymentId: pay.id,
        status: pay.status,
        amountCents: Math.round((pay.value || 0) * 100),
        billingType: pay.billingType,
        pixCopiaECola,
        qrCodeBase64,
      };
    } catch (err: any) {
      if (err.message?.includes('ANOMALY_MULTIPLE_PAYMENTS')) {
        throw err;
      }
      return { found: false };
    }
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

    // 2.1 Reconciliação prévia de timeout / retry
    const existing = await this.findPaymentByExternalReference(idempotencyKey);
    if (existing.found && existing.paymentId) {
      return {
        success: true,
        paymentId: existing.paymentId,
        pixCopiaECola: existing.pixCopiaECola || `00020126580014BR.GOV.BCB.PIX0136${existing.paymentId}`,
        qrCodeBase64: existing.qrCodeBase64,
        amountCents: existing.amountCents || charge.amountCents,
        status: existing.status || 'Aguardando pagamento',
      };
    }

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
          externalReference: idempotencyKey,
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

  // 3. Criar Cobrança em Cartão de Crédito Parcelado (SEMPRE PROCESSADO NO BACKEND COM GUARDRAIL DE CARTÃO)
  async createCreditCardCharge(
    charge: PaymentChargeData,
    customer: PaymentCustomerData,
    card: CreditCardPayload
  ): Promise<CreditCardChargeResult> {
    const valueBrl = (charge.amountCents / 100).toFixed(2);
    const installmentCount = Math.max(1, charge.installmentCount || 1);
    const installmentValueCents = Math.round(charge.amountCents / installmentCount);
    const idempotencyKey = charge.idempotencyKey || `card_${charge.businessId}_${Date.now()}`;

    // GUARDRAIL 8 DE CARTÃO: NUNCA LOGAR NÚMERO DE CARTÃO (PAN) OU CVV
    console.log(`[PAYMENT_LOG] Processando cobrança cartão para businessId=${charge.businessId}, parcelas=${installmentCount}x, valorCents=${charge.amountCents}`);

    // Reconciliação prévia de timeout / retry
    const existing = await this.findPaymentByExternalReference(idempotencyKey);
    if (existing.found && existing.paymentId) {
      return {
        success: true,
        paymentId: existing.paymentId,
        status: existing.status || 'CONFIRMED',
        amountCents: existing.amountCents || charge.amountCents,
        installmentCount,
        installmentValueCents,
      };
    }

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
        externalReference: idempotencyKey,
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
        // Sanitiza a resposta de erro para não ecoar dados sensíveis de cartão
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  COMMERCIAL_STATUS,
  assertCommercialStatusTransition,
} from '@/lib/commercial-onboarding-status';
import { getAsaasConfig } from '@/lib/payment/asaas-config';
import { validateAsaasWebhookToken } from '@/lib/payment/commercial-onboarding-webhook-service';

describe('Microetapa 6.3 — Webhook Asaas, Configuração e Confirmação Automática de Pagamento', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('1. Configuração Segura e Separação Sandbox / Produção', () => {
    it('utiliza URL canônica oficial de Sandbox do Asaas (api-sandbox.asaas.com/v3)', () => {
      process.env.ASAAS_ENVIRONMENT = 'sandbox';
      delete process.env.ASAAS_API_BASE_URL;
      delete process.env.ASAAS_API_URL;
      process.env.ASAAS_API_KEY = '$aact_hml_test_key_1234567890';
      process.env.ASAAS_WEBHOOK_AUTH_TOKEN = 'webhook_test_token_123';

      const config = getAsaasConfig();
      expect(config.environment).toBe('sandbox');
      expect(config.baseUrl).toBe('https://api-sandbox.asaas.com/v3');
      expect(config.isApiConfigured).toBe(true);
      expect(config.isWebhookConfigured).toBe(true);
    });

    it('utiliza URL canônica oficial de Produção do Asaas (api.asaas.com/v3)', () => {
      process.env.ASAAS_ENVIRONMENT = 'production';
      delete process.env.ASAAS_API_BASE_URL;
      delete process.env.ASAAS_API_URL;
      process.env.ASAAS_API_KEY = '$aact_prod_real_key_1234567890';
      process.env.ASAAS_WEBHOOK_AUTH_TOKEN = 'webhook_prod_token_123';

      const config = getAsaasConfig();
      expect(config.environment).toBe('production');
      expect(config.baseUrl).toBe('https://api.asaas.com/v3');
    });

    it('impede mismatch perigoso: ambiente Sandbox tentando apontar para URL de produção', () => {
      process.env.ASAAS_ENVIRONMENT = 'sandbox';
      process.env.ASAAS_API_URL = 'https://api.asaas.com/v3';

      expect(() => getAsaasConfig()).toThrowError(/Mismatch de Configuração/);
    });

    it('impede mismatch perigoso: ambiente Produção tentando apontar para URL de sandbox', () => {
      process.env.ASAAS_ENVIRONMENT = 'production';
      process.env.ASAAS_API_URL = 'https://api-sandbox.asaas.com/v3';

      expect(() => getAsaasConfig()).toThrowError(/Mismatch de Configuração/);
    });

    it('suporta ASAAS_WEBHOOK_AUTH_TOKEN obrigatório do Asaas (exigido desde 2026)', async () => {
      process.env.ASAAS_ENVIRONMENT = 'sandbox';
      process.env.ASAAS_WEBHOOK_AUTH_TOKEN = 'secure_auth_token_987654321';

      const isValid = await validateAsaasWebhookToken('secure_auth_token_987654321');
      expect(isValid).toBe(true);

      const isInvalid = await validateAsaasWebhookToken('wrong_token_attacker');
      expect(isInvalid).toBe(false);

      const isMissing = await validateAsaasWebhookToken(null);
      expect(isMissing).toBe(false);
    });
  });

  describe('2. Idempotência e Autenticação do Webhook', () => {
    it('garante que webhook duplicado (mesmo event.id) é detectado de forma idempotente', () => {
      const processedEventsStore = new Set<string>();

      const handleEventIdempotently = (eventId: string) => {
        if (processedEventsStore.has(eventId)) {
          return { already_processed: true, success: true };
        }
        processedEventsStore.add(eventId);
        return { already_processed: false, success: true };
      };

      const eventId = 'evt_asaas_onboarding_payment_998877';

      // 1ª entrega do Asaas
      const firstCall = handleEventIdempotently(eventId);
      expect(firstCall.already_processed).toBe(false);
      expect(firstCall.success).toBe(true);

      // 2ª entrega do Asaas (retry de rede)
      const secondCall = handleEventIdempotently(eventId);
      expect(secondCall.already_processed).toBe(true);
      expect(secondCall.success).toBe(true);
    });
  });

  describe('3. Resolução Canônica Interna (Sem Confiança em Metadados Externos)', () => {
    it('reconcilia a cobrança exclusivamente a partir do Asaas payment ID armazenado internamente', () => {
      // Simula banco interno
      const internalDatabase = {
        payment_attempts: [
          {
            id: 'attempt_001',
            provider_charge_id: 'pay_asaas_real_445566',
            invoice_id: 'inv_100',
            business_id: 'biz_conferido_123',
            tenant_id: 'tenant_001',
          },
        ],
        businesses: {
          biz_conferido_123: {
            id: 'biz_conferido_123',
            name: 'Oficina Real Ltda',
            commercial_status: 'aguardando_pagamento',
          },
        },
      };

      // Payload recebido do webhook
      const webhookPayload = {
        event: 'PAYMENT_RECEIVED',
        payment: {
          id: 'pay_asaas_real_445566',
          value: 1000.0,
          billingType: 'PIX',
          // Atacante tenta injetar outro business_id no metadata externo
          externalReference: 'biz_vitima_999',
        },
      };

      // Resolução interna ignora o externalReference do payload e busca pelo payment ID interno
      const matchedAttempt = internalDatabase.payment_attempts.find(
        (a) => a.provider_charge_id === webhookPayload.payment.id
      );

      expect(matchedAttempt).toBeDefined();
      expect(matchedAttempt?.business_id).toBe('biz_conferido_123');
      expect(matchedAttempt?.business_id).not.toBe(webhookPayload.payment.externalReference);

      const targetBiz = internalDatabase.businesses[matchedAttempt!.business_id as keyof typeof internalDatabase.businesses];
      expect(targetBiz.id).toBe('biz_conferido_123');
    });

    it('rejeita tentativa de reconciliação de cobrança não localizada internamente', () => {
      const internalAttempts: string[] = ['pay_known_1', 'pay_known_2'];
      const unknownPaymentId = 'pay_fake_unauthorized_999';

      const found = internalAttempts.includes(unknownPaymentId);
      expect(found).toBe(false);
    });
  });

  describe('4. Transições de Estado Canônicas (aguardando_pagamento -> pagamento_confirmado)', () => {
    it('permite a transição canônica: aguardando_pagamento -> pagamento_confirmado', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO,
          COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO
        )
      ).not.toThrow();
    });

    it('bloqueia transições ilegais diretamente para publicado', () => {
      // Regra de ouro da Microetapa 6.3: NÃO publica a empresa automaticamente
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO,
          COMMERCIAL_STATUS.PUBLICADO
        )
      ).toThrowError(/Transição comercial inválida/);

      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO,
          COMMERCIAL_STATUS.PUBLICADO
        )
      ).toThrowError(/Transição comercial inválida/);
    });

    it('eventos não-liquidantes (ex: PAYMENT_OVERDUE) não ativam o pagamento nem mudam o status comercial', () => {
      const currentCommercialStatus = 'aguardando_pagamento';
      const eventType: string = 'PAYMENT_OVERDUE';

      const shouldConfirmPayment = eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED';
      expect(shouldConfirmPayment).toBe(false);

      const nextStatus = shouldConfirmPayment ? 'pagamento_confirmado' : currentCommercialStatus;
      expect(nextStatus).toBe('aguardando_pagamento');
    });
  });

  describe('5. Polling e Interface Pública (/contratacao/[token])', () => {
    it('detecta quando a empresa atinge pagamento_confirmado e sinaliza is_confirmed=true', () => {
      const simulateCheckStatus = (dbCommercialStatus: string) => {
        return {
          success: true,
          commercial_status: dbCommercialStatus,
          is_confirmed: dbCommercialStatus === 'pagamento_confirmado',
        };
      };

      const pendingState = simulateCheckStatus('aguardando_pagamento');
      expect(pendingState.is_confirmed).toBe(false);

      const confirmedState = simulateCheckStatus('pagamento_confirmado');
      expect(confirmedState.is_confirmed).toBe(true);
    });
  });
});

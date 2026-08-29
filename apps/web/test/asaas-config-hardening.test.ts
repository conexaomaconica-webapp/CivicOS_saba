import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAsaasConfig, getAsaasSanitizedStatus } from '../src/lib/payment/asaas-config';
import { AsaasBillingAdapter } from '../src/lib/billing/billing-adapters';

describe('Asaas Config Hardening & Fail-Closed Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('1. Deve resolver ambiente sandbox para URL canônica sandbox.asaas.com', () => {
    process.env.ASAAS_ENVIRONMENT = 'sandbox';
    delete process.env.ASAAS_API_BASE_URL;

    const config = getAsaasConfig();
    expect(config.environment).toBe('sandbox');
    expect(config.baseUrl).toBe('https://sandbox.asaas.com/api/v3');
  });

  it('2. Deve resolver ambiente production para URL canônica api.asaas.com', () => {
    process.env.ASAAS_ENVIRONMENT = 'production';
    delete process.env.ASAAS_API_BASE_URL;

    const config = getAsaasConfig();
    expect(config.environment).toBe('production');
    expect(config.baseUrl).toBe('https://api.asaas.com/v3');
  });

  it('3. Deve rejeitar ambiente inválido (ex: "staging" ou "invalid") com erro explícito', () => {
    process.env.ASAAS_ENVIRONMENT = 'invalid_env';

    expect(() => getAsaasConfig()).toThrow('[AsaasConfigError] ASAAS_ENVIRONMENT inválido');
  });

  it('4. Deve rejeitar mismatch de environment=sandbox + URL de produção (Fail-Closed)', () => {
    process.env.ASAAS_ENVIRONMENT = 'sandbox';
    process.env.ASAAS_API_BASE_URL = 'https://api.asaas.com/v3';

    expect(() => getAsaasConfig()).toThrow('[AsaasConfigError] Mismatch de Configuração: ASAAS_ENVIRONMENT="sandbox" não pode ser usado com URL de produção');
  });

  it('5. Deve rejeitar mismatch de environment=production + URL de sandbox (Fail-Closed)', () => {
    process.env.ASAAS_ENVIRONMENT = 'production';
    process.env.ASAAS_API_BASE_URL = 'https://sandbox.asaas.com/api/v3';

    expect(() => getAsaasConfig()).toThrow('[AsaasConfigError] Mismatch de Configuração: ASAAS_ENVIRONMENT="production" não pode ser usado com URL de sandbox');
  });

  it('6. Deve indicar isApiConfigured e isWebhookConfigured como false quando ausentes', () => {
    process.env.ASAAS_ENVIRONMENT = 'sandbox';
    delete process.env.ASAAS_API_KEY;
    delete process.env.ASAAS_WEBHOOK_SECRET;

    const config = getAsaasConfig();
    expect(config.isApiConfigured).toBe(false);
    expect(config.isWebhookConfigured).toBe(false);
  });

  it('7. Deve validar webhook signature estritamente contra ASAAS_WEBHOOK_SECRET', () => {
    process.env.ASAAS_ENVIRONMENT = 'sandbox';
    process.env.ASAAS_WEBHOOK_SECRET = 'my_super_secret_webhook_token_123';

    // Header correto
    expect(AsaasBillingAdapter.validateSignature('my_super_secret_webhook_token_123')).toBe(true);

    // Header incorreto
    expect(AsaasBillingAdapter.validateSignature('wrong_token')).toBe(false);

    // Header nulo
    expect(AsaasBillingAdapter.validateSignature(null)).toBe(false);
  });

  it('8. Deve rejeitar webhook se ASAAS_WEBHOOK_SECRET não estiver configurado', () => {
    process.env.ASAAS_ENVIRONMENT = 'sandbox';
    delete process.env.ASAAS_WEBHOOK_SECRET;

    expect(AsaasBillingAdapter.validateSignature('any_token')).toBe(false);
  });

  it('9. getAsaasSanitizedStatus NUNCA deve revelar valores de secrets ou chaves de API', () => {
    process.env.ASAAS_ENVIRONMENT = 'production';
    process.env.ASAAS_API_KEY = '$aact_YTU5YTE0M2M6NDU4OS00N2EzLWEx...';
    process.env.ASAAS_WEBHOOK_SECRET = 'my_secret_token_value_987654321';

    const status = getAsaasSanitizedStatus();
    expect(status).toEqual({
      provider: 'asaas',
      environment: 'production',
      apiConfigured: true,
      webhookConfigured: true,
    });

    const statusJson = JSON.stringify(status);
    expect(statusJson).not.toContain('$aact_');
    expect(statusJson).not.toContain('my_secret_token_value_987654321');
  });
});

export type AsaasEnvironment = 'sandbox' | 'production';

export interface AsaasConfig {
  environment: AsaasEnvironment;
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  webhookAuthToken: string;
  isApiConfigured: boolean;
  isWebhookConfigured: boolean;
}

export interface AsaasSanitizedStatus {
  provider: 'asaas';
  environment: AsaasEnvironment;
  apiConfigured: boolean;
  webhookConfigured: boolean;
}

const CANONICAL_BASE_URLS: Record<AsaasEnvironment, string> = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
};

/**
 * Retorna a configuração validada do Asaas de forma estritamente server-side.
 * Lança exceções explícitas em caso de inconsistência de ambiente/chaves (Fail-Closed).
 */
export function getAsaasConfig(): AsaasConfig {
  if (typeof window !== 'undefined') {
    throw new Error('[AsaasConfigSecurityError] AsaasConfig só pode ser acessado no ambiente server-side.');
  }

  const rawEnv = (process.env.ASAAS_ENVIRONMENT || 'sandbox').trim().toLowerCase();
  
  if (rawEnv !== 'sandbox' && rawEnv !== 'production') {
    throw new Error(`[AsaasConfigError] ASAAS_ENVIRONMENT inválido: "${process.env.ASAAS_ENVIRONMENT}". Deve ser "sandbox" ou "production".`);
  }

  const environment: AsaasEnvironment = rawEnv as AsaasEnvironment;
  const canonicalUrl = CANONICAL_BASE_URLS[environment];

  // Suporte a ASAAS_API_URL ou ASAAS_API_BASE_URL
  const overrideUrl = (process.env.ASAAS_API_URL || process.env.ASAAS_API_BASE_URL)?.trim();
  let baseUrl = canonicalUrl;

  if (overrideUrl) {
    const cleanOverride = overrideUrl.replace(/\/$/, '').toLowerCase();
    
    if (environment === 'sandbox' && cleanOverride.includes('api.asaas.com') && !cleanOverride.includes('sandbox')) {
      throw new Error(`[AsaasConfigError] Mismatch de Configuração: ASAAS_ENVIRONMENT="sandbox" não pode ser usado com URL de produção ("${overrideUrl}").`);
    }
    
    if (environment === 'production' && cleanOverride.includes('sandbox')) {
      throw new Error(`[AsaasConfigError] Mismatch de Configuração: ASAAS_ENVIRONMENT="production" não pode ser usado com URL de sandbox ("${overrideUrl}").`);
    }

    baseUrl = overrideUrl.replace(/\/$/, '');
  }

  const apiKey = (process.env.ASAAS_API_KEY || process.env.ASAAS_ACCESS_TOKEN)?.trim() || '';
  const webhookAuthToken = (process.env.ASAAS_WEBHOOK_AUTH_TOKEN || process.env.ASAAS_WEBHOOK_SECRET)?.trim() || '';

  const isApiConfigured = Boolean(apiKey && apiKey.length > 10);
  const isWebhookConfigured = Boolean(webhookAuthToken && webhookAuthToken.length >= 8);

  return {
    environment,
    baseUrl,
    apiKey,
    webhookSecret: webhookAuthToken,
    webhookAuthToken,
    isApiConfigured,
    isWebhookConfigured,
  };
}

/**
 * Retorna status sanitizado seguro para ser exposto a UIs administrativas ou APIs.
 * NUNCA revela chaves de API ou tokens de webhook.
 */
export function getAsaasSanitizedStatus(): AsaasSanitizedStatus {
  try {
    const config = getAsaasConfig();
    return {
      provider: 'asaas',
      environment: config.environment,
      apiConfigured: config.isApiConfigured,
      webhookConfigured: config.isWebhookConfigured,
    };
  } catch (err) {
    return {
      provider: 'asaas',
      environment: 'sandbox',
      apiConfigured: false,
      webhookConfigured: false,
    };
  }
}

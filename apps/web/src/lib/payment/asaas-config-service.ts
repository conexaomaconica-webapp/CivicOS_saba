'use server';

import crypto from 'node:crypto';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { resolveRequestOperationalTenantId } from '@/lib/tenant/tenant-policy';
import { getAsaasConfig, type AsaasConfig, type AsaasEnvironment } from './asaas-config';
import { revalidatePath } from 'next/cache';
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
} from './asaas-secrets';

const CANONICAL_URLS: Record<AsaasEnvironment, string> = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
};

export interface AsaasEnvironmentDetails {
  environment: AsaasEnvironment;
  apiUrl: string;
  isActive: boolean;
  isEnabled: boolean;
  hasApiKey: boolean;
  maskedApiKey: string;
  hasWebhookToken: boolean;
  maskedWebhookToken: string;
  webhookId: string | null;
  webhookUrl: string;
  lastConnectionTestAt: string | null;
  lastConnectionTestSuccess: boolean | null;
  lastConnectionError: string | null;
}

export interface AsaasIntegrationOverview {
  activeEnvironment: AsaasEnvironment;
  pendingChargesCount: number;
  systemWebhookUrl: string;
  sandbox: AsaasEnvironmentDetails;
  production: AsaasEnvironmentDetails;
}

/**
 * 8.2: Retorna o panorama completo de configurações do Asaas (Sandbox e Produção).
 * Apenas para administradores autenticados.
 */
export async function getAdminAsaasIntegrationOverviewAction(): Promise<{
  success: boolean;
  data?: AsaasIntegrationOverview;
  error?: string;
}> {
  try {
    const { supabase } = await assertPlatformAdminAccess();

    // 1. Obtém o tenant padrão do administrador
    const tenantId = await resolveRequestOperationalTenantId(supabase);

    // 2. Busca registros em payment_provider_settings
    const { data: settingsList, error: settingsErr } = await (supabase as any)
      .from('payment_provider_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas');

    if (settingsErr && settingsErr.code !== '42P01') {
      // Se a tabela não existir ainda ou outro erro
      console.warn('Erro ao carregar payment_provider_settings:', settingsErr.message);
    }

    const settingsMap = new Map<string, any>();
    if (settingsList && Array.isArray(settingsList)) {
      for (const item of settingsList) {
        settingsMap.set(item.environment, item);
      }
    }

    const sandboxRecord = settingsMap.get('sandbox');
    const prodRecord = settingsMap.get('production');

    // Determina o ambiente ativo (prioriza o banco; fallback para process.env)
    let activeEnv: AsaasEnvironment = 'sandbox';
    if (prodRecord?.is_active_environment) {
      activeEnv = 'production';
    } else if (sandboxRecord?.is_active_environment) {
      activeEnv = 'sandbox';
    } else {
      activeEnv = (process.env.ASAAS_ENVIRONMENT as AsaasEnvironment) || 'sandbox';
    }

    // Contagem de faturas pendentes no ambiente ativo para aviso
    let pendingChargesCount = 0;
    try {
      const { count } = await (supabase as any)
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');
      pendingChargesCount = count || 0;
    } catch (_cntErr) {}

    // URL oficial do webhook gerada pelo sistema
    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://conexaomaconica.com.br';
    const cleanAppBase = appBaseUrl.startsWith('http') ? appBaseUrl : `https://${appBaseUrl}`;
    const systemWebhookUrl = `${cleanAppBase.replace(/\/$/, '')}/api/webhooks/asaas`;

    // Processa detalhes do Sandbox
    const sandboxRawKey = sandboxRecord?.encrypted_api_key
      ? decryptSecret(sandboxRecord.encrypted_api_key)
      : activeEnv === 'sandbox'
      ? process.env.ASAAS_API_KEY || ''
      : '';
    const sandboxRawWh = sandboxRecord?.encrypted_webhook_token
      ? decryptSecret(sandboxRecord.encrypted_webhook_token)
      : activeEnv === 'sandbox'
      ? process.env.ASAAS_WEBHOOK_AUTH_TOKEN || ''
      : '';

    const sandboxDetails: AsaasEnvironmentDetails = {
      environment: 'sandbox',
      apiUrl: CANONICAL_URLS.sandbox,
      isActive: activeEnv === 'sandbox',
      isEnabled: sandboxRecord ? Boolean(sandboxRecord.is_enabled) : true,
      hasApiKey: Boolean(sandboxRawKey && sandboxRawKey.length > 10),
      maskedApiKey: maskSecret(sandboxRawKey),
      hasWebhookToken: Boolean(sandboxRawWh && sandboxRawWh.length > 5),
      maskedWebhookToken: maskSecret(sandboxRawWh),
      webhookId: sandboxRecord?.webhook_id || null,
      webhookUrl: sandboxRecord?.webhook_url || systemWebhookUrl,
      lastConnectionTestAt: sandboxRecord?.last_connection_test_at || null,
      lastConnectionTestSuccess: sandboxRecord?.last_connection_test_success ?? null,
      lastConnectionError: sandboxRecord?.last_connection_error || null,
    };

    // Processa detalhes de Produção
    const prodRawKey = prodRecord?.encrypted_api_key
      ? decryptSecret(prodRecord.encrypted_api_key)
      : activeEnv === 'production'
      ? process.env.ASAAS_API_KEY || ''
      : '';
    const prodRawWh = prodRecord?.encrypted_webhook_token
      ? decryptSecret(prodRecord.encrypted_webhook_token)
      : activeEnv === 'production'
      ? process.env.ASAAS_WEBHOOK_AUTH_TOKEN || ''
      : '';

    const prodDetails: AsaasEnvironmentDetails = {
      environment: 'production',
      apiUrl: CANONICAL_URLS.production,
      isActive: activeEnv === 'production',
      isEnabled: prodRecord ? Boolean(prodRecord.is_enabled) : true,
      hasApiKey: Boolean(prodRawKey && prodRawKey.length > 10),
      maskedApiKey: maskSecret(prodRawKey),
      hasWebhookToken: Boolean(prodRawWh && prodRawWh.length > 5),
      maskedWebhookToken: maskSecret(prodRawWh),
      webhookId: prodRecord?.webhook_id || null,
      webhookUrl: prodRecord?.webhook_url || systemWebhookUrl,
      lastConnectionTestAt: prodRecord?.last_connection_test_at || null,
      lastConnectionTestSuccess: prodRecord?.last_connection_test_success ?? null,
      lastConnectionError: prodRecord?.last_connection_error || null,
    };

    return {
      success: true,
      data: {
        activeEnvironment: activeEnv,
        pendingChargesCount,
        systemWebhookUrl,
        sandbox: sandboxDetails,
        production: prodDetails,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro ao carregar configurações de integração do Asaas.',
    };
  }
}

/**
 * 8.3: Salva credenciais (API Key e/ou Webhook Token) para um ambiente específico.
 * Grava criptografado em repouso no banco de dados.
 */
export async function saveAdminAsaasCredentialsAction(payload: {
  environment: AsaasEnvironment;
  apiKey?: string;
  webhookToken?: string;
  webhookUrl?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    const env = payload.environment;
    if (env !== 'sandbox' && env !== 'production') {
      return { success: false, error: 'Ambiente inválido. Deve ser "sandbox" ou "production".' };
    }

    const tenantId = await resolveRequestOperationalTenantId(supabase);

    // 1. Busca registro atual para preservar campos existentes
    const { data: existing } = await (supabase as any)
      .from('payment_provider_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas')
      .eq('environment', env)
      .maybeSingle();

    const updateData: Record<string, any> = {
      tenant_id: tenantId,
      provider: 'asaas',
      environment: env,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (payload.apiKey && payload.apiKey.trim().length > 10) {
      updateData.encrypted_api_key = encryptSecret(payload.apiKey.trim());
    }

    if (payload.webhookToken && payload.webhookToken.trim().length >= 5) {
      updateData.encrypted_webhook_token = encryptSecret(payload.webhookToken.trim());
    }

    if (payload.webhookUrl && payload.webhookUrl.trim().startsWith('http')) {
      updateData.webhook_url = payload.webhookUrl.trim();
    }

    if (!existing) {
      // Se for o primeiro registro do sandbox e nada estiver ativo, marca como ativo
      updateData.is_active_environment = env === 'sandbox';
      updateData.is_enabled = true;
      updateData.created_at = new Date().toISOString();

      const { error: insErr } = await (supabase as any)
        .from('payment_provider_settings')
        .insert(updateData);

      if (insErr) {
        return { success: false, error: `Falha ao salvar configurações: ${insErr.message}` };
      }
    } else {
      const { error: updErr } = await (supabase as any)
        .from('payment_provider_settings')
        .update(updateData)
        .eq('id', existing.id);

      if (updErr) {
        return { success: false, error: `Falha ao atualizar configurações: ${updErr.message}` };
      }
    }

    // Auditoria
    try {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: tenantId,
        actor_id: user.id,
        action: 'UPDATE_ASAAS_CREDENTIALS',
        entity_type: 'payment_provider_settings',
        entity_id: existing?.id || tenantId,
        after_value: {
          environment: env,
          has_api_key: Boolean(payload.apiKey),
          has_webhook_token: Boolean(payload.webhookToken),
        },
        reason: `Credenciais do Asaas atualizadas para o ambiente ${env.toUpperCase()}.`,
      });
    } catch (_auditErr) {}

    revalidatePath('/admin/configuracoes/integracoes/asaas');
    return {
      success: true,
      message: `Credenciais do ambiente ${env.toUpperCase()} salvas e criptografadas com sucesso!`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao salvar credenciais.',
    };
  }
}

/**
 * 8.4: Alterna o ambiente financeiro ativo (Sandbox <-> Produção).
 * Para ativar PRODUÇÃO, exige a palavra de confirmação 'PRODUÇÃO'.
 */
export async function switchAdminAsaasEnvironmentAction(payload: {
  targetEnvironment: AsaasEnvironment;
  confirmationWord?: string;
}): Promise<{
  success: boolean;
  activeEnvironment?: AsaasEnvironment;
  error?: string;
}> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    const target = payload.targetEnvironment;
    if (target !== 'sandbox' && target !== 'production') {
      return { success: false, error: 'Ambiente inválido.' };
    }

    if (target === 'production') {
      const word = payload.confirmationWord?.trim();
      if (word !== 'PRODUÇÃO' && word !== 'PRODUCAO') {
        return {
          success: false,
          error: 'Confirmação incorreta. Digite PRODUÇÃO para ativar cobranças com dinheiro real.',
        };
      }
    }

    const tenantId = await resolveRequestOperationalTenantId(supabase);

    // Garante que ambos os registros existam
    for (const env of ['sandbox', 'production'] as AsaasEnvironment[]) {
      const { data: ex } = await (supabase as any)
        .from('payment_provider_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('provider', 'asaas')
        .eq('environment', env)
        .maybeSingle();

      if (!ex) {
        await (supabase as any).from('payment_provider_settings').insert({
          tenant_id: tenantId,
          provider: 'asaas',
          environment: env,
          is_active_environment: env === target,
          is_enabled: true,
        });
      }
    }

    // Desativa todos do Asaas para esse tenant
    await (supabase as any)
      .from('payment_provider_settings')
      .update({ is_active_environment: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas');

    // Ativa o alvo
    await (supabase as any)
      .from('payment_provider_settings')
      .update({ is_active_environment: true, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas')
      .eq('environment', target);

    // Auditoria
    try {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: tenantId,
        actor_id: user.id,
        action: 'SWITCH_ASAAS_ACTIVE_ENVIRONMENT',
        entity_type: 'payment_provider_settings',
        entity_id: tenantId,
        after_value: { active_environment: target },
        reason: `Ambiente financeiro do Asaas alternado para ${target.toUpperCase()}.`,
      });
    } catch (_auditErr) {}

    revalidatePath('/admin/configuracoes/integracoes/asaas');
    return {
      success: true,
      activeEnvironment: target,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao alternar ambiente do Asaas.',
    };
  }
}

/**
 * 8.5: Testa a conexão ao vivo com a API do Asaas usando a API Key configurada.
 */
export async function testAdminAsaasConnectionAction(
  environment: AsaasEnvironment
): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
  error?: string;
  accountDetails?: {
    name?: string;
    email?: string;
    cnpj?: string;
  };
}> {
  try {
    const { supabase } = await assertPlatformAdminAccess();

    const tenantId = await resolveRequestOperationalTenantId(supabase);

    // 1. Obtém a API Key descriptografada do banco ou fallback de env
    const { data: setting } = await (supabase as any)
      .from('payment_provider_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas')
      .eq('environment', environment)
      .maybeSingle();

    let apiKey = setting?.encrypted_api_key ? decryptSecret(setting.encrypted_api_key) : '';
    if (!apiKey && process.env.ASAAS_ENVIRONMENT === environment) {
      apiKey = process.env.ASAAS_API_KEY || '';
    }

    if (!apiKey) {
      return {
        success: false,
        message: `Nenhuma API Key configurada para o ambiente ${environment.toUpperCase()}.`,
        error: 'Chave não informada.',
      };
    }

    const baseUrl = CANONICAL_URLS[environment];

    // 2. Chama endpoint de diagnóstico simples do Asaas: GET /v3/finance/balance ou GET /v3/myAccount/commercialInfo
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/finance/balance`, {
        method: 'GET',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'ConexaoMaconica-CivicOS/1.0',
        },
        cache: 'no-store',
      });
    } catch (networkErr: any) {
      const errMsg = `Erro de rede ao conectar com ${baseUrl}: ${networkErr?.message || networkErr}`;
      if (setting?.id) {
        await (supabase as any)
          .from('payment_provider_settings')
          .update({
            last_connection_test_at: new Date().toISOString(),
            last_connection_test_success: false,
            last_connection_error: errMsg,
          })
          .eq('id', setting.id);
      }
      return {
        success: false,
        message: 'Não foi possível estabelecer contato com a API do Asaas.',
        error: errMsg,
      };
    }

    const isOk = response.ok;
    const statusCode = response.status;
    let responseJson: any = null;
    try {
      responseJson = await response.json();
    } catch (_jErr) {}

    const nowIso = new Date().toISOString();

    if (isOk) {
      if (setting?.id) {
        await (supabase as any)
          .from('payment_provider_settings')
          .update({
            last_connection_test_at: nowIso,
            last_connection_test_success: true,
            last_connection_error: null,
          })
          .eq('id', setting.id);
      }

      return {
        success: true,
        statusCode,
        message: `✓ Conexão com Asaas ${environment.toUpperCase()} estabelecida com sucesso!`,
        accountDetails: {
          name: responseJson?.name,
          email: responseJson?.email,
        },
      };
    } else {
      const errDetail =
        responseJson?.errors?.[0]?.description ||
        responseJson?.message ||
        `Código de retorno ${statusCode} (Não autorizado ou chave inválida).`;

      if (setting?.id) {
        await (supabase as any)
          .from('payment_provider_settings')
          .update({
            last_connection_test_at: nowIso,
            last_connection_test_success: false,
            last_connection_error: errDetail,
          })
          .eq('id', setting.id);
      }

      return {
        success: false,
        statusCode,
        message: `✕ Falha na autenticação do Asaas ${environment.toUpperCase()}.`,
        error: errDetail,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Erro interno ao testar conexão.',
      error: err?.message || 'Erro inesperado.',
    };
  }
}

/**
 * 8.6: Configuração Automática do Webhook no Asaas via API.
 * Dispara uma chamada autenticada ao Asaas para cadastrar ou atualizar o webhook oficial
 * com a URL gerada e authToken de integridade.
 */
export async function configureAdminAsaasWebhookAction(
  environment: AsaasEnvironment,
  customWebhookUrl?: string
): Promise<{
  success: boolean;
  webhookId?: string;
  webhookUrl?: string;
  authToken?: string;
  error?: string;
}> {
  try {
    const { supabase } = await assertPlatformAdminAccess();

    const tenantId = await resolveRequestOperationalTenantId(supabase);

    const { data: setting } = await (supabase as any)
      .from('payment_provider_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas')
      .eq('environment', environment)
      .maybeSingle();

    let apiKey = setting?.encrypted_api_key ? decryptSecret(setting.encrypted_api_key) : '';
    if (!apiKey && process.env.ASAAS_ENVIRONMENT === environment) {
      apiKey = process.env.ASAAS_API_KEY || '';
    }

    if (!apiKey) {
      return { success: false, error: 'Configure primeiro a API Key antes de criar o webhook.' };
    }

    const baseUrl = CANONICAL_URLS[environment];

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://conexaomaconica.com.br';
    const cleanAppBase = appBaseUrl.startsWith('http') ? appBaseUrl : `https://${appBaseUrl}`;
    const webhookUrl =
      customWebhookUrl?.trim() || `${cleanAppBase.replace(/\/$/, '')}/api/webhooks/asaas`;

    // Deriva ou gera authToken seguro caso não exista
    let authToken = setting?.encrypted_webhook_token
      ? decryptSecret(setting.encrypted_webhook_token)
      : '';
    if (!authToken || authToken.length < 8) {
      authToken = `whsec_${crypto.randomBytes(16).toString('hex')}`;
    }

    // 1. Tenta listar webhooks existentes para saber se cria ou atualiza
    let existingWebhookId: string | null = setting?.webhook_id || null;
    try {
      const listRes = await fetch(`${baseUrl}/webhooks`, {
        method: 'GET',
        headers: { access_token: apiKey, 'Content-Type': 'application/json' },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const found = listData?.data?.find(
          (wh: any) => wh.url?.includes('/api/webhooks/asaas') || wh.id === existingWebhookId
        );
        if (found) {
          existingWebhookId = found.id;
        }
      }
    } catch (_lErr) {}

    const webhookPayload = {
      name: 'Conexão Maçônica - Webhook Oficial',
      url: webhookUrl,
      email: 'notificacoes@conexaomaconica.com.br',
      apiVersion: 3,
      enabled: true,
      interrupted: false,
      authToken: authToken,
      sendType: 'SEQUENTIALLY',
      events: [
        'PAYMENT_CONFIRMED',
        'PAYMENT_RECEIVED',
        'PAYMENT_OVERDUE',
        'PAYMENT_DELETED',
        'PAYMENT_REFUNDED',
      ],
    };

    let apiResponse: Response;
    if (existingWebhookId) {
      // Atualiza
      apiResponse = await fetch(`${baseUrl}/webhooks/${existingWebhookId}`, {
        method: 'POST',
        headers: { access_token: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
    } else {
      // Cria novo
      apiResponse = await fetch(`${baseUrl}/webhooks`, {
        method: 'POST',
        headers: { access_token: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
    }

    const resJson = await apiResponse.json().catch(() => null);

    if (!apiResponse.ok) {
      const errDesc =
        resJson?.errors?.[0]?.description ||
        resJson?.message ||
        `Erro ${apiResponse.status} retornado pelo Asaas ao registrar webhook.`;
      return { success: false, error: errDesc };
    }

    const createdWebhookId = resJson?.id || existingWebhookId || 'wh_registered';
    // Se o Asaas gerou um authToken próprio (quando não aceita envio explícito)
    const returnedAuthToken = resJson?.authToken || authToken;

    // Atualiza no banco
    const encryptedToken = encryptSecret(returnedAuthToken);
    if (setting?.id) {
      await (supabase as any)
        .from('payment_provider_settings')
        .update({
          webhook_id: createdWebhookId,
          webhook_url: webhookUrl,
          encrypted_webhook_token: encryptedToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', setting.id);
    } else {
      await (supabase as any).from('payment_provider_settings').insert({
        tenant_id: tenantId,
        provider: 'asaas',
        environment: environment,
        webhook_id: createdWebhookId,
        webhook_url: webhookUrl,
        encrypted_webhook_token: encryptedToken,
        is_active_environment: environment === 'sandbox',
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    revalidatePath('/admin/configuracoes/integracoes/asaas');

    return {
      success: true,
      webhookId: createdWebhookId,
      webhookUrl,
      authToken: returnedAuthToken,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao registrar webhook no Asaas.',
    };
  }
}

/**
 * 8.7: Resolução Dinâmica de Configuração para os Motores Financeiros.
 *
 * Utilizada por commercial-onboarding-charge-service e webhook reconciler.
 * Consulta o banco de dados para recuperar o ambiente atualmente ativo e suas credenciais.
 * Em caso de ausência ou falha, realiza fallback seguro para process.env.
 */
export async function getAsaasDynamicConfig(
  tenantId?: string
): Promise<AsaasConfig> {
  try {
    // 1. Se estiver no servidor, tenta buscar a configuração do banco
    if (typeof window === 'undefined') {
      let supabase: any = null;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (serviceRoleKey && supabaseUrl) {
        const { createClient } = await import('@supabase/supabase-js');
        supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      } else {
        try {
          const { createServerSideClient } = await import('@/lib/supabase/server');
          supabase = await createServerSideClient();
        } catch (_cookieErr) {
          // Contexto sem cookies (ex: runner de testes ou rotas estáticas)
        }
      }

      if (!supabase) {
        return getAsaasConfig();
      }

      let query = (supabase as any)
        .from('payment_provider_settings')
        .select('*')
        .eq('provider', 'asaas')
        .eq('is_active_environment', true)
        .eq('is_enabled', true);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: activeSetting } = await query.maybeSingle();

      if (activeSetting) {
        const env: AsaasEnvironment = activeSetting.environment;
        const baseUrl = CANONICAL_URLS[env] || CANONICAL_URLS.sandbox;
        const apiKey = activeSetting.encrypted_api_key
          ? decryptSecret(activeSetting.encrypted_api_key)
          : '';
        const webhookToken = activeSetting.encrypted_webhook_token
          ? decryptSecret(activeSetting.encrypted_webhook_token)
          : '';

        if (apiKey && apiKey.length > 10) {
          return {
            environment: env,
            baseUrl,
            apiKey,
            webhookSecret: webhookToken,
            webhookAuthToken: webhookToken,
            isApiConfigured: true,
            isWebhookConfigured: Boolean(webhookToken && webhookToken.length >= 8),
          };
        }
      }
    }
  } catch (dynamicErr) {
    console.warn('Fallback para getAsaasConfig() de ambiente:', dynamicErr);
  }

  // Fallback padrão para as variáveis de ambiente
  return getAsaasConfig();
}

export interface AsaasWebhookDiagnostic {
  environment: AsaasEnvironment;
  configuredInAsaas: boolean;
  webhookId?: string | null;
  name?: string;
  url?: string;
  enabled?: boolean;
  interrupted?: boolean;
  penalizedRequestsCount?: number;
  events?: string[];
  apiVersion?: number;
  hasAuthToken?: boolean;
  rawError?: string;
}

export interface AsaasRecentWebhookEvent {
  id: string;
  created_at: string;
  event_id: string;
  event_type: string;
  processed: boolean;
  processed_at: string | null;
  error_log: string | null;
  payment_id?: string | null;
  status?: string | null;
  value?: number | null;
  customer?: string | null;
}

/**
 * Consulta a situação real da fila do webhook diretamente na API do Asaas.
 */
export async function getAdminAsaasWebhookDiagnosticAction(
  environment: AsaasEnvironment
): Promise<{ success: boolean; data?: AsaasWebhookDiagnostic; error?: string }> {
  try {
    const { supabase } = await assertPlatformAdminAccess();
    const tenantId = await resolveRequestOperationalTenantId(supabase);

    const { data: setting } = await (supabase as any)
      .from('payment_provider_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas')
      .eq('environment', environment)
      .maybeSingle();

    let apiKey = setting?.encrypted_api_key ? decryptSecret(setting.encrypted_api_key) : '';
    if (!apiKey && process.env.ASAAS_ENVIRONMENT === environment) {
      apiKey = process.env.ASAAS_API_KEY || '';
    }

    if (!apiKey) {
      return {
        success: false,
        error: `Nenhuma Chave de API configurada para o ambiente ${environment.toUpperCase()}.`,
      };
    }

    const baseUrl = CANONICAL_URLS[environment];
    const res = await fetch(`${baseUrl}/webhooks`, {
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `Falha na consulta ao Asaas (HTTP ${res.status}): ${errText}`,
      };
    }

    const json = await res.json().catch(() => ({}));
    const list = Array.isArray(json?.data) ? json.data : [];
    const wh = list[0];

    if (!wh) {
      return {
        success: true,
        data: {
          environment,
          configuredInAsaas: false,
        },
      };
    }

    return {
      success: true,
      data: {
        environment,
        configuredInAsaas: true,
        webhookId: wh.id,
        name: wh.name,
        url: wh.url,
        enabled: Boolean(wh.enabled),
        interrupted: Boolean(wh.interrupted),
        penalizedRequestsCount: Number(wh.penalizedRequestsCount || 0),
        events: Array.isArray(wh.events) ? wh.events : [],
        apiVersion: wh.apiVersion,
        hasAuthToken: Boolean(wh.hasAuthToken),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao consultar diagnóstico de webhook.',
    };
  }
}

/**
 * Reativa a fila de envio de webhooks no Asaas (desbloqueia se estiver interrupted).
 */
export async function reactivateAdminAsaasWebhookAction(
  environment: AsaasEnvironment,
  webhookId: string
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const { supabase } = await assertPlatformAdminAccess();
    const tenantId = await resolveRequestOperationalTenantId(supabase);

    const { data: setting } = await (supabase as any)
      .from('payment_provider_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas')
      .eq('environment', environment)
      .maybeSingle();

    let apiKey = setting?.encrypted_api_key ? decryptSecret(setting.encrypted_api_key) : '';
    if (!apiKey && process.env.ASAAS_ENVIRONMENT === environment) {
      apiKey = process.env.ASAAS_API_KEY || '';
    }

    if (!apiKey) {
      return { success: false, error: 'Chave de API não configurada.', message: '' };
    }

    const baseUrl = CANONICAL_URLS[environment];
    const updateRes = await fetch(`${baseUrl}/webhooks/${webhookId}`, {
      method: 'PUT',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        enabled: true,
        interrupted: false,
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text().catch(() => '');
      return {
        success: false,
        message: 'Falha ao reativar webhook no Asaas.',
        error: `Erro HTTP ${updateRes.status}: ${errText}`,
      };
    }

    revalidatePath('/admin/configuracoes/integracoes/asaas');
    return {
      success: true,
      message: 'Fila de webhooks destravada e reativada com sucesso no Asaas!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Erro ao reativar webhook.',
      error: err?.message || 'Erro inesperado.',
    };
  }
}

/**
 * Busca os eventos mais recentes recebidos em payment_provider_events para auditoria em tela.
 */
export async function getAdminAsaasRecentWebhookEventsAction(
  limit: number = 15
): Promise<{ success: boolean; data?: AsaasRecentWebhookEvent[]; error?: string }> {
  try {
    const { supabase } = await assertPlatformAdminAccess();

    const { data: events, error } = await (supabase as any)
      .from('payment_provider_events')
      .select('id, created_at, event_id, event_type, processed, processed_at, error_log, payload')
      .eq('provider_code', 'asaas')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    const formatted: AsaasRecentWebhookEvent[] = (events || []).map((e: any) => ({
      id: e.id,
      created_at: e.created_at,
      event_id: e.event_id,
      event_type: e.event_type || e.payload?.event || 'N/A',
      processed: Boolean(e.processed),
      processed_at: e.processed_at,
      error_log: e.error_log,
      payment_id: e.payload?.payment?.id || null,
      status: e.payload?.payment?.status || null,
      value: e.payload?.payment?.value || null,
      customer: e.payload?.payment?.customer || null,
    }));

    return { success: true, data: formatted };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro ao carregar histórico de eventos.',
    };
  }
}

/**
 * Dispara uma requisição de teste técnico autenticado (Smoke Test) diretamente para
 * a rota interna /api/webhooks/asaas, validando se o token bate e a resposta é 200 OK.
 */
export async function sendAdminAsaasWebhookSmokeTestAction(
  environment: AsaasEnvironment
): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
  eventId?: string;
  error?: string;
}> {
  try {
    const { supabase } = await assertPlatformAdminAccess();
    const tenantId = await resolveRequestOperationalTenantId(supabase);

    const { data: setting } = await (supabase as any)
      .from('payment_provider_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas')
      .eq('environment', environment)
      .maybeSingle();

    let webhookToken = setting?.encrypted_webhook_token
      ? decryptSecret(setting.encrypted_webhook_token)
      : '';
    if (!webhookToken && process.env.ASAAS_ENVIRONMENT === environment) {
      webhookToken = process.env.ASAAS_WEBHOOK_AUTH_TOKEN || process.env.ASAAS_WEBHOOK_SECRET || '';
    }

    if (!webhookToken) {
      return {
        success: false,
        message: 'Token de autenticação do webhook não configurado.',
        error: 'Defina o Token do Webhook antes de executar o teste de autenticação.',
      };
    }

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'http://localhost:3000';
    const cleanAppBase = appBaseUrl.startsWith('http') ? appBaseUrl : `https://${appBaseUrl}`;
    const webhookUrl = `${cleanAppBase.replace(/\/$/, '')}/api/webhooks/asaas`;

    const smokeEventId = `evt_smoke_${Date.now()}`;
    const payload = {
      event: 'TECHNICAL_SMOKE_TEST',
      isTechnicalSmokeTest: true,
      dateCreated: new Date().toISOString(),
      externalReference: `CM_TECHNICAL_SMOKE_${Date.now()}`,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'asaas-access-token': webhookToken,
        'asaas-event-id': smokeEventId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const resJson = await res.json().catch(() => ({}));

    if (res.ok) {
      return {
        success: true,
        statusCode: res.status,
        eventId: smokeEventId,
        message: `Rota /api/webhooks/asaas respondeu HTTP ${res.status} e autenticou com sucesso via asaas-access-token ✓`,
      };
    }

    return {
      success: false,
      statusCode: res.status,
      message: `Rota do webhook retornou HTTP ${res.status}.`,
      error: resJson?.error || `Falha de autenticação ou processamento (HTTP ${res.status}).`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Falha ao conectar com a rota do webhook.',
      error: err?.message || 'Erro inesperado.',
    };
  }
}

/**
 * Cria uma cobrança temporária no Asaas Sandbox e simula a quitação imediata
 * para provocar o envio de um evento real de liquidação pelo Asaas.
 */
export async function simulateAdminAsaasSandboxPaymentAction(): Promise<{
  success: boolean;
  message: string;
  paymentId?: string;
  error?: string;
}> {
  try {
    const { supabase } = await assertPlatformAdminAccess();
    const tenantId = await resolveRequestOperationalTenantId(supabase);

    const { data: setting } = await (supabase as any)
      .from('payment_provider_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'asaas')
      .eq('environment', 'sandbox')
      .maybeSingle();

    let apiKey = setting?.encrypted_api_key ? decryptSecret(setting.encrypted_api_key) : '';
    if (!apiKey) {
      apiKey = process.env.ASAAS_API_KEY || '';
    }

    if (!apiKey) {
      return {
        success: false,
        message: 'Chave de API do Sandbox não configurada.',
        error: 'Configure a API Key do Sandbox primeiro.',
      };
    }

    const baseUrl = CANONICAL_URLS.sandbox;

    // 1. Cria ou reutiliza cliente de teste no Sandbox
    const custRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Teste de Webhook Conexão Maçônica',
        cpfCnpj: '00000000191',
        email: 'teste.webhook@conexaomaconica.com.br',
      }),
    });
    const custJson = await custRes.json().catch(() => ({}));
    const customerId = custJson.id || 'cus_000009430015';

    // 2. Cria cobrança teste no Sandbox
    const chargeRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: 5.0,
        dueDate: new Date().toISOString().split('T')[0],
        description: 'Teste de Webhook — CivicOS SABA / Conexão Maçônica',
        externalReference: `CM_TEST_PROBE_${Date.now()}`,
      }),
    });

    if (!chargeRes.ok) {
      const errText = await chargeRes.text().catch(() => '');
      return {
        success: false,
        message: 'Falha ao criar cobrança de teste no Asaas Sandbox.',
        error: `Erro HTTP ${chargeRes.status}: ${errText}`,
      };
    }

    const chargeJson = await chargeRes.json();
    const paymentId = chargeJson.id;

    // 3. Simula recebimento imediato no Sandbox (receiveInCash)
    const payRes = await fetch(`${baseUrl}/payments/${paymentId}/receiveInCash`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentDate: new Date().toISOString().split('T')[0],
        value: 5.0,
        notifyCustomer: false,
      }),
    });

    if (!payRes.ok) {
      const payErr = await payRes.text().catch(() => '');
      return {
        success: false,
        paymentId,
        message: `Cobrança ${paymentId} criada, mas a simulação de quitação retornou HTTP ${payRes.status}.`,
        error: payErr,
      };
    }

    return {
      success: true,
      paymentId,
      message: `Cobrança de teste ${paymentId} gerada e liquidada no Sandbox! O Asaas enviará o webhook PAYMENT_RECEIVED / PAYMENT_CONFIRMED.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Erro inesperado ao simular pagamento.',
      error: err?.message || 'Erro inesperado.',
    };
  }
}


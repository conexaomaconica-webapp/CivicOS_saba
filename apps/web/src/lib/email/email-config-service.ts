/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { getEmailProvider, brandedEmailHtml } from '@/lib/email/send-email';
import { HostingerMailProvider } from './providers/hostinger-mail-provider';

export interface EmailDispatchRecord {
  id: string;
  recipient_email: string;
  recipient_name: string;
  dispatch_status: 'processing' | 'accepted' | 'failed' | 'unknown';
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface EmailIntegrationOverview {
  activeProvider: string;
  hostinger: {
    isConfigured: boolean;
    baseUrl: string;
    hasToken: boolean;
    maskedToken: string;
    hasMailboxResourceId: boolean;
    mailboxResourceId: string;
    mailFrom: string;
  };
  resend: {
    isConfigured: boolean;
    maskedApiKey: string;
  };
  recentDispatches: EmailDispatchRecord[];
  currentUserEmail: string;
}

function maskSecret(val?: string | null): string {
  if (!val) return 'Não configurado';
  const clean = val.trim();
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
}

/**
 * 1. Obtém o panorama de integração de e-mail e histórico de auditoria.
 */
export async function getAdminEmailIntegrationOverviewAction(): Promise<{
  success: boolean;
  data?: EmailIntegrationOverview;
  error?: string;
}> {
  try {
    const { user } = await assertPlatformAdminAccess();

    const hostingerProvider = new HostingerMailProvider();
    const token = process.env.HOSTINGER_MAIL_API_TOKEN?.trim() || '';
    const mailboxId = process.env.HOSTINGER_MAILBOX_RESOURCE_ID?.trim() || '';
    const baseUrl = process.env.HOSTINGER_MAIL_API_BASE_URL?.trim() || 'https://api.mail.hostinger.com';
    const mailFrom = process.env.HOSTINGER_MAIL_FROM || process.env.MAIL_FROM || 'contato@conexaomaconica.com.br';

    const resendKey = process.env.RESEND_API_KEY?.trim() || '';

    // Consulta os últimos 10 disparos registrados na tabela de auditoria
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    let recentDispatches: EmailDispatchRecord[] = [];

    if (serviceRoleKey && supabaseUrl) {
      try {
        const adminDb = createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data, error } = await (adminDb as any)
          .from('contract_email_dispatches')
          .select('id, recipient_email, recipient_name, dispatch_status, provider, provider_message_id, error_message, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && Array.isArray(data)) {
          recentDispatches = data as EmailDispatchRecord[];
        }
      } catch {
        // Tolerante em ambiente de teste ou conectividade intermitente
      }
    }

    const currentProvider = getEmailProvider();

    const overview: EmailIntegrationOverview = {
      activeProvider: currentProvider.name,
      hostinger: {
        isConfigured: hostingerProvider.isConfigured(),
        baseUrl,
        hasToken: Boolean(token && token.length > 5),
        maskedToken: maskSecret(token),
        hasMailboxResourceId: Boolean(mailboxId && mailboxId.length > 2),
        mailboxResourceId: mailboxId || 'Não informado',
        mailFrom,
      },
      resend: {
        isConfigured: Boolean(resendKey && resendKey.length > 5),
        maskedApiKey: maskSecret(resendKey),
      },
      recentDispatches,
      currentUserEmail: user.email || '',
    };

    return {
      success: true,
      data: overview,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao carregar configurações de e-mail.';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * 2. Testa a conectividade com a API da Hostinger (Health Ping / Autenticação).
 */
export async function testAdminEmailConnectionAction(): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
  latencyMs: number;
  detail?: string;
}> {
  const startTime = Date.now();
  try {
    await assertPlatformAdminAccess();

    const token = process.env.HOSTINGER_MAIL_API_TOKEN?.trim();
    const mailboxResourceId = process.env.HOSTINGER_MAILBOX_RESOURCE_ID?.trim();
    const baseUrl = (process.env.HOSTINGER_MAIL_API_BASE_URL || 'https://api.mail.hostinger.com').replace(/\/+$/, '');

    if (!token || !mailboxResourceId) {
      return {
        success: false,
        message: 'Variáveis HOSTINGER_MAIL_API_TOKEN ou HOSTINGER_MAILBOX_RESOURCE_ID não configuradas no servidor.',
        latencyMs: Date.now() - startTime,
      };
    }

    // Ping no endpoint de caixas postais da Hostinger
    const endpoint = `${baseUrl}/api/v1/mailboxes/${encodeURIComponent(mailboxResourceId)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });

    const latencyMs = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      return {
        success: true,
        message: `Conexão bem-sucedida com a Hostinger Mail API (HTTP ${response.status}). Caixa postal validada.`,
        statusCode: response.status,
        latencyMs,
        detail: responseBody.slice(0, 300),
      };
    }

    // Se o método GET na mailbox retornar 404 ou 405, a API respondeu mas o método pode ser restrito
    if (response.status === 405 || (response.status === 200)) {
      return {
        success: true,
        message: `Hostinger Mail API respondeu e token é reconhecido (HTTP ${response.status}).`,
        statusCode: response.status,
        latencyMs,
        detail: responseBody.slice(0, 300),
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: 'Falha de autenticação: HOSTINGER_MAIL_API_TOKEN inválido ou não autorizado.',
        statusCode: response.status,
        latencyMs,
        detail: responseBody.slice(0, 300),
      };
    }

    return {
      success: false,
      message: `Hostinger Mail API retornou HTTP ${response.status}.`,
      statusCode: response.status,
      latencyMs,
      detail: responseBody.slice(0, 300),
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Falha de rede/timeout ao contatar a Hostinger Mail API: ${msg}`,
      latencyMs,
      detail: msg,
    };
  }
}

/**
 * 3. Envia um e-mail de teste seguro pelo provedor ativo (Hostinger).
 */
export async function sendAdminTestEmailAction(input: {
  recipientEmail: string;
  customSubject?: string;
}): Promise<{
  success: boolean;
  status: 'accepted' | 'failed' | 'unknown' | 'not_configured';
  provider: string;
  providerMessageId?: string;
  latencyMs: number;
  error?: string;
  detail?: string;
}> {
  const startTime = Date.now();
  try {
    const { user } = await assertPlatformAdminAccess();

    const recipient = input.recipientEmail.trim();
    if (!recipient || !recipient.includes('@') || !recipient.includes('.')) {
      return {
        success: false,
        status: 'failed',
        provider: 'hostinger',
        latencyMs: 0,
        error: 'Endereço de e-mail inválido.',
      };
    }

    const provider = getEmailProvider();
    if (!provider.isConfigured()) {
      return {
        success: false,
        status: 'not_configured',
        provider: provider.name,
        latencyMs: 0,
        error: 'O provedor de e-mail não possui credenciais configuradas.',
      };
    }

    const testId = `TEST-${Date.now().toString(36).toUpperCase()}`;
    const timestampStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://conexaomaconica.com.br';

    const subject = input.customSubject?.trim() || `[Teste de Entrega] Conexão Maçônica · Hostinger Mail API (${testId})`;

    const html = brandedEmailHtml({
      brandName: 'Conexão Maçônica · Ambiente de Teste',
      primaryColor: '#5d1523',
      heading: 'Teste de Integração de E-mail Concluído com Sucesso!',
      paragraphs: [
        `Este é um e-mail de diagnóstico enviado a partir do painel de administração da plataforma Conexão Maçônica (CivicOS SABA).`,
        `Identificador do Teste: ${testId}`,
        `Data e Hora do Disparo: ${timestampStr} (Horário de Brasília)`,
        `Solicitante: ${user.email || 'Administrador do Sistema'}`,
        `Provedor de Entrega: ${provider.name.toUpperCase()} (Hostinger Mail API Oficial)`,
        `Se você recebeu esta mensagem na sua caixa de entrada, o canal transacional está 100% calibrado e operacional para disparo de contratos e notificações comerciais.`,
      ],
      buttonLabel: 'Acessar Painel Administrativo',
      buttonUrl: `${siteUrl}/admin/configuracoes/integracoes/email`,
      footnote: `Mensagem de verificação gerada automaticamente pela ferramenta de diagnóstico de integrações.`,
    });

    const text = [
      'CONEXÃO MAÇÔNICA — TESTE DE ENTREGA DE E-MAIL',
      '==================================================',
      `Identificador do Teste: ${testId}`,
      `Data e Hora: ${timestampStr}`,
      `Solicitante: ${user.email || 'Administrador'}`,
      `Provedor: ${provider.name.toUpperCase()}`,
      '',
      'Se você recebeu esta mensagem, a integração está operacional!',
      '',
      `Painel: ${siteUrl}/admin/configuracoes/integracoes/email`,
    ].join('\n');

    const result = await provider.send({
      to: recipient,
      subject,
      html,
      text,
    });

    const latencyMs = Date.now() - startTime;

    return {
      success: result.sent,
      status: result.status,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      latencyMs,
      error: result.error,
      detail: result.detail,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      status: 'unknown',
      provider: 'hostinger',
      latencyMs,
      error: 'Exceção ao disparar e-mail de teste.',
      detail: msg,
    };
  }
}

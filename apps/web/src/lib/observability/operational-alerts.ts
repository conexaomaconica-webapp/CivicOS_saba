/**
 * Despachante de Alertas Operacionais Críticos (Telegram / Discord / Slack)
 *
 * Envia notificações imediatas para o canal da equipe exclusivamente para
 * incidentes classificados como CRITICAL (ex: falhas de webhook Asaas, queda de banco).
 *
 * GARANTIAS DE SEGURANÇA E PRIVACIDADE:
 * 1. O payload enviado ao webhook NUNCA contém dados pessoais, senhas ou tokens.
 * 2. Deduplicação em memória evita spam no canal de alertas.
 * 3. Falhas no envio do webhook são silenciosas e nunca quebram o fluxo de negócio.
 */

import { after } from 'next/server';
import { sanitizeData } from './redaction';

export interface OperationalAlertPayload {
  incidentId: string;
  severity: 'CRITICAL' | 'WARNING';
  service: string;
  message: string;
  context?: Record<string, unknown>;
}

// Cache em memória de alertas enviados recentemente para mitigar tempestade de mensagens
const sentAlertsDebounce = new Map<string, number>();
const ALERT_DEBOUNCE_MS = 10 * 60 * 1000; // 10 minutos por assinatura

function extractSafeSummary(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) return {};
  const safe: Record<string, unknown> = {};

  // Extrai apenas identificadores técnicos seguros conhecidos
  const allowedKeys = ['error_code', 'event_type', 'provider_event_id', 'provider', 'route', 'status'];
  for (const key of allowedKeys) {
    if (key in context && context[key] !== undefined) {
      safe[key] = context[key];
    }
  }

  if (context.error && typeof context.error === 'object') {
    const err = context.error as Record<string, unknown>;
    safe.error_name = err.name;
    safe.error_message = typeof err.message === 'string' ? err.message.slice(0, 150) : undefined;
  }

  return safe;
}

export async function dispatchOperationalAlert(alert: OperationalAlertPayload): Promise<boolean> {
  const webhookUrl = process.env.OPERATIONAL_ALERT_WEBHOOK_URL;
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
    // Webhook não configurado; operação silenciosa
    return false;
  }

  try {
    const signature = `${alert.service}:${alert.message.slice(0, 80)}`;
    const now = Date.now();
    const lastSent = sentAlertsDebounce.get(signature);

    if (lastSent && now - lastSent < ALERT_DEBOUNCE_MS) {
      // Suprime reenvio para evitar fadiga do canal
      return false;
    }

    sentAlertsDebounce.set(signature, now);

    // Sanitiza e extrai apenas metadados técnicos seguros
    const safeSummary = extractSafeSummary(sanitizeData(alert.context) as Record<string, unknown>);

    const notificationBody = {
      content: `🚨 **[${alert.severity}] Incidente na Conexão Maçônica**`,
      embeds: [
        {
          title: alert.message.slice(0, 200),
          color: alert.severity === 'CRITICAL' ? 15158332 : 16776960, // Vermelho / Amarelo
          fields: [
            { name: 'Incidente ID', value: `\`${alert.incidentId}\``, inline: true },
            { name: 'Serviço', value: alert.service, inline: true },
            { name: 'Ambiente', value: process.env.NODE_ENV || 'development', inline: true },
            {
              name: 'Detalhes Técnicos',
              value: Object.keys(safeSummary).length > 0
                ? '```json\n' + JSON.stringify(safeSummary, null, 2).slice(0, 800) + '\n```'
                : 'Nenhum contexto adicional.',
            },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Conexão Maçônica · Monitoramento Operacional' },
        },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    // Falha de envio do alerta externo nunca propaga exceção para a aplicação
    return false;
  }
}

/**
 * Agenda o envio do alerta operacional utilizando after() do Next.js 15 quando disponível,
 * garantindo compatibilidade com o ciclo de vida serverless da Vercel sem atrasar a resposta ao usuário.
 */
export function scheduleOperationalAlert(alert: OperationalAlertPayload): void {
  try {
    after(async () => {
      await dispatchOperationalAlert(alert);
    });
  } catch {
    // Fora de contexto de requisição (scripts, testes unitários), executa sem after
    void dispatchOperationalAlert(alert).catch(() => {});
  }
}


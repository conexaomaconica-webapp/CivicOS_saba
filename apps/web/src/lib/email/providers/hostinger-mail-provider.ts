import type { IEmailProvider, EmailMessage, EmailProviderResult } from './email-provider.interface';

/**
 * Provedor de e-mail transacional via Hostinger Mail API oficial.
 *
 * Endpoint canônico: POST /api/v1/mailboxes/{mailboxResourceId}/send
 * Autenticação: Authorization: Bearer <HOSTINGER_MAIL_API_TOKEN>
 *
 * Tratamento de erros estrito:
 * - 2xx -> 'accepted'
 * - 4xx -> 'failed' (rejeição formal de parâmetros ou autenticação)
 * - 5xx, timeout ou falha de conexão -> 'unknown' (resultado ambíguo em voo)
 */
export class HostingerMailProvider implements IEmailProvider {
  public readonly name = 'hostinger';

  private getBaseUrl(): string {
    const raw = process.env.HOSTINGER_MAIL_API_BASE_URL || 'https://api.mail.hostinger.com';
    return raw.replace(/\/+$/, '');
  }

  private getMailboxResourceId(): string | null {
    return process.env.HOSTINGER_MAILBOX_RESOURCE_ID?.trim() || null;
  }

  private getApiToken(): string | null {
    return process.env.HOSTINGER_MAIL_API_TOKEN?.trim() || null;
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiToken() && this.getMailboxResourceId());
  }

  public async send(message: EmailMessage): Promise<EmailProviderResult> {
    const token = this.getApiToken();
    const mailboxResourceId = this.getMailboxResourceId();

    if (!token || !mailboxResourceId) {
      return {
        sent: false,
        status: 'not_configured',
        provider: this.name,
        error: 'Hostinger Mail API não está configurada (HOSTINGER_MAIL_API_TOKEN ou HOSTINGER_MAILBOX_RESOURCE_ID ausente).',
      };
    }

    const recipients = Array.isArray(message.to)
      ? message.to.map((t) => t.trim()).filter(Boolean)
      : [message.to.trim()].filter(Boolean);

    if (recipients.length === 0) {
      return {
        sent: false,
        status: 'failed',
        provider: this.name,
        error: 'Destinatário de e-mail inválido ou vazio.',
      };
    }

    const endpoint = `${this.getBaseUrl()}/api/v1/mailboxes/${encodeURIComponent(mailboxResourceId)}/send`;

    const payload: Record<string, unknown> = {
      to: recipients,
      subject: message.subject,
      text: message.text,
      html: message.html,
    };

    if (message.replyTo) {
      payload.reply_to = message.replyTo;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const errorText = (await response.text().catch(() => '')).slice(0, 300);

        // Erros de servidor (5xx) representam estado desconhecido: a requisição pode
        // ter sido enfileirada no backend da Hostinger antes da queda da resposta HTTP.
        if (response.status >= 500) {
          return {
            sent: false,
            status: 'unknown',
            provider: this.name,
            error: `Hostinger Mail API instável ou indisponível (HTTP ${response.status}). Estado de entrega desconhecido.`,
            detail: errorText,
          };
        }

        // Erros 4xx são rejeições formais de validação/autenticação
        return {
          sent: false,
          status: 'failed',
          provider: this.name,
          error: `Hostinger Mail API rejeitou o envio (HTTP ${response.status}).`,
          detail: errorText,
        };
      }

      const responseBody = (await response.json().catch(() => ({}))) as {
        id?: string;
        message_id?: string;
        data?: { id?: string; message_id?: string };
      };

      const messageId =
        responseBody.id ||
        responseBody.message_id ||
        responseBody.data?.id ||
        responseBody.data?.message_id ||
        `hostinger-${Date.now()}`;

      return {
        sent: true,
        status: 'accepted',
        provider: this.name,
        providerMessageId: String(messageId),
      };
    } catch (err: unknown) {
      // Timeouts e falhas de conexão TCP/TLS representam estado desconhecido ('unknown')
      const messageStr = err instanceof Error ? err.message : String(err);
      return {
        sent: false,
        status: 'unknown',
        provider: this.name,
        error: 'Timeout ou falha de rede ao contatar a Hostinger Mail API. O envio pode ter sido acolhido.',
        detail: messageStr,
      };
    }
  }
}

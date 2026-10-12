import type { IEmailProvider, EmailMessage, EmailProviderResult } from './email-provider.interface';

/**
 * Provedor de e-mail transacional legado via Resend API HTTP.
 */
export class ResendEmailProvider implements IEmailProvider {
  public readonly name = 'resend';

  private getApiKey(): string | null {
    return process.env.RESEND_API_KEY?.trim() || null;
  }

  private getFrom(): string | null {
    return process.env.MAIL_FROM?.trim() || null;
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiKey() && this.getFrom());
  }

  public async send(message: EmailMessage): Promise<EmailProviderResult> {
    const apiKey = this.getApiKey();
    const defaultFrom = this.getFrom();

    if (!apiKey || !defaultFrom) {
      return {
        sent: false,
        status: 'not_configured',
        provider: this.name,
        error: 'Resend não está configurado (RESEND_API_KEY ou MAIL_FROM ausente).',
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

    const fromAddress = message.from?.trim() || defaultFrom;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipients,
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const errorText = (await response.text().catch(() => '')).slice(0, 300);

        if (response.status >= 500) {
          return {
            sent: false,
            status: 'unknown',
            provider: this.name,
            error: `Resend instável (HTTP ${response.status}). Estado de entrega desconhecido.`,
            detail: errorText,
          };
        }

        return {
          sent: false,
          status: 'failed',
          provider: this.name,
          error: `Resend rejeitou o envio (HTTP ${response.status}).`,
          detail: errorText,
        };
      }

      const body = (await response.json().catch(() => ({}))) as { id?: string };
      return {
        sent: true,
        status: 'accepted',
        provider: this.name,
        providerMessageId: body.id,
      };
    } catch (err: unknown) {
      const messageStr = err instanceof Error ? err.message : String(err);
      return {
        sent: false,
        status: 'unknown',
        provider: this.name,
        error: 'Timeout ou falha de rede ao contatar o Resend. O envio pode ter sido acolhido.',
        detail: messageStr,
      };
    }
  }
}

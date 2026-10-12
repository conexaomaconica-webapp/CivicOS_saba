/**
 * Interface padronizada para provedores de e-mail transacional da plataforma Conexão Maçônica.
 *
 * Estados de entrega canônicos:
 * - 'accepted': Provedor aceitou formalmente a mensagem para envio.
 * - 'failed': Provedor rejeitou a mensagem (ex.: parâmetros inválidos, rejeição 4xx).
 * - 'unknown': Falha de rede, timeout ou erro 5xx em voo. O estado é ambíguo e NUNCA
 *              deve ser repetido automaticamente sem confirmação.
 * - 'not_configured': Chaves ou variáveis necessárias não estão definidas no ambiente.
 */

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

export type EmailProviderDispatchStatus = 'accepted' | 'failed' | 'unknown' | 'not_configured';

export interface EmailProviderResult {
  sent: boolean;
  status: EmailProviderDispatchStatus;
  provider: string;
  providerMessageId?: string;
  error?: string;
  detail?: string;
}

export interface IEmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(message: EmailMessage): Promise<EmailProviderResult>;
}

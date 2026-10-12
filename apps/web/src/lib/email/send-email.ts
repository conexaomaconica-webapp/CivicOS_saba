/**
 * Envio de e-mail transacional desacoplado (somente servidor).
 * Suporta Hostinger Mail API como provedor prioritário e Resend como provedor alternativo/legado.
 *
 * Variáveis de ambiente:
 *   EMAIL_PROVIDER                'hostinger' | 'resend' (opcional, inferido automaticamente)
 *   HOSTINGER_MAIL_API_TOKEN      Chave API da Hostinger Mail API
 *   HOSTINGER_MAILBOX_RESOURCE_ID Resource ID da caixa postal no hPanel
 *   HOSTINGER_MAIL_API_BASE_URL   Opcional (padrão: https://api.mail.hostinger.com)
 *   HOSTINGER_MAIL_FROM           Remetente padrão (opcional)
 *   RESEND_API_KEY                Chave da conta Resend (legado)
 *   MAIL_FROM                     Remetente verificado
 */

import type { IEmailProvider } from './providers/email-provider.interface';
import { HostingerMailProvider } from './providers/hostinger-mail-provider';
import { ResendEmailProvider } from './providers/resend-provider';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendEmailResult =
  | { sent: true; id?: string }
  | { sent: false; reason: 'not_configured' | 'rejected' | 'network'; detail?: string };

export function getEmailProvider(): IEmailProvider {
  const chosen = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();

  if (chosen === 'resend') {
    return new ResendEmailProvider();
  }
  if (chosen === 'hostinger') {
    return new HostingerMailProvider();
  }

  // Auto-detecção: se Hostinger estiver configurado, tem prioridade
  const hostinger = new HostingerMailProvider();
  if (hostinger.isConfigured()) {
    return hostinger;
  }

  const resend = new ResendEmailProvider();
  if (resend.isConfigured()) {
    return resend;
  }

  // Default para Hostinger
  return hostinger;
}

export function isEmailConfigured(): boolean {
  return getEmailProvider().isConfigured();
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = getEmailProvider();
  if (!provider.isConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const result = await provider.send({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (result.sent) {
    return { sent: true, id: result.providerMessageId };
  }

  if (result.status === 'not_configured') {
    return { sent: false, reason: 'not_configured', detail: result.error };
  }

  if (result.status === 'failed') {
    return { sent: false, reason: 'rejected', detail: result.detail || result.error };
  }

  // status === 'unknown'
  return { sent: false, reason: 'network', detail: result.detail || result.error };
}

export interface BrandedEmailSignature {
  name?: string;
  tagline?: string;
  phone?: string;
}

export interface BrandedEmailParams {
  brandName: string;
  primaryColor: string;
  heading: string;
  paragraphs: string[];
  buttonLabel: string;
  buttonUrl: string;
  footnote?: string;
  logoUrl?: string;
  signature?: BrandedEmailSignature;
}

/** Layout simples e legível em qualquer cliente de e-mail (tabela, estilos inline, botão com cor primária). */
export function brandedEmailHtml(params: BrandedEmailParams): string {
  const color = /^#[0-9a-f]{6}$/i.test(params.primaryColor) ? params.primaryColor : '#5d1523';
  const paragraphs = params.paragraphs
    .map((text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">${escapeHtml(text)}</p>`)
    .join('');

  const headerHtml = params.logoUrl
    ? `<tr><td align="center" bgcolor="${color}" style="background-color:${color};background:${color};padding:24px 20px;text-align:center;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${color}" style="background-color:${color};background:${color};border-collapse:collapse;">
          <tr><td align="center" bgcolor="${color}" style="background-color:${color};background:${color};text-align:center;padding:0;">
            <img src="${escapeHtml(params.logoUrl)}" alt="${escapeHtml(params.brandName)}" width="240" height="51" style="width:240px;max-width:260px;height:auto;max-height:56px;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;font-size:18px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;background-color:${color};" />
          </td></tr>
        </table>
      </td></tr>`
    : `<tr><td bgcolor="${color}" style="background-color:${color};background:${color};padding:18px 24px;color:#ffffff;font-size:16px;font-weight:bold">${escapeHtml(params.brandName)}</td></tr>`;

  const signatureHtml = params.signature
    ? `<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e7e5e4;">
        <p style="margin:0;font-size:15px;font-weight:bold;color:${color};">${escapeHtml(params.signature.name || params.brandName)}</p>
        ${params.signature.tagline ? `<p style="margin:4px 0 0;font-size:13px;font-style:italic;color:#78716c;">&ldquo;${escapeHtml(params.signature.tagline)}&rdquo;</p>` : ''}
        ${params.signature.phone ? `<p style="margin:6px 0 0;font-size:13px;color:#44403c;"><strong>Tel:</strong> <a href="tel:${escapeHtml(params.signature.phone.replace(/[^0-9]/g, ''))}" style="color:#44403c;text-decoration:none;">${escapeHtml(params.signature.phone)}</a></p>` : ''}
      </div>`
    : '';

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
${headerHtml}
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:20px;color:${color}">${escapeHtml(params.heading)}</h1>
${paragraphs}
<p style="margin:22px 0"><a href="${escapeHtml(params.buttonUrl)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">${escapeHtml(params.buttonLabel)}</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#78716c;word-break:break-all">Se o botão não abrir, copie este endereço no navegador:<br>${escapeHtml(params.buttonUrl)}</p>
${params.footnote ? `<p style="margin:14px 0 0;font-size:12px;color:#78716c">${escapeHtml(params.footnote)}</p>` : ''}
${signatureHtml}
</td></tr></table></td></tr></table></body></html>`;
}

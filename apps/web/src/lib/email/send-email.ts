/**
 * Envio de e-mail transacional (somente servidor) pela API HTTP do Resend, sem dependência extra.
 *
 * Variáveis de ambiente (servidor):
 *   RESEND_API_KEY  chave da conta Resend
 *   MAIL_FROM       remetente verificado no Resend, ex.: "Conexão Maçônica <contato@seudominio.com.br>"
 *
 * Sem essas variáveis o envio não acontece e devolve { sent: false, reason: 'not_configured' }: quem chama deve mostrar
 * uma alternativa (ex.: copiar o link). Nunca lance erro aqui: e-mail é complemento, não pode derrubar o fluxo.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendEmailResult =
  | { sent: true; id?: string }
  | { sent: false; reason: 'not_configured' | 'rejected' | 'network'; detail?: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: 'not_configured' };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 200);
      return { sent: false, reason: 'rejected', detail: `HTTP ${response.status} ${detail}` };
    }
    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: body.id };
  } catch (error) {
    return { sent: false, reason: 'network', detail: error instanceof Error ? error.message : String(error) };
  }
}

/** Layout simples e legível em qualquer cliente de e-mail (tabela, estilos inline, botão com cor primária). */
export function brandedEmailHtml(params: {
  brandName: string;
  primaryColor: string;
  heading: string;
  paragraphs: string[];
  buttonLabel: string;
  buttonUrl: string;
  footnote?: string;
}): string {
  const color = /^#[0-9a-f]{6}$/i.test(params.primaryColor) ? params.primaryColor : '#5d1523';
  const paragraphs = params.paragraphs
    .map((text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#292524">${escapeHtml(text)}</p>`)
    .join('');
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
<tr><td style="background:${color};padding:18px 24px;color:#ffffff;font-size:16px;font-weight:bold">${escapeHtml(params.brandName)}</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:20px;color:${color}">${escapeHtml(params.heading)}</h1>
${paragraphs}
<p style="margin:22px 0"><a href="${escapeHtml(params.buttonUrl)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">${escapeHtml(params.buttonLabel)}</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#78716c;word-break:break-all">Se o botão não abrir, copie este endereço no navegador:<br>${escapeHtml(params.buttonUrl)}</p>
${params.footnote ? `<p style="margin:14px 0 0;font-size:12px;color:#78716c">${escapeHtml(params.footnote)}</p>` : ''}
</td></tr></table></td></tr></table></body></html>`;
}

import { getAccountAdminClient } from '@/lib/auth/account-temp-password-admin';
import { brandedEmailHtml, sendEmail } from '@/lib/email/send-email';
import { appUrl } from '@/lib/seo/app-url';

/**
 * Recuperação de senha com e-mail PRÓPRIO da plataforma (identidade da marca, enviado pela integração de e-mail).
 *
 * Fluxo: o servidor pede ao Supabase um token de recuperação SEM que o Supabase envie e-mail (`auth.admin.generateLink`), monta o link
 * e envia pelo provedor de e-mail da plataforma. O link abre `/auth/redefinir` (uma página com botão, para leitores automáticos de
 * e-mail não gastarem o token) e depois `/auth/confirm`, que valida o token NO SERVIDOR (não depende do navegador de origem).
 */

export type RecoveryEmailResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_email' | 'not_configured' | 'no_account' | 'link_failed' | 'send_failed' };

const BRAND_NAME = 'Conexão Maçônica';

export function normalizeRecoveryEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** Endereço da página intermediária (o botão dela leva ao /auth/confirm). Só o token, nunca o e-mail. */
export function buildRecoveryLink(tokenHash: string, origin: string = appUrl('')): string {
  return `${origin.replace(/\/+$/, '')}/auth/redefinir?token_hash=${encodeURIComponent(tokenHash)}`;
}

export function buildRecoveryEmail(link: string, origin: string = appUrl('')): { subject: string; html: string; text: string } {
  const base = origin.replace(/\/+$/, '');
  const subject = `Crie uma nova senha | ${BRAND_NAME}`;
  const html = brandedEmailHtml({
    brandName: BRAND_NAME,
    logoUrl: `${base}/logoconexao_red_vert.png`,
    primaryColor: '#5d1523',
    heading: 'Crie uma nova senha',
    paragraphs: [
      'Recebemos um pedido para redefinir a senha da sua conta na Conexão Maçônica.',
      'Use o botão abaixo para criar uma nova senha. O link é pessoal e tem validade curta.',
    ],
    buttonLabel: 'Criar nova senha',
    buttonUrl: link,
    footnote: 'Se você não fez este pedido, ignore este e-mail: sua senha continua a mesma.',
    signature: { name: BRAND_NAME, tagline: 'Tradição que une! Conexão que fortalece!', phone: '75 981524838' },
  });
  const text = [
    'Recebemos um pedido para redefinir a senha da sua conta na Conexão Maçônica.',
    '',
    'Para criar uma nova senha, acesse o link abaixo (pessoal e com validade curta):',
    link,
    '',
    'Se você não fez este pedido, ignore este e-mail: sua senha continua a mesma.',
    '',
    BRAND_NAME,
  ].join('\n');
  return { subject, html, text };
}

/**
 * Gera o token e envia o e-mail de recuperação. NUNCA devolve o token nem o link a quem chamou.
 * `no_account` = não existe conta com esse e-mail (quem chama pelo formulário público deve responder igual, sem revelar).
 */
export async function sendPasswordRecoveryEmail(rawEmail: unknown, options: { origin?: string } = {}): Promise<RecoveryEmailResult> {
  const email = normalizeRecoveryEmail(rawEmail);
  if (!email) return { ok: false, reason: 'invalid_email' };

  const admin = getAccountAdminClient();
  if (!admin) return { ok: false, reason: 'not_configured' };

  let tokenHash: string | undefined;
  try {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
    if (error) {
      const message = `${error.message ?? ''}`.toLowerCase();
      const notFound = (error as { status?: number }).status === 404 || message.includes('not found') || message.includes('no user');
      return { ok: false, reason: notFound ? 'no_account' : 'link_failed' };
    }
    tokenHash = data?.properties?.hashed_token;
  } catch {
    return { ok: false, reason: 'link_failed' };
  }
  if (!tokenHash) return { ok: false, reason: 'link_failed' };

  const origin = options.origin ?? appUrl('');
  const mail = buildRecoveryEmail(buildRecoveryLink(tokenHash, origin), origin);
  const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });
  if (sent.sent) return { ok: true };
  if (sent.reason === 'not_configured') return { ok: false, reason: 'not_configured' };
  console.error('[password-recovery] falha ao enviar e-mail', sent.reason);
  return { ok: false, reason: 'send_failed' };
}

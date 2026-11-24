import { getAccountAdminClient } from '@/lib/auth/account-temp-password-admin';
import { brandedEmailHtml, sendEmail } from '@/lib/email/send-email';
import { appUrl } from '@/lib/seo/app-url';

const BRAND_NAME = 'Conexão Maçônica';

export type SignupConfirmationEmailResult =
  | { ok: true; userId?: string }
  | { ok: false; reason: 'invalid_email' | 'not_configured' | 'already_exists' | 'link_failed' | 'send_failed'; errorMessage?: string; userId?: string };

export function buildSignupConfirmLink(tokenHash: string, origin: string = appUrl('')): string {
  return `${origin.replace(/\/+$/, '')}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=signup&next=${encodeURIComponent('/login')}`;
}

export function buildSignupConfirmationEmail(
  link: string,
  origin: string = appUrl(''),
): { subject: string; html: string; text: string } {
  const base = origin.replace(/\/+$/, '');
  const subject = `Confirme seu cadastro | ${BRAND_NAME}`;
  const html = brandedEmailHtml({
    brandName: BRAND_NAME,
    logoUrl: `${base}/logoconexao_red_vert.png`,
    primaryColor: '#5d1523',
    heading: 'Confirme sua inscrição',
    paragraphs: [
      'Seja bem-vindo(a) à Conexão Maçônica! Recebemos o seu cadastro na plataforma.',
      'Para ativar sua conta e confirmar seu endereço de e-mail, clique no botão abaixo.',
    ],
    buttonLabel: 'Confirmar meu cadastro',
    buttonUrl: link,
    footnote: 'Se você não realizou este cadastro, ignore este e-mail com segurança.',
    signature: { name: BRAND_NAME, tagline: 'Tradição que une! Conexão que fortalece!', phone: '75 981524838' },
  });
  const text = [
    'Seja bem-vindo(a) à Conexão Maçônica! Recebemos o seu cadastro na plataforma.',
    '',
    'Para ativar sua conta e confirmar seu e-mail, acesse o link abaixo:',
    link,
    '',
    'Se você não realizou este cadastro, ignore este e-mail com segurança.',
    '',
    BRAND_NAME,
  ].join('\n');
  return { subject, html, text };
}

/**
 * Cria a conta via Admin generateLink('signup') para que o Supabase NÃO dispare o e-mail padrão,
 * e envia a confirmação com a identidade visual da Conexão Maçônica via provedor próprio.
 */
export async function sendSignupConfirmationEmail(
  rawEmail: unknown,
  password: string,
  metadata: Record<string, unknown>,
  options: { origin?: string } = {},
): Promise<SignupConfirmationEmailResult> {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: 'invalid_email' };
  }

  const admin = getAccountAdminClient();
  if (!admin) return { ok: false, reason: 'not_configured' };

  let tokenHash: string | undefined;
  let userId: string | undefined;
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { data: metadata },
    });
    if (error) {
      const msgLower = `${error.message ?? ''}`.toLowerCase();
      if (msgLower.includes('already') || msgLower.includes('exists') || msgLower.includes('registered')) {
        return { ok: false, reason: 'already_exists', errorMessage: error.message };
      }
      return { ok: false, reason: 'link_failed', errorMessage: error.message };
    }
    tokenHash = data?.properties?.hashed_token;
    userId = data?.user?.id;
  } catch {
    return { ok: false, reason: 'link_failed' };
  }

  if (!tokenHash) return { ok: false, reason: 'link_failed' };

  const origin = options.origin ?? appUrl('');
  const mail = buildSignupConfirmationEmail(buildSignupConfirmLink(tokenHash, origin), origin);
  const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });
  if (sent.sent) return { ok: true, userId };
  if (sent.reason === 'not_configured') return { ok: false, reason: 'not_configured', userId };
  return { ok: false, reason: 'send_failed', userId };
}


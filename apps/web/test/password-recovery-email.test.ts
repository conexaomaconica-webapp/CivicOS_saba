import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateLink = vi.fn();
const sendEmailMock = vi.fn();
let adminAvailable = true;

vi.mock('@/lib/auth/account-temp-password-admin', () => ({
  getAccountAdminClient: () => (adminAvailable ? { auth: { admin: { generateLink: (...a: any[]) => generateLink(...a) } } } : null),
}));
vi.mock('@/lib/email/send-email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email/send-email')>('@/lib/email/send-email');
  return { ...actual, sendEmail: (...a: any[]) => sendEmailMock(...a) };
});

import { buildRecoveryEmail, buildRecoveryLink, normalizeRecoveryEmail, sendPasswordRecoveryEmail } from '../src/lib/auth/password-recovery-email';

const ORIGIN = 'https://www.conexaomaconica.com.br';
const HASH = 'abc123DEF_456-ghi789';

beforeEach(() => {
  adminAvailable = true;
  generateLink.mockReset().mockResolvedValue({ data: { properties: { hashed_token: HASH } }, error: null });
  sendEmailMock.mockReset().mockResolvedValue({ sent: true });
});

describe('e-mail de recuperação próprio', () => {
  it('normaliza e valida o e-mail', () => {
    expect(normalizeRecoveryEmail('  Dono@Optica.com.br ')).toBe('dono@optica.com.br');
    for (const bad of ['', 'sem-arroba', 'a@b', 42, null, 'x'.repeat(260) + '@a.com']) expect(normalizeRecoveryEmail(bad)).toBeNull();
  });

  it('o link leva à página intermediária, só com o token (nunca o e-mail)', () => {
    const link = buildRecoveryLink(HASH, ORIGIN);
    expect(link).toBe(`${ORIGIN}/auth/redefinir?token_hash=${HASH}`);
    expect(link).not.toMatch(/@|type=|next=/);
  });

  it('o e-mail tem a marca, o botão e o link, em HTML e texto', () => {
    const link = buildRecoveryLink(HASH, ORIGIN);
    const mail = buildRecoveryEmail(link, ORIGIN);
    expect(mail.subject).toMatch(/Conexão Maçônica/);
    expect(mail.html).toContain(link.replace(/&/g, '&amp;'));
    expect(mail.html).toContain('Criar nova senha');
    expect(mail.html).toContain('logoconexao_red_vert.png');
    expect(mail.text).toContain(link);
  });

  it('gera o token sem o Supabase enviar e-mail e envia pela plataforma', async () => {
    const r = await sendPasswordRecoveryEmail('Dono@Optica.com.br', { origin: ORIGIN });
    expect(r).toEqual({ ok: true });
    expect(generateLink).toHaveBeenCalledWith({ type: 'recovery', email: 'dono@optica.com.br' });
    const sent = sendEmailMock.mock.calls[0]![0];
    expect(sent.to).toBe('dono@optica.com.br');
    expect(sent.html).toContain(`${ORIGIN}/auth/redefinir?token_hash=${HASH}`);
  });

  it('conta inexistente: não envia nada e devolve no_account', async () => {
    generateLink.mockResolvedValue({ data: null, error: { message: 'User not found', status: 404 } });
    expect(await sendPasswordRecoveryEmail('ninguem@x.com')).toEqual({ ok: false, reason: 'no_account' });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('falhas: e-mail inválido, sem chave de serviço, erro ao gerar, envio rejeitado ou não configurado', async () => {
    expect(await sendPasswordRecoveryEmail('x')).toEqual({ ok: false, reason: 'invalid_email' });

    adminAvailable = false;
    expect(await sendPasswordRecoveryEmail('a@b.com')).toEqual({ ok: false, reason: 'not_configured' });
    adminAvailable = true;

    generateLink.mockResolvedValue({ data: null, error: { message: 'boom', status: 500 } });
    expect(await sendPasswordRecoveryEmail('a@b.com')).toEqual({ ok: false, reason: 'link_failed' });

    generateLink.mockResolvedValue({ data: { properties: {} }, error: null });
    expect(await sendPasswordRecoveryEmail('a@b.com')).toEqual({ ok: false, reason: 'link_failed' });

    generateLink.mockResolvedValue({ data: { properties: { hashed_token: HASH } }, error: null });
    sendEmailMock.mockResolvedValue({ sent: false, reason: 'rejected' });
    expect(await sendPasswordRecoveryEmail('a@b.com')).toEqual({ ok: false, reason: 'send_failed' });
    sendEmailMock.mockResolvedValue({ sent: false, reason: 'not_configured' });
    expect(await sendPasswordRecoveryEmail('a@b.com')).toEqual({ ok: false, reason: 'not_configured' });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const FUTURE = () => new Date(Date.now() + 3_600_000).toISOString();
const PAST = () => new Date(Date.now() - 3_600_000).toISOString();

let sessionUser: any = null;
const signInWithPassword = vi.fn();
const updateUserById = vi.fn();
const getUserById = vi.fn();
const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSideClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }), verifyOtp, exchangeCodeForSession } }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, key: string) =>
    key === 'anon-key'
      ? { auth: { signInWithPassword } }
      : { auth: { admin: { updateUserById, getUserById } } },
}));

import { changeAccountTemporaryPasswordAction } from '../src/lib/auth/account-temp-password-service';
import { GET as confirm } from '../src/app/auth/confirm/route';
import { GET as callback } from '../src/app/auth/callback/route';

const pendingUser = (extra: Record<string, unknown> = {}) => ({
  id: 'u1', email: 'maria@x.com',
  app_metadata: { provider: 'email', account_must_change_password: true, account_temp_password_expires_at: FUTURE(), ...extra },
});
const input = (o: Record<string, string> = {}) => ({ currentPassword: 'TempSenha#2026', newPassword: 'NovaSenha2026', confirmPassword: 'NovaSenha2026', ...o });

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://exemplo.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  sessionUser = pendingUser();
  signInWithPassword.mockReset().mockResolvedValue({ error: null });
  updateUserById.mockReset().mockResolvedValue({ error: null });
  getUserById.mockReset().mockResolvedValue({ data: { user: pendingUser() } });
  verifyOtp.mockReset();
  exchangeCodeForSession.mockReset();
});

describe('troca obrigatória da senha temporária (pela própria pessoa)', () => {
  it('sucesso: confirma a senha temporária, troca a senha e limpa o marcador preservando o restante do app_metadata', async () => {
    const r = await changeAccountTemporaryPasswordAction(input());
    expect(r).toEqual({ success: true });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'maria@x.com', password: 'TempSenha#2026' });
    expect(updateUserById.mock.calls[0]).toEqual(['u1', { password: 'NovaSenha2026' }]);
    const cleared = updateUserById.mock.calls[1]![1].app_metadata;
    expect(cleared.account_must_change_password).toBe(false);
    expect(cleared.account_temp_password_expires_at).toBeNull();
    expect(cleared.provider).toBe('email');
  });

  it('sem sessão, sem troca pendente ou com senha temporária vencida: recusa sem tocar na senha', async () => {
    sessionUser = null;
    expect((await changeAccountTemporaryPasswordAction(input())).success).toBe(false);
    sessionUser = { id: 'u1', email: 'm@x.com', app_metadata: {} };
    expect((await changeAccountTemporaryPasswordAction(input())).success).toBe(false);
    sessionUser = pendingUser({ account_temp_password_expires_at: PAST() });
    expect((await changeAccountTemporaryPasswordAction(input())).success).toBe(false);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('senha temporária errada: recusa (a sessão sozinha não basta)', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const r = await changeAccountTemporaryPasswordAction(input({ currentPassword: 'errada' }));
    expect(r.success).toBe(false);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('nova senha fraca, igual à temporária ou sem confirmação igual: recusa antes de consultar o Auth', async () => {
    for (const bad of [input({ newPassword: 'curta1', confirmPassword: 'curta1' }), input({ newPassword: 'somenteletras', confirmPassword: 'somenteletras' }),
      input({ newPassword: 'TempSenha#2026', confirmPassword: 'TempSenha#2026' }), input({ confirmPassword: 'Diferente2026' })]) {
      expect((await changeAccountTemporaryPasswordAction(bad)).success).toBe(false);
    }
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('as senhas não aparecem nas respostas de erro', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'x' } });
    const r = await changeAccountTemporaryPasswordAction(input());
    expect(JSON.stringify(r)).not.toMatch(/TempSenha|NovaSenha/);
  });
});

describe('recuperação de senha dispensa a troca obrigatória pendente (prova o controle do e-mail)', () => {
  const call = (route: typeof confirm, path: string) => route(new NextRequest(`https://www.conexaomaconica.com.br${path}`));

  it('/auth/confirm com recuperação válida de conta com troca pendente: limpa o marcador', async () => {
    verifyOtp.mockResolvedValue({ data: { user: pendingUser() }, error: null });
    getUserById.mockResolvedValue({ data: { user: pendingUser() } });
    await call(confirm, '/auth/confirm?token_hash=abc&type=recovery');
    expect(updateUserById).toHaveBeenCalledTimes(1);
    expect(updateUserById.mock.calls[0]![1].app_metadata.account_must_change_password).toBe(false);
  });

  it('conta sem troca pendente, ou outro tipo de link: não mexe no Auth', async () => {
    verifyOtp.mockResolvedValue({ data: { user: { id: 'u1', app_metadata: {} } }, error: null });
    await call(confirm, '/auth/confirm?token_hash=abc&type=recovery');
    verifyOtp.mockResolvedValue({ data: { user: pendingUser() }, error: null });
    await call(confirm, '/auth/confirm?token_hash=abc&type=magiclink');
    await call(confirm, '/auth/confirm?token_hash=abc&type=signup');
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('token inválido: não limpa nada', async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } });
    await call(confirm, '/auth/confirm?token_hash=abc&type=recovery');
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('/auth/callback (code) que termina em /update-password também limpa; outros destinos não', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user: pendingUser() }, error: null });
    getUserById.mockResolvedValue({ data: { user: pendingUser() } });
    await call(callback, '/auth/callback?code=xyz&next=/update-password');
    expect(updateUserById).toHaveBeenCalledTimes(1);
    updateUserById.mockClear();
    await call(callback, '/auth/callback?code=xyz&next=/dashboard');
    expect(updateUserById).not.toHaveBeenCalled();
  });
});

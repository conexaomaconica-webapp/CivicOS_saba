import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSideClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));

import { GET as confirm } from '../src/app/auth/confirm/route';
import { GET as callback } from '../src/app/auth/callback/route';

const BASE = 'https://www.conexaomaconica.com.br';
const call = (route: typeof confirm, path: string) => route(new NextRequest(`${BASE}${path}`));
const location = (res: Response) => {
  const url = new URL(res.headers.get('location') ?? '');
  return `${url.origin === BASE ? '' : url.origin}${url.pathname}${url.search}`;
};

beforeEach(() => {
  verifyOtp.mockReset();
  exchangeCodeForSession.mockReset();
});

describe('/auth/confirm (link do e-mail por token_hash, no servidor)', () => {
  it('recuperação válida: confirma o token e leva à tela de nova senha', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const res = await call(confirm, '/auth/confirm?token_hash=abc123&type=recovery&next=/update-password');
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc123' });
    expect(location(res)).toBe('/update-password');
  });

  it('recuperação sempre termina em /update-password, mesmo que o link peça outro destino', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    expect(location(await call(confirm, '/auth/confirm?token_hash=abc&type=recovery&next=/admin'))).toBe('/update-password');
    expect(location(await call(confirm, '/auth/confirm?token_hash=abc&type=invite&next=/admin'))).toBe('/update-password');
  });

  it('token expirado ou já usado: volta para "Esqueci a senha" com aviso (não cai no login em silêncio)', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'Token has expired or is invalid' } });
    expect(location(await call(confirm, '/auth/confirm?token_hash=velho&type=recovery'))).toBe('/forgot-password?erro=link_invalido');
  });

  it('falha em outros tipos volta ao login com aviso', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'invalid' } });
    expect(location(await call(confirm, '/auth/confirm?token_hash=x&type=signup'))).toBe('/login?error=link_invalido');
  });

  it('parâmetros ausentes ou tipo inválido não chamam o Supabase', async () => {
    expect(location(await call(confirm, '/auth/confirm?type=recovery'))).toBe('/forgot-password?erro=link_invalido');
    expect(location(await call(confirm, '/auth/confirm?token_hash=abc'))).toBe('/login?error=link_invalido');
    expect(location(await call(confirm, '/auth/confirm?token_hash=abc&type=admin'))).toBe('/login?error=link_invalido');
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('exceção no servidor também cai na mensagem, sem vazar detalhes', async () => {
    verifyOtp.mockRejectedValue(new Error('banco indisponível'));
    expect(location(await call(confirm, '/auth/confirm?token_hash=abc&type=recovery'))).toBe('/forgot-password?erro=link_invalido');
  });

  it('login por link de acesso respeita um destino interno, mas ignora endereço externo (sem redirecionamento aberto)', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    expect(location(await call(confirm, '/auth/confirm?token_hash=abc&type=magiclink&next=/minha-conta'))).toBe('/minha-conta');
    for (const evil of ['https://evil.example/x', '//evil.example', '/\\evil.example']) {
      const res = await call(confirm, `/auth/confirm?token_hash=abc&type=magiclink&next=${encodeURIComponent(evil)}`);
      expect(location(res), evil).toBe('/');
    }
  });
});

describe('/auth/callback (fluxo por code)', () => {
  it('code válido: troca por sessão e segue para o destino interno', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    expect(location(await call(callback, '/auth/callback?code=xyz&next=/update-password'))).toBe('/update-password');
  });

  it('falha na recuperação: volta para "Esqueci a senha" com aviso', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'code verifier not found' } });
    expect(location(await call(callback, '/auth/callback?code=xyz&next=/update-password'))).toBe('/forgot-password?erro=link_invalido');
  });

  it('falha em outro fluxo volta ao login com aviso; sem code também', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'x' } });
    expect(location(await call(callback, '/auth/callback?code=xyz'))).toBe('/login?error=sessao_invalida');
    expect(location(await call(callback, '/auth/callback'))).toBe('/login?error=sessao_invalida');
  });

  it('destino externo no parâmetro next é ignorado (corrige o redirecionamento aberto anterior)', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    for (const evil of ['https://evil.example/phishing', '//evil.example', '/\\evil.example']) {
      expect(location(await call(callback, `/auth/callback?code=xyz&next=${encodeURIComponent(evil)}`)), evil).toBe('/dashboard');
    }
  });
});

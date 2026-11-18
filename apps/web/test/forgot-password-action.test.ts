import { beforeEach, describe, expect, it, vi } from 'vitest';

const recovery = vi.fn();
const supabaseReset = vi.fn();
let allowed = true;

vi.mock('@/lib/auth/password-recovery-email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/password-recovery-email')>('@/lib/auth/password-recovery-email');
  return { ...actual, sendPasswordRecoveryEmail: (...a: any[]) => recovery(...a) };
});
vi.mock('@/lib/security/rate-limiter', () => ({
  getClientIpAddress: async () => '1.2.3.4',
  checkRateLimit: async () => ({ allowed, remaining: 1, resetMs: 0 }),
}));
vi.mock('@/lib/supabase/server', () => ({ createServerSideClient: async () => ({ auth: { resetPasswordForEmail: (...a: any[]) => supabaseReset(...a) } }) }));

import { requestPasswordRecoveryAction } from '../src/app/(auth)/forgot-password/actions';

beforeEach(() => {
  allowed = true;
  recovery.mockReset().mockResolvedValue({ ok: true });
  supabaseReset.mockReset().mockResolvedValue({ error: null });
});

describe('pedido público de recuperação de senha', () => {
  it('e-mail inválido: erro, sem envio', async () => {
    expect((await requestPasswordRecoveryAction('xx')).success).toBe(false);
    expect(recovery).not.toHaveBeenCalled();
  });

  it('conta existente e conta inexistente recebem a MESMA resposta (não revela quem está cadastrado)', async () => {
    const existe = await requestPasswordRecoveryAction('dono@optica.com.br');
    recovery.mockResolvedValue({ ok: false, reason: 'no_account' });
    const naoExiste = await requestPasswordRecoveryAction('ninguem@x.com');
    expect(existe).toEqual({ success: true });
    expect(naoExiste).toEqual(existe);
    expect(supabaseReset).not.toHaveBeenCalled();
  });

  it('limite de pedidos excedido: bloqueia antes de gerar qualquer token', async () => {
    allowed = false;
    const r = await requestPasswordRecoveryAction('dono@optica.com.br');
    expect(r.success).toBe(false);
    expect(recovery).not.toHaveBeenCalled();
  });

  it('falha do envio próprio: usa o e-mail do Supabase como alternativa e responde igual', async () => {
    recovery.mockResolvedValue({ ok: false, reason: 'send_failed' });
    expect(await requestPasswordRecoveryAction('dono@optica.com.br')).toEqual({ success: true });
    expect(supabaseReset).toHaveBeenCalledTimes(1);
  });
});

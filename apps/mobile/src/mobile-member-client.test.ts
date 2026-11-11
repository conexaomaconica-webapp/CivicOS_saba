import { describe, expect, it } from 'vitest';
import {
  deleteMobileMemberAccountRemote,
  loginMobileMember,
  registerMobileMember,
  syncMobileFavoritesRemote,
} from './mobile-member-client';

describe('mobile-member-client', () => {
  it('envia todos os campos obrigatórios no cadastro completo do app', async () => {
    let sentBody: Record<string, unknown> = {};
    const res = await registerMobileMember(
      {
        name: 'Eduardo Silva',
        email: 'eduardo@example.com',
        city: 'Feira de Santana',
        state: 'BA',
        password: 'password123',
        confirmPassword: 'password123',
        acceptedTerms: true,
        acceptedPrivacy: true,
      },
      async (_input, init) => {
        sentBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            success: true,
            needsEmailConfirmation: false,
            session: { accessToken: 'tok-1', refreshToken: 'ref-1', expiresAt: 9999999999 },
            user: {
              id: 'u-1',
              email: 'eduardo@example.com',
              name: 'Eduardo Silva',
              city: 'Feira de Santana',
              state: 'BA',
            },
          }),
          { status: 200 },
        );
      },
    );

    expect(res.success).toBe(true);
    expect(sentBody.city).toBe('Feira de Santana');
    expect(sentBody.state).toBe('BA');
    expect(sentBody.acceptedTerms).toBe(true);
    expect(sentBody.acceptedPrivacy).toBe(true);
  });

  it('retorna falha explícita no login após exclusão definitiva da conta', async () => {
    const res = await loginMobileMember(
      'deleted@example.com',
      'password123',
      async () =>
        new Response(
          JSON.stringify({ success: false, error: 'E-mail ou senha incorretos.' }),
          { status: 401 },
        ),
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('incorretos');
  });

  it('propaga falha de exclusão do servidor sem confirmar sucesso falso', async () => {
    const res = await deleteMobileMemberAccountRemote(
      { accessToken: 'tok-1', refreshToken: 'ref-1', expiresAt: 9999999999 },
      async () =>
        new Response(
          JSON.stringify({ success: false, reason: 'blocked_financial', error: 'Pagamentos pendentes.' }),
          { status: 409 },
        ),
    );

    expect(res.success).toBe(false);
    expect(res.reason).toBe('blocked_financial');
    expect(res.message).toContain('Pagamentos pendentes');
  });

  it('sincroniza favoritos com a conta autenticada', async () => {
    const merged = await syncMobileFavoritesRemote(
      { accessToken: 'tok-1', refreshToken: 'ref-1', expiresAt: 9999999999 },
      ['empresa-a', 'empresa-b'],
      async () =>
        new Response(
          JSON.stringify({ success: true, slugs: ['empresa-a', 'empresa-b', 'empresa-c'] }),
          { status: 200 },
        ),
    );

    expect(merged).toEqual(['empresa-a', 'empresa-b', 'empresa-c']);
  });
});

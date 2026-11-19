import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSignUp, mockUpsert } = vi.hoisted(() => ({ mockSignUp: vi.fn(), mockUpsert: vi.fn() }));

vi.mock('@/lib/mobile/mobile-api-auth', () => ({
  mobileCorsOptionsResponse: () => new Response(null, { status: 204 }),
  mobileJsonResponse: (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  authenticateMobileRequest: vi.fn(),
  resolveMobileTenantId: vi.fn().mockResolvedValue('tenant-1'),
  createMobileSupabaseClients: () => ({
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'anon-key',
    anonClient: { auth: { signUp: mockSignUp } },
    adminClient: { from: () => ({ upsert: mockUpsert }) },
  }),
}));

import { POST as registerPost } from '../auth/register/route';

const valid = {
  name: 'Maria Souza',
  email: '  Maria@Example.com ',
  password: 'senha-segura-1',
  confirmPassword: 'senha-segura-1',
  city: 'Feira de Santana',
  state: 'ba',
  acceptedTerms: true,
  acceptedPrivacy: true,
};

const post = (body: unknown) =>
  registerPost(new Request('http://localhost/api/mobile/member/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue({ error: null });
});

describe('cadastro de membro pelo app: caminhos de sucesso e erro', () => {
  it('cadastro válido com confirmação de e-mail ligada: cria a conta, avisa para confirmar e não devolve sessão', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1', email: 'maria@example.com', identities: [{ id: 'i1' }] }, session: null }, error: null });
    const res = await post(valid);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, needsEmailConfirmation: true, session: null });
    expect(json.message).toMatch(/confirmar/i);
    expect(json.user).toMatchObject({ id: 'u1', email: 'maria@example.com', name: 'Maria Souza', state: 'BA' });
  });

  it('envia ao Supabase e-mail em minúsculas, UF em maiúsculas, o aceite LGPD com data e o tenant; e grava o perfil', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1', email: 'maria@example.com', identities: [{ id: 'i1' }] }, session: null }, error: null });
    await post(valid);
    const args = mockSignUp.mock.calls[0]![0];
    expect(args.email).toBe('maria@example.com');
    expect(args.options.data).toMatchObject({ name: 'Maria Souza', city: 'Feira de Santana', state: 'BA', tenant_id: 'tenant-1' });
    expect(args.options.data.terms_accepted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(args.options.data.privacy_accepted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1', email: 'maria@example.com', state: 'BA', status: 'active' }), { onConflict: 'id' });
  });

  it('com confirmação desligada, o Supabase devolve a sessão e o app já entra logado', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'maria@example.com', identities: [{ id: 'i1' }] }, session: { access_token: 'a', refresh_token: 'r', expires_at: 123 } },
      error: null,
    });
    const json = await (await post(valid)).json();
    expect(json).toMatchObject({ success: true, needsEmailConfirmation: false, session: { accessToken: 'a', refreshToken: 'r', expiresAt: 123 } });
  });

  it('e-mail já cadastrado (erro do Supabase ou identidades vazias): 409 com orientação', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: 'User already registered' } });
    const a = await post(valid);
    expect(a.status).toBe(409);
    expect((await a.json()).error).toMatch(/já está cadastrado/);

    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'u1', identities: [] }, session: null }, error: null });
    const b = await post(valid);
    expect(b.status).toBe(409);
    expect((await b.json()).error).toMatch(/já possui cadastro/);
  });

  it('senhas diferentes, senha curta ou aceite faltando: 400 e nada é enviado ao Supabase', async () => {
    for (const patch of [{ confirmPassword: 'outra-senha-9' }, { password: '123', confirmPassword: '123' }, { acceptedTerms: false }, { acceptedPrivacy: false }]) {
      const res = await post({ ...valid, ...patch });
      expect(res.status).toBe(400);
    }
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('JSON inválido ou corpo que não é objeto: 400', async () => {
    const bad = await registerPost(new Request('http://localhost/x', { method: 'POST', body: '{nao-json' }));
    expect(bad.status).toBe(400);
    expect((await post([1, 2])).status).toBe(400);
  });

  it('falha de rede/servidor do Supabase: 400 com a mensagem, sem criar perfil', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Signups not allowed' } });
    const res = await post(valid);
    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

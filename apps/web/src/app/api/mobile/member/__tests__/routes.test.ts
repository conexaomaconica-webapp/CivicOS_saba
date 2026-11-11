import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDeleteUser, mockRpc, mockAuthenticate, mockSignUp } = vi.hoisted(() => ({
  mockDeleteUser: vi.fn(),
  mockRpc: vi.fn(),
  mockAuthenticate: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock('@/lib/mobile/mobile-api-auth', () => ({
  mobileCorsOptionsResponse: () => new Response(null, { status: 204 }),
  mobileJsonResponse: (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  authenticateMobileRequest: mockAuthenticate,
  resolveMobileTenantId: vi.fn().mockResolvedValue('tenant-1'),
  createMobileSupabaseClients: () => ({
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'anon-key',
    anonClient: {
      auth: {
        signUp: mockSignUp,
      },
    },
    adminClient: {
      auth: {
        admin: {
          deleteUser: mockDeleteUser,
        },
      },
      from: () => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  }),
}));

import { POST as deleteAccountPost } from '../account/delete/route';
import { POST as registerPost } from '../auth/register/route';

describe('mobile member API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita cadastro incompleto sem cidade, UF ou aceite LGPD', async () => {
    const req = new Request('http://localhost/api/mobile/member/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eduardo Silva',
        email: 'eduardo@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }),
    });

    const res = await registerPost(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('exclui registro em auth.users após request_account_deletion ter sucesso', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockDeleteUser.mockResolvedValue({ error: null });
    mockAuthenticate.mockResolvedValue({
      ok: true,
      ctx: {
        user: { id: 'user-del-1', email: 'del@example.com' },
        accessToken: 'tok',
        userClient: { rpc: mockRpc },
        adminClient: {
          auth: {
            admin: {
              deleteUser: mockDeleteUser,
            },
          },
        },
        host: 'conexaomaconica.com.br',
      },
    });

    const req = new Request('http://localhost/api/mobile/member/account/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok' },
      body: '{}',
    });

    const res = await deleteAccountPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('request_account_deletion');
    expect(mockDeleteUser).toHaveBeenCalledWith('user-del-1');
  });

  it('não exclui auth.users se request_account_deletion bloquear por pendência financeira', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'ACCOUNT_DELETION_BLOCKED_FINANCIAL' } });
    mockAuthenticate.mockResolvedValue({
      ok: true,
      ctx: {
        user: { id: 'user-del-2', email: 'fin@example.com' },
        accessToken: 'tok',
        userClient: { rpc: mockRpc },
        adminClient: {
          auth: {
            admin: {
              deleteUser: mockDeleteUser,
            },
          },
        },
        host: 'conexaomaconica.com.br',
      },
    });

    const req = new Request('http://localhost/api/mobile/member/account/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok' },
      body: '{}',
    });

    const res = await deleteAccountPost(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('blocked_financial');
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { executeAccountDeletion, purgeLocalAccountState, type SupabaseClientLike } from './account-lifecycle';

function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    key: vi.fn(() => null),
    length: 0,
  };
}

describe('Account Lifecycle & Security Deletion (Gate 02B.1)', () => {
  it('exclui conta no backend com sucesso e sinaliza purge local', async () => {
    const mockClient: SupabaseClientLike = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'usr-123' } } }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    const res = await executeAccountDeletion(mockClient, {
      userId: 'usr-123',
      userEmail: 'irmao@exemplo.com',
      isAuthenticatedSupabase: true,
    });

    expect(res.success).toBe(true);
    expect(res.reason).toBe('success');
    expect(mockClient.rpc).toHaveBeenCalledWith('request_account_deletion');
    expect(mockClient.auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
  });

  it('bloqueia exclusão e PRESERVA credenciais locais se houver impedimento financeiro', async () => {
    const mockClient: SupabaseClientLike = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'ACCOUNT_DELETION_BLOCKED_FINANCIAL: Existem pagamentos pendentes' },
      }),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'usr-123' } } }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    const res = await executeAccountDeletion(mockClient, {
      userId: 'usr-123',
      userEmail: 'irmao@exemplo.com',
      isAuthenticatedSupabase: true,
    });

    expect(res.success).toBe(false);
    expect(res.reason).toBe('blocked_financial');
    expect(res.message).toContain('Existem assinaturas ou pagamentos pendentes');
    expect(mockClient.auth.signOut).not.toHaveBeenCalled();
  });

  it('trata falhas de rede com segurança sem apagar os dados locais antecipadamente', async () => {
    const mockClient: SupabaseClientLike = {
      rpc: vi.fn().mockRejectedValue(new Error('Network error / connection reset')),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'usr-123' } } }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    const res = await executeAccountDeletion(mockClient, {
      userId: 'usr-123',
      isAuthenticatedSupabase: true,
    });

    expect(res.success).toBe(false);
    expect(res.reason).toBe('network_error');
    expect(res.message).toContain('Falha de comunicação com o servidor');
  });

  it('purga credenciais locais de forma precisa após confirmação', () => {
    const storage = createMockStorage();
    storage.setItem('cm_mobile_member_user', JSON.stringify({ email: 'membro@test.com' }));
    storage.setItem('cm_fcm_device_token', 'fcm-12345');
    storage.setItem('cm_mobile_registered_members', JSON.stringify([
      { email: 'membro@test.com' },
      { email: 'outro@test.com' },
    ]));

    purgeLocalAccountState({ userEmail: 'membro@test.com' }, storage);

    expect(storage.removeItem).toHaveBeenCalledWith('cm_mobile_member_user');
    expect(storage.removeItem).toHaveBeenCalledWith('cm_fcm_device_token');
    expect(storage.setItem).toHaveBeenCalledWith(
      'cm_mobile_registered_members',
      JSON.stringify([{ email: 'outro@test.com' }])
    );
  });
});

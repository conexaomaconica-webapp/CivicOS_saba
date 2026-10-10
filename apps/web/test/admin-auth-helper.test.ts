import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSideClient: () => Promise.resolve({
    auth: {
      getUser: () => mockGetUser(),
    },
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

import { assertMasterAdminAccess, assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';

describe('Admin Auth Helpers — RBAC e Proteção Master', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('assertMasterAdminAccess', () => {
    it('lança erro se usuário não estiver autenticado', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Sem sessão') });

      await expect(assertMasterAdminAccess()).rejects.toThrow('UNAUTHORIZED: Sessão expirada ou usuário não autenticado.');
    });

    it('autoriza com sucesso quando profiles.role é "master"', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-master', email: 'master@conexao.com.br' } },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { role: 'master' },
              error: null,
            }),
          }),
        }),
      });

      const result = await assertMasterAdminAccess();
      expect(result.user.id).toBe('usr-master');
      expect(result.role).toBe('master');
    });

    it('rejeita com FORBIDDEN quando profiles.role é "admin"', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-admin', email: 'admin@conexao.com.br' } },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      await expect(assertMasterAdminAccess()).rejects.toThrow('FORBIDDEN: Acesso restrito exclusivamente ao perfil Master.');
    });

    it('rejeita com FORBIDDEN quando profiles.role é "socio_admin"', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-socio', email: 'socio@conexao.com.br' } },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { role: 'socio_admin' },
              error: null,
            }),
          }),
        }),
      });

      await expect(assertMasterAdminAccess()).rejects.toThrow('FORBIDDEN: Acesso restrito exclusivamente ao perfil Master.');
    });

    it('rejeita com FORBIDDEN quando profiles.role é "member"', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-member', email: 'membro@conexao.com.br' } },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { role: 'member' },
              error: null,
            }),
          }),
        }),
      });

      await expect(assertMasterAdminAccess()).rejects.toThrow('FORBIDDEN: Acesso restrito exclusivamente ao perfil Master.');
    });
  });

  describe('assertPlatformAdminAccess (Preservação Global)', () => {
    it('mantém o comportamento original baseado na RPC has_platform_admin_access', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-admin', email: 'admin@conexao.com.br' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: true });

      const result = await assertPlatformAdminAccess();
      expect(result.user.id).toBe('usr-admin');
      expect(mockRpc).toHaveBeenCalledWith('has_platform_admin_access');
    });
  });
});

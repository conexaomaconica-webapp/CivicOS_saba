import { describe, it, expect, vi } from 'vitest';
import { assertBusinessAnalyticsAccess } from '../src/lib/analytics/analytics-auth';

function createMockSupabase(options: {
  user: { id: string } | null;
  business: { id: string; tenant_id: string; owner_id: string; is_active: boolean } | null;
  member?: { role: string; status: string } | null;
  profile?: { role: string } | null;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
        error: options.user ? null : new Error('No session'),
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'businesses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options.business,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'business_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: options.member || null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options.profile || { role: 'member' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    }),
  };
}

describe('ANALYTICS: Segurança e Isolamento Multi-Tenant (P0)', () => {
  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';
  const bizA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const bizB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const userOwnerA = 'user-owner-a';
  const userMemberA = 'user-member-a';
  const userStranger = 'user-stranger-b';
  const adminUser = 'user-platform-admin';

  it('1. Usuário não autenticado é rejeitado imediatamente com UNAUTHORIZED', async () => {
    const mock = createMockSupabase({ user: null, business: null });
    await expect(assertBusinessAnalyticsAccess(bizA, mock)).rejects.toThrow('UNAUTHORIZED');
  });

  it('2. Parâmetro malicioso / não-UUID é rejeitado sem vazar dados', async () => {
    const mock = createMockSupabase({ user: { id: userOwnerA }, business: null });
    await expect(assertBusinessAnalyticsAccess('sql-injection-or-invalid-id', mock)).rejects.toThrow('FORBIDDEN');
  });

  it('3. Proprietário acessa com sucesso o analytics de sua própria empresa', async () => {
    const mock = createMockSupabase({
      user: { id: userOwnerA },
      business: { id: bizA, tenant_id: tenantA, owner_id: userOwnerA, is_active: true },
    });

    const result = await assertBusinessAnalyticsAccess(bizA, mock);
    expect(result.authorized).toBe(true);
    expect(result.userId).toBe(userOwnerA);
    expect(result.businessId).toBe(bizA);
    expect(result.role).toBe('owner');
    expect(result.isPlatformAdmin).toBe(false);
  });

  it('4. Membro ativo da equipe acessa com sucesso o analytics da empresa vinculada', async () => {
    const mock = createMockSupabase({
      user: { id: userMemberA },
      business: { id: bizA, tenant_id: tenantA, owner_id: userOwnerA, is_active: true },
      member: { role: 'manager', status: 'active' },
    });

    const result = await assertBusinessAnalyticsAccess(bizA, mock);
    expect(result.authorized).toBe(true);
    expect(result.userId).toBe(userMemberA);
    expect(result.role).toBe('manager');
  });

  it('5. Membro com vínculo REVOGADO é categoricamente REJEITADO', async () => {
    const mock = createMockSupabase({
      user: { id: userMemberA },
      business: { id: bizA, tenant_id: tenantA, owner_id: userOwnerA, is_active: true },
      member: { role: 'manager', status: 'revoked' },
    });

    await expect(assertBusinessAnalyticsAccess(bizA, mock)).rejects.toThrow('FORBIDDEN');
  });

  it('6. Usuário da Empresa A tentando acessar métricas da Empresa B é BLOQUEADO', async () => {
    // Empresa B pertence a userOwnerB. userStranger tenta acessar bizA!
    const mock = createMockSupabase({
      user: { id: userStranger },
      business: { id: bizA, tenant_id: tenantA, owner_id: userOwnerA, is_active: true },
      member: null,
      profile: { role: 'member' },
    });

    await expect(assertBusinessAnalyticsAccess(bizA, mock)).rejects.toThrow('FORBIDDEN');
  });

  it('7. Empresa inativa no banco é rejeitada mesmo que o usuário seja o dono', async () => {
    const mock = createMockSupabase({
      user: { id: userOwnerA },
      business: { id: bizA, tenant_id: tenantA, owner_id: userOwnerA, is_active: false },
    });

    await expect(assertBusinessAnalyticsAccess(bizA, mock)).rejects.toThrow('FORBIDDEN');
  });

  it('8. Administrador de Plataforma (Master/Admin) tem acesso auditorial legítimo', async () => {
    const mock = createMockSupabase({
      user: { id: adminUser },
      business: { id: bizA, tenant_id: tenantA, owner_id: userOwnerA, is_active: true },
      member: null,
      profile: { role: 'platform_admin' },
    });

    const result = await assertBusinessAnalyticsAccess(bizA, mock);
    expect(result.authorized).toBe(true);
    expect(result.isPlatformAdmin).toBe(true);
    expect(result.role).toBe('platform_admin');
  });
});

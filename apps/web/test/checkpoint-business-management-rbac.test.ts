import { describe, it, expect, vi } from 'vitest';
import {
  createBusinessServiceAction,
  updateBusinessServiceAction,
  deleteBusinessServiceAction,
  createBusinessBenefitAction,
  deleteBusinessBenefitAction,
} from '../src/app/actions/business-management';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('localhost'),
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

let mockIsAdmin = false;
let mockUser: { id: string; email: string } | null = { id: 'user_owner_001', email: 'owner@example.com' };
let mockOwnerId = 'user_owner_001';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      auth: {
        getUser: vi.fn().mockImplementation(() => {
          if (!mockUser) return Promise.resolve({ data: { user: null }, error: new Error('Não autenticado') });
          return Promise.resolve({ data: { user: mockUser }, error: null });
        }),
      },
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === 'has_platform_admin_access') {
          return Promise.resolve({ data: mockIsAdmin, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockImplementation(() => {
              return Promise.resolve({
                data: { id: 'biz_001', owner_id: mockOwnerId, tenant_id: 'tenant_001' },
                error: null,
              });
            }),
          };
        }
        if (table === 'business_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockImplementation(() => {
              if (mockUser && mockUser.id === mockOwnerId) {
                return Promise.resolve({ data: { role: 'owner' }, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        if (table === 'business_services' || table === 'business_benefits') {
          return {
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'item_123', name: 'Serviço Teste', title: 'Benefício Teste' },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      }),
    });
  }),
}));

describe('Checkpoint Etapa 6 — RBAC & Management Authorization', () => {
  it('proprietário da empresa deve conseguir criar serviço e benefício', async () => {
    mockIsAdmin = false;
    mockUser = { id: 'user_owner_001', email: 'owner@example.com' };
    mockOwnerId = 'user_owner_001';

    const srvRes = await createBusinessServiceAction('biz_001', { name: 'Manutenção Predial' });
    expect(srvRes.success).toBe(true);

    const benRes = await createBusinessBenefitAction('biz_001', {
      title: '10% OFF no primeiro contrato',
      description: 'Válido para novos clientes.',
    });
    expect(benRes.success).toBe(true);
  });

  it('admin de plataforma (via RPC) deve conseguir gerenciar serviço/benefício mesmo sem ser owner', async () => {
    mockIsAdmin = true;
    mockUser = { id: 'admin_user_999', email: 'admin@platform.com' };
    mockOwnerId = 'user_owner_001'; // Outro usuário é o owner

    const srvRes = await updateBusinessServiceAction('biz_001', 'srv_1', { name: 'Serviço Editado por Admin' });
    expect(srvRes.success).toBe(true);
  });

  it('anunciante de outra empresa NÃO deve conseguir gerenciar empresa de terceiro', async () => {
    mockIsAdmin = false;
    mockUser = { id: 'user_other_002', email: 'other@example.com' };
    mockOwnerId = 'user_owner_001'; // Empresa pertence a user_owner_001

    const srvRes = await createBusinessServiceAction('biz_001', { name: 'Tentativa Hacker' });
    expect(srvRes.success).toBe(false);
    expect(srvRes.error).toContain('Você não possui permissão');
  });

  it('usuário anônimo/não autenticado deve ser BLOQUEADO', async () => {
    mockIsAdmin = false;
    mockUser = null;

    const delRes = await deleteBusinessServiceAction('biz_001', 'srv_1');
    expect(delRes.success).toBe(false);
    expect(delRes.error).toContain('não autenticado');
  });
});

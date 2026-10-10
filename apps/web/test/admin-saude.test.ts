import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockAssertMasterAdminAccess = vi.fn();
vi.mock('@/lib/admin/admin-auth-helper', async () => {
  const actual = await vi.importActual<any>('@/lib/admin/admin-auth-helper');
  return {
    ...actual,
    assertMasterAdminAccess: () => mockAssertMasterAdminAccess(),
  };
});

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}));

import AdminSaudePage from '@/app/admin/saude/page';

describe('M1.4 — Central de Saúde Operacional (/admin/saude) — Autorização Estrita Master', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bloqueia visitantes ou sessões expiradas disparando notFound()', async () => {
    mockAssertMasterAdminAccess.mockRejectedValue(new Error('UNAUTHORIZED: Sessão expirada'));

    await expect(AdminSaudePage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it('bloqueia perfil admin convencional disparando notFound()', async () => {
    mockAssertMasterAdminAccess.mockRejectedValue(new Error('FORBIDDEN: Acesso restrito exclusivamente ao perfil Master.'));

    await expect(AdminSaudePage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it('bloqueia perfil socio_admin disparando notFound()', async () => {
    mockAssertMasterAdminAccess.mockRejectedValue(new Error('FORBIDDEN: Acesso restrito exclusivamente ao perfil Master.'));

    await expect(AdminSaudePage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it('bloqueia perfil member comum disparando notFound()', async () => {
    mockAssertMasterAdminAccess.mockRejectedValue(new Error('FORBIDDEN: Acesso restrito exclusivamente ao perfil Master.'));

    await expect(AdminSaudePage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it('renderiza painel com dados reais de banco e eventos do Asaas exclusivamente para Master autenticado', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'businesses' || table === 'masonic_lodges') {
          return {
            select: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [{ id: '1' }], error: null })),
            })),
          };
        }
        if (table === 'payment_provider_events') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({
                  data: [
                    {
                      id: 'evt-1',
                      provider_code: 'asaas',
                      event_type: 'PAYMENT_CONFIRMED',
                      event_id: 'evt_12345',
                      processed: true,
                      error_log: null,
                      created_at: new Date().toISOString(),
                    },
                    {
                      id: 'evt-2',
                      provider_code: 'asaas',
                      event_type: 'PAYMENT_FAILED',
                      event_id: 'evt_67890',
                      processed: false,
                      error_log: '[inc_abc] Falha RPC',
                      created_at: new Date().toISOString(),
                    },
                  ],
                  count: 2,
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };

    mockAssertMasterAdminAccess.mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'master-id', email: 'master@conexaomaconica.com.br' },
      role: 'master',
    });

    const pageElement = await AdminSaudePage();
    expect(pageElement).toBeDefined();
    expect(mockAssertMasterAdminAccess).toHaveBeenCalledOnce();
    expect(mockSupabase.from).toHaveBeenCalledWith('businesses');
    expect(mockSupabase.from).toHaveBeenCalledWith('payment_provider_events');
  });
});

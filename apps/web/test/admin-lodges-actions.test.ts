import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks para módulos Supabase / Next.js
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSideClient: vi.fn(),
}));

vi.mock('@/lib/admin/admin-auth-helper', () => ({
  assertPlatformAdminAccess: vi.fn(),
}));

import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { createAdminLodgeAction, updateAdminLodgeAction } from '@/lib/admin/admin-lodges-service';

describe('SUÍTE DE TESTES — SERVER ACTIONS DE LOJAS MAÇÔNICAS (ADMIN)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Deve bloquear tentativa de criação se não for admin da plataforma', async () => {
    vi.mocked(assertPlatformAdminAccess).mockRejectedValueOnce(
      new Error('UNAUTHORIZED: Sessão expirada ou usuário não autenticado.')
    );

    const res = await createAdminLodgeAction({ name: 'Loja Teste Bloqueio' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('UNAUTHORIZED');
  });

  it('2. Deve rejeitar criação se o nome da Loja for em branco', async () => {
    const mockSupabase = {
      from: vi.fn(),
    };
    vi.mocked(assertPlatformAdminAccess).mockResolvedValueOnce({
      supabase: mockSupabase as any,
      user: { id: 'admin-123' } as any,
    });

    const res = await createAdminLodgeAction({ name: '   ' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('O nome da Loja Maçônica é obrigatório.');
  });

  it('3. Deve criar Loja com sucesso, aplicando tenant_id no servidor e persistindo is_featured', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'org-new-123',
            name: 'Loja Luz do Oriente',
            slug: 'loja-luz-do-oriente-100',
            is_active: true,
            is_published: true,
            is_featured: true,
          },
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: '00000000-0000-0000-0000-000000000010' } }) }) };
        }
        if (table === 'organizations') {
          return { insert: mockInsert };
        }
        if (table === 'organization_meetings' || table === 'organization_contacts') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return {};
      }),
    };

    vi.mocked(assertPlatformAdminAccess).mockResolvedValueOnce({
      supabase: mockSupabase as any,
      user: { id: 'admin-123' } as any,
    });

    const res = await createAdminLodgeAction({
      name: 'Loja Luz do Oriente',
      code_number: 100,
      potency: 'GOB',
      rite: 'REAA',
      city: 'São Paulo',
      state: 'SP',
      logo_url: 'https://storage.local/logo.png',
      cover_url: 'https://storage.local/cover.png',
      is_published: true,
      is_active: true,
      is_featured: true,
    });

    expect(res.success).toBe(true);
    expect(res.data?.id).toBe('org-new-123');

    // Verificar se o insert no servidor usou tenant_id canônico e gravou is_featured
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: '00000000-0000-0000-0000-000000000010',
        name: 'Loja Luz do Oriente',
        code_number: 100,
        logo_url: 'https://storage.local/logo.png',
        cover_url: 'https://storage.local/cover.png',
        is_active: true,
        is_published: true,
        is_featured: true,
      })
    );
  });

  it('4. Deve tratar adequadamente erro de slug duplicado (code 23505)', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: '00000000-0000-0000-0000-000000000010' } }) }) };
        }
        return { insert: mockInsert };
      }),
    };

    vi.mocked(assertPlatformAdminAccess).mockResolvedValueOnce({
      supabase: mockSupabase as any,
      user: { id: 'admin-123' } as any,
    });

    const res = await createAdminLodgeAction({
      name: 'Loja Duplicada',
      slug: 'loja-duplicada-1',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Já existe uma Loja Maçônica com este slug ou identificador.');
  });

  it('5. Deve atualizar Loja Maçônica via updateAdminLodgeAction', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'org-edit-456',
              name: 'Loja Editada',
              slug: 'loja-editada-50',
              is_active: true,
              is_published: false,
            },
            error: null,
          }),
        }),
      }),
    });

    const mockSelectExisting = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { slug: 'loja-antiga-50', tenant_id: '00000000-0000-0000-0000-000000000010' },
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: '00000000-0000-0000-0000-000000000010' } }) }) };
        }
        if (table === 'organizations') {
          return {
            select: mockSelectExisting,
            update: mockUpdate,
          };
        }
        if (table === 'organization_meetings' || table === 'organization_contacts') {
          return {
            delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
            insert: vi.fn().mockResolvedValue({}),
          };
        }
        return {};
      }),
    };

    vi.mocked(assertPlatformAdminAccess).mockResolvedValueOnce({
      supabase: mockSupabase as any,
      user: { id: 'admin-123' } as any,
    });

    const res = await updateAdminLodgeAction('org-edit-456', {
      name: 'Loja Editada',
      code_number: 50,
      is_published: false,
      is_active: true,
    });

    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Loja Editada',
        code_number: 50,
        is_published: false,
        is_active: true,
      })
    );
  });

  it('6. Deve preservar e separar corretamente os estados is_active e is_published', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'org-draft-789', name: 'Loja Rascunho', is_active: true, is_published: false },
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: '00000000-0000-0000-0000-000000000010' } }) }) };
        }
        if (table === 'organizations') return { insert: mockInsert };
        return { insert: vi.fn().mockResolvedValue({}) };
      }),
    };

    vi.mocked(assertPlatformAdminAccess).mockResolvedValueOnce({
      supabase: mockSupabase as any,
      user: { id: 'admin-123' } as any,
    });

    const res = await createAdminLodgeAction({
      name: 'Loja Rascunho',
      is_active: true,
      is_published: false,
    });

    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
        is_published: false,
      })
    );
  });

  it('7. Deve garantir que o tenant_id seja determinado pelo servidor e não confiado no payload', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'org-tenant-test', name: 'Loja Tenant Protegido' },
          error: null,
        }),
      }),
    });

    const mockMaybeSingleProfile = vi.fn().mockResolvedValue({
      data: { tenant_id: '00000000-0000-0000-0000-000000000010' },
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { select: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleProfile }) };
        }
        if (table === 'organizations') {
          return { insert: mockInsert };
        }
        return { insert: vi.fn().mockResolvedValue({}) };
      }),
    };

    vi.mocked(assertPlatformAdminAccess).mockResolvedValueOnce({
      supabase: mockSupabase as any,
      user: { id: 'admin-123' } as any,
    });

    const res = await createAdminLodgeAction({
      name: 'Loja Tenant Protegido',
    } as any);

    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: '00000000-0000-0000-0000-000000000010',
      })
    );
  });
});

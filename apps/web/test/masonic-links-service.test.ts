import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient, User, AuthError } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import {
  listMyCommunityLinks,
  requestCommunityLink,
  submitLinkForReview,
} from '../src/lib/masonic/masonic-links-service';

function makeUser(): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'owner@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  };
}

function makeSupabase(mock: {
  getUser?: () => Promise<{ data: { user: User | null }; error: AuthError | null }>;
  selectLinks?: Array<Record<string, unknown>>;
  selectBusinesses?: () => Promise<{ data: Array<{ id: string; name: string; slug: string | null }> | null; error: AuthError | null }>;
  selectOrganizations?: () => Promise<{ data: Array<{ id: string; name: string }> | null; error: AuthError | null }>;
  selectTenant?: () => Promise<{ data: { tenant_id: string } | null; error: AuthError | null }>;
  insertLink?: () => Promise<{ data: { id: string } | null; error: AuthError | null }>;
  updateLinks?: (patch: Record<string, unknown>) => Promise<{ error: AuthError | null }>;
}) {
  const auth: Record<string, unknown> = {};
  auth.getUser = vi.fn(mock.getUser ?? (async () => ({ data: { user: makeUser() }, error: null as null })));

  const defaultBusinesses = async () => ({ data: [{ id: 'biz-1', name: 'Loja Central', slug: 'loja-central' as string | null }], error: null as null });
  const defaultTenant = async () => ({ data: { tenant_id: 'tenant-1' as const }, error: null as null });

  const linkTable = {
    select: vi.fn(() => ({ order: vi.fn(async () => ({ data: mock.selectLinks ?? [], error: null as null })) })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(mock.insertLink ?? (async () => ({ data: { id: 'link-1' } as const, error: null as null }))) })) })),
    update: vi.fn((patch: Record<string, unknown>) => ({ eq: vi.fn(async () => ({ error: (mock.updateLinks?.(patch) ?? { error: null }).error })) })),
  };
  const businessBuilder = {
    eq: vi.fn(function (this: unknown) { return this; }),
    in: vi.fn(async () => (mock.selectBusinesses?.() ?? defaultBusinesses())),
    order: vi.fn(async () => (mock.selectBusinesses?.() ?? defaultBusinesses())),
    maybeSingle: vi.fn(mock.selectTenant ?? defaultTenant),
  };
  const businessTable = {
    select: vi.fn(() => businessBuilder),
  };

  return {
    auth,
    from: vi.fn((table: string) => {
      if (table === 'business_masonic_links') return linkTable;
      if (table === 'organizations') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => mock.selectOrganizations?.() ?? { data: [], error: null as null }),
          })),
        };
      }
      return businessTable;
    }),
  } as unknown as SupabaseClient<Database>;
}

describe('masonic links service · USR-002', () => {
  it('lista e mapeia os vínculos do usuário com status e tipo', async () => {
    const links = [
      {
        id: 'link-1',
        business_id: 'biz-a',
        organization_id: 'org-1',
        link_type: 'owner',
        status: 'active',
        is_primary: true,
        valid_until: null,
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'link-2',
        business_id: 'biz-b',
        organization_id: null,
        link_type: 'employee',
        status: 'pending_verification',
        is_primary: false,
        valid_until: null,
        created_at: '2026-03-01T00:00:00Z',
      },
    ];
    const supabase = makeSupabase({
      selectLinks: links,
      selectBusinesses: async () => ({
        data: [
          { id: 'biz-a', name: 'Loja Central', slug: 'loja-central' },
          { id: 'biz-b', name: 'Barbearia 33', slug: null },
        ],
        error: null,
      }),
      selectOrganizations: async () => ({
        data: [{ id: 'org-1', name: 'Loja Maçônica Estrela' }],
        error: null,
      }),
    });

    const dto = await listMyCommunityLinks(supabase);

    expect(dto).toHaveLength(2);
    expect(dto[0]).toMatchObject({
      businessName: 'Loja Central',
      businessSlug: 'loja-central',
      organizationName: 'Loja Maçônica Estrela',
      linkTypeLabel: 'Proprietário',
      statusLabel: 'Ativo',
      statusTone: 'success',
      isPrimary: true,
    });
    expect(dto[1]).toMatchObject({ statusLabel: 'Aguardando Verificação', statusTone: 'pending' });
  });

  it('rejeita solicitação sem empresa selecionada', async () => {
    const supabase = makeSupabase({});
    const result = await requestCommunityLink(supabase, { businessId: '  ', linkType: 'owner' });
    expect(result).toEqual({ ok: false, error: 'Selecione uma empresa.' });
  });

  it('cria o vínculo em draft com tenant e declarante da sessão', async () => {
    const insertLink = vi.fn(async () => ({ data: { id: 'link-1' }, error: null as null }));
    const supabase = makeSupabase({ insertLink });

    const result = await requestCommunityLink(supabase, { businessId: 'biz-1', linkType: 'owner' });

    expect(result).toEqual({ ok: true, id: 'link-1', error: null });
    expect(insertLink).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('business_masonic_links');
  });

  it('envia rascunho para análise (CRIT-VSC-008)', async () => {
    const updateLinks = vi.fn(async () => ({ error: null as null }));
    const supabase = makeSupabase({ updateLinks });

    const result = await submitLinkForReview(supabase, 'link-1');

    expect(result).toEqual({ ok: true, error: null });
    expect(updateLinks).toHaveBeenCalledWith({ status: 'pending_verification' });
  });
});
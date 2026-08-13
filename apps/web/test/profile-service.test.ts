import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient, User, AuthError } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { updatePersonalProfile } from '../src/lib/auth/auth-service';

function makeUser(): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'user@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  };
}

function makeSupabase(mock: {
  getUser?: () => Promise<{
    data: { user: User | null };
    error: AuthError | null;
  }>;
  updateUser?: (attributes: Record<string, unknown>) => Promise<{
    data: { session: null; user: User | null };
    error: AuthError | null;
  }>;
  updateProfile?: (patch: Record<string, unknown>) => Promise<{ error: AuthError | null }>;
}) {
  const auth: Record<string, unknown> = {};
  auth.getUser = vi.fn(mock.getUser);
  auth.updateUser = vi.fn(mock.updateUser);

  const profileBuilder = {
    update: vi.fn((patch: Record<string, unknown>) => ({
      eq: vi.fn(async () => mock.updateProfile?.(patch) ?? { error: null }),
    })),
  };

  return {
    auth,
    from: vi.fn(() => profileBuilder),
  } as unknown as SupabaseClient<Database>;
}

describe('updatePersonalProfile · USR-001', () => {
  it('atualiza nome no Auth (metadata) e na tabela profiles', async () => {
    const updateUser = vi.fn(async () => ({ data: { session: null as null, user: makeUser() }, error: null as null }));
    const updateProfile = vi.fn(async () => ({ error: null as null }));
    const supabase = makeSupabase({ updateUser, updateProfile });

    const result = await updatePersonalProfile(supabase, 'user-1', { name: 'Novo Nome' });

    expect(result).toEqual(expect.objectContaining({ ok: true, error: null }));
    expect(result.emailConfirmationRequired).toBe(false);
    expect(updateUser).toHaveBeenCalledWith({ data: { name: 'Novo Nome' } });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(updateProfile).toHaveBeenCalledWith({ name: 'Novo Nome' });
  });

  it('sinaliza que confirmação por e-mail é necessária quando o e-mail muda', async () => {
    const supabase = makeSupabase({
      updateUser: async () => ({ data: { session: null as null, user: makeUser() }, error: null as null }),
      updateProfile: async () => ({ error: null as null }),
    });

    const result = await updatePersonalProfile(supabase, 'user-1', { email: 'novo@example.com' });

    expect(result.ok).toBe(true);
    expect(result.emailConfirmationRequired).toBe(true);
  });

  it('propaga erro do Auth quando a atualização de e-mail/nome falha', async () => {
    const supabase = makeSupabase({
      updateUser: async () => ({ data: { session: null as null, user: null }, error: { message: 'email alreadies in use' } as AuthError }),
    });

    const result = await updatePersonalProfile(supabase, 'user-1', { name: 'X', email: 'usado@example.com' });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('email');
  });

  it('não chama o Auth quando o patch é vazio', async () => {
    const updateUser = vi.fn(async () => ({ data: { session: null as null, user: makeUser() }, error: null as null }));
    const supabase = makeSupabase({ updateUser });

    const result = await updatePersonalProfile(supabase, 'user-1', {});

    expect(result).toEqual(expect.objectContaining({ ok: true, error: null }));
    expect(updateUser).not.toHaveBeenCalled();
  });
});
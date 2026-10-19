import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ADMIN_PROFILE_COLUMNS,
  PROFILE_AUTHORIZATION_COLUMNS,
  PROFILE_SELF_COLUMNS,
  INTERNAL_PROFILE_COLUMNS,
  adminProfileDTOSchema,
  profileAuthorizationDTOSchema,
  profileSelfDTOSchema,
  internalProfileDTOSchema,
  publicMemberDTOSchema,
  type AdminProfileDTO,
  type ProfileAuthorizationDTO,
  type ProfileSelfDTO,
  type InternalProfileDTO,
  type PublicMemberDTO,
} from '@saas/core/contracts';
import type { Database } from '@/types/database.types';

type WebSupabaseClient = SupabaseClient<Database>;

export async function getOwnProfileDTO(supabase: WebSupabaseClient, userId: string): Promise<ProfileSelfDTO | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELF_COLUMNS.join(', '))
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? profileSelfDTOSchema.parse(data) : null;
}

export async function getProfileAuthorization(supabase: WebSupabaseClient, userId: string): Promise<ProfileAuthorizationDTO | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_AUTHORIZATION_COLUMNS.join(', '))
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? profileAuthorizationDTOSchema.parse(data) : null;
}

export async function listAdminProfileDTOs(adminClient: WebSupabaseClient): Promise<AdminProfileDTO[]> {
  const { data, error } = await adminClient
    .from('profiles')
    .select(ADMIN_PROFILE_COLUMNS.join(', '))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => adminProfileDTOSchema.parse(row));
}

/** Minimal directory projection; excludes contact and authority fields. */
export async function listPublicMemberDTOs(
  supabase: WebSupabaseClient,
  userIds: string[],
): Promise<PublicMemberDTO[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', userIds);
  if (error) throw error;
  return (data ?? []).map((row) => publicMemberDTOSchema.parse({
    public_id: row.id,
    display_name: row.name?.trim() || 'Membro',
    avatar_url: null,
  }));
}

/** Server-only profile projection for contract and transactional e-mail flows. */
export async function getInternalProfileDTO(
  supabase: WebSupabaseClient,
  userId: string,
): Promise<InternalProfileDTO | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(INTERNAL_PROFILE_COLUMNS.join(', '))
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? internalProfileDTOSchema.parse(data) : null;
}

/** Server-only batch projection for scoped contract and administrative lookups. */
export async function listInternalProfileDTOs(
  supabase: WebSupabaseClient,
  userIds: string[],
  scope: { allowedUserIds: readonly string[] },
): Promise<InternalProfileDTO[]> {
  const allowed = new Set(scope.allowedUserIds.filter(Boolean));
  const ids = [...new Set(userIds.filter((id) => Boolean(id) && allowed.has(id)))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select(INTERNAL_PROFILE_COLUMNS.join(', '))
    .in('id', ids);
  if (error) throw error;
  return (data ?? []).map((row) => internalProfileDTOSchema.parse(row));
}

export async function findInternalProfileByEmail(
  supabase: WebSupabaseClient,
  email: string,
): Promise<InternalProfileDTO | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(INTERNAL_PROFILE_COLUMNS.join(', '))
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data ? internalProfileDTOSchema.parse(data) : null;
}

export async function getAdminProfileDTO(
  supabase: WebSupabaseClient,
  userId: string,
): Promise<AdminProfileDTO | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(ADMIN_PROFILE_COLUMNS.join(', '))
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? adminProfileDTOSchema.parse(data) : null;
}

export async function updateAdminProfileFields(
  supabase: WebSupabaseClient,
  userId: string,
  fields: { name?: string; role?: string; status?: string; updated_at?: string },
): Promise<void> {
  const payload = Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => (
      ['name', 'role', 'status', 'updated_at'].includes(key) && value !== undefined
    )),
  );
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase
    .from('profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

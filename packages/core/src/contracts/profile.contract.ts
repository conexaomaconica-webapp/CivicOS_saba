import { z } from 'zod';

const nullableString = z.string().nullable();

export const profileSelfDTOSchema = z.object({
  id: z.string().uuid(),
  name: nullableString,
  email: z.string().email().nullable(),
  phone: nullableString,
  city: nullableString,
  state: nullableString,
  avatar_url: nullableString,
  terms_accepted_at: z.string().datetime({ offset: true }).nullable().optional(),
  privacy_accepted_at: z.string().datetime({ offset: true }).nullable().optional(),
}).strict();

// Perfil próprio compartilhado por Web/mobile; campos comerciais e administrativos
// não pertencem à experiência mobile de membro.
export type ProfileSelfDTO = z.infer<typeof profileSelfDTOSchema>;

export const publicMemberDTOSchema = z.object({
  public_id: z.string(),
  display_name: z.string().min(1),
  avatar_url: nullableString,
}).strict();

export type PublicMemberDTO = z.infer<typeof publicMemberDTOSchema>;

/** Server-only projection for transactional contract/e-mail composition. */
export const internalProfileDTOSchema = z.object({
  id: z.string().uuid(),
  name: nullableString,
  email: z.string().email().nullable(),
  document_number: nullableString.optional().default(null),
}).strict();

export type InternalProfileDTO = z.infer<typeof internalProfileDTOSchema>;

export const adminProfileDTOSchema = z.object({
  id: z.string().uuid(),
  name: nullableString,
  email: z.string().email().nullable(),
  role: z.string().min(1),
  status: z.string().min(1),
  tenant_id: z.string().uuid().nullable(),
  created_at: z.string().datetime({ offset: true }).nullable(),
}).strict();

export type AdminProfileDTO = z.infer<typeof adminProfileDTOSchema>;

export const profileAuthorizationDTOSchema = z.object({
  id: z.string().uuid(),
  role: z.string().min(1),
  tenant_id: z.string().uuid().nullable(),
  status: z.string().min(1),
}).strict();

export type ProfileAuthorizationDTO = z.infer<typeof profileAuthorizationDTOSchema>;

export const PROFILE_SELF_COLUMNS = [
  'id', 'name', 'email', 'phone', 'city', 'state', 'avatar_url',
  'terms_accepted_at', 'privacy_accepted_at',
] as const;

export const PROFILE_AUTHORIZATION_COLUMNS = ['id', 'role', 'tenant_id', 'status'] as const;
export const ADMIN_PROFILE_COLUMNS = ['id', 'name', 'email', 'role', 'status', 'tenant_id', 'created_at'] as const;
export const INTERNAL_PROFILE_COLUMNS = ['id', 'name', 'email'] as const;

export const PROFILE_ADMIN_UPDATE_FIELDS = ['name', 'role', 'status', 'updated_at'] as const;

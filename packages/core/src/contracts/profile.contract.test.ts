import { describe, expect, it } from 'vitest';
import { adminProfileDTOSchema, internalProfileDTOSchema, profileAuthorizationDTOSchema, profileSelfDTOSchema, publicMemberDTOSchema } from './profile.contract';

const id = '00000000-0000-0000-0000-000000000001';
const timestamp = '2026-10-14T12:00:00.000Z';

describe('profile contracts', () => {
  it('accepts only the allowlisted own-profile fields', () => {
    const result = profileSelfDTOSchema.safeParse({
      id, name: 'Eduardo', email: 'eduardo@example.com', phone: null,
      city: 'São Paulo', state: 'SP', avatar_url: null,
      terms_accepted_at: timestamp,
    });
    expect(result.success).toBe(true);
  });

  it('rejects authority fields in the own-profile DTO', () => {
    const result = profileSelfDTOSchema.safeParse({
      id, name: 'Member', email: 'member@example.com', phone: null,
      city: null, state: null, avatar_url: null, role: 'master', tenant_id: id,
    });
    expect(result.success).toBe(false);
  });

  it('keeps administrative fields separate from public member data', () => {
    expect(publicMemberDTOSchema.safeParse({ public_id: id, display_name: 'Member', avatar_url: null }).success).toBe(true);
    expect(publicMemberDTOSchema.safeParse({ public_id: id, display_name: 'Member', avatar_url: null, role: 'admin' }).success).toBe(false);
    expect(adminProfileDTOSchema.safeParse({ id, name: 'Admin', email: 'admin@example.com', role: 'admin', status: 'active', tenant_id: id, created_at: timestamp }).success).toBe(true);
    expect(profileAuthorizationDTOSchema.safeParse({ id, role: 'member', tenant_id: id, status: 'active' }).success).toBe(true);
  });

  it('keeps internal profile fields restricted to the server projection and defaults document_number to null when omitted', () => {
    const parsedWithoutDoc = internalProfileDTOSchema.safeParse({ id, name: 'Responsável', email: 'responsavel@example.com' });
    expect(parsedWithoutDoc.success).toBe(true);
    if (parsedWithoutDoc.success) {
      expect(parsedWithoutDoc.data.document_number).toBeNull();
    }
    expect(internalProfileDTOSchema.safeParse({ id, name: 'Responsável', email: 'responsavel@example.com', document_number: '12.345.678/0001-90' }).success).toBe(true);
    expect(publicMemberDTOSchema.safeParse({ public_id: id, display_name: 'Responsável', avatar_url: null, document_number: '12.345.678/0001-90' }).success).toBe(false);
  });
});

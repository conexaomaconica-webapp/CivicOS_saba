import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendSignupConfirmationEmailMock = vi.fn();
const checkRateLimitMock = vi.fn();
const getClientIpAddressMock = vi.fn();
const getAccountAdminClientMock = vi.fn();
const signUpMock = vi.fn();

vi.mock('@/lib/auth/signup-confirmation-email', () => ({
  sendSignupConfirmationEmail: (...args: unknown[]) => sendSignupConfirmationEmailMock(...args),
}));

vi.mock('@/lib/security/rate-limiter', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getClientIpAddress: (...args: unknown[]) => getClientIpAddressMock(...args),
}));

vi.mock('@/lib/auth/account-temp-password-admin', () => ({
  getAccountAdminClient: (...args: unknown[]) => getAccountAdminClientMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSideClient: async () => ({
    auth: {
      signUp: (...args: unknown[]) => signUpMock(...args),
    },
  }),
}));

import { registerMemberAction } from '../actions';

const VALID_FIELDS = {
  name: 'João Silva',
  email: 'joao@exemplo.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  city: 'Salvador',
  state: 'BA',
  acceptedTerms: true,
  acceptedPrivacy: true,
};

describe('registerMemberAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitMock.mockResolvedValue({ allowed: true });
    getClientIpAddressMock.mockResolvedValue('127.0.0.1');
    getAccountAdminClientMock.mockReturnValue(null);
  });

  it('uses branded sendSignupConfirmationEmail and skips supabase.auth.signUp on success', async () => {
    sendSignupConfirmationEmailMock.mockResolvedValue({ ok: true, userId: 'user-123' });

    const res = await registerMemberAction(VALID_FIELDS, 'tenant-1');

    expect(res).toEqual({ success: true });
    expect(sendSignupConfirmationEmailMock).toHaveBeenCalledWith(
      'joao@exemplo.com',
      'Password123!',
      expect.objectContaining({
        name: 'João Silva',
        city: 'Salvador',
        state: 'BA',
        tenant_id: 'tenant-1',
      }),
    );
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('returns friendly error when email already exists without falling back to signUp', async () => {
    sendSignupConfirmationEmailMock.mockResolvedValue({ ok: false, reason: 'already_exists' });

    const res = await registerMemberAction(VALID_FIELDS, null);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('já está cadastrado');
    }
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('falls back to supabase.auth.signUp only when own email provider is not configured', async () => {
    sendSignupConfirmationEmailMock.mockResolvedValue({ ok: false, reason: 'not_configured' });
    signUpMock.mockResolvedValue({ data: { user: { id: 'u1', identities: [{}] } }, error: null });

    const res = await registerMemberAction(VALID_FIELDS, null);

    expect(res).toEqual({ success: true });
    expect(signUpMock).toHaveBeenCalledTimes(1);
  });
});


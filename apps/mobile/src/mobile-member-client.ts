export type MobileMemberUser = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  city?: string;
  state?: string;
  avatarUrl?: string | null;
  role?: string;
};

export type MobileAuthSessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type MobileReferralBusinessSummary = {
  business_slug: string | null;
  business_name: string;
  indications: number;
  contacts: number;
  benefits: number;
  connections: number;
};

export type MobileReferralSummary = {
  total: number;
  connections: number;
  code: string | null;
  by_business: MobileReferralBusinessSummary[];
};

export type MobileMemberRedemption = {
  id: string;
  public_code: string;
  status: string;
  redeemed_at: string;
  benefit_snapshot?: {
    title?: string;
    business_name?: string;
    business_slug?: string;
  } | null;
};

export type MobileMemberOverview = {
  user: MobileMemberUser;
  stats: {
    favoritesCount: number;
    benefitsCount: number;
    referralsCount: number;
    confirmedConnectionsCount: number;
  };
  favoriteSlugs: string[];
  redemptions: MobileMemberRedemption[];
  referralsSummary: MobileReferralSummary | null;
};

export type MobileRegisterPayload = {
  name: string;
  email: string;
  city: string;
  state: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

const API_BASE = 'https://conexaomaconica.com.br/api/mobile/member';
export const MOBILE_SESSION_STORAGE_KEY = 'cm_mobile_auth_session';
export const MOBILE_USER_STORAGE_KEY = 'cm_mobile_member_user';

export function readStoredMobileSession(): MobileAuthSessionTokens | null {
  try {
    const raw = localStorage.getItem(MOBILE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MobileAuthSessionTokens>;
    if (
      typeof parsed?.accessToken === 'string' &&
      parsed.accessToken.length > 0 &&
      typeof parsed?.refreshToken === 'string' &&
      parsed.refreshToken.length > 0
    ) {
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredMobileSession(session: MobileAuthSessionTokens | null) {
  try {
    if (!session) {
      localStorage.removeItem(MOBILE_SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(MOBILE_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage errors
  }
}

export function writeStoredMobileUser(user: MobileMemberUser | null) {
  try {
    if (!user) {
      localStorage.removeItem(MOBILE_USER_STORAGE_KEY);
      localStorage.removeItem('cm_mobile_referrer_name');
    } else {
      localStorage.setItem(MOBILE_USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem('cm_mobile_referrer_name', user.name);
    }
  } catch {
    // Ignore storage errors
  }
}

async function fetchJsonWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs = 12000,
): Promise<{ status: number; data: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, cache: 'no-store', signal: controller.signal });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshMobileMemberSession(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MobileAuthSessionTokens | null> {
  try {
    const { status, data } = await fetchJsonWithTimeout(fetchImpl, `${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (status === 200 && data?.success && data.session) {
      const next = data.session as MobileAuthSessionTokens;
      writeStoredMobileSession(next);
      return next;
    }
    return null;
  } catch {
    return null;
  }
}

async function authorizedMemberFetch(
  path: string,
  session: MobileAuthSessionTokens,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: number; data: Record<string, unknown> | null; activeSession: MobileAuthSessionTokens }> {
  let activeSession = session;
  const doCall = (token: string) =>
    fetchJsonWithTimeout(fetchImpl, `${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  let res = await doCall(activeSession.accessToken);
  if (res.status === 401 && activeSession.refreshToken) {
    const refreshed = await refreshMobileMemberSession(activeSession.refreshToken, fetchImpl);
    if (refreshed) {
      activeSession = refreshed;
      res = await doCall(activeSession.accessToken);
    }
  }
  return { ...res, activeSession };
}

export async function registerMobileMember(
  payload: MobileRegisterPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<{
  success: boolean;
  needsEmailConfirmation?: boolean;
  message?: string;
  session?: MobileAuthSessionTokens | null;
  user?: MobileMemberUser | null;
  error?: string;
}> {
  try {
    const { status, data } = await fetchJsonWithTimeout(fetchImpl, `${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
      },
      body: JSON.stringify(payload),
    });
    if (status >= 200 && status < 300 && data?.success) {
      const session = (data.session as MobileAuthSessionTokens | null) ?? null;
      const user = (data.user as MobileMemberUser | null) ?? null;
      if (session && user) {
        writeStoredMobileSession(session);
        writeStoredMobileUser(user);
      }
      return {
        success: true,
        needsEmailConfirmation: Boolean(data.needsEmailConfirmation),
        message: typeof data.message === 'string' ? data.message : undefined,
        session,
        user,
      };
    }
    return {
      success: false,
      error: (data && typeof data.error === 'string' && data.error) || 'Não foi possível criar sua conta.',
    };
  } catch {
    return {
      success: false,
      error: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
    };
  }
}

export async function loginMobileMember(
  email: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{
  success: boolean;
  session?: MobileAuthSessionTokens;
  user?: MobileMemberUser;
  error?: string;
}> {
  try {
    const { status, data } = await fetchJsonWithTimeout(fetchImpl, `${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
      },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    if (status >= 200 && status < 300 && data?.success && data.session && data.user) {
      const session = data.session as MobileAuthSessionTokens;
      const user = data.user as MobileMemberUser;
      writeStoredMobileSession(session);
      writeStoredMobileUser(user);
      return { success: true, session, user };
    }

    return {
      success: false,
      error: (data && typeof data.error === 'string' && data.error) || 'E-mail ou senha incorretos.',
    };
  } catch {
    return {
      success: false,
      error: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
    };
  }
}

export async function requestMobilePasswordReset(
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { status, data } = await fetchJsonWithTimeout(fetchImpl, `${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    if (status >= 200 && status < 300 && data?.success) {
      return {
        success: true,
        message: typeof data.message === 'string' ? data.message : 'E-mail de recuperação enviado.',
      };
    }
    return {
      success: false,
      error: (data && typeof data.error === 'string' && data.error) || 'Erro ao solicitar recuperação.',
    };
  } catch {
    return { success: false, error: 'Falha de conexão com o servidor.' };
  }
}

export async function fetchMobileMemberOverview(
  session: MobileAuthSessionTokens,
  fetchImpl: typeof fetch = fetch,
): Promise<{ success: boolean; overview?: MobileMemberOverview; error?: string; unauthorized?: boolean }> {
  try {
    const { status, data } = await authorizedMemberFetch('/overview', session, { method: 'GET' }, fetchImpl);
    if (status === 401) {
      return { success: false, unauthorized: true, error: 'Sessão expirada. Faça login novamente.' };
    }
    if (status >= 200 && status < 300 && data?.success && data.user) {
      return {
        success: true,
        overview: {
          user: data.user as MobileMemberUser,
          stats: data.stats as MobileMemberOverview['stats'],
          favoriteSlugs: Array.isArray(data.favoriteSlugs) ? (data.favoriteSlugs as string[]) : [],
          redemptions: Array.isArray(data.redemptions) ? (data.redemptions as MobileMemberRedemption[]) : [],
          referralsSummary: (data.referralsSummary as MobileReferralSummary | null) ?? null,
        },
      };
    }
    return {
      success: false,
      error: (data && typeof data.error === 'string' && data.error) || 'Não foi possível carregar sua conta.',
    };
  } catch {
    return { success: false, error: 'Sem conexão com o servidor.' };
  }
}

export async function updateMobileMemberProfile(
  session: MobileAuthSessionTokens,
  patch: { name: string; phone: string; city: string; state: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ success: boolean; user?: MobileMemberUser; error?: string }> {
  try {
    const { status, data } = await authorizedMemberFetch(
      '/overview',
      session,
      { method: 'PATCH', body: JSON.stringify(patch) },
      fetchImpl,
    );
    if (status >= 200 && status < 300 && data?.success && data.user) {
      const updated = data.user as MobileMemberUser;
      writeStoredMobileUser(updated);
      return { success: true, user: updated };
    }
    return {
      success: false,
      error: (data && typeof data.error === 'string' && data.error) || 'Erro ao atualizar perfil.',
    };
  } catch {
    return { success: false, error: 'Falha de conexão com o servidor.' };
  }
}

export async function changeMobileMemberPassword(
  session: MobileAuthSessionTokens,
  payload: { currentPassword: string; newPassword: string; confirmPassword: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { status, data } = await authorizedMemberFetch(
      '/password',
      session,
      { method: 'POST', body: JSON.stringify(payload) },
      fetchImpl,
    );
    if (status >= 200 && status < 300 && data?.success) {
      return { success: true };
    }
    return {
      success: false,
      error: (data && typeof data.error === 'string' && data.error) || 'Não foi possível alterar a senha.',
    };
  } catch {
    return { success: false, error: 'Falha de conexão com o servidor.' };
  }
}

export async function syncMobileFavoritesRemote(
  session: MobileAuthSessionTokens,
  slugs: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<string[] | null> {
  try {
    const { status, data } = await authorizedMemberFetch(
      '/favorites',
      session,
      { method: 'POST', body: JSON.stringify({ mode: 'sync', slugs }) },
      fetchImpl,
    );
    if (status >= 200 && status < 300 && data?.success && Array.isArray(data.slugs)) {
      return data.slugs as string[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function toggleMobileFavoriteRemote(
  session: MobileAuthSessionTokens,
  slug: string,
  favorite: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  try {
    await authorizedMemberFetch(
      '/favorites',
      session,
      { method: 'POST', body: JSON.stringify({ mode: 'toggle', slug, favorite }) },
      fetchImpl,
    );
  } catch {
    // Fallback remains saved in localStorage
  }
}

export async function clearMobileFavoritesRemote(
  session: MobileAuthSessionTokens,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  try {
    await authorizedMemberFetch(
      '/favorites',
      session,
      { method: 'POST', body: JSON.stringify({ mode: 'clear' }) },
      fetchImpl,
    );
  } catch {
    // Ignore network error
  }
}

export async function deleteMobileMemberAccountRemote(
  session: MobileAuthSessionTokens,
  fetchImpl: typeof fetch = fetch,
): Promise<{ success: boolean; reason?: string; message: string }> {
  try {
    const { status, data } = await authorizedMemberFetch(
      '/account/delete',
      session,
      { method: 'POST', body: JSON.stringify({}) },
      fetchImpl,
    );
    if (status >= 200 && status < 300 && data?.success) {
      return {
        success: true,
        reason: 'success',
        message:
          (typeof data.message === 'string' && data.message) ||
          'Sua conta e suas credenciais foram excluídas permanentemente.',
      };
    }
    return {
      success: false,
      reason: typeof data?.reason === 'string' ? data.reason : 'server_error',
      message:
        (data && typeof data.error === 'string' && data.error) ||
        'Não foi possível concluir a exclusão da conta.',
    };
  } catch {
    return {
      success: false,
      reason: 'network_error',
      message: 'Falha de comunicação com o servidor. Sua conta não foi excluída.',
    };
  }
}


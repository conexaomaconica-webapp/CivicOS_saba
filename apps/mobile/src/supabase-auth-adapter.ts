import type { MobileAuthProvider, MobileSession } from './mobile-auth';

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string };
};

interface SupabaseAuthLike {
  signInWithPassword(input: { email: string; password: string }): Promise<{ data: { session: SupabaseSession | null }; error: Error | null }>;
  refreshSession(): Promise<{ data: { session: SupabaseSession | null }; error: Error | null }>;
  getSession(): Promise<{ data: { session: SupabaseSession | null }; error: Error | null }>;
  signOut(options?: { scope?: 'local' | 'global' | 'others' }): Promise<{ error: Error | null }>;
  onAuthStateChange(callback: (event: string, session: SupabaseSession | null) => void): { data: { subscription: { unsubscribe(): void } } };
}

function mapSession(session: SupabaseSession | null): MobileSession | null {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
    userId: session.user.id,
  };
}

/**
 * Adapter for a browser/Capacitor Supabase client. The client is injected so
 * tests never need production credentials and the app cannot obtain a
 * service_role client accidentally.
 */
export function createSupabaseMobileAuthProvider(client: { auth: SupabaseAuthLike }): MobileAuthProvider {
  return {
    async signInWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const session = mapSession(data.session);
      if (!session) throw new Error('authentication-session-missing');
      return session;
    },
    async refreshSession() {
      const { data, error } = await client.auth.refreshSession();
      if (error) throw error;
      const session = mapSession(data.session);
      if (!session) throw new Error('refresh-session-missing');
      return session;
    },
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return mapSession(data.session);
    },
    async signOut() {
      // Local logout must not revoke sessions on other devices.
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => callback(mapSession(session)));
      return () => data.subscription.unsubscribe();
    },
  };
}


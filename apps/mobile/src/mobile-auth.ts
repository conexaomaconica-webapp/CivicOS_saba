import { evaluateMobileMemberAccess, type MobileAccessContext, type MobileAccessDecision } from './member-access';

export interface MobileSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly userId: string;
}

export interface MobileAuthProvider {
  signInWithPassword(email: string, password: string): Promise<MobileSession>;
  refreshSession(): Promise<MobileSession>;
  signOut(): Promise<void>;
  getSession(): Promise<MobileSession | null>;
  onAuthStateChange(callback: (session: MobileSession | null) => void): () => void;
}

export interface SecureSessionStore {
  read(): Promise<MobileSession | null>;
  write(session: MobileSession): Promise<void>;
  clear(): Promise<void>;
}

export type MobileAuthState =
  | { readonly status: 'signed-out' }
  | { readonly status: 'loading' }
  | { readonly status: 'signed-in'; readonly session: MobileSession; readonly access: MobileAccessDecision }
  | { readonly status: 'indeterminate'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };

export function parseAuthCallback(url: string): { code: string } | { error: string } | null {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    if (code) return { code };
    const error = parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error');
    return error ? { error } : null;
  } catch {
    return { error: 'invalid-auth-callback' };
  }
}

export class MobileAuthController {
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly provider: MobileAuthProvider,
    private readonly store: SecureSessionStore,
    private readonly resolveAccess: (session: MobileSession) => Promise<MobileAccessContext>,
  ) {}

  async restore(): Promise<MobileAuthState> {
    const session = await this.store.read();
    if (!session) return { status: 'signed-out' };
    return this.acceptSession(session);
  }

  async signIn(email: string, password: string): Promise<MobileAuthState> {
    try {
      const session = await this.provider.signInWithPassword(email, password);
      return this.acceptSession(session);
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'authentication-failed' };
    }
  }

  async signOut(): Promise<MobileAuthState> {
    await this.provider.signOut();
    await this.store.clear();
    return { status: 'signed-out' };
  }

  subscribe(onState: (state: MobileAuthState) => void): () => void {
    this.unsubscribe?.();
    this.unsubscribe = this.provider.onAuthStateChange((session) => {
      if (!session) {
        void this.store.clear();
        onState({ status: 'signed-out' });
        return;
      }
      void this.acceptSession(session).then(onState);
    });
    return () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
    };
  }

  private async acceptSession(session: MobileSession): Promise<MobileAuthState> {
    // Authentication and authorization are independent. Keep a valid
    // session in secure storage while authorization is temporarily offline.
    await this.store.write(session);
    let context: MobileAccessContext;
    try {
      context = await this.resolveAccess(session);
    } catch (error) {
      return { status: 'indeterminate', message: error instanceof Error ? error.message : 'authorization-unavailable' };
    }
    const access = evaluateMobileMemberAccess(context);
    if (!access.allowed) {
      await this.store.clear();
      return { status: 'error', message: `mobile-access-denied:${access.reason}` };
    }
    return { status: 'signed-in', session, access };
  }
}

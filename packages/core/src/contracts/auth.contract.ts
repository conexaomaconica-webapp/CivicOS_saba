// ============================================================================
// Auth Contract — Core Kernel
// ============================================================================
// Defines the authentication interfaces that auth plugins must implement.
// The Core never knows HOW auth works — only WHAT it provides.
// ============================================================================

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface User {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly emailVerified: boolean;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface Session {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number; // Unix timestamp
  readonly user: User;
  readonly tenantId: string | null;
}

// ---------------------------------------------------------------------------
// Auth Credentials
// ---------------------------------------------------------------------------

export interface EmailPasswordCredentials {
  readonly type: 'email-password';
  readonly email: string;
  readonly password: string;
}

export interface OAuthCredentials {
  readonly type: 'oauth';
  readonly provider: string; // "google", "github", etc.
  readonly redirectUrl?: string;
}

export interface MagicLinkCredentials {
  readonly type: 'magic-link';
  readonly email: string;
  readonly redirectUrl?: string;
}

export type AuthCredentials =
  | EmailPasswordCredentials
  | OAuthCredentials
  | MagicLinkCredentials;

// ---------------------------------------------------------------------------
// Auth Provider
// ---------------------------------------------------------------------------

export interface AuthProvider {
  /** Sign in with the given credentials. */
  signIn(credentials: AuthCredentials): Promise<Session>;

  /** Sign up a new user. */
  signUp(credentials: EmailPasswordCredentials): Promise<Session>;

  /** Sign out the current session. */
  signOut(): Promise<void>;

  /** Get the current session, or null if not authenticated. */
  getSession(): Promise<Session | null>;

  /** Refresh the current session. */
  refreshSession(): Promise<Session>;

  /** Send a password reset email. */
  resetPassword(email: string): Promise<void>;

  /** Update the password for the current user. */
  updatePassword(newPassword: string): Promise<void>;

  /** Subscribe to auth state changes. */
  onAuthStateChange(
    callback: (event: AuthEvent, session: Session | null) => void,
  ): () => void;
}

// ---------------------------------------------------------------------------
// Auth Events
// ---------------------------------------------------------------------------

export type AuthEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY';

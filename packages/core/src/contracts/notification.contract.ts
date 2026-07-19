// ============================================================================
// Notification Contract — Core Kernel
// ============================================================================
// Defines notification channel interfaces. Plugins can implement different
// delivery channels (email, push, in-app, SMS) behind a unified API.
// ============================================================================

// ---------------------------------------------------------------------------
// Notification Payload
// ---------------------------------------------------------------------------

export interface NotificationPayload {
  readonly id?: string;
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, unknown>;
  readonly imageUrl?: string;
  readonly actionUrl?: string;
  readonly priority?: 'low' | 'normal' | 'high' | 'critical';
  readonly tags?: readonly string[];
}

// ---------------------------------------------------------------------------
// Notification Channel
// ---------------------------------------------------------------------------

export type ChannelType = 'email' | 'push' | 'in-app' | 'sms' | 'webhook';

export interface NotificationChannel {
  /** Unique channel type identifier. */
  readonly type: ChannelType;

  /** Human-readable name. */
  readonly name: string;

  /** Whether this channel is currently available. */
  isAvailable(): Promise<boolean>;

  /** Send a notification to a single recipient. */
  send(
    recipientId: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult>;

  /** Send a notification to multiple recipients. */
  sendBulk(
    recipientIds: string[],
    payload: NotificationPayload,
  ): Promise<NotificationResult[]>;
}

// ---------------------------------------------------------------------------
// Notification Result
// ---------------------------------------------------------------------------

export interface NotificationResult {
  readonly success: boolean;
  readonly channelType: ChannelType;
  readonly recipientId: string;
  readonly messageId?: string;
  readonly error?: string;
  readonly sentAt: Date;
}

// ---------------------------------------------------------------------------
// Notification Preferences
// ---------------------------------------------------------------------------

export interface NotificationPreferences {
  /** Get user's channel preferences. */
  getPreferences(userId: string): Promise<ChannelPreference[]>;

  /** Update user's preference for a channel. */
  setPreference(
    userId: string,
    channelType: ChannelType,
    enabled: boolean,
  ): Promise<void>;
}

export interface ChannelPreference {
  readonly channelType: ChannelType;
  readonly enabled: boolean;
  readonly updatedAt: Date;
}

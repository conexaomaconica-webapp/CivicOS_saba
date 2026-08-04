// Masonic Badges Capability - Implementation details

export interface BusinessBadge {
  code: string;
  name: string;
  description?: string;
  icon_url?: string;
  status: 'verified' | 'pending' | 'rejected' | 'expired' | 'revoked';
  issued_at?: string;
  expires_at?: string;
  is_founder: boolean;
  founder_number?: number;
}

export const MasonicBadgesAPI = {
  getBusinessBadges: 'masonic-badges:getBusinessBadges',
  getBadgeDefinitions: 'masonic-badges:getBadgeDefinitions',
  getBadgeDisplayData: 'masonic-badges:getBadgeDisplayData'
} as const;

export type MasonicBadgesMethod = typeof MasonicBadgesAPI[keyof typeof MasonicBadgesAPI];
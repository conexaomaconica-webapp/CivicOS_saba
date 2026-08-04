// Masonic Search Capability - Implementation details

export interface SearchBusinessesParams {
  query?: string;
  category_ids?: string[];
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  company_types?: ('commercial' | 'masonic_store' | 'service_provider' | 'non_profit' | 'event_supplier' | 'educational_service')[];
  verification_status?: 'verified' | 'pending' | 'none';
  is_founder?: boolean;
  plan_tiers?: ('bronze' | 'prata' | 'ouro')[];
  sort_by?: 'relevance' | 'distance' | 'rating' | 'newest' | 'plan_tier';
  page?: number;
  per_page?: number;
}

export interface SearchWeights {
  name: number;
  description: number;
  category: number;
  tags: number;
  location: number;
  verification_status: number;
  founder_status: number;
  plan_tier: number;
  review_score: number;
  review_count: number;
}

export const DEFAULT_MASONIC_SEARCH_WEIGHTS: SearchWeights = {
  name: 10,
  description: 5,
  category: 8,
  tags: 6,
  location: 7,
  verification_status: 15,
  founder_status: 12,
  plan_tier: 8,
  review_score: 5,
  review_count: 3
};

export const MasonicSearchAPI = {
  searchBusinesses: 'masonic-search:searchBusinesses',
  getSearchWeights: 'masonic-search:getSearchWeights',
  updateSearchWeights: 'masonic-search:updateSearchWeights',
  getContentCategories: 'masonic-search:getContentCategories'
} as const;

export type MasonicSearchMethod = typeof MasonicSearchAPI[keyof typeof MasonicSearchAPI];
export interface DirectoryCategory {
  id: string;
  label: string;
  icon: string;
}

export interface FeaturedBusiness {
  id: string;
  name: string;
  category: string;
  description?: string;
  rating?: number;
}

export interface CommunityDirectoryTenantConfig {
  tenantId: string;
  name: string;
  headline: string;
  categories: DirectoryCategory[];
  featuredBusinesses: FeaturedBusiness[];
}

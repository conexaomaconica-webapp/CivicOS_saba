import type { Database as OriginalDatabase, Json } from './database.types';

export type CustomTables = {
  business_profiles: {
    Row: {
      id: string;
      tenant_id: string;
      owner_id: string;
      name: string;
      slug: string | null;
      plan_code: string;
      publication_status: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      owner_id: string;
      name: string;
      slug?: string | null;
      plan_code?: string;
      publication_status?: string;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      owner_id?: string;
      name?: string;
      slug?: string | null;
      plan_code?: string;
      publication_status?: string;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  business_reviews: {
    Row: {
      id: string;
      tenant_id: string;
      business_id: string;
      author_id: string;
      rating: number;
      comment: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      business_id: string;
      author_id: string;
      rating: number;
      comment?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      business_id?: string;
      author_id?: string;
      rating?: number;
      comment?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  plan_entitlements: {
    Row: {
      id: string;
      tenant_id: string;
      plan_code: string;
      feature_code: string;
      max_limit: number;
      created_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      plan_code: string;
      feature_code: string;
      max_limit: number;
      created_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      plan_code?: string;
      feature_code?: string;
      max_limit?: number;
      created_at?: string;
    };
    Relationships: [];
  };
  admin_audit_logs: {
    Row: {
      id: string;
      tenant_id: string;
      admin_user_id: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      before_state: Json;
      after_state: Json;
      justification: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      admin_user_id: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      before_state?: Json;
      after_state?: Json;
      justification?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      admin_user_id?: string;
      action_type?: string;
      entity_type?: string;
      entity_id?: string;
      before_state?: Json;
      after_state?: Json;
      justification?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  business_events: {
    Row: {
      id: string;
      tenant_id: string;
      business_id: string;
      title: string;
      description: string | null;
      cover_image_url: string | null;
      starts_at: string;
      ends_at: string | null;
      timezone: string;
      location_name: string | null;
      address: string | null;
      external_ticket_url: string | null;
      publication_status: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      business_id: string;
      title: string;
      description?: string | null;
      cover_image_url?: string | null;
      starts_at: string;
      ends_at?: string | null;
      timezone: string;
      location_name?: string | null;
      address?: string | null;
      external_ticket_url?: string | null;
      publication_status?: string;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      business_id?: string;
      title?: string;
      description?: string | null;
      cover_image_url?: string | null;
      starts_at?: string;
      ends_at?: string | null;
      timezone?: string;
      location_name?: string | null;
      address?: string | null;
      external_ticket_url?: string | null;
      publication_status?: string;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  business_posts: {
    Row: {
      id: string;
      tenant_id: string;
      business_id: string;
      title: string;
      summary: string | null;
      content: string;
      cover_image_url: string | null;
      publication_status: string;
      published_at: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      business_id: string;
      title: string;
      summary?: string | null;
      content: string;
      cover_image_url?: string | null;
      publication_status?: string;
      published_at?: string;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      business_id?: string;
      title?: string;
      summary?: string | null;
      content?: string;
      cover_image_url?: string | null;
      publication_status?: string;
      published_at?: string;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
};

export type CustomFunctions = {
  update_plan_entitlement_quota: {
    Args: {
      p_tenant_id: string;
      p_entitlement_id: string;
      p_services_limit: number;
      p_benefits_limit?: number;
      p_gallery_limit?: number;
      p_reason?: string;
    };
    Returns: Json;
  };
  moderate_business_publication_status: {
    Args: {
      p_tenant_id: string;
      p_business_id: string;
      p_new_status: string;
      p_reason?: string;
    };
    Returns: Json;
  };
  allocate_founder_status: {
    Args: {
      p_tenant_id: string;
      p_business_id: string;
      p_is_founder: boolean;
      p_reason?: string;
    };
    Returns: Json;
  };
  get_business_rating_summary: {
    Args: {
      p_tenant_id: string;
      p_business_id: string;
    };
    Returns: Json;
  };
  get_public_business_events: {
    Args: {
      p_tenant_id: string;
      p_business_id: string;
      p_limit?: number;
      p_offset?: number;
    };
    Returns: Json[];
  };
  get_public_business_posts: {
    Args: {
      p_tenant_id: string;
      p_business_id: string;
      p_limit?: number;
      p_offset?: number;
    };
    Returns: Json[];
  };
};

export type AppDatabase = Omit<OriginalDatabase, 'public'> & {
  public: Omit<OriginalDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: Omit<OriginalDatabase['public']['Tables'], 'business_reviews'> & CustomTables;
    Functions: OriginalDatabase['public']['Functions'] & CustomFunctions;
  };
};

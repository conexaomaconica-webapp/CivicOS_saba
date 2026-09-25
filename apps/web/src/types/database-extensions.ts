import type { Database as OriginalDatabase, Json } from './database.types';

// ---------------------------------------------------------------------------
// RSVP / Platform Events — Domain Types
// ---------------------------------------------------------------------------
export type AttendeeType = 'macom' | 'cunhada' | 'familiar' | 'convidado';
export type AttendanceStatus = 'confirmed' | 'declined';
export type EventStatus = 'draft' | 'published' | 'canceled' | 'archived';

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
      moderation_status: string;
      moderated_by: string | null;
      moderated_at: string | null;
      moderation_reason: string | null;
      business_response: string | null;
      responded_by: string | null;
      responded_at: string | null;
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
      moderation_status?: string;
      moderated_by?: string | null;
      moderated_at?: string | null;
      moderation_reason?: string | null;
      business_response?: string | null;
      responded_by?: string | null;
      responded_at?: string | null;
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
      moderation_status?: string;
      moderated_by?: string | null;
      moderated_at?: string | null;
      moderation_reason?: string | null;
      business_response?: string | null;
      responded_by?: string | null;
      responded_at?: string | null;
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
  business_benefits: {
    Row: {
      id: string;
      tenant_id: string;
      business_id: string;
      title: string;
      description: string;
      short_description: string | null;
      benefit_type: string;
      cta_type: string;
      discount_percentage: number | null;
      discount_amount: number | null;
      original_price: number | null;
      offer_price: number | null;
      discount_code: string | null;
      badge_text: string | null;
      cta_label: string | null;
      whatsapp_message_template: string | null;
      external_url: string | null;
      redeem_instructions: string | null;
      max_redemptions: number | null;
      max_redemptions_per_user: number | null;
      minimum_purchase: number | null;
      is_cumulative: boolean;
      terms: string | null;
      instructions: string | null;
      image_url: string | null;
      valid_from: string | null;
      valid_until: string | null;
      status: 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'exhausted' | 'archived' | string;
      is_active: boolean;
      display_order: number;
      archived_at: string | null;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      business_id: string;
      title: string;
      description: string;
      short_description?: string | null;
      benefit_type?: string;
      cta_type?: string;
      discount_percentage?: number | null;
      discount_amount?: number | null;
      original_price?: number | null;
      offer_price?: number | null;
      discount_code?: string | null;
      badge_text?: string | null;
      cta_label?: string | null;
      whatsapp_message_template?: string | null;
      external_url?: string | null;
      redeem_instructions?: string | null;
      max_redemptions?: number | null;
      max_redemptions_per_user?: number | null;
      minimum_purchase?: number | null;
      is_cumulative?: boolean;
      terms?: string | null;
      instructions?: string | null;
      image_url?: string | null;
      valid_from?: string | null;
      valid_until?: string | null;
      status?: string;
      is_active?: boolean;
      display_order?: number;
      archived_at?: string | null;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      business_id?: string;
      title?: string;
      description?: string;
      short_description?: string | null;
      benefit_type?: string;
      cta_type?: string;
      discount_percentage?: number | null;
      discount_amount?: number | null;
      original_price?: number | null;
      offer_price?: number | null;
      discount_code?: string | null;
      badge_text?: string | null;
      cta_label?: string | null;
      whatsapp_message_template?: string | null;
      external_url?: string | null;
      redeem_instructions?: string | null;
      max_redemptions?: number | null;
      max_redemptions_per_user?: number | null;
      minimum_purchase?: number | null;
      is_cumulative?: boolean;
      terms?: string | null;
      instructions?: string | null;
      image_url?: string | null;
      valid_from?: string | null;
      valid_until?: string | null;
      status?: string;
      is_active?: boolean;
      display_order?: number;
      archived_at?: string | null;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  business_benefit_redemptions: {
    Row: {
      id: string;
      tenant_id: string;
      business_id: string;
      benefit_id: string;
      user_id: string;
      public_code: string;
      status: 'redeemed' | 'used' | 'expired' | 'cancelled' | string;
      redeemed_at: string;
      expires_at: string | null;
      used_at: string | null;
      used_confirmed_by: string | null;
      sale_amount: number | null;
      cancelled_at: string | null;
      benefit_snapshot: Json;
      idempotency_key: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      business_id: string;
      benefit_id: string;
      user_id: string;
      public_code: string;
      status?: string;
      redeemed_at?: string;
      expires_at?: string | null;
      used_at?: string | null;
      used_confirmed_by?: string | null;
      sale_amount?: number | null;
      cancelled_at?: string | null;
      benefit_snapshot: Json;
      idempotency_key?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      business_id?: string;
      benefit_id?: string;
      user_id?: string;
      public_code?: string;
      status?: string;
      redeemed_at?: string;
      expires_at?: string | null;
      used_at?: string | null;
      used_confirmed_by?: string | null;
      sale_amount?: number | null;
      cancelled_at?: string | null;
      benefit_snapshot?: Json;
      idempotency_key?: string | null;
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
  record_business_analytics_event: {
    Args: {
      p_tenant_id: string;
      p_business_id: string;
      p_event_type: string;
      p_visitor_hmac: string;
      p_referrer?: string | null;
    };
    Returns: boolean;
  };
  get_business_analytics_summary: {
    Args: {
      p_tenant_id: string;
      p_business_id: string;
      p_days?: number;
    };
    Returns: Json[];
  };
  // ----- Events RPCs -------------------------------------------------------
  get_platform_event_by_slug: {
    Args: { p_slug: string };
    Returns: Array<{
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      description: string | null;
      event_date: string;
      start_time: string;
      end_time: string | null;
      timezone: string;
      venue_name: string | null;
      venue_address: string | null;
      city: string | null;
      cover_image_url: string | null;
      registration_enabled: boolean;
      capacity: number | null;
    }>;
  };
  upsert_event_registration: {
    Args: {
      p_event_id: string;
      p_full_name: string;
      p_whatsapp: string;
      p_email?: string | null;
      p_attendee_type?: string;
      p_masonic_organization?: string | null;
      p_company_name?: string | null;
      p_city?: string | null;
      p_attendance_status?: string;
      p_source?: string | null;
      p_utm_source?: string | null;
      p_utm_medium?: string | null;
      p_utm_campaign?: string | null;
    };
    Returns: Array<{
      registration_id: string;
      confirmation_code: string;
      is_new: boolean;
      full_name: string;
      attendance_status: string;
    }>;
  };
  admin_list_platform_events: {
    Args: Record<string, never>;
    Returns: Array<{
      id: string;
      slug: string;
      title: string;
      event_date: string;
      start_time: string;
      venue_name: string | null;
      city: string | null;
      status: string;
      registration_enabled: boolean;
      capacity: number | null;
      total_registrations: number;
      total_confirmed: number;
      total_checkins: number;
      created_at: string;
    }>;
  };
  admin_get_event_dashboard: {
    Args: { p_event_id: string };
    Returns: Array<{
      total_registrations: number;
      total_confirmed: number;
      total_declined: number;
      total_checkins: number;
      by_attendee_type: Json;
      by_source: Json;
    }>;
  };
  admin_list_event_registrations: {
    Args: {
      p_event_id: string;
      p_search?: string | null;
      p_attendance_status?: string | null;
      p_attendee_type?: string | null;
      p_city?: string | null;
      p_source?: string | null;
      p_limit?: number;
      p_offset?: number;
      p_has_checkin?: boolean | null;
    };
    Returns: Array<{
      id: string;
      full_name: string;
      whatsapp: string;
      email: string | null;
      attendee_type: string;
      masonic_organization: string | null;
      company_name: string | null;
      city: string | null;
      attendance_status: string;
      confirmation_code: string;
      source: string | null;
      utm_source: string | null;
      utm_campaign: string | null;
      checked_in_at: string | null;
      created_at: string;
      total_count: number;
      checkin_token: string;
    }>;
  };
  admin_checkin_registration: {
    Args: { p_registration_id: string };
    Returns: Array<{
      registration_id: string;
      full_name: string;
      confirmation_code: string;
      checked_in_at: string;
      already_checked: boolean;
    }>;
  };
  admin_undo_checkin_registration: {
    Args: { p_registration_id: string };
    Returns: Array<{
      registration_id: string;
      full_name: string;
      confirmation_code: string;
      success: boolean;
    }>;
  };
  admin_get_registration_by_token: {
    Args: { p_event_id: string; p_token: string };
    Returns: Array<{
      id: string;
      full_name: string;
      whatsapp: string;
      email: string | null;
      attendee_type: string;
      masonic_organization: string | null;
      company_name: string | null;
      city: string | null;
      attendance_status: string;
      confirmation_code: string;
      checked_in_at: string | null;
      checkin_token: string;
    }>;
  };
};

// ----- platform_events table type ------------------------------------------
type PlatformEventTables = {
  platform_events: {
    Row: {
      id: string;
      tenant_id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      description: string | null;
      event_date: string;
      start_time: string;
      end_time: string | null;
      timezone: string;
      venue_name: string | null;
      venue_address: string | null;
      city: string | null;
      cover_image_url: string | null;
      status: EventStatus;
      registration_enabled: boolean;
      capacity: number | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      slug: string;
      title: string;
      subtitle?: string | null;
      description?: string | null;
      event_date: string;
      start_time: string;
      end_time?: string | null;
      timezone?: string;
      venue_name?: string | null;
      venue_address?: string | null;
      city?: string | null;
      cover_image_url?: string | null;
      status?: EventStatus;
      registration_enabled?: boolean;
      capacity?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      slug?: string;
      title?: string;
      subtitle?: string | null;
      description?: string | null;
      event_date?: string;
      start_time?: string;
      end_time?: string | null;
      timezone?: string;
      venue_name?: string | null;
      venue_address?: string | null;
      city?: string | null;
      cover_image_url?: string | null;
      status?: EventStatus;
      registration_enabled?: boolean;
      capacity?: number | null;
      updated_at?: string;
    };
    Relationships: [];
  };
  event_registrations: {
    Row: {
      id: string;
      event_id: string;
      tenant_id: string;
      full_name: string;
      whatsapp: string;
      email: string | null;
      attendee_type: AttendeeType;
      masonic_organization: string | null;
      company_name: string | null;
      city: string | null;
      attendance_status: AttendanceStatus;
      confirmation_code: string;
      checkin_token: string;
      source: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      checked_in_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      event_id: string;
      tenant_id: string;
      full_name: string;
      whatsapp: string;
      email?: string | null;
      attendee_type?: AttendeeType;
      masonic_organization?: string | null;
      company_name?: string | null;
      city?: string | null;
      attendance_status?: AttendanceStatus;
      confirmation_code: string;
      checkin_token?: string;
      source?: string | null;
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      checked_in_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      full_name?: string;
      email?: string | null;
      attendee_type?: AttendeeType;
      masonic_organization?: string | null;
      company_name?: string | null;
      city?: string | null;
      attendance_status?: AttendanceStatus;
      source?: string | null;
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      checked_in_at?: string | null;
      updated_at?: string;
    };
    Relationships: [];
  };
};

export type AppDatabase = Omit<OriginalDatabase, 'public'> & {
  public: Omit<OriginalDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: Omit<OriginalDatabase['public']['Tables'], 'business_reviews'> & CustomTables & PlatformEventTables;
    Functions: OriginalDatabase['public']['Functions'] & CustomFunctions;
  };
};

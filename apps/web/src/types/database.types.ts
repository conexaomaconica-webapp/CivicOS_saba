export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      acceptance_records: {
        Row: {
          accepted_at: string
          content_hash: string | null
          document_version_id: string
          evidence_metadata: Json
          id: string
          session_evidence_id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          content_hash?: string | null
          document_version_id: string
          evidence_metadata?: Json
          id?: string
          session_evidence_id: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          content_hash?: string | null
          document_version_id?: string
          evidence_metadata?: Json
          id?: string
          session_evidence_id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acceptance_records_document_version_id_fkey"
            columns: ["document_version_id"]
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acceptance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          business_id: string | null
          created_at: string
          event_name: string
          id: string
          metadata: Json
          pseudonymous_subject_id: string | null
          tenant_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          pseudonymous_subject_id?: string | null
          tenant_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          pseudonymous_subject_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          content_markdown: string
          created_at: string
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          tenant_id: string
          title: string
        }
        Insert: {
          author_id?: string | null
          content_markdown: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          tenant_id: string
          title: string
        }
        Update: {
          author_id?: string | null
          content_markdown?: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          resource: string | null
          session_evidence_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          resource?: string | null
          session_evidence_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          resource?: string | null
          session_evidence_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          created_at: string
          end_at: string | null
          id: string
          image_url: string
          is_active: boolean
          position: string
          start_at: string
          target_url: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          end_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          position?: string
          start_at?: string
          target_url?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          end_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          position?: string
          start_at?: string
          target_url?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_attributes: {
        Row: {
          attribute_key: string
          attribute_value: string
          business_id: string
          created_at: string
          id: string
          tenant_id: string
        }
        Insert: {
          attribute_key: string
          attribute_value: string
          business_id: string
          created_at?: string
          id?: string
          tenant_id: string
        }
        Update: {
          attribute_key?: string
          attribute_value?: string
          business_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bus_attr_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_banners: {
        Row: {
          business_id: string
          clicks: number | null
          created_at: string
          id: string
          image_url: string
          impressions: number | null
          is_active: boolean | null
          target_url: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          clicks?: number | null
          created_at?: string
          id?: string
          image_url: string
          impressions?: number | null
          is_active?: boolean | null
          target_url?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          clicks?: number | null
          created_at?: string
          id?: string
          image_url?: string
          impressions?: number | null
          is_active?: boolean | null
          target_url?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_banners_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_banners_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          business_id: string
          category_id: string
          is_primary: boolean
          tenant_id: string
        }
        Insert: {
          business_id: string
          category_id: string
          is_primary?: boolean
          tenant_id: string
        }
        Update: {
          business_id?: string
          category_id?: string
          is_primary?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_categories_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bus_cat_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_contacts: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_public: boolean
          label: string | null
          tenant_id: string
          type: string
          value: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_public?: boolean
          label?: string | null
          tenant_id: string
          type: string
          value: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_public?: boolean
          label?: string | null
          tenant_id?: string
          type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bus_contacts_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_favorites: {
        Row: {
          business_id: string
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_favorites_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string | null
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string | null
          tenant_id: string
        }
        Insert: {
          business_id: string
          close_time?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          tenant_id: string
        }
        Update: {
          business_id?: string
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bus_hours_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_locations: {
        Row: {
          business_id: string
          city: string
          complement: string | null
          country: string
          created_at: string
          id: string
          is_headquarters: boolean
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          number: string | null
          postal_code: string
          state: string
          street: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          city: string
          complement?: string | null
          country?: string
          created_at?: string
          id?: string
          is_headquarters?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          postal_code: string
          state: string
          street: string
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          city?: string
          complement?: string | null
          country?: string
          created_at?: string
          id?: string
          is_headquarters?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          postal_code?: string
          state?: string
          street?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bus_loc_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_masonic_link_authorizations: {
        Row: {
          authorization_scope: string
          authorization_type: string
          authorized_by_name: string
          authorized_by_role: string
          evidence_reference_id: string | null
          granted_at: string
          id: string
          link_id: string
          revocation_reason: string | null
          revoked_at: string | null
          status: string
          tenant_id: string
          valid_until: string | null
        }
        Insert: {
          authorization_scope: string
          authorization_type: string
          authorized_by_name: string
          authorized_by_role: string
          evidence_reference_id?: string | null
          granted_at?: string
          id?: string
          link_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          status?: string
          tenant_id: string
          valid_until?: string | null
        }
        Update: {
          authorization_scope?: string
          authorization_type?: string
          authorized_by_name?: string
          authorized_by_role?: string
          evidence_reference_id?: string | null
          granted_at?: string
          id?: string
          link_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          status?: string
          tenant_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_masonic_link_authorizations_evidence_reference_id_fkey"
            columns: ["evidence_reference_id"]
            referencedRelation: "business_masonic_link_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_masonic_link_authorizations_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bmla_link"
            columns: ["tenant_id", "link_id"]
            referencedRelation: "business_masonic_links"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_masonic_link_contests: {
        Row: {
          appeal_status: string | null
          appealed_at: string | null
          created_at: string
          decided_at: string | null
          decision: string | null
          decision_reason: string | null
          description: string
          id: string
          link_id: string
          opened_by: string | null
          reason_code: string
          responded_at: string | null
          response_deadline: string
          reviewed_by: string | null
          severity: string
          status: string
          tenant_id: string
        }
        Insert: {
          appeal_status?: string | null
          appealed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string | null
          decision_reason?: string | null
          description: string
          id?: string
          link_id: string
          opened_by?: string | null
          reason_code: string
          responded_at?: string | null
          response_deadline: string
          reviewed_by?: string | null
          severity?: string
          status?: string
          tenant_id: string
        }
        Update: {
          appeal_status?: string | null
          appealed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string | null
          decision_reason?: string | null
          description?: string
          id?: string
          link_id?: string
          opened_by?: string | null
          reason_code?: string
          responded_at?: string | null
          response_deadline?: string
          reviewed_by?: string | null
          severity?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_masonic_link_contests_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bmlc_link"
            columns: ["tenant_id", "link_id"]
            referencedRelation: "business_masonic_links"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_masonic_link_evidence: {
        Row: {
          created_at: string
          evidence_type: string
          file_hash: string
          file_path: string
          file_size_bytes: number
          id: string
          link_id: string
          mime_type: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          evidence_type: string
          file_hash: string
          file_path: string
          file_size_bytes: number
          id?: string
          link_id: string
          mime_type: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          evidence_type?: string
          file_hash?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          link_id?: string
          mime_type?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_masonic_link_evidence_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bmle_link"
            columns: ["tenant_id", "link_id"]
            referencedRelation: "business_masonic_links"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_masonic_link_history: {
        Row: {
          action_reason: string | null
          action_type: string
          actor_id: string | null
          changed_fields: string[] | null
          correlation_id: string | null
          created_at: string
          id: string
          link_id: string
          new_data: Json | null
          new_status: string
          previous_data: Json | null
          previous_status: string | null
          source: string
          tenant_id: string
        }
        Insert: {
          action_reason?: string | null
          action_type: string
          actor_id?: string | null
          changed_fields?: string[] | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          link_id: string
          new_data?: Json | null
          new_status: string
          previous_data?: Json | null
          previous_status?: string | null
          source?: string
          tenant_id: string
        }
        Update: {
          action_reason?: string | null
          action_type?: string
          actor_id?: string | null
          changed_fields?: string[] | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          link_id?: string
          new_data?: Json | null
          new_status?: string
          previous_data?: Json | null
          previous_status?: string | null
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_masonic_link_history_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bmlh_link"
            columns: ["tenant_id", "link_id"]
            referencedRelation: "business_masonic_links"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_masonic_link_publication_consents: {
        Row: {
          consented_at: string
          display_business_role: boolean
          display_contact: boolean
          display_masonic_degree: boolean
          display_masonic_role: boolean
          display_name: boolean
          display_organization: boolean
          display_organization_unit: boolean
          display_profile_photo: boolean
          granted: boolean
          id: string
          link_id: string
          revoked_at: string | null
          revoked_reason: string | null
          tenant_id: string
          visibility_scope: string
        }
        Insert: {
          consented_at?: string
          display_business_role?: boolean
          display_contact?: boolean
          display_masonic_degree?: boolean
          display_masonic_role?: boolean
          display_name?: boolean
          display_organization?: boolean
          display_organization_unit?: boolean
          display_profile_photo?: boolean
          granted?: boolean
          id?: string
          link_id: string
          revoked_at?: string | null
          revoked_reason?: string | null
          tenant_id: string
          visibility_scope?: string
        }
        Update: {
          consented_at?: string
          display_business_role?: boolean
          display_contact?: boolean
          display_masonic_degree?: boolean
          display_masonic_role?: boolean
          display_name?: boolean
          display_organization?: boolean
          display_organization_unit?: boolean
          display_profile_photo?: boolean
          granted?: boolean
          id?: string
          link_id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          tenant_id?: string
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_masonic_link_publication_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bmlpc_link"
            columns: ["tenant_id", "link_id"]
            referencedRelation: "business_masonic_links"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_masonic_links: {
        Row: {
          business_id: string
          created_at: string
          declaring_user_id: string | null
          id: string
          is_primary: boolean
          link_type: string
          organization_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          valid_until: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          declaring_user_id?: string | null
          id?: string
          is_primary?: boolean
          link_type: string
          organization_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          valid_until?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          declaring_user_id?: string | null
          id?: string
          is_primary?: boolean
          link_type?: string
          organization_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          valid_until?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_masonic_links_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_masonic_links_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bml_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_media: {
        Row: {
          business_id: string
          created_at: string
          display_order: number
          id: string
          media_type: string
          tenant_id: string
          title: string | null
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          display_order?: number
          id?: string
          media_type: string
          tenant_id: string
          title?: string | null
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          display_order?: number
          id?: string
          media_type?: string
          tenant_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bus_media_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_members: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          id: string
          invite_expires_at: string | null
          invite_token_hash: string | null
          invited_email: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          invited_email?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          invited_email?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_business_members_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_metric_rollups: {
        Row: {
          business_id: string
          id: string
          leads_count: number
          metric_date: string
          phone_views: number
          views_count: number
          whatsapp_clicks: number
        }
        Insert: {
          business_id: string
          id?: string
          leads_count?: number
          metric_date: string
          phone_views?: number
          views_count?: number
          whatsapp_clicks?: number
        }
        Update: {
          business_id?: string
          id?: string
          leads_count?: number
          metric_date?: string
          phone_views?: number
          views_count?: number
          whatsapp_clicks?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_metric_rollups_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reviews: {
        Row: {
          business_id: string
          business_response: string | null
          comment: string | null
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string
          rating: number
          responded_at: string | null
          responded_by: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          business_response?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          rating: number
          responded_at?: string | null
          responded_by?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          business_response?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          rating?: number
          responded_at?: string | null
          responded_by?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_business_reviews_business_tenant"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category: string
          cnpj: string | null
          company_type: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          plan_tier: string
          publication_status: string
          slug: string | null
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category: string
          cnpj?: string | null
          company_type?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          plan_tier?: string
          publication_status?: string
          slug?: string | null
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          cnpj?: string | null
          company_type?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          plan_tier?: string
          publication_status?: string
          slug?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          created_at: string
          document_version_id: string | null
          granted: boolean
          id: string
          purpose: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_version_id?: string | null
          granted?: boolean
          id?: string
          purpose: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_version_id?: string | null
          granted?: boolean
          id?: string
          purpose?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_document_version_id_fkey"
            columns: ["document_version_id"]
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_withdrawals: {
        Row: {
          consent_id: string
          id: string
          reason: string | null
          withdrawn_at: string
        }
        Insert: {
          consent_id: string
          id?: string
          reason?: string | null
          withdrawn_at?: string
        }
        Update: {
          consent_id?: string
          id?: string
          reason?: string | null
          withdrawn_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_withdrawals_consent_id_fkey"
            columns: ["consent_id"]
            referencedRelation: "consent_records"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          redeemed_at: string
          user_id: string
          validation_code: string
        }
        Insert: {
          coupon_id: string
          id?: string
          redeemed_at?: string
          user_id: string
          validation_code: string
        }
        Update: {
          coupon_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
          validation_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          business_id: string
          code: string
          created_at: string
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          tenant_id: string
          title: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          tenant_id: string
          title: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          tenant_id?: string
          title?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_coupons_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      credential_evidence: {
        Row: {
          created_at: string
          evidence_type: string
          file_hash: string | null
          file_url: string
          id: string
          issuance_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          evidence_type: string
          file_hash?: string | null
          file_url: string
          id?: string
          issuance_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          evidence_type?: string
          file_hash?: string | null
          file_url?: string
          id?: string
          issuance_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_evidence_issuance_id_fkey"
            columns: ["issuance_id"]
            referencedRelation: "credential_issuances"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          issuance_id: string
          new_status: string
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          issuance_id: string
          new_status: string
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          issuance_id?: string
          new_status?: string
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_history_issuance_id_fkey"
            columns: ["issuance_id"]
            referencedRelation: "credential_issuances"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_issuances: {
        Row: {
          business_id: string | null
          created_at: string
          credential_type_id: string
          expires_at: string | null
          id: string
          issued_at: string | null
          organization_id: string | null
          requested_at: string
          requested_by: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string | null
          verification_notes: string | null
          verified_by: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          credential_type_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          verification_notes?: string | null
          verified_by?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          credential_type_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          verification_notes?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_issuances_credential_type_id_fkey"
            columns: ["credential_type_id"]
            referencedRelation: "credential_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_issuances_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cred_issuance_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "fk_cred_issuance_org"
            columns: ["tenant_id", "organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      credential_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          requires_evidence: boolean
          tenant_id: string | null
          validity_days: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          requires_evidence?: boolean
          tenant_id?: string | null
          validity_days?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          requires_evidence?: boolean
          tenant_id?: string | null
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_types_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          notes: string
          opportunity_id: string
          performed_by: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          notes: string
          opportunity_id: string
          performed_by: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          notes?: string
          opportunity_id?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          assigned_agent_id: string | null
          created_at: string
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          prospect_id: string
          stage_id: string
          status: string
          target_plan_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          prospect_id: string
          stage_id: string
          status?: string
          target_plan_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          prospect_id?: string
          stage_id?: string
          status?: string
          target_plan_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_prospect_id_fkey"
            columns: ["prospect_id"]
            referencedRelation: "crm_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_stage_id_fkey"
            columns: ["stage_id"]
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_target_plan_id_fkey"
            columns: ["target_plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_terminal_loss: boolean
          is_terminal_win: boolean
          name: string
          tenant_id: string
          win_probability: number | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_terminal_loss?: boolean
          is_terminal_win?: boolean
          name: string
          tenant_id: string
          win_probability?: number | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_terminal_loss?: boolean
          is_terminal_win?: boolean
          name?: string
          tenant_id?: string
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_proposals: {
        Row: {
          amount: number
          created_at: string
          id: string
          opportunity_id: string
          proposal_number: string
          status: string
          terms: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          opportunity_id: string
          proposal_number: string
          status?: string
          terms?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          opportunity_id?: string
          proposal_number?: string
          status?: string
          terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_prospects: {
        Row: {
          assigned_agent_id: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          source: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          source?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          source?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_prospects_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_renewal_cases: {
        Row: {
          assigned_agent_id: string | null
          created_at: string
          due_date: string
          id: string
          stage: string
          subscription_id: string
          tenant_id: string
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          stage?: string
          subscription_id: string
          tenant_id: string
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          stage?: string
          subscription_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_renewal_cases_subscription_id_fkey"
            columns: ["subscription_id"]
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_renewal_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      elevated_access_sessions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string | null
          expires_at: string
          id: string
          reason: string
          requested_at: string
          revoked_at: string | null
          scope: string
          session_evidence_id: string | null
          status: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          expires_at: string
          id?: string
          reason: string
          requested_at?: string
          revoked_at?: string | null
          scope: string
          session_evidence_id?: string | null
          status?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          expires_at?: string
          id?: string
          reason?: string
          requested_at?: string
          revoked_at?: string | null
          scope?: string
          session_evidence_id?: string | null
          status?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elevated_access_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_definitions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          value_type: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          value_type: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          value_type?: string
        }
        Relationships: []
      }
      entitlement_grants: {
        Row: {
          business_id: string
          created_at: string
          entitlement_id: string
          granted_by: string | null
          id: string
          is_unlimited: boolean
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          source_id: string
          status: string
          tenant_id: string
          valid_from: string
          valid_until: string | null
          value_boolean: boolean | null
          value_numeric: number | null
        }
        Insert: {
          business_id: string
          created_at?: string
          entitlement_id: string
          granted_by?: string | null
          id?: string
          is_unlimited?: boolean
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_id: string
          status?: string
          tenant_id: string
          valid_from?: string
          valid_until?: string | null
          value_boolean?: boolean | null
          value_numeric?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string
          entitlement_id?: string
          granted_by?: string | null
          id?: string
          is_unlimited?: boolean
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_id?: string
          status?: string
          tenant_id?: string
          valid_from?: string
          valid_until?: string | null
          value_boolean?: boolean | null
          value_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_grants_entitlement_id_fkey"
            columns: ["entitlement_id"]
            referencedRelation: "entitlement_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_grants_source_id_fkey"
            columns: ["source_id"]
            referencedRelation: "entitlement_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ent_grants_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      entitlement_overrides: {
        Row: {
          authorized_by: string
          created_at: string
          grant_id: string
          id: string
          override_value_boolean: boolean | null
          override_value_numeric: number | null
          reason: string
        }
        Insert: {
          authorized_by: string
          created_at?: string
          grant_id: string
          id?: string
          override_value_boolean?: boolean | null
          override_value_numeric?: number | null
          reason: string
        }
        Update: {
          authorized_by?: string
          created_at?: string
          grant_id?: string
          id?: string
          override_value_boolean?: boolean | null
          override_value_numeric?: number | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_overrides_grant_id_fkey"
            columns: ["grant_id"]
            referencedRelation: "entitlement_grants"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_sources: {
        Row: {
          created_at: string
          id: string
          source_metadata: Json
          source_reference_id: string
          source_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_metadata?: Json
          source_reference_id: string
          source_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_metadata?: Json
          source_reference_id?: string
          source_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_usage: {
        Row: {
          business_id: string
          current_usage: number
          grant_id: string
          id: string
          last_used_at: string
        }
        Insert: {
          business_id: string
          current_usage?: number
          grant_id: string
          id?: string
          last_used_at?: string
        }
        Update: {
          business_id?: string
          current_usage?: number
          grant_id?: string
          id?: string
          last_used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_usage_grant_id_fkey"
            columns: ["grant_id"]
            referencedRelation: "entitlement_grants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_consumptions: {
        Row: {
          consumer_name: string
          event_id: string
          execution_time_ms: number
          id: string
          processed_at: string
          result_status: string
          tenant_id: string
        }
        Insert: {
          consumer_name: string
          event_id: string
          execution_time_ms?: number
          id?: string
          processed_at?: string
          result_status?: string
          tenant_id: string
        }
        Update: {
          consumer_name?: string
          event_id?: string
          execution_time_ms?: number
          id?: string
          processed_at?: string
          result_status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_consumptions_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "outbox_events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_consumptions_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_deliveries: {
        Row: {
          attempt_count: number
          consumer_name: string
          created_at: string
          delivered_at: string | null
          event_id: string
          id: string
          last_attempt_at: string | null
          last_error_code: string | null
          next_retry_at: string | null
          status: string
        }
        Insert: {
          attempt_count?: number
          consumer_name: string
          created_at?: string
          delivered_at?: string | null
          event_id: string
          id?: string
          last_attempt_at?: string | null
          last_error_code?: string | null
          next_retry_at?: string | null
          status?: string
        }
        Update: {
          attempt_count?: number
          consumer_name?: string
          created_at?: string
          delivered_at?: string | null
          event_id?: string
          id?: string
          last_attempt_at?: string | null
          last_error_code?: string | null
          next_retry_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_deliveries_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "outbox_events"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_delivery_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string
          consumer_name: string
          delivery_id: string
          error_stack: string | null
          event_id: string
          execution_time_ms: number
          id: string
          status: string
        }
        Insert: {
          attempt_number: number
          attempted_at?: string
          consumer_name: string
          delivery_id: string
          error_stack?: string | null
          event_id: string
          execution_time_ms?: number
          id?: string
          status: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          consumer_name?: string
          delivery_id?: string
          error_stack?: string | null
          event_id?: string
          execution_time_ms?: number
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_delivery_attempts_delivery_id_fkey"
            columns: ["delivery_id"]
            referencedRelation: "event_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_delivery_attempts_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "outbox_events"
            referencedColumns: ["event_id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string
          end_at: string | null
          id: string
          is_published: boolean
          location_name: string | null
          start_at: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          end_at?: string | null
          id?: string
          is_published?: boolean
          location_name?: string | null
          start_at: string
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          end_at?: string | null
          id?: string
          is_published?: boolean
          location_name?: string | null
          start_at?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_event_queue: {
        Row: {
          consumer_name: string
          error_stack: string | null
          event_id: string
          first_failed_at: string
          id: string
          last_failed_at: string
          payload_redacted: Json
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number
          status: string
          tenant_id: string
        }
        Insert: {
          consumer_name: string
          error_stack?: string | null
          event_id: string
          first_failed_at: string
          id?: string
          last_failed_at?: string
          payload_redacted: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count: number
          status?: string
          tenant_id: string
        }
        Update: {
          consumer_name?: string
          error_stack?: string | null
          event_id?: string
          first_failed_at?: string
          id?: string
          last_failed_at?: string
          payload_redacted?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "failed_event_queue_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "outbox_events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "failed_event_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_adjustments: {
        Row: {
          amount: number
          authorized_by: string
          business_id: string
          created_at: string
          id: string
          invoice_id: string | null
          reason: string
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          authorized_by: string
          business_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          reason: string
          tenant_id: string
          type: string
        }
        Update: {
          amount?: number
          authorized_by?: string
          business_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          reason?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fin_adj_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      founder_allocations: {
        Row: {
          business_id: string
          campaign_id: string
          created_at: string
          currency: string
          expires_at: string | null
          granted_at: string | null
          id: string
          locked_annual_price_cents: number
          payment_provider_id: string | null
          price_lock_policy: string
          price_locked_at: string
          reserved_at: string
          revocation_reason: string | null
          revoked_at: string | null
          slot_number: number
          status: string
          subscription_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          campaign_id: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          locked_annual_price_cents?: number
          payment_provider_id?: string | null
          price_lock_policy?: string
          price_locked_at?: string
          reserved_at?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          slot_number: number
          status?: string
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          campaign_id?: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          locked_annual_price_cents?: number
          payment_provider_id?: string | null
          price_lock_policy?: string
          price_locked_at?: string
          reserved_at?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          slot_number?: number
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_founder_allocations_business_tenant"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "founder_allocations_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_allocations_campaign_id_fkey"
            columns: ["campaign_id"]
            referencedRelation: "founder_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_allocations_subscription_id_fkey"
            columns: ["subscription_id"]
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_campaigns: {
        Row: {
          allocated_count: number
          capacity: number
          code: string
          created_at: string
          ends_at: string | null
          id: string
          name: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          allocated_count?: number
          capacity?: number
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          name: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          allocated_count?: number
          capacity?: number
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      founder_qualifications: {
        Row: {
          business_id: string
          created_at: string
          founder_number: number
          id: string
          qualified_at: string
          qualified_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          founder_number: number
          id?: string
          qualified_at?: string
          qualified_by?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          founder_number?: number
          id?: string
          qualified_at?: string
          qualified_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_founder_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      import_errors: {
        Row: {
          column_name: string | null
          created_at: string
          error_code: string
          error_message: string
          id: string
          job_id: string
          row_id: string | null
        }
        Insert: {
          column_name?: string | null
          created_at?: string
          error_code: string
          error_message: string
          id?: string
          job_id: string
          row_id?: string | null
        }
        Update: {
          column_name?: string | null
          created_at?: string
          error_code?: string
          error_message?: string
          id?: string
          job_id?: string
          row_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_errors_row_id_fkey"
            columns: ["row_id"]
            referencedRelation: "import_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      import_execution_history: {
        Row: {
          executed_at: string
          execution_details: Json | null
          id: string
          job_id: string
          status: string
          step_name: string
        }
        Insert: {
          executed_at?: string
          execution_details?: Json | null
          id?: string
          job_id: string
          status: string
          step_name: string
        }
        Update: {
          executed_at?: string
          execution_details?: Json | null
          id?: string
          job_id?: string
          status?: string
          step_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_execution_history_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_files: {
        Row: {
          created_at: string
          file_checksum: string
          file_size_bytes: number
          file_url: string
          id: string
          job_id: string
        }
        Insert: {
          created_at?: string
          file_checksum: string
          file_size_bytes: number
          file_url: string
          id?: string
          job_id: string
        }
        Update: {
          created_at?: string
          file_checksum?: string
          file_size_bytes?: number
          file_url?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_files_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          created_by: string
          entity_type: string
          error_rows: number | null
          id: string
          processed_rows: number | null
          status: string
          tenant_id: string
          total_rows: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_type: string
          error_rows?: number | null
          id?: string
          processed_rows?: number | null
          status?: string
          tenant_id: string
          total_rows?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_type?: string
          error_rows?: number | null
          id?: string
          processed_rows?: number | null
          status?: string
          tenant_id?: string
          total_rows?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          created_at: string
          deduplication_key: string | null
          id: string
          job_id: string
          normalized_data: Json | null
          raw_data: Json
          row_number: number
          status: string
          target_entity_id: string | null
        }
        Insert: {
          created_at?: string
          deduplication_key?: string | null
          id?: string
          job_id: string
          normalized_data?: Json | null
          raw_data: Json
          row_number: number
          status?: string
          target_entity_id?: string | null
        }
        Update: {
          created_at?: string
          deduplication_key?: string | null
          id?: string
          job_id?: string
          normalized_data?: Json | null
          raw_data?: Json
          row_number?: number
          status?: string
          target_entity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          invoice_id: string
          new_status: string
          notes: string | null
          previous_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          business_id: string
          created_at: string
          currency: string
          due_date: string
          id: string
          idempotency_key: string | null
          invoice_number: string
          paid_at: string | null
          status: string
          subscription_period_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          business_id: string
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          idempotency_key?: string | null
          invoice_number: string
          paid_at?: string | null
          status?: string
          subscription_period_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          business_id?: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          idempotency_key?: string | null
          invoice_number?: string
          paid_at?: string | null
          status?: string
          subscription_period_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "invoices_subscription_period_id_fkey"
            columns: ["subscription_period_id"]
            referencedRelation: "subscription_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_consents: {
        Row: {
          consent_text: string
          created_at: string
          id: string
          lead_id: string
          session_evidence_id: string
        }
        Insert: {
          consent_text: string
          created_at?: string
          id?: string
          lead_id: string
          session_evidence_id: string
        }
        Update: {
          consent_text?: string
          created_at?: string
          id?: string
          lead_id?: string
          session_evidence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_consents_lead_id_fkey"
            columns: ["lead_id"]
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_conversion_events: {
        Row: {
          conversion_type: string
          created_at: string
          id: string
          lead_id: string
          value: number | null
        }
        Insert: {
          conversion_type: string
          created_at?: string
          id?: string
          lead_id: string
          value?: number | null
        }
        Update: {
          conversion_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_conversion_events_lead_id_fkey"
            columns: ["lead_id"]
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_messages: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          message_text: string
          sender_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          message_text: string
          sender_type: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          message_text?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          lead_id: string
          new_status: string
          previous_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lead_id: string
          new_status: string
          previous_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          new_status?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string
          created_at: string
          has_masonic_regularity_badge: boolean
          id: string
          origin_channel: string
          sender_email: string
          sender_name: string
          sender_phone: string | null
          sender_user_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          has_masonic_regularity_badge?: boolean
          id?: string
          origin_channel?: string
          sender_email: string
          sender_name: string
          sender_phone?: string | null
          sender_user_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          has_masonic_regularity_badge?: boolean
          id?: string
          origin_channel?: string
          sender_email?: string
          sender_name?: string
          sender_phone?: string | null
          sender_user_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      legal_document_versions: {
        Row: {
          content_hash: string | null
          content_markdown: string
          created_at: string
          document_id: string
          effective_date: string
          id: string
          version: string
        }
        Insert: {
          content_hash?: string | null
          content_markdown: string
          created_at?: string
          document_id: string
          effective_date?: string
          id?: string
          version: string
        }
        Update: {
          content_hash?: string | null
          content_markdown?: string
          created_at?: string
          document_id?: string
          effective_date?: string
          id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_versions_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          code: string
          created_at: string
          id: string
          tenant_id: string | null
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_highlights: {
        Row: {
          business_id: string
          created_at: string
          end_at: string
          highlight_type: string
          id: string
          is_active: boolean
          start_at: string
          tenant_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          end_at: string
          highlight_type: string
          id?: string
          is_active?: boolean
          start_at: string
          tenant_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          end_at?: string
          highlight_type?: string
          id?: string
          is_active?: boolean
          start_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_highlights_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      masonic_affiliations: {
        Row: {
          chapter_name: string | null
          cimb_code: string | null
          created_at: string
          id: string
          is_active: boolean
          lodge_name: string | null
          spouse_mason_name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_name?: string | null
          cimb_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          lodge_name?: string | null
          spouse_mason_name?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_name?: string | null
          cimb_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          lodge_name?: string | null
          spouse_mason_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          channel: string
          id: string
          notification_id: string
          provider_response: Json | null
          sent_at: string
          status: string
        }
        Insert: {
          channel: string
          id?: string
          notification_id: string
          provider_response?: Json | null
          sent_at?: string
          status?: string
        }
        Update: {
          channel?: string
          id?: string
          notification_id?: string
          provider_response?: Json | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: string
          code: string
          created_at: string
          id: string
          subject_template: string
          tenant_id: string | null
        }
        Insert: {
          body_template: string
          channel: string
          code: string
          created_at?: string
          id?: string
          subject_template: string
          tenant_id?: string | null
        }
        Update: {
          body_template?: string
          channel?: string
          code?: string
          created_at?: string
          id?: string
          subject_template?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_business_partnership: {
        Row: {
          business_id: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          organization_id: string
          partnership_type: string
          start_date: string
          tenant_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          partnership_type?: string
          start_date?: string
          tenant_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          partnership_type?: string
          start_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_org_biz_partnership_biz"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "fk_org_biz_partnership_org"
            columns: ["tenant_id", "organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      organization_event_link: {
        Row: {
          created_at: string
          event_id: string
          id: string
          link_type: string
          organization_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          link_type?: string
          organization_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          link_type?: string
          organization_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_org_event_org"
            columns: ["tenant_id", "organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          organization_id: string
          person_id: string
          role: string
          start_date: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          organization_id: string
          person_id: string
          role: string
          start_date: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          organization_id?: string
          person_id?: string
          role?: string
          start_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_org_membership_org"
            columns: ["tenant_id", "organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "fk_org_membership_person"
            columns: ["tenant_id", "person_id"]
            referencedRelation: "organization_people"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      organization_people: {
        Row: {
          cimb_code: string | null
          created_at: string
          full_name: string
          id: string
          masonic_degree: string | null
          organization_id: string
          role_in_org: string
          status: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          cimb_code?: string | null
          created_at?: string
          full_name: string
          id?: string
          masonic_degree?: string | null
          organization_id: string
          role_in_org?: string
          status?: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          cimb_code?: string | null
          created_at?: string
          full_name?: string
          id?: string
          masonic_degree?: string | null
          organization_id?: string
          role_in_org?: string
          status?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_org_people_org"
            columns: ["tenant_id", "organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      organization_relationships: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          relationship_type: string
          source_organization_id: string
          start_date: string
          target_organization_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          relationship_type: string
          source_organization_id: string
          start_date: string
          target_organization_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          relationship_type?: string
          source_organization_id?: string
          start_date?: string
          target_organization_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_org_rel_source"
            columns: ["tenant_id", "source_organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "fk_org_rel_target"
            columns: ["tenant_id", "target_organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      organization_units: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_org_units_org"
            columns: ["tenant_id", "organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string | null
          code_number: number | null
          contact_email: string | null
          created_at: string
          foundation_date: string | null
          id: string
          is_active: boolean
          meeting_schedule: string | null
          name: string
          potency: string
          public_slug: string | null
          publication_status: string
          rite: string | null
          state: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          code_number?: number | null
          contact_email?: string | null
          created_at?: string
          foundation_date?: string | null
          id?: string
          is_active?: boolean
          meeting_schedule?: string | null
          name: string
          potency: string
          public_slug?: string | null
          publication_status?: string
          rite?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          code_number?: number | null
          contact_email?: string | null
          created_at?: string
          foundation_date?: string | null
          id?: string
          is_active?: boolean
          meeting_schedule?: string | null
          name?: string
          potency?: string
          public_slug?: string | null
          publication_status?: string
          rite?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          aggregate_id: string
          aggregate_type: string
          aggregate_version: number
          available_at: string
          causation_id: string | null
          correlation_id: string | null
          created_at: string
          event_id: string
          event_type: string
          event_version: string
          expires_at: string | null
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          next_retry_at: string | null
          payload: Json
          producer: string
          retry_count: number
          schema_version: string
          status: string
          tenant_id: string
          trace_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          aggregate_id: string
          aggregate_type: string
          aggregate_version?: number
          available_at?: string
          causation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_id: string
          event_type: string
          event_version?: string
          expires_at?: string | null
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string | null
          payload: Json
          producer: string
          retry_count?: number
          schema_version?: string
          status?: string
          tenant_id: string
          trace_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          aggregate_id?: string
          aggregate_type?: string
          aggregate_version?: number
          available_at?: string
          causation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_id?: string
          event_type?: string
          event_version?: string
          expires_at?: string | null
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string | null
          payload?: Json
          producer?: string
          retry_count?: number
          schema_version?: string
          status?: string
          tenant_id?: string
          trace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbox_events_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount: number
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          invoice_id: string
          payload_sent: Json | null
          provider_code: string
          response_received: Json | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          invoice_id: string
          payload_sent?: Json | null
          provider_code: string
          response_received?: Json | null
          status: string
        }
        Update: {
          amount?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string
          payload_sent?: Json | null
          provider_code?: string
          response_received?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          event_type: string
          id: string
          payload_hash: string
          payment_provider_id: string
          processed_at: string
          provider_event_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          event_type: string
          id?: string
          payload_hash: string
          payment_provider_id: string
          processed_at?: string
          provider_event_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          event_type?: string
          id?: string
          payload_hash?: string
          payment_provider_id?: string
          processed_at?: string
          provider_event_id?: string
        }
        Relationships: []
      }
      payment_provider_events: {
        Row: {
          created_at: string
          error_log: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          provider_code: string
        }
        Insert: {
          created_at?: string
          error_log?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          provider_code: string
        }
        Update: {
          created_at?: string
          error_log?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider_code?: string
        }
        Relationships: []
      }
      payment_refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          processed_by: string | null
          reason: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id: string
          processed_by?: string | null
          reason: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          processed_by?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_payment_id_fkey"
            columns: ["payment_id"]
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          paid_at: string
          payment_method: string
          provider_code: string
          provider_transaction_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          paid_at?: string
          payment_method: string
          provider_code: string
          provider_transaction_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          paid_at?: string
          payment_method?: string
          provider_code?: string
          provider_transaction_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      plan_versions: {
        Row: {
          created_at: string
          currency: string
          effective_from: string
          effective_until: string | null
          features_summary: Json
          id: string
          plan_id: string
          price_annual: number
          version: number
        }
        Insert: {
          created_at?: string
          currency?: string
          effective_from?: string
          effective_until?: string | null
          features_summary?: Json
          id?: string
          plan_id: string
          price_annual?: number
          version?: number
        }
        Update: {
          created_at?: string
          currency?: string
          effective_from?: string
          effective_until?: string | null
          features_summary?: Json
          id?: string
          plan_id?: string
          price_annual?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      popups: {
        Row: {
          content_html: string
          created_at: string
          end_at: string | null
          id: string
          is_active: boolean
          start_at: string
          tenant_id: string
          title: string
        }
        Insert: {
          content_html: string
          created_at?: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          start_at?: string
          tenant_id: string
          title: string
        }
        Update: {
          content_html?: string
          created_at?: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          start_at?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "popups_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string | null
          rhid: string | null
          role: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          rhid?: string | null
          role?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          rhid?: string | null
          role?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_global: boolean
          is_system: boolean
          name: string
          role_type: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          is_system?: boolean
          name: string
          role_type?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          is_system?: boolean
          name?: string
          role_type?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_periods: {
        Row: {
          created_at: string
          end_at: string
          id: string
          is_active: boolean
          sponsorship_id: string
          start_at: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          is_active?: boolean
          sponsorship_id: string
          start_at: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          is_active?: boolean
          sponsorship_id?: string
          start_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sponsorship_periods_sponsorship"
            columns: ["tenant_id", "sponsorship_id"]
            referencedRelation: "sponsorships"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      sponsorships: {
        Row: {
          business_id: string
          created_at: string
          id: string
          scope_target_id: string | null
          sponsor_scope: string
          tenant_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          scope_target_id?: string | null
          sponsor_scope: string
          tenant_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          scope_target_id?: string | null
          sponsor_scope?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sponsorships_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      subscription_checkouts: {
        Row: {
          billing_cycle: string
          business_id: string
          campaign_code: string | null
          created_at: string
          currency: string
          expires_at: string
          id: string
          locked_price_cents: number
          payment_provider_id: string
          payment_status: string
          plan_id: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_cycle: string
          business_id: string
          campaign_code?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          locked_price_cents: number
          payment_provider_id: string
          payment_status?: string
          plan_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_cycle?: string
          business_id?: string
          campaign_code?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          locked_price_cents?: number
          payment_provider_id?: string
          payment_status?: string
          plan_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_checkouts_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_checkouts_campaign_code_fkey"
            columns: ["campaign_code"]
            referencedRelation: "founder_campaigns"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subscription_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_periods: {
        Row: {
          created_at: string
          id: string
          is_closed: boolean
          period_end: string
          period_start: string
          subscription_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_closed?: boolean
          period_end: string
          period_start: string
          subscription_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_closed?: boolean
          period_end?: string
          period_start?: string
          subscription_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sub_periods_sub"
            columns: ["tenant_id", "subscription_id"]
            referencedRelation: "subscriptions"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          access_ends_at: string | null
          business_id: string
          canceled_at: string | null
          contract_term: string
          created_at: string
          current_period_end: string
          current_period_start: string
          grace_until: string | null
          id: string
          payment_schedule: string
          plan_version_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_ends_at?: string | null
          business_id: string
          canceled_at?: string | null
          contract_term?: string
          created_at?: string
          current_period_end: string
          current_period_start: string
          grace_until?: string | null
          id?: string
          payment_schedule?: string
          plan_version_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_ends_at?: string | null
          business_id?: string
          canceled_at?: string | null
          contract_term?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_until?: string | null
          id?: string
          payment_schedule?: string
          plan_version_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subscriptions_business"
            columns: ["tenant_id", "business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "subscriptions_plan_version_id_fkey"
            columns: ["plan_version_id"]
            referencedRelation: "plan_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_primary: boolean
          is_verified: boolean
          ssl_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          ssl_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          ssl_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          config: Json
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_plans: {
        Row: {
          created_at: string
          id: string
          price_annual: number
          tenant_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_annual?: number
          tenant_id: string
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          price_annual?: number
          tenant_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_plugins: {
        Row: {
          config: Json
          enabled: boolean
          installed_at: string
          plugin_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          enabled?: boolean
          installed_at?: string
          plugin_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          enabled?: boolean
          installed_at?: string
          plugin_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_plugins_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_public_home_content: {
        Row: {
          about_body: string | null
          about_title: string | null
          created_at: string
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string
          id: string
          primary_cta_label: string | null
          primary_cta_url: string | null
          publication_status: string
          published_at: string | null
          secondary_cta_label: string | null
          secondary_cta_url: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          about_body?: string | null
          about_title?: string | null
          created_at?: string
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title: string
          id?: string
          primary_cta_label?: string | null
          primary_cta_url?: string | null
          publication_status?: string
          published_at?: string | null
          secondary_cta_label?: string | null
          secondary_cta_url?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          about_body?: string | null
          about_title?: string | null
          created_at?: string
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string
          id?: string
          primary_cta_label?: string | null
          primary_cta_url?: string | null
          publication_status?: string
          published_at?: string | null
          secondary_cta_label?: string | null
          secondary_cta_url?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_public_home_content_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          allow_self_registration: boolean
          created_at: string
          currency: string
          id: string
          metadata: Json
          require_masonic_verification_for_listing: boolean
          support_email: string | null
          tenant_id: string
          timezone: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          allow_self_registration?: boolean
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          require_masonic_verification_for_listing?: boolean
          support_email?: string | null
          tenant_id: string
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          allow_self_registration?: boolean
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          require_masonic_verification_for_listing?: boolean
          support_email?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          public_access_status: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          public_access_status?: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          public_access_status?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          expires_at: string | null
          id: string
          role_id: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          role_id: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          role_id?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_operational_dlq_sanitized: {
        Row: {
          consumer_name: string | null
          dlq_id: string | null
          event_id: string | null
          first_failed_at: string | null
          last_failed_at: string | null
          payload_redacted: Json | null
          resolution_notes: string | null
          retry_count: number | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          consumer_name?: string | null
          dlq_id?: string | null
          event_id?: string | null
          first_failed_at?: string | null
          last_failed_at?: string | null
          payload_redacted?: Json | null
          resolution_notes?: string | null
          retry_count?: number | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          consumer_name?: string | null
          dlq_id?: string | null
          event_id?: string | null
          first_failed_at?: string | null
          last_failed_at?: string | null
          payload_redacted?: Json | null
          resolution_notes?: string | null
          retry_count?: number | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "failed_event_queue_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "outbox_events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "failed_event_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _business_is_founder: {
        Args: { p_business_id: string; p_tenant_id: string }
        Returns: boolean
      }
      _business_is_registration_verified: {
        Args: { p_business_id: string; p_tenant_id: string }
        Returns: boolean
      }
      _effective_business_plan: {
        Args: { p_business_id: string; p_tenant_id: string }
        Returns: {
          access_valid_until: string
          entitlements: Json
          is_in_grace: boolean
          plan_code: string
          plan_version_id: string
          subscription_id: string
          subscription_status: string
        }[]
      }
      _normalize_public_host: { Args: { p_host: string }; Returns: string }
      _public_business_responsible: {
        Args: { p_business_id: string; p_tenant_id: string }
        Returns: Json
      }
      _resolve_public_tenant_id: { Args: { p_host: string }; Returns: string }
      _safe_public_url: { Args: { p_value: string }; Returns: string }
      accept_legal_doc: {
        Args: { p_code: string; p_version: string }
        Returns: {
          accepted_at: string
          content_hash: string | null
          document_version_id: string
          evidence_metadata: Json
          id: string
          session_evidence_id: string
          tenant_id: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "acceptance_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_founder_slot: {
        Args: { p_action?: string; p_payment_provider_id: string }
        Returns: {
          allocation_id: string
          expires_at: string
          is_new_grant: boolean
          slot_number: number
          status: string
        }[]
      }
      current_tenant_id: { Args: never; Returns: string }
      current_user_profile_tenant_id: { Args: never; Returns: string }
      dearmor: { Args: { "": string }; Returns: string }
      export_personal_data: { Args: never; Returns: Json }
      gen_random_uuid: { Args: never; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      grant_sensitive_consent: {
        Args: { p_purpose: string; p_version: string }
        Returns: {
          created_at: string
          document_version_id: string | null
          granted: boolean
          id: string
          purpose: string
          tenant_id: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "consent_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_business_permission: {
        Args: { p_business_id: string; p_roles: string[]; p_tenant_id: string }
        Returns: boolean
      }
      has_global_platform_role: { Args: { p_role: string }; Returns: boolean }
      has_tenant_admin_access: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      ingest_payment_event: {
        Args: {
          p_amount_cents: number
          p_currency?: string
          p_event_type: string
          p_payload_hash?: string
          p_payment_provider_id: string
          p_provider_event_id: string
        }
        Returns: {
          event_id: string
          is_duplicate: boolean
          payment_status: string
        }[]
      }
      is_current_user_tenant_member: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      list_accounts_pending_purge: {
        Args: { p_days?: number }
        Returns: {
          deleted_at: string
          user_id: string
        }[]
      }
      list_my_acceptances: {
        Args: never
        Returns: {
          accepted_at: string
          code: string
          content_hash: string
          version: string
        }[]
      }
      list_my_consents: {
        Args: never
        Returns: {
          consent_id: string
          created_at: string
          doc_version: string
          granted: boolean
          purpose: string
          withdrawal_reason: string
          withdrawn_at: string
        }[]
      }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      public_business_detail: {
        Args: { p_business_slug: string; p_host: string }
        Returns: {
          business_hours: Json
          business_name: string
          business_slug: string
          company_type: string
          contacts: Json
          description: string
          effective_plan_code: string
          is_founder: boolean
          is_verified: boolean
          locations: Json
          logo_url: string
          media: Json
          primary_category_name: string
          primary_category_slug: string
          rating_average: number
          rating_count: number
          responsible: Json
          tenant_slug: string
        }[]
      }
      public_business_reviews: {
        Args: {
          p_before_created_at?: string
          p_before_id?: string
          p_business_slug: string
          p_host: string
          p_limit?: number
        }
        Returns: {
          business_response: string
          comment: string
          cursor_created_at: string
          cursor_id: string
          published_at: string
          rating: number
          responded_at: string
          review_public_id: string
        }[]
      }
      public_directory_search: {
        Args: {
          p_after_name?: string
          p_after_slug?: string
          p_category_slug?: string
          p_city?: string
          p_host: string
          p_limit?: number
          p_query?: string
          p_state?: string
        }
        Returns: {
          business_name: string
          business_slug: string
          city: string
          cursor_name: string
          cursor_slug: string
          description: string
          effective_plan_code: string
          is_founder: boolean
          is_verified: boolean
          logo_url: string
          primary_category_name: string
          primary_category_slug: string
          state: string
        }[]
      }
      public_home_content: {
        Args: { p_host: string }
        Returns: {
          about_body: string
          about_title: string
          banners: Json
          hero_image_url: string
          hero_subtitle: string
          hero_title: string
          primary_cta_label: string
          primary_cta_url: string
          secondary_cta_label: string
          secondary_cta_url: string
          tenant_slug: string
        }[]
      }
      public_masonic_lodges: {
        Args: {
          p_after_name?: string
          p_after_slug?: string
          p_city?: string
          p_host: string
          p_limit?: number
          p_query?: string
          p_state?: string
        }
        Returns: {
          city: string
          code_number: number
          cursor_name: string
          cursor_slug: string
          foundation_date: string
          lodge_name: string
          lodge_slug: string
          meeting_schedule: string
          potency: string
          rite: string
          state: string
        }[]
      }
      public_tenant_branding: {
        Args: { p_host: string }
        Returns: {
          accent_color: string
          color_mode: string
          density: string
          display_name: string
          favicon_url: string
          font_token: string
          logo_url: string
          primary_color: string
          radius: string
          tenant_slug: string
        }[]
      }
      purge_soft_deleted_accounts: {
        Args: { p_days?: number }
        Returns: number
      }
      purge_stale_business_drafts: {
        Args: { p_days?: number }
        Returns: number
      }
      release_expired_founder_reservations: { Args: never; Returns: number }
      request_account_deletion: { Args: never; Returns: undefined }
      revoke_consent: {
        Args: { p_consent_id: string; p_reason?: string }
        Returns: {
          created_at: string
          document_version_id: string | null
          granted: boolean
          id: string
          purpose: string
          tenant_id: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "consent_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_publication_consent: {
        Args: {
          p_display_business_role?: boolean
          p_display_contact?: boolean
          p_display_masonic_degree?: boolean
          p_display_masonic_role?: boolean
          p_display_name?: boolean
          p_display_organization?: boolean
          p_display_organization_unit?: boolean
          p_display_profile_photo?: boolean
          p_link_id: string
          p_visibility_scope?: string
        }
        Returns: {
          consented_at: string
          display_business_role: boolean
          display_contact: boolean
          display_masonic_degree: boolean
          display_masonic_role: boolean
          display_name: boolean
          display_organization: boolean
          display_organization_unit: boolean
          display_profile_photo: boolean
          granted: boolean
          id: string
          link_id: string
          revoked_at: string | null
          revoked_reason: string | null
          tenant_id: string
          visibility_scope: string
        }
        SetofOptions: {
          from: "*"
          to: "business_masonic_link_publication_consents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      uuid_generate_v1: { Args: never; Returns: string }
      uuid_generate_v1mc: { Args: never; Returns: string }
      uuid_generate_v3: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_generate_v4: { Args: never; Returns: string }
      uuid_generate_v5: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_nil: { Args: never; Returns: string }
      uuid_ns_dns: { Args: never; Returns: string }
      uuid_ns_oid: { Args: never; Returns: string }
      uuid_ns_url: { Args: never; Returns: string }
      uuid_ns_x500: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bus_cat_business"
            columns: ["tenant_id", "business_id"]
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      business_reviews: {
        Row: {
          business_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
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
          owner_id: string
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
          owner_id: string
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
          owner_id?: string
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
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
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          evidence_type: string
          file_hash?: string | null
          file_url: string
          id?: string
          issuance_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          evidence_type?: string
          file_hash?: string | null
          file_url?: string
          id?: string
          issuance_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_evidence_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "credential_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_issuances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cred_issuance_business"
            columns: ["tenant_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "fk_cred_issuance_org"
            columns: ["tenant_id", "organization_id"]
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
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
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
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
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "fk_org_biz_partnership_org"
            columns: ["tenant_id", "organization_id"]
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "fk_org_membership_person"
            columns: ["tenant_id", "person_id"]
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "fk_org_rel_target"
            columns: ["tenant_id", "target_organization_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "fk_bml_business"
            columns: ["tenant_id", "business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "business_masonic_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_masonic_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "fk_bmle_link"
            columns: ["tenant_id", "link_id"]
            isOneToOne: false
            referencedRelation: "business_masonic_links"
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
          revoked_at: string | null
          revocation_reason: string | null
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
          revoked_at?: string | null
          revocation_reason?: string | null
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
          revoked_at?: string | null
          revocation_reason?: string | null
          status?: string
          tenant_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bmla_link"
            columns: ["tenant_id", "link_id"]
            isOneToOne: false
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
          id: string
          link_id: string
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
          id?: string
          link_id: string
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
          id?: string
          link_id?: string
          tenant_id?: string
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bmlpc_link"
            columns: ["tenant_id", "link_id"]
            isOneToOne: false
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
            foreignKeyName: "fk_bmlc_link"
            columns: ["tenant_id", "link_id"]
            isOneToOne: false
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
            foreignKeyName: "fk_bmlh_link"
            columns: ["tenant_id", "link_id"]
            isOneToOne: false
            referencedRelation: "business_masonic_links"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      organizations: {
        Row: {
          code_number: number | null
          contact_email: string | null
          created_at: string
          foundation_date: string | null
          id: string
          is_active: boolean
          meeting_schedule: string | null
          name: string
          potency: string
          rite: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code_number?: number | null
          contact_email?: string | null
          created_at?: string
          foundation_date?: string | null
          id?: string
          is_active?: boolean
          meeting_schedule?: string | null
          name: string
          potency: string
          rite?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code_number?: number | null
          contact_email?: string | null
          created_at?: string
          foundation_date?: string | null
          id?: string
          is_active?: boolean
          meeting_schedule?: string | null
          name?: string
          potency?: string
          rite?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["tenant_id", "id"]
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
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: true
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
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      has_business_permission: {
        Args: { p_business_id: string; p_roles: string[]; p_tenant_id: string }
        Returns: boolean
      }
      has_global_platform_role: { Args: { p_role: string }; Returns: boolean }
      has_tenant_admin_access: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
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
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
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
          }
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
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: "master" | "socio_admin" | "anunciante" | "usuario_comum"
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role?: "master" | "socio_admin" | "anunciante" | "usuario_comum"
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: "master" | "socio_admin" | "anunciante" | "usuario_comum"
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
          }
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          plan_tier: "bronze" | "prata" | "ouro"
          slug: string | null
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          plan_tier?: "bronze" | "prata" | "ouro"
          slug?: string | null
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          plan_tier?: "bronze" | "prata" | "ouro"
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
          }
        ]
      }
      business_banners: {
        Row: {
          clicks: number | null
          created_at: string
          id: string
          image_url: string
          impressions: number | null
          is_active: boolean | null
          target_url: string | null
          tenant_id: string
          updated_at: string
          business_id: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string
          id?: string
          image_url: string
          impressions?: number | null
          is_active?: boolean | null
          target_url?: string | null
          tenant_id: string
          updated_at?: string
          business_id: string
        }
        Update: {
          clicks?: number | null
          created_at?: string
          id?: string
          image_url?: string
          impressions?: number | null
          is_active?: boolean | null
          target_url?: string | null
          tenant_id?: string
          updated_at?: string
          business_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_banners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      business_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          tenant_id: string
          updated_at: string
          business_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          tenant_id: string
          updated_at?: string
          business_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          tenant_id?: string
          updated_at?: string
          business_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      business_favorites: {
        Row: {
          created_at: string
          id: string
          tenant_id: string
          business_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          business_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string
          business_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      tenant_plans: {
        Row: {
          created_at: string
          id: string
          price_annual: number
          tier: "bronze" | "prata" | "ouro"
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_annual: number
          tier: "bronze" | "prata" | "ouro"
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          price_annual?: number
          tier?: "bronze" | "prata" | "ouro"
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


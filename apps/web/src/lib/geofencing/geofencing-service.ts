'use server';

import { createClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

export interface GeofencedBusinessItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  state: string;
  address?: string;
  logo_url?: string;
  cover_url?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  is_founder?: boolean;
  is_pedra_fundamental?: boolean;
  is_coluna_honra?: boolean;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export interface GeofencedLodgeItem {
  id: string;
  name: string;
  slug: string;
  potency: string;
  code_number?: number;
  rite?: string;
  city: string;
  state: string;
  address?: string;
  meeting_schedule?: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export interface GeofenceSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  radiusKm: number;
  userLat?: number;
  userLng?: number;
}

// Action 1: Geofencing de Empresas Anunciantes (Perto de Mim)
export async function searchBusinessesByGeofenceAction(payload: {
  userLat: number;
  userLng: number;
  radiusKm?: number;
  categorySlug?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<GeofenceSearchResult<GeofencedBusinessItem>> {
  const supabase = getAdminSupabase();

  const radius = payload.radiusKm || 25;
  const page = payload.page || 1;
  const pageSize = payload.pageSize || 12;

  try {
    const { data } = await supabase.rpc('public_geofence_search_businesses', {
      p_user_lat: payload.userLat,
      p_user_lng: payload.userLng,
      p_radius_km: radius,
      p_category_slug: payload.categorySlug || null,
      p_query: payload.query || null,
      p_page: page,
      p_page_size: pageSize,
    });

    if (data) {
      return {
        items: data.items || [],
        total: data.total || 0,
        page: data.page || page,
        pageSize: data.page_size || pageSize,
        totalPages: data.total_pages || 0,
        radiusKm: radius,
        userLat: payload.userLat,
        userLng: payload.userLng,
      };
    }
  } catch (_e) {
    // Fallback em dev se RPC indisponível
  }

  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
    radiusKm: radius,
    userLat: payload.userLat,
    userLng: payload.userLng,
  };
}

// Action 2: Geofencing de Lojas Maçônicas (Perto de Mim)
export async function searchLodgesByGeofenceAction(payload: {
  userLat: number;
  userLng: number;
  radiusKm?: number;
  potency?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<GeofenceSearchResult<GeofencedLodgeItem>> {
  const supabase = getAdminSupabase();

  const radius = payload.radiusKm || 25;
  const page = payload.page || 1;
  const pageSize = payload.pageSize || 12;

  try {
    const { data } = await supabase.rpc('public_geofence_search_lodges', {
      p_user_lat: payload.userLat,
      p_user_lng: payload.userLng,
      p_radius_km: radius,
      p_potency: payload.potency || null,
      p_query: payload.query || null,
      p_page: page,
      p_page_size: pageSize,
    });

    if (data) {
      return {
        items: data.items || [],
        total: data.total || 0,
        page: data.page || page,
        pageSize: data.page_size || pageSize,
        totalPages: data.total_pages || 0,
        radiusKm: radius,
        userLat: payload.userLat,
        userLng: payload.userLng,
      };
    }
  } catch (_e) {
    // Fallback
  }

  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
    radiusKm: radius,
    userLat: payload.userLat,
    userLng: payload.userLng,
  };
}

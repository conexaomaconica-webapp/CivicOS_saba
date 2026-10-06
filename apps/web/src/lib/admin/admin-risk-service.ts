'use server';

import { createServerSideClient } from '@/lib/supabase/server';

export type BusinessRiskLevel = 'alto' | 'medio';

export interface BusinessAtRisk {
  business_id: string;
  name: string;
  slug: string;
  days_since_update: number;
  active_benefits: number;
  views_30d: number;
  interactions_30d: number;
  connections_90d: number;
  pending_over_7d: number;
  score: number;
  risk_level: BusinessRiskLevel;
  reasons: string[];
}

/** Empresas com sinais de baixa percepção de valor (somente administradores; checagem feita no banco). */
export async function listBusinessesAtRiskAction(
  limit = 50
): Promise<{ success: boolean; items: BusinessAtRisk[]; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await (supabase as any).rpc('admin_businesses_at_risk', { p_limit: limit });
    if (error) return { success: false, items: [], error: 'Não foi possível carregar as empresas em risco.' };
    return { success: true, items: Array.isArray(data) ? (data as BusinessAtRisk[]) : [] };
  } catch (err) {
    console.error('[listBusinessesAtRiskAction]', err);
    return { success: false, items: [], error: 'Não foi possível carregar as empresas em risco.' };
  }
}

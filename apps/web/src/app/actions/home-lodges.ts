'use server';

import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';
import type { LodgeCardData } from '@/components/public/directory/LodgeCard';

export type HomeLodgeSearchInput = {
  state?: string;
  city?: string;
  potency?: string;
  rite?: string;
  day?: string;
};

export type HomeLodgeSearchResult = {
  success: boolean;
  items: LodgeCardData[];
  total: number;
  error?: string;
};

const clean = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 80) : '');
const HOME_RESULTS_LIMIT = 6;

/**
 * Busca de lojas da seção "Guia de Lojas Maçônicas" da página principal.
 * Só roda quando a pessoa aplica filtros; devolve poucas lojas e o total, para a página não carregar tudo.
 */
export async function searchHomeLodgesAction(input: HomeLodgeSearchInput): Promise<HomeLodgeSearchResult> {
  try {
    const filters = {
      state: clean(input?.state),
      city: clean(input?.city),
      potency: clean(input?.potency),
      rite: clean(input?.rite),
      day: clean(input?.day),
    };
    if (!Object.values(filters).some(Boolean)) {
      return { success: false, items: [], total: 0, error: 'Escolha ao menos um filtro para buscar as lojas.' };
    }

    const supabase = await createServerSideClient();
    const host = (await headers()).get('host') || 'localhost:3000';

    const { data, error } = await (supabase as any).rpc('public_lodges_search', {
      p_host: host,
      p_state: filters.state || null,
      p_city: filters.city || null,
      p_potency: filters.potency || null,
      p_rite: filters.rite || null,
      p_meeting_day: filters.day || null,
      p_sort: 'name',
      p_page: 1,
      p_page_size: HOME_RESULTS_LIMIT,
    });
    if (error) throw error;

    let items: LodgeCardData[] = Array.isArray(data?.items) ? data.items : [];

    // Dia/horário da reunião para os cards (complementa a função de busca, que nem sempre os devolve).
    if (items.length > 0 && items.some((item) => !item.primary_meeting)) {
      try {
        const { data: meetingRows } = await (supabase as any)
          .from('organization_meetings')
          .select('organization_id, meeting_day, meeting_time, label')
          .in('organization_id', items.map((item) => item.id))
          .eq('is_public', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        const first = new Map<string, { day: string; time: string; label: string | null }>();
        for (const row of meetingRows || []) {
          if (!first.has(row.organization_id)) {
            first.set(row.organization_id, { day: row.meeting_day, time: row.meeting_time, label: row.label ?? null });
          }
        }
        items = items.map((item) => ({ ...item, primary_meeting: item.primary_meeting ?? first.get(item.id) ?? null }));
      } catch {}
    }

    return { success: true, items, total: Number(data?.total ?? items.length) };
  } catch (err: any) {
    console.error('[searchHomeLodgesAction]', err);
    return { success: false, items: [], total: 0, error: 'Não foi possível buscar as lojas agora. Tente novamente.' };
  }
}

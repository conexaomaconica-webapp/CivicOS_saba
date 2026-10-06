'use server';

import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';

export interface LodgeSuggestion {
  id: string;
  /** Nome como cadastrado (sem o número). */
  name: string;
  codeNumber: number | null;
  potency: string | null;
  city: string | null;
  state: string | null;
  /** Texto para preencher o campo: "Nome nº 123". */
  label: string;
}

const MIN_CHARS = 2;
const LIMIT = 8;

/**
 * Sugestões de Loja para o cadastro público (onboarding): busca no mesmo catálogo do Guia de Lojas
 * (public_lodges_search), só dados já públicos, poucas linhas por consulta. Sem correspondência devolve lista vazia: o
 * formulário aceita o texto digitado e a equipe ajusta depois.
 */
export async function searchLodgeSuggestionsAction(query: string): Promise<LodgeSuggestion[]> {
  const term = String(query ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (term.length < MIN_CHARS) return [];

  try {
    const supabase = await createServerSideClient();
    const host = (await headers()).get('host') || 'localhost:3000';
    const { data, error } = await (supabase as any).rpc('public_lodges_search', {
      p_host: host,
      p_query: term,
      p_sort: 'name',
      p_page: 1,
      p_page_size: LIMIT,
    });
    if (error) return [];
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    return items.map((item) => {
      const codeNumber = item.code_number != null ? Number(item.code_number) : null;
      const name = String(item.name || '').trim();
      return {
        id: String(item.id),
        name,
        codeNumber: Number.isFinite(codeNumber as number) ? codeNumber : null,
        potency: item.potency_name || item.potency || null,
        city: item.city || null,
        state: item.state || null,
        label: `${name}${codeNumber ? ` nº ${codeNumber}` : ''}`,
      };
    });
  } catch {
    return [];
  }
}

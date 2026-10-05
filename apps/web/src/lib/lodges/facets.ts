import { canonicalPotencyCode, potencyLabel } from './potency';

/**
 * Opções reais dos filtros de lojas (estados, cidades por estado, potências e ritos),
 * derivadas das lojas ativas e publicadas. Usado pela seção "Guia de Lojas Maçônicas" da página principal.
 */
export type LodgeGuideFacets = {
  states: string[];
  cities: string[];
  citiesByState: Record<string, string[]>;
  /** Potências unificadas: CMSB/BA e CMSB/RJ viram uma só opção, CMSB. */
  potencies: Array<{ value: string; label: string }>;
  rites: string[];
  total: number;
};

export const EMPTY_LODGE_FACETS: LodgeGuideFacets = {
  states: [],
  cities: [],
  citiesByState: {},
  potencies: [],
  rites: [],
  total: 0,
};

const collator = new Intl.Collator('pt-BR');

export function buildLodgeFacets(
  rows: Array<{ city?: string | null; state?: string | null; potency?: string | null; rite?: string | null }>
): LodgeGuideFacets {
  const states = new Set<string>();
  const cities = new Set<string>();
  const potencies = new Set<string>();
  const rites = new Set<string>();
  const citiesByState: Record<string, Set<string>> = {};

  for (const row of rows) {
    const uf = (row.state || '').trim().toUpperCase();
    const city = (row.city || '').trim();
    const potency = canonicalPotencyCode(row.potency);
    const rite = (row.rite || '').trim();
    if (uf) states.add(uf);
    if (city) {
      cities.add(city);
      if (uf) (citiesByState[uf] ||= new Set()).add(city);
    }
    if (potency) potencies.add(potency);
    if (rite) rites.add(rite);
  }

  const sorted = (set: Set<string>) => [...set].sort(collator.compare);
  return {
    states: sorted(states),
    cities: sorted(cities),
    citiesByState: Object.fromEntries(Object.entries(citiesByState).map(([uf, set]) => [uf, sorted(set)])),
    potencies: sorted(potencies).map((code) => ({ value: code, label: potencyLabel(code) })),
    rites: sorted(rites),
    total: rows.length,
  };
}

export async function fetchLodgeFacets(supabase: any): Promise<LodgeGuideFacets> {
  try {
    const { data } = await supabase
      .from('organizations')
      .select('city, state, potency, rite')
      .eq('is_active', true)
      .eq('is_published', true)
      .limit(10000);
    return buildLodgeFacets(data || []);
  } catch {
    return EMPTY_LODGE_FACETS;
  }
}

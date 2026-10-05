/**
 * Tradução dos filtros de /guia/empresas (valores da tela) para os valores reais do banco.
 * A tela e o banco usavam nomes diferentes, por isso vários filtros nunca casavam.
 */

/** Vínculo maçônico da empresa: opção da tela -> tipos de vínculo (business_masonic_links.link_type). */
export const RELATIONSHIP_OPTIONS: Array<{ id: string; label: string; linkTypes: string[] }> = [
  { id: 'brother', label: 'Irmão (proprietário ou sócio)', linkTypes: ['owner', 'equity_partner'] },
  { id: 'family', label: 'Familiar (cunhada, sobrinho(a)…)', linkTypes: ['family_owner'] },
  { id: 'representative', label: 'Representante', linkTypes: ['sales_representative', 'authorized_agent'] },
  { id: 'staff', label: 'Colaborador ou executivo', linkTypes: ['employee', 'executive'] },
  { id: 'institutional', label: 'Parceiro institucional', linkTypes: ['institutional_partner'] },
];

// Ids antigos que ainda podem estar em links salvos.
const LEGACY_RELATIONSHIP_IDS: Record<string, string> = { wife: 'family', child: 'family' };

export function relationshipLabel(id: string): string {
  const canonical = LEGACY_RELATIONSHIP_IDS[id] || id;
  return RELATIONSHIP_OPTIONS.find((option) => option.id === canonical)?.label || id;
}

export function expandRelationships(ids: string[]): string[] {
  const types = new Set<string>();
  for (const raw of ids) {
    const canonical = LEGACY_RELATIONSHIP_IDS[raw] || raw;
    const option = RELATIONSHIP_OPTIONS.find((item) => item.id === canonical);
    if (option) option.linkTypes.forEach((type) => types.add(type));
    else types.add(raw); // valor já no formato do banco
  }
  return [...types];
}

/** Plano comercial: nome canônico da tela -> todos os códigos que o banco pode ter para ele. */
const PLAN_ALIASES: Record<string, string[]> = {
  ouro: ['ouro', 'acacia', 'acácia', 'gold', 'ouro_founder', 'acacia_pedra_fundamental'],
  acacia: ['ouro', 'acacia', 'acácia', 'gold', 'ouro_founder', 'acacia_pedra_fundamental'],
  prata: ['prata', 'compasso', 'silver'],
  compasso: ['prata', 'compasso', 'silver'],
  bronze: ['bronze', 'esquadro'],
  esquadro: ['bronze', 'esquadro'],
};

export function expandPlans(ids: string[]): string[] {
  const codes = new Set<string>();
  for (const raw of ids) {
    const key = raw.toLowerCase().trim();
    (PLAN_ALIASES[key] || [key]).forEach((code) => codes.add(code));
  }
  return [...codes];
}

export function planLabel(id: string): string {
  const key = id.toLowerCase();
  if (PLAN_ALIASES[key]?.includes('acacia')) return 'Acácia';
  if (PLAN_ALIASES[key]?.includes('compasso')) return 'Compasso';
  if (PLAN_ALIASES[key]?.includes('esquadro')) return 'Esquadro';
  return id.toUpperCase();
}

/** Selos: a tela usa "coluna_honra"; o banco guarda "coluna_de_honra". */
export function expandRecognitions(ids: string[]): string[] {
  const keys = new Set<string>();
  for (const raw of ids) keys.add(raw === 'coluna_honra' ? 'coluna_de_honra' : raw);
  return [...keys];
}

/** Localização do visitante, guardada em cookie de sessão curta (não vai na URL, para não vazar em links compartilhados). */
export const GEO_COOKIE = 'cm_geo';

export function parseGeoCookie(value: string | undefined | null): { lat: number; lng: number } | null {
  if (!value) return null;
  const [latRaw, lngRaw] = decodeURIComponent(value).split(',');
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

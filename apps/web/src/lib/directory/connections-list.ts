/** Parâmetros e utilidades da página pública /conexoes (sem dependências de servidor). */

export const CONNECTION_TYPES = ['compra', 'servico', 'parceria', 'visita'] as const;
export type ConnectionTypeFilter = (typeof CONNECTION_TYPES)[number];

export const CONNECTIONS_PAGE_SIZE = 12;
export const CONNECTIONS_MAX_QUERY = 80;
const MAX_PAGE = 500;

export type ConnectionsListParams = {
  q: string;
  type: ConnectionTypeFilter | '';
  order: 'recent' | 'oldest';
  page: number;
  /** Slug da empresa (filtro vindo do perfil da empresa); vazio = todas. */
  empresa: string;
};

export const CONNECTION_TYPE_LABEL: Record<ConnectionTypeFilter, string> = {
  compra: 'Compras',
  servico: 'Serviços',
  parceria: 'Parcerias',
  visita: 'Visitas',
};

const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

/** Lê e SANEIA os parâmetros da URL (valores inválidos viram o padrão; nada chega ao banco sem validação). */
export function parseConnectionsListParams(raw: Record<string, string | string[] | undefined> | undefined): ConnectionsListParams {
  const input = raw ?? {};
  const q = first(input.q).replace(/\s+/g, ' ').trim().slice(0, CONNECTIONS_MAX_QUERY);
  const typeRaw = first(input.tipo);
  const type = (CONNECTION_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as ConnectionTypeFilter) : '';
  const order = first(input.ordem) === 'antigas' ? 'oldest' : 'recent';
  const pageNumber = Number.parseInt(first(input.pagina), 10);
  const page = Number.isFinite(pageNumber) ? Math.min(MAX_PAGE, Math.max(1, pageNumber)) : 1;
  const empresaRaw = first(input.empresa).trim().toLowerCase();
  const empresa = /^[a-z0-9][a-z0-9-]{0,119}$/.test(empresaRaw) ? empresaRaw : '';
  return { q, type, order, page, empresa };
}

/** Há busca/filtro/ordem diferente do padrão? (página filtrada não deve ser indexada e usa o estado "sem resultados"). */
export function hasActiveFilters(params: ConnectionsListParams): boolean {
  return Boolean(params.q) || Boolean(params.type) || Boolean(params.empresa) || params.order !== 'recent';
}

/** Monta a URL pública (/conexoes?...) com os parâmetros em português, omitindo os padrões. */
export function buildConnectionsUrl(params: Partial<ConnectionsListParams>): string {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.type) search.set('tipo', params.type);
  if (params.empresa) search.set('empresa', params.empresa);
  if (params.order === 'oldest') search.set('ordem', 'antigas');
  if (params.page && params.page > 1) search.set('pagina', String(params.page));
  const query = search.toString();
  return query ? `/conexoes?${query}` : '/conexoes';
}

/** Janela de páginas para a paginação (ex.: 1 … 4 5 6 … 20). */
export function paginationWindow(current: number, total: number, radius = 1): Array<number | 'gap'> {
  if (total <= 1) return [];
  const pages = new Set<number>([1, total]);
  for (let p = current - radius; p <= current + radius; p += 1) if (p >= 1 && p <= total) pages.add(p);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

/**
 * DADOS DE DEMONSTRAÇÃO SOMENTE PARA VALIDAÇÃO VISUAL LOCAL do mural (Etapa 2).
 * Só é carregado quando NODE_ENV != 'production' E CONNECTIONS_LIST_FIXTURE=1. Em produção este módulo nunca é importado.
 */
import type { ConnectionFeedItem, ConnectionsListResult, PublicConnectionListItem } from '@/app/actions/connections';
import type { ConnectionsListParams } from './connections-list';
import { pickShowcaseRandom } from './connections-feed';

export function connectionsFixtureEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.CONNECTIONS_LIST_FIXTURE === '1';
}

const TYPES = ['compra', 'servico', 'parceria', 'visita'] as const;
const BUSINESSES = ['Padaria São José', 'Ótica Central', 'Clínica Vida', 'Auto Peças Irmãos', 'Escritório Esquadro', 'Café Acácia', 'Gráfica Compasso', 'Mercearia do Vale'];
const MESSAGES = [
  'Atendimento excelente e preço justo.',
  'Conhecemos a empresa pela Conexão Maçônica e iniciamos uma ótima parceria.',
  'Voltarei com toda a família.',
  null,
  'Serviço entregue no prazo, recomendo.',
];
const PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#e7dacd"/><text x="320" y="190" font-size="28" text-anchor="middle" fill="#4b161b" font-family="serif">foto aprovada (demonstração)</text></svg>')}`;

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

const ALL: PublicConnectionListItem[] = Array.from({ length: 30 }, (_, i) => {
  const name = BUSINESSES[i % BUSINESSES.length]!;
  return {
    // UUID v4 válido (a página individual valida o formato do identificador).
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    connection_type: TYPES[i % TYPES.length]!,
    item_description: i % 3 === 0 ? 'pães artesanais' : null,
    message: MESSAGES[i % MESSAGES.length] ?? null,
    photo_url: i % 5 === 0 ? PHOTO : null,
    member_first_name: ['João', 'Pedro', 'Marcos', 'Paulo'][i % 4]!,
    confirmed_at: new Date(Date.now() - i * 86400000).toISOString(),
    business_name: name,
    business_slug: slugify(name),
    business_logo_url: null,
    like_count: i % 4,
    liked_by_me: false,
  };
});

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function fixtureList(params: ConnectionsListParams, pageSize: number): ConnectionsListResult {
  let items = ALL.filter((i) => (!params.type || i.connection_type === params.type) && (!params.empresa || i.business_slug === params.empresa));
  if (params.q) {
    const q = norm(params.q);
    items = items.filter((i) => norm(`${i.business_name} ${i.item_description ?? ''} ${i.message ?? ''}`).includes(q));
  }
  if (params.order === 'oldest') items = [...items].reverse();
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const start = (params.page - 1) * pageSize;
  return { ok: true, items: items.slice(start, start + pageSize), total, page: params.page, pageSize, totalPages };
}

export function fixtureDetail(id: string): PublicConnectionListItem | null {
  return ALL.find((item) => item.id === id) ?? null;
}

/** Vitrine compacta: 1 por empresa, sorteio com preferência para as que têm foto aprovada. */
export function fixtureFeed(limit: number, onePerBusiness: boolean): ConnectionFeedItem[] {
  return onePerBusiness ? pickShowcaseRandom(ALL, limit) : ALL.slice(0, limit);
}

// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import {
  CONNECTIONS_PAGE_SIZE,
  buildConnectionsUrl,
  hasActiveFilters,
  paginationWindow,
  parseConnectionsListParams,
} from '../src/lib/directory/connections-list';

const rpcMock = vi.fn();

vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'conexaomaconica.com.br' }) }));
vi.mock('@/lib/supabase/server', () => ({ createServerSideClient: async () => ({ rpc: rpcMock }) }));
vi.mock('@/lib/advertiser/advertiser-access', () => ({ findAdvertiserBusiness: vi.fn() }));
vi.mock('@/lib/referrals/attribution', () => ({ linkVisitorToCurrentUser: vi.fn() }));
vi.mock('@/components/public/business/sections/ConnectionLikeButton', () => ({ ConnectionLikeButton: () => <span data-testid="like" /> }));
vi.mock('@/components/public/business/sections/ReportConnectionButton', () => ({ ReportConnectionButton: () => <span data-testid="report" /> }));
vi.mock('@/components/public/directory/ConnectionStartFlow', () => ({ ConnectionStartFlow: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button> }));

import { getConnectionsFeedAction, getPublicConnectionsListAction, type PublicConnectionListItem } from '../src/app/actions/connections';
import { ConnectionCard } from '../src/components/public/connections/ConnectionCard';
import { ConnectionsFilters } from '../src/components/public/connections/ConnectionsFilters';
import { ConnectionsPagination } from '../src/components/public/connections/ConnectionsPagination';
import { ConnectionsEmptyState, ConnectionsErrorState, ConnectionsNoResults, ConnectionsSkeleton } from '../src/components/public/connections/ConnectionsStates';

const item = (n: number, extra: Partial<PublicConnectionListItem> = {}): PublicConnectionListItem => ({
  id: `c${n}`,
  connection_type: 'compra',
  item_description: null,
  message: `Mensagem ${n}`,
  photo_url: null,
  member_first_name: 'João',
  confirmed_at: '2026-11-01T12:00:00Z',
  business_name: `Empresa ${n}`,
  business_slug: `empresa-${n}`,
  business_logo_url: null,
  like_count: 0,
  liked_by_me: false,
  ...extra,
});

describe('parâmetros da URL de /conexoes', () => {
  it('padrões e saneamento (valores inválidos viram o padrão)', () => {
    expect(parseConnectionsListParams(undefined)).toEqual({ q: '', type: '', order: 'recent', page: 1, empresa: '' });
    expect(parseConnectionsListParams({ tipo: 'hack', ordem: 'x', pagina: 'abc' })).toEqual({ q: '', type: '', order: 'recent', page: 1, empresa: '' });
    expect(parseConnectionsListParams({ pagina: '-7' }).page).toBe(1);
    expect(parseConnectionsListParams({ pagina: '999999' }).page).toBe(500);
    expect(parseConnectionsListParams({ q: ['  padaria   são  josé ', 'x'] }).q).toBe('padaria são josé');
    expect(parseConnectionsListParams({ q: 'a'.repeat(300) }).q).toHaveLength(80);
  });

  it('lê tipo, ordem e página válidos', () => {
    expect(parseConnectionsListParams({ q: 'ótica', tipo: 'parceria', ordem: 'antigas', pagina: '3' })).toEqual({ q: 'ótica', type: 'parceria', order: 'oldest', page: 3, empresa: '' });
  });

  it('buildConnectionsUrl omite padrões e usa os nomes em português', () => {
    expect(buildConnectionsUrl({})).toBe('/conexoes');
    expect(buildConnectionsUrl({ page: 1, order: 'recent' })).toBe('/conexoes');
    expect(buildConnectionsUrl({ q: 'ótica central', type: 'visita', order: 'oldest', page: 2 })).toBe('/conexoes?q=%C3%B3tica+central&tipo=visita&ordem=antigas&pagina=2');
  });

  it('hasActiveFilters ignora a página e considera busca, tipo e ordem', () => {
    expect(hasActiveFilters(parseConnectionsListParams({ pagina: '4' }))).toBe(false);
    expect(hasActiveFilters(parseConnectionsListParams({ q: 'a' }))).toBe(true);
    expect(hasActiveFilters(parseConnectionsListParams({ tipo: 'compra' }))).toBe(true);
    expect(hasActiveFilters(parseConnectionsListParams({ ordem: 'antigas' }))).toBe(true);
  });

  it('janela de paginação', () => {
    expect(paginationWindow(1, 1)).toEqual([]);
    expect(paginationWindow(1, 3)).toEqual([1, 2, 3]);
    expect(paginationWindow(5, 20)).toEqual([1, 'gap', 4, 5, 6, 'gap', 20]);
    expect(paginationWindow(1, 20)).toEqual([1, 2, 'gap', 20]);
    expect(paginationWindow(20, 20)).toEqual([1, 'gap', 19, 20]);
  });
});

describe('getPublicConnectionsListAction', () => {
  beforeEach(() => rpcMock.mockReset());

  it('envia busca, tipo, ordem e página ao banco (paginação no servidor, tamanho fixo)', async () => {
    rpcMock.mockResolvedValueOnce({ data: { items: [item(1)], total: 31, page: 2, page_size: 12, total_pages: 3 }, error: null });
    const result = await getPublicConnectionsListAction({ q: 'ótica', type: 'parceria', order: 'oldest', page: 2, empresa: '' });
    expect(rpcMock).toHaveBeenCalledWith('public_connections_list', {
      p_host: 'conexaomaconica.com.br', p_query: 'ótica', p_type: 'parceria', p_order: 'oldest', p_page: 2, p_page_size: CONNECTIONS_PAGE_SIZE, p_business_slug: null,
    });
    expect(result).toMatchObject({ ok: true, total: 31, page: 2, pageSize: 12, totalPages: 3 });
  });

  it('sem filtros envia nulos; erro do banco (migration 245 ausente) vira estado de erro, sem lançar', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'function not found' } });
    expect(await getPublicConnectionsListAction({ q: '', type: '', order: 'recent', page: 1, empresa: '' })).toEqual({ ok: false, error: 'indisponivel' });
    expect(rpcMock.mock.calls[0]![1]).toMatchObject({ p_query: null, p_type: null });
  });

  it('falha de rede vira estado de erro', async () => {
    rpcMock.mockRejectedValueOnce(new Error('rede'));
    expect(await getPublicConnectionsListAction({ q: '', type: '', order: 'recent', page: 1, empresa: '' })).toEqual({ ok: false, error: 'indisponivel' });
  });
});

describe('vitrines: sorteio entre empresas distintas, preferindo fotos', () => {
  beforeEach(() => rpcMock.mockReset());

  it('pede ao banco 1 por empresa, com preferência de foto e o conjunto amplo para sortear', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await getConnectionsFeedAction(3, { onePerBusiness: true });
    expect(rpcMock.mock.calls[0]![1]).toMatchObject({ p_one_per_business: true, p_prefer_photo: true, p_limit: 24 });
  });

  it('reserva (migration 244 ausente): dentro de cada empresa vale a conexão mais recente; a ordem entre empresas é sorteada', async () => {
    const at = (n: number, slug: string, date: string) => ({ ...item(n, { business_slug: slug, confirmed_at: date }) });
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { message: 'nope' } })
      .mockResolvedValueOnce({
        data: [at(1, 'a', '2026-01-01T00:00:00Z'), at(2, 'a', '2026-06-01T00:00:00Z'), at(3, 'b', '2026-05-01T00:00:00Z'), at(4, 'c', '2026-07-01T00:00:00Z')],
        error: null,
      });
    const result = await getConnectionsFeedAction(3, { onePerBusiness: true });
    expect(result.map((r) => r.id).sort()).toEqual(['c2', 'c3', 'c4']);
  });
});

describe('ConnectionCard', () => {
  afterEach(() => cleanup());

  it('mostra tipo, empresa em destaque com link, mensagem e confirmação; sem foto não há imagem', () => {
    const { container, getByText } = render(<ConnectionCard item={item(1)} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(getByText('Compra')).toBeTruthy();
    expect(getByText('Confirmado pela empresa')).toBeTruthy();
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/guia/empresa-1?src=connections_wall');
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-01T12:00:00Z');
  });

  it('com foto aprovada (entregue pelo banco) exibe a imagem com texto alternativo', () => {
    const { container } = render(<ConnectionCard item={item(2, { photo_url: 'https://x/ok.jpg' })} />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://x/ok.jpg');
    expect(img?.getAttribute('alt')).toContain('Empresa 2');
  });
});

describe('ConnectionsFilters', () => {
  afterEach(() => cleanup());

  it('busca por GET com rótulos acessíveis e abas de tipo preservando busca e ordem', () => {
    const params = parseConnectionsListParams({ q: 'ótica', ordem: 'antigas' });
    const { container, getByLabelText, getByText } = render(<ConnectionsFilters params={params} />);
    expect(container.querySelector('form')?.getAttribute('method')).toBe('get');
    expect((getByLabelText('Buscar por empresa ou conteúdo') as HTMLInputElement).value).toBe('ótica');
    expect((getByLabelText('Ordenar por') as HTMLSelectElement).value).toBe('antigas');
    expect(getByText('Parcerias').getAttribute('href')).toBe('/conexoes?q=%C3%B3tica&tipo=parceria&ordem=antigas');
    expect(getByText('Todas').getAttribute('aria-current')).toBe('true');
    expect(getByText('Limpar filtros').getAttribute('href')).toBe('/conexoes');
  });

  it('sem filtros não mostra "Limpar filtros"; o tipo ativo é marcado e mantido no formulário', () => {
    const none = render(<ConnectionsFilters params={parseConnectionsListParams({})} />);
    expect(none.queryByText('Limpar filtros')).toBeNull();
    none.unmount();
    const typed = render(<ConnectionsFilters params={parseConnectionsListParams({ tipo: 'visita' })} />);
    expect(typed.getByText('Visitas').getAttribute('aria-current')).toBe('true');
    expect((typed.container.querySelector('input[name="tipo"]') as HTMLInputElement).value).toBe('visita');
  });
});

describe('ConnectionsPagination', () => {
  afterEach(() => cleanup());

  it('página única não renderiza nada', () => {
    const { container } = render(<ConnectionsPagination params={parseConnectionsListParams({})} page={1} totalPages={1} />);
    expect(container.innerHTML).toBe('');
  });

  it('links com URL própria, página atual marcada, anterior/próxima e filtros preservados', () => {
    const params = parseConnectionsListParams({ q: 'a', tipo: 'compra', pagina: '2' });
    const { container, getByLabelText } = render(<ConnectionsPagination params={params} page={2} totalPages={5} />);
    expect(getByLabelText('Página 2').getAttribute('aria-current')).toBe('page');
    expect(getByLabelText('Página anterior').getAttribute('href')).toBe('/conexoes?q=a&tipo=compra');
    expect(getByLabelText('Próxima página').getAttribute('href')).toBe('/conexoes?q=a&tipo=compra&pagina=3');
    expect(getByLabelText('Página 5').getAttribute('href')).toBe('/conexoes?q=a&tipo=compra&pagina=5');
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Paginação das conexões');
  });
});

describe('estados da página', () => {
  afterEach(() => cleanup());

  it('vazio: convida a registrar e não simula registros', () => {
    const { getByText, container } = render(<ConnectionsEmptyState />);
    expect(getByText('Ainda não há conexões publicadas')).toBeTruthy();
    expect(getByText('Registrar minha conexão')).toBeTruthy();
    expect(container.querySelectorAll('article')).toHaveLength(0);
  });

  it('sem resultados: oferece voltar a todas as conexões', () => {
    const { getByText } = render(<ConnectionsNoResults />);
    expect(getByText('Nenhuma conexão encontrada')).toBeTruthy();
    expect(getByText('Ver todas as conexões').getAttribute('href')).toBe('/conexoes');
  });

  it('erro: alerta acessível e nova tentativa', () => {
    const { getByRole, getByText } = render(<ConnectionsErrorState retryHref="/conexoes?pagina=2" />);
    expect(getByRole('alert')).toBeTruthy();
    expect(getByText('Tentar novamente').getAttribute('href')).toBe('/conexoes?pagina=2');
  });

  it('carregamento: esqueleto com papel de status', () => {
    const { getByRole } = render(<ConnectionsSkeleton />);
    expect(getByRole('status').getAttribute('aria-label')).toBe('Carregando conexões');
  });
});

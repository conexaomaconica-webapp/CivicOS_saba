// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { buildConnectionsUrl, hasActiveFilters, parseConnectionsListParams } from '../src/lib/directory/connections-list';

const rpcMock = vi.fn();
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'conexaomaconica.com.br' }) }));
vi.mock('@/lib/supabase/server', () => ({ createServerSideClient: async () => ({ rpc: rpcMock }) }));
vi.mock('@/lib/advertiser/advertiser-access', () => ({ findAdvertiserBusiness: vi.fn() }));
vi.mock('@/lib/referrals/attribution', () => ({ linkVisitorToCurrentUser: vi.fn() }));

import { getPublicConnectionsListAction } from '../src/app/actions/connections';
import { BusinessConnectionsSection } from '../src/components/public/business/sections/BusinessConnectionsSection';

const ID1 = '00000000-0000-4000-8000-000000000001';
const ID2 = '00000000-0000-4000-8000-000000000002';
const item = (id: string, o: Record<string, unknown> = {}) => ({
  id, connection_type: 'servico', item_description: 'óculos de grau', message: 'Atendimento excelente', photo_url: 'https://cdn.x/foto.jpg',
  member_first_name: 'João', confirmed_at: '2026-11-01T10:00:00Z', business_name: 'Ótica Central', business_slug: 'otica-central', business_logo_url: null,
  like_count: 3, liked_by_me: false, ...o,
});
const payload = (items: unknown[], total = items.length) => ({ items, total, page: 1, page_size: 2, total_pages: Math.ceil(total / 2) });

beforeEach(() => { rpcMock.mockReset(); });
afterEach(() => cleanup());

describe('parâmetro empresa da listagem', () => {
  it('aceita só slug válido; qualquer outra coisa vira vazio', () => {
    expect(parseConnectionsListParams({ empresa: 'Otica-Central' }).empresa).toBe('otica-central');
    for (const bad of ['../x', "a'; drop table", 'a b', '-x', '', 'x'.repeat(130)]) expect(parseConnectionsListParams({ empresa: bad }).empresa).toBe('');
  });
  it('monta a URL com a empresa, conta como filtro ativo e é preservada na paginação', () => {
    expect(buildConnectionsUrl({ empresa: 'otica-central' })).toBe('/conexoes?empresa=otica-central');
    expect(buildConnectionsUrl({ empresa: 'otica-central', page: 2, type: 'compra' })).toBe('/conexoes?tipo=compra&empresa=otica-central&pagina=2');
    expect(hasActiveFilters(parseConnectionsListParams({ empresa: 'otica-central' }))).toBe(true);
    expect(hasActiveFilters(parseConnectionsListParams({}))).toBe(false);
  });
});

describe('ação de listagem por empresa', () => {
  const base = { q: '', type: '' as const, order: 'recent' as const, page: 1 };
  it('envia p_business_slug e o tamanho de página pedido', async () => {
    rpcMock.mockResolvedValue({ data: payload([item(ID1)]), error: null });
    await getPublicConnectionsListAction({ ...base, empresa: 'otica-central' }, { pageSize: 2 });
    expect(rpcMock).toHaveBeenCalledWith('public_connections_list', expect.objectContaining({ p_business_slug: 'otica-central', p_page_size: 2 }));
  });
  it('sem filtro de empresa e sem a migration 247: repete a chamada da 245 (sem p_business_slug)', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } }).mockResolvedValueOnce({ data: payload([item(ID1)]), error: null });
    const r = await getPublicConnectionsListAction({ ...base, empresa: '' });
    expect(r.ok).toBe(true);
    expect(rpcMock.mock.calls[1]![1]).not.toHaveProperty('p_business_slug');
  });
  it('com filtro de empresa e sem a 247: erro (não finge que a empresa não tem conexões)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    expect((await getPublicConnectionsListAction({ ...base, empresa: 'x' })).ok).toBe(false);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });
});

describe('seção "Conexões desta empresa" no perfil', () => {
  const renderSection = async () => render(await BusinessConnectionsSection({ slug: 'otica-central', businessName: 'Ótica Central' }));

  it('mostra no máximo 2 conexões, o total e o link para a lista filtrada, sem foto nem curtidas', async () => {
    rpcMock.mockResolvedValue({ data: payload([item(ID1), item(ID2, { connection_type: 'parceria', item_description: null })], 8), error: null });
    const { container, getByText, getByRole } = await renderSection();
    expect(getByRole('heading', { name: 'Conexões desta empresa' })).toBeTruthy();
    expect(getByText('8 conexões')).toBeTruthy();
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-testid="like"]')).toBeNull();
    expect(container.textContent).not.toContain('foto.jpg');
    const all = container.querySelector('a[href="/conexoes?empresa=otica-central"]');
    expect(all?.textContent).toContain('Ver todas as conexões (8)');
    expect(container.querySelector(`a[href="/conexoes/${ID1}"]`)).toBeTruthy();
    expect(rpcMock).toHaveBeenCalledWith('public_connections_list', expect.objectContaining({ p_business_slug: 'otica-central', p_page_size: 2 }));
  });
  it('1 conexão: singular e sem contagem extra no link', async () => {
    rpcMock.mockResolvedValue({ data: payload([item(ID1)], 1), error: null });
    const { getByText, container } = await renderSection();
    expect(getByText('1 conexão')).toBeTruthy();
    expect(container.querySelector('a[href="/conexoes?empresa=otica-central"]')?.textContent?.trim()).toBe('Ver todas as conexões');
  });
  it('sem conexões, com erro ou lançando exceção: a seção não aparece (perfil nunca quebra)', async () => {
    rpcMock.mockResolvedValue({ data: payload([], 0), error: null });
    expect((await renderSection()).container.innerHTML).toBe('');
    cleanup();
    rpcMock.mockResolvedValue({ data: null, error: { code: 'X' } });
    expect((await renderSection()).container.innerHTML).toBe('');
    cleanup();
    rpcMock.mockRejectedValue(new Error('boom'));
    expect((await renderSection()).container.innerHTML).toBe('');
  });
});

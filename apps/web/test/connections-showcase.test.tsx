// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { COMPACT_SHOWCASE_LIMIT, FEED_DB_MAX, pickOnePerBusiness, pickShowcaseRandom } from '../src/lib/directory/connections-feed';

const rpcMock = vi.fn();

vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'conexaomaconica.com.br' }) }));
vi.mock('@/lib/supabase/server', () => ({ createServerSideClient: async () => ({ rpc: rpcMock }) }));
vi.mock('@/lib/advertiser/advertiser-access', () => ({ findAdvertiserBusiness: vi.fn() }));
vi.mock('@/lib/referrals/attribution', () => ({ linkVisitorToCurrentUser: vi.fn() }));
vi.mock('@/components/public/business/sections/ConnectionLikeButton', () => ({ ConnectionLikeButton: () => <span data-testid="like" /> }));
vi.mock('@/components/public/business/sections/ReportConnectionButton', () => ({ ReportConnectionButton: () => <span data-testid="report" /> }));

import { getConnectionsFeedAction } from '../src/app/actions/connections';
import { ConnectionsCompactShowcase } from '../src/components/public/connections/ConnectionsCompactShowcase';
import { DirectoryConnectionsShowcase } from '../src/components/public/directory/DirectoryConnectionsShowcase';

const item = (n: number, business: string, extra: Record<string, unknown> = {}) => ({
  id: `c${n}`,
  connection_type: 'compra' as const,
  item_description: null,
  message: `Mensagem ${n}`,
  photo_url: null,
  member_first_name: 'João',
  confirmed_at: '2026-11-01T00:00:00Z',
  business_name: `Empresa ${business}`,
  business_slug: business,
  like_count: 0,
  liked_by_me: false,
  ...extra,
});

describe('pickOnePerBusiness', () => {
  it('mantém a ordem, uma por empresa, até o limite', () => {
    const list = [item(1, 'a'), item(2, 'a'), item(3, 'b'), item(4, 'a'), item(5, 'c'), item(6, 'd')];
    expect(pickOnePerBusiness(list, 3).map((i) => i.id)).toEqual(['c1', 'c3', 'c5']);
  });
  it('menos empresas que o limite: devolve só as existentes; vazio e inválido não quebram', () => {
    expect(pickOnePerBusiness([item(1, 'a'), item(2, 'a')], 3)).toHaveLength(1);
    expect(pickOnePerBusiness([], 3)).toEqual([]);
    expect(pickOnePerBusiness([{ business_slug: null }, { business_slug: '' }], 3)).toEqual([]);
  });
});

describe('getConnectionsFeedAction (vitrines compactas)', () => {
  beforeEach(() => rpcMock.mockReset());

  it('pede ao banco um conjunto amplo (24) de empresas distintas, com fotos primeiro, e sorteia 3 dele', async () => {
    rpcMock.mockResolvedValueOnce({ data: [item(1, 'a'), item(2, 'b'), item(3, 'c')], error: null });
    const result = await getConnectionsFeedAction(COMPACT_SHOWCASE_LIMIT, { onePerBusiness: true });
    expect(result).toHaveLength(3);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('public_connections_feed', expect.objectContaining({ p_limit: FEED_DB_MAX, p_one_per_business: true, p_prefer_photo: true, p_only_with_photo: false }));
  });

  it('migration 244 ausente: busca o máximo do banco e sorteia 1 por empresa (ainda chega a 3 empresas distintas)', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { message: 'function not found' } })
      .mockResolvedValueOnce({ data: [item(1, 'a'), item(2, 'a'), item(3, 'a'), item(4, 'b'), item(5, 'c'), item(6, 'd')], error: null });
    const result = await getConnectionsFeedAction(3, { onePerBusiness: true });
    expect(result).toHaveLength(3);
    expect(new Set(result.map((i) => i.business_slug)).size).toBe(3);
    expect(rpcMock.mock.calls[1]![1]).toMatchObject({ p_limit: FEED_DB_MAX });
    expect(rpcMock.mock.calls[1]![1]).not.toHaveProperty('p_one_per_business');
  });

  it('sem a opção, a consulta é a de antes (o app e outras telas não mudam)', async () => {
    rpcMock.mockResolvedValueOnce({ data: [item(1, 'a'), item(2, 'a')], error: null });
    const result = await getConnectionsFeedAction(6);
    expect(result).toHaveLength(2);
    expect(rpcMock.mock.calls[0]![1]).toEqual({ p_host: 'conexaomaconica.com.br', p_limit: 6, p_only_with_photo: false });
  });

  it('falha de rede não derruba a página', async () => {
    rpcMock.mockRejectedValueOnce(new Error('rede'));
    expect(await getConnectionsFeedAction(3, { onePerBusiness: true })).toEqual([]);
  });
});

describe('ConnectionsCompactShowcase', () => {
  afterEach(() => cleanup());

  it('com 3 registros: 3 cartões, foto só no que tem foto aprovada e com link para cada empresa', () => {
    const { container, getAllByRole } = render(
      <ConnectionsCompactShowcase items={[item(1, 'a', { photo_url: 'https://x/foto.jpg' }), item(2, 'b'), item(3, 'c')]} />,
    );
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0]!.getAttribute('src')).toBe('https://x/foto.jpg');
    expect(getAllByRole('listitem')).toHaveLength(3);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href')).filter((h) => h?.startsWith('/guia/'));
    expect(hrefs).toEqual(['/guia/a?src=feed_wall', '/guia/b?src=feed_wall', '/guia/c?src=feed_wall']);
  });

  it('1 registro: um cartão e sem navegação; 2 ou mais: navegação acessível para o celular', () => {
    const one = render(<ConnectionsCompactShowcase items={[item(1, 'a')]} />);
    expect(one.container.querySelectorAll('li')).toHaveLength(1);
    expect(one.queryByLabelText('Próxima conexão')).toBeNull();
    one.unmount();

    const many = render(<ConnectionsCompactShowcase items={[item(1, 'a'), item(2, 'b')]} />);
    expect(many.getByLabelText('Próxima conexão')).toBeTruthy();
    expect(many.getByLabelText('Conexão anterior')).toBeTruthy();
    expect(many.getByText('1 de 2')).toBeTruthy();
  });

  it('a landing não mostra o botão de denúncia; o Guia mostra', () => {
    const landing = render(<ConnectionsCompactShowcase items={[item(1, 'a')]} showReport={false} />);
    expect(landing.queryByTestId('report')).toBeNull();
    landing.unmount();
    const guia = render(<ConnectionsCompactShowcase items={[item(1, 'a')]} />);
    expect(guia.getByTestId('report')).toBeTruthy();
  });

  it('sem registros não renderiza nada', () => {
    const { container } = render(<ConnectionsCompactShowcase items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('DirectoryConnectionsShowcase (Home do Guia)', () => {
  afterEach(() => cleanup());

  it('sem registros elegíveis a seção inteira some (nada de seção vazia nem de dados fictícios)', () => {
    const { container } = render(<DirectoryConnectionsShowcase items={[]} confirmedTotal={12} />);
    expect(container.innerHTML).toBe('');
  });

  it('com registros mostra o título, o total confirmado e os cartões', () => {
    const { getByText, container } = render(<DirectoryConnectionsShowcase items={[item(1, 'a'), item(2, 'b')]} confirmedTotal={12} />);
    expect(getByText('Mural de Conexões')).toBeTruthy();
    expect(getByText('12 negócios confirmados')).toBeTruthy();
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('#mural-de-conexoes')).toBeTruthy();
  });
});

describe('sorteio das vitrines (pickShowcaseRandom)', () => {
  const pool = (n: number, withPhoto: number) =>
    Array.from({ length: n }, (_, i) => ({ business_slug: 'e' + i, photo_url: i < withPhoto ? 'https://x/' + i + '.jpg' : null }));
  const seeded = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

  it('com muitas fotos, o conjunto de 3 varia entre carregamentos (não fica fixo) e só tem fotos', () => {
    const seen = new Set<string>();
    for (let s = 1; s <= 40; s += 1) {
      const pick = pickShowcaseRandom(pool(20, 20), 3, seeded(s));
      expect(pick).toHaveLength(3);
      expect(pick.every((i) => i.photo_url)).toBe(true);
      seen.add(pick.map((i) => i.business_slug).sort().join(','));
    }
    expect(seen.size).toBeGreaterThan(10);
  });
  it('nunca repete empresa e prefere fotos; completa com as sem foto quando as fotos não bastam', () => {
    const base = pool(10, 2).flatMap((i) => [i, { ...i, photo_url: null }]);
    const pick = pickShowcaseRandom(base, 3, seeded(7));
    expect(new Set(pick.map((i) => i.business_slug)).size).toBe(3);
    expect(pick.filter((i) => i.photo_url)).toHaveLength(2);
  });
  it('não altera a lista de entrada e lida com lista vazia', () => {
    const input = pool(5, 5); const copy = JSON.stringify(input);
    pickShowcaseRandom(input, 3, seeded(3));
    expect(JSON.stringify(input)).toBe(copy);
    expect(pickShowcaseRandom([], 3)).toEqual([]);
  });
});

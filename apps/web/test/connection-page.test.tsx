// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import {
  buildConnectionMetadata,
  buildShareText,
  buildWhatsAppShareUrl,
  connectionPath,
  connectionSentence,
  isConnectionId,
} from '../src/lib/directory/connections-share';

const rpcMock = vi.fn();

vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'conexaomaconica.com.br' }) }));
vi.mock('@/lib/supabase/server', () => ({ createServerSideClient: async () => ({ rpc: rpcMock }) }));
vi.mock('@/lib/advertiser/advertiser-access', () => ({ findAdvertiserBusiness: vi.fn() }));
vi.mock('@/lib/referrals/attribution', () => ({ linkVisitorToCurrentUser: vi.fn() }));
vi.mock('@/lib/directory/favorites-context', () => ({ FavoritesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/public/directory/DirectoryHeader', () => ({ DirectoryHeader: () => <header data-testid="header" /> }));
vi.mock('@/components/public/directory/DirectoryFooter', () => ({ DirectoryFooter: () => <footer data-testid="footer" /> }));
vi.mock('@/components/public/business/sections/ReportConnectionButton', () => ({ ReportConnectionButton: () => <span data-testid="report" /> }));
vi.mock('@/components/public/business/sections/ConnectionLikeButton', () => ({ ConnectionLikeButton: () => <span data-testid="like" /> }));
vi.mock('@/styles/directory-home.css', () => ({}));

import { getPublicConnectionDetailAction } from '../src/app/actions/connections';
import ConnectionPage, { generateMetadata } from '../src/app/(public)/conexoes/[id]/page';
import { ConnectionShareButtons } from '../src/components/public/connections/ConnectionShareButtons';
import { ConnectionCard } from '../src/components/public/connections/ConnectionCard';
import { ConnectionsCompactShowcase } from '../src/components/public/connections/ConnectionsCompactShowcase';

const ID = '3f1c2b9e-7d44-4a6b-9c1e-5a8d2f0b7e11';
const detail = (extra: Record<string, unknown> = {}) => ({
  id: ID,
  connection_type: 'servico',
  item_description: 'óculos de grau',
  message: 'Atendimento excelente e preço justo.',
  photo_url: null,
  member_first_name: 'João',
  confirmed_at: '2026-11-10T12:00:00Z',
  business_name: 'Ótica Central',
  business_slug: 'otica-central',
  business_logo_url: null,
  ...extra,
});

describe('utilidades da página individual', () => {
  it('valida o identificador (somente UUID); nada além disso chega ao banco', () => {
    expect(isConnectionId(ID)).toBe(true);
    for (const bad of ['1', 'abc', '../etc/passwd', `${ID}x`, ' ' + ID, "'; drop table x;--", '', null, undefined, 42]) expect(isConnectionId(bad)).toBe(false);
  });

  it('frase, caminho e texto de compartilhamento contextuais', () => {
    expect(connectionSentence(detail() as never)).toBe('João contratou óculos de grau em Ótica Central');
    expect(connectionSentence({ ...detail(), connection_type: 'visita', item_description: null } as never)).toBe('João visitou Ótica Central');
    expect(connectionSentence({ ...detail(), connection_type: 'parceria', item_description: null } as never)).toBe('João firmou parceria com Ótica Central');
    expect(connectionPath(ID)).toBe(`/conexoes/${ID}`);
    const url = `https://www.conexaomaconica.com.br/conexoes/${ID}`;
    expect(buildShareText(detail() as never, url)).toBe(`João contratou óculos de grau em Ótica Central: uma conexão confirmada na Conexão Maçônica.\n${url}`);
    const wa = buildWhatsAppShareUrl(detail() as never, url);
    expect(wa.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(wa.slice('https://wa.me/?text='.length))).toContain(url);
  });

  it('metadados: título contextual; a imagem de prévia é SEMPRE a institucional, mesmo com foto aprovada', () => {
    const fallback = 'https://www.conexaomaconica.com.br/logoconexao_red.png';
    const noPhoto = buildConnectionMetadata(detail() as never, fallback);
    expect(noPhoto.title).toBe('Serviço em Ótica Central | Mural de Conexões | Conexão Maçônica');
    expect(noPhoto).toMatchObject({ imageUrl: fallback, imageIsPhoto: false });
    expect(noPhoto.description).toContain('Atendimento excelente');
    expect(buildConnectionMetadata(detail({ photo_url: 'https://cdn.x/ok.jpg' }) as never, fallback)).toMatchObject({ imageUrl: fallback, imageIsPhoto: false });
    expect(buildConnectionMetadata(detail({ photo_url: 'data:image/png;base64,AAAA' }) as never, fallback).imageUrl).toBe(fallback);
    expect(buildConnectionMetadata(detail({ photo_url: 'http://insecure/x.jpg' }) as never, fallback).imageUrl).toBe(fallback);
  });

  it('descrição sem depoimento usa a frase padrão e nunca passa de 200 caracteres', () => {
    expect(buildConnectionMetadata(detail({ message: null }) as never, 'x').description).toBe('João contratou óculos de grau em Ótica Central. Conexão confirmada pela empresa na rede Conexão Maçônica.');
    expect(buildConnectionMetadata(detail({ message: 'a'.repeat(500) }) as never, 'x').description.length).toBeLessThanOrEqual(200);
  });
});

describe('getPublicConnectionDetailAction', () => {
  beforeEach(() => rpcMock.mockReset());

  it('identificador inválido: não consulta o banco', async () => {
    expect(await getPublicConnectionDetailAction('nao-e-uuid')).toEqual({ status: 'not_found' });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('conexão elegível: chama a consulta pública com domínio e id', async () => {
    rpcMock.mockResolvedValueOnce({ data: detail(), error: null });
    const result = await getPublicConnectionDetailAction(ID);
    expect(result).toMatchObject({ status: 'ok', item: { id: ID, business_slug: 'otica-central' } });
    expect(rpcMock).toHaveBeenCalledWith('public_connection_detail', { p_host: 'conexaomaconica.com.br', p_connection_id: ID });
  });

  it('inelegível/inexistente (NULL): not_found; falha do banco ou da rede: error (nunca confundida com "não existe")', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    expect(await getPublicConnectionDetailAction(ID)).toEqual({ status: 'not_found' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'function not found' } });
    expect(await getPublicConnectionDetailAction(ID)).toEqual({ status: 'error' });
    rpcMock.mockRejectedValueOnce(new Error('rede'));
    expect(await getPublicConnectionDetailAction(ID)).toEqual({ status: 'error' });
  });
});

describe('página /conexoes/[id]', () => {
  beforeEach(() => rpcMock.mockReset());
  afterEach(() => cleanup());

  const params = (id = ID) => ({ params: Promise.resolve({ id }) });

  it('metadados da conexão elegível: canonical absoluto, Open Graph/Twitter contextuais e imagem institucional sem foto', async () => {
    rpcMock.mockResolvedValue({ data: detail(), error: null });
    const meta = await generateMetadata(params());
    expect(meta.alternates?.canonical).toBe(`https://www.conexaomaconica.com.br/conexoes/${ID}`);
    expect((meta.title as { absolute: string }).absolute).toBe('Serviço em Ótica Central | Mural de Conexões | Conexão Maçônica');
    expect(meta.robots).toBeUndefined();
    const og = meta.openGraph as { type: string; url: string; images: Array<{ url: string }> };
    expect(og.type).toBe('article');
    expect(og.url).toBe(`https://www.conexaomaconica.com.br/conexoes/${ID}`);
    expect(og.images[0]!.url).toBe('https://www.conexaomaconica.com.br/logoconexao_red.png');
    expect((meta.twitter as { card: string }).card).toBe('summary');
  });

  it('mesmo com foto aprovada, a prévia (Open Graph e Twitter) é SEMPRE a imagem institucional', async () => {
    const institutional = 'https://www.conexaomaconica.com.br/logoconexao_red.png';
    for (const photo of ['https://cdn.x/ok.jpg', 'data:image/svg+xml;utf8,x', null]) {
      rpcMock.mockResolvedValue({ data: detail({ photo_url: photo }), error: null });
      const meta = await generateMetadata(params());
      expect((meta.openGraph as { images: Array<{ url: string }> }).images[0]!.url).toBe(institutional);
      expect((meta.twitter as { images: string[] }).images).toEqual([institutional]);
      expect((meta.twitter as { card: string }).card).toBe('summary');
      expect(JSON.stringify(meta)).not.toContain('cdn.x');
    }
  });

  it('inelegível, inexistente ou com falha: nenhum conteúdo nos metadados e fora do índice', async () => {
    for (const response of [{ data: null, error: null }, { data: null, error: { message: 'x' } }]) {
      rpcMock.mockResolvedValueOnce(response);
      const meta = await generateMetadata(params());
      expect(meta.robots).toEqual({ index: false, follow: false });
      expect(JSON.stringify(meta)).not.toContain('Ótica');
    }
    const invalid = await generateMetadata(params('nao-uuid'));
    expect(invalid.robots).toEqual({ index: false, follow: false });
  });

  it('inelegível/inexistente/identificador inválido: 404 (notFound)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    await expect(ConnectionPage(params())).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404') });
    await expect(ConnectionPage(params('xyz'))).rejects.toMatchObject({ digest: expect.stringContaining('404') });
  });

  it('falha do banco: estado de erro com nova tentativa (não 404 e não conteúdo)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'x' } });
    const { getByRole, getByText } = render(await ConnectionPage(params()));
    expect(getByRole('alert')).toBeTruthy();
    expect(getByText('Tentar novamente').getAttribute('href')).toBe(`/conexoes/${ID}`);
  });

  it('conteúdo: frase, depoimento, confirmação, CTA da empresa, WhatsApp, copiar e navegação; sem curtidas', async () => {
    rpcMock.mockResolvedValue({ data: detail(), error: null });
    const { container, getByText, queryByTestId, getByRole } = render(await ConnectionPage(params()));
    expect(getByRole('heading', { level: 1 }).textContent).toBe('João contratou óculos de grau em Ótica Central');
    expect(container.querySelector('blockquote')?.textContent).toContain('Atendimento excelente');
    expect(getByText('Conexão confirmada pela empresa')).toBeTruthy();
    expect(getByText('Conhecer esta empresa').closest('a')?.getAttribute('href')).toBe('/guia/otica-central?src=connection_page');
    expect(getByText('Ver todas as conexões').closest('a')?.getAttribute('href')).toBe('/conexoes');
    const wa = getByText('Compartilhar no WhatsApp').closest('a')!;
    expect(wa.getAttribute('href')).toContain('https://wa.me/?text=');
    expect(decodeURIComponent(wa.getAttribute('href')!)).toContain(`https://www.conexaomaconica.com.br/conexoes/${ID}`);
    expect(wa.getAttribute('rel')).toContain('noopener');
    expect(getByText('Copiar link')).toBeTruthy();
    expect(queryByTestId('like')).toBeNull();
    expect(queryByTestId('report')).toBeTruthy();
    expect(container.querySelectorAll('img')).toHaveLength(0);
    const ld = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) => s.innerHTML).join('');
    expect(ld).toContain('BreadcrumbList');
    expect(ld).toContain('"about"');
  });

  it('fotografia só aparece quando a consulta a entregou (aprovada)', async () => {
    rpcMock.mockResolvedValue({ data: detail({ photo_url: 'https://cdn.x/ok.jpg' }), error: null });
    const { container } = render(await ConnectionPage(params()));
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.x/ok.jpg');
  });
});

describe('ConnectionShareButtons', () => {
  afterEach(() => cleanup());

  it('copiar link: grava o endereço oficial na área de transferência e avisa', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const url = `https://www.conexaomaconica.com.br/conexoes/${ID}`;
    const { getByText, findByText } = render(<ConnectionShareButtons url={url} whatsappHref="https://wa.me/?text=x" />);
    fireEvent.click(getByText('Copiar link'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
    expect(await findByText('Link copiado')).toBeTruthy();
  });
});

describe('links para a página individual a partir dos cartões', () => {
  afterEach(() => cleanup());
  const item = (id: string) => ({ ...detail(), id, like_count: 0, liked_by_me: false });

  it('cartão do mural completo: "Ver conexão" aponta para /conexoes/[id]; id fora do formato não gera link', () => {
    const ok = render(<ConnectionCard item={item(ID) as never} />);
    expect(ok.getByText('Ver conexão').closest('a')?.getAttribute('href')).toBe(`/conexoes/${ID}`);
    ok.unmount();
    const bad = render(<ConnectionCard item={item('c1') as never} />);
    expect(bad.queryByText('Ver conexão')).toBeNull();
  });

  it('vitrine compacta: link discreto só com ícone e rótulo acessível, sem texto extra', () => {
    const { container, getByLabelText } = render(<ConnectionsCompactShowcase items={[item(ID) as never]} />);
    const link = getByLabelText('Abrir a conexão de Ótica Central');
    expect(link.getAttribute('href')).toBe(`/conexoes/${ID}`);
    expect(link.textContent).toBe('');
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});

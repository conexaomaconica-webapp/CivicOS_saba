// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

// ---- Simulações: o conteúdo pesado das páginas (o que importa aqui é QUAL delas cada rota escolhe) ----
vi.mock('../src/app/(public)/_home/landing-home', () => ({
  default: () => <div data-testid="landing" />,
  landingMetadata: { title: { absolute: 'LANDING' }, alternates: { canonical: 'https://x/landing' }, openGraph: { url: 'https://x/landing', title: 'og-landing' }, robots: { index: true } },
}));
vi.mock('../src/app/(public)/guia/guia-home', () => ({
  default: (props: { searchParams?: unknown }) => <div data-testid="guia" data-has-search={String(Boolean(props.searchParams))} />,
  generateGuiaHomeMetadata: async () => ({ title: { absolute: 'GUIA' } }),
}));

const redirectCalls: string[] = [];
let notFoundCalled = 0;
vi.mock('next/navigation', () => ({
  permanentRedirect: (url: string) => { redirectCalls.push(url); throw new Error('NEXT_REDIRECT'); },
  notFound: () => { notFoundCalled += 1; throw new Error('NEXT_NOT_FOUND'); },
}));
vi.mock('@/lib/seo/app-url', () => ({ appUrl: (p: string) => `https://www.conexaomaconica.com.br${p}` }));

import HomePage, { generateMetadata as rootMetadata } from '../src/app/(public)/page';
import GuiaRoute from '../src/app/(public)/guia/page';
import InstitucionalPage, { generateMetadata as institucionalMetadata } from '../src/app/(public)/institucional/page';

// O componente usa o runtime JSX automático do Next; o Vitest deste projeto usa o clássico.
(globalThis as { React?: typeof React }).React = React;

// Cada renderização começa em um documento limpo (várias renderizações no mesmo teste não se acumulam).
const mount = (node: React.ReactElement) => { cleanup(); return render(node); };

const props = (search: Record<string, string> = {}) => ({ searchParams: Promise.resolve(search) });
const OFFICIAL = '2026-11-24T10:00:00-03:00';

function setSwitch(mode?: string, at?: string) {
  if (mode === undefined) delete process.env.HOME_SWITCH_MODE; else process.env.HOME_SWITCH_MODE = mode;
  if (at === undefined) delete process.env.HOME_SWITCH_AT; else process.env.HOME_SWITCH_AT = at;
}

beforeEach(() => { redirectCalls.length = 0; notFoundCalled = 0; setSwitch(); });
afterEach(() => { cleanup(); vi.useRealTimers(); setSwitch(); });

describe('virada DESLIGADA (padrão): o site é exatamente o de hoje', () => {
  it('"/" mostra a landing, com os metadados da landing', async () => {
    const { getByTestId, queryByTestId } = mount(await HomePage(props()));
    expect(getByTestId('landing')).toBeTruthy();
    expect(queryByTestId('guia')).toBeNull();
    expect((await rootMetadata(props())).title).toEqual({ absolute: 'LANDING' });
  });

  it('"/guia" mostra o Guia e NÃO redireciona', async () => {
    const { getByTestId } = mount(await GuiaRoute(props({ q: 'otica' })));
    expect(getByTestId('guia')).toBeTruthy();
    expect(redirectCalls).toEqual([]);
  });

  it('"/institucional" não existe publicamente (404 e fora do índice): sem conteúdo duplicado', async () => {
    await expect(InstitucionalPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundCalled).toBe(1);
    expect(await institucionalMetadata()).toEqual({ robots: { index: false, follow: false } });
  });

  it('valores inválidos também deixam tudo como está (falha fechada)', async () => {
    for (const [mode, at] of [['talvez', undefined], ['scheduled', undefined], ['scheduled', '2026-11-24T10:00:00'], ['scheduled', 'lixo']] as const) {
      setSwitch(mode, at);
      const { getByTestId } = mount(await HomePage(props()));
      expect(getByTestId('landing'), `${mode}/${at}`).toBeTruthy();
    }
  });
});

describe('virada LIGADA (on)', () => {
  beforeEach(() => setSwitch('on'));

  it('"/" mostra o Guia, repassando os filtros da URL, e os metadados do Guia', async () => {
    const { getByTestId, queryByTestId } = mount(await HomePage(props({ cidade: 'salvador' })));
    expect(getByTestId('guia').getAttribute('data-has-search')).toBe('true');
    expect(queryByTestId('landing')).toBeNull();
    expect((await rootMetadata(props())).title).toEqual({ absolute: 'GUIA' });
  });

  it('"/guia" redireciona de forma permanente para "/" (308), mantendo os filtros', async () => {
    await expect(GuiaRoute(props())).rejects.toThrow('NEXT_REDIRECT');
    await expect(GuiaRoute(props({ q: 'ótica circulô', cidade: 'feira-de-santana', page: '2' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(redirectCalls[0]).toBe('/');
    expect(redirectCalls[1]).toBe('/?q=%C3%B3tica+circul%C3%B4&cidade=feira-de-santana&page=2');
  });

  it('"/institucional" mostra a landing, com canonical próprio e sem alterar o resto dos metadados', async () => {
    const { getByTestId } = mount(await InstitucionalPage());
    expect(getByTestId('landing')).toBeTruthy();
    const meta = await institucionalMetadata();
    expect(meta.title).toEqual({ absolute: 'LANDING' });
    expect(meta.alternates).toEqual({ canonical: 'https://www.conexaomaconica.com.br/institucional' });
    expect(meta.openGraph).toMatchObject({ url: 'https://www.conexaomaconica.com.br/institucional', title: 'og-landing' });
    expect(meta.robots).toEqual({ index: true });
  });
});

describe('virada AGENDADA (scheduled) para 24/11/2026 às 10h de Brasília: acontece sozinha, sem deploy', () => {
  const at = (iso: string) => vi.setSystemTime(new Date(iso));

  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); setSwitch('scheduled', OFFICIAL); });

  it('um segundo ANTES das 10h: tudo como hoje', async () => {
    at('2026-11-24T09:59:59-03:00');
    expect(mount(await HomePage(props())).getByTestId('landing')).toBeTruthy();
    expect(mount(await GuiaRoute(props())).getByTestId('guia')).toBeTruthy();
    await expect(InstitucionalPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(redirectCalls).toEqual([]);
  });

  it('às 10h em ponto (13h UTC): a virada acontece, na MESMA execução do servidor, sem novo deploy', async () => {
    at('2026-11-24T13:00:00Z');
    expect(mount(await HomePage(props())).getByTestId('guia')).toBeTruthy();
    await expect(GuiaRoute(props())).rejects.toThrow('NEXT_REDIRECT');
    expect(mount(await InstitucionalPage()).getByTestId('landing')).toBeTruthy();
    expect(redirectCalls).toEqual(['/']);
  });

  it('o mesmo processo muda de comportamento só pela passagem do relógio', async () => {
    at('2026-11-24T12:59:00Z');
    expect(mount(await HomePage(props())).getByTestId('landing')).toBeTruthy();
    at('2026-11-24T13:01:00Z');
    expect(mount(await HomePage(props())).getByTestId('guia')).toBeTruthy();
  });

  it('ROLLBACK: com o modo off, volta tudo a ser como hoje mesmo depois da data', async () => {
    at('2026-12-01T12:00:00Z');
    expect(mount(await HomePage(props())).getByTestId('guia')).toBeTruthy();
    setSwitch('off', OFFICIAL);
    expect(mount(await HomePage(props())).getByTestId('landing')).toBeTruthy();
    expect(mount(await GuiaRoute(props())).getByTestId('guia')).toBeTruthy();
  });
});

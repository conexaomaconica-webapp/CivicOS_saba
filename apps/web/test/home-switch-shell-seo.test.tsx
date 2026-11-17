// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

let currentPath = '/';
vi.mock('next/navigation', () => ({ usePathname: () => currentPath }));
vi.mock('../src/components/public/PublicFooter', () => ({ PublicFooter: () => <div data-testid="footer" /> }));
vi.mock('../src/components/public/PublicHeader', () => ({ PublicHeader: () => <div data-testid="header" /> }));
vi.mock('../src/components/public/PublicMobileBottomNav', () => ({ PublicMobileBottomNav: () => <div data-testid="guia-bottom-nav" /> }));
vi.mock('../src/components/public/directory/DirectoryFavoritesModal', () => ({ DirectoryFavoritesModal: () => <div data-testid="favorites-modal" /> }));
vi.mock('../src/components/landing/LandingMobileBottomNav', () => ({ LandingMobileBottomNav: () => <div data-testid="landing-bottom-nav" /> }));
vi.mock('../src/components/public/LaunchExperience', () => ({ LaunchExperience: () => <div data-testid="launch" /> }));
vi.mock('@/lib/seo/app-url', () => ({ appUrl: (p: string) => `https://www.conexaomaconica.com.br${p}` }));

import { PublicShell } from '../src/components/public/PublicShell';
import { HomeSwitchProvider } from '../src/components/public/home-switch-context';
import { buildStaticSitemapEntries } from '../src/lib/seo/sitemap-entries';
import { buildBusinessBreadcrumb, breadcrumbJsonLd } from '../src/lib/seo/business-breadcrumb';

// Os componentes usam o runtime JSX automático do Next; o Vitest deste projeto usa o clássico.
(globalThis as { React?: typeof React }).React = React;

afterEach(() => cleanup());

function shellAt(path: string, active: boolean) {
  currentPath = path;
  const view = render(
    <HomeSwitchProvider active={active}>
      <PublicShell><span data-testid="page" /></PublicShell>
    </HomeSwitchProvider>,
  );
  const has = (id: string) => view.queryByTestId(id) !== null;
  return { header: has('header'), footer: has('footer'), guiaNav: has('guia-bottom-nav'), landingNav: has('landing-bottom-nav'), favorites: has('favorites-modal'), page: has('page') };
}

describe('casco da página pública (cabeçalho, rodapé e navegação inferior)', () => {
  it('ANTES da virada: "/" é a landing e "/guia" é o Guia (exatamente como hoje)', () => {
    expect(shellAt('/', false)).toEqual({ header: false, footer: true, guiaNav: false, landingNav: true, favorites: false, page: true });
    cleanup();
    expect(shellAt('/guia', false)).toEqual({ header: false, footer: false, guiaNav: true, landingNav: false, favorites: true, page: true });
  });

  it('DEPOIS da virada: "/" tem o casco do Guia, igual ao de /guia (sem cabeçalho/rodapé duplicados)', () => {
    const home = shellAt('/', true);
    cleanup();
    const guia = shellAt('/guia', false);
    expect(home).toEqual(guia);
    expect(home).toEqual({ header: false, footer: false, guiaNav: true, landingNav: false, favorites: true, page: true });
  });

  it('DEPOIS da virada: /institucional tem o casco da landing, igual ao de "/" antes da virada', () => {
    const institucional = shellAt('/institucional', true);
    cleanup();
    const landingAntes = shellAt('/', false);
    expect(institucional).toEqual(landingAntes);
  });

  it('as demais páginas do Guia e institucionais não mudam em nenhum dos lados', () => {
    for (const active of [false, true]) {
      for (const path of ['/guia/empresas', '/guia/padaria-x', '/conexoes', '/privacidade', '/termos']) {
        cleanup();
        const r = shellAt(path, active);
        expect(r.header, `${path}/${active}`).toBe(false);
        expect(r.footer, `${path}/${active}`).toBe(false);
        expect(r.guiaNav, `${path}/${active}`).toBe(true);
      }
    }
  });

  it('sem o provedor (fora do layout público) o comportamento é o de antes da virada', () => {
    currentPath = '/';
    const view = render(<PublicShell><span /></PublicShell>);
    expect(view.queryByTestId('landing-bottom-nav')).not.toBeNull();
    expect(view.queryByTestId('guia-bottom-nav')).toBeNull();
  });
});

describe('sitemap', () => {
  const date = new Date('2026-11-20T00:00:00Z');
  const urls = (entries: ReturnType<typeof buildStaticSitemapEntries>) => entries.map((e) => e.url.replace('https://www.conexaomaconica.com.br', '') || '/');

  it('ANTES da virada (padrão): inalterado', () => {
    const before = buildStaticSitemapEntries(date, null);
    expect(urls(before).slice(0, 3)).toEqual(['/', '/guia', '/guia/empresas']);
    expect(buildStaticSitemapEntries(date, null, false)).toEqual(before);
    expect(urls(before)).not.toContain('/institucional');
  });

  it('DEPOIS da virada: "/" é o Guia (com data de alteração), /institucional entra e /guia sai (redireciona)', () => {
    const after = buildStaticSitemapEntries(date, null, true);
    expect(urls(after).slice(0, 3)).toEqual(['/', '/institucional', '/guia/empresas']);
    expect(urls(after)).not.toContain('/guia');
    expect(after[0]).toMatchObject({ priority: 1, changeFrequency: 'daily', lastModified: date });
    expect(after[1]).toMatchObject({ priority: 0.8 });
    expect(new Set(urls(after)).size).toBe(after.length);
  });

  it('o resto das páginas fixas é igual dos dois lados', () => {
    const rest = (e: ReturnType<typeof buildStaticSitemapEntries>) => urls(e).filter((u) => !['/', '/guia', '/institucional'].includes(u));
    expect(rest(buildStaticSitemapEntries(date, null, true))).toEqual(rest(buildStaticSitemapEntries(date, null, false)));
  });
});

describe('caminho de navegação (breadcrumb) da empresa', () => {
  const business = { name: 'Óptica Circulô', slug: 'optica-circulo', city: 'Feira de Santana', state: 'BA', category: 'Óptica' };

  it('ANTES da virada (padrão): Início > Guia > Empresa, como hoje', () => {
    const items = buildBusinessBreadcrumb(business, []);
    expect(items.map((i) => i.name)).toEqual(['Início', 'Guia', 'Óptica Circulô']);
    expect(items[1]!.href).toBe('/guia');
    expect(buildBusinessBreadcrumb(business, [], false)).toEqual(items);
  });

  it('DEPOIS da virada: só "Início" (o Guia é a página inicial), sem dois itens para o mesmo endereço', () => {
    const items = buildBusinessBreadcrumb(business, [], true);
    expect(items.map((i) => i.name)).toEqual(['Início', 'Óptica Circulô']);
    const ld = breadcrumbJsonLd(items, business.slug) as { itemListElement: Array<{ item: string }> };
    expect(new Set(ld.itemListElement.map((i) => i.item)).size).toBe(ld.itemListElement.length);
  });
});

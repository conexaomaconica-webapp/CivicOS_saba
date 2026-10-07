// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { breadcrumbJsonLd, buildBusinessBreadcrumb } from '../src/lib/seo/business-breadcrumb';
import { buildDirectoryIndex, categoryPath, cityPath, findCategory, findCity, type DirectoryRow } from '../src/lib/seo/directory-seo';
import { categorySlug } from '../src/lib/seo/geo-slugs';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const read = (path: string) => readFileSync(path, 'utf8');

function row(slug: string, category: string, city = 'Feira de Santana', state = 'BA'): DirectoryRow {
  return { slug, name: slug.toUpperCase(), category, business_locations: [{ city, state }] };
}

const index = buildDirectoryIndex([
  row('otica-a', 'Óptica'),
  row('adv-b', 'Advocacia'),
  row('psi-c', 'Psicólogo'),
  row('rest-d', 'Restaurante', 'Salvador'),
]);

describe('slug de categoria', () => {
  it('junta acento, caixa e apelidos conhecidos (Ótica e Óptica são a mesma página)', () => {
    expect(categorySlug('Óptica')).toBe('optica');
    expect(categorySlug('Ótica')).toBe('optica');
    expect(categorySlug('ÓTICAS')).toBe('optica');
    expect(categorySlug('Segurança e terceirização')).toBe('seguranca-e-terceirizacao');
    expect(categorySlug(null)).toBe('');
  });

  it('resolveSearchQuery traduz "ótica" e "otica" para "optica" na busca', async () => {
    const { resolveSearchQuery } = await import('../src/lib/directory/normalize-search');
    expect(resolveSearchQuery('ótica')).toBe('optica');
    expect(resolveSearchQuery('otica')).toBe('optica');
    expect(resolveSearchQuery('ÓTICAS')).toBe('optica');
  });


  it('empresas cadastradas como "Ótica" e "Óptica" ficam no mesmo grupo do índice (não dividem a página)', () => {
    const merged = buildDirectoryIndex([row('a', 'Ótica'), row('b', 'Óptica')]);
    const city = findCity(merged, 'bahia', 'feira-de-santana')!;
    expect(city.categories).toHaveLength(1);
    expect(city.categories[0]?.slug).toBe('optica');
    expect(city.categories[0]?.businesses).toHaveLength(2);
  });
});

describe('breadcrumb da empresa', () => {
  const business = { name: 'Ótica Circulô', slug: 'opticacirculo', city: 'Feira de Santana', state: 'BA', category: 'Óptica' };

  it('Início > Guia > Cidade > Categoria > Empresa, com os links das páginas que existem', () => {
    const items = buildBusinessBreadcrumb(business, index);
    expect(items.map((i) => i.name)).toEqual(['Início', 'Guia', 'Feira de Santana', 'Óptica', 'Ótica Circulô']);
    expect(items.map((i) => i.href)).toEqual(['/', '/guia', '/guia/bahia/feira-de-santana', '/guia/bahia/feira-de-santana/optica', undefined]);
  });

  it('todo link do breadcrumb aponta para uma página que o guia realmente gera (nunca um 404)', () => {
    const items = buildBusinessBreadcrumb(business, index);
    const city = findCity(index, 'bahia', 'feira-de-santana')!;
    expect(items[2]?.href).toBe(cityPath(city));
    expect(items[3]?.href).toBe(categoryPath(city, findCategory(city, 'optica')!.slug));
  });

  it('categoria que não está no índice é omitida; cidade fora do índice cai para Início > Guia > Empresa', () => {
    expect(buildBusinessBreadcrumb({ ...business, category: 'Categoria Inexistente' }, index).map((i) => i.name)).toEqual([
      'Início', 'Guia', 'Feira de Santana', 'Ótica Circulô',
    ]);
    expect(buildBusinessBreadcrumb({ ...business, city: 'Cidade Fantasma' }, index).map((i) => i.name)).toEqual(['Início', 'Guia', 'Ótica Circulô']);
    expect(buildBusinessBreadcrumb({ ...business, state: 'XX' }, index).map((i) => i.name)).toEqual(['Início', 'Guia', 'Ótica Circulô']);
    expect(buildBusinessBreadcrumb(business, []).map((i) => i.name)).toEqual(['Início', 'Guia', 'Ótica Circulô']);
  });

  it('variação de grafia da categoria (Ótica) ainda encontra a página de Óptica', () => {
    const items = buildBusinessBreadcrumb({ ...business, category: 'Ótica' }, index);
    expect(items.some((i) => i.href === '/guia/bahia/feira-de-santana/optica')).toBe(true);
  });

  it('o JSON-LD tem exatamente os mesmos itens, na mesma ordem, com URLs com www e a canônica da empresa no fim', () => {
    const items = buildBusinessBreadcrumb(business, index);
    const ld = breadcrumbJsonLd(items, business.slug) as { itemListElement: Array<{ position: number; name: string; item: string }> };
    expect(ld.itemListElement.map((i) => i.name)).toEqual(items.map((i) => i.name));
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2, 3, 4, 5]);
    for (const entry of ld.itemListElement) expect(entry.item.startsWith('https://www.conexaomaconica.com.br')).toBe(true);
    expect(ld.itemListElement[1]?.item).toBe('https://www.conexaomaconica.com.br/guia');
    expect(ld.itemListElement[2]?.item).toBe('https://www.conexaomaconica.com.br/guia/bahia/feira-de-santana');
    expect(ld.itemListElement[4]?.item).toBe('https://www.conexaomaconica.com.br/guia/opticacirculo');
  });
});

describe('componente BusinessBreadcrumb', () => {
  it('desenha os links, marca a empresa como página atual e usa o nome acessível "Você está em"', async () => {
    (globalThis as unknown as { React: typeof React }).React = React;
    const { BusinessBreadcrumb } = await import('../src/components/public/business/BusinessBreadcrumb');
    const items = buildBusinessBreadcrumb({ name: 'Ótica Circulô', slug: 'opticacirculo', city: 'Feira de Santana', state: 'BA', category: 'Óptica' }, index);
    const { container, getByText } = render(<BusinessBreadcrumb items={items} />);

    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Você está em');
    expect(Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '/', '/guia', '/guia/bahia/feira-de-santana', '/guia/bahia/feira-de-santana/optica',
    ]);
    const current = getByText('Ótica Circulô');
    expect(current.tagName).toBe('SPAN');
    expect(current.getAttribute('aria-current')).toBe('page');
  });
});

describe('estrutura das páginas de listagem e da empresa (leitura do código)', () => {
  it.each([
    ['src/app/(public)/guia/eventos/page.tsx', 'eventos-lista-titulo'],
    ['src/app/(public)/guia/beneficios/page.tsx', 'beneficios-lista-titulo'],
    ['src/app/(public)/guia/beneficios/page.tsx', 'beneficios-como-resgatar'],
  ])('%s tem o título de seção %s (H2) ligado à sua seção', (file, id) => {
    const source = read(file);
    expect(source).toContain(`id="${id}"`);
    expect(source).toContain(`aria-labelledby="${id}"`);
  });

  it('/guia/empresas ganha um H2 antes da lista (só para leitores de tela e buscadores, sem repetir a contagem visível)', () => {
    const source = read('src/app/(public)/guia/empresas/page.tsx');
    expect(source).toMatch(/<h2 className="sr-only">/);
    expect(source.indexOf('<h2 className="sr-only">')).toBeLessThan(source.indexOf('<BusinessDirectoryClient'));
  });

  it('o passo a passo de resgate descreve só o que o fluxo faz (conta, resgatar, código validado pela empresa)', () => {
    const source = read('src/app/(public)/guia/beneficios/page.tsx');
    expect(source).toContain('Escolha a oferta e abra o perfil da empresa.');
    expect(source).toContain('Apresente o código recebido à empresa, que confirma o uso do benefício.');
  });

  it('a capa do card do guia tem descrição (alt) e não é mais vazia', () => {
    const card = read('src/components/public/directory/BusinessCard.tsx');
    expect(card).toContain('alt={`Capa de ${data.name}`}');
    expect(card).not.toMatch(/src=\{data\.cover_url\}\s+alt=""/);
  });

  it('a página da empresa usa a MESMA lista de itens para o breadcrumb visível e para o JSON-LD', () => {
    const page = read('src/app/(public)/guia/[slug]/page.tsx');
    expect(page).toContain('const breadcrumbItems = buildBusinessBreadcrumb(');
    expect(page).toContain('breadcrumbJsonLd(breadcrumbItems, business.identity.slug)');
    expect(page).toContain('<BusinessBreadcrumb items={breadcrumbItems} />');
    // falha ao ler o índice nunca derruba a página
    expect(page).toMatch(/getDirectoryIndex\(\)\.catch\(\(\) => \[\]\)/);
  });
});

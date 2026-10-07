import { describe, it, expect } from 'vitest';
import {
  buildDirectoryIndex,
  buildDirectorySitemapUrls,
  findCategory,
  findCity,
  isCategoryIndexable,
  isCityIndexable,
  cityPath,
  categoryPath,
  MIN_BUSINESSES_CITY_INDEXABLE,
  MIN_BUSINESSES_CITY_CATEGORY_INDEXABLE,
  type DirectoryRow,
} from '../src/lib/seo/directory-seo';
import { categorySlug } from '../src/lib/seo/geo-slugs';

function createRow(
  slug: string,
  category: string,
  city = 'Feira de Santana',
  state = 'BA',
  extra: Partial<DirectoryRow> = {}
): DirectoryRow {
  return {
    slug,
    name: `Empresa ${slug.toUpperCase()}`,
    category,
    business_locations: [{ city, state }],
    seo_indexable: true,
    ...extra,
  };
}

describe('SPRINT 7 — SEO Programático e Validação de Limites de Indexação', () => {
  it('1. Limites padrão de indexação são 3 para Cidade e 2 para Categoria', () => {
    expect(MIN_BUSINESSES_CITY_INDEXABLE).toBe(3);
    expect(MIN_BUSINESSES_CITY_CATEGORY_INDEXABLE).toBe(2);
  });

  it('2. Normaliza corretamente sinônimos de categorias em slugs canônicos', () => {
    expect(categorySlug('Óptica')).toBe('optica');
    expect(categorySlug('Ótica')).toBe('optica');
    expect(categorySlug('Otica')).toBe('optica');
    expect(categorySlug('Óticas')).toBe('optica');
    expect(categorySlug('Saúde e Bem-estar')).toBe('saude-e-bem-estar');
  });

  it('3. Gera paths canônicos consistentes para cidade e categoria', () => {
    const city = { stateSlug: 'bahia', citySlug: 'feira-de-santana' };
    expect(cityPath(city)).toBe('/guia/bahia/feira-de-santana');
    expect(categoryPath(city, 'optica')).toBe('/guia/bahia/feira-de-santana/optica');
  });

  it('4. Avalia corretamente indexabilidade em cidades com múltiplas categorias e empresas noindex', () => {
    const rows: DirectoryRow[] = [
      createRow('emp-1', 'Óptica', 'Feira de Santana', 'BA'),
      createRow('emp-2', 'Ótica', 'Feira de Santana', 'BA'),
      createRow('emp-3', 'Restaurante', 'Feira de Santana', 'BA'),
      createRow('emp-4', 'Restaurante', 'Feira de Santana', 'BA', { seo_indexable: false }),
      createRow('emp-5', 'Advocacia', 'Salvador', 'BA'),
    ];

    const index = buildDirectoryIndex(rows);
    const feira = findCity(index, 'bahia', 'feira-de-santana');
    const salvador = findCity(index, 'bahia', 'salvador');

    expect(feira).not.toBeNull();
    expect(salvador).not.toBeNull();

    // Feira de Santana tem 3 empresas indexáveis -> Cidade indexável
    expect(isCityIndexable(feira!)).toBe(true);

    // Salvador tem apenas 1 empresa -> Cidade NÃO indexável
    expect(isCityIndexable(salvador!)).toBe(false);

    // Óptica/Ótica unificadas em 'optica' possuem 2 empresas indexáveis -> Categoria indexável
    const catOptica = findCategory(feira!, 'optica');
    expect(catOptica).not.toBeNull();
    expect(isCategoryIndexable(catOptica!)).toBe(true);

    // Restaurante possui 2 empresas, mas 1 é noindex -> Categoria NÃO indexável (somente 1 válida)
    const catRestaurante = findCategory(feira!, 'restaurante');
    expect(catRestaurante).not.toBeNull();
    expect(isCategoryIndexable(catRestaurante!)).toBe(false);
  });

  it('5. sitemap inclui somente URLs de cidades e categorias que cumprem o threshold', () => {
    const rows: DirectoryRow[] = [
      createRow('e1', 'Saúde', 'Feira de Santana', 'BA'),
      createRow('e2', 'Saúde', 'Feira de Santana', 'BA'),
      createRow('e3', 'Educação', 'Feira de Santana', 'BA'),
    ];

    const index = buildDirectoryIndex(rows);
    const sitemapUrls = buildDirectorySitemapUrls(index).map((item) => item.url);

    expect(sitemapUrls).toContain('https://www.conexaomaconica.com.br/guia/bahia/feira-de-santana');
    expect(sitemapUrls).toContain('https://www.conexaomaconica.com.br/guia/bahia/feira-de-santana/saude');
    expect(sitemapUrls).not.toContain('https://www.conexaomaconica.com.br/guia/bahia/feira-de-santana/educacao');
  });
});

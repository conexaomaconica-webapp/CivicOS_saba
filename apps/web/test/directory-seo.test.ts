import { describe, expect, it } from 'vitest';
import {
  buildDirectoryIndex,
  buildDirectorySitemapUrls,
  findCategory,
  findCity,
  isCategoryIndexable,
  isCityIndexable,
  type DirectoryRow,
} from '../src/lib/seo/directory-seo';
import { resolveState, slugify } from '../src/lib/seo/geo-slugs';

function biz(slug: string, category: string, city = 'Feira de Santana', state = 'BA', extra: Partial<DirectoryRow> = {}): DirectoryRow {
  return { slug, name: slug.toUpperCase(), category, business_locations: [{ city, state }], ...extra };
}

describe('slugs geográficos', () => {
  it('remove acentos e normaliza', () => {
    expect(slugify('Feira de Santana')).toBe('feira-de-santana');
    expect(slugify('Ótica & Relojoaria')).toBe('otica-e-relojoaria');
  });

  it('resolve estado por UF ou por nome', () => {
    expect(resolveState('ba')?.slug).toBe('bahia');
    expect(resolveState('Bahia')?.uf).toBe('BA');
    expect(resolveState('Atlantida')).toBeNull();
    expect(resolveState(null)).toBeNull();
  });
});

describe('índice de cidades e categorias', () => {
  const rows = [
    biz('a', 'Ótica'),
    biz('b', 'Ótica'),
    biz('c', 'Advogados'),
    biz('d', 'Restaurantes', 'Salvador'),
    biz('sem-cidade', 'Ótica', '', 'BA'),
    biz('estado-invalido', 'Ótica', 'Feira de Santana', 'XX'),
    biz('a', 'Ótica'), // duplicada
  ];
  const index = buildDirectoryIndex(rows);

  it('agrupa por cidade e ignora empresas sem localização válida ou duplicadas', () => {
    expect(index.map((c) => `${c.stateSlug}/${c.citySlug}`)).toEqual(['bahia/feira-de-santana', 'bahia/salvador']);
    expect(findCity(index, 'bahia', 'feira-de-santana')?.businesses).toHaveLength(3);
    expect(findCity(index, 'bahia', 'inexistente')).toBeNull();
    expect(findCity(index, 'atlantida', 'salvador')).toBeNull();
  });

  it('indexa a cidade só com 3 empresas e a categoria só com 2', () => {
    const feira = findCity(index, 'bahia', 'feira-de-santana')!;
    const salvador = findCity(index, 'bahia', 'salvador')!;
    expect(isCityIndexable(feira)).toBe(true);
    expect(isCityIndexable(salvador)).toBe(false);
    expect(isCategoryIndexable(findCategory(feira, 'optica')!)).toBe(true);
    expect(isCategoryIndexable(findCategory(feira, 'advogados')!)).toBe(false);
  });

  it('empresa com seo_indexable falso não conta para o critério', () => {
    const idx = buildDirectoryIndex([biz('a', 'Ótica'), biz('b', 'Ótica', 'Feira de Santana', 'BA', { seo_indexable: false })]);
    expect(isCategoryIndexable(findCategory(idx[0]!, 'optica')!)).toBe(false);
  });

  it('o sitemap só recebe cidade e categoria indexáveis', () => {
    const urls = buildDirectorySitemapUrls(index).map((u) => u.url.replace(/^https?:\/\/[^/]+/, ''));
    expect(urls).toEqual(['/guia/bahia/feira-de-santana', '/guia/bahia/feira-de-santana/optica']);
  });
});

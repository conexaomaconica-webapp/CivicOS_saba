import { describe, expect, it } from 'vitest';
import { resolveHomeCategories, selectMainHomeCategories, derivePrimaryCategories, HOME_MAIN_CATEGORIES_MAX } from '../src/lib/directory/home-categories';
import type { FilterCategory } from '../src/lib/directory/filter-categories';

describe('resolveHomeCategories (Categorias da Página Principal)', () => {
  const mockCategoriesWithBiz: FilterCategory[] = [
    { id: 'cat-1', slug: 'construcao', name: 'Construção', icon_name: 'hammer', business_count: 5 },
    { id: 'cat-2', slug: 'saude', name: 'Saúde', icon_name: 'heart', business_count: 3 },
    { id: 'cat-3', slug: 'tecnologia', name: 'Tecnologia', icon_name: 'laptop', business_count: 2 },
  ];

  it('exibe apenas categorias com empresas cadastradas e oculta categorias em destaque vazias', () => {
    const featuredConfigs = [
      // Destaque que NÃO tem empresas cadastradas (não está em mockCategoriesWithBiz)
      { category_id: 'cat-vazia', custom_title: 'Gastronomia', icon_name: 'utensils', display_order: 1 },
      // Destaque que tem empresas cadastradas
      { category_id: 'cat-1', custom_title: 'Construção Civil', icon_name: 'building', display_order: 2 },
    ];

    const result = resolveHomeCategories({
      categoriesWithBusinesses: mockCategoriesWithBiz,
      featuredCategories: featuredConfigs,
    });

    // Categoria vazia NUNCA deve aparecer
    expect(result.some((c) => c.id === 'cat-vazia')).toBe(false);

    // Todas as categorias com empresas devem estar presentes
    expect(result.map((c) => c.id)).toEqual(['cat-1', 'cat-2', 'cat-3']);

    // A categoria em destaque com empresas vem primeiro e com customizações aplicadas
    expect(result[0]).toEqual({
      id: 'cat-1',
      slug: 'construcao',
      name: 'Construção Civil',
      icon_name: 'building',
    });
  });

  it('prioriza a ordem configurada no painel administrativo para os destaques com empresas', () => {
    const featuredConfigs = [
      { category_id: 'cat-3', display_order: 1 }, // Tecnologia primeiro
      { category_id: 'cat-1', display_order: 2 }, // Construção segundo
    ];

    const result = resolveHomeCategories({
      categoriesWithBusinesses: mockCategoriesWithBiz,
      featuredCategories: featuredConfigs,
    });

    // Destaques ordenados por display_order, seguidos pelas demais com empresas
    expect(result.map((c) => c.slug)).toEqual(['tecnologia', 'construcao', 'saude']);
  });

  it('exibe todas as categorias com empresas mesmo se nao houver nenhum destaque configurado', () => {
    const result = resolveHomeCategories({
      categoriesWithBusinesses: mockCategoriesWithBiz,
      featuredCategories: [],
    });

    expect(result.map((c) => c.id)).toEqual(['cat-1', 'cat-2', 'cat-3']);
  });

  it('retorna fallbackCategories quando nao ha nenhuma empresa cadastrada (banco zerado)', () => {
    const fallback = [
      { id: 'fb-1', slug: 'padrao', name: 'Categoria Padrão', icon_name: 'tag' },
    ];

    const result = resolveHomeCategories({
      categoriesWithBusinesses: [],
      featuredCategories: [{ category_id: 'cat-1', display_order: 1 }],
      fallbackCategories: fallback,
    });

    expect(result).toEqual(fallback);
  });
});

describe('categorias principais da home (carrossel "Explore por Categoria")', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, slug: `s${i}`, name: `Cat ${i}`, icon_name: null }));
  const biz = (cats: Array<[string, boolean]>) => ({
    business_categories: cats.map(([id, primary]) => ({
      is_primary: primary,
      categories: { id, slug: `s${id.slice(1)}`, name: `Cat ${id.slice(1)}`, icon: null },
    })),
  });

  it('derivePrimaryCategories conta só a categoria PRINCIPAL das empresas (secundárias não entram)', () => {
    const result = derivePrimaryCategories([
      biz([['c1', true], ['c2', false]]),
      biz([['c1', true], ['c3', false]]),
      biz([['c4', true], ['c1', false]]),
      biz([['c2', false]]),
    ]);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c4']);
  });

  it('ordena por quantidade de empresas e depois pelo nome', () => {
    const result = derivePrimaryCategories([biz([['c9', true]]), biz([['c3', true]]), biz([['c3', true]]), biz([['c1', true]])]);
    expect(result.map((c) => c.id)).toEqual(['c3', 'c1', 'c9']);
  });

  it('com destaques no painel, exibe somente os destaques com empresas, na ordem resolvida', () => {
    const resolved = [many[5]!, many[2]!, ...many.filter((c) => c.id !== 'c5' && c.id !== 'c2')];
    expect(selectMainHomeCategories(resolved, ['c5', 'c2', 'c-inexistente']).map((c) => c.id)).toEqual(['c5', 'c2']);
  });

  it('sem destaque: usa as categorias principais do prontuário 360, no máximo 10', () => {
    const primary = many.slice(0, 15);
    const picked = selectMainHomeCategories(many, [], primary);
    expect(HOME_MAIN_CATEGORIES_MAX).toBe(10);
    expect(picked).toHaveLength(10);
    expect(picked.map((c) => c.id)).toEqual(primary.slice(0, 10).map((c) => c.id));
  });

  it('principal que não está na lista resolvida (sem empresa visível) é ignorada', () => {
    const resolved = many.slice(0, 5);
    const primary = [many[20]!, many[1]!, many[3]!];
    expect(selectMainHomeCategories(resolved, [], primary).map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  it('sem destaque e sem principais conhecidas: nunca todas, apenas as 10 primeiras', () => {
    expect(selectMainHomeCategories(many, [], [])).toHaveLength(10);
    expect(selectMainHomeCategories(many, [], [], 5)).toHaveLength(5);
    expect(selectMainHomeCategories(many, [], [], 0)).toHaveLength(1);
    expect(selectMainHomeCategories([], ['c1'], [])).toEqual([]);
  });
});

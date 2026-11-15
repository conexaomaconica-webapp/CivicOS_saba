import { describe, expect, it } from 'vitest';
import { resolveHomeCategories, selectMainHomeCategories, HOME_MAIN_CATEGORIES_MAX } from '../src/lib/directory/home-categories';
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

describe('selectMainHomeCategories (carrossel "Explore por Categoria")', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, slug: `s${i}`, name: `Cat ${i}`, icon_name: null }));

  it('com destaques no painel, exibe somente os destaques (na ordem resolvida)', () => {
    const resolved = [many[5]!, many[2]!, ...many.filter((c) => c.id !== 'c5' && c.id !== 'c2')];
    expect(selectMainHomeCategories(resolved, ['c5', 'c2']).map((c) => c.id)).toEqual(['c5', 'c2']);
  });

  it('destaque sem empresas (ausente da lista resolvida) é ignorado', () => {
    expect(selectMainHomeCategories(many, ['c-inexistente', 'c1']).map((c) => c.id)).toEqual(['c1']);
  });

  it('sem nenhum destaque, limita a lista (nunca todas as categorias)', () => {
    const picked = selectMainHomeCategories(many, []);
    expect(picked).toHaveLength(HOME_MAIN_CATEGORIES_MAX);
    expect(picked[0]!.id).toBe('c0');
  });

  it('respeita o máximo informado e nunca devolve lista vazia por limite inválido', () => {
    expect(selectMainHomeCategories(many, [], 5)).toHaveLength(5);
    expect(selectMainHomeCategories(many, [], 0)).toHaveLength(1);
    expect(selectMainHomeCategories([], ['c1'])).toEqual([]);
  });
});

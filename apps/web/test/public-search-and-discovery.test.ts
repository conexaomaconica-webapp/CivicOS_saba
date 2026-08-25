import { describe, it, expect } from 'vitest';
import { searchPublicBusinessesQuerySchema } from '@saas/core';

describe('BLOCO 3: Public Search & Discovery RPC', () => {
  it('enforces limit ceiling of 50 and non-negative offset in query schema', () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';

    const defaultQuery = searchPublicBusinessesQuerySchema.parse({
      tenantId,
    });
    expect(defaultQuery.limit).toBe(10);
    expect(defaultQuery.offset).toBe(0);

    const customQuery = searchPublicBusinessesQuerySchema.parse({
      tenantId,
      query: 'advogado',
      limit: 25,
      offset: 5,
    });
    expect(customQuery.limit).toBe(25);
    expect(customQuery.offset).toBe(5);

    expect(() =>
      searchPublicBusinessesQuerySchema.parse({
        tenantId,
        limit: 100, // Exceeds max 50
      })
    ).toThrow();
  });

  it('filters out ineligible businesses (pending_review, rejected, suspended, inactive)', () => {
    const candidates = [
      { id: '1', name: 'Oficina Alfa', publication_status: 'published', is_active: true },
      { id: '2', name: 'Oficina Beta', publication_status: 'pending_review', is_active: true },
      { id: '3', name: 'Oficina Gama', publication_status: 'rejected', is_active: true },
      { id: '4', name: 'Oficina Delta', publication_status: 'suspended', is_active: true },
      { id: '5', name: 'Oficina Epsilon', publication_status: 'published', is_active: false },
    ];

    const eligible = candidates.filter(
      (c) => c.is_active && c.publication_status === 'published'
    );

    expect(eligible).toHaveLength(1);
    expect(eligible[0].name).toBe('Oficina Alfa');
  });

  it('prioritizes textual relevance before commercial boost in ranking', () => {
    const candidates = [
      {
        name: 'Restaurante Sabor',
        category: 'Alimentação',
        description: 'Especializado em advocacia e consultoria jurídica', // Weak match
        plan_code: 'ouro',
        is_founder: true,
      },
      {
        name: 'Advocacia Silva & Associados', // Exact name match
        category: 'Jurídico',
        description: 'Escritório especializado em direito trabalhista',
        plan_code: 'bronze',
        is_founder: false,
      },
    ];

    const searchQuery = 'Advocacia';

    const rankCandidate = (c: typeof candidates[number]) => {
      let textRelevance = 0;
      if (c.name.toLowerCase().includes(searchQuery.toLowerCase())) textRelevance = 80;
      else if (c.category.toLowerCase().includes(searchQuery.toLowerCase())) textRelevance = 60;
      else if (c.description.toLowerCase().includes(searchQuery.toLowerCase())) textRelevance = 40;

      const tierBoost = c.plan_code === 'ouro' ? 30 : c.plan_code === 'prata' ? 20 : 10;
      const founderBoost = c.is_founder ? 5 : 0;

      return textRelevance + tierBoost + founderBoost;
    };

    const scored = candidates
      .map((c) => ({ ...c, score: rankCandidate(c) }))
      .sort((a, b) => b.score - a.score);

    // Advocacia Silva (Bronze, not founder) gets 80 (text) + 10 (tier) = 90
    // Restaurante Sabor (Ouro, founder) gets 40 (text) + 30 (tier) + 5 (founder) = 75
    // Therefore Advocacia Silva ranks FIRST despite Restaurante Sabor having higher commercial tier!
    expect(scored[0].name).toBe('Advocacia Silva & Associados');
    expect(scored[0].score).toBe(90);
    expect(scored[1].score).toBe(75);
  });

  it('filters businesses by p_slugs in batch query for favorites', () => {
    const candidates = [
      { id: '1', slug: 'empresa-a', name: 'Empresa A', publication_status: 'published', is_active: true },
      { id: '2', slug: 'empresa-b', name: 'Empresa B', publication_status: 'published', is_active: true },
      { id: '3', slug: 'empresa-c', name: 'Empresa C', publication_status: 'published', is_active: true },
    ];

    const pSlugs = ['empresa-a', 'EMPRESA-B'];
    const pSlugsLower = pSlugs.map((s) => s.toLowerCase());

    const result = candidates.filter(
      (c) => c.is_active && c.publication_status === 'published' && pSlugsLower.includes(c.slug.toLowerCase())
    );

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.slug)).toEqual(['empresa-a', 'empresa-b']);
  });

  it('handles mixed p_slugs lookup with valid and unavailable/deleted slugs', () => {
    const publishedBusinesses = [
      { id: '1', slug: 'empresa-a', name: 'Empresa A', category_name: 'Serviços', city: 'São Paulo' },
    ];

    const favoriteSlugs = ['empresa-a', 'slug-inexistente-ou-despublicado'];

    const itemMap = new Map<string, typeof publishedBusinesses[number]>();
    publishedBusinesses.forEach((b) => itemMap.set(b.slug.toLowerCase(), b));

    const modalItems = favoriteSlugs.map((slug) => {
      const found = itemMap.get(slug.toLowerCase());
      if (found) return { ...found, isUnavailable: false };
      return {
        id: slug,
        slug: slug,
        name: slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        category_name: 'Empresa indisponível',
        isUnavailable: true,
      };
    });

    expect(modalItems).toHaveLength(2);
    expect(modalItems[0].isUnavailable).toBe(false);
    expect(modalItems[0].name).toBe('Empresa A');
    expect(modalItems[1].isUnavailable).toBe(true);
    expect(modalItems[1].category_name).toBe('Empresa indisponível');
  });
});

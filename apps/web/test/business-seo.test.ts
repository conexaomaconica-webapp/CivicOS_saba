import { describe, expect, it } from 'vitest';
import {
  buildBusinessDescription,
  buildBusinessTitle,
  buildLocalBusinessSchema,
  isBusinessIndexable,
  schemaTypeForCategory,
  validateSeoOverrides,
  truncateAtWord,
} from '../src/lib/seo/business-seo';
import { buildSitemapBusinessEntries } from '../src/lib/seo/sitemap-businesses';

const base = {
  slug: 'otica-exemplo',
  name: 'Ótica Exemplo',
  category: 'Ótica',
  description: null,
  city: 'Feira de Santana',
  state: 'ba',
};

describe('SEO da empresa', () => {
  it('monta o título com categoria e cidade', () => {
    expect(buildBusinessTitle(base)).toBe('Ótica Exemplo | Ótica em Feira de Santana - BA');
  });

  it('respeita o título manual e limita o automático a 60 caracteres', () => {
    expect(buildBusinessTitle(base, { seo_title: 'Título manual' })).toBe('Título manual');
    const long = buildBusinessTitle({
      ...base,
      name: 'Centro de Oftalmologia e Óptica Avançada Exemplo',
      category: 'Clínica oftalmológica',
    });
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.startsWith('Centro de Oftalmologia')).toBe(true);
  });

  it('não corta a descrição no meio da palavra e prefere a manual', () => {
    const text =
      'Atendimento completo em óculos, lentes e exames de vista com equipe especializada e atendimento personalizado para toda a família da região.';
    const out = buildBusinessDescription({ ...base, description: text });
    expect(out.length).toBeLessThanOrEqual(155);
    expect(text.startsWith(out.replace(/…$/, ''))).toBe(true);
    expect(buildBusinessDescription(base, { seo_description: 'Descrição manual' })).toBe('Descrição manual');
    expect(truncateAtWord('curto', 50)).toBe('curto');
  });

  it('gera descrição natural quando a empresa não tem texto', () => {
    const out = buildBusinessDescription(base);
    expect(out).toContain('Ótica Exemplo');
    expect(out).toContain('Feira de Santana - BA');
    expect(out.length).toBeLessThanOrEqual(155);
  });

  it('é indexável por padrão e só deixa de ser quando desmarcado', () => {
    expect(isBusinessIndexable(null)).toBe(true);
    expect(isBusinessIndexable({ seo_indexable: true })).toBe(true);
    expect(isBusinessIndexable({ seo_indexable: false })).toBe(false);
  });

  it('mapeia categoria para subtipo Schema.org e cai em LocalBusiness', () => {
    expect(schemaTypeForCategory('Restaurante')).toBe('Restaurant');
    expect(schemaTypeForCategory('Advocacia')).toBe('LegalService');
    expect(schemaTypeForCategory('Categoria desconhecida')).toBe('LocalBusiness');
    expect(schemaTypeForCategory(null)).toBe('LocalBusiness');
  });

  it('JSON-LD só inclui o que está cadastrado', () => {
    const schema = buildLocalBusinessSchema({
      ...base,
      imageUrls: [],
      phone: null,
      email: null,
      website: 'www.exemplo.com.br',
      socialUrls: ['https://instagram.com/exemplo', null],
      address: 'Rua A, 10',
      latitude: null,
      longitude: null,
      hours: [
        { dayOfWeek: 1, openTime: '08:00:00', closeTime: '18:00:00', isClosed: false },
        { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
      ],
      ratingAverage: null,
      ratingCount: 0,
    }) as any;
    expect(schema['@type']).toBe('Store');
    expect(schema.address).toMatchObject({ '@type': 'PostalAddress', addressRegion: 'BA', addressCountry: 'BR' });
    expect(schema.openingHoursSpecification).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '08:00', closes: '18:00' },
    ]);
    expect(schema.sameAs).toEqual(['https://www.exemplo.com.br', 'https://instagram.com/exemplo']);
    expect(schema.telephone).toBeUndefined();
    expect(schema.aggregateRating).toBeUndefined();
    expect(schema.geo).toBeUndefined();
  });
});

describe('sitemap das empresas', () => {
  it('exclui não indexáveis, vazias e duplicadas', () => {
    const entries = buildSitemapBusinessEntries([
      { slug: 'a', updated_at: '2026-10-01T10:00:00Z' },
      { slug: 'a' },
      { slug: 'b', seo_indexable: false },
      { slug: '' },
      { slug: null },
      { slug: 'c', updated_at: 'data-invalida' },
    ]);
    expect(entries.map((e) => e.url.replace(/^.*\/guia\//, ''))).toEqual(['a', 'c']);
    expect(entries[0]?.lastModified).toEqual(new Date('2026-10-01T10:00:00Z'));
    expect(entries[1]?.lastModified).toBeUndefined();
  });
});

describe('validação dos campos de SEO do admin', () => {
  const ok = { seo_title: '', seo_description: '', seo_og_image_url: '', seo_indexable: true };

  it('campos vazios voltam ao automático (null)', () => {
    const res = validateSeoOverrides({ ...ok, seo_title: '   ' });
    expect(res).toEqual({ ok: true, values: { seo_title: null, seo_description: null, seo_og_image_url: null, seo_indexable: true } });
  });

  it('rejeita título longo, descrição longa e imagem fora de https', () => {
    expect(validateSeoOverrides({ ...ok, seo_title: 'x'.repeat(71) }).ok).toBe(false);
    expect(validateSeoOverrides({ ...ok, seo_description: 'x'.repeat(201) }).ok).toBe(false);
    expect(validateSeoOverrides({ ...ok, seo_og_image_url: 'http://site.com/a.jpg' }).ok).toBe(false);
    expect(validateSeoOverrides({ ...ok, seo_og_image_url: 'https://site.com/a.jpg', seo_indexable: false })).toMatchObject({
      ok: true,
      values: { seo_og_image_url: 'https://site.com/a.jpg', seo_indexable: false },
    });
  });
});

import { findDuplicateDescriptions, scoreBusinessSeo, seoStatusFor } from '../src/lib/seo/seo-score';
import { businessSlugFromPath, classifyLinkClick } from '../src/lib/analytics/ga-events';

describe('pontuação de SEO', () => {
  const full = {
    name: 'Ótica Exemplo', category: 'Ótica', description: 'x'.repeat(160), slug: 'otica-exemplo', city: 'Feira de Santana', state: 'BA',
    address: 'Rua A, 10', hasCoordinates: true, hoursCount: 5, phone: '7533334444', whatsapp: '75999998888', website: 'https://exemplo.com.br',
    instagram: null, logoUrl: 'https://x/l.png', coverUrl: 'https://x/c.png', galleryCount: 4, servicesCount: 3, seoIndexable: true,
  };

  it('cadastro completo soma 100 e não tem pendências', () => {
    const res = scoreBusinessSeo(full);
    expect(res.score).toBe(100);
    expect(res.statusLabel).toBe('SEO completo');
    expect(res.issues).toEqual([]);
  });

  it('lista o que falta, do mais para o menos pontuado', () => {
    const res = scoreBusinessSeo({ ...full, description: 'curta', logoUrl: null, servicesCount: 0, seoIndexable: false });
    expect(res.score).toBeLessThan(100);
    expect(res.issues.map((i) => i.label)).toContain('Enviar o logo');
    expect(res.issues.map((i) => i.label)).toContain('Liberar a página para o Google (hoje está como noindex)');
    const points = res.issues.map((i) => i.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it('faixas de status', () => {
    expect(seoStatusFor(49).status).toBe('incompleto');
    expect(seoStatusFor(50).status).toBe('basico');
    expect(seoStatusFor(70).status).toBe('bom');
    expect(seoStatusFor(85).status).toBe('muito_bom');
    expect(seoStatusFor(95).status).toBe('completo');
  });

  it('detecta descrições repetidas, ignorando textos curtos', () => {
    const text = 'Atendimento completo em óculos, lentes e exames de vista com equipe especializada.';
    const dup = findDuplicateDescriptions([
      { slug: 'a', description: text }, { slug: 'b', description: `  ${text.toUpperCase()}  ` }, { slug: 'c', description: 'curta' }, { slug: 'd', description: 'curta' },
    ]);
    expect([...dup].sort()).toEqual(['a', 'b']);
  });
});

describe('eventos do Google Analytics', () => {
  it('só considera página de empresa', () => {
    expect(businessSlugFromPath('/guia/otica-exemplo')).toBe('otica-exemplo');
    expect(businessSlugFromPath('/guia/empresas')).toBeNull();
    expect(businessSlugFromPath('/guia/bahia/feira-de-santana')).toBeNull();
    expect(businessSlugFromPath('/')).toBeNull();
  });

  it('classifica os cliques de contato', () => {
    const host = 'conexaomaconica.com.br';
    expect(classifyLinkClick('https://wa.me/5575999998888?text=oi', host, 'a')?.name).toBe('click_whatsapp');
    expect(classifyLinkClick('tel:+5575999998888', host, 'a')?.name).toBe('click_phone');
    expect(classifyLinkClick('https://www.instagram.com/exemplo', host, 'a')?.name).toBe('click_instagram');
    expect(classifyLinkClick('https://www.google.com/maps/dir/?api=1&destination=x', host, 'a')?.name).toBe('click_directions');
    expect(classifyLinkClick('https://exemplo.com.br', host, 'a')?.name).toBe('click_website');
    expect(classifyLinkClick('/guia/outra', host, 'a')).toBeNull();
    expect(classifyLinkClick('https://wa.me/55', host, null)).toBeNull();
  });
});

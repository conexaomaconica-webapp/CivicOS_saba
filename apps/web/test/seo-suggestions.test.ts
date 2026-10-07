import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_MAX,
  LONG_DESCRIPTION_MIN,
  TITLE_MAX,
  generateSeoSuggestions,
  suggestDescriptions,
  suggestLongDescription,
  suggestTitles,
  type SuggestionFacts,
} from '../src/lib/seo/seo-suggestions';
import { buildSeoRowFacts } from '../src/lib/seo/seo-score-input';
import { scoreBusinessSeo } from '../src/lib/seo/seo-score';

const facts: SuggestionFacts = {
  slug: 'otica-exemplo',
  name: 'Ótica Exemplo',
  category: 'Ótica',
  city: 'Feira de Santana',
  state: 'ba',
  description: null,
  services: ['Exame de vista', 'Lentes de contato', 'Armações'],
  hasHours: true,
  hasPhone: true,
  hasWhatsapp: true,
};

describe('sugestões de título', () => {
  it('respeitam o limite e usam nome, categoria e cidade', () => {
    const titles = suggestTitles(facts);
    expect(titles.length).toBeGreaterThan(0);
    for (const title of titles) {
      expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(title).toContain('Ótica Exemplo');
    }
    expect(titles.some((t) => t.includes('Feira de Santana - BA'))).toBe(true);
  });

  it('nome muito longo ainda devolve ao menos uma opção válida', () => {
    const titles = suggestTitles({ ...facts, name: 'Centro Integrado de Oftalmologia e Óptica Avançada de Feira', category: 'Clínica oftalmológica' });
    expect(titles.length).toBeGreaterThan(0);
    titles.forEach((t) => expect(t.length).toBeLessThanOrEqual(TITLE_MAX));
  });

  it('empresas diferentes recebem a ordem de opções diferente (semente pelo slug)', () => {
    const firsts = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((slug) => suggestTitles({ ...facts, slug })[0]));
    expect(firsts.size).toBeGreaterThan(1);
  });
});

describe('sugestões de descrição', () => {
  it('cabem no limite do Google e mencionam só serviços cadastrados', () => {
    const list = suggestDescriptions(facts);
    expect(list.length).toBeGreaterThan(0);
    for (const text of list) expect(text.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    const withServices = list.find((t) => t.includes('Serviços:'));
    expect(withServices).toContain('Exame de vista');
  });

  it('sem serviços cadastrados não inventa nenhum', () => {
    const list = suggestDescriptions({ ...facts, services: [] });
    list.forEach((t) => expect(t).not.toContain('Serviços:'));
  });

  it('só oferece WhatsApp quando a empresa tem WhatsApp', () => {
    const list = suggestDescriptions({ ...facts, hasWhatsapp: false, hasPhone: false });
    list.forEach((t) => expect(t).not.toMatch(/WhatsApp/));
  });
});

describe('descrição longa (campo do cadastro)', () => {
  it('chega a 150 caracteres usando só dados reais', () => {
    const long = suggestLongDescription(facts)!;
    expect(long.reaches150).toBe(true);
    expect(long.text.length).toBeGreaterThanOrEqual(LONG_DESCRIPTION_MIN);
    expect(long.text).toContain('Exame de vista');
    expect(long.text).toContain('Feira de Santana - BA');
  });

  it('não sugere nada quando a descrição atual já passa de 150', () => {
    expect(suggestLongDescription({ ...facts, description: 'x'.repeat(160) })).toBeNull();
  });

  it('mantém o texto original da empresa e acrescenta fatos', () => {
    const own = 'Atendimento completo em óculos e lentes com equipe especializada.';
    const long = suggestLongDescription({ ...facts, description: own })!;
    expect(long.text.startsWith(own)).toBe(true);
  });

  it('com poucos dados, avisa que não alcança 150 e orienta o que cadastrar', () => {
    const poor: SuggestionFacts = { ...facts, services: [], hasHours: false, hasPhone: false, hasWhatsapp: false, category: null, city: null, state: null };
    const result = generateSeoSuggestions(poor);
    expect(result.longDescription?.reaches150).toBe(false);
    expect(result.hints.length).toBeGreaterThan(2);
  });
});

describe('nota 100 com o que o gerador produz', () => {
  it('aplicar a descrição longa leva o item de descrição à pontuação máxima', () => {
    const row = {
      name: 'Ótica Exemplo', slug: 'otica-exemplo', category: 'Ótica', description: 'curta', logo_url: 'https://x/l.png', phone: '7533334444',
      business_locations: [{ city: 'Feira de Santana', state: 'BA', street: 'Rua A', number: '10', latitude: 1, longitude: 2, is_headquarters: true }],
      business_contacts: [{ type: 'whatsapp', value: '75999998888' }, { type: 'instagram', value: 'exemplo' }],
      business_services: [{ name: 'Exame de vista', is_active: true }, { name: 'Lentes', is_active: true }, { name: 'Armações', is_active: true }],
      business_media: [1, 2, 3, 4].map((n) => ({ media_type: 'image', url: `https://x/${n}.jpg` })),
      business_hours: [{ is_closed: false }],
    };
    const before = buildSeoRowFacts(row);
    expect(scoreBusinessSeo(before.scoreInput).score).toBeLessThan(100);

    const suggestions = generateSeoSuggestions({
      slug: row.slug, name: row.name, category: row.category, city: 'Feira de Santana', state: 'BA', description: row.description,
      services: before.serviceNames, hasHours: true, hasPhone: true, hasWhatsapp: true,
    });
    const after = buildSeoRowFacts({ ...row, description: suggestions.longDescription!.text });
    expect(scoreBusinessSeo(after.scoreInput).score).toBe(100);
  });

  it('capa é a primeira imagem e a galeria são as demais', () => {
    const { scoreInput } = buildSeoRowFacts({ business_media: [{ media_type: 'image', url: 'a' }, { media_type: 'image', url: 'b' }, { media_type: 'video', url: 'v' }] });
    expect(scoreInput.coverUrl).toBe('a');
    expect(scoreInput.galleryCount).toBe(1);
  });
});

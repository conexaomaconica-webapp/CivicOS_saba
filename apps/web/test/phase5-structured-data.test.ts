import { describe, it, expect } from 'vitest';
import {
  buildLocalBusinessSchema,
  buildBusinessTitle,
  buildBusinessDescription,
  schemaTypeForCategory,
} from '../src/lib/seo/business-seo';
import { sanitizeJsonLd } from '../src/components/seo/StructuredData';

describe('SPRINT 5 — Testes de Dados Estruturados (JSON-LD & Schema.org)', () => {
  describe('1. Sanitização JSON-LD contra injeção XSS', () => {
    it('escapa caracteres perigosos como <, > e & em strings JSON-LD', () => {
      const payload = {
        name: '<script>alert("xss")</script>',
        description: 'Test & Validate > 100',
      };
      const sanitized = sanitizeJsonLd(payload);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('\\u003cscript\\u003e');
      expect(sanitized).toContain('\\u0026');
    });
  });

  describe('2. Mapeamento de Tipos Específicos do Schema.org', () => {
    it('associa categorias conhecidas aos subtipos específicos de LocalBusiness', () => {
      expect(schemaTypeForCategory('Óptica')).toBe('Store');
      expect(schemaTypeForCategory('Advocacia e Serviços Jurídicos')).toBe('LegalService');
      expect(schemaTypeForCategory('Restaurante e Pizzaria')).toBe('Restaurant');
      expect(schemaTypeForCategory('Clínica Médica')).toBe('MedicalBusiness');
      expect(schemaTypeForCategory('Contabilidade')).toBe('AccountingService');
      expect(schemaTypeForCategory('Imobiliária')).toBe('RealEstateAgent');
      expect(schemaTypeForCategory('Categoria Desconhecida')).toBe('LocalBusiness');
      expect(schemaTypeForCategory(null)).toBe('LocalBusiness');
    });
  });

  describe('3. Construtor de Schema LocalBusiness / Organization', () => {
    it('gera objeto Schema.org válido com @context, @type, PostalAddress, GeoCoordinates e socialUrls', () => {
      const schema = buildLocalBusinessSchema({
        slug: 'optica-visão',
        name: 'Óptica Visão',
        category: 'Óptica',
        description: 'A melhor óptica da cidade com atendimento especializado.',
        city: 'Feira de Santana',
        state: 'BA',
        imageUrls: ['https://www.conexaomaconica.com.br/logo.png'],
        phone: '(75) 99999-9999',
        email: 'contato@opticavisao.com.br',
        website: 'https://opticavisao.com.br',
        socialUrls: ['https://instagram.com/opticavisao'],
        address: 'Av. Getúlio Vargas, 100',
        latitude: -12.2667,
        longitude: -38.9667,
        hours: [
          { dayOfWeek: 1, openTime: '08:00:00', closeTime: '18:00:00', isClosed: false },
          { dayOfWeek: 6, openTime: '08:00:00', closeTime: '12:00:00', isClosed: false },
        ],
        ratingAverage: 5,
        ratingCount: 12,
      });

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Store');
      expect(schema['name']).toBe('Óptica Visão');
      expect(schema['url']).toBe('https://www.conexaomaconica.com.br/guia/optica-visão');

      const address = schema['address'] as Record<string, unknown>;
      expect(address['@type']).toBe('PostalAddress');
      expect(address['streetAddress']).toBe('Av. Getúlio Vargas, 100');
      expect(address['addressLocality']).toBe('Feira de Santana');
      expect(address['addressRegion']).toBe('BA');
      expect(address['addressCountry']).toBe('BR');

      const geo = schema['geo'] as Record<string, unknown>;
      expect(geo['@type']).toBe('GeoCoordinates');
      expect(geo['latitude']).toBe(-12.2667);
      expect(geo['longitude']).toBe(-38.9667);

      const sameAs = schema['sameAs'] as string[];
      expect(sameAs).toContain('https://opticavisao.com.br');
      expect(sameAs).toContain('https://instagram.com/opticavisao');
    });

    it('omite campos ausentes sem gerar null/undefined inválidos no JSON-LD', () => {
      const schema = buildLocalBusinessSchema({
        slug: 'empresa-simples',
        name: 'Empresa Simples',
        category: null,
        description: null,
        city: null,
        state: null,
        imageUrls: [],
        phone: null,
        email: null,
        website: null,
        socialUrls: [],
        address: null,
        latitude: null,
        longitude: null,
        hours: [],
        ratingAverage: null,
        ratingCount: 0,
      });

      expect(schema['@type']).toBe('LocalBusiness');
      expect(schema['address']).toBeUndefined();
      expect(schema['geo']).toBeUndefined();
      expect(schema['openingHoursSpecification']).toBeUndefined();
      expect(schema['aggregateRating']).toBeUndefined();
      expect(schema['telephone']).toBeUndefined();
    });
  });

  describe('4. Geração de Título e Descrição SEO para Metadata', () => {
    it('gera título otimizado respeitando o limite máximo de 60 caracteres', () => {
      const title = buildBusinessTitle({
        slug: 'empresa-exemplo',
        name: 'Oficina Mecânica Especializada do João Silva',
        category: 'Oficina Mecânica',
        description: 'Serviços automotivos completos.',
        city: 'Feira de Santana',
        state: 'BA',
      });
      expect(title.length).toBeLessThanOrEqual(60);
      expect(title).toContain('Oficina Mecânica');
    });

    it('gera descrição com call to action mantendo limite de 155 caracteres', () => {
      const descAuto = buildBusinessDescription({
        slug: 'empresa-exemplo',
        name: 'Clínica de Saúde Fraterna',
        category: 'Saúde e Bem-estar',
        description: 'Atendimento médico.',
        city: 'Salvador',
        state: 'BA',
      });
      expect(descAuto.length).toBeLessThanOrEqual(155);
      expect(descAuto).toContain('Clínica de Saúde Fraterna');

      const descOwn = buildBusinessDescription({
        slug: 'empresa-exemplo',
        name: 'Clínica de Saúde Fraterna',
        category: 'Saúde e Bem-estar',
        description: 'Atendimento médico humanizado com consultas agendadas e exames preventivos completos.',
        city: 'Salvador',
        state: 'BA',
      });
      expect(descOwn.length).toBeLessThanOrEqual(155);
      expect(descOwn).toBe('Atendimento médico humanizado com consultas agendadas e exames preventivos completos.');
    });
  });
});

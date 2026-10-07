import { describe, it, expect } from 'vitest';
import {
  sanitizeSearchTerm,
  cleanGaParams,
  buildGaEvent,
  GA_EVENT_CATALOG,
  gaNameForContactEvent,
  gaNameForConnection,
} from '../src/lib/analytics/events';

describe('SPRINT 8 — Testes de Growth, Conversão e Análise de Demanda', () => {
  describe('1. Sanitização de Termos de Busca e Rastreamento de Demanda', () => {
    it('sanitiza e aceita buscas válidas por produtos e serviços', () => {
      expect(sanitizeSearchTerm('Óptica')).toBe('óptica');
      expect(sanitizeSearchTerm('  Advogado  trabalhista ')).toBe('advogado trabalhista');
    });

    it('bloqueia buscas contendo e-mail ou dados numéricos (CPF/CNPJ/Telefone) para proteger LGPD', () => {
      expect(sanitizeSearchTerm('contato@empresa.com')).toBeNull();
      expect(sanitizeSearchTerm('12345678900')).toBeNull(); // CPF/CNPJ
      expect(sanitizeSearchTerm('(75) 99999-9999')).toBeNull(); // Telefone
    });

    it('trunca termos longos mantendo o limite de 80 caracteres do GA4', () => {
      const longTerm = 'a'.repeat(120);
      const sanitized = sanitizeSearchTerm(longTerm);
      expect(sanitized).not.toBeNull();
      expect(sanitized!.length).toBe(80);
    });
  });

  describe('2. Integridade dos Parâmetros dos Eventos GA4', () => {
    it('filtra estritamente apenas parâmetros permitidos', () => {
      const params = cleanGaParams({
        search_term: '  restaurante  ',
        results_count: 0, // Demanda reprimida (busca sem empresas)
        invalid_param: 'hack',
        business_slug: 'restaurante-sabor',
      });

      expect(params).toHaveProperty('search_term', 'restaurante');
      expect(params).toHaveProperty('results_count', 0);
      expect(params).toHaveProperty('business_slug', 'restaurante-sabor');
      expect(params).not.toHaveProperty('invalid_param');
    });

    it('constrói objeto de evento pronto para o GA4', () => {
      const event = buildGaEvent('search_business', {
        search_term: 'ortopedista',
        results_count: 0,
        city: 'Feira de Santana',
      });

      expect(event.name).toBe('search_business');
      expect(event.params.search_term).toBe('ortopedista');
      expect(event.params.results_count).toBe(0);
      expect(event.params.city).toBe('Feira de Santana');
    });
  });

  describe('3. Mapeamento de Eventos de Conversão e Contato', () => {
    it('mapeia corretamente eventos de contato direto para o GA4', () => {
      expect(gaNameForContactEvent('whatsapp_click')).toBe('click_whatsapp');
      expect(gaNameForContactEvent('directions_click')).toBe('click_directions');
      expect(gaNameForContactEvent('phone_click')).toBe('click_phone');
    });

    it('distingue visitas de outras conexões registradas', () => {
      expect(gaNameForConnection('visita')).toBe('register_visit');
      expect(gaNameForConnection('compra')).toBe('register_connection');
    });

    it('catálogo GA4 inclui todos os eventos-chave do funil de conversão', () => {
      expect(GA_EVENT_CATALOG).toHaveProperty('search_business');
      expect(GA_EVENT_CATALOG).toHaveProperty('view_business');
      expect(GA_EVENT_CATALOG).toHaveProperty('click_whatsapp');
      expect(GA_EVENT_CATALOG).toHaveProperty('register_visit');
      expect(GA_EVENT_CATALOG).toHaveProperty('start_advertiser_signup');
      expect(GA_EVENT_CATALOG).toHaveProperty('contract_signed');
      expect(GA_EVENT_CATALOG).toHaveProperty('payment_confirmed');
    });
  });
});

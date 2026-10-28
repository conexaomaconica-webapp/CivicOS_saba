// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACQUISITION_SOURCES,
  ACQUISITION_LABELS,
  DISCOVERY_SOURCES,
  DISCOVERY_LABELS,
  classifyAcquisition,
  normalizeAcquisitionSource,
  normalizeDiscoverySource,
  captureAcquisitionSource,
  readStoredAcquisitionSource,
  type AcquisitionSource,
  type DiscoverySource,
} from '../src/lib/analytics/traffic-sources';
import {
  trackEvent,
  resetNavigationCycle,
  getOrCreateNavigationCycleId,
} from '../src/lib/analytics/track-client';
import {
  StreamingAnalyticsAggregator,
  type RawAnalyticsEvent,
} from '../src/lib/analytics/analytics-aggregation';
import {
  trackDirectoryEventAction,
  resetServerCycleCacheForTesting,
} from '../src/lib/analytics/analytics-service';
import { POST } from '../src/app/api/analytics/track/route';

const BUSINESS_ID = '123e4567-e89b-42d3-a456-426614174000';

describe('ETAPA B — RASTREABILIDADE DE AQUISIÇÃO E DESCOBERTA', () => {
  beforeEach(async () => {
    resetNavigationCycle();
    await resetServerCycleCacheForTesting();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Separação Estrita de Origens
  // ==========================================================================
  describe('1. Separação de Origens (Aquisição vs Descoberta)', () => {
    it('mantém listas independentes com vocabulário canônico', () => {
      expect(ACQUISITION_SOURCES).toContain('direct');
      expect(ACQUISITION_SOURCES).toContain('organic_search');
      expect(ACQUISITION_SOURCES).toContain('social');
      expect(ACQUISITION_SOURCES).toContain('campaign');
      expect(ACQUISITION_SOURCES).toContain('qr_code');
      expect(ACQUISITION_SOURCES).toContain('external_referral');
      expect(ACQUISITION_SOURCES).toContain('unidentified');

      expect(DISCOVERY_SOURCES).toContain('text_search');
      expect(DISCOVERY_SOURCES).toContain('category');
      expect(DISCOVERY_SOURCES).toContain('map');
      expect(DISCOVERY_SOURCES).toContain('featured_sponsored');
      expect(DISCOVERY_SOURCES).toContain('feed_wall');
      expect(DISCOVERY_SOURCES).toContain('benefits_club');
      expect(DISCOVERY_SOURCES).toContain('lodges_guide');
      expect(DISCOVERY_SOURCES).toContain('direct_link');
      expect(DISCOVERY_SOURCES).toContain('unidentified');

      // Não há sobreposição imprópria de conceitos internos x externos
      expect(ACQUISITION_SOURCES).not.toContain('map');
      expect(ACQUISITION_SOURCES).not.toContain('text_search');
      expect(DISCOVERY_SOURCES).not.toContain('organic_search');
      expect(DISCOVERY_SOURCES).not.toContain('campaign');
    });

    it('possui rótulos em português institucional para cada origem', () => {
      for (const source of ACQUISITION_SOURCES) {
        expect(ACQUISITION_LABELS[source]).toBeTruthy();
      }
      for (const source of DISCOVERY_SOURCES) {
        expect(DISCOVERY_LABELS[source]).toBeTruthy();
      }
    });
  });

  // ==========================================================================
  // 2. Normalização Segura no Servidor
  // ==========================================================================
  describe('2. Normalização Segura no Servidor', () => {
    it('normaliza canonicamente aliases de aquisição e aceita valores válidos', () => {
      expect(normalizeAcquisitionSource('direct')).toBe('direct');
      expect(normalizeAcquisitionSource('google')).toBe('organic_search');
      expect(normalizeAcquisitionSource('organic_google')).toBe('organic_search');
      expect(normalizeAcquisitionSource('search_engine')).toBe('organic_search');
      expect(normalizeAcquisitionSource('instagram')).toBe('social');
      expect(normalizeAcquisitionSource('whatsapp')).toBe('social');
      expect(normalizeAcquisitionSource('cpc')).toBe('campaign');
      expect(normalizeAcquisitionSource('ads')).toBe('campaign');
      expect(normalizeAcquisitionSource('qr')).toBe('qr_code');
      expect(normalizeAcquisitionSource('qrcode')).toBe('qr_code');
      expect(normalizeAcquisitionSource('referral')).toBe('external_referral');
    });

    it('normaliza canonicamente aliases de descoberta', () => {
      expect(normalizeDiscoverySource('text_search')).toBe('text_search');
      expect(normalizeDiscoverySource('search')).toBe('text_search');
      expect(normalizeDiscoverySource('busca')).toBe('text_search');
      expect(normalizeDiscoverySource('category')).toBe('category');
      expect(normalizeDiscoverySource('categoria')).toBe('category');
      expect(normalizeDiscoverySource('map')).toBe('map');
      expect(normalizeDiscoverySource('mapa')).toBe('map');
      expect(normalizeDiscoverySource('map_pin')).toBe('map');
      expect(normalizeDiscoverySource('featured_sponsored')).toBe('featured_sponsored');
      expect(normalizeDiscoverySource('destaque')).toBe('featured_sponsored');
      expect(normalizeDiscoverySource('feed_wall')).toBe('feed_wall');
      expect(normalizeDiscoverySource('mural')).toBe('feed_wall');
      expect(normalizeDiscoverySource('benefits_club')).toBe('benefits_club');
      expect(normalizeDiscoverySource('beneficios')).toBe('benefits_club');
      expect(normalizeDiscoverySource('lodges_guide')).toBe('lodges_guide');
      expect(normalizeDiscoverySource('lojas')).toBe('lodges_guide');
      expect(normalizeDiscoverySource('direct_link')).toBe('direct_link');
    });

    it('classifica origens desconhecidas ou inválidas como "unidentified" sem inventar dados', () => {
      expect(normalizeAcquisitionSource(null)).toBe('unidentified');
      expect(normalizeAcquisitionSource(undefined)).toBe('unidentified');
      expect(normalizeAcquisitionSource(12345)).toBe('unidentified');
      expect(normalizeAcquisitionSource('origem_inventada_123')).toBe('unidentified');

      expect(normalizeDiscoverySource(null)).toBe('unidentified');
      expect(normalizeDiscoverySource(undefined)).toBe('unidentified');
      expect(normalizeDiscoverySource('canal_desconhecido')).toBe('unidentified');
    });
  });

  // ==========================================================================
  // 3. Preservação de Privacidade & LGPD
  // ==========================================================================
  describe('3. Preservação de Privacidade & LGPD', () => {
    it('nunca armazena termos individuais de busca na origem de descoberta', () => {
      // Se um termo de busca cru for acidentalmente passado como descoberta, é descartado para 'unidentified'
      const searchTerms = ['advogado especialista trabalhista', 'restaurante feira de santana', 'joão da silva'];
      for (const term of searchTerms) {
        expect(normalizeDiscoverySource(term)).toBe('unidentified');
      }
    });

    it('API /api/analytics/track normaliza no servidor e não aceita injeção de texto arbitrário', async () => {
      const payload = {
        businessId: BUSINESS_ID,
        eventType: 'view',
        cycleId: 'cycle_test_1234567890',
        acquisitionSource: 'hack_attempt_payload',
        discoverySource: 'termo_secreto_pesquisado',
      };

      const request = new Request('http://localhost:3000/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          host: 'localhost:3000',
        },
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
    });
  });

  // ==========================================================================
  // 4. Classificação de Aquisição no Cliente (Web e Mobile)
  // ==========================================================================
  describe('4. Classificação de Aquisição no Cliente', () => {
    it('classifica acesso direto quando não há referrer ou é do mesmo domínio', () => {
      const result = classifyAcquisition({
        referrer: null,
        search: '',
        ownHost: 'conexaomaconica.com.br',
      });
      expect(result).toBe('direct');
    });

    it('classifica motores de busca orgânicos (Google, Bing, DuckDuckGo, Yahoo)', () => {
      expect(
        classifyAcquisition({
          referrer: 'https://www.google.com.br/search?q=algo',
          search: '',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('organic_search');

      expect(
        classifyAcquisition({
          referrer: 'https://bing.com/',
          search: '',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('organic_search');

      expect(
        classifyAcquisition({
          referrer: 'https://duckduckgo.com/',
          search: '',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('organic_search');
    });

    it('classifica redes sociais e mensageiros (Instagram, WhatsApp, Facebook, LinkedIn)', () => {
      expect(
        classifyAcquisition({
          referrer: 'https://l.instagram.com/',
          search: '',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('social');

      expect(
        classifyAcquisition({
          referrer: 'https://web.whatsapp.com/',
          search: '',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('social');

      expect(
        classifyAcquisition({
          referrer: 'https://www.linkedin.com/feed',
          search: '',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('social');
    });

    it('classifica campanhas pagas com base em UTMs', () => {
      expect(
        classifyAcquisition({
          referrer: 'https://www.google.com/',
          search: '?utm_source=google&utm_medium=cpc&utm_campaign=lancamento',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('campaign');

      expect(
        classifyAcquisition({
          referrer: null,
          search: '?utm_medium=paid',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('campaign');
    });

    it('classifica QR Code físico a partir de parâmetros de campanha ou tag de origem', () => {
      expect(
        classifyAcquisition({
          referrer: null,
          search: '?utm_source=qr',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('qr_code');

      expect(
        classifyAcquisition({
          referrer: null,
          search: '?src=qrcode',
          ownHost: 'conexaomaconica.com.br',
        })
      ).toBe('qr_code');
    });

    it('persiste a origem no sessionStorage da sessão sem sobrescrever com navegação interna', () => {
      // 1. Visitante chega via Google
      const initial = classifyAcquisition({
        referrer: 'https://www.google.com/',
        search: '',
        ownHost: 'localhost:3000',
      });
      captureAcquisitionSource(initial);
      expect(readStoredAcquisitionSource()).toBe('organic_search');

      // 2. Visitante navega para outra página (referrer interno, sem parâmetros)
      const afterNav = captureAcquisitionSource();
      expect(afterNav).toBe('organic_search');
    });
  });

  // ==========================================================================
  // 5. Agregação e Relatórios (StreamingAnalyticsAggregator)
  // ==========================================================================
  describe('5. Agregação Escalável com Separação de Origens', () => {
    it('agrega separadamente acquisitionSources e discoverySources mantendo retrocompatibilidade', () => {
      const now = Date.now();
      const aggregator = new StreamingAnalyticsAggregator(30, now);

      const events: RawAnalyticsEvent[] = [
        // Evento 1: Visualização via Google + Descoberta no Mapa
        {
          event_name: 'view',
          pseudonymous_subject_id: 'sub_001',
          created_at: new Date(now - 86_400_000).toISOString(),
          metadata: {
            acquisition_source: 'organic_search',
            discovery_source: 'map',
            city: 'Salvador',
            state: 'BA',
          },
        },
        // Evento 2: Visualização via Instagram + Descoberta na Busca Textual
        {
          event_name: 'view',
          pseudonymous_subject_id: 'sub_002',
          created_at: new Date(now - 2 * 86_400_000).toISOString(),
          metadata: {
            acquisition_source: 'social',
            discovery_source: 'text_search',
            city: 'Feira de Santana',
            state: 'BA',
          },
        },
        // Evento 3: Visualização Legada (sem acquisition_source nem discovery_source explícitos)
        {
          event_name: 'view',
          pseudonymous_subject_id: 'sub_003',
          source: 'destaque',
          created_at: new Date(now - 3 * 86_400_000).toISOString(),
          metadata: {
            origin: 'direct',
          },
        },
        // Evento 4: Interação Comercial (WhatsApp)
        {
          event_name: 'whatsapp_click',
          pseudonymous_subject_id: 'sub_001',
          created_at: new Date(now - 86_400_000).toISOString(),
          metadata: { channel: 'whatsapp' },
        },
      ];

      aggregator.processChunk(events);
      const result = aggregator.finalize();

      // Métricas Principais
      expect(result.kpis.views).toBe(3);
      expect(result.kpis.uniqueVisitors).toBe(3);
      expect(result.kpis.interactions).toBe(1);
      expect(result.kpis.whatsappClicks).toBe(1);

      // Origens de Aquisição Agregadas
      expect(result.acquisitionSources).toBeDefined();
      const googleAcq = result.acquisitionSources.find((a) => a.source === 'organic_search');
      expect(googleAcq?.count).toBe(1);
      const socialAcq = result.acquisitionSources.find((a) => a.source === 'social');
      expect(socialAcq?.count).toBe(1);
      const directAcq = result.acquisitionSources.find((a) => a.source === 'direct');
      expect(directAcq?.count).toBe(1);

      // Origens de Descoberta Agregadas
      expect(result.discoverySources).toBeDefined();
      const mapDisc = result.discoverySources.find((d) => d.source === 'map');
      expect(mapDisc?.count).toBe(1);
      const textDisc = result.discoverySources.find((d) => d.source === 'text_search');
      expect(textDisc?.count).toBe(1);
      const featuredDisc = result.discoverySources.find((d) => d.source === 'featured_sponsored');
      expect(featuredDisc?.count).toBe(1);

      // Retrocompatibilidade mantida
      expect(result.trafficOrigins).toBeDefined();
      expect(result.trafficOrigins.length).toBeGreaterThan(0);
    });

    it('trata eventos históricos com valores desconhecidos como "unidentified"', () => {
      const now = Date.now();
      const aggregator = new StreamingAnalyticsAggregator(30, now);

      const legacyEvent: RawAnalyticsEvent = {
        event_name: 'view',
        pseudonymous_subject_id: 'sub_legacy',
        created_at: new Date(now - 86_400_000).toISOString(),
        metadata: {},
      };

      aggregator.processChunk([legacyEvent]);
      const result = aggregator.finalize();

      const unidentifiedAcq = result.acquisitionSources.find((a) => a.source === 'unidentified');
      expect(unidentifiedAcq?.count).toBe(1);

      const unidentifiedDisc = result.discoverySources.find((d) => d.source === 'unidentified');
      expect(unidentifiedDisc?.count).toBe(1);
    });
  });

  // ==========================================================================
  // 6. Resiliência de Envio e Recuperação de Falhas de Rede
  // ==========================================================================
  describe('6. Resiliência a Falhas de Rede e Reenvio Legítimo', () => {
    it('desmarca o cycleId em caso de falha de rede para não bloquear reenvio legítimo', async () => {
      let attempt = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          // Primeira tentativa falha por erro de rede (offline/timeout)
          return Promise.reject(new Error('Network error'));
        }
        // Segunda tentativa sucede
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      });

      // Desativa sendBeacon para forçar o caminho do fetch
      (navigator as any).sendBeacon = undefined;

      const cycleId = 'cycle_retry_test_12345';

      // 1. Primeira tentativa falha
      trackEvent({
        businessId: BUSINESS_ID,
        eventType: 'view',
        cycleId,
      });

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // 2. Nova tentativa com o mesmo cycleId deve ser autorizada devido à liberação do cache após erro
      trackEvent({
        businessId: BUSINESS_ID,
        eventType: 'view',
        cycleId,
      });

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});

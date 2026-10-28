// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AdvertiserResultsClient from '@/app/anunciante/resultados/results-client';
import { BusinessCard } from '@/components/public/directory/BusinessCard';
import { BusinessListCard } from '@/components/public/directory/BusinessListCard';
import { sendTrackPayloadWithRetry } from '@/lib/analytics/track-client';
import type { AdvertiserResultsDTO } from '@/lib/advertiser/advertiser-results-service';

// Mock do next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

// Mock do useFavorites
vi.mock('@/lib/directory/favorites-context', () => ({
  useFavorites: () => ({
    isFavorite: () => false,
    toggleFavorite: vi.fn(),
  }),
}));

// Mock do usePedraCardDisplay
vi.mock('@/lib/directory/pedra-card-display-context', () => ({
  usePedraCardDisplay: () => 'circular_seal',
  usePedraHorizontalSeal: () => null,
}));

// Mock do useSearchImpression
vi.mock('@/lib/analytics/use-search-impression', () => ({
  useSearchImpression: () => ({ impressionRef: { current: null } }),
}));

afterEach(() => {
  cleanup();
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

describe('Etapa C — Resiliência de Rede e Retry com Backoff (track-client)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve realizar retry e obter sucesso na 2ª tentativa quando a 1ª falhar por erro de rede', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new TypeError('Failed to fetch (NetworkError)'));
      }
      return Promise.resolve({ ok: true, status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const success = await sendTrackPayloadWithRetry(
      JSON.stringify({ eventType: 'view', businessId: 'biz-1' }),
      'cycle_test_retry',
      { maxRetries: 3, initialDelayMs: 10 }
    );

    expect(success).toBe(true);
    expect(callCount).toBe(2);
  });

  it('deve esgotar as 3 tentativas e retornar false se o erro de rede persistir', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.reject(new TypeError('Network offline'));
    });
    vi.stubGlobal('fetch', fetchMock);

    const success = await sendTrackPayloadWithRetry(
      JSON.stringify({ eventType: 'view', businessId: 'biz-1' }),
      'cycle_test_fail',
      { maxRetries: 3, initialDelayMs: 5 }
    );

    expect(success).toBe(false);
    expect(callCount).toBe(3);
  });

  it('não deve insistir em retry caso a resposta seja erro de validação do cliente (400)', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({ ok: false, status: 400 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const success = await sendTrackPayloadWithRetry(
      JSON.stringify({ eventType: 'view' }),
      'cycle_test_bad_req',
      { maxRetries: 3, initialDelayMs: 5 }
    );

    expect(success).toBe(false);
    expect(callCount).toBe(1); // Encerra na 1ª tentativa
  });
});

describe('Contador de Views por Atualização nos Cards das Empresas', () => {
  const baseCardData = {
    id: 'biz-123',
    slug: 'oficina-irmao-silva',
    name: 'Oficina Irmão Silva',
    category_name: 'Automotivo',
    city: 'Curitiba',
    state: 'PR',
    is_verified: true,
  };

  it('exibe contador de visualizações no BusinessCard quando views_count estiver definido', () => {
    render(
      <BusinessCard
        data={{
          ...baseCardData,
          views_count: 1420,
        }}
      />
    );

    expect(screen.getByText(/1\.420 visualizações/i)).toBeTruthy();
  });

  it('exibe no singular quando views_count for igual a 1 no BusinessCard', () => {
    render(
      <BusinessCard
        data={{
          ...baseCardData,
          views_count: 1,
        }}
      />
    );

    expect(screen.getByText(/1 visualização/i)).toBeTruthy();
  });

  it('exibe contador de visualizações no BusinessListCard quando views_count estiver definido', () => {
    render(
      <BusinessListCard
        data={{
          ...baseCardData,
          views_count: 850,
        }}
      />
    );

    expect(screen.getByText(/850 visualizações/i)).toBeTruthy();
  });
});

describe('Etapa C — Painel do Anunciante (/anunciante/resultados)', () => {
  const mockDto: AdvertiserResultsDTO = {
    period: '30d',
    periodLabel: 'Últimos 30 dias',
    business: {
      id: 'biz-test-uuid',
      name: 'Alpha Engenharia e Serviços',
      slug: 'alpha-engenharia',
    },
    kpis: {
      views: 3450,
      viewsComparisonPercent: 12,
      uniqueVisitors: 2180,
      uniqueVisitorsComparisonPercent: 8,
      interactions: 415,
      interactionsComparisonPercent: 15,
      whatsappClicks: 142,
      whatsappComparisonPercent: 20,
      phoneClicks: 48,
      phoneComparisonPercent: 5,
      websiteClicks: 95,
      websiteComparisonPercent: -2,
      instagramClicks: 62,
      instagramComparisonPercent: 10,
      routeClicks: 68,
      routeComparisonPercent: 14,
      shares: 25,
      sharesComparisonPercent: 0,
      interactionRatePercent: 12.03,
    },
    funnel: {
      views: 3450,
      interactions: 415,
      whatsapp: 142,
      routes: 68,
    },
    dailyEvolution: [
      { date: '2026-10-25', views: 120, uniqueVisitors: 90, interactions: 15 },
      { date: '2026-10-26', views: 145, uniqueVisitors: 110, interactions: 18 },
      { date: '2026-10-27', views: 160, uniqueVisitors: 125, interactions: 22 },
    ],
    trafficOrigins: [
      { origin: 'direct', label: 'Acesso Direto ao Guia', count: 1800, percentage: 52 },
      { origin: 'organic_search', label: 'Busca Orgânica (Google/Bing)', count: 900, percentage: 26 },
      { origin: 'social', label: 'Redes Sociais', count: 450, percentage: 13 },
      { origin: 'campaign', label: 'Campanhas & Anúncios', count: 300, percentage: 9 },
    ],
    acquisitionSources: [
      { source: 'direct', label: 'Acesso Direto ao Guia', count: 1800, percentage: 52 },
      { source: 'organic_search', label: 'Busca Orgânica (Google/Bing)', count: 900, percentage: 26 },
      { source: 'social', label: 'Redes Sociais', count: 450, percentage: 13 },
      { source: 'campaign', label: 'Campanhas & Anúncios', count: 300, percentage: 9 },
    ],
    discoverySources: [
      { source: 'text_search', label: 'Busca Textual do Guia', count: 1500, percentage: 43 },
      { source: 'map', label: 'Explorador de Mapas', count: 980, percentage: 28 },
      { source: 'category', label: 'Navegação por Categorias', count: 520, percentage: 15 },
      { source: 'featured_sponsored', label: 'Destaques do Guia', count: 310, percentage: 9 },
      { source: 'feed_wall', label: 'Mural de Conexões', count: 140, percentage: 5 },
    ],
    actionRanking: [
      { action: 'whatsapp', label: 'Conversas no WhatsApp', count: 142, iconType: 'whatsapp' },
      { action: 'routes', label: 'Solicitações de Rota GPS', count: 68, iconType: 'route' },
      { action: 'phone', label: 'Ligações Telefônicas', count: 48, iconType: 'phone' },
      { action: 'website', label: 'Visitas ao Website', count: 95, iconType: 'website' },
      { action: 'instagram', label: 'Visitas ao Instagram', count: 62, iconType: 'instagram' },
    ],
    topContent: {},
    geographicAggregation: [
      { city: 'Curitiba', state: 'PR', percentage: 70, visitorsCount: 1526 },
      { city: 'São José dos Pinhais', state: 'PR', percentage: 20, visitorsCount: 436 },
      { city: 'Londrina', state: 'PR', percentage: 10, visitorsCount: 218 },
    ],
    recommendations: [
      {
        id: 'rec-1',
        title: 'WhatsApp é o canal de maior tração',
        description: '142 conversas iniciadas. Mantenha resposta ágil.',
        type: 'success',
      },
    ],
    profileDiagnosis: {
      score: 90,
      completedCount: 6,
      totalCount: 7,
      missingItems: [
        { field: 'hours', label: 'Horários de atendimento', actionUrl: '/anunciante/empresa' },
      ],
    },
    connectionResults: {
      registered: 18,
      commercial: 14,
      confirmedCommercial: 12,
      pending: 2,
      withValue: 9,
      referrals: 8,
      shares: 15,
      benefitClaims: 6,
      searchImpressions: 4200,
      byOrigin: {
        plataforma: 10,
        indicacao: 5,
        espontanea: 3,
      },
      byValueRange: {
        ate_500: 3,
        de_500_a_2000: 4,
        acima_2000: 2,
      },
    },
    valueSummary: {
      headline: 'Sua empresa gerou 18 conexões e mais de 3.000 visualizações',
      lines: ['18 conexões registradas na rede', '142 contatos diretos no WhatsApp'],
      opportunity: 'Adicione horários para facilitar a visita de clientes.',
      milestones: [{ key: 'm1', title: '1.000 visualizações alcançadas' }],
    },
    dataCompleteness: {
      isLegacyDataPresent: true,
      hasAcquisitionCoverage: true,
      hasDiscoveryCoverage: true,
      totalRecordsAnalyzed: 3865,
    },
    lastUpdatedAt: '2026-10-28T09:30:00.000Z',
    timezone: 'America/Sao_Paulo',
  };

  it('renderiza o cabeçalho com identificação do fuso horário America/Sao_Paulo e data de atualização', () => {
    render(<AdvertiserResultsClient initialData={mockDto} />);

    expect(screen.getByText(/America\/Sao_Paulo/i)).toBeTruthy();
    expect(screen.getByText(/Horário de Brasília/i)).toBeTruthy();
    expect(screen.getByText(/Alpha Engenharia e Serviços/i)).toBeTruthy();
  });

  it('apresenta a Área 1 de Visibilidade com visualizações totais, únicos e evolução temporal', () => {
    render(<AdvertiserResultsClient initialData={mockDto} />);

    expect(screen.getByText(/Visibilidade do Anúncio/i)).toBeTruthy();
    expect(screen.getAllByText(/3\.450/i)[0]).toBeTruthy(); // Visualizações totais
    expect(screen.getByText(/2\.180/i)).toBeTruthy(); // Visitantes únicos
    expect(screen.getByText(/3\. Evolução Temporal dos Acessos/i)).toBeTruthy();
  });

  it('apresenta a Área 2 de Interesse Comercial com os 5 canais e a nota de transparência', () => {
    render(<AdvertiserResultsClient initialData={mockDto} />);

    expect(screen.getByText(/Interesse Comercial & Ações nos Canais/i)).toBeTruthy();
    expect(screen.getAllByText(/142/i)[0]).toBeTruthy(); // WhatsApp
    expect(screen.getByText(/48/i)).toBeTruthy(); // Telefone
    expect(screen.getByText(/95/i)).toBeTruthy(); // Website
    expect(screen.getByText(/62/i)).toBeTruthy(); // Instagram
    expect(screen.getAllByText(/68/i)[0]).toBeTruthy(); // Rotas GPS

    // Nota de transparência de que clique não é garantia de venda
    expect(screen.getByText(/Transparência & Diretrizes Comerciais:/i)).toBeTruthy();
    expect(
      screen.getByText(/Nenhum clique ou visualização garante venda concretizada ou faturamento comercial/i)
    ).toBeTruthy();
  });

  it('apresenta a Área 3 com Origem de Aquisição e Origem de Descoberta separadas e sem menção a Pedra Fundamental', () => {
    render(<AdvertiserResultsClient initialData={mockDto} />);

    expect(screen.getByText(/9\. Tráfego Externo/i)).toBeTruthy();
    expect(screen.getByText(/Origem de Aquisição/i)).toBeTruthy();
    expect(screen.getByText(/10\. Navegação Interna/i)).toBeTruthy();
    expect(screen.getByText(/Origem de Descoberta/i)).toBeTruthy();

    // Rótulo oficial de destaques sem expor Pedra Fundamental
    expect(screen.getByText(/Destaques do Guia/i)).toBeTruthy();
    expect(screen.queryByText(/Pedra Fundamental/i)).not.toBeTruthy();

    // Base de cálculo informada
    expect(screen.getAllByText(/Base de cálculo:/i)[0]).toBeTruthy();
  });

  it('apresenta a Área 4 de Conexões e Resultados comunitários separados da telemetria de tráfego', () => {
    render(<AdvertiserResultsClient initialData={mockDto} />);

    expect(screen.getAllByText(/Conexões Declaradas/i)[0]).toBeTruthy();
    expect(screen.getByText(/Diferente da telemetria de navegação \(Base Declaratória\)/i)).toBeTruthy();
    expect(screen.getByText(/18 conexões registradas na rede/i)).toBeTruthy();
  });

  it('renderiza o Empty State amigável quando o anúncio ainda não possui visualizações nem interações', () => {
    const emptyDto: AdvertiserResultsDTO = {
      ...mockDto,
      kpis: {
        views: 0,
        viewsComparisonPercent: 0,
        uniqueVisitors: 0,
        uniqueVisitorsComparisonPercent: 0,
        interactions: 0,
        interactionsComparisonPercent: 0,
        whatsappClicks: 0,
        whatsappComparisonPercent: 0,
        phoneClicks: 0,
        phoneComparisonPercent: 0,
        websiteClicks: 0,
        websiteComparisonPercent: 0,
        instagramClicks: 0,
        instagramComparisonPercent: 0,
        routeClicks: 0,
        routeComparisonPercent: 0,
        shares: 0,
        sharesComparisonPercent: 0,
        interactionRatePercent: 0,
      },
      dailyEvolution: [],
      funnel: { views: 0, interactions: 0, whatsapp: 0, routes: 0 },
    };

    render(<AdvertiserResultsClient initialData={emptyDto} />);

    expect(screen.getByText(/Seu anúncio ainda está começando a receber visitas/i)).toBeTruthy();
    expect(
      screen.getByText(/Assim que visitantes e membros abrirem seu perfil e interagirem via WhatsApp/i)
    ).toBeTruthy();
    expect(screen.getByText(/Ver meu anúncio no Guia/i)).toBeTruthy();
  });

  it('cobre explicitamente os 10 indicadores canônicos de telemetria e tráfego', () => {
    render(<AdvertiserResultsClient initialData={mockDto} />);

    // 1. Total de Visualizações
    expect(screen.getAllByText(/Visualizações Totais/i)[0]).toBeTruthy();
    // 2. Visitantes Únicos
    expect(screen.getAllByText(/Visitantes Únicos/i)[0]).toBeTruthy();
    // 3. Evolução Diária / Acessos
    expect(screen.getByText(/3\. Evolução Temporal dos Acessos/i)).toBeTruthy();
    // 4. WhatsApp
    expect(screen.getAllByText(/WhatsApp/i)[0]).toBeTruthy();
    // 5. Ligações Telefônicas
    expect(screen.getAllByText(/Telefone/i)[0]).toBeTruthy();
    // 6. Website Oficial
    expect(screen.getAllByText(/Website/i)[0]).toBeTruthy();
    // 7. Perfil no Instagram
    expect(screen.getAllByText(/Instagram/i)[0]).toBeTruthy();
    // 8. Rotas GPS
    expect(screen.getAllByText(/Rotas GPS/i)[0]).toBeTruthy();
    // 9. Origem de Aquisição
    expect(screen.getByText(/9\. Tráfego Externo/i)).toBeTruthy();
    // 10. Origem de Descoberta
    expect(screen.getByText(/10\. Navegação Interna/i)).toBeTruthy();
  });
});


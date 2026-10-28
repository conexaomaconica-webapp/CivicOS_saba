/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DirectoryMapExplore } from '../src/components/public/directory/DirectoryMapExplore';
import type { PublicSearchResultItem } from '../src/components/public/directory/DirectoryAllBusinesses';

afterEach(() => {
  cleanup();
});

// Mock do componente DirectoryLeafletMap para validar as props recebidas
vi.mock('../src/components/public/directory/DirectoryLeafletMap', () => ({
  DirectoryLeafletMap: ({ businesses, isFullscreen, onToggleFullscreen }: any) => (
    <div data-testid="mock-leaflet-map" data-fullscreen={String(isFullscreen)}>
      <span data-testid="map-biz-count">{businesses.length}</span>
      <button data-testid="btn-toggle-fs" onClick={onToggleFullscreen}>
        Toggle FS
      </button>
    </div>
  ),
}));

describe('DirectoryMapExplore — Funcionalidades de Mapa, Benefícios e Tela Cheia', () => {
  const sampleBusinesses: PublicSearchResultItem[] = [
    {
      id: 'biz-1',
      slug: 'padaria-central',
      name: 'Padaria Central',
      short_description: 'Pães artesanais',
      logo_url: '/logo1.png',
      cover_url: null,
      category_name: 'Alimentação',
      category_slug: 'alimentacao',
      city: 'Florianópolis',
      state: 'SC',
      latitude: -27.5954,
      longitude: -48.548,
      address_line: 'Rua das Flores, 123',
      is_verified: true,
      has_benefits: true,
      has_events: false,
    },
    {
      id: 'biz-2',
      slug: 'oficina-mecanica',
      name: 'Oficina do Irmão',
      short_description: 'Serviços automotivos',
      logo_url: null,
      cover_url: null,
      category_name: 'Automotivo',
      category_slug: 'automotivo',
      city: 'Florianópolis',
      state: 'SC',
      latitude: -27.598,
      longitude: -48.55,
      address_line: 'Av Central, 456',
      is_verified: false,
      has_benefits: false,
      has_events: true,
    },
    {
      id: 'biz-3',
      slug: 'advocacia-fraterna',
      name: 'Advocacia Fraterna',
      short_description: 'Direito civil',
      logo_url: null,
      cover_url: null,
      category_name: 'Serviços',
      category_slug: 'servicos',
      city: 'São José',
      state: 'SC',
      latitude: -27.6,
      longitude: -48.6,
      address_line: 'Rua São José, 789',
      is_verified: true,
      has_benefits: false,
      has_events: false,
    },
  ];

  it('1. Renderiza abas com contadores corretos: Todas (3), Benefícios (1), Eventos (1)', () => {
    render(<DirectoryMapExplore businesses={sampleBusinesses} selectedCity="Florianópolis" />);

    expect(screen.getByText('Todas')).toBeDefined();
    expect(screen.getByText('Benefícios')).toBeDefined();
    expect(screen.getByText('Eventos')).toBeDefined();

    // Contador de benefícios deve ser 1
    const benefitsTab = screen.getByRole('button', { name: /Benefícios/i });
    expect(benefitsTab.textContent).toContain('1');

    // Contador de eventos deve ser 1
    const eventsTab = screen.getByRole('button', { name: /Eventos/i });
    expect(eventsTab.textContent).toContain('1');

    // Contador total deve ser 3
    const todasTab = screen.getByRole('button', { name: /Todas/i });
    expect(todasTab.textContent).toContain('3');
  });

  it('2. Ao clicar na aba Benefícios, filtra e exibe apenas empresas com benefício ativo', () => {
    render(<DirectoryMapExplore businesses={sampleBusinesses} />);

    const benefitsTab = screen.getByRole('button', { name: /Benefícios/i });
    fireEvent.click(benefitsTab);

    // O mapa deve receber apenas 1 empresa
    const mapBizCount = screen.getByTestId('map-biz-count');
    expect(mapBizCount.textContent).toBe('1');

    // Na sidebar e no card flutuante, deve exibir Padaria Central e NÃO deve exibir Oficina do Irmão nem Advocacia Fraterna
    expect(screen.getAllByText('Padaria Central').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Oficina do Irmão')).toBeNull();
    expect(screen.queryByText('Advocacia Fraterna')).toBeNull();
  });

  it('3. Ao selecionar empresa com benefício, exibe badge "Benefício Exclusivo"', () => {
    render(<DirectoryMapExplore businesses={sampleBusinesses} />);

    // Padaria Central é a primeira e vem selecionada por padrão
    expect(screen.getByText('Benefício Exclusivo')).toBeDefined();
  });

  it('4. Permite alternar modo Tela Cheia via toggleFullscreen', () => {
    render(<DirectoryMapExplore businesses={sampleBusinesses} />);

    const leafletMap = screen.getByTestId('mock-leaflet-map');
    expect(leafletMap.getAttribute('data-fullscreen')).toBe('false');

    const toggleBtn = screen.getByTestId('btn-toggle-fs');
    fireEvent.click(toggleBtn);

    expect(leafletMap.getAttribute('data-fullscreen')).toBe('true');
    expect(screen.getByText(/Modo Tela Cheia — Pressione ESC para sair/i)).toBeDefined();

    // Fecha tela cheia
    fireEvent.click(toggleBtn);
    expect(leafletMap.getAttribute('data-fullscreen')).toBe('false');
  });

  it('5. Exibe empty state explicativo quando uma aba não possui itens', () => {
    const businessesWithoutBenefits = sampleBusinesses.map((b) => ({ ...b, has_benefits: false }));
    render(<DirectoryMapExplore businesses={businessesWithoutBenefits} />);

    const benefitsTab = screen.getByRole('button', { name: /Benefícios/i });
    fireEvent.click(benefitsTab);

    expect(
      screen.getByText('Nenhuma empresa com benefício exclusivo cadastrado nesta região no momento.')
    ).toBeDefined();
  });
});

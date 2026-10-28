/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FavoritesProvider } from '../src/lib/directory/favorites-context';
import { BusinessMapView } from '../src/components/public/directory/BusinessMapView';
import type { BusinessCardData } from '../src/components/public/directory/BusinessCard';

afterEach(() => {
  cleanup();
});

// Mock do next/dynamic para carregar o componente de mapa imediatamente
vi.mock('next/dynamic', () => ({
  default: () => {
    return function MockDynamicMap({ points, isFullscreen, onToggleFullscreen }: any) {
      return (
        <div data-testid="mock-business-map" data-fullscreen={String(isFullscreen)}>
          <span data-testid="points-count">{points.length}</span>
          <div data-testid="points-json">{JSON.stringify(points)}</div>
          <button data-testid="btn-toggle-fs" onClick={onToggleFullscreen}>
            Toggle FS
          </button>
        </div>
      );
    };
  },
}));

describe('BusinessMapView — Integração de Logos nos Pins, Satélite e Tela Cheia', () => {
  const sampleBusinesses: BusinessCardData[] = [
    {
      id: 'biz-1',
      slug: 'comandos-seguranca',
      name: 'Comandos Segurança',
      category_name: 'Segurança Privada',
      city: 'Florianópolis',
      state: 'SC',
      latitude: -27.595,
      longitude: -48.548,
      logo_url: 'https://example.com/comandos.png',
      has_benefits: true,
      effective_plan_code: 'acacia',
    },
    {
      id: 'biz-2',
      slug: 'marcenaria-arte',
      name: 'Marcenaria Arte',
      category_name: 'Móveis',
      city: 'São José',
      state: 'SC',
      latitude: -27.601,
      longitude: -48.552,
      logo_url: null,
      has_benefits: false,
      effective_plan_code: 'esquadro',
    },
  ];

  it('1. Mapeia logo_url, category_name e has_benefits corretamente para os MapPoints', () => {
    render(
      <FavoritesProvider>
        <BusinessMapView items={sampleBusinesses} />
      </FavoritesProvider>
    );

    const pointsJsonEl = screen.getByTestId('points-json');
    const points = JSON.parse(pointsJsonEl.textContent || '[]');

    expect(points.length).toBe(2);

    expect(points[0]).toEqual({
      slug: 'comandos-seguranca',
      name: 'Comandos Segurança',
      latitude: -27.595,
      longitude: -48.548,
      logo_url: 'https://example.com/comandos.png',
      category_name: 'Segurança Privada',
      has_benefits: true,
    });

    expect(points[1]).toEqual({
      slug: 'marcenaria-arte',
      name: 'Marcenaria Arte',
      latitude: -27.601,
      longitude: -48.552,
      logo_url: null,
      category_name: 'Móveis',
      has_benefits: false,
    });
  });

  it('2. Permite alternar Tela Cheia com layout adaptado', () => {
    render(
      <FavoritesProvider>
        <BusinessMapView items={sampleBusinesses} />
      </FavoritesProvider>
    );

    const map = screen.getByTestId('mock-business-map');
    expect(map.getAttribute('data-fullscreen')).toBe('false');

    const toggleBtn = screen.getByTestId('btn-toggle-fs');
    fireEvent.click(toggleBtn);

    expect(map.getAttribute('data-fullscreen')).toBe('true');
    expect(screen.getByText(/Modo Tela Cheia — Pressione ESC para sair/i)).toBeDefined();

    // Sair de tela cheia
    fireEvent.click(toggleBtn);
    expect(map.getAttribute('data-fullscreen')).toBe('false');
  });
});

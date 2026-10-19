import { describe, expect, it } from 'vitest';
import { createMobileGuideService } from './guide-data';

describe('mobile guide data', () => {
  it('consome a configuração publicada e preserva a ordem do Admin', async () => {
    const service = createMobileGuideService(async () => new Response(JSON.stringify({
      settings: {
        hero_title: 'Título publicado',
        hero_subtitle: 'Subtítulo publicado',
        hero_search_placeholder: 'Buscar no Guia',
        sections_config: [
          { id: 'sponsored', enabled: true, order: 1 },
          { id: 'weekly_highlight', enabled: false, order: 2 },
        ],
      },
      available_cities: ['Curitiba'],
    }), { status: 200 }), 'https://isolated.test/api/mobile/guide');

    const data = await service.loadHome('Curitiba');
    expect(data.settings.hero_title).toBe('Título publicado');
    expect(data.settings.sections_config.map((section) => section.id)).toEqual(['sponsored', 'weekly_highlight']);
    expect(data.available_cities).toEqual(['Curitiba']);
  });

  it('faz o parse correto de latitude, longitude e endereço para o mapa', async () => {
    const service = createMobileGuideService(async () => new Response(JSON.stringify({
      settings: {
        hero_title: 'Título',
        sections_config: [{ id: 'map', enabled: true, order: 1 }],
      },
      businesses: [
        {
          id: 'b1',
          name: 'Comandos',
          slug: 'comandos',
          city: 'Feira de Santana',
          state: 'BA',
          latitude: -12.2583598,
          longitude: -38.9492615,
          address: 'Av. Maria Quitéria, 1200',
        },
      ],
      available_cities: ['Feira de Santana'],
    }), { status: 200 }), 'https://isolated.test/api/mobile/guide');

    const data = await service.loadHome('Feira de Santana');
    expect(data.businesses).toHaveLength(1);
    expect(data.businesses[0]?.latitude).toBe(-12.2583598);
    expect(data.businesses[0]?.longitude).toBe(-38.9492615);
    expect(data.businesses[0]?.address).toBe('Av. Maria Quitéria, 1200');
  });

  it('falha fechado quando o BFF não está disponível', async () => {
    const service = createMobileGuideService(async () => new Response(null, { status: 503 }), 'https://isolated.test/api/mobile/guide');
    await expect(service.loadHome()).rejects.toThrow('Guia indisponível');
  });
});


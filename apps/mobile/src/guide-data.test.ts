import { describe, expect, it } from 'vitest';
import {
  createMobileGuideService,
  loadEventsFromDirectSupabase,
  submitMobileEventRSVP,
} from './guide-data';

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

  it('preserva logo_background_color para carrossel e cards na home', async () => {
    const service = createMobileGuideService(async () => new Response(JSON.stringify({
      settings: {
        hero_title: 'Título',
        sections_config: [{ id: 'sponsored', enabled: true, order: 1 }],
      },
      businesses: [
        {
          id: 'b2',
          name: 'Marca Escura',
          slug: 'marca-escura',
          is_pedra_fundamental: true,
          logo_background_color: '#1b263b',
        },
      ],
      available_cities: [],
    }), { status: 200 }), 'https://isolated.test/api/mobile/guide');

    const data = await service.loadHome();
    expect(data.businesses[0]?.logo_background_color).toBe('#1b263b');
    expect(data.businesses[0]?.is_pedra_fundamental).toBe(true);
  });

  it('falha fechado quando o BFF não está disponível', async () => {
    const service = createMobileGuideService(async () => new Response(null, { status: 503 }), 'https://isolated.test/api/mobile/guide');
    await expect(service.loadHome()).rejects.toThrow('Guia indisponível');
  });

  it('carrega eventos do BFF sem cache preservando capacity e registration_enabled', async () => {
    let requestedUrl = '';
    const events = await loadEventsFromDirectSupabase(async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({
        events: [
          {
            id: 'evt-1',
            slug: 'conexao-empresarial-2026',
            title: 'Conexão Empresarial',
            organizer_type: 'platform',
            registration_enabled: true,
            capacity: 500,
            price_info: 'Entrada Franca',
          },
        ],
      }), { status: 200 });
    });

    expect(requestedUrl).toContain('/api/mobile/events?_t=');
    expect(events).toHaveLength(1);
    expect(events[0]?.registration_enabled).toBe(true);
    expect(events[0]?.capacity).toBe(500);
  });

  it('submete RSVP mobile com source=app_mobile e retorna confirmationCode', async () => {
    let capturedBody: Record<string, unknown> = {};
    const res = await submitMobileEventRSVP(
      {
        eventId: 'evt-1',
        fullName: 'Eduardo Silva',
        whatsapp: '75999999999',
        attendeeType: 'macom',
        masonicOrganization: 'Loja 16 de Junho',
        attendanceStatus: 'confirmed',
      },
      async (_input, init) => {
        capturedBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
        return new Response(JSON.stringify({
          success: true,
          data: {
            registrationId: 'reg-1',
            confirmationCode: 'CM-2026-0048',
            isNew: true,
            fullName: 'Eduardo Silva',
            attendanceStatus: 'confirmed',
          },
        }), { status: 200 });
      },
    );

    expect(res.success).toBe(true);
    expect(res.data?.confirmationCode).toBe('CM-2026-0048');
    expect(capturedBody.source).toBe('app_mobile');
  });

  it('retorna erro amigável quando RSVP mobile retorna 400 do servidor', async () => {
    const res = await submitMobileEventRSVP(
      {
        eventId: 'evt-1',
        fullName: 'Eduardo Silva',
        whatsapp: '75999999999',
        attendeeType: 'macom',
        attendanceStatus: 'confirmed',
      },
      async () => new Response(JSON.stringify({
        success: false,
        error: 'Loja / Potência Maçônica é obrigatória para a categoria Maçom.',
      }), { status: 400 }),
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('Maçônica');
  });
});


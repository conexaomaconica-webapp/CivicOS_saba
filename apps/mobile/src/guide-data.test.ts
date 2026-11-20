import { describe, expect, it } from 'vitest';
import {
  createMobileGuideService,
  isSafeImageCoverUrl,
  loadBusinessDetailFromDirectSupabase,
  loadEventsFromDirectSupabase,
  mergeBusinessRecords,
  pickMainCategories,
  MOBILE_MAIN_CATEGORIES_MAX,
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

  it('impede que sponsored com URL de vídeo do YouTube sobrescreva cover_url de imagem válida (Comandos, FISION, Grupo MAP)', () => {
    expect(isSafeImageCoverUrl('https://youtu.be/am3teVpl-Ow')).toBe(false);
    expect(isSafeImageCoverUrl('https://youtube.com/shorts/05Lm_cJzs34')).toBe(false);
    expect(isSafeImageCoverUrl('https://youtu.be/2bHPkewankE?is=tYJ5AFPO9TsGODz0')).toBe(false);
    expect(isSafeImageCoverUrl('https://cdn.example.com/capa.webp')).toBe(true);
    expect(isSafeImageCoverUrl('https://cdn.example.com/capa.png')).toBe(true);
    expect(isSafeImageCoverUrl('https://cdn.example.com/capa.jpg')).toBe(true);

    const searchRow = {
      id: '5d355d41-a5a2-4e86-808c-57f7ef86afef',
      name: 'FISION — Fisioterapia e Pilates',
      slug: 'fision',
      cover_url: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000000/5d355d41-a5a2-4e86-808c-57f7ef86afef/cover/d7b72e7f-f92d-4345-8346-3c334b16b84c.webp',
    };
    const sponsoredExtraWithYoutube = {
      id: '5d355d41-a5a2-4e86-808c-57f7ef86afef',
      name: 'FISION — Fisioterapia e Pilates',
      slug: 'fision',
      cover_url: 'https://youtube.com/shorts/05Lm_cJzs34',
      is_featured: true,
      views_count: 42,
      cover_offset_y: 11,
      cover_zoom: 1,
      cover_fit_mode: 'cover',
    };

    const merged = mergeBusinessRecords(searchRow, sponsoredExtraWithYoutube);
    expect(merged.cover_url).toBe(searchRow.cover_url);
    expect(merged.is_featured).toBe(true);
    expect(merged.views_count).toBe(42);
    expect(merged.cover_offset_y).toBe(11);
  });

  it('resolve cover_url a partir da primeira mídia de imagem no detalhe da empresa, preservando o vídeo institucional', async () => {
    const fisionCover =
      'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000000/5d355d41-a5a2-4e86-808c-57f7ef86afef/cover/d7b72e7f-f92d-4345-8346-3c334b16b84c.webp';

    const detail = await loadBusinessDetailFromDirectSupabase(
      async (input) => {
        const url = String(input);
        if (url.includes('/rpc/public_business_detail')) {
          return new Response(
            JSON.stringify([
              {
                business_id: '5d355d41-a5a2-4e86-808c-57f7ef86afef',
                business_name: 'FISION — Fisioterapia e Pilates',
                business_slug: 'fision',
                effective_plan_code: 'acacia',
                media: [
                  { id: 'v1', media_type: 'video', url: 'https://youtube.com/shorts/05Lm_cJzs34', display_order: 0 },
                  { id: 'c1', media_type: 'image', url: fisionCover, display_order: 0 },
                ],
              },
            ]),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      },
      'fision',
    );

    expect(detail).not.toBeNull();
    expect(detail?.cover_url).toBe(fisionCover);
    expect(detail?.media).toHaveLength(2);
    expect(detail?.media.find((m) => m.media_type === 'video')?.url).toBe('https://youtube.com/shorts/05Lm_cJzs34');
  });

  it('homologação das 3 empresas afetadas (Comandos, FISION, Grupo MAP) no loadHome: corrige sponsored e preserva businesses sem URLs do YouTube', async () => {
    const comandosCover = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000000201/cover/1789991047944-images__8_.webp';
    const fisionCover = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000000/5d355d41-a5a2-4e86-808c-57f7ef86afef/cover/d7b72e7f-f92d-4345-8346-3c334b16b84c.webp';
    const grupomapCover = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000000/1caa6064-765b-4c59-b55b-6894edcd4792/cover/a6e9d096-f5d0-427a-aa76-108652472e31.webp';

    const service = createMobileGuideService(async (input) => {
      const url = String(input);
      if (url.includes('/rpc/public_directory_home_data')) {
        return new Response(
          JSON.stringify({
            settings: { hero_title: 'Guia Oficial' },
            sponsored: [
              { id: '00000000-0000-0000-0000-000000000201', name: 'Comandos', slug: 'comandos', cover_url: 'https://youtu.be/am3teVpl-Ow' },
              { id: '5d355d41-a5a2-4e86-808c-57f7ef86afef', name: 'FISION — Fisioterapia e Pilates', slug: 'fision', cover_url: 'https://youtube.com/shorts/05Lm_cJzs34' },
              { id: '1caa6064-765b-4c59-b55b-6894edcd4792', name: 'Grupo MAP', slug: 'grupomap', cover_url: 'https://youtu.be/2bHPkewankE?is=tYJ5AFPO9TsGODz0' },
            ],
            available_cities: ['Feira de Santana'],
          }),
          { status: 200 },
        );
      }
      if (url.includes('/rpc/public_businesses_search')) {
        return new Response(
          JSON.stringify({
            items: [
              { id: '00000000-0000-0000-0000-000000000201', name: 'Comandos', slug: 'comandos', cover_url: comandosCover },
              { id: '5d355d41-a5a2-4e86-808c-57f7ef86afef', name: 'FISION — Fisioterapia e Pilates', slug: 'fision', cover_url: fisionCover },
              { id: '1caa6064-765b-4c59-b55b-6894edcd4792', name: 'Grupo MAP', slug: 'grupomap', cover_url: grupomapCover },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes('/api/mobile/guide')) {
        return new Response(
          JSON.stringify({
            businesses: [
              { id: '00000000-0000-0000-0000-000000000201', name: 'Comandos', slug: 'comandos', cover_url: comandosCover, views_count: 15 },
              { id: '5d355d41-a5a2-4e86-808c-57f7ef86afef', name: 'FISION — Fisioterapia e Pilates', slug: 'fision', cover_url: fisionCover, views_count: 22 },
              { id: '1caa6064-765b-4c59-b55b-6894edcd4792', name: 'Grupo MAP', slug: 'grupomap', cover_url: grupomapCover, views_count: 18 },
            ],
            sponsored: [
              { id: '00000000-0000-0000-0000-000000000201', name: 'Comandos', slug: 'comandos', cover_url: 'https://youtu.be/am3teVpl-Ow', is_featured: true },
              { id: '5d355d41-a5a2-4e86-808c-57f7ef86afef', name: 'FISION — Fisioterapia e Pilates', slug: 'fision', cover_url: 'https://youtube.com/shorts/05Lm_cJzs34', is_featured: true },
              { id: '1caa6064-765b-4c59-b55b-6894edcd4792', name: 'Grupo MAP', slug: 'grupomap', cover_url: 'https://youtu.be/2bHPkewankE?is=tYJ5AFPO9TsGODz0', is_featured: true },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });

    const home = await service.loadHome();
    expect(home.businesses.map((b) => b.cover_url)).toEqual([comandosCover, fisionCover, grupomapCover]);
    expect(home.sponsored.map((b) => b.cover_url)).toEqual([comandosCover, fisionCover, grupomapCover]);
  });
});


describe('categorias principais da home do app', () => {
  const cat = (n: number, count = 1) => ({ id: `c${n}`, slug: `s${n}`, name: `Cat ${n}`, icon_name: null, business_count: count });

  it('usa a lista principal do servidor (destaques/principais do prontuário 360) quando ela vem', () => {
    const all = Array.from({ length: 30 }, (_, i) => cat(i));
    const main = [cat(3), cat(7)];
    expect(pickMainCategories(all, main)).toEqual(main);
  });

  it('sem lista do servidor: apenas as 10 primeiras com empresas, nunca todas', () => {
    const all = [...Array.from({ length: 30 }, (_, i) => cat(i)), cat(99, 0)];
    const picked = pickMainCategories(all, undefined);
    expect(picked).toHaveLength(MOBILE_MAIN_CATEGORIES_MAX);
    expect(MOBILE_MAIN_CATEGORIES_MAX).toBe(10);
    expect(picked.every((c) => (c.business_count ?? 0) > 0)).toBe(true);
  });

  it('sem nenhuma categoria com empresas, ainda limita a lista', () => {
    const all = Array.from({ length: 25 }, (_, i) => cat(i, 0));
    expect(pickMainCategories(all, [])).toHaveLength(10);
  });

  it('o Guia entrega main_categories a partir de home_categories do servidor', async () => {
    const service = createMobileGuideService(async () => new Response(JSON.stringify({
      settings: {},
      categories: Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, slug: `s${i}`, name: `Cat ${i}`, business_count: 2 })),
      home_categories: [
        { id: 'c4', slug: 's4', name: 'Cat 4', icon_name: 'x', business_count: 2 },
        { id: 'c9', slug: 's9', name: 'Cat 9', business_count: 2 },
        { id: '', slug: 'invalida', name: 'Sem id' },
      ],
    }), { status: 200 }), 'https://isolated.test/api/mobile/guide');
    const data = await service.loadHome();
    expect(data.categories).toHaveLength(20);
    expect(data.main_categories.map((c) => c.slug)).toEqual(['s4', 's9']);
  });

  it('sem home_categories (servidor antigo), o Guia limita as principais a 10', async () => {
    const service = createMobileGuideService(async () => new Response(JSON.stringify({
      settings: {},
      categories: Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, slug: `s${i}`, name: `Cat ${i}`, business_count: 2 })),
    }), { status: 200 }), 'https://isolated.test/api/mobile/guide');
    const data = await service.loadHome();
    expect(data.main_categories).toHaveLength(10);
  });
});

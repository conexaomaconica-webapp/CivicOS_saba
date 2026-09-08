import { describe, it, expect } from 'vitest';
import { toPublicBusinessPresentation } from '../src/lib/business/public-business-presentation';

describe('toPublicBusinessPresentation', () => {
  const baseDetailRow: any = {
    business_id: 'biz-123',
    business_slug: 'empresa-modelo',
    business_name: 'Empresa Modelo',
    primary_category_name: 'Serviços',
    description: 'Descrição de teste da empresa.',
    effective_plan_code: 'bronze',
    logo_url: 'https://example.com/logo.jpg',
    is_verified: true,
    is_founder: false,
    is_pedra_fundamental: false,
    is_coluna_honra: false,
    contacts: [
      { type: 'phone', value: '(11) 99999-8888' },
      { type: 'whatsapp', value: '(11) 99999-8888' },
      { type: 'website', value: 'https://modelo.com.br' },
    ],
    locations: [
      {
        street: 'Rua A',
        number: '100',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        is_headquarters: true,
      },
    ],
    media: [
      { url: 'https://example.com/cover.jpg', media_type: 'image', title: 'Capa' },
      { url: 'https://example.com/photo1.jpg', media_type: 'image', title: 'Foto 1' },
      { url: 'https://example.com/photo2.jpg', media_type: 'image', title: 'Foto 2' },
      { url: 'https://example.com/photo3.jpg', media_type: 'image', title: 'Foto 3' },
      { url: 'https://example.com/photo4.jpg', media_type: 'image', title: 'Foto 4' },
    ],
    services: [
      { id: 's1', name: 'Serviço 1', description: 'Desc 1' },
      { id: 's2', name: 'Serviço 2', description: 'Desc 2' },
      { id: 's3', name: 'Serviço 3', description: 'Desc 3' },
    ],
    benefits: [
      { id: 'b1', title: 'Benefício 1', description: 'Desc B1' },
      { id: 'b2', title: 'Benefício 2', description: 'Desc B2' },
    ],
    events: [
      { id: 'e1', title: 'Evento 1', description: 'Desc E1' },
    ],
    posts: [
      { id: 'p1', title: 'Post 1', content: 'Conteúdo P1' },
    ],
    business_hours: [],
    responsible: { name: 'João Silva', community_verified: true },
    rating_average: 5.0,
    rating_count: 10,
  };

  it('should transform Bronze company correctly with safe quota limits and disabled advanced features', () => {
    const result = toPublicBusinessPresentation({
      ...baseDetailRow,
      effective_plan_code: 'bronze',
    });

    expect(result.plan.commercialPlan).toBe('bronze');
    expect(result.plan.template).toBe('bronze');
    expect(result.entitlements.canShowEvents).toBe(false);
    expect(result.entitlements.canShowPosts).toBe(false);
    expect(result.entitlements.canShowBenefits).toBe(false);
    expect(result.entitlements.canShowWebsite).toBe(false);
    expect(result.services.length).toBeLessThanOrEqual(2);
    expect(result.media.gallery.length).toBeLessThanOrEqual(1);
    expect(result.events).toHaveLength(0);
    expect(result.posts).toHaveLength(0);
    expect(result.benefits).toHaveLength(0);
    expect(result.contacts.website).toBeNull();
  });

  it('should transform Prata company with medium quotas and website enabled', () => {
    const result = toPublicBusinessPresentation({
      ...baseDetailRow,
      effective_plan_code: 'prata',
      entitlements: {
        can_show_website: true,
        can_show_social: true,
        services_limit: 5,
        benefits_limit: 1,
        events_limit: 0,
        gallery_photos_limit: 6,
      },
    });

    expect(result.plan.commercialPlan).toBe('prata');
    expect(result.plan.template).toBe('prata');
    expect(result.entitlements.canShowWebsite).toBe(true);
    expect(result.entitlements.canShowBenefits).toBe(true);
    expect(result.entitlements.canShowEvents).toBe(false);
    expect(result.services.length).toBe(3);
    expect(result.benefits.length).toBe(1);
    expect(result.events).toHaveLength(0);
    expect(result.contacts.website).toBe('https://modelo.com.br');
  });

  it('should transform Ouro company with commercialPlan ouro and template ouro', () => {
    const result = toPublicBusinessPresentation({
      ...baseDetailRow,
      effective_plan_code: 'ouro',
      entitlements: {
        can_show_website: true,
        can_show_social: true,
        services_limit: 10,
        benefits_limit: 5,
        events_limit: 5,
        posts_limit: 5,
        gallery_photos_limit: 10,
      },
    });

    expect(result.plan.commercialPlan).toBe('ouro');
    expect(result.plan.template).toBe('ouro');
    expect(result.entitlements.canShowEvents).toBe(true);
    expect(result.entitlements.canShowPosts).toBe(true);
    expect(result.events.length).toBe(1);
    expect(result.posts.length).toBe(1);
    expect(result.recognition.founder).toBe(false);
    expect(result.recognition.pedraFundamental).toBe(false);
  });

  it('should map legacy ouro_founder code to commercialPlan ouro, template ouro, and founder badge', () => {
    const result = toPublicBusinessPresentation({
      ...baseDetailRow,
      effective_plan_code: 'ouro_founder',
      is_founder: true,
      is_pedra_fundamental: false,
      entitlements: {
        can_show_website: true,
        can_show_social: true,
        services_limit: 10,
        benefits_limit: 5,
        events_limit: 5,
        posts_limit: 5,
        gallery_photos_limit: 10,
      },
    });

    expect(result.plan.commercialPlan).toBe('ouro');
    expect(result.plan.template).toBe('ouro');
    expect(result.recognition.founder).toBe(true);
    expect(result.recognition.pedraFundamental).toBe(false); // MUST NOT infer Pedra Fundamental automatically
    expect(result.recognition.colunaDeHonra).toBe(false);
  });

  it('should render Pedra Fundamental ONLY when explicitly set in data regardless of founder or plan', () => {
    const result = toPublicBusinessPresentation({
      ...baseDetailRow,
      effective_plan_code: 'ouro',
      is_founder: false,
      is_pedra_fundamental: true,
    });

    expect(result.plan.commercialPlan).toBe('ouro');
    expect(result.plan.template).toBe('ouro');
    expect(result.recognition.founder).toBe(false);
    expect(result.recognition.pedraFundamental).toBe(true);
  });

  it('should render Coluna de Honra ONLY when explicitly set in data', () => {
    const result = toPublicBusinessPresentation({
      ...baseDetailRow,
      effective_plan_code: 'ouro',
      is_coluna_honra: true,
    });

    expect(result.plan.commercialPlan).toBe('ouro');
    expect(result.plan.template).toBe('ouro');
    expect(result.recognition.colunaDeHonra).toBe(true);
  });
});

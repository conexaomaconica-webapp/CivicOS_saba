import { describe, expect, it } from 'vitest';
import { toPublicBusinessPresentation } from '../src/lib/business/public-business-presentation';
import type { Database } from '../src/types/database.types';

type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number];
type ReviewRow = Database['public']['Functions']['public_business_reviews']['Returns'][number];

const detail = (overrides: Partial<DetailRow> = {}): DetailRow => ({
  tenant_slug: 'conexao-maconica',
  business_slug: 'saba-advocacia',
  business_name: 'Saba Advocacia',
  company_type: 'service',
  description: 'Assessoria jurídica empresarial.',
  logo_url: 'https://cdn.example.com/logo.png',
  primary_category_name: 'Serviços Jurídicos',
  primary_category_slug: 'servicos-juridicos',
  locations: [{ street: 'Av. Getúlio Vargas', number: '1240', city: 'Feira de Santana', state: 'BA', latitude: -12.2, longitude: -38.9, is_headquarters: true }],
  contacts: [{ type: 'phone', value: '557530254242' }, { type: 'email', value: 'publico@example.com' }],
  business_hours: [{ day_of_week: 1, open_time: '08:00', close_time: '18:00', is_closed: false }],
  media: [{ media_type: 'image', url: 'https://cdn.example.com/cover.png', title: 'Escritório' }],
  is_founder: false,
  is_verified: true,
  effective_plan_code: 'bronze',
  responsible: { name: 'Eduardo Saba', business_role: 'owner', community_verified: true },
  rating_average: 4.9,
  rating_count: 128,
  ...overrides,
});

const review: ReviewRow = {
  review_public_id: '00000000-0000-0000-0000-000000000001',
  rating: 5,
  comment: 'Atendimento excelente.',
  published_at: '2026-08-01T10:00:00Z',
  cursor_created_at: '2026-08-01T10:00:00Z',
  cursor_id: '00000000-0000-0000-0000-000000000001',
  business_response: null as unknown as string,
  responded_at: null as unknown as string,
};

describe('public business presentation', () => {
  it('preserva dados públicos completos e autoridade Bronze', () => {
    const result = toPublicBusinessPresentation(detail(), [review]);
    expect(result.authority).toMatchObject({ effectivePlan: 'bronze', isVerified: true, isFounder: false });
    expect(result.media.cover?.url).toContain('cover.png');
    expect(result.owner?.name).toBe('Eduardo Saba');
    expect(result.contacts.email).toBe('publico@example.com');
    expect(result.location).toMatchObject({ city: 'Feira de Santana', latitude: -12.2 });
    expect(result.reviews.items).toHaveLength(1);
  });

  it('omite contato e mídia ausentes sem criar fallbacks demonstrativos', () => {
    const result = toPublicBusinessPresentation(detail({ contacts: [], media: [], logo_url: null as unknown as string }));
    expect(result.identity.logo).toBeNull();
    expect(result.media.cover).toBeNull();
    expect(Object.values(result.contacts).every((value) => value === null)).toBe(true);
  });

  it('aceita empresa sem avaliações publicadas', () => {
    const result = toPublicBusinessPresentation(detail({ rating_average: null as unknown as number, rating_count: 0 }), []);
    expect(result.reviews).toEqual({ average: null, count: 0, items: [] });
  });

  it('falha fechada para plano desconhecido', () => {
    expect(toPublicBusinessPresentation(detail({ effective_plan_code: 'legacy-premium' }), []).authority.effectivePlan).toBeNull();
  });
});

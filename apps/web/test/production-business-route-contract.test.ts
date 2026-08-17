import { describe, expect, it } from 'vitest';
import { toPublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import type { Database } from '@/types/database.types';

type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number];

function createMockDetailRow(overrides: Partial<DetailRow> = {}): DetailRow {
  return {
    business_id: '00000000-0000-0000-0000-000000000202',
    tenant_id: '00000000-0000-0000-0000-000000000010',
    business_slug: 'saba-advocacia-bronze',
    business_name: 'Saba Advocacia',
    description: 'Assessoria jurídica empresarial.',
    logo_url: 'https://example.com/logo.png',
    company_type: 'commercial',
    publication_status: 'published',
    effective_plan_code: 'bronze',
    is_verified: true,
    is_founder: false,
    rating_average: 4.9,
    rating_count: 128,
    primary_category_slug: 'servicos',
    primary_category_name: 'Serviços Jurídicos',
    responsible: {
      name: 'Eduardo Saba',
      business_role: 'Proprietário',
      organization: 'Grande Oriente',
      community_verified: true,
    },
    contacts: [
      { type: 'phone', value: '(75) 3025-4242' },
      { type: 'whatsapp', value: '5575999881122' },
      { type: 'email', value: 'contato@sabaadvocacia.local' },
    ],
    locations: [
      {
        street: 'Av. Getúlio Vargas',
        number: '1240',
        neighborhood: 'Centro',
        city: 'Feira de Santana',
        state: 'BA',
        postal_code: '44001-075',
        is_headquarters: true,
      },
    ],
    media: [
      { url: 'https://example.com/cover.jpg', media_type: 'image', title: 'Capa da empresa' },
    ],
    business_hours: [
      { day_of_week: 1, open_time: '08:00', close_time: '18:00', is_closed: false },
    ],
    ...overrides,
  };
}

describe('Contrato Produtivo da Rota Pública de Empresa (/guia/[slug])', () => {
  it('1 & 2. Mapeia a rota canônica pelo slug e preserva nome da empresa', () => {
    const row = createMockDetailRow({ business_slug: 'saba-advocacia-bronze' });
    const presentation = toPublicBusinessPresentation(row, []);

    expect(presentation.identity.slug).toBe('saba-advocacia-bronze');
    expect(presentation.identity.name).toBe('Saba Advocacia');
  });

  it('3. Plano efetivo Bronze resolve effectivePlan como "bronze"', () => {
    const row = createMockDetailRow({ effective_plan_code: 'bronze' });
    const presentation = toPublicBusinessPresentation(row, []);

    expect(presentation.authority.effectivePlan).toBe('bronze');
  });

  it('4 & 5. Resolvedor distingue Prata e Ouro do Bronze', () => {
    const prataRow = createMockDetailRow({ effective_plan_code: 'prata' });
    const ouroRow = createMockDetailRow({ effective_plan_code: 'ouro' });

    expect(toPublicBusinessPresentation(prataRow, []).authority.effectivePlan).toBe('prata');
    expect(toPublicBusinessPresentation(ouroRow, []).authority.effectivePlan).toBe('ouro');
  });

  it('6 & 8. Empresa Fundadora Bronze preserva layout Bronze e habilita selo Fundadora independente', () => {
    const row = createMockDetailRow({ effective_plan_code: 'bronze', is_founder: true });
    const presentation = toPublicBusinessPresentation(row, []);

    expect(presentation.authority.effectivePlan).toBe('bronze');
    expect(presentation.authority.isFounder).toBe(true);
  });

  it('7. Empresa Verificada habilita selo de verificação de forma independente', () => {
    const verifiedRow = createMockDetailRow({ is_verified: true });
    const unverifiedRow = createMockDetailRow({ is_verified: false });

    expect(toPublicBusinessPresentation(verifiedRow, []).authority.isVerified).toBe(true);
    expect(toPublicBusinessPresentation(unverifiedRow, []).authority.isVerified).toBe(false);
  });

  it('9. Assinatura inativa ou inválida resulta em effectivePlan null (fail closed)', () => {
    const row = createMockDetailRow({ effective_plan_code: null });
    const presentation = toPublicBusinessPresentation(row, []);

    expect(presentation.authority.effectivePlan).toBeNull();
  });

  it('12. Omitir dados ausentes em vez de inventar mídias ou contatos', () => {
    const sparseRow = createMockDetailRow({
      description: null,
      locations: [],
      contacts: [],
      media: [],
      business_hours: [],
      rating_average: null,
      rating_count: 0,
    });
    const presentation = toPublicBusinessPresentation(sparseRow, []);

    expect(presentation.identity.description).toBeNull();
    expect(presentation.location).toBeNull();
    expect(presentation.contacts.phone).toBeNull();
    expect(presentation.media.cover).toBeNull();
    expect(presentation.media.gallery).toHaveLength(0);
    expect(presentation.hours).toHaveLength(0);
    expect(presentation.reviews.average).toBeNull();
  });
});

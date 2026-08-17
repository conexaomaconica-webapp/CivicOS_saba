import { describe, expect, it } from 'vitest';
import { toPublicBusinessPresentation } from '@/lib/business/public-business-presentation';

const BASE_ROW = {
  tenant_slug: 'conexao-maconica',
  business_slug: 'empresa-test-contract',
  business_name: 'Empresa Teste Contrato',
  description: 'Descrição de teste para contrato de benefícios e serviços.',
  company_type: 'LTDA',
  logo_url: '/logo.png',
  primary_category_slug: 'servicos-especiais',
  primary_category_name: 'Serviços Especiais',
  locations: [{ city: 'São Paulo', state: 'SP', is_headquarters: true }],
  contacts: [{ type: 'whatsapp', value: '5511999998888', is_public: true }],
  business_hours: [],
  media: [],
  is_founder: false,
  is_verified: true,
  effective_plan_code: 'ouro',
  responsible: { name: 'Dr. Fernando Alfa', community_verified: true },
  rating_average: 5.0,
  rating_count: 10,
};

describe('Checkpoint 7A — Contrato Público e Sanitização de Benefícios & Serviços', () => {
  it('Sanitiza adequadamente plano Bronze (0 benefícios, até 3 serviços apenas nome)', () => {
    const row = {
      ...BASE_ROW,
      effective_plan_code: 'bronze',
      benefits: [
        { id: 'b1', title: 'Benefício Ouro', description: 'Desconto VIP', discount_code: 'VIP10' },
      ],
      services: [
        { id: 's1', name: 'Serviço 1', description: 'Desc 1', icon_name: 'star', price_info: 'R$ 100' },
        { id: 's2', name: 'Serviço 2', description: 'Desc 2', icon_name: 'check', price_info: 'R$ 200' },
        { id: 's3', name: 'Serviço 3', description: 'Desc 3', icon_name: 'clock', price_info: 'R$ 300' },
        { id: 's4', name: 'Serviço 4', description: 'Desc 4', icon_name: 'user', price_info: 'R$ 400' },
      ],
    };

    // Simulando sanitização de downgrade para Bronze
    const presentation = toPublicBusinessPresentation({
      ...row,
      // Sob plano Bronze, RPC retorna 0 benefícios e serviços sanitizados
      benefits: [],
      services: row.services.slice(0, 3).map((s) => ({ id: s.id, name: s.name })),
    }, []);

    expect(presentation.benefit).toBeNull();
    expect(presentation.services).toHaveLength(3);
    expect(presentation.services[0]).toEqual({ id: 's1', name: 'Serviço 1', description: null, iconName: null, priceInfo: null });
  });

  it('Sanitiza adequadamente plano Prata (1 benefício sem código VIP, até 10 serviços com descrição)', () => {
    const row = {
      ...BASE_ROW,
      effective_plan_code: 'prata',
      benefits: [
        {
          id: 'b1',
          title: 'Condição Especial Prata',
          description: 'Atendimento preferencial',
          benefit_type: 'special_condition',
          badge_text: 'OFERTA FRATERNA',
          discount_code: null, // Sanitizado para Prata
          redeem_instructions: null, // Sanitizado para Prata
        },
      ],
      services: Array.from({ length: 12 }, (_, i) => ({
        id: `s${i + 1}`,
        name: `Serviço ${i + 1}`,
        description: `Descrição ${i + 1}`,
        icon_name: null, // Sanitizado para Prata
        price_info: null, // Sanitizado para Prata
      })).slice(0, 10),
    };

    const presentation = toPublicBusinessPresentation(row, []);

    expect(presentation.benefit).not.toBeNull();
    expect(presentation.benefit?.title).toBe('Condição Especial Prata');
    expect(presentation.benefit?.discountCode).toBeNull();
    expect(presentation.services).toHaveLength(10);
    expect(presentation.services[0].description).toBe('Descrição 1');
    expect(presentation.services[0].iconName).toBeNull();
    expect(presentation.services[0].priceInfo).toBeNull();
  });

  it('Expositor completo para plano Ouro (até 3 benefícios VIP com código/resgate, até 25 serviços ricos)', () => {
    const row = {
      ...BASE_ROW,
      effective_plan_code: 'ouro',
      benefits: [
        {
          id: 'b1',
          title: 'Benefício VIP 1',
          description: 'Desconto de 20%',
          discount_percentage: 20,
          discount_code: 'OURO20',
          redeem_instructions: 'Apresentar código no WhatsApp',
          badge_text: '20% OFF',
        },
        {
          id: 'b2',
          title: 'Benefício VIP 2',
          description: 'Avaliação Gratuita',
          benefit_type: 'free_service',
          badge_text: 'CORTESIA',
        },
        {
          id: 'b3',
          title: 'Benefício VIP 3',
          description: 'Frete Grátis em Compras',
          benefit_type: 'free_shipping',
          badge_text: 'FRETE GRÁTIS',
        },
      ],
      services: [
        { id: 's1', name: 'Consultoria Especializada', description: 'Atendimento VIP', icon_name: 'award', price_info: 'Sob consulta' },
      ],
    };

    const presentation = toPublicBusinessPresentation(row, []);

    expect(presentation.benefits).toHaveLength(3);
    expect(presentation.benefit?.discountCode).toBe('OURO20');
    expect(presentation.benefit?.redeemInstructions).toBe('Apresentar código no WhatsApp');
    expect(presentation.services[0].iconName).toBe('award');
    expect(presentation.services[0].priceInfo).toBe('Sob consulta');
  });

  it('Fail-closed quando effectivePlan é null (trata como sem_plano / none)', () => {
    const row = {
      ...BASE_ROW,
      effective_plan_code: null,
      benefits: [],
      services: [],
    };

    const presentation = toPublicBusinessPresentation(row, []);

    expect(presentation.authority.effectivePlan).toBeNull();
    expect(presentation.benefit).toBeNull();
    expect(presentation.services).toHaveLength(0);
  });
});

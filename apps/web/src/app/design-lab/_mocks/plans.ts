import { MockPlan } from '../_types/design-lab';

export const MOCK_PLANS: MockPlan[] = [
  {
    id: 'plan_essencial',
    name: 'Plano Essencial',
    code: 'ESSENTIAL_ANNUAL',
    priceAnnual: 588,
    priceMonthlyEquivalent: 49,
    features: [
      'Perfil público completo no Guia Comercial',
      'Até 3 categorias de busca',
      'Galeria com até 5 fotos',
      'Link direto para WhatsApp e Redes',
      'Selo de Regularidade Fraterna (pós-análise)'
    ]
  },
  {
    id: 'plan_profissional',
    name: 'Plano Profissional Destaque',
    code: 'PROFESSIONAL_ANNUAL',
    priceAnnual: 1188,
    priceMonthlyEquivalent: 99,
    features: [
      'Tudo do Plano Essencial',
      'Posicionamento prioritário na Busca e Categorias',
      'Destaque com selo estendido no Mapa Interativo',
      'Galeria ilimitada de fotos e vídeo de apresentação',
      'Relatórios mensais de visualizações e cliques',
      'Módulo de Cupons de Desconto para Membros'
    ],
    recommended: true
  },
  {
    id: 'plan_corporativo',
    name: 'Plano Patrocinador Fundador',
    code: 'SPONSOR_ANNUAL',
    priceAnnual: 2388,
    priceMonthlyEquivalent: 199,
    features: [
      'Tudo do Plano Profissional',
      'Banner de Destaque na Home da Comunidade',
      'Publicação de Eventos e Artigos Institucionais',
      'Qualificação histórica como Anunciante Fundador',
      'Gerente de Conta Dedicado'
    ]
  }
];

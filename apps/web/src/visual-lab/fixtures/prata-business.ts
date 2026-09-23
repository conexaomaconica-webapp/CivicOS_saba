import type { PublicBusinessPresentation, PublicMediaAsset } from '@/lib/business/public-business-presentation';

function img(url: string, alt: string): PublicMediaAsset {
  return {
    url,
    alt,
    type: 'image',
  };
}

/** Fixture oficial do Plano Compasso (Prata) para Visual Lab e Simulador de Reconhecimentos */
export const prataBusinessFixture: PublicBusinessPresentation = {
  plan: {
    commercialPlan: 'prata',
    template: 'prata',
    sectionOrder: ['about', 'services', 'benefits', 'gallery'],
  },
  entitlements: {
    maxPhotos: 3,
    maxServices: 5,
    maxEvents: 0,
    maxPosts: 0,
    maxBenefits: 1,
    maxVideos: 0,
    canShowBenefits: true,
    canShowEvents: false,
    canShowPosts: false,
    canShowWebsite: true,
    canShowSocialLinks: true,
  },
  recognition: {
    verified: true,
    founder: false,
    pedraFundamental: true,
    colunaDeHonra: false,
  },
  identity: {
    slug: 'auto-centro-express-compasso',
    name: 'Auto Centro Express',
    category: 'Manutenção Automotiva',
    description: 'Oficina multimarcas especializada em alinhamento 3D, balanceamento computadorizado, suspensão, injeção eletrônica e freios.',
    logo: img(
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=300&auto=format&fit=crop&q=80',
      'Logotipo Auto Centro Express'
    ),
  },
  authority: {
    effectivePlan: 'prata',
    isVerified: true,
    isFounder: false,
    communityVerified: true,
  },
  media: {
    video: null,
    cover: img(
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80',
      'Oficina Mecânica Auto Centro'
    ),
    gallery: [
      img('https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&auto=format&fit=crop&q=80', 'Alinhamento 3D de Precisão'),
      img('https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=80', 'Diagnóstico Eletrônico Avançado'),
      img('https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80', 'Revisão Preventiva de Freios'),
    ],
  },
  owner: {
    name: 'Carlos Alberto Santos',
    businessRole: 'Sócio-Gerente',
    organization: 'A.R.L.S. Fraternidade Feirense nº 12',
    communityLabel: 'Ir.·.',
    avatar: img(
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
      'Foto de Carlos Alberto Santos'
    ),
  },
  contacts: {
    phone: '(75) 3224-8899',
    whatsapp: '5575988776655',
    email: 'atendimento@autocentroexpress.com.br',
    instagram: '@autocentroexpress',
    facebook: 'autocentroexpress',
    website: 'https://autocentroexpress.com.br',
  },
  location: {
    address: 'Av. Maria Quitéria, 890 — Brasília, Feira de Santana, BA, 44002-000',
    city: 'Feira de Santana',
    state: 'BA',
    latitude: -12.258,
    longitude: -38.955,
    mapImage: null,
  },
  services: [
    { id: 's1', name: 'Alinhamento 3D e Balanceamento', description: 'Regulagem computadorizada da geometria da suspensão.', priceInfo: 'R$ 120,00' },
    { id: 's2', name: 'Revisão Sistemática de Injeção', description: 'Diagnóstico via scanner com limpeza de bicos.', priceInfo: 'R$ 180,00' },
    { id: 's3', name: 'Troca de Óleo & Filtros', description: 'Lubrificantes sintéticos de alto desempenho.', priceInfo: 'A partir de R$ 150,00' },
    { id: 's4', name: 'Manutenção de Freios & Abs', description: 'Substituição de pastilhas e fluídos de freio.', priceInfo: 'Sob Consulta' },
  ],
  benefits: [
    {
      id: 'b1',
      title: '10% de Desconto em Serviços de Suspensão',
      description: 'Desconto direto na mão de obra para membros cadastrados no Guia.',
      benefitType: 'Desconto em Serviços',
      discountPercentage: 10,
      badgeText: 'Parceria Comercial',
      validUntil: '2026-12-31',
    },
  ],
  events: [],
  posts: [],
  hours: [
    { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 6, openTime: '08:00', closeTime: '12:00', isClosed: false },
    { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
  ],
  benefit: {
    id: 'b1',
    title: '10% de Desconto em Serviços de Suspensão',
    description: 'Desconto direto na mão de obra para membros cadastrados no Guia.',
    benefitType: 'Desconto em Serviços',
    discountPercentage: 10,
    badgeText: 'Parceria Comercial',
    validUntil: '2026-12-31',
  },
  metrics: {
    views: 650,
    openingStatus: 'Aberto agora',
  },
  reviews: {
    average: 5.0,
    count: 1,
    items: [
      {
        id: 'r1',
        rating: 5,
        comment: 'Serviço rápido e de confiança. Preço justo e ótimo atendimento do Irmão Carlos.',
        publishedAt: '2026-08-10T11:20:00Z',
        authorName: 'Ir.·. Fernando Souza',
      },
    ],
  },
};

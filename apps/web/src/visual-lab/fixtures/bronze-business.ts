import type { PublicBusinessPresentation, PublicMediaAsset } from '@/lib/business/public-business-presentation';

function img(url: string, alt: string): PublicMediaAsset {
  return {
    url,
    alt,
    type: 'image',
  };
}

/** Fixture oficial do Plano Esquadro (Bronze) para Visual Lab e Simulador de Reconhecimentos */
export const bronzeBusinessFixture: PublicBusinessPresentation = {
  plan: {
    commercialPlan: 'bronze',
    template: 'bronze',
    sectionOrder: ['about', 'services'],
  },
  entitlements: {
    maxPhotos: 1,
    maxServices: 2,
    maxEvents: 0,
    maxPosts: 0,
    maxBenefits: 0,
    maxVideos: 0,
    canShowBenefits: false,
    canShowEvents: false,
    canShowPosts: false,
    canShowWebsite: false,
    canShowSocialLinks: false,
  },
  recognition: {
    verified: true,
    founder: false,
    pedraFundamental: true,
    colunaDeHonra: false,
  },
  identity: {
    slug: 'saba-advocacia-esquadro',
    name: 'Saba Advocacia & Consultoria',
    category: 'Serviços Jurídicos',
    description: 'Assessoria jurídica empresarial, elaboração de contratos comerciais e consultoria jurídica preventiva com atendimento exclusivo.',
    logo: img(
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=300&auto=format&fit=crop&q=80',
      'Logotipo Saba Advocacia'
    ),
  },
  authority: {
    effectivePlan: 'bronze',
    isVerified: true,
    isFounder: false,
    communityVerified: true,
  },
  media: {
    video: null,
    cover: img(
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
      'Escritório de Advocacia Saba'
    ),
    gallery: [],
  },
  owner: {
    name: 'Eduardo Saba',
    businessRole: 'Advogado & Consultor',
    organization: 'A.R.L.S. Harmonia e Sabedoria nº 42',
    communityLabel: 'Ir.·.',
    avatar: img(
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
      'Foto de Eduardo Saba'
    ),
  },
  contacts: {
    phone: '(75) 3025-4242',
    whatsapp: '5575999881122',
    email: 'contato@sabaadvocacia.com.br',
    instagram: null,
    facebook: null,
    website: null,
  },
  location: {
    address: 'Av. Getúlio Vargas, 1240 — Centro, Feira de Santana, BA, 44001-075',
    city: 'Feira de Santana',
    state: 'BA',
    latitude: -12.2664,
    longitude: -38.9663,
    mapImage: null,
  },
  services: [
    { id: 's1', name: 'Consultoria Jurídica Empresarial', description: 'Elaboração e revisão de contratos societários e comerciais.', priceInfo: 'Sob Consulta' },
    { id: 's2', name: 'Assessoria em Negociações', description: 'Intermediação e mediação contratual de negócios corporativos.', priceInfo: 'Sob Consulta' },
  ],
  benefits: [],
  events: [],
  posts: [],
  hours: [
    { dayOfWeek: 1, openTime: '08:30', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 2, openTime: '08:30', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 3, openTime: '08:30', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 4, openTime: '08:30', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 5, openTime: '08:30', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 6, openTime: null, closeTime: null, isClosed: true },
    { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
  ],
  benefit: null,
  metrics: {
    views: 310,
    openingStatus: 'Aberto agora',
  },
  reviews: {
    average: 5.0,
    count: 1,
    items: [
      {
        id: 'r1',
        rating: 5,
        comment: 'Atendimento jurídico de altíssimo nível, profissionalismo impecável.',
        publishedAt: '2026-07-28T16:00:00Z',
        authorName: 'Dr. Paulo Henrique',
      },
    ],
  },
};

export const bronzeViewerFixture = {
  id: 'usr_bronze_viewer',
  name: 'Eduardo Saba',
  email: 'eduardo@sabaadvocacia.com.br',
  role: 'member',
};

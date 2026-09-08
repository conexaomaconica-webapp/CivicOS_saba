import type { PublicBusinessPresentation, PublicMediaAsset } from '@/lib/business/public-business-presentation';

const referenceUrl = '/visual-lab/assets/bronze-reference';

function crop(alt: string, x: number, y: number, width: number, height: number): PublicMediaAsset {
  return {
    url: referenceUrl,
    alt,
    type: 'image',
    crop: { sourceWidth: 1536, sourceHeight: 1024, x, y, width, height },
  };
}

/** Fixture exclusiva da rota Visual Lab, nunca usada pelo fluxo produtivo. */
export const bronzeBusinessFixture: PublicBusinessPresentation = {
  plan: {
    commercialPlan: 'bronze',
    template: 'bronze',
  },
  entitlements: {
    maxPhotos: 1,
    maxServices: 2,
    maxEvents: 0,
    maxPosts: 0,
    maxBenefits: 0,
    canShowBenefits: false,
    canShowEvents: false,
    canShowPosts: false,
    canShowWebsite: false,
    canShowSocialLinks: false,
  },
  recognition: {
    verified: true,
    founder: false,
    pedraFundamental: false,
    colunaDeHonra: false,
  },
  identity: {
    slug: 'saba-advocacia-visual-lab',
    name: 'Saba Advocacia',
    category: 'Serviços Jurídicos',
    description: 'Assessoria jurídica empresarial, contratos e consultoria com atendimento próximo e personalizado.',
    logo: crop('Logotipo de homologação da Saba Advocacia', 575, 128, 127, 126),
  },
  authority: {
    effectivePlan: 'bronze',
    isVerified: true,
    isFounder: false,
    communityVerified: true,
  },
  media: {
    cover: crop('Escritório de advocacia usado na homologação visual Bronze', 23, 102, 521, 280),
    gallery: [],
  },
  owner: {
    name: 'Eduardo Saba',
    businessRole: 'Proprietário',
    organization: 'A.R.L.S. Harmonia e Sabedoria nº 42',
    communityLabel: 'Irmão',
    avatar: {
      url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
      alt: 'Foto de Eduardo Saba',
      type: 'image',
    },
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
    mapImage: crop('Mapa de homologação em Feira de Santana', 1140, 680, 350, 240),
  },
  hours: [
    { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isClosed: false },
  ],
  services: [
    { id: 's1', name: 'Consultoria Jurídica Empresarial', description: 'Elaboração e análise de contratos empresariais com foco em prevenção de riscos.', priceInfo: 'Sob Consulta' },
    { id: 's2', name: 'Direito Societário & M&A', description: 'Estruturação de acordos de sócios e apoio em operações de reorganização.', priceInfo: 'Sob Consulta' },
  ],
  benefit: null,
  benefits: [],
  events: [],
  posts: [],
  reviews: {
    average: 4.9,
    count: 128,
    items: [
      {
        id: 'bronze-review-1',
        rating: 5,
        authorName: 'Marcos Almeida',
        authorAvatar: crop('Marcos Almeida', 282, 719, 52, 52),
        publishedAt: '2026-07-31T12:00:00Z',
        comment: 'Atendimento impecável e muita competência. Esclareceu todas as minhas dúvidas e me orientou da melhor forma.',
      },
      {
        id: 'bronze-review-2',
        rating: 5,
        authorName: 'Rafael Cardoso',
        authorAvatar: crop('Rafael Cardoso', 690, 719, 52, 52),
        publishedAt: '2026-07-14T12:00:00Z',
        comment: 'Profissional ético, atencioso e muito eficiente. Recomendo a todos os irmãos que precisam de suporte jurídico de confiança.',
      },
    ],
  },
  metrics: { views: 2847, openingStatus: 'Aberto agora' },
};

export const bronzeViewerFixture = {
  name: 'Eduardo Saba',
  location: 'Feira de Santana, BA',
  avatar: crop('Eduardo Saba', 1257, 16, 46, 46),
};

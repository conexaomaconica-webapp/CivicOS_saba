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
    organization: null,
    communityLabel: 'Irmão',
    avatar: crop('Responsável de homologação visual', 1150, 245, 110, 111),
  },
  contacts: {
    phone: '(75) 3025-4242',
    whatsapp: '5575999881122',
    email: 'contato@sabaadvocacia.com.br',
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    website: 'https://sabaadvocacia.com.br',
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
  services: [],
  benefit: {
    title: 'Benefício especial',
    description: '10% de desconto na primeira consultoria para membros da comunidade.',
  },
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

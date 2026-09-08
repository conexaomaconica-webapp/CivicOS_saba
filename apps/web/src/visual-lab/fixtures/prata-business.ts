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

/** Fixture exclusiva da rota Visual Lab Prata */
export const prataBusinessFixture: PublicBusinessPresentation = {
  plan: {
    commercialPlan: 'prata',
    template: 'prata',
  },
  entitlements: {
    maxPhotos: 3,
    maxServices: 5,
    maxEvents: 0,
    maxPosts: 0,
    maxBenefits: 1,
    canShowBenefits: true,
    canShowEvents: false,
    canShowPosts: false,
    canShowWebsite: true,
    canShowSocialLinks: true,
  },
  recognition: {
    verified: true,
    founder: false,
    pedraFundamental: false,
    colunaDeHonra: false,
  },
  identity: {
    slug: 'auto-centro-express-prata',
    name: 'Auto Centro Express',
    category: 'Manutenção Automotiva',
    description: 'Oficina especializada em mecânica geral, alinhamento 3D, balanceamento, injeção eletrônica e revisão preventiva.',
    logo: crop('Logotipo do Auto Centro Express', 575, 128, 127, 126),
  },
  authority: {
    effectivePlan: 'prata',
    isVerified: true,
    isFounder: false,
    communityVerified: true,
  },
  media: {
    cover: crop('Oficina mecânica ampla com elevadores automotivos', 23, 102, 521, 280),
    gallery: [
      crop('Área de diagnóstico computadorizado', 282, 719, 52, 52),
      crop('Recepção de atendimento ao cliente', 690, 719, 52, 52),
    ],
  },
  owner: {
    name: 'Marcos Vasconcelos',
    businessRole: 'Diretor de Operações',
    organization: 'A.R.L.S. União e Esperança nº 108',
    communityLabel: 'Irmão',
    avatar: {
      url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
      alt: 'Foto de Marcos Vasconcelos',
      type: 'image',
    },
  },
  contacts: {
    phone: '(11) 3456-7890',
    whatsapp: '5511987654321',
    email: 'atendimento@autocentroexpress.com.br',
    instagram: 'autocentroexpress',
    facebook: 'autocentroexpress',
    website: 'autocentroexpress.com.br',
  },
  location: {
    address: 'Av. Paulista, 1500 — Bela Vista, São Paulo, SP, 01310-200',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.5615,
    longitude: -46.6559,
    mapImage: crop('Mapa em São Paulo', 1140, 680, 350, 240),
  },
  hours: [
    { dayOfWeek: 1, openTime: '07:30', closeTime: '18:30', isClosed: false },
    { dayOfWeek: 2, openTime: '07:30', closeTime: '18:30', isClosed: false },
    { dayOfWeek: 3, openTime: '07:30', closeTime: '18:30', isClosed: false },
    { dayOfWeek: 4, openTime: '07:30', closeTime: '18:30', isClosed: false },
    { dayOfWeek: 5, openTime: '07:30', closeTime: '18:30', isClosed: false },
    { dayOfWeek: 6, openTime: '08:00', closeTime: '13:00', isClosed: false },
  ],
  services: [
    { id: 'ps1', name: 'Alinhamento 3D & Balanceamento', description: 'Regulagem computadorizada com altíssima precisão.', priceInfo: 'R$ 180,00' },
    { id: 'ps2', name: 'Revisão Preventiva de Freios', description: 'Troca de pastilhas, discos e sangria do fluido de freio.', priceInfo: 'A partir de R$ 250' },
    { id: 'ps3', name: 'Diagnóstico de Injeção Eletrônica', description: 'Análise completa via scanner automotivo com emissão de laudo.', priceInfo: 'R$ 150,00' },
  ],
  benefit: {
    title: 'Desconto de 15% em Peças e Mão de Obra',
    description: 'Apresente sua comprovação de vínculo e obtenha 15% de desconto em todas as revisões periódicas.',
    benefitType: 'Desconto Exclusivo',
    discountPercentage: 15,
    discountCode: 'FRATERNO15',
  },
  benefits: [
    {
      id: 'pb1',
      title: 'Desconto de 15% em Peças e Mão de Obra',
      description: 'Apresente sua comprovação de vínculo e obtenha 15% de desconto em todas as revisões periódicas.',
      benefitType: 'Desconto Exclusivo',
      discountPercentage: 15,
      discountCode: 'FRATERNO15',
    },
  ],
  events: [],
  posts: [],
  reviews: {
    average: 4.8,
    count: 86,
    items: [
      {
        id: 'prata-review-1',
        rating: 5,
        authorName: 'Fernando Rocha',
        authorAvatar: crop('Fernando Rocha', 282, 719, 52, 52),
        publishedAt: '2026-08-01T10:00:00Z',
        comment: 'Serviço rápido e transparente. Recomendo muito o trabalho do irmão Carlos!',
      },
      {
        id: 'prata-review-2',
        rating: 5,
        authorName: 'Gustavo Mendonça',
        authorAvatar: crop('Gustavo Mendonça', 690, 719, 52, 52),
        publishedAt: '2026-07-20T14:30:00Z',
        comment: 'Preço justo e atendimento diferenciado. A oficina é extremamente limpa e organizada.',
      },
    ],
  },
  metrics: { views: 4120, openingStatus: 'Aberto agora' },
};

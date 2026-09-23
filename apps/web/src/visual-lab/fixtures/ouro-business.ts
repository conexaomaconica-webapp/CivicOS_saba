import type { PublicBusinessPresentation, PublicMediaAsset } from '@/lib/business/public-business-presentation';

function img(url: string, alt: string): PublicMediaAsset {
  return {
    url,
    alt,
    type: 'image',
  };
}

/** Fixture oficial do Plano Acácia (Ouro) para Visual Lab e Simulador de Reconhecimentos */
export const ouroBusinessFixture: PublicBusinessPresentation = {
  plan: {
    commercialPlan: 'ouro',
    template: 'ouro',
    sectionOrder: ['about', 'services', 'benefits', 'video', 'gallery', 'events', 'posts'],
  },
  entitlements: {
    maxPhotos: 10,
    maxServices: 10,
    maxEvents: 5,
    maxPosts: 5,
    maxBenefits: 5,
    maxVideos: 1,
    canShowBenefits: true,
    canShowEvents: true,
    canShowPosts: true,
    canShowWebsite: true,
    canShowSocialLinks: true,
  },
  recognition: {
    verified: true,
    founder: true,
    pedraFundamental: true,
    colunaDeHonra: false,
    goldPlanBadge: true,
  },
  identity: {
    slug: 'comandos-seguranca-acacia',
    name: 'Comandos Segurança & Terceirização',
    category: 'Segurança e Terceirização',
    description: 'Empresa especializada em segurança patrimonial, monitoramento eletrônico 24h, portaria remota e terceirização de serviços com mais de 25 anos de credibilidade.',
    logo: img(
      'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=300&auto=format&fit=crop&q=80',
      'Logotipo Comandos Segurança'
    ),
  },
  authority: {
    effectivePlan: 'ouro',
    isVerified: true,
    isFounder: true,
    communityVerified: true,
  },
  media: {
    video: {
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      title: 'Apresentação Institucional Comandos Segurança',
      type: 'video',
    } as any,
    cover: img(
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
      'Fachada Sede Comandos Segurança'
    ),
    gallery: [
      img('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80', 'Central de Monitoramento 24h'),
      img('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&auto=format&fit=crop&q=80', 'Equipe de Atendimento e Operações'),
      img('https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80', 'Salão de Treinamento e Segurança'),
      img('https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80', 'Frota de Ronda Técnica'),
    ],
  },
  owner: {
    name: 'Douglas Ramos',
    businessRole: 'Diretor Executivo',
    organization: 'A.R.L.S. 16 de Junho nº 42',
    communityLabel: 'Ir.·.',
    avatar: img(
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      'Foto de Douglas Ramos'
    ),
  },
  contacts: {
    phone: '(75) 3622-1010',
    whatsapp: '5575999881010',
    email: 'contato@comandosseguranca.com.br',
    instagram: '@comandosseguranca',
    facebook: 'comandosseguranca',
    website: 'https://comandosseguranca.com.br',
  },
  location: {
    address: 'Av. Getúlio Vargas, 1450 — Centro, Feira de Santana, BA, 44001-075',
    city: 'Feira de Santana',
    state: 'BA',
    latitude: -12.2664,
    longitude: -38.9663,
    mapImage: null,
  },
  services: [
    { id: 's1', name: 'Segurança Patrimonial Armada', description: 'Vigilância patrimonial treinada com ronda física e eletrônica.', priceInfo: 'Sob Consulta' },
    { id: 's2', name: 'Central de Monitoramento 24h', description: 'Monitoramento contínuo com acionamento de apoio tático imediato.', priceInfo: 'A partir de R$ 199/mês' },
    { id: 's3', name: 'Portaria Remota Inteligente', description: 'Controle de acesso por biometria, leitura facial e tag veicular.', priceInfo: 'Sob Consulta' },
    { id: 's4', name: 'Terceirização de Limpeza & Recepção', description: 'Equipes qualificadas para condomínios e empresas.', priceInfo: 'Sob Consulta' },
  ],
  benefits: [
    {
      id: 'b1',
      title: '15% de Desconto em Monitoramento 24h',
      description: 'Condição fraterna exclusiva para membros da rede e Irmãos da Ordem.',
      benefitType: 'Desconto Exclusivo',
      discountPercentage: 15,
      badgeText: 'Oferta Fraterna',
      validUntil: '2026-12-31',
    },
    {
      id: 'b2',
      title: 'Vistoria Técnica Gratuita de Segurança',
      description: 'Auditoria de vulnerabilidades físicas e eletrônicas sem custo inicial.',
      benefitType: 'Gratuidade Comercial',
      discountPercentage: 100,
      badgeText: 'Cortesia',
      validUntil: '2026-12-31',
    },
  ],
  events: [
    {
      id: 'e1',
      title: 'Seminário de Segurança Eletrônica Comercial',
      description: 'Palestra presencial sobre prevenção de riscos e inteligência patrimonial.',
      startDate: '2026-10-15T19:00:00Z',
      endDate: '2026-10-15T21:30:00Z',
      location: 'Auditório Comandos — Feira de Santana/BA',
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
      externalUrl: 'https://comandosseguranca.com.br/eventos',
    },
  ],
  posts: [
    {
      id: 'p1',
      title: 'Como Proteger Seu Estabelecimento em Períodos Festivos',
      summary: 'Dicas práticas de integração entre alarmes, inteligência visual e rondas técnicas.',
      content: 'A segurança preventiva é o pilar fundamental para evitar sinistros comerciais...',
      publishedAt: '2026-09-01T10:00:00Z',
      imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    },
  ],
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
    title: '15% de Desconto em Monitoramento 24h',
    description: 'Condição fraterna exclusiva para membros da rede e Irmãos da Ordem.',
    benefitType: 'Desconto Exclusivo',
    discountPercentage: 15,
    badgeText: 'Oferta Fraterna',
    validUntil: '2026-12-31',
  },
  metrics: {
    views: 1240,
    openingStatus: 'Aberto agora',
  },
  reviews: {
    average: 5.0,
    count: 2,
    items: [
      {
        id: 'r1',
        rating: 5,
        comment: 'Excelência em atendimento e segurança. A equipe é muito prestativa e a central 24h funciona com precisão.',
        publishedAt: '2026-08-20T14:30:00Z',
        authorName: 'Ir.·. Marcos Aurélio',
      },
      {
        id: 'r2',
        rating: 5,
        comment: 'Serviço de alta qualidade e compromisso fraterno. Recomendamos com total confiança.',
        publishedAt: '2026-08-15T09:15:00Z',
        authorName: 'Dr. Roberto Mendes',
      },
    ],
  },
};

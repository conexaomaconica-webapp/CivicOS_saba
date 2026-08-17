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

/** Fixture exclusiva da rota Visual Lab Empresa Fundadora (Ouro + Selo Fundador) */
export const fundadorBusinessFixture: PublicBusinessPresentation = {
  identity: {
    slug: 'grupo-construtor-alfa-fundador',
    name: 'Grupo Construtor Alfa',
    category: 'Imóveis e Construção',
    description: 'Engenharia, loteamentos residenciais e empreendimentos imobiliários de alto padrão. Empresa pilar da comunidade.',
    logo: crop('Logotipo do Grupo Construtor Alfa', 575, 128, 127, 126),
  },
  authority: {
    effectivePlan: 'ouro',
    isVerified: true,
    isFounder: true,
    communityVerified: true,
  },
  media: {
    cover: crop('Edifício corporativo de alto padrão do Grupo Alfa', 23, 102, 521, 280),
    gallery: [
      crop('Maquete de empreendimento residencial', 282, 719, 52, 52),
      crop('Sala de conferências e projetos', 690, 719, 52, 52),
    ],
  },
  owner: {
    name: 'Eng. Marcelo Alfa',
    businessRole: 'Presidente Executivo',
    organization: 'Grande Oriente Estadual',
    communityLabel: 'Irmão',
    avatar: crop('Foto de Marcelo Alfa', 1150, 245, 110, 111),
  },
  contacts: {
    phone: '(11) 4004-9000',
    whatsapp: '5511999990000',
    email: 'contato@grupoalfa.com.br',
    instagram: 'https://instagram.com/grupoalfa',
    facebook: 'https://facebook.com/grupoalfa',
    website: 'https://grupoalfa.com.br',
  },
  location: {
    address: 'Av. Brigadeiro Faria Lima, 3400 — Itaim Bibi, São Paulo, SP, 04538-132',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.5855,
    longitude: -46.6805,
    mapImage: crop('Mapa Faria Lima', 1140, 680, 350, 240),
  },
  hours: [
    { dayOfWeek: 1, openTime: '08:00', closeTime: '19:00', isClosed: false },
    { dayOfWeek: 2, openTime: '08:00', closeTime: '19:00', isClosed: false },
    { dayOfWeek: 3, openTime: '08:00', closeTime: '19:00', isClosed: false },
    { dayOfWeek: 4, openTime: '08:00', closeTime: '19:00', isClosed: false },
    { dayOfWeek: 5, openTime: '08:00', closeTime: '19:00', isClosed: false },
  ],
  services: [
    {
      name: 'Incorporação Imobiliária de Alto Padrão',
      description: 'Projetos residenciais e comerciais sustentáveis com certificação ambiental.',
      iconName: 'building',
      priceInfo: 'Sob consulta',
    },
    {
      name: 'Gestão de Obras Industriais & Chave na Mão',
      description: 'Consultoria completa, gerenciamento de suprimentos e execução pericial.',
      iconName: 'shield',
      priceInfo: 'Proposta exclusiva',
    },
    {
      name: 'Avaliação & Laudo Pericial de Engenharia',
      description: 'Laudos técnicos periciais para auditoria imobiliária e patrimonial.',
      iconName: 'scale',
      priceInfo: null, // Sem priceInfo -> não renderiza badge fake
    },
  ],
  benefit: {
    title: 'Benefício Exclusivo Empresa Fundadora',
    description: 'Isenção de taxa de corretagem em lançamentos + consultoria imobiliária gratuita para membros da ordem.',
    discountCode: 'FUNDADOR100',
    redeemInstructions: 'Apresente sua credencial de membro no agendamento.',
    validUntil: '2026-12-31T23:59:59Z',
    badgeText: 'FUNDADOR VIP',
  },
  benefits: [
    {
      id: 'b-fundador-1',
      title: 'Isenção de Taxa em Lançamentos',
      description: 'Isenção total de taxa de intermediação na aquisição de cotas de empreendimentos residenciais.',
      discountCode: 'FUNDADOR100',
      redeemInstructions: 'Apresente a credencial de membro antes da assinatura da proposta.',
      validUntil: '2026-12-31T23:59:59Z',
      badgeText: 'ISENÇÃO TAXA VIP',
    },
    {
      id: 'b-fundador-2',
      title: 'Consultoria Patrimonial Cortesia',
      description: 'Análise técnica de avaliação imobiliária e estudo de viabilidade patrimonial sem custos.',
      badgeText: 'CORTESIA FUNDADORA',
    },
  ],
  reviews: {
    average: 5.0,
    count: 342,
    items: [
      {
        id: 'fundador-review-1',
        rating: 5,
        authorName: 'Dr. Henrique Siqueira',
        authorAvatar: crop('Dr. Henrique Siqueira', 282, 719, 52, 52),
        publishedAt: '2026-08-12T11:00:00Z',
        comment: 'Empresa referência em integridade e excelência construtiva. Orgulho de ter como parceira fundadora!',
      },
      {
        id: 'fundador-review-2',
        rating: 5,
        authorName: 'Luciano Prado',
        authorAvatar: crop('Luciano Prado', 690, 719, 52, 52),
        publishedAt: '2026-08-02T09:20:00Z',
        comment: 'Adquiri um imóvel residencial com o Grupo Alfa. Processo impecável da negociação à entrega das chaves.',
      },
    ],
  },
  metrics: { views: 15420, openingStatus: 'Aberto agora' },
};

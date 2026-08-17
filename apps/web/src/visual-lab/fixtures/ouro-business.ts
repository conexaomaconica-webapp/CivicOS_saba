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

/** Fixture exclusiva da rota Visual Lab Ouro */
export const ouroBusinessFixture: PublicBusinessPresentation = {
  identity: {
    slug: 'padaria-estrela-ouro',
    name: 'Padaria & Confeitaria Estrela',
    category: 'Alimentos e Bebidas',
    description: 'Padaria artesanal premiada com tradição de 30 anos. Pães de fermentação natural, confeitaria fina e café colonial.',
    logo: crop('Logotipo da Padaria Estrela', 575, 128, 127, 126),
  },
  authority: {
    effectivePlan: 'ouro',
    isVerified: true,
    isFounder: false,
    communityVerified: true,
  },
  media: {
    cover: crop('Fachada e salão principal da Padaria Estrela', 23, 102, 521, 280),
    gallery: [
      crop('Vitrine de doces finos', 282, 719, 52, 52),
      crop('Pães artesanais recém saídos do forno', 690, 719, 52, 52),
    ],
  },
  owner: {
    name: 'Roberto Estrela',
    businessRole: 'Sócio Fundador',
    organization: 'Loja Luz e Verdade',
    communityLabel: 'Irmão',
    avatar: crop('Foto de Roberto Estrela', 1150, 245, 110, 111),
  },
  contacts: {
    phone: '(11) 2233-4455',
    whatsapp: '5511977778888',
    email: 'contato@padariaestrela.com.br',
    instagram: 'https://instagram.com/padariaestrela',
    facebook: 'https://facebook.com/padariaestrela',
    website: 'https://padariaestrela.com.br',
  },
  location: {
    address: 'Rua das Flores, 123 — Moema, São Paulo, SP, 04500-000',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.6001,
    longitude: -46.6668,
    mapImage: crop('Mapa em Moema', 1140, 680, 350, 240),
  },
  hours: [
    { dayOfWeek: 0, openTime: '06:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 1, openTime: '06:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 2, openTime: '06:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 3, openTime: '06:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 4, openTime: '06:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 5, openTime: '06:00', closeTime: '22:00', isClosed: false },
    { dayOfWeek: 6, openTime: '06:00', closeTime: '22:00', isClosed: false },
  ],
  services: [
    {
      name: 'Café Colonial Presencial',
      description: 'Servido aos finais de semana e feriados com grande variedade de pães e doces artesanais.',
      iconName: 'clock',
      priceInfo: 'A partir de R$ 45',
    },
    {
      name: 'Encomendas de Kit Festa & Eventos',
      description: 'Atendimento personalizado para eventos corporativos e comemorações familiares.',
      iconName: 'gift',
      priceInfo: 'Sob consulta',
    },
    {
      name: 'Consultoria de Harmonização de Pães',
      description: 'Treinamento e harmonização exclusiva de pães de fermentação natural para degustações.',
      iconName: 'desconhecido_fallback_test', // Ícone desconhecido -> testa fallback para Briefcase
      priceInfo: null, // Sem priceInfo -> não renderiza badge fake
    },
    {
      name: 'Entrega Expressa Fraterna',
      description: null, // Sem descrição -> renderiza apenas título de forma limpa
      iconName: 'truck',
      priceInfo: 'Frete Grátis',
    },
  ],
  benefit: {
    title: 'Desconto Ouro VIP 20%',
    description: '20% de desconto em todo o cardápio + brinde exclusivo no café colonial para membros da comunidade.',
    discountCode: 'OURO20',
    redeemInstructions: 'Apresente o código promocional no balanço ou WhatsApp.',
    validUntil: '2026-12-31T23:59:59Z',
    badgeText: '20% OFF VIP',
  },
  benefits: [
    {
      id: 'b-ouro-1',
      title: 'Desconto Ouro VIP 20%',
      description: '20% de desconto em todo o cardápio em compras acima de R$ 50 para membros da comunidade.',
      discountCode: 'OURO20',
      redeemInstructions: 'Apresente o código promocional no caixa ou informe pelo WhatsApp Direct.',
      validUntil: '2026-12-31T23:59:59Z',
      badgeText: '20% OFF VIP',
    },
    {
      id: 'b-ouro-2',
      title: 'Café Colonial Cortesia',
      description: 'Ganhe um espresso premiado acompanhado de broa de milho em qualquer consumo presencial.',
      badgeText: 'CORTESIA DA CASA',
      // Sem discountCode, sem redeemInstructions -> testa omissão sem botões quebrados
    },
    {
      id: 'b-ouro-3',
      title: 'Kit Degustação Pães Levain',
      description: 'Desconto de R$ 30 na compra do kit degustação familiar de pães de fermentação natural.',
      discountAmount: 30,
      discountCode: 'LEVAIN30',
      redeemInstructions: 'Solicite ao atendente antes da emissão da nota.',
      badgeText: 'R$ 30 OFF',
    },
  ],
  reviews: {
    average: 5.0,
    count: 215,
    items: [
      {
        id: 'ouro-review-1',
        rating: 5,
        authorName: 'Sérgio Vasconcelos',
        authorAvatar: crop('Sérgio Vasconcelos', 282, 719, 52, 52),
        publishedAt: '2026-08-10T08:15:00Z',
        comment: 'O melhor croissant de São Paulo! Atendimento caloroso do irmão Roberto e equipe sensacional.',
      },
      {
        id: 'ouro-review-2',
        rating: 5,
        authorName: 'Alexandre Magno',
        authorAvatar: crop('Alexandre Magno', 690, 719, 52, 52),
        publishedAt: '2026-08-05T16:45:00Z',
        comment: 'Excelente estrutura e produtos de altíssima qualidade. O benefício aos irmãos é muito honrado.',
      },
    ],
  },
  metrics: { views: 8930, openingStatus: 'Aberto agora' },
};

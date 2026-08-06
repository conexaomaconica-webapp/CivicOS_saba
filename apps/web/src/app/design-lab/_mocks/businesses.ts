import { MockBusiness } from '../_types/design-lab';

export const MOCK_BUSINESSES: MockBusiness[] = [
  {
    id: 'bus_001',
    tenantId: 'ten_conexao_maconica',
    name: 'Oficina Maçônica de Serviços Automotivos e Funilaria de Precisão Irmãos Unidos Ltda',
    tradeName: 'Oficina Irmãos Unidos',
    cnpj: '12.345.678/0001-90',
    slug: 'oficina-irmaos-unidos',
    category: 'Automotivo & Manutenção',
    status: 'approved',
    verificationBadge: true,
    badgeType: 'fraternal_verified',
    address: {
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Moema',
      isProtectedAddress: false
    },
    contact: {
      whatsapp: '(11) 99988-7766',
      email: 'contato@irmaosunidos.com.br',
      website: 'https://irmaosunidos.com.br'
    },
    logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=150&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 42,
    featured: true,
    createdAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'bus_002',
    tenantId: 'ten_conexao_maconica',
    name: 'Advocacia & Consultoria Jurídica Fraterna',
    tradeName: 'Advocacia Fraterna',
    cnpj: '98.765.432/0001-10',
    slug: 'advocacia-fraterna',
    category: 'Serviços Jurídicos',
    status: 'approved',
    verificationBadge: true,
    badgeType: 'certified_partner',
    address: {
      city: 'Brasília',
      state: 'DF',
      neighborhood: 'Asa Sul',
      isProtectedAddress: true
    },
    contact: {
      whatsapp: '(61) 98877-6655',
      email: 'juridico@advocaciafraterna.com.br'
    },
    logoUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=150&auto=format&fit=crop&q=80',
    rating: 5.0,
    reviewCount: 18,
    featured: false,
    createdAt: '2026-02-01T14:30:00Z'
  },
  {
    id: 'bus_003_edge_case_no_photo',
    tenantId: 'ten_conexao_maconica',
    name: 'Padaria e Confeitaria Pão da Cidade Ltda (Sem Foto / Perfil Básico em Análise)',
    tradeName: 'Padaria Pão da Cidade',
    cnpj: '45.678.901/0001-23',
    slug: 'padaria-pao-da-cidade',
    category: 'Alimentação & Gastronomia',
    status: 'pending_review',
    verificationBadge: false,
    address: {
      city: 'Curitiba',
      state: 'PR',
      neighborhood: 'Batel'
    },
    contact: {
      whatsapp: '(41) 97766-5544',
      email: 'sac@paodacidade.com.br'
    },
    rating: 0,
    reviewCount: 0,
    featured: false,
    createdAt: '2026-08-04T09:15:00Z'
  },
  {
    id: 'bus_004_edge_case_correction',
    tenantId: 'ten_conexao_maconica',
    name: 'Clínica Odontológica Sorriso Perfeito & Associados',
    tradeName: 'Sorriso Perfeito',
    cnpj: '33.444.555/0001-88',
    slug: 'sorriso-perfeito',
    category: 'Saúde & Bem-Estar',
    status: 'correction_requested',
    verificationBadge: false,
    address: {
      city: 'Belo Horizonte',
      state: 'MG',
      neighborhood: 'Savassi'
    },
    contact: {
      whatsapp: '(31) 96655-4433',
      email: 'atendimento@sorrisoperfeito.com.br'
    },
    rating: 4.2,
    reviewCount: 5,
    featured: false,
    createdAt: '2026-07-20T11:00:00Z'
  },
  {
    id: 'bus_005_edge_case_suspended',
    tenantId: 'ten_conexao_maconica',
    name: 'Construtora e Incorporadora Esquadro & Compasso S/A (Assinatura Suspensa)',
    tradeName: 'Esquadro & Compasso Construtora',
    cnpj: '77.888.999/0001-44',
    slug: 'esquadro-compasso-construtora',
    category: 'Engenharia & Construção',
    status: 'suspended',
    verificationBadge: true,
    badgeType: 'founder',
    address: {
      city: 'Rio de Janeiro',
      state: 'RJ',
      neighborhood: 'Barra da Tijuca'
    },
    contact: {
      whatsapp: '(21) 95544-3322',
      email: 'comercial@esquadrocompasso.com.br'
    },
    rating: 4.7,
    reviewCount: 89,
    featured: false,
    createdAt: '2025-11-10T16:00:00Z'
  }
];

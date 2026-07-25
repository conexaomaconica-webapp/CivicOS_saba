export interface DirectoryCategory {
  id: string;
  label: string;
  icon: string;
}

export interface FeaturedBusiness {
  id: string;
  name: string;
  category: string;
  description?: string;
  rating?: number;
}

export interface CommunityDirectoryTenantConfig {
  tenantId: string;
  name: string;
  headline: string;
  categories: DirectoryCategory[];
  featuredBusinesses: FeaturedBusiness[];
}

export const demoTenant: CommunityDirectoryTenantConfig = {
  tenantId: "tenant-demo",
  name: "Comunidade Demonstrativa",
  headline: "Encontre empresas e profissionais da comunidade",
  categories: [
    { id: "saude", label: "Saúde", icon: "heart-pulse" },
    { id: "juridico", label: "Jurídico", icon: "scale" },
    { id: "construcao", label: "Construção", icon: "hard-hat" },
    { id: "gastronomia", label: "Gastronomia", icon: "utensils" }
  ],
  featuredBusinesses: [
    { id: "1", name: "Clínica Horizonte", category: "Saúde", description: "Atendimento médico especializado." },
    { id: "2", name: "Almeida Advocacia", category: "Jurídico", description: "Assessoria jurídica empresarial e cível." },
    { id: "3", name: "Casa do Sabor", category: "Gastronomia", description: "Restaurante com pratos regionais." },
    { id: "4", name: "Construtora Central", category: "Construção", description: "Obras residenciais e comerciais." }
  ]
};

export const churchTenant: CommunityDirectoryTenantConfig = {
  tenantId: "tenant-church",
  name: "Comunidade Religiosa",
  headline: "Serviços e empreendimentos dos nossos membros",
  categories: [
    { id: "educacao", label: "Educação", icon: "book" },
    { id: "servicos", label: "Serviços", icon: "wrench" }
  ],
  featuredBusinesses: [
    { id: "1", name: "Escola Caminho da Luz", category: "Educação" },
    { id: "2", name: "Oficina do João", category: "Serviços" }
  ]
};

export interface AdminModulePermission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const ALL_ADMIN_MODULES: AdminModulePermission[] = [
  { id: 'dashboard', name: 'Dashboard Principal', description: 'Visão geral, KPIs operacionais e resumo executivo', category: 'Operação' },
  { id: 'aprovacoes', name: 'Fila de Aprovações', description: 'Dossiê obrigatório e validação de novos anúncios', category: 'Cadastros' },
  { id: 'empresas', name: 'Empresas & Anunciantes', description: 'Gestão 360º de empresas, dados cadastrais e publicação', category: 'Cadastros' },
  { id: 'lojas', name: 'Lojas Maçônicas', description: 'Diretório de lojas, potências e geolocalização', category: 'Cadastros' },
  { id: 'planos', name: 'Planos Comerciais', description: 'Definição de cotas, regras de parcelamento e benefícios', category: 'Comercial' },
  { id: 'pagamentos', name: 'Finanças & Pagamentos', description: 'Conciliação Asaas, assinaturas ativas e extrato', category: 'Financeiro' },
  { id: 'guia', name: 'Guia Comercial & Destaques', description: 'Categorias, destaques patrocinados e banners do portal', category: 'Comercial' },
  { id: 'eventos', name: 'Eventos & RSVP', description: 'Gestão de eventos e confirmação de presença fraterna', category: 'Conteúdo' },
  { id: 'pesquisas', name: 'Pesquisas & Formulários', description: 'Criação e edição de pesquisas públicas e enquetes', category: 'Conteúdo' },
  { id: 'comunicacao', name: 'Notificações & E-mails', description: 'Envios transacionais, templates e histórico SMTP', category: 'Comunicação' },
  { id: 'reviews', name: 'Avaliações & Reputação', description: 'Moderação de reviews e notas de credibilidade', category: 'Conteúdo' },
  { id: 'marca', name: 'Marca & Identidade Visual', description: 'Logomarcas, paleta de cores e personalização visual', category: 'Configurações' },
  { id: 'settings', name: 'Usuários & Permissões', description: 'Gestão da equipe administrativa e controle de acessos', category: 'Configurações' },
];

export const ROLE_PRESET_MODULES: Record<string, string[]> = {
  master: ALL_ADMIN_MODULES.map((m) => m.id),
  admin: ALL_ADMIN_MODULES.map((m) => m.id),
  socio_admin: ['dashboard', 'planos', 'pagamentos', 'empresas', 'aprovacoes', 'comunicacao'],
  finance: ['dashboard', 'planos', 'pagamentos', 'empresas'],
  moderator: ['dashboard', 'aprovacoes', 'empresas', 'lojas', 'eventos', 'pesquisas', 'reviews'],
  editor: ['dashboard', 'guia', 'lojas', 'eventos', 'pesquisas'],
};

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  tenant_id: string;
  allowed_modules: string[];
  created_at: string;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  role: string;
  allowedModules: string[];
}

export interface UpdateAdminUserPermissionsInput {
  userId: string;
  name: string;
  role: string;
  allowedModules: string[];
}

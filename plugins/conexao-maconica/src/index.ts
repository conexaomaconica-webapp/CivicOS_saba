import { definePlugin, type PluginConfig, type RouteDefinition, type NavigationItem, type WidgetDefinition, type PermissionDefinition, type EventDefinition } from '@saas/sdk';

export {
  CONEXAO_MACONICA_DEFAULT_MODULES,
  CONEXAO_MACONICA_MODULE_CATALOG,
  CONEXAO_MACONICA_THEME,
} from './domain/theme';

export const manifest = {
  id: 'conexao-maconica',
  name: 'Conexão Maçônica',
  version: '1.0.0',
  description: 'Plataforma de descoberta, geração de negócios e relacionamento comercial para a comunidade maçônica',
  author: 'CivicOS Team',
  license: 'Proprietary',
  coreVersion: '>=1.0.0',
  dependencies: [
    'business-directory',
    'billing-subscriptions',
    'crm-sales',
    'lead-management',
    'notifications',
    'analytics'
  ],
  capabilities: [
    'masonic-organization',
    'masonic-verification',
    'founder-program',
    'masonic-badges',
    'masonic-search',
    'masonic-content-taxonomy'
  ],
  permissions: [
    'organization:create',
    'organization:update',
    'organization:view_public',
    'organization:view_members',
    'organization:people:manage',
    'credential:type:manage',
    'credential:request',
    'credential:verify',
    'credential:revoke',
    'credential:evidence:upload',
    'founder:qualify',
    'founder:revoke',
    'masonic:search',
    'masonic:content:manage'
  ]
};

const routes: RouteDefinition[] = [];

const navigation: NavigationItem[] = [
  {
    id: 'nav-masonic-dashboard',
    label: 'Painel Maçônico',
    path: '/painel/maconico',
    order: 10,
    permission: 'masonic:dashboard:view',
    icon: 'building-2'
  },
  {
    id: 'nav-organizations',
    label: 'Organizações',
    path: '/admin/organizacoes',
    order: 20,
    permission: 'organization:view_public',
    icon: 'users'
  },
  {
    id: 'nav-verifications',
    label: 'Verificações',
    path: '/admin/verificacoes',
    order: 30,
    permission: 'credential:verify',
    icon: 'shield-check'
  },
  {
    id: 'nav-founders',
    label: 'Fundadores',
    path: '/admin/fundadores',
    order: 40,
    permission: 'founder:manage',
    icon: 'award'
  }
];

const widgets: WidgetDefinition[] = [
  {
    id: 'masonic-stats-widget',
    slot: 'dashboard-sidebar',
    component: 'MasonicStatsWidget',
    order: 10,
    capability: 'masonic:dashboard:view'
  },
  {
    id: 'verification-status-widget',
    slot: 'business-detail-sidebar',
    component: 'VerificationStatusWidget',
    order: 5,
    capability: 'business:view_private'
  }
];

const permissions: PermissionDefinition[] = [
  { key: 'organization:create', label: 'Criar Organização', description: 'Criar Lojas/Potências' },
  { key: 'organization:update', label: 'Atualizar Organização', description: 'Editar Lojas/Potências' },
  { key: 'organization:view_public', label: 'Ver Organizações Públicas', description: 'Visualizar organizações publicadas' },
  { key: 'organization:view_members', label: 'Ver Membros', description: 'Visualizar quadro de membros' },
  { key: 'organization:people:manage', label: 'Gerenciar Pessoas', description: 'Gerenciar pessoas da organização' },
  { key: 'credential:type:manage', label: 'Gerenciar Tipos de Credencial', description: 'Criar/editar tipos de selos' },
  { key: 'credential:request', label: 'Solicitar Credencial', description: 'Solicitar emissão de selo' },
  { key: 'credential:verify', label: 'Verificar Credencial', description: 'Aprovar/rejeitar emissão' },
  { key: 'credential:revoke', label: 'Revogar Credencial', description: 'Revogar selo emitido' },
  { key: 'credential:evidence:upload', label: 'Anexar Evidência', description: 'Anexar documentos de verificação' },
  { key: 'founder:qualify', label: 'Qualificar Fundador', description: 'Conceder status de fundador' },
  { key: 'founder:revoke', label: 'Revogar Fundador', description: 'Suspender/revogar status' },
  { key: 'masonic:search', label: 'Busca Maçônica', description: 'Realizar busca semântica especializada' },
  { key: 'masonic:content:manage', label: 'Gerenciar Conteúdo Maçônico', description: 'Gerenciar taxonomia institucional' }
];

const eventsPublished: EventDefinition[] = [
  { name: 'organization.created', description: 'Organização maçônica criada' },
  { name: 'organization.updated', description: 'Organização maçônica atualizada' },
  { name: 'organization_person.added', description: 'Pessoa adicionada à organização' },
  { name: 'credential.requested', description: 'Credencial solicitada' },
  { name: 'credential.verified', description: 'Credencial verificada (aprovada/rejeitada)' },
  { name: 'credential.evidence_uploaded', description: 'Evidência anexada à credencial' },
  { name: 'credential.expired', description: 'Credencial expirada' },
  { name: 'founder.qualified', description: 'Empresa qualificada como fundadora' },
  { name: 'founder.revoked', description: 'Qualificação de fundador revogada' },
  { name: 'business.highlight_created', description: 'Destaque de listagem criado' },
  { name: 'business.sponsorship_created', description: 'Patrocínio criado' },
  { name: 'masonic.search.performed', description: 'Busca maçônica realizada' },
  { name: 'masonic.content.published', description: 'Conteúdo maçônico publicado' }
];

export const conexaoMaconicaPlugin: PluginConfig = definePlugin({
  manifest,
  capabilities: {
    provides: [
      'masonic-organization',
      'masonic-verification',
      'founder-program',
      'masonic-badges',
      'masonic-search',
      'masonic-content-taxonomy'
    ],
    requires: [
      'business-directory',
      'billing-subscriptions',
      'crm-sales',
      'lead-management',
      'notifications',
      'analytics'
    ]
  },
  routes,
  navigation,
  widgets,
  permissions,
  eventsPublished,
  eventsConsumed: [
    'business.created',
    'business.updated',
    'subscription.created',
    'subscription.updated'
  ],
  policies: [
    'organization:create',
    'organization:update',
    'organization:view_members',
    'organization:people:manage',
    'credential:request',
    'credential:verify',
    'credential:revoke',
    'credential:evidence:upload',
    'founder:qualify',
    'founder:revoke',
    'masonic:search'
  ]
});

export default conexaoMaconicaPlugin;

// Masonic Policies - Policy definitions for the plugin

export interface PolicyContext {
  userId: string;
  tenantId: string;
  permissions: string[];
  roles: string[];
  resource?: Record<string, unknown>;
  db?: unknown; // Service resolver for DB access
}

export type PolicyEvaluator = (context: PolicyContext) => Promise<boolean> | boolean;

export interface PolicyDefinition {
  name: string;
  description: string;
  evaluate: PolicyEvaluator;
}

export const masonicOrganizationPolicies: PolicyDefinition[] = [
  {
    name: 'organization:create',
    description: 'Criar organizações maçônicas (Lojas/Potências)',
    evaluate: (context) => {
      return context.permissions.includes('organization:create') 
        && context.roles.includes('tenant_admin');
    }
  },
  {
    name: 'organization:update',
    description: 'Atualizar organizações maçônicas',
    evaluate: (context) => {
      return context.permissions.includes('organization:update') 
        && (context.roles.includes('tenant_admin') || context.roles.includes('masonic_content_editor'));
    }
  },
  {
    name: 'organization:view_members',
    description: 'Visualizar quadro de membros da organização',
    evaluate: (context) => {
      return context.permissions.includes('organization:view_members')
        && (context.roles.includes('tenant_admin') || context.roles.includes('organization_admin'));
    }
  },
  {
    name: 'organization:people:manage',
    description: 'Gerenciar pessoas da organização',
    evaluate: (context) => {
      return context.permissions.includes('organization:people:manage')
        && (context.roles.includes('tenant_admin') || context.roles.includes('organization_admin'));
    }
  }
];

export const masonicVerificationPolicies: PolicyDefinition[] = [
  {
    name: 'credential:request',
    description: 'Solicitar emissão de selo de verificação',
    evaluate: (context) => {
      return context.permissions.includes('credential:request')
        && context.roles.some(r => ['owner', 'co_owner', 'manager'].includes(r));
    }
  },
  {
    name: 'credential:verify',
    description: 'Aprovar/rejeitar emissão de selo (Anti-Self-Approval)',
    evaluate: async (context) => {
      if (!context.permissions.includes('credential:verify')) return false;
      
      // Anti-self-approval check would be done in the service layer
      // This policy just checks if user has the permission and role
      return context.roles.includes('tenant_admin') || context.roles.includes('masonic_verifier');
    }
  },
  {
    name: 'credential:revoke',
    description: 'Revogar selo emitido',
    evaluate: (context) => {
      return context.permissions.includes('credential:revoke')
        && (context.roles.includes('tenant_admin') || context.roles.includes('masonic_verifier'));
    }
  },
  {
    name: 'credential:evidence:upload',
    description: 'Anexar documentos/evidências de verificação',
    evaluate: (context) => {
      return context.permissions.includes('credential:evidence:upload')
        && context.roles.some(r => ['owner', 'co_owner', 'manager'].includes(r));
    }
  }
];

export const founderProgramPolicies: PolicyDefinition[] = [
  {
    name: 'founder:qualify',
    description: 'Conceder qualificação de Fundador',
    evaluate: (context) => {
      return context.permissions.includes('founder:qualify')
        && (context.roles.includes('tenant_admin') || context.roles.includes('founder_manager'));
    }
  },
  {
    name: 'founder:revoke',
    description: 'Suspender/revogar qualificação de Fundador',
    evaluate: (context) => {
      return context.permissions.includes('founder:revoke')
        && (context.roles.includes('tenant_admin') || context.roles.includes('founder_manager'));
    }
  }
];

export const masonicSearchPolicies: PolicyDefinition[] = [
  {
    name: 'masonic:search',
    description: 'Realizar busca semântica maçônica',
    evaluate: async (context) => {
      // Feature flag check would be done in service layer
      return context.permissions.includes('masonic:search')
        || context.permissions.includes('business:view_public');
    }
  }
];

export const masonicContentPolicies: PolicyDefinition[] = [
  {
    name: 'masonic:content:manage',
    description: 'Gerenciar taxonomia e conteúdo institucional maçônico',
    evaluate: (context) => {
      return context.permissions.includes('masonic:content:manage')
        && (context.roles.includes('tenant_admin') || context.roles.includes('masonic_content_editor'));
    }
  }
];

export const allMasonicPolicies = [
  ...masonicOrganizationPolicies,
  ...masonicVerificationPolicies,
  ...founderProgramPolicies,
  ...masonicSearchPolicies,
  ...masonicContentPolicies
];
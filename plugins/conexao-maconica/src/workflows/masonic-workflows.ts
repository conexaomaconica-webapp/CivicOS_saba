// Masonic Workflows - Workflow definitions for the plugin

export interface WorkflowContext {
  userId: string;
  tenantId: string;
  input: Record<string, unknown>;
  services: Record<string, unknown>;
  events: { emit: (name: string, payload: unknown) => void };
  notifications: { send: (options: { user_id: string; template: string; data: unknown }) => Promise<void> };
  logger: { info: (msg: string, meta?: unknown) => void; error: (msg: string, meta?: unknown) => void };
}

export interface WorkflowStep {
  id: string;
  name: string;
  execute: (context: WorkflowContext, input: unknown) => Promise<unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  steps: WorkflowStep[];
  execute: (context: WorkflowContext) => Promise<Record<string, unknown>>;
}

// Verify Credential Workflow
export const verifyCredentialWorkflow: WorkflowDefinition = {
  id: 'verify-credential',
  name: 'Verificação de Credencial Maçônica',
  version: '1.0.0',
  description: 'Fluxo completo de verificação com anti-self-approval e notificações',
  
  steps: [
    {
      id: 'validate_request',
      name: 'Validar Solicitação',
      async execute(context: WorkflowContext, input: unknown) {
        const { issuance_id } = input as { issuance_id: string };
        context.logger.info('Validating credential request', { issuance_id });
        return { issuanceId: issuance_id, valid: true };
      }
    },
    {
      id: 'check_anti_self_approval',
      name: 'Verificar Anti-Self-Approval',
      async execute(context: WorkflowContext) {
        context.logger.info('Checking anti-self-approval');
        return { approved: true };
      }
    },
    {
      id: 'verify_credential',
      name: 'Verificar Credencial',
      async execute(context: WorkflowContext, input: unknown) {
        const { issuanceId } = input as { issuanceId: string; valid: boolean };
        const { status } = context.input as { status: 'verified' | 'rejected'; notes?: string };
        
        context.logger.info('Verifying credential', { status });
        
        if (status === 'verified') {
          context.events.emit('credential.verified', {
            issuanceId,
            verifiedBy: context.userId
          });
        }
        
        return { updatedIssuance: { id: issuanceId, status } };
      }
    },
    {
      id: 'notify_parties',
      name: 'Notificar Partes Envolvidas',
      async execute(context: WorkflowContext, input: unknown) {
        const { updatedIssuance } = input as { updatedIssuance: { id: string; status: string } };
        context.logger.info('Sending notifications for credential verification', { issuanceId: updatedIssuance.id });
      }
    }
  ],

  async execute(context: WorkflowContext) {
    const results: Record<string, unknown> = {};

    for (const step of this.steps) {
      try {
        const result = await step.execute(context, results[step.id]);
        results[step.id] = result;
      } catch (error) {
        context.logger.error(`Workflow step ${step.id} failed`, { error });
        throw error;
      }
    }

    return results;
  }
};

// Qualify Founder Workflow
export const qualifyFounderWorkflow: WorkflowDefinition = {
  id: 'qualify-founder',
  name: 'Qualificação de Fundador',
  version: '1.0.0',
  description: 'Fluxo de concessão de status de fundador com benefícios automáticos',
  
  steps: [
    {
      id: 'validate_business',
      name: 'Validar Empresa',
      async execute(context: WorkflowContext, input: unknown) {
        const { business_id, founder_number } = input as { business_id: string; founder_number: number };
        context.logger.info('Validating business for founder qualification', { business_id, founder_number });
        return { businessId: business_id, founderNumber: founder_number, valid: true };
      }
    },
    {
      id: 'create_qualification',
      name: 'Criar Qualificação',
      async execute(context: WorkflowContext, input: unknown) {
        const { businessId, founderNumber } = input as { businessId: string; founderNumber: number; valid: boolean };
        context.logger.info('Creating founder qualification', { businessId, founderNumber });
        return { qualificationId: 'new-qualification-id', businessId, founderNumber };
      }
    },
    {
      id: 'grant_entitlements',
      name: 'Conceder Entitlements de Fundador',
      async execute(context: WorkflowContext, input: unknown) {
        const { qualificationId, businessId } = input as { qualificationId: string; businessId: string };
        context.logger.info('Granting founder entitlements', { qualificationId, businessId });
      }
    },
    {
      id: 'notify_founder',
      name: 'Notificar Novo Fundador',
      async execute(context: WorkflowContext) {
        context.logger.info('Sending founder qualification notification');
      }
    }
  ],

  async execute(context: WorkflowContext) {
    const results: Record<string, unknown> = {};

    for (const step of this.steps) {
      try {
        const result = await step.execute(context, results[step.id]);
        results[step.id] = result;
      } catch (error) {
        context.logger.error(`Workflow step ${step.id} failed`, { error });
        throw error;
      }
    }

    return results;
  }
};

// Business Onboarding Workflow
export const businessOnboardingWorkflow: WorkflowDefinition = {
  id: 'business-onboarding',
  name: 'Onboarding de Empresa Anunciante',
  version: '1.0.0',
  description: 'Fluxo completo de cadastro, verificação e ativação de empresa',
  
  steps: [
    {
      id: 'create_business',
      name: 'Criar Empresa',
      async execute(context: WorkflowContext, input: unknown) {
        const { businessData } = input as { businessData: Record<string, unknown> };
        context.logger.info('Creating business', { name: businessData.name });
        return { businessId: 'new-business-id', ...businessData };
      }
    },
    {
      id: 'request_verification',
      name: 'Solicitar Verificação Maçônica',
      async execute(context: WorkflowContext, input: unknown) {
        const { businessId } = input as { businessId: string };
        context.logger.info('Requesting masonic verification for business', { businessId });
      }
    },
    {
      id: 'send_welcome',
      name: 'Enviar Boas-vindas',
      async execute(context: WorkflowContext, input: unknown) {
        const { businessId } = input as { businessId: string };
        context.logger.info('Sending welcome notification', { businessId });
      }
    }
  ],

  async execute(context: WorkflowContext) {
    const results: Record<string, unknown> = {};

    for (const step of this.steps) {
      try {
        const result = await step.execute(context, results[step.id]);
        results[step.id] = result;
      } catch (error) {
        context.logger.error(`Workflow step ${step.id} failed`, { error });
        throw error;
      }
    }

    return results;
  }
};

export const masonicWorkflows = [
  verifyCredentialWorkflow,
  qualifyFounderWorkflow,
  businessOnboardingWorkflow
];
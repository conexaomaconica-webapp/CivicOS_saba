/**
 * Commercial Onboarding Status State Machine
 * CivicOS SABA / Conexão Maçônica
 *
 * Fonte oficial da aplicação para a máquina de estados do onboarding comercial.
 */

export const COMMERCIAL_STATUS = {
  PRE_CADASTRO: 'pre_cadastro',
  VINCULO_INFORMADO: 'vinculo_informado',
  VINCULO_VERIFICADO: 'vinculo_verificado',
  DADOS_COMERCIAIS_CONFERIDOS: 'dados_comerciais_conferidos',
  CONTRATO_GERADO: 'contrato_gerado',
  CONTRATO_ENVIADO: 'contrato_enviado',
  CONTRATO_ASSINADO: 'contrato_assinado',
  AGUARDANDO_PAGAMENTO: 'aguardando_pagamento',
  PAGAMENTO_CONFIRMADO: 'pagamento_confirmado',
  PRONTUARIO_EM_CONFIGURACAO: 'prontuario_em_configuracao',
  PRONTO_PARA_PUBLICAR: 'pronto_para_publicar',
  PUBLICADO: 'publicado',
} as const;

export type CommercialStatus =
  (typeof COMMERCIAL_STATUS)[keyof typeof COMMERCIAL_STATUS];

export const COMMERCIAL_STATUS_ORDER: readonly CommercialStatus[] = [
  'pre_cadastro',
  'vinculo_informado',
  'vinculo_verificado',
  'dados_comerciais_conferidos',
  'contrato_gerado',
  'contrato_enviado',
  'contrato_assinado',
  'aguardando_pagamento',
  'pagamento_confirmado',
  'prontuario_em_configuracao',
  'pronto_para_publicar',
  'publicado',
] as const;

export const COMMERCIAL_STATUS_LABELS: Record<CommercialStatus, string> = {
  pre_cadastro: 'Pré-cadastro',
  vinculo_informado: 'Vínculo informado',
  vinculo_verificado: 'Vínculo verificado',
  dados_comerciais_conferidos: 'Dados comerciais conferidos',
  contrato_gerado: 'Contrato gerado',
  contrato_enviado: 'Contrato enviado',
  contrato_assinado: 'Contrato assinado',
  aguardando_pagamento: 'Aguardando pagamento',
  pagamento_confirmado: 'Pagamento confirmado',
  prontuario_em_configuracao: 'Prontuário em configuração',
  pronto_para_publicar: 'Pronto para publicar',
  publicado: 'Publicado',
};

export const COMMERCIAL_STATUS_TRANSITIONS: Record<
  CommercialStatus,
  readonly CommercialStatus[]
> = {
  pre_cadastro: ['vinculo_informado'],
  vinculo_informado: ['vinculo_verificado'],
  vinculo_verificado: ['dados_comerciais_conferidos'],
  dados_comerciais_conferidos: ['contrato_gerado'],
  contrato_gerado: ['contrato_enviado'],
  contrato_enviado: ['contrato_assinado'],
  contrato_assinado: ['aguardando_pagamento'],
  aguardando_pagamento: ['pagamento_confirmado'],
  pagamento_confirmado: ['prontuario_em_configuracao'],
  prontuario_em_configuracao: ['pronto_para_publicar'],
  pronto_para_publicar: ['publicado'],
  publicado: [],
};

export function isCommercialStatus(value: unknown): value is CommercialStatus {
  return (
    typeof value === 'string' &&
    Object.values(COMMERCIAL_STATUS).includes(value as CommercialStatus)
  );
}

export function canTransitionCommercialStatus(
  current: CommercialStatus,
  next: CommercialStatus
): boolean {
  if (current === next) {
    return true;
  }

  return COMMERCIAL_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export function assertCommercialStatusTransition(
  current: CommercialStatus,
  next: CommercialStatus
): void {
  if (current === next) {
    return;
  }

  if (!canTransitionCommercialStatus(current, next)) {
    throw new Error(
      `Transição comercial inválida: "${current}" → "${next}".`
    );
  }
}

/**
 * Validação explícita de rollback administrativo auditado (Microetapa 4.3).
 * Isola o retorno de "contrato_gerado" para "dados_comerciais_conferidos"
 * exclusivamente para ações administrativas de invalidação com justificativa e auditoria,
 * impedindo que o mapa canônico de transições normais permita essa reversão inadvertidamente.
 */
export function assertAdministrativeCommercialRollback(
  currentStatus: CommercialStatus,
  targetStatus: CommercialStatus
): void {
  if (
    currentStatus !== COMMERCIAL_STATUS.CONTRATO_GERADO ||
    targetStatus !== COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS
  ) {
    throw new Error(
      `Rollback administrativo inválido: apenas "${COMMERCIAL_STATUS.CONTRATO_GERADO}" pode retornar para "${COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS}". Status informado: "${currentStatus}" → "${targetStatus}".`
    );
  }
}


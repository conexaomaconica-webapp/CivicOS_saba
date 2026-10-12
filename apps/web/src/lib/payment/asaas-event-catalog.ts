/**
 * Catálogo Autoritativo de Classificação de Eventos do Webhook Asaas
 * 
 * Conexão Maçônica / CivicOS SABA
 * 
 * Garante que:
 * 1. PAYMENT_CREATED seja tratado como criação de cobrança, nunca confirmação.
 * 2. Eventos administrativos sejam reconhecidos sem tentar conciliação financeira.
 * 3. Eventos técnicos/testes não poluam métricas como incidentes reais.
 * 4. Eventos não reconhecidos sejam sinalizados para triagem sem mascaramento.
 */

export type AsaasEventCategory =
  | 'financial_confirmation' // Liquidação confirmada (recebido/confirmado)
  | 'financial_creation'     // Intenção/cobrança gerada (aguardando pagamento)
  | 'financial_reversal'     // Vencido, estornado, cancelado, chargeback
  | 'administrative'         // Clientes, transferências, notas fiscais, subcontas
  | 'technical_test'         // Pings, smoke tests, validações de URL
  | 'unrecognized';          // Evento desconhecido ou não homologado

export interface AsaasEventDefinition {
  category: AsaasEventCategory;
  isFinancial: boolean;
  description: string;
}

export const ASAAS_EVENT_REGISTRY: Record<string, AsaasEventDefinition> = {
  // --- 1. Confirmação / Liquidação Financeira ---
  PAYMENT_RECEIVED: {
    category: 'financial_confirmation',
    isFinancial: true,
    description: 'Pagamento recebido com sucesso (Pix, Boleto ou Cartão).',
  },
  PAYMENT_CONFIRMED: {
    category: 'financial_confirmation',
    isFinancial: true,
    description: 'Pagamento em cartão de crédito confirmado/capturado.',
  },

  // --- 2. Criação / Aguardando Pagamento ---
  PAYMENT_CREATED: {
    category: 'financial_creation',
    isFinancial: true,
    description: 'Cobrança gerada no Asaas aguardando pagamento pelo cliente.',
  },
  PAYMENT_UPDATED: {
    category: 'financial_creation',
    isFinancial: true,
    description: 'Dados da cobrança atualizados (vencimento, valor ou descrição).',
  },
  PAYMENT_BANK_SLIP_VIEWED: {
    category: 'financial_creation',
    isFinancial: true,
    description: 'Boleto bancário visualizado pelo cliente.',
  },
  PAYMENT_CHECKOUT_VIEWED: {
    category: 'financial_creation',
    isFinancial: true,
    description: 'Página de fatura/checkout visualizada pelo cliente.',
  },

  // --- 3. Atraso, Estorno, Cancelamento e Chargeback ---
  PAYMENT_OVERDUE: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Cobrança vencida sem registro de pagamento.',
  },
  PAYMENT_DELETED: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Cobrança removida no Asaas.',
  },
  PAYMENT_RESTORED: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Cobrança restaurada após exclusão.',
  },
  PAYMENT_REFUNDED: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Pagamento estornado integralmente ao cliente.',
  },
  PAYMENT_PARTIALLY_REFUNDED: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Pagamento estornado parcialmente ao cliente.',
  },
  PAYMENT_REFUND_IN_PROCESSING: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Estorno em processamento bancário.',
  },
  PAYMENT_CHARGEBACK_REQUESTED: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Contestação/chargeback solicitado pelo portador do cartão.',
  },
  PAYMENT_CHARGEBACK_DISPUTE: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Disputa de chargeback aberta junto à bandeira/banco.',
  },
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Disputa vencida, aguardando crédito de reversão.',
  },
  PAYMENT_DUNNING_RECEIVED: {
    category: 'financial_confirmation',
    isFinancial: true,
    description: 'Pagamento recuperado e recebido via processo de recuperação/negativação.',
  },
  PAYMENT_DUNNING_REQUESTED: {
    category: 'financial_reversal',
    isFinancial: true,
    description: 'Processo de negativação de débito solicitado.',
  },

  // --- 4. Administrativos (Clientes, Cadastros, Subcontas) ---
  CUSTOMER_CREATED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Cliente/anunciante cadastrado no Asaas.',
  },
  CUSTOMER_UPDATED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Cadastro do cliente/anunciante atualizado no Asaas.',
  },
  CUSTOMER_DELETED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Cadastro do cliente/anunciante removido no Asaas.',
  },
  ACCOUNT_STATUS_UPDATED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Status cadastral da subconta do Asaas atualizado.',
  },
  COMMERCIAL_INFO_APPROVED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Informações comerciais e documentos aprovados no Asaas.',
  },
  COMMERCIAL_INFO_REJECTED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Informações comerciais ou documentos rejeitados no Asaas.',
  },

  // --- 5. Administrativos (Transferências, Antecipações, Notas) ---
  TRANSFER_CREATED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Transferência bancária/Pix solicitada.',
  },
  TRANSFER_PENDING: {
    category: 'administrative',
    isFinancial: false,
    description: 'Transferência bancária em análise ou agendamento.',
  },
  TRANSFER_IN_BANK_PROCESSING: {
    category: 'administrative',
    isFinancial: false,
    description: 'Transferência em liquidação interbancária.',
  },
  TRANSFER_BLOCKED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Transferência bloqueada para verificação de segurança.',
  },
  TRANSFER_DONE: {
    category: 'administrative',
    isFinancial: false,
    description: 'Transferência bancária concluída com sucesso.',
  },
  TRANSFER_FAILED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Transferência bancária rejeitada ou devolvida.',
  },
  TRANSFER_CANCELLED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Transferência cancelada antes do processamento.',
  },
  ANTICIPATION_SCHEDULED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Antecipação de recebíveis agendada.',
  },
  ANTICIPATION_PENDING: {
    category: 'administrative',
    isFinancial: false,
    description: 'Antecipação de recebíveis em análise.',
  },
  ANTICIPATION_APPROVED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Antecipação de recebíveis aprovada.',
  },
  ANTICIPATION_CANCELLED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Antecipação de recebíveis cancelada.',
  },
  ANTICIPATION_REFUSED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Antecipação de recebíveis recusada.',
  },
  INVOICE_CREATED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Nota fiscal de serviço gerada no Asaas.',
  },
  INVOICE_UPDATED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Nota fiscal de serviço atualizada.',
  },
  INVOICE_SYNCHRONIZED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Nota fiscal autorizada na prefeitura e sincronizada.',
  },
  INVOICE_AUTHORIZED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Nota fiscal autorizada na prefeitura.',
  },
  INVOICE_PROCESSING_CANCELLATION: {
    category: 'administrative',
    isFinancial: false,
    description: 'Cancelamento de nota fiscal em processamento.',
  },
  INVOICE_CANCELED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Nota fiscal cancelada com sucesso.',
  },
  INVOICE_CANCELLATION_DENIED: {
    category: 'administrative',
    isFinancial: false,
    description: 'Cancelamento de nota fiscal rejeitado pela prefeitura.',
  },
  INVOICE_ERROR: {
    category: 'administrative',
    isFinancial: false,
    description: 'Erro na emissão de nota fiscal de serviço.',
  },

  // --- 6. Técnicos e Testes ---
  PING: {
    category: 'technical_test',
    isFinancial: false,
    description: 'Ping técnico de validação de conectividade do webhook.',
  },
  WH_PING: {
    category: 'technical_test',
    isFinancial: false,
    description: 'Ping do webhook emitido pela fila do Asaas.',
  },
  TEST: {
    category: 'technical_test',
    isFinancial: false,
    description: 'Disparo de teste do webhook via painel do Asaas.',
  },
  TECHNICAL_SMOKE_TEST: {
    category: 'technical_test',
    isFinancial: false,
    description: 'Smoke test de validação financeira operacional controlada.',
  },
};

/**
 * Classifica um evento do Asaas a partir do seu código textual.
 */
export function classifyAsaasEvent(eventType: unknown): AsaasEventDefinition {
  if (typeof eventType !== 'string' || !eventType.trim()) {
    return {
      category: 'unrecognized',
      isFinancial: false,
      description: 'Evento sem identificador textual de tipo.',
    };
  }

  const normalized = eventType.trim().toUpperCase();
  const found = ASAAS_EVENT_REGISTRY[normalized];

  if (found) {
    return found;
  }

  // Heurística segura: se começar com PAYMENT_, mas não estiver no catálogo,
  // marca como financeiro não reconhecido para triagem, mas NUNCA confirma automaticamente.
  if (normalized.startsWith('PAYMENT_')) {
    return {
      category: 'unrecognized',
      isFinancial: true,
      description: `Evento financeiro não catalogado: ${normalized}. Requer triagem.`,
    };
  }

  return {
    category: 'unrecognized',
    isFinancial: false,
    description: `Evento Asaas não reconhecido: ${normalized}. Requer triagem.`,
  };
}

/**
 * Extrai estritamente o identificador da cobrança Asaas (ex: pay_12345678).
 * NUNCA aceita o ID do evento ou webhook (ex: evt_..., asaas_evt_...).
 */
export function extractAsaasPaymentId(payload: Record<string, unknown>): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  // 1. Caso padrão: payload.payment.id
  if (payload.payment && typeof payload.payment === 'object') {
    const payment = payload.payment as Record<string, unknown>;
    if (typeof payment.id === 'string' && isValidAsaasPaymentId(payment.id)) {
      return payment.id.trim();
    }
  }

  // 2. Cobrança enviada na raiz do payload com paymentId explícito
  if (typeof payload.paymentId === 'string' && isValidAsaasPaymentId(payload.paymentId)) {
    return payload.paymentId.trim();
  }

  // 3. Payload raiz é a própria cobrança (apenas se tiver formato pay_ ou não for evt_)
  if (typeof payload.id === 'string' && isValidAsaasPaymentId(payload.id)) {
    return payload.id.trim();
  }

  return null;
}

/**
 * Valida se a string tem a estrutura esperada de um ID de cobrança do Asaas.
 * Bloqueia expressamente IDs de evento como 'evt_...' ou 'asaas_evt_...'.
 */
export function isValidAsaasPaymentId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim();
  if (clean.length < 5 || clean.length > 64) return false;
  if (clean.startsWith('evt_') || clean.startsWith('asaas_evt_')) return false;
  if (clean.startsWith('wh_') || clean.startsWith('webhook_')) return false;
  return true;
}

/**
 * Extrai o ID do evento para deduplicação e idempotência.
 */
export function extractAsaasEventId(
  payload: Record<string, unknown>,
  headerEventId?: string | null
): string {
  if (headerEventId && typeof headerEventId === 'string' && headerEventId.trim()) {
    return headerEventId.trim();
  }
  if (typeof payload.id === 'string' && payload.id.trim()) {
    return payload.id.trim();
  }
  const eventName = typeof payload.event === 'string' ? payload.event.trim() : 'EVENT';
  const paymentId = extractAsaasPaymentId(payload);
  if (paymentId) {
    return `${eventName}_${paymentId}`;
  }
  return `${eventName}_${Date.now()}`;
}

export function isFinancialConfirmationEvent(event: string | null | undefined): boolean {
  return classifyAsaasEvent(event).category === 'financial_confirmation';
}

export function isFinancialCreationEvent(event: string | null | undefined): boolean {
  return classifyAsaasEvent(event).category === 'financial_creation';
}

export function isAdministrativeEvent(event: string | null | undefined): boolean {
  return classifyAsaasEvent(event).category === 'administrative';
}

export function isTechnicalTestEvent(event: string | null | undefined): boolean {
  return classifyAsaasEvent(event).category === 'technical_test';
}


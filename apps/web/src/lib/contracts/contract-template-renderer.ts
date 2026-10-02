/**
 * Contract Template Renderer — CivicOS SABA / Conexão Maçônica
 * Fase 4: Microetapa 4.1 — Renderizador Canônico de Contratos de Adesão
 */

export interface AdvertiserContractVariables {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  endereco: string;

  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_email: string;

  plano_nome: string;
  vigencia: string;
  valor_total: string;
  forma_pagamento: string;
  parcelas: string;
  valor_parcela: string;

  selo_pedra_fundamental: string;
  data_emissao: string;
}

/**
 * Valida a presença de todos os campos obrigatórios antes da renderização.
 * Lança erro descritivo caso falte qualquer dado essencial para a higidez jurídica do contrato.
 */
export function assertContractVariablesComplete(
  variables: AdvertiserContractVariables
): void {
  const requiredFields: Array<keyof AdvertiserContractVariables> = [
    'razao_social',
    'nome_fantasia',
    'cnpj',
    'responsavel_nome',
    'responsavel_cpf',
    'responsavel_email',
    'plano_nome',
    'vigencia',
    'valor_total',
    'forma_pagamento',
    'parcelas',
    'valor_parcela',
    'data_emissao',
  ];

  const missing = requiredFields.filter(
    (field) => !String(variables[field] ?? '').trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Dados obrigatórios ausentes para geração do contrato: ${missing.join(', ')}`
    );
  }
}

/**
 * Renderiza um template em Markdown substituindo todas as variáveis {{variavel}}.
 * Fail-fast: Lança erro caso uma variável seja nula/indefinida ou caso permaneça
 * qualquer tag não resolvida no texto final.
 */
export function renderContractTemplate(
  template: string,
  variables: AdvertiserContractVariables
): string {
  if (!template || typeof template !== 'string') {
    throw new Error('Template contratual inválido ou não fornecido.');
  }

  // 1. Valida completude dos dados obrigatórios
  assertContractVariablesComplete(variables);

  // 2. Substitui as variáveis fornecidas
  const rendered = template.replace(
    /\{\{([a-zA-Z0-9_]+)\}\}/g,
    (_, rawKey: string) => {
      const key = rawKey as keyof AdvertiserContractVariables;
      const value = variables[key];

      if (value === undefined || value === null) {
        throw new Error(`Variável contratual não preenchida: ${rawKey}`);
      }

      return String(value);
    }
  );

  // 3. Garante que nenhuma tag {{...}} tenha permanecido sem substituição
  const unresolvedMatches = rendered.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
  if (unresolvedMatches && unresolvedMatches.length > 0) {
    throw new Error(
      `Template contém variáveis não resolvidas no texto final: ${unresolvedMatches.join(', ')}`
    );
  }

  return rendered;
}

/**
 * Formata valores monetários em centavos para o padrão BRL (R$ 1.500,00).
 */
export function formatCurrencyBRL(cents: number): string {
  const safeCents = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safeCents / 100);
}

/**
 * Formata a vigência em texto claro (ex: 12 -> "12 meses", "annual" -> "12 meses", 24 -> "24 meses").
 */
export function formatVigencia(monthsOrCycle: number | string): string {
  if (typeof monthsOrCycle === 'number') {
    return `${monthsOrCycle} meses`;
  }

  const str = String(monthsOrCycle).trim().toLowerCase();
  if (str === 'annual' || str === '12' || str === 'anual') {
    return '12 meses';
  }
  if (str === 'biennial' || str === '24' || str === 'bienal') {
    return '24 meses';
  }

  const num = parseInt(str, 10);
  if (!isNaN(num) && num > 0) {
    return `${num} meses`;
  }

  return monthsOrCycle || '12 meses';
}

/**
 * Retorna o texto controlado para o selo de Pedra Fundamental ou string vazia se não aplicável.
 */
export function formatSeloPedraFundamental(isPedraFundamental: boolean): string {
  if (!isPedraFundamental) {
    return '';
  }
  return '- **Reconhecimento Especial:** Empresa Fundadora — Pedra Fundamental';
}

/**
 * Formata a data de emissão para exibição no contrato (ex: "01/10/2026").
 */
export function formatDataEmissao(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

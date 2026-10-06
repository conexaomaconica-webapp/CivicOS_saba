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
  responsavel_telefone: string;
  empresa_telefone: string;

  plano_nome: string;
  vigencia: string;
  data_inicio_vigencia: string;
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
    'data_inicio_vigencia',
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
  const legacyAliases: Record<string, keyof AdvertiserContractVariables> = {
    empresa_anunciante: 'razao_social',
    documento_anunciante: 'cnpj',
    responsavel_legal: 'responsavel_nome',
    email_responsavel: 'responsavel_email',
    plano_valor: 'valor_total',
  };

  const rendered = template.replace(
    /\{\{([a-zA-Z0-9_]+)\}\}/g,
    (_, rawKey: string) => {
      const key = legacyAliases[rawKey] || (rawKey as keyof AdvertiserContractVariables);
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
export function appendSignatureImageToContractText(
  renderedText: string,
  signatureImageData: string,
  fantasyName: string,
  contractorLegalName?: string | null,
  representativeName?: string | null,
  signerDeclaration?: { cpf?: string | null; divergesFromRegistration?: boolean } | null
): string {
  const text = String(renderedText || '').trim();
  const signature = String(signatureImageData || '').trim();
  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  // Abaixo da assinatura vão a razão social e o nome completo do responsável (nome fantasia só como reserva
  // quando a razão social não estiver cadastrada).
  const legalName = escapeHtml(String(contractorLegalName || fantasyName || '').trim());
  const representative = escapeHtml(String(representativeName || '').trim());
  const signerCpfDigits = String(signerDeclaration?.cpf || '').replace(/\D/g, '');
  const signerCpfLabel = signerCpfDigits.length === 11
    ? `${signerCpfDigits.slice(0, 3)}.${signerCpfDigits.slice(3, 6)}.${signerCpfDigits.slice(6, 9)}-${signerCpfDigits.slice(9)}`
    : '';

  if (!text) {
    throw new Error('Texto contratual renderizado e obrigatorio para anexar assinatura.');
  }

  if (!signature.startsWith('data:image/') || signature.length < 200) {
    throw new Error('Imagem de assinatura invalida para anexar ao contrato.');
  }

  const finalText = text.replace(/\n*<section data-contract-signature[\s\S]*$/m, '').trimEnd();

  return `${finalText}

<section data-contract-signature="representante-legal" style="margin-top:40px;text-align:center;page-break-inside:avoid">
  <img src="${signature}" alt="Assinatura eletronica do representante legal" style="display:block;max-width:320px;max-height:130px;margin:0 auto 6px;object-fit:contain" />
  <div style="width:360px;max-width:100%;margin:0 auto;border-top:1px solid #333;padding-top:6px;font-size:12px;font-weight:bold">
    <div>CONTRATANTE / RAZÃO SOCIAL: ${legalName || 'CONTRATANTE'}</div>${representative ? `
    <div>REPRESENTANTE LEGAL: ${representative}</div>` : ''}${signerCpfLabel ? `
    <div>CPF: ${signerCpfLabel}</div>` : ''}${signerDeclaration?.divergesFromRegistration ? `
    <div style="font-weight:normal;font-size:10px;margin-top:4px">Nome e/ou CPF informados pelo signatário no ato da assinatura, diferentes do cadastro prévio.</div>` : ''}
  </div>
</section>`;
}

/**
 * Remove apenas o bloco técnico de assinatura anexado ao snapshot para que
 * visualizadores de texto puro não exibam HTML nem o data URL da imagem.
 * O snapshot armazenado permanece imutável e a assinatura continua sendo
 * apresentada pelo campo signature_image_data.
 */
export function contractTextForPlainDisplay(renderedText: string | null | undefined): string {
  return String(renderedText || '')
    .replace(/\n*<section data-contract-signature[\s\S]*?<\/section>/g, '')
    .trimEnd();
}

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

/**
 * Formata a data de início da vigência contratual.
 * Aceita string no formato ISO ("YYYY-MM-DD") ou um objeto Date.
 * Quando não fornecida, retorna "a contar da data de assinatura".
 */
export function formatDataInicioVigencia(startDate?: string | Date | null): string {
  if (!startDate) {
    return 'a contar da data de assinatura';
  }
  const d = typeof startDate === 'string' ? new Date(`${startDate}T12:00:00`) : startDate;
  if (isNaN(d.getTime())) {
    return 'a contar da data de assinatura';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

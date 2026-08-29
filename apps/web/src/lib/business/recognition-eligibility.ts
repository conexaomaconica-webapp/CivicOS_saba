/**
 * recognition-eligibility.ts
 * 
 * Regra Central de Elegibilidade de Reconhecimentos Institucionais por Plano Comercial.
 * 
 * MATRIZ OFICIAL:
 * - Bronze: Sem reconhecimento | Empresa Verificada (pedra_fundamental e coluna_de_honra BLOQUEADOS)
 * - Prata:  Sem reconhecimento | Empresa Verificada (pedra_fundamental e coluna_de_honra BLOQUEADOS)
 * - Ouro:   Sem reconhecimento | Empresa Verificada | Pedra Fundamental (10/10) | Coluna de Honra
 */

export type RecognitionKey =
  | 'empresa_verificada'
  | 'pedra_fundamental'
  | 'coluna_de_honra'
  | 'empresa_fundadora';

export function canBusinessReceiveRecognition(
  planCode: string | undefined | null,
  recognitionKey: RecognitionKey | string
): boolean {
  const normalizedPlan = (planCode || 'bronze').toLowerCase().trim();
  const normalizedKey = recognitionKey.toLowerCase().trim();

  // Empresa Verificada é permitida para qualquer plano comercial (Bronze, Prata, Ouro)
  if (normalizedKey === 'empresa_verificada') {
    return true;
  }

  // Empresa Fundadora é permitida para Ouro e Prata no lançamento inicial
  if (normalizedKey === 'empresa_fundadora') {
    return normalizedPlan === 'ouro' || normalizedPlan === 'prata';
  }

  // Pedra Fundamental e Coluna de Honra são permitidas EXCLUSIVAMENTE para o Plano Ouro
  if (normalizedKey === 'pedra_fundamental' || normalizedKey === 'coluna_de_honra') {
    return normalizedPlan === 'ouro';
  }

  return false;
}

/**
 * Filtra uma lista de chaves de reconhecimento com base no plano comercial efetivo
 */
export function filterEligibleRecognitions(
  planCode: string | undefined | null,
  recognitions: string[]
): string[] {
  return recognitions.filter((recKey) => canBusinessReceiveRecognition(planCode, recKey));
}

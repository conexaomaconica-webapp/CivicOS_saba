/**
 * recognition-eligibility.ts
 * 
 * Regra Central de Elegibilidade de Reconhecimentos Institucionais por Plano Comercial.
 * 
 * MATRIZ OFICIAL:
 * - Todo plano ativo possui seu próprio selo comercial.
 * - Pedra Fundamental é condecoração histórica de fundador, independente do plano.
 * - Coluna de Honra foi descontinuada.
 */

export type RecognitionKey =
  | 'empresa_verificada'
  | 'pedra_fundamental'
  | 'coluna_de_honra'
  | 'empresa_fundadora'
  | 'selo_ouro'
  | 'selo_prata'
  | 'selo_bronze';

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

  if (normalizedKey === 'coluna_de_honra') {
    return false;
  }

  if (normalizedKey === 'empresa_fundadora' || normalizedKey === 'pedra_fundamental') {
    return true;
  }

  if (normalizedKey === 'selo_ouro') return normalizedPlan === 'ouro';
  if (normalizedKey === 'selo_prata') return normalizedPlan === 'prata';
  if (normalizedKey === 'selo_bronze') return normalizedPlan === 'bronze';

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

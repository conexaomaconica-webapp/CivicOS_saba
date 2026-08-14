// ---------------------------------------------------------------------------
// ADV-001b (DOMÍNIO MAÇÔNICO) — vínculo maçônico declarado pelo responsável
// no onboarding do anunciante (W1): irmão maçom, cunhada, DeMolay, Filha de Jó
// ou ausência de vínculo. Usado como base do "Selo de Membro Maçônico".
// ---------------------------------------------------------------------------

export type MasonicStatus = 'mason' | 'mason_wife' | 'demolay' | 'job_daughter' | 'none';

export const MASONIC_STATUS_OPTIONS: MasonicStatus[] = [
  'mason',
  'mason_wife',
  'demolay',
  'job_daughter',
  'none',
];

export const MASONIC_STATUS_LABELS: Record<MasonicStatus, string> = {
  mason: 'Sou Irmão Maçom',
  mason_wife: 'Sou Cunhada (esposa de maçom)',
  demolay: 'Sou DeMolay',
  job_daughter: 'Sou Filha de Jó',
  none: 'Não possuo vínculo maçônico',
};

export interface MasonicAffiliation {
  status: MasonicStatus;
  isActive: boolean;
  cimbCode: string;
  lodgeName: string;
  chapterName: string;
  spouseMasonName: string;
  masonicConsent: boolean;
}

export interface MasonicAffiliationInput {
  status: MasonicStatus | '';
  isActive: boolean | null;
  cimbCode: string;
  lodgeName: string;
  chapterName: string;
  spouseMasonName: string;
  /** LGPD: consentimento explícito e destacado para tratamento do vínculo (dado sensível). */
  masonicConsent: boolean;
}

export interface MasonicStepErrors {
  status?: string;
  isActive?: string;
  cimbCode?: string;
  chapterName?: string;
  spouseMasonName?: string;
  consent?: string;
}

export const emptyMasonicAffiliation = (): MasonicAffiliationInput => ({
  status: '',
  isActive: null,
  cimbCode: '',
  lodgeName: '',
  chapterName: '',
  spouseMasonName: '',
  masonicConsent: false,
});

export function sanitizeCimb(value: string): string {
  return value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

export function validateMasonicStep(
  input: MasonicAffiliationInput,
): MasonicStepErrors {
  const errors: MasonicStepErrors = {};

  if (!input.status) {
    errors.status = 'Informe seu vínculo com a Maçonaria.';
    return errors;
  }

  if (input.status !== 'none' && input.masonicConsent !== true) {
    errors.consent =
      'Para declarar vínculo maçônico (dado pessoal sensível), é necessário autorizar o tratamento dos seus dados conforme a Política de Privacidade.';
  }

  switch (input.status) {
    case 'mason': {
      if (input.isActive == null) {
        errors.isActive = 'Informe se você está ativo na Ordem.';
      }
      if (!sanitizeCimb(input.cimbCode)) {
        errors.cimbCode = 'Informe o número do CIMB (Carteira de Identificação Maçônica).';
      } else if (sanitizeCimb(input.cimbCode).length < 4) {
        errors.cimbCode = 'CIMB inválido — confira o número informado.';
      }
      break;
    }
    case 'mason_wife':
      if (!input.spouseMasonName.trim()) {
        errors.spouseMasonName = 'Informe o nome do marido maçom.';
      }
      break;
    case 'demolay':
    case 'job_daughter':
      if (!input.chapterName.trim()) {
        errors.chapterName = 'Informe o nome do Capítulo / Beth-El.';
      }
      break;
    case 'none':
      break;
  }

  return errors;
}

export function hasMasonicStepErrors(errors: MasonicStepErrors): boolean {
  return Object.values(errors).some((message) => Boolean(message));
}

export function toPersistedAffiliation(
  input: MasonicAffiliationInput,
): MasonicAffiliation | null {
  if (!input.status) return null;
  return {
    status: input.status,
    isActive: input.status === 'mason' ? input.isActive === true : false,
    cimbCode: sanitizeCimb(input.cimbCode),
    lodgeName: input.lodgeName.trim(),
    chapterName: input.chapterName.trim(),
    spouseMasonName: input.spouseMasonName.trim(),
    masonicConsent: input.masonicConsent === true,
  };
}
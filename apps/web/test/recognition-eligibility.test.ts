import { describe, expect, it } from 'vitest';
import {
  canBusinessReceiveRecognition,
  filterEligibleRecognitions,
} from '../src/lib/business/recognition-eligibility';

describe('Reconhecimentos e selos — matriz vigente', () => {
  it.each(['bronze', 'prata', 'ouro'])(
    'permite a Pedra Fundamental independentemente do plano (%s)',
    (plan) => {
      expect(canBusinessReceiveRecognition(plan, 'pedra_fundamental')).toBe(true);
    }
  );

  it.each(['bronze', 'prata', 'ouro'])(
    'mantém Empresa Verificada disponível no plano %s',
    (plan) => {
      expect(canBusinessReceiveRecognition(plan, 'empresa_verificada')).toBe(true);
    }
  );

  it.each(['bronze', 'prata', 'ouro'])(
    'bloqueia o reconhecimento descontinuado Coluna de Honra no plano %s',
    (plan) => {
      expect(canBusinessReceiveRecognition(plan, 'coluna_de_honra')).toBe(false);
    }
  );

  it('libera somente o selo correspondente a cada plano', () => {
    expect(canBusinessReceiveRecognition('bronze', 'selo_bronze')).toBe(true);
    expect(canBusinessReceiveRecognition('bronze', 'selo_prata')).toBe(false);
    expect(canBusinessReceiveRecognition('prata', 'selo_prata')).toBe(true);
    expect(canBusinessReceiveRecognition('prata', 'selo_ouro')).toBe(false);
    expect(canBusinessReceiveRecognition('ouro', 'selo_ouro')).toBe(true);
    expect(canBusinessReceiveRecognition('ouro', 'selo_bronze')).toBe(false);
  });

  it('filtra Coluna de Honra e preserva a condecoração e o selo do plano', () => {
    const eligible = filterEligibleRecognitions('prata', [
      'empresa_verificada',
      'pedra_fundamental',
      'coluna_de_honra',
      'selo_prata',
      'selo_ouro',
    ]);

    expect(eligible).toEqual(['empresa_verificada', 'pedra_fundamental', 'selo_prata']);
  });
});

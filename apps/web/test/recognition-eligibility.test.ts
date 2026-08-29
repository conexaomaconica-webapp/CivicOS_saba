import { describe, it, expect } from 'vitest';
import {
  canBusinessReceiveRecognition,
  filterEligibleRecognitions,
} from '../src/lib/business/recognition-eligibility';

describe('RECONHECIMENTOS INSTITUCIONAIS — MATRIZ DE ELEGIBILIDADE POR PLANO', () => {
  describe('Plano Bronze', () => {
    it('Bronze + Empresa Verificada -> PERMITIDO (PASS)', () => {
      expect(canBusinessReceiveRecognition('bronze', 'empresa_verificada')).toBe(true);
    });

    it('Bronze + Pedra Fundamental -> BLOQUEADO (BLOCKED)', () => {
      expect(canBusinessReceiveRecognition('bronze', 'pedra_fundamental')).toBe(false);
    });

    it('Bronze + Coluna de Honra -> BLOQUEADO (BLOCKED)', () => {
      expect(canBusinessReceiveRecognition('bronze', 'coluna_de_honra')).toBe(false);
    });
  });

  describe('Plano Prata', () => {
    it('Prata + Empresa Verificada -> PERMITIDO (PASS)', () => {
      expect(canBusinessReceiveRecognition('prata', 'empresa_verificada')).toBe(true);
    });

    it('Prata + Pedra Fundamental -> BLOQUEADO (BLOCKED)', () => {
      expect(canBusinessReceiveRecognition('prata', 'pedra_fundamental')).toBe(false);
    });

    it('Prata + Coluna de Honra -> BLOQUEADO (BLOCKED)', () => {
      expect(canBusinessReceiveRecognition('prata', 'coluna_de_honra')).toBe(false);
    });
  });

  describe('Plano Ouro', () => {
    it('Ouro + Empresa Verificada -> PERMITIDO (PASS)', () => {
      expect(canBusinessReceiveRecognition('ouro', 'empresa_verificada')).toBe(true);
    });

    it('Ouro + Pedra Fundamental -> PERMITIDO (PASS)', () => {
      expect(canBusinessReceiveRecognition('ouro', 'pedra_fundamental')).toBe(true);
    });

    it('Ouro + Coluna de Honra -> PERMITIDO (PASS)', () => {
      expect(canBusinessReceiveRecognition('ouro', 'coluna_de_honra')).toBe(true);
    });
  });

  describe('Filtro de Lista de Reconhecimentos Elegíveis', () => {
    it('Filtra reconhecimentos de empresa Bronze descartando Pedra Fundamental e Coluna de Honra', () => {
      const input = ['empresa_verificada', 'pedra_fundamental', 'coluna_de_honra'];
      const eligible = filterEligibleRecognitions('bronze', input);
      expect(eligible).toEqual(['empresa_verificada']);
    });

    it('Preserva todos os reconhecimentos elegíveis para empresa Ouro', () => {
      const input = ['empresa_verificada', 'pedra_fundamental', 'coluna_de_honra'];
      const eligible = filterEligibleRecognitions('ouro', input);
      expect(eligible).toEqual(['empresa_verificada', 'pedra_fundamental', 'coluna_de_honra']);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { getCommercialPlanName } from './approval-display';

describe('Admin Approval Service', () => {
  describe('getCommercialPlanName', () => {
    it('deve normalizar o plano bronze para Esquadro', () => {
      expect(getCommercialPlanName('bronze')).toBe('Esquadro');
      expect(getCommercialPlanName('BRONZE')).toBe('Esquadro');
    });

    it('deve normalizar o plano prata/silver para Compasso', () => {
      expect(getCommercialPlanName('prata')).toBe('Compasso');
      expect(getCommercialPlanName('silver')).toBe('Compasso');
      expect(getCommercialPlanName('PRATA')).toBe('Compasso');
    });

    it('deve normalizar o plano ouro/gold para Acácia', () => {
      expect(getCommercialPlanName('ouro')).toBe('Acácia');
      expect(getCommercialPlanName('gold')).toBe('Acácia');
      expect(getCommercialPlanName('OURO')).toBe('Acácia');
    });

    it('deve formatar planos desconhecidos com a primeira letra maiúscula', () => {
      expect(getCommercialPlanName('premium')).toBe('Premium');
      expect(getCommercialPlanName('outro_plano')).toBe('Outro_plano');
    });
  });
});

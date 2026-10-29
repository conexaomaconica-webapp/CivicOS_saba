import { describe, it, expect } from 'vitest';
import {
  resolveResponsibleRole,
  resolveTreatmentLabel,
  resolveResponsibleGender,
  resolveProfessionFromCategory,
} from '@/lib/business/responsible-role-resolver';

describe('responsible-role-resolver canonical rules', () => {
  describe('resolveResponsibleGender', () => {
    it('identifica feminino para cunhada', () => {
      expect(resolveResponsibleGender({ communityLabel: 'Cunhada' })).toBe('feminino');
      expect(resolveResponsibleGender({ eligibilityType: 'mason_spouse' })).toBe('feminino');
    });

    it('identifica feminino para sobrinha', () => {
      expect(resolveResponsibleGender({ communityLabel: 'Sobrinha' })).toBe('feminino');
      expect(resolveResponsibleGender({ familyRelationship: 'filha' })).toBe('feminino');
      expect(resolveResponsibleGender({ familyRelationship: 'sobrinha' })).toBe('feminino');
    });

    it('identifica masculino para irmão e sobrinho', () => {
      expect(resolveResponsibleGender({ communityLabel: 'Ir∴' })).toBe('masculino');
      expect(resolveResponsibleGender({ communityLabel: 'Sobrinho' })).toBe('masculino');
      expect(resolveResponsibleGender({ eligibilityType: 'mason_family', familyRelationship: 'filho' })).toBe('masculino');
    });
  });

  describe('resolveTreatmentLabel', () => {
    it('retorna Cunhada', () => {
      expect(resolveTreatmentLabel({ communityLabel: 'Cunhada' })).toBe('Cunhada');
      expect(resolveTreatmentLabel({ eligibilityType: 'mason_spouse' })).toBe('Cunhada');
    });

    it('retorna Sobrinha', () => {
      expect(resolveTreatmentLabel({ communityLabel: 'Sobrinha' })).toBe('Sobrinha');
      expect(resolveTreatmentLabel({ familyRelationship: 'filha' })).toBe('Sobrinha');
    });

    it('retorna Sobrinho', () => {
      expect(resolveTreatmentLabel({ communityLabel: 'Sobrinho' })).toBe('Sobrinho');
      expect(resolveTreatmentLabel({ eligibilityType: 'mason_family' })).toBe('Sobrinho');
    });

    it('retorna Ir∴', () => {
      expect(resolveTreatmentLabel({ communityLabel: 'Ir∴' })).toBe('Ir∴');
      expect(resolveTreatmentLabel({ communityLabel: 'Irmão' })).toBe('Ir∴');
      expect(resolveTreatmentLabel({})).toBe('Ir∴');
    });
  });

  describe('resolveResponsibleRole - Regras do Usuário', () => {
    // 1. Irmão: Proprietário ou Profissão conforme categoria
    it('Irmão - retorna Profissão no masculino quando categoria corresponde', () => {
      const roleAdv = resolveResponsibleRole({
        communityLabel: 'Ir∴',
        category: 'Escritório de Advocacia',
      });
      expect(roleAdv).toBe('Advogado');

      const roleMed = resolveResponsibleRole({
        communityLabel: 'Ir∴',
        category: 'Clínica Médica',
      });
      expect(roleMed).toBe('Médico');

      const roleDent = resolveResponsibleRole({
        communityLabel: 'Ir∴',
        category: 'Consultório Odontológico',
      });
      expect(roleDent).toBe('Cirurgião-Dentista');
    });

    it('Irmão - retorna Proprietário quando categoria não possui profissão liberal específica', () => {
      const roleRest = resolveResponsibleRole({
        communityLabel: 'Ir∴',
        category: 'Restaurante e Gastronomia',
      });
      expect(roleRest).toBe('Proprietário');
    });

    // 2. Cunhada: Proprietária ou profissão que exerce conforme a categoria
    it('Cunhada - retorna Profissão no feminino quando categoria corresponde', () => {
      const roleAdv = resolveResponsibleRole({
        communityLabel: 'Cunhada',
        category: 'Escritório de Advocacia',
      });
      expect(roleAdv).toBe('Advogada');

      const roleMed = resolveResponsibleRole({
        communityLabel: 'Cunhada',
        category: 'Medicina e Saúde',
      });
      expect(roleMed).toBe('Médica');

      const roleArq = resolveResponsibleRole({
        communityLabel: 'Cunhada',
        category: 'Arquitetura e Urbanismo',
      });
      expect(roleArq).toBe('Arquiteta');
    });

    it('Cunhada - retorna Proprietária quando categoria não possui profissão específica', () => {
      const roleLoja = resolveResponsibleRole({
        communityLabel: 'Cunhada',
        category: 'Moda e Vestuário',
      });
      expect(roleLoja).toBe('Proprietária');
    });

    // 3. Sobrinho: Proprietário ou Profissão conforme categoria
    it('Sobrinho - retorna Profissão no masculino ou Proprietário', () => {
      const roleEng = resolveResponsibleRole({
        communityLabel: 'Sobrinho',
        category: 'Engenharia Civil',
      });
      expect(roleEng).toBe('Engenheiro');

      const roleAuto = resolveResponsibleRole({
        communityLabel: 'Sobrinho',
        category: 'Auto Peças e Mecânica Geral',
      });
      expect(roleAuto).toBe('Mecânico Especialista');

      const roleComercio = resolveResponsibleRole({
        communityLabel: 'Sobrinho',
        category: 'Distribuidora de Bebidas',
      });
      expect(roleComercio).toBe('Proprietário');
    });

    // 4. Sobrinha: Proprietária ou Profissão conforme categoria
    it('Sobrinha - retorna Profissão no feminino ou Proprietária', () => {
      const rolePsi = resolveResponsibleRole({
        communityLabel: 'Sobrinha',
        category: 'Psicologia Clínica',
      });
      expect(rolePsi).toBe('Psicóloga');

      const roleCont = resolveResponsibleRole({
        communityLabel: 'Sobrinha',
        category: 'Contabilidade e Auditoria',
      });
      expect(roleCont).toBe('Contadora');

      const roleComercio = resolveResponsibleRole({
        communityLabel: 'Sobrinha',
        category: 'Floricultura e Decoração',
      });
      expect(roleComercio).toBe('Proprietária');
    });

    it('ajusta concordância de gênero para papéis personalizados', () => {
      expect(
        resolveResponsibleRole({
          communityLabel: 'Cunhada',
          businessRole: 'Sócio',
        })
      ).toBe('Sócia');

      expect(
        resolveResponsibleRole({
          communityLabel: 'Sobrinha',
          businessRole: 'Diretor',
        })
      ).toBe('Diretora');

      expect(
        resolveResponsibleRole({
          communityLabel: 'Ir∴',
          businessRole: 'Sócia',
        })
      ).toBe('Sócio');
    });
  });
});

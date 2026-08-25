import { describe, it, expect } from 'vitest';
import { validateMasonicStep } from '../src/lib/masonic/masonic-affiliation';

describe('ONBOARDING ANUNCIANTE — PASSO 1 & CIMB OPCIONAL', () => {
  it('1. Aceita vínculo de Irmão Maçom com CIMB em branco (CIMB Opcional)', () => {
    const errors = validateMasonicStep({
      status: 'mason',
      isActive: true,
      cimbCode: '', // Em branco (opcional)
      lodgeName: 'Loja Simbólica 13 de Maio',
      chapterName: '',
      spouseMasonName: '',
      masonicConsent: true,
    });

    expect(errors.cimbCode).toBeUndefined();
    expect(errors.status).toBeUndefined();
  });

  it('2. Valida CIMB somente se o usuário preencher algo (CIMB curto gera alerta)', () => {
    const errors = validateMasonicStep({
      status: 'mason',
      isActive: true,
      cimbCode: '12', // Curto
      lodgeName: 'Loja Simbólica 13 de Maio',
      chapterName: '',
      spouseMasonName: '',
      masonicConsent: true,
    });

    expect(errors.cimbCode).toBeDefined();
    expect(errors.cimbCode).toContain('muito curto');
  });

  it('3. Aceita CIMB preenchido corretamente com consentimento LGPD', () => {
    const errors = validateMasonicStep({
      status: 'mason',
      isActive: true,
      cimbCode: '998877',
      lodgeName: 'Loja Simbólica 13 de Maio',
      chapterName: '',
      spouseMasonName: '',
      masonicConsent: true,
    });

    expect(errors.cimbCode).toBeUndefined();
    expect(errors.consent).toBeUndefined();
  });
});

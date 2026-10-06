import { describe, expect, it } from 'vitest';
import { appendSignatureImageToContractText, contractTextForPlainDisplay } from '../src/lib/contracts/contract-template-renderer';

const SIGNATURE = `data:image/png;base64,${'A'.repeat(300)}`;

describe('bloco de assinatura do contrato', () => {
  it('mostra razão social, nome completo e CPF do representante', () => {
    const text = appendSignatureImageToContractText('Corpo do contrato', SIGNATURE, 'Fantasia', 'Razão Social Ltda', 'Maria da Silva', {
      cpf: '47695161500',
      divergesFromRegistration: false,
    });
    expect(text).toContain('CONTRATANTE / RAZÃO SOCIAL: Razão Social Ltda');
    expect(text).toContain('REPRESENTANTE LEGAL: Maria da Silva');
    expect(text).toContain('CPF: 476.951.615-00');
    expect(text).not.toContain('diferentes do cadastro');
  });

  it('registra no próprio contrato quando nome ou CPF diferem do cadastro', () => {
    const text = appendSignatureImageToContractText('Corpo', SIGNATURE, 'F', 'RS Ltda', 'João Pereira', {
      cpf: '47695161500',
      divergesFromRegistration: true,
    });
    expect(text).toContain('diferentes do cadastro prévio');
  });

  it('o texto exibido na tela não traz o bloco HTML', () => {
    const text = appendSignatureImageToContractText('Corpo do contrato', SIGNATURE, 'F', 'RS', 'Maria da Silva', { cpf: '47695161500' });
    expect(contractTextForPlainDisplay(text)).toBe('Corpo do contrato');
  });
});

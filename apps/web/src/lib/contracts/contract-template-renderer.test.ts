import { describe, it, expect } from 'vitest';
import {
  renderContractTemplate,
  assertContractVariablesComplete,
  formatCurrencyBRL,
  formatVigencia,
  formatSeloPedraFundamental,
  formatDataEmissao,
  appendSignatureImageToContractText,
  contractTextForPlainDisplay,
  AdvertiserContractVariables,
} from './contract-template-renderer';

describe('contract-template-renderer', () => {
  const validVariables: AdvertiserContractVariables = {
    razao_social: 'Comércio de Materiais ABC Ltda.',
    nome_fantasia: 'Materiais ABC',
    cnpj: '12.345.678/0001-90',
    endereco: 'Rua das Flores, 123, Centro, São Paulo - SP',
    responsavel_nome: 'João da Silva',
    responsavel_cpf: '123.456.789-00',
    responsavel_email: 'joao@materiaisabc.com.br',
    responsavel_telefone: '(11) 99999-0000',
    empresa_telefone: '(11) 99999-0000',
    plano_nome: 'Plano Obreiro',
    vigencia: '12 meses',
    data_inicio_vigencia: '01/10/2026',
    valor_total: 'R$ 1.500,00',
    forma_pagamento: 'Boleto Bancário',
    parcelas: '12x',
    valor_parcela: 'R$ 125,00',
    selo_pedra_fundamental: '- **Reconhecimento Especial:** Empresa Fundadora — Pedra Fundamental',
    data_emissao: '01/10/2026',
  };

  const sampleTemplate = `# CONTRATO DE ADESÃO
Razão Social: {{razao_social}}
Nome Fantasia: {{nome_fantasia}}
CNPJ: {{cnpj}}
Endereço: {{endereco}}
Responsável: {{responsavel_nome}} ({{responsavel_cpf}})
E-mail: {{responsavel_email}}
Plano: {{plano_nome}}
Vigência: {{vigencia}}
Valor Total: {{valor_total}}
Forma de Pagamento: {{forma_pagamento}}
Parcelas: {{parcelas}}
Valor Parcela: {{valor_parcela}}
{{selo_pedra_fundamental}}
Data: {{data_emissao}}`;

  describe('renderContractTemplate', () => {
    it('substitui todas as variáveis com sucesso e sem deixar tags pendentes', () => {
      const rendered = renderContractTemplate(sampleTemplate, validVariables);

      expect(rendered).toContain('Razão Social: Comércio de Materiais ABC Ltda.');
      expect(rendered).toContain('Nome Fantasia: Materiais ABC');
      expect(rendered).toContain('CNPJ: 12.345.678/0001-90');
      expect(rendered).toContain('Responsável: João da Silva (123.456.789-00)');
      expect(rendered).toContain('Valor Total: R$ 1.500,00');
      expect(rendered).toContain('Valor Parcela: R$ 125,00');
      expect(rendered).toContain('Data: 01/10/2026');
      expect(rendered).not.toContain('{{');
      expect(rendered).not.toContain('}}');
    });

    it('funciona corretamente quando selo_pedra_fundamental é string vazia', () => {
      const varsWithoutPedra: AdvertiserContractVariables = {
        ...validVariables,
        selo_pedra_fundamental: '',
      };

      const rendered = renderContractTemplate(sampleTemplate, varsWithoutPedra);
      expect(rendered).not.toContain('Pedra Fundamental');
      expect(rendered).not.toContain('{{selo_pedra_fundamental}}');
    });

    it('renderiza aliases legados usados por versões já publicadas no Jurídico', () => {
      const legacyTemplate = `Empresa: {{empresa_anunciante}}
CNPJ: {{documento_anunciante}}
Responsável: {{responsavel_legal}}
E-mail: {{email_responsavel}}
Plano: {{plano_nome}} — {{plano_valor}} — {{vigencia}}`;

      const rendered = renderContractTemplate(legacyTemplate, validVariables);
      expect(rendered).toContain('Empresa: Comércio de Materiais ABC Ltda.');
      expect(rendered).toContain('Responsável: João da Silva');
      expect(rendered).toContain('E-mail: joao@materiaisabc.com.br');
      expect(rendered).toContain('R$ 1.500,00');
      expect(rendered).not.toContain('{{');
    });

    it('lança erro se variável obrigatória estiver faltando na validação prévia', () => {
      const invalidVars = {
        ...validVariables,
        razao_social: '',
      };

      expect(() => renderContractTemplate(sampleTemplate, invalidVars)).toThrowError(
        /Dados obrigatórios ausentes para geração do contrato: razao_social/
      );
    });

    it('lança erro caso o template possua uma variável não suportada ou não mapeada', () => {
      const templateWithUnknown = `${sampleTemplate}\nCódigo Promocional: {{codigo_cupom}}`;

      expect(() =>
        renderContractTemplate(templateWithUnknown, validVariables)
      ).toThrowError(/Variável contratual não preenchida: codigo_cupom/);
    });

    it('lança erro se template for vazio ou não-string', () => {
      expect(() => renderContractTemplate('', validVariables)).toThrowError(
        /Template contratual inválido/
      );
    });
  });

  describe('assertContractVariablesComplete', () => {
    it('passa sem erros quando todas as variáveis obrigatórias estão presentes', () => {
      expect(() => assertContractVariablesComplete(validVariables)).not.toThrow();
    });

    it('detecta múltiplos campos obrigatórios ausentes ao mesmo tempo', () => {
      const incomplete = {
        ...validVariables,
        cnpj: '',
        responsavel_cpf: '   ',
        valor_total: '',
      };

      expect(() => assertContractVariablesComplete(incomplete)).toThrowError(
        /Dados obrigatórios ausentes para geração do contrato: cnpj, responsavel_cpf, valor_total/
      );
    });
  });

  describe('appendSignatureImageToContractText', () => {
    it('anexa a assinatura acima do nome fantasia e da razao social do contratante', () => {
      const signature = `data:image/png;base64,${'A'.repeat(300)}`;
      const rendered = appendSignatureImageToContractText(
        'Contrato renderizado\n\n**Data de emissao:** 01/10/2026',
        signature,
        'Empresa Teste',
        'Empresa Teste Ltda.'
      );

      expect(rendered).toContain('<img src="data:image/png;base64,');
      expect(rendered).toContain('NOME FANTASIA: Empresa Teste');
      expect(rendered).toContain('CONTRATANTE / RAZAO SOCIAL: Empresa Teste Ltda.');
      expect(rendered.indexOf('NOME FANTASIA:')).toBeLessThan(rendered.indexOf('CONTRATANTE / RAZAO SOCIAL:'));
    });

    it('substitui bloco de assinatura anterior sem duplicar imagem', () => {
      const signature = `data:image/png;base64,${'B'.repeat(300)}`;
      const first = appendSignatureImageToContractText('Contrato renderizado', signature, 'Empresa Teste Ltda.');
      const second = appendSignatureImageToContractText(first, signature, 'Empresa Teste Ltda.');

      expect((second.match(/data-contract-signature/g) || [])).toHaveLength(1);
    });

    it('remove o bloco HTML da assinatura na visualizacao em texto puro', () => {
      const signature = `data:image/png;base64,${'C'.repeat(300)}`;
      const signed = appendSignatureImageToContractText(
        'Contrato renderizado',
        signature,
        'Empresa Teste',
        'Empresa Teste Ltda.'
      );

      expect(contractTextForPlainDisplay(signed)).toBe('Contrato renderizado');
      expect(contractTextForPlainDisplay(signed)).not.toContain('<section');
      expect(contractTextForPlainDisplay(signed)).not.toContain('data:image');
    });
  });

  describe('formatters', () => {
    it('formatCurrencyBRL formata centavos corretamente', () => {
      expect(formatCurrencyBRL(150000)).toMatch(/R\$\s*1\.500,00/);
      expect(formatCurrencyBRL(0)).toMatch(/R\$\s*0,00/);
      expect(formatCurrencyBRL(12550)).toMatch(/R\$\s*125,50/);
    });

    it('formatVigencia formata meses ou ciclos', () => {
      expect(formatVigencia(12)).toBe('12 meses');
      expect(formatVigencia(24)).toBe('24 meses');
      expect(formatVigencia('annual')).toBe('12 meses');
      expect(formatVigencia('biennial')).toBe('24 meses');
      expect(formatVigencia('12')).toBe('12 meses');
      expect(formatVigencia('36')).toBe('36 meses');
    });

    it('formatSeloPedraFundamental retorna texto padronizado ou vazio', () => {
      expect(formatSeloPedraFundamental(true)).toBe(
        '- **Reconhecimento Especial:** Empresa Fundadora — Pedra Fundamental'
      );
      expect(formatSeloPedraFundamental(false)).toBe('');
    });

    it('formatDataEmissao formata data pt-BR', () => {
      const fixedDate = new Date(2026, 9, 1, 12, 0, 0); // 01/10/2026
      const result = formatDataEmissao(fixedDate);
      expect(result).toMatch(/01\/10\/2026/);
    });
  });
});

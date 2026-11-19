import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatPrazoVigenciaExtenso, isAcaciaPlan, renderContractTemplate } from '../src/lib/contracts/contract-template-renderer';

const DOIS = 'dois anos correntes';
const UM = 'um ano corrente';

/**
 * REGRA: "dois anos correntes" só quando
 *   (a) o plano é o Acácia COM Pedra Fundamental, ou
 *   (b) o cliente escolheu pagar 2 anos (ciclo bienal / 24 meses), em qualquer plano.
 * O reconhecimento "Pedra Fundamental" da EMPRESA não estende o prazo de um plano que não é o Acácia.
 */
// Dados mínimos exigidos pelo renderizador (falha se faltar algum).
const BASE = {
  razao_social: 'Empresa X Ltda', nome_fantasia: 'Empresa X', cnpj: '00.000.000/0001-00', responsavel_nome: 'Maria Souza', responsavel_cpf: '000.000.000-00',
  responsavel_email: 'maria@x.com', vigencia: '12 meses', data_inicio_vigencia: 'a contar da data de assinatura', valor_total: 'R$ 1.000,00',
  forma_pagamento: 'Pix', parcelas: '1x', valor_parcela: 'R$ 1.000,00', data_emissao: '19/11/2026',
};

describe('prazo de vigência do contrato', () => {
  // [descrição, ciclo, "empresa tem o reconhecimento Pedra Fundamental", nome do plano, código do plano, esperado]
  const casos: Array<[string, string, boolean, string, string, string]> = [
    ['Acácia + Pedra Fundamental (ciclo anual gravado)', 'annual', true, 'Plano Acácia (Pedra Fundamental)', 'ouro', DOIS],
    ['Acácia + Pedra Fundamental (ciclo bienal)', 'biennial', true, 'Plano Acácia (Pedra Fundamental)', 'ouro', DOIS],
    ['Acácia + reconhecimento Pedra da empresa', 'annual', true, 'Plano Acácia', 'acacia', DOIS],
    ['Acácia SEM Pedra, anual', 'annual', false, 'Plano Acácia', 'acacia', UM],
    ['Acácia SEM Pedra, cliente escolheu 2 anos', 'biennial', false, 'Plano Acácia', 'acacia', DOIS],
    ['Compasso, anual', 'annual', false, 'Plano Compasso', 'compasso', UM],
    ['Esquadro, anual', 'annual', false, 'Plano Esquadro', 'esquadro', UM],
    ['Compasso com reconhecimento Pedra na EMPRESA (o erro relatado)', 'annual', true, 'Plano Compasso', 'compasso', UM],
    ['Esquadro com reconhecimento Pedra na EMPRESA (o erro relatado)', 'annual', true, 'Plano Esquadro', 'esquadro', UM],
    ['Compasso, cliente escolheu pagar 2 anos', 'biennial', false, 'Plano Compasso', 'compasso', DOIS],
    ['Esquadro, cliente escolheu pagar 2 anos', 'biennial', false, 'Plano Esquadro', 'esquadro', DOIS],
    ['Compasso, ciclo "24" e com Pedra na empresa', '24', true, 'Plano Compasso', 'compasso', DOIS],
  ];

  it.each(casos)('%s', (_desc, ciclo, pedra, nome, codigo, esperado) => {
    expect(formatPrazoVigenciaExtenso(ciclo, pedra, nome, codigo)).toBe(esperado);
  });

  it('só pelo nome do plano (sem código) também respeita a regra', () => {
    expect(formatPrazoVigenciaExtenso('annual', true, 'Plano Compasso')).toBe(UM);
    expect(formatPrazoVigenciaExtenso('annual', true, 'Plano Acácia')).toBe(DOIS);
    expect(formatPrazoVigenciaExtenso('annual', false, 'Plano Esquadro')).toBe(UM);
  });

  it('plano chamado só "Pedra Fundamental" ou código acacia_pedra_fundamental conta como Acácia + Pedra', () => {
    expect(formatPrazoVigenciaExtenso('annual', false, 'Pedra Fundamental', null)).toBe(DOIS);
    expect(formatPrazoVigenciaExtenso('annual', true, null, 'acacia_pedra_fundamental')).toBe(DOIS);
  });

  it('sem nenhuma informação do plano, vale o sinal recebido (compatibilidade com chamadas antigas)', () => {
    expect(formatPrazoVigenciaExtenso('annual', true)).toBe(DOIS);
    expect(formatPrazoVigenciaExtenso(undefined, false)).toBe(UM);
  });

  it('isAcaciaPlan reconhece os nomes e códigos do plano Acácia e nenhum outro', () => {
    for (const [code, name] of [['ouro', null], ['acacia', null], ['ouro_founder', null], ['acacia_pedra_fundamental', null], [null, 'Plano Acácia'], [null, 'Acacia']] as const) {
      expect(isAcaciaPlan(code, name)).toBe(true);
    }
    for (const [code, name] of [['compasso', 'Plano Compasso'], ['esquadro', 'Plano Esquadro'], ['prata', null], ['bronze', 'Bronze'], [null, null]] as const) {
      expect(isAcaciaPlan(code, name)).toBe(false);
    }
  });

  it('o texto do contrato sai com o prazo certo (cláusula 3.1) para Compasso com reconhecimento Pedra na empresa', () => {
    const variables: any = {
      ...BASE,
      plano_nome: 'Plano Compasso',
      selo_pedra_fundamental: '- **Reconhecimento Especial:** Empresa Fundadora — Pedra Fundamental', // reconhecimento da EMPRESA, plano é Compasso
      prazo_vigencia: formatPrazoVigenciaExtenso('annual', true, 'Plano Compasso', 'compasso'),
    };
    const out = renderContractTemplate('A vigência será de {{prazo_vigencia}}.', variables);
    expect(out).toBe('A vigência será de um ano corrente.');
  });

  it('sem a variável pronta, o texto usa o nome do plano: Compasso com selo Pedra continua em um ano', () => {
    const variables: any = {
      ...BASE,
      plano_nome: 'Plano Compasso',
      vigencia: '12 meses',
      selo_pedra_fundamental: '- **Reconhecimento Especial:** Empresa Fundadora — Pedra Fundamental',
    };
    expect(renderContractTemplate('Prazo: {{prazo_vigencia}}', variables)).toBe('Prazo: um ano corrente');
  });
});

describe('os dois pontos que montam o contrato informam o código do plano', () => {
  it('admin-contracts-service passa plan_code ao formatador (minuta e geração do snapshot)', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../src/lib/contracts/admin-contracts-service.ts'), 'utf8');
    const calls = source.match(/formatPrazoVigenciaExtenso\(/g) ?? [];
    const withPlanCode = source.match(/ctRow\.plan_name,\s*\r?\n\s*ctRow\.plan_code/g) ?? [];
    expect(calls.length).toBe(withPlanCode.length);
    expect(withPlanCode.length).toBeGreaterThanOrEqual(2);
  });
});

describe('tela de conferência comercial: Pedra Fundamental só vale com o plano Acácia', () => {
  const ui = fs.readFileSync(path.resolve(__dirname, '../src/app/admin/empresas/[id]/contratacao/commercial-onboarding-client.tsx'), 'utf8');

  it('o estado inicial de Pedra Fundamental e do ciclo exige o plano Acácia (ouro): o reconhecimento da empresa não força o ciclo bienal', () => {
    expect(ui).toMatch(/initialPedraFundamental\s*=\s*\r?\n?\s*initialPlanTier === 'ouro' &&/);
    expect(ui).toContain("savedTerms?.billing_cycle || (initialPedraFundamental ? 'biennial' : 'annual')");
    expect(ui).not.toContain("(business.is_pedra_fundamental ? 'biennial' : 'annual')");
  });

  it('trocar para um plano que não é o Acácia desliga a Pedra Fundamental e volta ao ciclo anual', () => {
    expect(ui).toMatch(/if \(plan !== 'ouro' && isPedraFundamental\) \{\s*setIsPedraFundamental\(false\);\s*setBillingCycle\('annual'\);/);
  });
});

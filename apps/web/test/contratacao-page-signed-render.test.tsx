import React from 'react';
(globalThis as any).React = React; // componentes de cliente usam o runtime automático do Next
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { appendSignatureImageToContractText } from '../src/lib/contracts/contract-template-renderer';

const SIGNATURE = `data:image/png;base64,${'iVBORw0KGgo'.repeat(40)}`;
const signedText = appendSignatureImageToContractText(
  'CONTRATANTE: teste\nRepresentante: Maria da Silva\nCPF/CNPJ: 833.587.815-34',
  SIGNATURE,
  'teste',
  'Teste Ltda',
  'Maria da Silva',
  { cpf: '83358781534', divergesFromRegistration: false },
);

vi.mock('next/image', () => ({ default: (props: any) => <img alt={props.alt} /> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('../src/lib/contracts/admin-contracts-service', () => ({
  getPublicContractByTokenAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      business_id: 'b1', business_name: 'teste', business_legal_name: 'Teste Ltda', cnpj: '833.587.815-34',
      responsavel_nome: 'Maria da Silva', responsavel_cpf: '833.587.815-34', contract_id: 'c1', contract_status: 'signed',
      commercial_status: 'contrato_assinado', snapshot_id: 's1', template_code: 'X', template_title: 'Contrato', template_version: '1',
      rendered_markdown: signedText, sha256_hash: 'abc123', created_at: '2026-10-06T18:00:00Z', expires_at: '2026-10-13T18:00:00Z',
      plan_name: 'Plano', amount_cents: 100000, formatted_amount: 'R$ 1.000,00', billing_cycle: 'Anual', payment_method: 'À vista',
      installments_count: 1, signature_image_data: SIGNATURE, signer_cpf: '83358781534', accepted_at: '2026-10-06T18:30:00Z',
    },
  }),
  signPublicContractAction: vi.fn(),
  createCommercialOnboardingChargeAction: vi.fn(),
}));
vi.mock('../src/lib/payment/commercial-onboarding-charge-service', () => ({ createCommercialOnboardingChargeAction: vi.fn() }));

describe('/contratacao/[token] com contrato assinado', () => {
  it('mostra a assinatura como imagem e não deixa o código HTML aparecer no texto', async () => {
    const { default: Page } = await import('../src/app/contratacao/[token]/page');
    const element = await Page({ params: Promise.resolve({ token: 'a'.repeat(40) }) });
    const html = renderToStaticMarkup(element);

    // o bloco técnico não aparece como texto do contrato
    expect(html).not.toContain('data-contract-signature');
    expect(html).not.toContain('&lt;section');
    expect(html).not.toContain('&lt;img');
    // a assinatura aparece como imagem de verdade, com o nome e o CPF
    expect(html).toContain('alt="Assinatura eletrônica do representante legal"');
    expect(html).toContain('Teste Ltda');
    expect(html).toContain('Maria da Silva');
    // opção de baixar/imprimir
    expect(html).toContain('Baixar / imprimir contrato');
    // o corpo do contrato continua legível
    expect(html).toContain('CONTRATANTE: teste');
  });
});

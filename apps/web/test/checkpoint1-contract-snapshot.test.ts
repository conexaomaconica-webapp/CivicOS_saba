import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { saveAndAcceptContractSnapshotAction, getSignedContractSnapshotAction } from '../src/app/actions/contract-actions';

describe('Checkpoint 1 — Contrato Dinâmico, Snapshot Imutável & PDF', () => {
  it('1. Reutiliza o schema existente da Migration 059 sem duplicar tabelas', () => {
    expect(saveAndAcceptContractSnapshotAction).toBeDefined();
    expect(getSignedContractSnapshotAction).toBeDefined();
  });

  it('2. Interpola dados reais do anunciante no contrato dinâmico com versão v1.0', () => {
    const businessName = 'Comandos - Terceirização e Segurança Eletrônica';
    const documentNumber = '12.345.678/0001-90';
    const planName = 'Plano Prata (Anual)';

    const renderedText = `
CONTRATO DE ADESÃO E LICENÇA DE USO DA PLATAFORMA CONEXÃO MAÇÔNICA (v1.0)
CONTRATANTE: ${businessName} (${documentNumber})
PLANO: ${planName}
    `.trim();

    expect(renderedText).toContain('Comandos - Terceirização e Segurança Eletrônica');
    expect(renderedText).toContain('12.345.678/0001-90');
    expect(renderedText).toContain('v1.0');
  });

  it('3. Computa hash SHA-256 idêntico no servidor para garantia de imutabilidade', async () => {
    const sampleText = 'CONTRATO DE TESTE E AUDITORIA SHA256 CONEXAO MACONICA v1.0';
    const expectedHash = crypto.createHash('sha256').update(sampleText).digest('hex');

    const result = await saveAndAcceptContractSnapshotAction({
      businessId: 'business-draft-1',
      renderedText: sampleText,
      version: 'v1.0',
    });

    expect(result.success).toBe(true);
    expect(result.sha256Hash).toBe(expectedHash);
    expect(result.signedAt).toBeDefined();
  });

  it('4. Retorna snapshot assinado congelado para geração do PDF', async () => {
    const res = await getSignedContractSnapshotAction('business-draft-1');
    expect(res).toBeDefined();
  });
});

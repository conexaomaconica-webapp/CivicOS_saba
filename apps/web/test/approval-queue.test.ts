import { describe, expect, it } from 'vitest';
import { isInApprovalQueue } from '../src/lib/admin/approval-queue';

describe('fila de análise (painel e central de aprovações usam a mesma regra)', () => {
  it('empresas publicadas, rejeitadas ou suspensas não estão na fila', () => {
    expect(isInApprovalQueue('published', 'contrato_assinado')).toBe(false);
    expect(isInApprovalQueue('rejected', 'pre_cadastro')).toBe(false);
    expect(isInApprovalQueue('suspended', null)).toBe(false);
  });

  it('rascunho, em análise e correção solicitada estão na fila', () => {
    expect(isInApprovalQueue('draft', 'contrato_assinado')).toBe(true);
    expect(isInApprovalQueue('pending_review', 'pagamento_confirmado')).toBe(true);
    expect(isInApprovalQueue('correction_requested', 'vinculo_informado')).toBe(true);
    expect(isInApprovalQueue(null, undefined)).toBe(true);
  });

  it('funil já "publicado" tira o rascunho da fila, mas em análise sempre conta', () => {
    expect(isInApprovalQueue('draft', 'publicado')).toBe(false);
    expect(isInApprovalQueue('pending_review', 'publicado')).toBe(true);
  });
});

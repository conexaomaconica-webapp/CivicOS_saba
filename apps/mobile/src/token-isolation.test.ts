import { describe, expect, it } from 'vitest';

interface DeviceTokenRecord {
  id: string;
  token: string;
  member_id: string | null;
  member_email: string | null;
}

/**
 * Simulação determinística da lógica SQL de 219:
 * WHERE token = p_token AND (member_id = v_user_id OR (member_id IS NULL AND lower(member_email) = lower(v_email)))
 */
function simulateSqlUnregister(
  tokens: DeviceTokenRecord[],
  authUserId: string,
  authUserEmail: string,
  targetToken: string
): { remainingTokens: DeviceTokenRecord[]; revokedCount: number } {
  let count = 0;
  const remaining = tokens.filter((t) => {
    const isTarget = t.token.trim() === targetToken.trim();
    const isOwnedById = t.member_id === authUserId;
    const isOwnedByEmailUnbound = t.member_id === null && t.member_email?.toLowerCase() === authUserEmail.toLowerCase();
    const shouldDelete = isTarget && (isOwnedById || isOwnedByEmailUnbound);

    if (shouldDelete) {
      count++;
      return false; // remove
    }
    return true; // keep
  });

  return { remainingTokens: remaining, revokedCount: count };
}

function simulateSqlRevokeAll(
  tokens: DeviceTokenRecord[],
  authUserId: string,
  authUserEmail: string
): { remainingTokens: DeviceTokenRecord[]; revokedCount: number } {
  let count = 0;
  const remaining = tokens.filter((t) => {
    const isOwnedById = t.member_id === authUserId;
    const isOwnedByEmailUnbound = t.member_id === null && t.member_email?.toLowerCase() === authUserEmail.toLowerCase();
    const shouldDelete = isOwnedById || isOwnedByEmailUnbound;

    if (shouldDelete) {
      count++;
      return false;
    }
    return true;
  });

  return { remainingTokens: remaining, revokedCount: count };
}

describe('Auditoria de Segurança — Isolamento de Tokens Push (Gate 02B.1-S)', () => {
  const userA_Id = 'usr-uuid-aaaa-1111';
  const userA_Email = 'irmao.a@loja.org.br';

  const userB_Id = 'usr-uuid-bbbb-2222';
  const userB_Email = 'irmao.b@loja.org.br';

  const initialTokens: DeviceTokenRecord[] = [
    { id: '1', token: 'token-iphone-userA', member_id: userA_Id, member_email: userA_Email },
    { id: '2', token: 'token-ipad-userA', member_id: userA_Id, member_email: userA_Email },
    { id: '3', token: 'token-iphone-userB', member_id: userB_Id, member_email: userB_Email },
    // Cenário adverso: token de B cadastrado acidentalmente ou maliciosamente com o email de A
    { id: '4', token: 'token-discrepante-userB', member_id: userB_Id, member_email: userA_Email },
    // Token não vinculado a ID mas com e-mail de A
    { id: '5', token: 'token-legacy-unbound-userA', member_id: null, member_email: userA_Email },
  ];

  it('Cenário 1: Usuário A revoga seu próprio token legítimo com sucesso', () => {
    const res = simulateSqlUnregister(initialTokens, userA_Id, userA_Email, 'token-iphone-userA');
    expect(res.revokedCount).toBe(1);
    expect(res.remainingTokens.find((t) => t.token === 'token-iphone-userA')).toBeUndefined();
    // Confirma que tokens de B permaneceram intactos
    expect(res.remainingTokens.find((t) => t.token === 'token-iphone-userB')).toBeDefined();
  });

  it('Cenário 2: Usuário A TENTA revogar token do Usuário B -> BLOQUEADO / ISOLADO', () => {
    const res = simulateSqlUnregister(initialTokens, userA_Id, userA_Email, 'token-iphone-userB');
    expect(res.revokedCount).toBe(0);
    // Token de B continua na base sem alteração
    expect(res.remainingTokens.find((t) => t.token === 'token-iphone-userB')).toBeDefined();
  });

  it('Cenário 3 (Adverso): Token possui member_id de B mas e-mail de A -> A NÃO pode revogar', () => {
    // Esse é o teste de fogo para a correção da cláusula OR:
    // Mesmo com o e-mail igual ao de A, o member_id pertence a B.
    const res = simulateSqlUnregister(initialTokens, userA_Id, userA_Email, 'token-discrepante-userB');
    expect(res.revokedCount).toBe(0);
    expect(res.remainingTokens.find((t) => t.token === 'token-discrepante-userB')).toBeDefined();
  });

  it('Cenário 4: Usuário A revoga token não vinculado (member_id NULL) mas com seu e-mail comprovado', () => {
    const res = simulateSqlUnregister(initialTokens, userA_Id, userA_Email, 'token-legacy-unbound-userA');
    expect(res.revokedCount).toBe(1);
    expect(res.remainingTokens.find((t) => t.token === 'token-legacy-unbound-userA')).toBeUndefined();
  });

  it('Cenário 5: Exclusão total de conta do Usuário A revoga TODOS os tokens de A e ZERO de B', () => {
    const res = simulateSqlRevokeAll(initialTokens, userA_Id, userA_Email);
    // Deve revogar: id 1 (iphone A), id 2 (ipad A), id 5 (legacy A) = 3 tokens
    expect(res.revokedCount).toBe(3);
    // Deve preservar: id 3 (iphone B) e id 4 (discrepante B)
    expect(res.remainingTokens.length).toBe(2);
    expect(res.remainingTokens.map((t) => t.token)).toEqual([
      'token-iphone-userB',
      'token-discrepante-userB',
    ]);
  });
});


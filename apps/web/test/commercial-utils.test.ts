import { describe, expect, it } from 'vitest';
import {
  addDays,
  canTransitionRepresentative,
  documentLast4,
  friendlyCommercialError,
  generateReferralCode,
  isValidEmail,
  isValidReferralCode,
  leadDedupeKey,
  normalizeEmail,
  onlyDigits,
} from '@/lib/commercial/commercial-utils';
import { permissionSatisfies } from '@/lib/commercial/access-rules';
import { isCommercialAreaPath, isCommercialStaffPath, isRepresentativePath } from '@/lib/commercial/feature-flag';
import { isNoIndexFollowPath } from '@/lib/seo/noindex-paths';

describe('Módulo comercial · utilitários puros (Gate 1C)', () => {
  it('normaliza e-mail e documento', () => {
    expect(normalizeEmail('  Joao@Padaria.COM ')).toBe('joao@padaria.com');
    expect(onlyDigits('123.456.789-09')).toBe('12345678909');
    expect(documentLast4('12.345.678/0001-95')).toBe('0195');
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('chave de duplicidade é estável, não expõe o dado e prioriza documento', () => {
    const key = 'segredo-de-teste';
    const byDoc1 = leadDedupeKey({ document: '123.456.789-09', email: 'x@y.com' }, key);
    const byDoc2 = leadDedupeKey({ document: '12345678909' }, key);
    expect(byDoc1).toBe(byDoc2);
    expect(byDoc1).toMatch(/^[0-9a-f]{64}$/);
    expect(byDoc1).not.toContain('12345678909');
    const byEmail = leadDedupeKey({ email: ' X@Y.com ' }, key);
    expect(byEmail).toBe(leadDedupeKey({ email: 'x@y.com' }, key));
    expect(byEmail).not.toBe(byDoc1);
    expect(leadDedupeKey({ email: 'x@y.com' }, 'outra-chave')).not.toBe(byEmail);
    expect(leadDedupeKey({}, key)).toBeNull();
    expect(leadDedupeKey({ document: '123' }, key)).toBeNull();
  });

  it('código de indicação: formato REP-XXXXXXXX, alfabeto sem ambiguidade, disjunto de convites', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateReferralCode();
      expect(code).toMatch(/^REP-[A-HJKMNP-Z2-9]{8}$/);
      expect(isValidReferralCode(code)).toBe(true);
    }
    expect(isValidReferralCode('ABCDEFGHJKMN')).toBe(false); // formato dos convites de cadastro
    expect(isValidReferralCode('REP-abc')).toBe(false);
    expect(generateReferralCode(() => 0)).toBe('REP-AAAAAAAA');
  });

  it('validade de indicação em dias', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    expect(addDays(base, 30).toISOString()).toBe('2026-01-31T00:00:00.000Z');
    expect(addDays(base, 60).toISOString()).toBe('2026-03-02T00:00:00.000Z');
  });

  it('transições de status do representante (créditos nunca são tocados pelo status)', () => {
    expect(canTransitionRepresentative('invited', 'active')).toBe(true);
    expect(canTransitionRepresentative('pending_review', 'active')).toBe(true);
    expect(canTransitionRepresentative('active', 'suspended')).toBe(true);
    expect(canTransitionRepresentative('suspended', 'active')).toBe(true);
    expect(canTransitionRepresentative('active', 'terminated')).toBe(true);
    expect(canTransitionRepresentative('terminated', 'active')).toBe(false);
    expect(canTransitionRepresentative('active', 'invited')).toBe(false);
    expect(canTransitionRepresentative('desconhecido', 'active')).toBe(false);
  });

  it('mensagens amigáveis para as exceções do banco e não vazam detalhes internos', () => {
    expect(friendlyCommercialError('lead_requires_activity')).toMatch(/atividade de contato/);
    expect(friendlyCommercialError('error: attribution_conflict')).toMatch(/atribuição confirmada/);
    expect(friendlyCommercialError('duplicate key value violates unique constraint "uq_commercial_leads_active_dedupe"')).toMatch(/em atendimento/);
    expect(friendlyCommercialError('relation "x" does not exist')).toBe('Não foi possível concluir a operação. Tente novamente.');
    expect(friendlyCommercialError(null)).toBe('Não foi possível concluir a operação. Tente novamente.');
  });
});

describe('Módulo comercial · permissões e rotas (Gate 1C)', () => {
  it('permissões de gestão implicam leitura do mesmo domínio (espelho da função SQL)', () => {
    expect(permissionSatisfies(['representatives.manage'], 'representatives.read')).toBe(true);
    expect(permissionSatisfies(['commissions.approve'], 'commissions.read')).toBe(true);
    expect(permissionSatisfies(['payouts.manage'], 'commissions.read')).toBe(true);
    expect(permissionSatisfies(['rules.approve'], 'rules.read')).toBe(true);
    expect(permissionSatisfies(['rules.manage'], 'rules.read')).toBe(true);
    // leitura NÃO implica gestão, e domínios não se misturam
    expect(permissionSatisfies(['representatives.read'], 'representatives.manage')).toBe(false);
    expect(permissionSatisfies(['commissions.read'], 'payouts.manage')).toBe(false);
    expect(permissionSatisfies(['documents.read'], 'commissions.read')).toBe(false);
    expect(permissionSatisfies([], 'leads.manage')).toBe(false);
  });

  it('rotas do módulo: /representante, /comercial e /r/ (noindex), sem falsos positivos', () => {
    expect(isCommercialStaffPath('/comercial')).toBe(true);
    expect(isCommercialStaffPath('/comercial/leads')).toBe(true);
    expect(isCommercialStaffPath('/comercializacao')).toBe(false);
    expect(isCommercialAreaPath('/representante/leads')).toBe(true);
    expect(isCommercialAreaPath('/comercial/acessos')).toBe(true);
    expect(isCommercialAreaPath('/admin/comercial')).toBe(false);
    expect(isRepresentativePath('/comercial')).toBe(false);
    for (const p of ['/comercial', '/comercial/leads', '/representante', '/r/REP-ABCDEFGH']) {
      expect(isNoIndexFollowPath(p), p).toBe(true);
    }
    expect(isNoIndexFollowPath('/guia')).toBe(false);
  });
});

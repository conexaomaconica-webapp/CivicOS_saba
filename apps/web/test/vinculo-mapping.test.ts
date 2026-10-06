import { describe, expect, it } from 'vitest';
import {
  bondStatusFromAffiliation,
  companyRelationshipFromResponsible,
  eligibilityFromBond,
  familyRelationshipFor,
  linkTypeFor,
} from '../src/lib/onboarding/vinculo-mapping';
import { validateResponsibleStep } from '../src/lib/onboarding/onboarding-validation';

describe('vínculo do onboarding -> modelo oficial do admin', () => {
  it('traduz a declaração do passo 1 para as opções do passo 3', () => {
    expect(bondStatusFromAffiliation('mason')).toBe('brother');
    expect(bondStatusFromAffiliation('mason_wife')).toBe('sister');
    expect(bondStatusFromAffiliation('demolay')).toBe('nephew');
    expect(bondStatusFromAffiliation('job_daughter')).toBe('nephew');
    expect(bondStatusFromAffiliation('none')).toBe('none');
    expect(bondStatusFromAffiliation('')).toBe('brother');
  });

  it('usa a elegibilidade oficial (maçom, cunhada, sobrinho)', () => {
    expect(eligibilityFromBond('brother')).toBe('mason');
    expect(eligibilityFromBond('sister')).toBe('mason_spouse');
    expect(eligibilityFromBond('nephew')).toBe('mason_family');
    expect(eligibilityFromBond('none')).toBeNull();
    expect(familyRelationshipFor('mason')).toBeNull();
    expect(familyRelationshipFor('mason_spouse')).toBe('conjuge');
    expect(familyRelationshipFor('mason_family')).toBe('sobrinho');
  });

  it('tipo de vínculo empresarial conforme a relação com a empresa', () => {
    expect(linkTypeFor('mason', 'owner')).toBe('owner');
    expect(linkTypeFor('mason', 'partner')).toBe('equity_partner');
    expect(linkTypeFor('mason', 'representative')).toBe('authorized_agent');
    expect(linkTypeFor('mason_spouse', 'owner')).toBe('family_owner');
    expect(companyRelationshipFromResponsible('representative')).toBe('representative');
    expect(companyRelationshipFromResponsible('owner')).toBe('owner');
    expect(companyRelationshipFromResponsible(undefined)).toBe('owner');
  });
});

describe('passo 1: nome completo e telefone', () => {
  const base = { email: 'maria@exemplo.com', relationship: 'owner' as const };
  it('exige nome e sobrenome', () => {
    expect(validateResponsibleStep({ ...base, name: 'Maria' }).name).toMatch(/nome completo/i);
    expect(validateResponsibleStep({ ...base, name: 'Maria da Silva' }).name).toBeUndefined();
  });
  it('valida o telefone quando informado', () => {
    expect(validateResponsibleStep({ ...base, name: 'Maria da Silva', phone: '123' }).phone).toBeTruthy();
    expect(validateResponsibleStep({ ...base, name: 'Maria da Silva', phone: '(75) 98102-8228' }).phone).toBeUndefined();
    expect(validateResponsibleStep({ ...base, name: 'Maria da Silva' }).phone).toBeUndefined();
  });
});

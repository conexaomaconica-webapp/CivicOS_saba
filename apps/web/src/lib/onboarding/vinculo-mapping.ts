import type { MasonicStatus } from '@/lib/masonic/masonic-affiliation';

/**
 * Tradução entre os vocabulários do onboarding público e o modelo oficial do vínculo (business_masonic_links), o mesmo que a
 * equipe usa em /admin/empresas/[id]/vinculo-maconico: elegibilidade mason | mason_spouse | mason_family.
 * Assim o que o anunciante declara é lido pela equipe, sem perguntar duas vezes.
 */
export type BondStatus = 'brother' | 'sister' | 'nephew' | 'none';
export type CompanyRelationship = 'owner' | 'partner' | 'representative' | 'attorney';
export type Eligibility = 'mason' | 'mason_spouse' | 'mason_family';

/** Declaração do passo 1 (maçom, cunhada, DeMolay, Filha de Jó...) -> opção do passo 3. */
export function bondStatusFromAffiliation(status: MasonicStatus | '' | undefined | null): BondStatus {
  switch (status) {
    case 'mason':
      return 'brother';
    case 'mason_wife':
      return 'sister';
    case 'demolay':
    case 'job_daughter':
      return 'nephew';
    case 'none':
      return 'none';
    default:
      return 'brother';
  }
}

export function eligibilityFromBond(status: BondStatus | string | null | undefined): Eligibility | null {
  switch (status) {
    case 'brother':
      return 'mason';
    case 'sister':
      return 'mason_spouse';
    case 'nephew':
      return 'mason_family';
    default:
      return null;
  }
}

/** Relação da pessoa com a empresa do passo 3/passo 1 -> tipo de vínculo empresarial oficial. */
export function linkTypeFor(eligibility: Eligibility, relationship: CompanyRelationship | string | null | undefined): string {
  if (eligibility !== 'mason') return 'family_owner';
  switch (relationship) {
    case 'partner':
      return 'equity_partner';
    case 'representative':
    case 'attorney':
      return 'authorized_agent';
    default:
      return 'owner';
  }
}

/** Relação declarada no passo 1 (proprietário ou representante) -> opção inicial do passo 3. */
export function companyRelationshipFromResponsible(value: string | null | undefined): CompanyRelationship {
  return value === 'representative' ? 'representative' : 'owner';
}

export function familyRelationshipFor(eligibility: Eligibility): string | null {
  if (eligibility === 'mason_spouse') return 'conjuge';
  if (eligibility === 'mason_family') return 'sobrinho';
  return null;
}

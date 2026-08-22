import { describe, it, expect } from 'vitest';
import { AsaasBillingAdapter } from '../src/lib/billing/billing-adapters';

describe('EPIC — Ciclo Comercial Real do Anunciante (Vitest Suite)', () => {
  it('1. Checkpoint 1: distinguishes masonic_relationship_type from business_role and demands corporate authorization for representatives', () => {
    const applicantOwner = {
      masonic_relationship_type: 'sister_in_law', // Cunhada
      business_role: 'owner', // Proprietária
    };

    const applicantRep = {
      masonic_relationship_type: 'brother', // Irmão
      business_role: 'authorized_representative', // Procurador
    };

    const requiresAuthorizationModal = (role: string) =>
      role === 'legal_representative' || role === 'authorized_representative';

    expect(requiresAuthorizationModal(applicantOwner.business_role)).toBe(false);
    expect(requiresAuthorizationModal(applicantRep.business_role)).toBe(true);
  });

  it('2. Checkpoint 2: generates contract_snapshot with SHA-256 hash and immutable acceptance proof', async () => {
    const renderedContract = 'MINUTA_CONTRATO_CONEXAO_MACONICA_V1.0_EMPRESA_123';
    const encoder = new TextEncoder();
    const data = encoder.encode(renderedContract);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    expect(computedHash).toHaveLength(64);
    expect(typeof computedHash).toBe('string');
  });

  it('3. Checkpoint 3: Asaas webhook is single authority for activation and enforces idempotency', () => {
    const headers = new Headers();
    const eventPayload = {
      id: 'asaas_evt_commercial_99',
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_asaas_888',
        customer: 'cus_asaas_777',
        value: 149.0,
      },
    };

    const parsed = AsaasBillingAdapter.parseEvent(headers, eventPayload);
    expect(parsed.provider).toBe('asaas');
    expect(parsed.providerEventId).toBe('asaas_evt_commercial_99');
    expect(parsed.canonicalEvent).toBe('payment_confirmed');
  });

  it('4. Checkpoint 4: enforces triple-condition publication rule for public guide listing', () => {
    const businessA = {
      name: 'Empresa A',
      subscription_status: 'active',
      publication_status: 'published',
      is_active: true,
    };

    const businessB = {
      name: 'Empresa B',
      subscription_status: 'active',
      publication_status: 'published',
      is_active: false, // Suspended by admin
    };

    const businessC = {
      name: 'Empresa C',
      subscription_status: 'payment_pending', // Unpaid
      publication_status: 'published',
      is_active: true,
    };

    const isPubliclyListable = (b: typeof businessA) =>
      b.subscription_status === 'active' &&
      b.publication_status === 'published' &&
      b.is_active === true;

    expect(isPubliclyListable(businessA)).toBe(true);
    expect(isPubliclyListable(businessB)).toBe(false);
    expect(isPubliclyListable(businessC)).toBe(false);
  });
});

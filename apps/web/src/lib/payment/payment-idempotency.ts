import { createHash } from 'crypto';

const ASAAS_EXTERNAL_REFERENCE_MAX_LENGTH = 100;

export function buildOnboardingPaymentReference(input: {
  tenantId: string;
  businessId: string;
  contractId: string;
  planCode: string;
}): string {
  const canonicalValue = [
    'onboarding_invoice',
    input.tenantId,
    input.businessId,
    input.contractId,
    input.planCode,
  ].join(':');
  const digest = createHash('sha256').update(canonicalValue).digest('hex');
  const reference = `onb_${digest}`;

  if (reference.length > ASAAS_EXTERNAL_REFERENCE_MAX_LENGTH) {
    throw new Error('PAYMENT_EXTERNAL_REFERENCE_TOO_LONG');
  }

  return reference;
}

import { toEntitlementPlanCode } from '@/lib/billing/plans-service';

/** Máximo de certificações (ISO etc.) por empresa. */
export const MAX_BUSINESS_CERTIFICATIONS = 3;

/** Certificações de mercado são um recurso exclusivo do Plano Acácia (plan_code 'ouro'). */
export function planAllowsCertifications(planCode: string | null | undefined): boolean {
  return toEntitlementPlanCode(planCode) === 'ouro';
}

export type BusinessCertification = {
  id: string;
  url: string;
  display_order: number;
};

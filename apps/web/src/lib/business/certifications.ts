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
  zoom_percent?: number;
};

export const CERTIFICATION_ZOOM_MIN = 100;
export const CERTIFICATION_ZOOM_MAX = 300;

/** Zoom (%) da arte dentro do quadro fixo; sempre entre 100 e 300. */
export function normalizeCertificationZoom(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return CERTIFICATION_ZOOM_MIN;
  return Math.min(CERTIFICATION_ZOOM_MAX, Math.max(CERTIFICATION_ZOOM_MIN, n));
}

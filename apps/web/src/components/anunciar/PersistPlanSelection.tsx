'use client';

import { useEffect } from 'react';
import {
  ADVERTISE_PLAN_COOKIE_NAME,
  encodeScopedPlanCookie,
  normalizeSelectedPlanTier,
} from '@/lib/billing/advertise-landing';

/**
 * Persiste o plano validado em cookie de caminho /anunciar, isolado por tenant.
 * Se o visitante iniciar um novo cadastro direto em /anunciar/passo-1 sem ?plan=,
 * limpa qualquer seleção residual anterior para evitar contaminação entre cadastros.
 */
export function PersistPlanSelection({
  planParam,
  tenantId,
}: {
  planParam?: string | null;
  tenantId?: string | null;
}) {
  useEffect(() => {
    const tier = normalizeSelectedPlanTier(planParam);
    if (!tier) {
      document.cookie = `${ADVERTISE_PLAN_COOKIE_NAME}=; Path=/anunciar; Max-Age=0; SameSite=Lax`;
      return;
    }
    const value = encodeURIComponent(encodeScopedPlanCookie(tenantId, tier));
    document.cookie = `${ADVERTISE_PLAN_COOKIE_NAME}=${value}; Path=/anunciar; Max-Age=86400; SameSite=Lax`;
  }, [planParam, tenantId]);

  return null;
}

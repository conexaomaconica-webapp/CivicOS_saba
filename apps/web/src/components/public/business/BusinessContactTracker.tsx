'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { classifyContactClick } from '@/lib/analytics/contact-click';
import { businessParams, gaNameForContactEvent } from '@/lib/analytics/events';
import { trackGa } from '@/lib/analytics/ga';
import { trackEvent } from '@/lib/analytics/track-client';
import type { BusinessAnalyticsContext, GaEventName, GaParams } from '@/lib/analytics/types';

type BusinessAnalytics = {
  business: BusinessAnalyticsContext;
  /** Envia um evento do GA4 já com os dados públicos da empresa. */
  track: (name: GaEventName, extra?: GaParams) => void;
};

const BusinessAnalyticsReactContext = createContext<BusinessAnalytics | null>(null);

/** Acesso ao contexto analítico da empresa. Devolve null fora de uma página de empresa (o chamador deve tolerar). */
export function useBusinessAnalytics(): BusinessAnalytics | null {
  return useContext(BusinessAnalyticsReactContext);
}

const SOURCE_PAGE = 'business_profile';

/**
 * Ponto único de medição de uma página de empresa:
 * - `view_business` ao abrir a página;
 * - clique em qualquer link de contato (WhatsApp, telefone, Instagram, site, rota), inclusive nas seções mais abaixo e no
 *   card do responsável: vai ao GA4 (com os dados da empresa) e à medição própria (analytics_events);
 * - fornece o contexto da empresa (`useBusinessAnalytics`) para compartilhar, ofertas e conexões.
 * Links que já registram a medição própria sozinhos (data-cm-tracked) não são contados de novo nela, mas continuam indo
 * ao GA4 por aqui. Não altera o layout (display: contents).
 */
export function BusinessContactTracker({ business, children }: { business: BusinessAnalyticsContext; children: React.ReactNode }) {
  const value = useMemo<BusinessAnalytics>(
    () => ({
      business,
      track: (name, extra = {}) => trackGa(name, { ...businessParams(business), source_page: SOURCE_PAGE, ...extra }),
    }),
    // O contexto só muda quando a empresa muda.
    [business.id, business.slug, business.name, business.category, business.city, business.state, business.plan, business.isPedraFundamental]
  );

  useEffect(() => {
    value.track('view_business');
  }, [value]);

  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const eventType = classifyContactClick(anchor.getAttribute('href'), window.location.host);
    if (!eventType) return;

    const gaName = gaNameForContactEvent(eventType);
    if (gaName) value.track(gaName);
    if (!anchor.hasAttribute('data-cm-tracked')) {
      trackEvent({ businessId: business.id, eventType, source: SOURCE_PAGE });
    }
  };

  return (
    <BusinessAnalyticsReactContext.Provider value={value}>
      <div className="contents" onClickCapture={onClickCapture}>
        {children}
      </div>
    </BusinessAnalyticsReactContext.Provider>
  );
}

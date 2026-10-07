'use client';

import React from 'react';
import { classifyContactClick } from '@/lib/analytics/contact-click';
import { trackEvent } from '@/lib/analytics/track-client';

/**
 * Registra o clique em qualquer link de contato dentro do perfil da empresa (WhatsApp, telefone, Instagram, redes,
 * rota, site), inclusive nas seções mais abaixo e no card do responsável. Links que já registram por conta própria
 * (marcados com data-cm-tracked) são ignorados para não contar duas vezes. Não altera o layout (display: contents).
 */
export function BusinessContactTracker({ businessId, children }: { businessId: string; children: React.ReactNode }) {
  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor || anchor.hasAttribute('data-cm-tracked')) return;
    const eventType = classifyContactClick(anchor.getAttribute('href'), window.location.host);
    if (eventType) trackEvent({ businessId, eventType, source: 'business_profile' });
  };

  return (
    <div className="contents" onClickCapture={onClickCapture}>
      {children}
    </div>
  );
}

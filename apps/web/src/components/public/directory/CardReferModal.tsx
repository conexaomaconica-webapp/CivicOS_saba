'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ReferBusinessModal } from '@/components/public/business/sections/ReferBusinessModal';
import { trackEvent } from '@/lib/analytics/track-client';

/**
 * "Indicar esta empresa" aberto a partir dos cards do Guia (mesmo modal da página da empresa: link pessoal do
 * membro, WhatsApp, copiar e compartilhar). Vai para o <body> para não sofrer com overflow/transform do card.
 * O evento `share` só é gravado quando a pessoa realmente copia, abre o WhatsApp ou compartilha.
 */
export function CardReferModal({
  businessId,
  businessName,
  businessSlug,
  source,
  onClose,
}: {
  businessId: string;
  businessName: string;
  businessSlug: string;
  source: 'directory_card' | 'directory_list';
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <ReferBusinessModal
      businessName={businessName}
      businessSlug={businessSlug}
      onClose={onClose}
      onShared={() => trackEvent({ businessId, eventType: 'share', source })}
    />,
    document.body
  );
}

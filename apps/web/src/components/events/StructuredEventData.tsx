import React from 'react';
import type { PlatformEvent } from '@/app/actions/platform-events';

interface StructuredEventDataProps {
  event: PlatformEvent;
  pageUrl: string;
}

/**
 * Injeta JSON-LD com schema Event no <head>.
 * Compatível com Google Rich Results.
 * Deve ser renderizado em Server Components apenas.
 */
export function StructuredEventData({ event, pageUrl }: StructuredEventDataProps) {
  const startDateTime = `${event.event_date}T${event.start_time}`;
  const endDateTime = event.end_time
    ? `${event.event_date}T${event.end_time}`
    : undefined;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.subtitle ?? event.description ?? '',
    startDate: startDateTime,
    ...(endDateTime ? { endDate: endDateTime } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue_name ?? 'Local a confirmar',
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.venue_address ?? '',
        addressLocality: event.city ?? 'Feira de Santana',
        addressRegion: 'BA',
        addressCountry: 'BR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Conexão Maçônica',
      url: typeof pageUrl === 'string' ? pageUrl.split('/eventos')[0] : 'https://conexaomasonica.com.br',
    },
    url: pageUrl,
    ...(event.cover_image_url ? { image: event.cover_image_url } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

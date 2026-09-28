import React from 'react';
import type { Metadata } from 'next';
import { getAdminEventListAction } from '@/app/actions/platform-events';
import { AdminEventsListClient } from '@/components/events/admin/AdminEventsListClient';

export const metadata: Metadata = {
  title: 'Eventos & RSVP · Admin Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminEventosPage() {
  const result = await getAdminEventListAction();
  const events = result.success ? (result.data ?? []) : [];

  return (
    <div className="ev-page" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      {!result.success && (
        <div style={{ padding: '1rem', background: '#FEF2F2', color: '#991B1B', borderRadius: '8px', marginBottom: '1.5rem' }}>
          Erro ao carregar eventos: {result.error}
        </div>
      )}
      <AdminEventsListClient initialEvents={events} />
    </div>
  );
}

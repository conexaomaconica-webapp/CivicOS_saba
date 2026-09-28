'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ScanLine, Edit3 } from 'lucide-react';
import { AdminEditEventModal } from './AdminEditEventModal';
import type { PlatformEvent } from '@/app/actions/platform-events';

interface Props {
  eventId: string;
  event: PlatformEvent;
}

export function AdminEventHeaderActions({ eventId, event }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
      <div className="evd-header-actions">
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="evd-btn-edit"
          id="btn-open-edit-event-modal"
        >
          <Edit3 size={16} />
          Editar Evento
        </button>

        <Link href={`/admin/eventos/${eventId}/check-in`} className="evd-btn-checkin">
          <ScanLine size={16} />
          Recepção / Check-in
        </Link>
      </div>

      {showEditModal && (
        <AdminEditEventModal
          event={event}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <style>{`
        .evd-header-actions { display: flex; gap: 0.75rem; flex-shrink: 0; align-items: center; }
        .evd-btn-edit {
          display: flex; align-items: center; gap: 0.375rem;
          padding: 0.625rem 1.125rem;
          background: #FFF; color: #1C0D10;
          border: 1.5px solid #DDD7CD; border-radius: 10px;
          font-size: 0.875rem; font-weight: 700; cursor: pointer;
          transition: all 0.15s ease;
        }
        .evd-btn-edit:hover { background: #FAF8F5; border-color: #3B0B14; }
        .evd-btn-checkin {
          display: flex; align-items: center; gap: 0.375rem;
          padding: 0.625rem 1.125rem;
          background: #3B0B14; color: #C9A227;
          border: 1px solid rgba(201,162,39,0.3); border-radius: 10px;
          font-size: 0.875rem; font-weight: 700; text-decoration: none;
          transition: opacity 0.15s;
        }
        .evd-btn-checkin:hover { opacity: 0.85; }
      `}</style>
    </>
  );
}

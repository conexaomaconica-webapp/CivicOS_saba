'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ScanLine, Edit3, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { AdminEditEventModal } from './AdminEditEventModal';
import { deletePlatformEventAction, type PlatformEvent } from '@/app/actions/platform-events';

interface Props {
  eventId: string;
  event: PlatformEvent;
}

export function AdminEventHeaderActions({ eventId, event }: Props) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    const res = await deletePlatformEventAction(eventId);
    setDeleting(false);

    if (res.success) {
      setShowDeleteConfirm(false);
      router.push('/admin/eventos');
      router.refresh();
    } else {
      setDeleteError(res.error || 'Erro ao excluir evento.');
    }
  };

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

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="evd-btn-delete"
          title="Excluir Evento"
          id="btn-open-delete-event-modal"
        >
          <Trash2 size={16} />
          Excluir
        </button>
      </div>

      {showEditModal && (
        <AdminEditEventModal
          event={event}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <div className="evd-modal-overlay" onClick={() => setShowDeleteConfirm(false)} role="dialog" aria-label="Confirmar Exclusão">
          <div className="evd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="evd-modal-header">
              <AlertTriangle size={24} className="evd-warn-icon" />
              <h3>Excluir Evento</h3>
            </div>
            <p className="evd-modal-text">
              Tem certeza que deseja excluir o evento <strong>&quot;{event.title}&quot;</strong>?
              <br />
              <span className="evd-modal-subtext">Esta ação apagará o evento e todas as inscrições associadas permanentemente.</span>
            </p>

            {deleteError && (
              <div className="evd-alert-error">
                {deleteError}
              </div>
            )}

            <div className="evd-modal-actions">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="evd-btn-modal-cancel"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="evd-btn-modal-confirm"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="evd-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Sim, Excluir Evento'
                )}
              </button>
            </div>
          </div>
        </div>
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
        .evd-btn-delete {
          display: flex; align-items: center; gap: 0.375rem;
          padding: 0.625rem 1rem;
          background: #FEF2F2; color: #991B1B;
          border: 1.5px solid #FCA5A5; border-radius: 10px;
          font-size: 0.875rem; font-weight: 700; cursor: pointer;
          transition: all 0.15s ease;
        }
        .evd-btn-delete:hover { background: #FEE2E2; border-color: #EF4444; }

        .evd-modal-overlay {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        .evd-modal-box {
          background: #FFFFFF; width: 100%; max-width: 480px;
          border-radius: 16px; padding: 1.5rem;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .evd-modal-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
        .evd-warn-icon { color: #DC2626; }
        .evd-modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #111827; }
        .evd-modal-text { font-size: 0.9375rem; color: #374151; margin-bottom: 1rem; line-height: 1.5; }
        .evd-modal-subtext { font-size: 0.8125rem; color: #6B7280; margin-top: 0.5rem; display: block; }
        .evd-alert-error { background: #FEF2F2; color: #991B1B; padding: 0.75rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
        .evd-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
        .evd-btn-modal-cancel { padding: 0.625rem 1.25rem; background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .evd-btn-modal-confirm { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #DC2626; color: #FFFFFF; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .evd-btn-modal-confirm:hover { background: #B91C1C; }
        .evd-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

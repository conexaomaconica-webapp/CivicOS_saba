'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Plus,
  ArrowRight,
  Edit3,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { AdminCreateEventModal } from './AdminCreateEventModal';
import { AdminEditEventModal } from './AdminEditEventModal';
import {
  deletePlatformEventAction,
  getPlatformEventByIdAction,
  type AdminEventListItem,
  type PlatformEvent,
} from '@/app/actions/platform-events';

interface Props {
  initialEvents: AdminEventListItem[];
}

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0));
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bahia',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    published: { label: 'Publicado', cls: 'badge-green' },
    draft:     { label: 'Rascunho', cls: 'badge-gray' },
    canceled:  { label: 'Cancelado', cls: 'badge-red' },
    archived:  { label: 'Arquivado', cls: 'badge-yellow' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'badge-gray' };
  return <span className={`ev-badge ${cls}`}>{label}</span>;
}

export function AdminEventsListClient({ initialEvents }: Props) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlatformEvent | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<AdminEventListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleOpenEdit = async (item: AdminEventListItem) => {
    setLoadingEditId(item.id);
    const res = await getPlatformEventByIdAction(item.id);
    setLoadingEditId(null);
    if (res.success && res.data) {
      setEditingEvent(res.data);
    } else {
      setEditingEvent(mapItemToPlatformEvent(item));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEvent) return;
    setIsDeleting(true);
    setDeleteError('');

    const res = await deletePlatformEventAction(deletingEvent.id);
    setIsDeleting(false);

    if (res.success) {
      setDeletingEvent(null);
      router.refresh();
    } else {
      setDeleteError(res.error || 'Erro ao excluir evento.');
    }
  };

  const mapItemToPlatformEvent = (item: AdminEventListItem): PlatformEvent => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    subtitle: null,
    description: null,
    event_date: item.event_date,
    start_time: item.start_time,
    end_time: null,
    timezone: 'America/Bahia',
    venue_name: item.venue_name,
    venue_address: null,
    city: item.city,
    cover_image_url: null,
    registration_enabled: item.registration_enabled,
    capacity: item.capacity,
  });

  return (
    <>
      <div className="ev-header">
        <div>
          <div className="ev-breadcrumb">
            <span className="ev-breadcrumb-tag">Eventos & RSVP</span>
          </div>
          <h1 className="ev-page-title">Eventos da Plataforma</h1>
          <p className="ev-page-sub">
            Gerencie eventos institucionais, crie novos eventos e acompanhe confirmações de presença.
          </p>
        </div>
        <div className="ev-header-actions">
          <button
            type="button"
            className="ev-btn-new"
            onClick={() => setShowCreateModal(true)}
            id="btn-create-new-event"
          >
            <Plus className="ev-btn-icon" size={16} />
            Novo Evento
          </button>
        </div>
      </div>

      {initialEvents.length === 0 ? (
        <div className="ev-empty">
          <CalendarDays className="ev-empty-icon" size={48} />
          <p>Nenhum evento cadastrado ainda.</p>
          <button
            type="button"
            className="ev-btn-new"
            style={{ marginTop: '1rem' }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            Criar Primeiro Evento
          </button>
        </div>
      ) : (
        <div className="ev-list">
          {initialEvents.map((event) => (
            <div key={event.id} className="ev-card">
              <div className="ev-card-main">
                <div className="ev-card-left">
                  <div className="ev-card-date-box">
                    <CalendarDays size={18} className="ev-card-date-icon" />
                    <span className="ev-card-date">{formatEventDate(event.event_date)}</span>
                  </div>
                  <h2 className="ev-card-title">{event.title}</h2>
                  {event.venue_name && (
                    <p className="ev-card-venue">{event.venue_name}{event.city ? ` · ${event.city}` : ''}</p>
                  )}
                  <div className="ev-card-badges">
                    <StatusBadge status={event.status} />
                    {!event.registration_enabled && (
                      <span className="ev-badge badge-red">Inscrições encerradas</span>
                    )}
                    {event.capacity !== null && (
                      <span className="ev-badge badge-gray">Capacidade: {event.capacity}</span>
                    )}
                  </div>
                </div>

                <div className="ev-card-right">
                  <div className="ev-stats">
                    <div className="ev-stat">
                      <Users size={14} className="ev-stat-icon" />
                      <span className="ev-stat-value">{event.total_registrations}</span>
                      <span className="ev-stat-label">Inscrições</span>
                    </div>
                    <div className="ev-stat">
                      <CheckCircle2 size={14} className="ev-stat-icon ev-stat-icon--green" />
                      <span className="ev-stat-value">{event.total_confirmed}</span>
                      <span className="ev-stat-label">Confirmados</span>
                    </div>
                    <div className="ev-stat">
                      <CheckCircle2 size={14} className="ev-stat-icon ev-stat-icon--gold" />
                      <span className="ev-stat-value">{event.total_checkins}</span>
                      <span className="ev-stat-label">Check-ins</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de Ações Rápidas por Evento */}
              <div className="ev-card-actions">
                <Link href={`/admin/eventos/${event.id}`} className="ev-action-btn ev-action-view">
                  <span>Ver Detalhes / RSVP</span>
                  <ArrowRight size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(event)}
                  disabled={loadingEditId === event.id}
                  className="ev-action-btn ev-action-edit"
                  title="Editar Evento"
                >
                  <Edit3 size={15} />
                  <span>{loadingEditId === event.id ? 'Carregando...' : 'Editar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingEvent(event)}
                  className="ev-action-btn ev-action-delete"
                  title="Excluir Evento"
                >
                  <Trash2 size={15} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação */}
      {showCreateModal && (
        <AdminCreateEventModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Modal de Edição */}
      {editingEvent && (
        <AdminEditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Modal de Exclusão */}
      {deletingEvent && (
        <div className="ev-modal-overlay" onClick={() => setDeletingEvent(null)} role="dialog" aria-label="Confirmar Exclusão">
          <div className="ev-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ev-modal-header">
              <AlertTriangle size={24} className="ev-warn-icon" />
              <h3>Excluir Evento</h3>
            </div>
            <p className="ev-modal-text">
              Tem certeza que deseja excluir o evento <strong>&quot;{deletingEvent.title}&quot;</strong>?
              <br />
              <span className="ev-modal-subtext">Esta ação excluirá o evento e todas as inscrições registradas permanentemente.</span>
            </p>

            {deleteError && (
              <div className="ev-alert-error">
                {deleteError}
              </div>
            )}

            <div className="ev-modal-actions">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="ev-btn-modal-cancel"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="ev-btn-modal-confirm"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="ev-spin" />
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
        .ev-header {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
          border-bottom: 1px solid #E5E0D8; padding-bottom: 1.25rem; margin-bottom: 2rem; flex-wrap: wrap;
        }
        .ev-breadcrumb-tag {
          display: inline-block; background: #3B0B14; color: #C9A227; font-size: 0.6875rem;
          font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 0.25rem 0.625rem; border-radius: 4px; margin-bottom: 0.5rem;
        }
        .ev-page-title { font-size: 1.75rem; font-weight: 800; color: #1C0D10; margin: 0 0 0.375rem; }
        .ev-page-sub { font-size: 0.9375rem; color: #6B5E62; margin: 0; }
        .ev-btn-new {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem;
          background: #3B0B14; color: #C9A227; border: 1px solid rgba(201,162,39,0.4);
          border-radius: 10px; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.15s;
        }
        .ev-btn-new:hover { background: #2A080E; box-shadow: 0 4px 12px rgba(59,11,20,0.15); }
        .ev-empty {
          text-align: center; padding: 4rem 2rem; background: #FAF8F5; border: 2px dashed #E5E0D8; border-radius: 16px; color: #6B5E62;
        }
        .ev-empty-icon { margin-bottom: 1rem; color: #9CA3AF; }
        .ev-list { display: flex; flex-direction: column; gap: 1.25rem; }
        .ev-card {
          background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 14px; overflow: hidden;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ev-card:hover { border-color: #3B0B14; box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
        .ev-card-main { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; gap: 1rem; flex-wrap: wrap; }
        .ev-card-left { display: flex; flex-direction: column; gap: 0.375rem; flex: 1; min-width: 260px; }
        .ev-card-date-box { display: flex; align-items: center; gap: 0.375rem; color: #3B0B14; font-size: 0.8125rem; font-weight: 700; }
        .ev-card-title { font-size: 1.125rem; font-weight: 800; color: #1C0D10; margin: 0; }
        .ev-card-venue { font-size: 0.875rem; color: #6B5E62; margin: 0; }
        .ev-card-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem; }
        .ev-badge { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; }
        .badge-green { background: #ECFDF5; color: #065F46; }
        .badge-gray { background: #F3F4F6; color: #374151; }
        .badge-red { background: #FEF2F2; color: #991B1B; }
        .badge-yellow { background: #FEF3C7; color: #92400E; }
        .ev-card-right { display: flex; align-items: center; gap: 1.5rem; }
        .ev-stats { display: flex; gap: 1rem; }
        .ev-stat { display: flex; flex-direction: column; align-items: center; background: #FAF8F5; padding: 0.5rem 0.75rem; border-radius: 8px; min-width: 70px; }
        .ev-stat-icon { color: #6B5E62; margin-bottom: 0.125rem; }
        .ev-stat-icon--green { color: #10B981; }
        .ev-stat-icon--gold { color: #C9A227; }
        .ev-stat-value { font-size: 1rem; font-weight: 800; color: #1C0D10; }
        .ev-stat-label { font-size: 0.6875rem; color: #6B5E62; font-weight: 600; }
        
        .ev-card-actions {
          display: flex; align-items: center; justify-content: flex-end; gap: 0.625rem;
          padding: 0.75rem 1.5rem; background: #FAF8F5; border-top: 1px solid #F0ECE6;
        }
        .ev-action-btn {
          display: flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem;
          border-radius: 8px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; text-decoration: none;
          transition: all 0.15s;
        }
        .ev-action-view { background: #3B0B14; color: #C9A227; }
        .ev-action-view:hover { background: #2A080E; }
        .ev-action-edit { background: #FFFFFF; color: #374151; border: 1px solid #D1D5DB; }
        .ev-action-edit:hover { background: #F3F4F6; border-color: #9CA3AF; }
        .ev-action-delete { background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; }
        .ev-action-delete:hover { background: #FEE2E2; border-color: #EF4444; }

        .ev-modal-overlay {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        .ev-modal-box {
          background: #FFFFFF; width: 100%; max-width: 480px; border-radius: 16px; padding: 1.5rem;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .ev-modal-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
        .ev-warn-icon { color: #DC2626; }
        .ev-modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #111827; }
        .ev-modal-text { font-size: 0.9375rem; color: #374151; margin-bottom: 1rem; line-height: 1.5; }
        .ev-modal-subtext { font-size: 0.8125rem; color: #6B7280; margin-top: 0.5rem; display: block; }
        .ev-alert-error { background: #FEF2F2; color: #991B1B; padding: 0.75rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
        .ev-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
        .ev-btn-modal-cancel { padding: 0.625rem 1.25rem; background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .ev-btn-modal-confirm { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #DC2626; color: #FFFFFF; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .ev-btn-modal-confirm:hover { background: #B91C1C; }
        .ev-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

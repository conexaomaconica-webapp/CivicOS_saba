import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAdminEventListAction } from '@/app/actions/platform-events';
import { CalendarDays, Users, CheckCircle2, Plus, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Eventos & RSVP · Admin Conexão Maçônica',
  robots: { index: false, follow: false },
};

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
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

export default async function AdminEventosPage() {
  const result = await getAdminEventListAction();

  const events = result.success ? (result.data ?? []) : [];

  return (
    <div className="ev-page">
      {/* Cabeçalho */}
      <div className="ev-header">
        <div>
          <div className="ev-breadcrumb">
            <span className="ev-breadcrumb-tag">Eventos & RSVP</span>
          </div>
          <h1 className="ev-page-title">Eventos da Plataforma</h1>
          <p className="ev-page-sub">
            Gerencie eventos institucionais e acompanhe as confirmações de presença.
          </p>
        </div>
        <div className="ev-header-actions">
          <button className="ev-btn-new" disabled title="Disponível em breve">
            <Plus className="ev-btn-icon" size={16} />
            Novo Evento
          </button>
        </div>
      </div>

      {!result.success && (
        <div className="ev-error-banner" role="alert">
          Erro ao carregar eventos: {result.error}
        </div>
      )}

      {/* Lista de eventos */}
      {events.length === 0 && result.success ? (
        <div className="ev-empty">
          <CalendarDays className="ev-empty-icon" size={48} />
          <p>Nenhum evento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="ev-list">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/admin/eventos/${event.id}`}
              className="ev-card"
            >
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
                <ArrowRight size={20} className="ev-card-arrow" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .ev-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 0 4rem;
        }

        .ev-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 1px solid #E5E0D8;
          padding-bottom: 1.25rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .ev-breadcrumb-tag {
          display: inline-block;
          background: #3B0B14;
          color: #C9A227;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          margin-bottom: 0.5rem;
        }

        .ev-page-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1C0D10;
          margin-bottom: 0.25rem;
        }

        .ev-page-sub {
          font-size: 0.875rem;
          color: #666;
        }

        .ev-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .ev-btn-new {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.625rem 1.125rem;
          background: #3B0B14;
          color: #C9A227;
          border: 1px solid rgba(201, 162, 39, 0.3);
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          opacity: 0.5;
        }

        .ev-btn-icon { flex-shrink: 0; }

        .ev-error-banner {
          background: #FDF2F2;
          border: 1px solid #F5C6CB;
          color: #7B1E1E;
          padding: 0.875rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .ev-empty {
          text-align: center;
          padding: 4rem 1rem;
          color: #999;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .ev-empty-icon { opacity: 0.3; }

        .ev-list {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .ev-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: #FFFFFF;
          border: 1.5px solid #E5E0D8;
          border-radius: 14px;
          padding: 1.25rem 1.5rem;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
        }

        .ev-card:hover {
          border-color: #4B161B;
          box-shadow: 0 4px 16px rgba(75, 22, 27, 0.1);
          transform: translateY(-1px);
        }

        .ev-card-left { flex: 1; min-width: 0; }

        .ev-card-date-box {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-bottom: 0.375rem;
        }

        .ev-card-date-icon { color: #C9A227; }

        .ev-card-date {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #888;
        }

        .ev-card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1C0D10;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ev-card-venue {
          font-size: 0.8125rem;
          color: #888;
          margin-bottom: 0.625rem;
        }

        .ev-card-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .ev-badge {
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.2rem 0.625rem;
          border-radius: 100px;
          letter-spacing: 0.04em;
        }

        .badge-green { background: #DCFCE7; color: #166534; }
        .badge-gray  { background: #F3F4F6; color: #6B7280; }
        .badge-red   { background: #FEE2E2; color: #991B1B; }
        .badge-yellow { background: #FEF9C3; color: #854D0E; }

        .ev-card-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-shrink: 0;
        }

        .ev-stats {
          display: flex;
          gap: 1.25rem;
        }

        .ev-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
          min-width: 48px;
        }

        .ev-stat-icon { color: #999; }
        .ev-stat-icon--green { color: #16A34A; }
        .ev-stat-icon--gold  { color: #C9A227; }

        .ev-stat-value {
          font-size: 1.125rem;
          font-weight: 800;
          color: #1C0D10;
          line-height: 1;
        }

        .ev-stat-label {
          font-size: 0.625rem;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }

        .ev-card-arrow {
          color: #CCC;
          transition: color 0.15s, transform 0.15s;
        }

        .ev-card:hover .ev-card-arrow {
          color: #4B161B;
          transform: translateX(3px);
        }

        @media (max-width: 600px) {
          .ev-card-right { display: none; }
        }
      `}</style>
    </div>
  );
}

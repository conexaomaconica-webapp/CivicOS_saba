import React, { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getAdminEventListAction,
  getAdminEventDashboardAction,
} from '@/app/actions/platform-events';
import { AdminEventRegistrationsTable } from './page-client';
import { EventRSVPDivulgacao } from '@/components/events/admin/EventRSVPDivulgacao';
import {
  Users, CheckCircle2, XCircle, CalendarCheck, Clock, Percent, ChevronLeft, ScanLine,
} from 'lucide-react';

import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listResult = await getAdminEventListAction();
  const event = listResult.data?.find((e) => e.id === id);
  return {
    title: event ? `${event.title} · Admin` : 'Evento · Admin',
    robots: { index: false, follow: false },
  };
}

function KpiCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="ev-kpi-card">
      <div className={`ev-kpi-icon-wrap ev-kpi-icon-wrap--${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="ev-kpi-value">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
        <p className="ev-kpi-label">{label}</p>
      </div>
    </div>
  );
}

function AttendeeTypeChart({ data }: { data: Record<string, number> }) {
  const LABELS: Record<string, string> = {
    macom: 'Maçom', cunhada: 'Cunhada', familiar: 'Familiar', convidado: 'Convidado',
  };
  const COLORS = ['#4B161B', '#C9A227', '#27AE60', '#2980B9'];
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return <p className="ev-chart-empty">Sem dados ainda.</p>;
  const entries = Object.entries(data);

  return (
    <div className="ev-donut-wrap">
      {entries.map(([key, val], i) => {
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return (
          <div key={key} className="ev-donut-row">
            <span className="ev-donut-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="ev-donut-label">{LABELS[key] ?? key}</span>
            <div className="ev-donut-bar-wrap">
              <div
                className="ev-donut-bar"
                style={{
                  width: `${pct}%`,
                  background: COLORS[i % COLORS.length],
                }}
              />
            </div>
            <span className="ev-donut-pct">{val} ({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
}

function SourceTable({ data }: { data: Record<string, number> }) {
  const SOURCE_LABELS: Record<string, string> = {
    whatsapp: 'WhatsApp', instagram: 'Instagram', 'convite-impresso': 'Convite Impresso',
    parceiros: 'Parceiros', direto: 'Acesso direto',
  };
  const entries = Object.entries(data);
  if (entries.length === 0) return <p className="ev-chart-empty">Sem dados de origem.</p>;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <table className="ev-src-table">
      <tbody>
        {entries.sort((a, b) => b[1] - a[1]).map(([src, count]) => (
          <tr key={src}>
            <td className="ev-src-label">{SOURCE_LABELS[src] ?? src}</td>
            <td className="ev-src-count">{count}</td>
            <td className="ev-src-pct">{total > 0 ? Math.round((count / total) * 100) : 0}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AdminEventDashboardPage({ params }: PageProps) {
  const { id } = await params;

  const [listResult, dashResult] = await Promise.all([
    getAdminEventListAction(),
    getAdminEventDashboardAction(id),
  ]);

  const event = listResult.data?.find((e) => e.id === id);
  if (!event) notFound();

  const dash = dashResult.data ?? {
    total_registrations: 0, total_confirmed: 0, total_declined: 0,
    total_checkins: 0, by_attendee_type: {}, by_source: {},
  };

  const confirmedNotChecked = Math.max(0, dash.total_confirmed - dash.total_checkins);
  const attendanceRate = dash.total_confirmed > 0
    ? ((dash.total_checkins / dash.total_confirmed) * 100).toFixed(1) + '%'
    : '0%';

  const dateFormatted = new Date(event.event_date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  const timeFormatted = event.start_time.slice(0, 5).replace(':', 'h');

  return (
    <div className="evd-page">
      {/* Breadcrumb + header */}
      <div className="evd-header">
        <Link href="/admin/eventos" className="evd-back">
          <ChevronLeft size={16} />
          <span>Todos os eventos</span>
        </Link>
        <div className="evd-header-row">
          <div>
            <h1 className="evd-title">{event.title}</h1>
            <p className="evd-meta">
              {dateFormatted} · {timeFormatted}
              {event.venue_name ? ` · ${event.venue_name}` : ''}
            </p>
          </div>
          <div className="evd-header-actions">
            <Link href={`/admin/eventos/${id}/check-in`} className="evd-btn-checkin">
              <ScanLine size={16} />
              Recepção / Check-in
            </Link>
          </div>
        </div>
      </div>

      {/* Seção de Divulgação do RSVP */}
      <EventRSVPDivulgacao
        eventSlug={event.slug}
        eventTitle={event.title}
        bySource={dash.by_source}
      />

      {/* KPIs — 6 métricas */}
      <section className="evd-kpis">
        <KpiCard label="Total de Respostas"        value={dash.total_registrations} icon={Users}          color="blue" />
        <KpiCard label="Confirmados"               value={dash.total_confirmed}     icon={CheckCircle2}  color="green" />
        <KpiCard label="Não irão"                  value={dash.total_declined}      icon={XCircle}       color="red" />
        <KpiCard label="Check-ins Realizados"      value={dash.total_checkins}      icon={CalendarCheck} color="gold" />
        <KpiCard label="Aguardando Chegada"        value={confirmedNotChecked}      icon={Clock}         color="purple" />
        <KpiCard label="Taxa Comparecimento"       value={attendanceRate}           icon={Percent}       color="teal" />
      </section>

      {/* Gráficos */}
      <div className="evd-charts">
        <div className="evd-chart-card">
          <h2 className="evd-chart-title">Por Tipo de Participante</h2>
          <AttendeeTypeChart data={dash.by_attendee_type} />
        </div>
        <div className="evd-chart-card">
          <h2 className="evd-chart-title">Por Origem (Ref)</h2>
          <SourceTable data={dash.by_source} />
        </div>
      </div>

      {/* Tabela de participantes (client) */}
      <div className="evd-registrations">
        <div className="evd-reg-header">
          <h2 className="evd-section-title">Participantes</h2>
        </div>
        <Suspense fallback={<p className="evd-loading">Carregando participantes...</p>}>
          <AdminEventRegistrationsTable eventId={id} eventTitle={event.title} />
        </Suspense>
      </div>

      <style>{`
        .evd-page { max-width: 1000px; margin: 0 auto; padding-bottom: 4rem; }

        .evd-header { margin-bottom: 1.75rem; }

        .evd-back {
          display: inline-flex; align-items: center; gap: 0.25rem;
          font-size: 0.8125rem; color: #888; text-decoration: none;
          transition: color 0.15s; margin-bottom: 0.75rem;
        }
        .evd-back:hover { color: #4B161B; }

        .evd-header-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 1rem; flex-wrap: wrap;
        }

        .evd-title { font-size: 1.5rem; font-weight: 800; color: #1C0D10; }
        .evd-meta  { font-size: 0.875rem; color: #888; margin-top: 0.25rem; }

        .evd-header-actions { display: flex; gap: 0.75rem; flex-shrink: 0; }

        .evd-btn-checkin {
          display: flex; align-items: center; gap: 0.375rem;
          padding: 0.625rem 1.125rem;
          background: #3B0B14; color: #C9A227;
          border: 1px solid rgba(201,162,39,0.3); border-radius: 10px;
          font-size: 0.875rem; font-weight: 700; text-decoration: none;
          transition: opacity 0.15s;
        }
        .evd-btn-checkin:hover { opacity: 0.85; }

        /* KPIs */
        .evd-kpis {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 0.875rem; margin-bottom: 1.75rem;
        }
        @media (min-width: 600px) { .evd-kpis { grid-template-columns: repeat(4, 1fr); } }

        .ev-kpi-card {
          background: #fff; border: 1.5px solid #E5E0D8; border-radius: 12px;
          padding: 1rem 1.125rem; display: flex; align-items: center; gap: 0.875rem;
        }

        .ev-kpi-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .ev-kpi-icon-wrap--blue  { background: #EFF6FF; color: #2563EB; }
        .ev-kpi-icon-wrap--green { background: #F0FDF4; color: #16A34A; }
        .ev-kpi-icon-wrap--red   { background: #FEF2F2; color: #DC2626; }
        .ev-kpi-icon-wrap--gold  { background: rgba(201,162,39,0.1); color: #C9A227; }

        .ev-kpi-value { font-size: 1.375rem; font-weight: 800; color: #1C0D10; }
        .ev-kpi-label { font-size: 0.75rem; color: #888; margin-top: 0.125rem; }

        /* Charts */
        .evd-charts { display: grid; grid-template-columns: 1fr; gap: 0.875rem; margin-bottom: 2rem; }
        @media (min-width: 640px) { .evd-charts { grid-template-columns: 1fr 1fr; } }

        .evd-chart-card {
          background: #fff; border: 1.5px solid #E5E0D8; border-radius: 12px; padding: 1.25rem;
        }

        .evd-chart-title {
          font-size: 0.8125rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #888; margin-bottom: 1rem;
        }

        .ev-chart-empty { font-size: 0.875rem; color: #BBB; }

        .ev-donut-wrap { display: flex; flex-direction: column; gap: 0.625rem; }

        .ev-donut-row {
          display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;
        }

        .ev-donut-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .ev-donut-label { min-width: 64px; color: #555; font-weight: 500; }
        .ev-donut-bar-wrap { flex: 1; height: 8px; background: #F0EDE6; border-radius: 4px; overflow: hidden; }
        .ev-donut-bar { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
        .ev-donut-pct { font-size: 0.75rem; color: #888; min-width: 72px; text-align: right; }

        .ev-src-table { width: 100%; border-collapse: collapse; }
        .ev-src-table tr { border-bottom: 1px solid #F0EDE6; }
        .ev-src-table tr:last-child { border-bottom: none; }
        .ev-src-label { padding: 0.5rem 0; font-size: 0.875rem; color: #444; flex: 1; }
        .ev-src-count { padding: 0.5rem 0.75rem; font-weight: 700; color: #1C0D10; font-size: 0.875rem; text-align: right; }
        .ev-src-pct   { padding: 0.5rem 0 0.5rem 0.25rem; font-size: 0.75rem; color: #999; min-width: 36px; }

        /* Registrations */
        .evd-registrations { }
        .evd-reg-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .evd-section-title { font-size: 1.0625rem; font-weight: 700; color: #1C0D10; }
        .evd-loading { font-size: 0.875rem; color: #999; padding: 2rem 0; }
      `}</style>
    </div>
  );
}

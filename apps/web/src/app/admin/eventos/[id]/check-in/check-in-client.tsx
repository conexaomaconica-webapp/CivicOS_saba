'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  getAdminEventDashboardAction,
  getAdminEventRegistrationsAction,
  adminCheckinRegistrationAction,
  adminUndoCheckinAction,
  getRegistrationByCheckinTokenAction,
  type AdminRegistrationItem,
  type AdminEventDashboard,
} from '@/app/actions/platform-events';
import { EventQRScannerModal } from '@/components/events/admin/EventQRScannerModal';
import {
  Search, ChevronLeft, CheckCircle2, AlertCircle, User,
  Camera, RotateCcw, Clock, Percent, Users
} from 'lucide-react';

interface Props {
  eventId: string;
}

type CheckinState = 'idle' | 'success' | 'already' | 'error';

interface CheckinResultDisplay {
  state: CheckinState;
  registrationId: string;
  fullName: string;
  confirmationCode: string;
  checkedInAt?: string;
  message: string;
}

const ATTENDEE_LABELS: Record<string, string> = {
  macom: 'Maçom', cunhada: 'Cunhada', familiar: 'Familiar', convidado: 'Convidado',
};

function formatCheckinTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Bahia',
    });
  } catch { return iso; }
}

export function CheckinClient({ eventId }: Props) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AdminRegistrationItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [checkinResult, setCheckinResult] = useState<CheckinResultDisplay | null>(null);
  const [doingCheckin, setDoingCheckin] = useState<string | null>(null);

  // Dashboard de presença em tempo real no topo
  const [dashboard, setDashboard] = useState<AdminEventDashboard | null>(null);

  // Modal do Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadDashboard = useCallback(async () => {
    const res = await getAdminEventDashboardAction(eventId);
    if (res.success && res.data) {
      setDashboard(res.data);
    }
  }, [eventId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setCheckinResult(null);
    setScanError(null);

    const result = await getAdminEventRegistrationsAction({
      eventId,
      search: query.trim(),
      limit:  15,
      offset: 0,
    });

    setSearching(false);
    setSearched(true);
    if (result.success) {
      setResults(result.data?.items ?? []);
    } else {
      setResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Tratar escaneamento de QR Code
  const handleScanSuccess = async (tokenOrCode: string) => {
    setShowScanner(false);
    setSearching(true);
    setCheckinResult(null);
    setScanError(null);

    const res = await getRegistrationByCheckinTokenAction(eventId, tokenOrCode);
    setSearching(false);
    setSearched(true);

    if (res.success && res.data) {
      setResults([res.data]);
    } else {
      setResults([]);
      setScanError(`Nenhum participante encontrado para o código/token: ${tokenOrCode}`);
    }
  };

  const handleCheckin = async (reg: AdminRegistrationItem) => {
    setDoingCheckin(reg.id);
    setCheckinResult(null);
    const result = await adminCheckinRegistrationAction(reg.id);
    setDoingCheckin(null);

    if (result.success && result.data) {
      const r = result.data;
      if (r.alreadyChecked) {
        setCheckinResult({
          state:            'already',
          registrationId:   r.registrationId,
          fullName:         r.fullName,
          confirmationCode: r.confirmationCode,
          checkedInAt:      r.checkedInAt,
          message:          `Participante já realizou check-in às ${formatCheckinTime(r.checkedInAt)}.`,
        });
      } else {
        setCheckinResult({
          state:            'success',
          registrationId:   r.registrationId,
          fullName:         r.fullName,
          confirmationCode: r.confirmationCode,
          checkedInAt:      r.checkedInAt,
          message:          `Check-in realizado às ${formatCheckinTime(r.checkedInAt)}.`,
        });
        // Atualiza a lista e o dashboard de métricas
        setResults((prev) =>
          prev.map((item) =>
            item.id === reg.id ? { ...item, checked_in_at: r.checkedInAt } : item
          )
        );
        loadDashboard();
      }
    } else {
      setCheckinResult({
        state:            'error',
        registrationId:   reg.id,
        fullName:         reg.full_name,
        confirmationCode: reg.confirmation_code,
        message:          result.error ?? 'Erro ao realizar check-in.',
      });
    }
  };

  const handleUndoCheckin = async (reg: AdminRegistrationItem) => {
    if (!window.confirm(`Confirma DESFAZER o check-in de "${reg.full_name}"?`)) {
      return;
    }

    setDoingCheckin(reg.id);
    setCheckinResult(null);
    const result = await adminUndoCheckinAction(reg.id);
    setDoingCheckin(null);

    if (result.success) {
      setResults((prev) =>
        prev.map((item) =>
          item.id === reg.id ? { ...item, checked_in_at: null } : item
        )
      );
      loadDashboard();
    } else {
      alert(result.error ?? 'Erro ao desfazer check-in.');
    }
  };

  const handleReset = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setCheckinResult(null);
    setScanError(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Cálculo das estatísticas do painel
  const confirmed = dashboard?.total_confirmed ?? 0;
  const present = dashboard?.total_checkins ?? 0;
  const waiting = Math.max(0, confirmed - present);
  const attendanceRate = confirmed > 0 ? ((present / confirmed) * 100).toFixed(1) + '%' : '0%';

  return (
    <div className="ci-page">
      {/* Header */}
      <div className="ci-header">
        <Link href={`/admin/eventos/${eventId}`} className="ci-back">
          <ChevronLeft size={16} />
          Voltar ao evento
        </Link>
        <h1 className="ci-title">Recepção & Check-in</h1>
        <p className="ci-sub">
          Busque por nome, WhatsApp, código CM-2026-XXXX ou escaneie o QR Code do participante.
        </p>
      </div>

      {/* Métricas rápidas da recepção */}
      <div className="ci-metrics-grid">
        <div className="ci-metric-card">
          <Users size={18} className="ci-metric-icon confirmed" />
          <div>
            <span className="ci-metric-val">{confirmed}</span>
            <span className="ci-metric-lbl">Confirmados</span>
          </div>
        </div>
        <div className="ci-metric-card">
          <CheckCircle2 size={18} className="ci-metric-icon present" />
          <div>
            <span className="ci-metric-val">{present}</span>
            <span className="ci-metric-lbl">Presentes</span>
          </div>
        </div>
        <div className="ci-metric-card">
          <Clock size={18} className="ci-metric-icon waiting" />
          <div>
            <span className="ci-metric-val">{waiting}</span>
            <span className="ci-metric-lbl">Ainda não chegaram</span>
          </div>
        </div>
        <div className="ci-metric-card">
          <Percent size={18} className="ci-metric-icon rate" />
          <div>
            <span className="ci-metric-val">{attendanceRate}</span>
            <span className="ci-metric-lbl">Comparecimento</span>
          </div>
        </div>
      </div>

      {/* Ações principais: Busca + Scanner */}
      <div className="ci-actions-bar">
        <div className="ci-search-wrap">
          <Search size={18} className="ci-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            id="checkin-search"
            type="search"
            placeholder="Nome, WhatsApp ou código..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="ci-search-input"
            autoFocus
            autoComplete="off"
          />
        </div>
        <button
          id="checkin-search-btn"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="ci-btn-search"
        >
          {searching ? 'BUSCANDO...' : 'BUSCAR'}
        </button>

        <button
          id="checkin-scan-btn"
          onClick={() => setShowScanner(true)}
          className="ci-btn-scan"
        >
          <Camera size={18} />
          LER QR CODE
        </button>
      </div>

      {scanError && (
        <div className="ci-scan-error">
          <AlertCircle size={18} />
          <span>{scanError}</span>
        </div>
      )}

      {/* Feedback principal pós check-in */}
      {checkinResult && (
        <div className={`ci-result ci-result--${checkinResult.state}`} role="status" aria-live="polite">
          {checkinResult.state === 'success' && <CheckCircle2 size={36} className="ci-result-icon" />}
          {checkinResult.state === 'already' && <AlertCircle size={36} className="ci-result-icon" />}
          {checkinResult.state === 'error'   && <AlertCircle size={36} className="ci-result-icon" />}
          <div className="ci-result-content">
            <p className="ci-result-name">{checkinResult.fullName}</p>
            <p className="ci-result-code">Código: {checkinResult.confirmationCode}</p>
            <p className="ci-result-msg">{checkinResult.message}</p>
          </div>
          <button onClick={handleReset} className="ci-reset-btn">Próximo</button>
        </div>
      )}

      {/* Lista de resultados localizados */}
      {searched && !checkinResult && (
        results.length === 0 ? (
          <div className="ci-no-results">
            <User size={36} className="ci-no-results-icon" />
            <p>Nenhum participante localizado.</p>
            <p className="ci-no-results-hint">Verifique a grafia do nome, número de WhatsApp ou código.</p>
          </div>
        ) : (
          <div className="ci-results-list">
            {results.map((reg) => {
              const hasCheckin = !!reg.checked_in_at;
              const isDoingThis = doingCheckin === reg.id;
              const isConfirmed = reg.attendance_status === 'confirmed';

              return (
                <div key={reg.id} className={`ci-card ${hasCheckin ? 'ci-card--done' : ''}`}>
                  <div className="ci-card-info">
                    <div className="ci-card-row-top">
                      <h3 className="ci-card-name">{reg.full_name}</h3>
                      <code className="ci-card-code">{reg.confirmation_code}</code>
                    </div>

                    <p className="ci-card-meta">
                      <span className="ci-tag-type">{ATTENDEE_LABELS[reg.attendee_type] ?? reg.attendee_type}</span>
                      {reg.masonic_organization && ` · ${reg.masonic_organization}`}
                      {reg.company_name && ` · ${reg.company_name}`}
                      {reg.city && ` · ${reg.city}`}
                    </p>

                    <p className="ci-card-phone">📱 {reg.whatsapp}</p>

                    {!isConfirmed && (
                      <span className="ci-tag-declined">⚠️ Inscrito como: Não comparecerá</span>
                    )}

                    {hasCheckin && (
                      <p className="ci-card-checked">
                        ✓ Check-in realizado às {formatCheckinTime(reg.checked_in_at!)}
                      </p>
                    )}
                  </div>

                  <div className="ci-card-actions">
                    {hasCheckin ? (
                      <button
                        onClick={() => handleUndoCheckin(reg)}
                        disabled={isDoingThis}
                        className="ci-btn-undo"
                        title="Desfazer check-in (Apenas Master/Sócio Admin)"
                      >
                        <RotateCcw size={14} />
                        {isDoingThis ? '...' : 'DESFAZER'}
                      </button>
                    ) : (
                      <button
                        id={`btn-confirm-${reg.id}`}
                        onClick={() => handleCheckin(reg)}
                        disabled={isDoingThis || !isConfirmed}
                        className="ci-btn-confirm"
                      >
                        <CheckCircle2 size={18} />
                        {isDoingThis ? 'CONFIRMANDO...' : 'CONFIRMAR ENTRADA'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modal leitor de QR Code */}
      <EventQRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
      />

      <style jsx>{`
        .ci-page {
          max-width: 680px;
          margin: 0 auto;
          padding-bottom: 4rem;
          color: #1e293b;
        }

        .ci-header {
          margin-bottom: 1.5rem;
        }

        .ci-back {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.85rem;
          color: #64748b;
          text-decoration: none;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .ci-back:hover {
          color: #4b161b;
        }

        .ci-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
        }

        .ci-sub {
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 2px;
        }

        /* Grid de Métricas da Recepção */
        .ci-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        @media (min-width: 600px) {
          .ci-metrics-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .ci-metric-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .ci-metric-icon {
          width: 36px;
          height: 36px;
          padding: 8px;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .ci-metric-icon.confirmed { background: #eff6ff; color: #2563eb; }
        .ci-metric-icon.present   { background: #f0fdf4; color: #16a34a; }
        .ci-metric-icon.waiting   { background: #fef3c7; color: #d97706; }
        .ci-metric-icon.rate      { background: #f0fdfa; color: #0d9488; }

        .ci-metric-val {
          display: block;
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
        }

        .ci-metric-lbl {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 600;
        }

        /* Barra de Ações: Busca + QR */
        .ci-actions-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .ci-search-wrap {
          position: relative;
          flex: 1;
          min-width: 220px;
        }

        .ci-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .ci-search-input {
          width: 100%;
          padding: 12px 12px 12px 38px;
          border: 2px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.95rem;
          background: #ffffff;
          color: #0f172a;
          font-weight: 500;
        }
        .ci-search-input:focus {
          outline: none;
          border-color: #d4af37;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
        }

        .ci-btn-search {
          background: #334155;
          color: #ffffff;
          border: none;
          padding: 0 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .ci-btn-search:hover:not(:disabled) {
          background: #1e293b;
        }

        .ci-btn-scan {
          background: linear-gradient(135deg, #d4af37 0%, #aa820a 100%);
          color: #0b0f19;
          border: none;
          padding: 0 18px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
          transition: transform 0.2s ease;
        }
        .ci-btn-scan:hover {
          transform: translateY(-1px);
        }

        .ci-scan-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        /* Result Feedback Box */
        .ci-result {
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: #ffffff;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        .ci-result--success {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
        }
        .ci-result--already {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
        }
        .ci-result--error {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        }

        .ci-result-icon {
          flex-shrink: 0;
        }

        .ci-result-content {
          flex: 1;
        }

        .ci-result-name {
          font-size: 1.2rem;
          font-weight: 800;
        }

        .ci-result-code {
          font-size: 0.85rem;
          font-family: monospace;
          opacity: 0.9;
        }

        .ci-result-msg {
          font-size: 0.95rem;
          font-weight: 600;
          margin-top: 4px;
        }

        .ci-reset-btn {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.4);
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .ci-reset-btn:hover {
          background: rgba(255, 255, 255, 0.35);
        }

        /* Sem Resultados */
        .ci-no-results {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          color: #64748b;
        }
        .ci-no-results-icon {
          color: #cbd5e1;
          margin-bottom: 8px;
        }
        .ci-no-results-hint {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 4px;
        }

        /* Cards de Participante Encontrado */
        .ci-results-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ci-card {
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color 0.2s ease;
        }
        @media (min-width: 600px) {
          .ci-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .ci-card:hover {
          border-color: #d4af37;
        }
        .ci-card--done {
          border-color: #bbf7d0;
          background: #f0fdf4;
        }

        .ci-card-info {
          flex: 1;
        }

        .ci-card-row-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .ci-card-name {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .ci-card-code {
          font-family: monospace;
          font-size: 0.8rem;
          font-weight: 700;
          color: #d4af37;
          background: #0f172a;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .ci-card-meta {
          font-size: 0.85rem;
          color: #475569;
          margin-bottom: 4px;
        }

        .ci-tag-type {
          font-weight: 700;
          color: #1e293b;
        }

        .ci-card-phone {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
        }

        .ci-tag-declined {
          display: inline-block;
          font-size: 0.75rem;
          color: #dc2626;
          font-weight: 600;
          margin-top: 4px;
        }

        .ci-card-checked {
          font-size: 0.85rem;
          font-weight: 700;
          color: #16a34a;
          margin-top: 6px;
        }

        .ci-card-actions {
          display: flex;
          align-items: center;
        }

        .ci-btn-confirm {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: #ffffff;
          border: none;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
          transition: transform 0.15s ease;
          width: 100%;
          justify-content: center;
        }
        .ci-btn-confirm:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }
        .ci-btn-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .ci-btn-undo {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.15s ease;
        }
        .ci-btn-undo:hover:not(:disabled) {
          background: #fee2e2;
        }
      `}</style>
    </div>
  );
}

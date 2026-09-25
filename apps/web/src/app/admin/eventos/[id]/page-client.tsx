'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  getAdminEventRegistrationsAction,
  exportEventRegistrationsCSVAction,
  adminCheckinRegistrationAction,
  adminUndoCheckinAction,
  type AdminRegistrationItem,
} from '@/app/actions/platform-events';
import { Search, Download, CheckCircle2, X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface Props {
  eventId: string;
  eventTitle: string;
}

const ATTENDEE_LABELS: Record<string, string> = {
  macom: 'Maçom', cunhada: 'Cunhada', familiar: 'Familiar', convidado: 'Convidado',
};

const PAGE_SIZE = 30;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia',
    });
  } catch { return iso; }
}

function getVisualStatus(reg: AdminRegistrationItem) {
  if (reg.attendance_status === 'declined') {
    return { label: 'Não irá', cls: 'reg-status--declined' };
  }
  if (reg.checked_in_at) {
    return { label: 'Presente', cls: 'reg-status--present' };
  }
  return { label: 'Aguardando chegada', cls: 'reg-status--waiting' };
}

interface DetailSheetProps {
  reg: AdminRegistrationItem;
  onClose: () => void;
}

function DetailSheet({ reg, onClose }: DetailSheetProps) {
  const statusInfo = getVisualStatus(reg);
  const rows = [
    ['Nome',            reg.full_name],
    ['WhatsApp',        reg.whatsapp],
    ['E-mail',          reg.email ?? '—'],
    ['Tipo',            ATTENDEE_LABELS[reg.attendee_type] ?? reg.attendee_type],
    ['Loja / Potência', reg.masonic_organization ?? '—'],
    ['Empresa',         reg.company_name ?? '—'],
    ['Cidade',          reg.city ?? '—'],
    ['Situação',        statusInfo.label],
    ['Código',          reg.confirmation_code],
    ['Origem',          reg.source ?? '—'],
    ['UTM Source',      reg.utm_source ?? '—'],
    ['UTM Campaign',    reg.utm_campaign ?? '—'],
    ['Check-in',        reg.checked_in_at ? formatDate(reg.checked_in_at) : 'Não realizado'],
    ['Inscrito em',     formatDate(reg.created_at)],
  ];

  return (
    <div className="detail-overlay" role="dialog" aria-label="Detalhes do participante" onClick={onClose}>
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <h3 className="detail-title">Detalhes do Participante</h3>
          <button onClick={onClose} className="detail-close" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="detail-body">
          {rows.map(([label, value]) => (
            <div key={label} className="detail-row">
              <span className="detail-label">{label}</span>
              <span className="detail-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminEventRegistrationsTable({ eventId, eventTitle }: Props) {
  const [items, setItems] = useState<AdminRegistrationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedReg, setSelectedReg] = useState<AdminRegistrationItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterPreset, setFilterPreset] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterSource, setFilterSource] = useState('');

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async (
    p: number, s: string, preset: string, type: string, city: string, source: string
  ) => {
    setLoading(true);
    setError('');

    let attendanceStatus: string | undefined = undefined;
    let hasCheckin: boolean | undefined = undefined;

    if (preset === 'confirmed') {
      attendanceStatus = 'confirmed';
    } else if (preset === 'declined') {
      attendanceStatus = 'declined';
    } else if (preset === 'presentes') {
      attendanceStatus = 'confirmed';
      hasCheckin = true;
    } else if (preset === 'sem_checkin') {
      attendanceStatus = 'confirmed';
      hasCheckin = false;
    }

    const result = await getAdminEventRegistrationsAction({
      eventId,
      search:           s || undefined,
      attendanceStatus,
      hasCheckin,
      attendeeType:     type || undefined,
      city:             city || undefined,
      source:           source || undefined,
      limit:            PAGE_SIZE,
      offset:           p * PAGE_SIZE,
    });

    setLoading(false);
    setLoaded(true);
    if (result.success && result.data) {
      setItems(result.data.items);
      setTotal(result.data.total);
    } else {
      setError(result.error ?? 'Erro ao carregar.');
    }
  }, [eventId]);

  const handleInitialLoad = () => {
    if (!loaded && !loading) {
      loadData(0, search, filterPreset, filterType, filterCity, filterSource);
    }
  };

  const reloadCurrent = () => {
    loadData(page, search, filterPreset, filterType, filterCity, filterSource);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadData(0, val, filterPreset, filterType, filterCity, filterSource);
    }, 350);
  };

  const handleFilterChange = (key: string, val: string) => {
    const newPreset = key === 'preset' ? val : filterPreset;
    const newType   = key === 'type'   ? val : filterType;
    const newCity   = key === 'city'   ? val : filterCity;
    const newSource = key === 'source' ? val : filterSource;
    if (key === 'preset') setFilterPreset(val);
    if (key === 'type')   setFilterType(val);
    if (key === 'city')   setFilterCity(val);
    if (key === 'source') setFilterSource(val);
    setPage(0);
    loadData(0, search, newPreset, newType, newCity, newSource);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadData(newPage, search, filterPreset, filterType, filterCity, filterSource);
  };

  const handleInlineCheckin = async (reg: AdminRegistrationItem) => {
    setActionLoadingId(reg.id);
    const res = await adminCheckinRegistrationAction(reg.id);
    setActionLoadingId(null);
    if (res.success) {
      reloadCurrent();
    } else {
      alert(res.error ?? 'Erro ao realizar check-in.');
    }
  };

  const handleInlineUndoCheckin = async (reg: AdminRegistrationItem) => {
    if (!window.confirm(`Tem certeza que deseja DESFAZER o check-in de "${reg.full_name}"?`)) {
      return;
    }
    setActionLoadingId(reg.id);
    const res = await adminUndoCheckinAction(reg.id);
    setActionLoadingId(null);
    if (res.success) {
      reloadCurrent();
    } else {
      alert(res.error ?? 'Erro ao desfazer check-in.');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportEventRegistrationsCSVAction(eventId, eventTitle);
    setExporting(false);
    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `participantes-${eventId.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="reg-table-wrap" onClick={handleInitialLoad}>
      {/* Filtros */}
      <div className="reg-filters">
        <div className="reg-search-wrap">
          <Search size={15} className="reg-search-icon" />
          <input
            id="reg-search"
            type="search"
            placeholder="Buscar por nome, WhatsApp ou código..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="reg-search"
            onFocus={handleInitialLoad}
          />
        </div>
        <select
          id="reg-filter-preset"
          value={filterPreset}
          onChange={(e) => handleFilterChange('preset', e.target.value)}
          className="reg-filter-select"
        >
          <option value="">Todos os status</option>
          <option value="confirmed">Confirmados</option>
          <option value="presentes">Presentes (Check-in)</option>
          <option value="sem_checkin">Confirmados sem check-in</option>
          <option value="declined">Não irão</option>
        </select>

        <select
          id="reg-filter-type"
          value={filterType}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="reg-filter-select"
        >
          <option value="">Todos os tipos</option>
          <option value="macom">Maçom</option>
          <option value="cunhada">Cunhada</option>
          <option value="familiar">Familiar</option>
          <option value="convidado">Convidado</option>
        </select>

        <button id="btn-export-csv" onClick={handleExport} disabled={exporting} className="reg-export-btn">
          <Download size={15} />
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {error && <p className="reg-error" role="alert">{error}</p>}

      {!loaded && !loading && (
        <p className="reg-hint">Clique ou pesquise para carregar os participantes.</p>
      )}

      {loading && <p className="reg-loading">Carregando participantes...</p>}

      {loaded && (
        <>
          <div className="reg-count">{total.toLocaleString('pt-BR')} participante(s) encontrado(s)</div>

          <div className="reg-table-scroll">
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>WhatsApp</th>
                  <th>Tipo</th>
                  <th>Empresa</th>
                  <th>Cidade</th>
                  <th>Situação</th>
                  <th>Origem</th>
                  <th>Check-in</th>
                  <th>Ações</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="reg-empty">Nenhum participante encontrado.</td>
                  </tr>
                ) : (
                  items.map((reg: AdminRegistrationItem) => {
                    const statusInfo = getVisualStatus(reg);
                    const isLoadingAction = actionLoadingId === reg.id;

                    return (
                      <tr key={reg.id} className="reg-row">
                        <td><code className="reg-code">{reg.confirmation_code}</code></td>
                        <td className="reg-name">{reg.full_name}</td>
                        <td>{reg.whatsapp}</td>
                        <td>{ATTENDEE_LABELS[reg.attendee_type] ?? reg.attendee_type}</td>
                        <td className="reg-ellipsis">{reg.company_name ?? '—'}</td>
                        <td>{reg.city ?? '—'}</td>
                        <td>
                          <span className={`reg-status ${statusInfo.cls}`}>{statusInfo.label}</span>
                        </td>
                        <td>{reg.source ?? 'direto'}</td>
                        <td>
                          {reg.checked_in_at ? (
                            <span className="reg-checkin-done" title={formatDate(reg.checked_in_at)}>
                              <CheckCircle2 size={13} />
                              {formatDate(reg.checked_in_at).split(' ')[1]}
                            </span>
                          ) : (
                            <span className="reg-checkin-no">Aguardando</span>
                          )}
                        </td>
                        <td>
                          {reg.attendance_status === 'confirmed' && (
                            reg.checked_in_at ? (
                              <button
                                onClick={() => handleInlineUndoCheckin(reg)}
                                disabled={isLoadingAction}
                                className="act-btn undo"
                                title="Desfazer check-in (Apenas Master/Sócio Admin)"
                              >
                                <RotateCcw size={12} />
                                {isLoadingAction ? '...' : 'Desfazer'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleInlineCheckin(reg)}
                                disabled={isLoadingAction}
                                className="act-btn checkin"
                              >
                                <CheckCircle2 size={12} />
                                {isLoadingAction ? '...' : 'Check-in'}
                              </button>
                            )
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedReg(reg)}
                            className="reg-detail-btn"
                            aria-label={`Ver detalhes de ${reg.full_name}`}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="reg-pagination">
              <button onClick={() => handlePageChange(page - 1)} disabled={page === 0} className="reg-page-btn">
                <ChevronLeft size={16} />
              </button>
              <span className="reg-page-info">Página {page + 1} de {totalPages}</span>
              <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages - 1} className="reg-page-btn">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {selectedReg && (
        <DetailSheet reg={selectedReg} onClose={() => setSelectedReg(null)} />
      )}

      <style>{`
        .reg-table-wrap { cursor: default; }

        .reg-filters {
          display: flex; gap: 0.625rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center;
        }

        .reg-search-wrap {
          position: relative; flex: 1; min-width: 200px;
        }

        .reg-search-icon {
          position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #999;
        }

        .reg-search {
          width: 100%; padding: 0.625rem 0.875rem 0.625rem 2.25rem;
          border: 1.5px solid #D5C9A6; border-radius: 8px; font-size: 0.875rem;
          background: #FAFAF8; color: #333;
        }

        .reg-search:focus {
          outline: none; border-color: #4B161B;
          box-shadow: 0 0 0 2px rgba(75,22,27,0.1);
        }

        .reg-filter-select {
          padding: 0.625rem 0.875rem; border: 1.5px solid #D5C9A6; border-radius: 8px;
          font-size: 0.8125rem; background: #FAFAF8; color: #444; cursor: pointer;
        }

        .reg-export-btn {
          display: flex; align-items: center; gap: 0.375rem;
          padding: 0.625rem 1rem; background: #F3EEDD; color: #4B161B;
          border: 1.5px solid #C9A227; border-radius: 8px; font-size: 0.8125rem;
          font-weight: 700; cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
        }

        .reg-export-btn:hover:not(:disabled) { opacity: 0.85; }
        .reg-export-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .reg-error { color: #DC2626; font-size: 0.875rem; margin-bottom: 0.75rem; }
        .reg-hint  { color: #AAA; font-size: 0.875rem; padding: 2rem 0; text-align: center; }
        .reg-loading { color: #999; font-size: 0.875rem; padding: 1rem 0; }
        .reg-count { font-size: 0.8125rem; color: #888; margin-bottom: 0.75rem; }

        .reg-table-scroll { overflow-x: auto; border-radius: 10px; border: 1.5px solid #E5E0D8; }

        .reg-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; background: #fff; }
        .reg-table th {
          padding: 0.625rem 0.875rem; text-align: left; background: #F9F7F2;
          font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: #888; border-bottom: 1px solid #E5E0D8;
          white-space: nowrap;
        }
        .reg-table td { padding: 0.625rem 0.875rem; border-bottom: 1px solid #F0EDE6; color: #333; }
        .reg-row:last-child td { border-bottom: none; }
        .reg-row:hover td { background: #FAF8F5; }

        .reg-code { font-family: monospace; font-size: 0.8125rem; color: #4B161B; font-weight: 700; }
        .reg-name { font-weight: 600; color: #1C0D10; white-space: nowrap; }
        .reg-ellipsis { max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .reg-date  { white-space: nowrap; color: #999; font-size: 0.75rem; }
        .reg-empty { text-align: center; padding: 2rem; color: #BBB; }

        .reg-status {
          display: inline-block; padding: 0.2rem 0.625rem; border-radius: 100px;
          font-size: 0.6875rem; font-weight: 700; white-space: nowrap;
        }
        .reg-status--confirmed { background: #DCFCE7; color: #166534; }
        .reg-status--present   { background: #15803D; color: #FFFFFF; }
        .reg-status--waiting   { background: #FEF3C7; color: #92400E; }
        .reg-status--declined  { background: #FEE2E2; color: #991B1B; }

        .act-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 8px; border-radius: 6px; font-size: 0.72rem;
          font-weight: 700; cursor: pointer; border: none; transition: all 0.15s ease;
          white-space: nowrap;
        }
        .act-btn.checkin {
          background: #16A34A; color: #ffffff;
        }
        .act-btn.checkin:hover {
          background: #15803D;
        }
        .act-btn.undo {
          background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;
        }
        .act-btn.undo:hover {
          background: #FEE2E2;
        }

        .reg-checkin-done {
          display: flex; align-items: center; gap: 0.25rem; color: #16A34A; font-weight: 600;
        }
        .reg-checkin-no { color: #888; font-size: 0.75rem; }

        .reg-detail-btn {
          padding: 0.25rem 0.625rem; border: 1px solid #D5C9A6; border-radius: 6px;
          background: transparent; font-size: 0.75rem; color: #666; cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .reg-detail-btn:hover { border-color: #4B161B; color: #4B161B; }

        .reg-pagination {
          display: flex; align-items: center; justify-content: center;
          gap: 1rem; margin-top: 1rem;
        }
        .reg-page-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border: 1.5px solid #D5C9A6; border-radius: 8px;
          background: #fff; cursor: pointer; transition: border-color 0.15s;
        }
        .reg-page-btn:hover:not(:disabled) { border-color: #4B161B; }
        .reg-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .reg-page-info { font-size: 0.875rem; color: #666; }

        /* Detail Sheet */
        .detail-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000;
          display: flex; align-items: flex-end; justify-content: center;
          animation: fade-in 0.15s ease;
        }
        @media (min-width: 600px) { .detail-overlay { align-items: center; } }

        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

        .detail-sheet {
          background: #fff; border-radius: 16px 16px 0 0; width: 100%; max-width: 480px;
          max-height: 85dvh; overflow-y: auto; padding: 1.5rem;
          animation: slide-up 0.2s ease;
        }
        @media (min-width: 600px) { .detail-sheet { border-radius: 16px; max-height: 80vh; } }

        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }

        .detail-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;
        }
        .detail-title { font-size: 1rem; font-weight: 700; color: #1C0D10; }
        .detail-close {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 50%; border: none;
          background: #F3F4F6; color: #666; cursor: pointer;
        }
        .detail-body { display: flex; flex-direction: column; gap: 0.625rem; }
        .detail-row { display: flex; justify-content: space-between; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid #F0EDE6; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-size: 0.8125rem; color: #888; font-weight: 600; flex-shrink: 0; }
        .detail-value { font-size: 0.8125rem; color: #333; text-align: right; word-break: break-all; }
      `}</style>
    </div>
  );
}

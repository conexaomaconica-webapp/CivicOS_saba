'use client';

import React, { useState } from 'react';
import { EventQRCodeModal } from './EventQRCodeModal';
import { downloadQRCodePNG } from '@/lib/events/qr-code';

interface EventRSVPDivulgacaoProps {
  eventSlug: string;
  eventTitle: string;
  bySource?: Record<string, number>;
}

interface TrackableLink {
  id: string;
  label: string;
  refKey: string;
}

const DEFAULT_PRESETS: TrackableLink[] = [
  { id: 'convite-impresso', label: 'Convite impresso', refKey: 'convite-impresso' },
  { id: 'whatsapp', label: 'WhatsApp', refKey: 'whatsapp' },
  { id: 'instagram', label: 'Instagram', refKey: 'instagram' },
  { id: 'parceiros', label: 'Parceiros', refKey: 'parceiros' },
];

export function EventRSVPDivulgacao({
  eventSlug,
  eventTitle,
  bySource = {},
}: EventRSVPDivulgacaoProps) {
  // Configurar base URL no browser
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://conexaomaconica.com.br';

  const mainPublicUrl = `${baseUrl}/eventos/${eventSlug}`;

  // Lista de links rastreáveis (padrão + customizados adicionados em tela)
  const [links, setLinks] = useState<TrackableLink[]>(DEFAULT_PRESETS);
  const [newOriginLabel, setNewOriginLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Estado do Modal de QR Code
  const [qrModalState, setQrModalState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    url: string;
    filename: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    url: '',
    filename: '',
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openQRCode = (title: string, subtitle: string, url: string, filenameKey: string) => {
    setQrModalState({
      isOpen: true,
      title,
      subtitle,
      url,
      filename: `qr-${eventSlug}-${filenameKey}`,
    });
  };

  const handleAddOrigin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOriginLabel.trim()) return;

    // Converte "Convite impresso" em "convite-impresso"
    const refKey = newOriginLabel
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!refKey) return;

    if (links.some((l) => l.refKey === refKey)) {
      alert('Esta origem já existe na lista.');
      return;
    }

    setLinks((prev) => [...prev, { id: refKey, label: newOriginLabel.trim(), refKey }]);
    setNewOriginLabel('');
    setShowAddForm(false);
  };

  return (
    <div className="divulgacao-card">
      <div className="divulgacao-header">
        <div>
          <h2 className="divulgacao-title">📢 Divulgação do RSVP</h2>
          <p className="divulgacao-subtitle">
            Gerencie o link público oficial e links rastreáveis por origem para convites e materiais de divulgação.
          </p>
        </div>
      </div>

      {/* Link Principal */}
      <div className="main-link-box">
        <div className="main-link-info">
          <span className="main-link-tag">LINK PÚBLICO OFICIAL</span>
          <div className="main-link-url">{mainPublicUrl}</div>
        </div>

        <div className="main-link-actions">
          <button
            className="action-btn copy"
            onClick={() => handleCopy(mainPublicUrl, 'main')}
          >
            {copiedKey === 'main' ? '✓ COPIADO' : '📋 COPIAR LINK'}
          </button>
          <a
            href={mainPublicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn open"
          >
            🔗 ABRIR PÁGINA
          </a>
          <button
            className="action-btn qr"
            onClick={() =>
              openQRCode(
                'QR Code Principal do Evento',
                eventTitle,
                mainPublicUrl,
                'oficial'
              )
            }
          >
            📱 GERAR QR CODE
          </button>
          <button
            className="action-btn download"
            onClick={() => downloadQRCodePNG(mainPublicUrl, `qr-${eventSlug}-oficial`)}
          >
            📥 BAIXAR QR CODE
          </button>
        </div>
      </div>

      {/* Seção Links Rastreáveis */}
      <div className="trackable-section">
        <div className="trackable-header">
          <div>
            <h3 className="trackable-title">🔗 Links Rastreáveis por Origem</h3>
            <p className="trackable-desc">
              Utilize os parâmetros <code className="code-tag">?ref=origem</code> para identificar a origem das confirmações.
            </p>
          </div>
          <button
            className="add-origin-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancelar' : '+ Criar link de divulgação'}
          </button>
        </div>

        {/* Formulário de Criação de Origem */}
        {showAddForm && (
          <form onSubmit={handleAddOrigin} className="add-origin-form">
            <div className="form-group">
              <label htmlFor="originName" className="form-label">
                Nome da Origem
              </label>
              <input
                id="originName"
                type="text"
                placeholder="Ex: Painel Rodoviário, Encarte Lodge, etc."
                value={newOriginLabel}
                onChange={(e) => setNewOriginLabel(e.target.value)}
                className="form-input"
                autoFocus
              />
              <span className="form-hint">
                Gerará automaticamente o parâmetro: <code className="code-tag">?ref={newOriginLabel ? newOriginLabel.toLowerCase().replace(/\s+/g, '-') : 'sua-origem'}</code>
              </span>
            </div>
            <button type="submit" className="submit-btn" disabled={!newOriginLabel.trim()}>
              Gerar Link
            </button>
          </form>
        )}

        {/* Grid de Links Rastreáveis */}
        <div className="trackable-grid">
          {links.map((link) => {
            const trackableUrl = `${mainPublicUrl}?ref=${link.refKey}`;
            const count = bySource[link.refKey] ?? bySource[link.label] ?? 0;

            return (
              <div key={link.id} className="trackable-card">
                <div className="trackable-card-top">
                  <div>
                    <h4 className="trackable-name">{link.label}</h4>
                    <span className="trackable-param">?ref={link.refKey}</span>
                  </div>
                  <div className="trackable-count-badge">
                    <span className="count-num">{count}</span>
                    <span className="count-label">confirmações</span>
                  </div>
                </div>

                <div className="trackable-card-url">{trackableUrl}</div>

                <div className="trackable-card-actions">
                  <button
                    className="card-act-btn copy"
                    onClick={() => handleCopy(trackableUrl, link.id)}
                  >
                    {copiedKey === link.id ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    className="card-act-btn qr"
                    onClick={() =>
                      openQRCode(
                        `QR Code — ${link.label}`,
                        `Origem: ?ref=${link.refKey}`,
                        trackableUrl,
                        link.refKey
                      )
                    }
                  >
                    QR Code
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de QR Code */}
      <EventQRCodeModal
        isOpen={qrModalState.isOpen}
        onClose={() => setQrModalState((prev) => ({ ...prev, isOpen: false }))}
        title={qrModalState.title}
        subtitle={qrModalState.subtitle}
        urlOrTokenText={qrModalState.url}
        filename={qrModalState.filename}
      />

      <style jsx>{`
        .divulgacao-card {
          background: #0f172a;
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          color: #f8fafc;
        }

        .divulgacao-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #d4af37;
          margin-bottom: 4px;
        }

        .divulgacao-subtitle {
          font-size: 0.9rem;
          color: #94a3b8;
          margin-bottom: 20px;
        }

        .main-link-box {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 28px;
        }

        @media (min-width: 768px) {
          .main-link-box {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .main-link-tag {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.15);
          padding: 2px 8px;
          border-radius: 4px;
          margin-bottom: 6px;
        }

        .main-link-url {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          font-family: monospace;
          word-break: break-all;
        }

        .main-link-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .action-btn {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .action-btn.copy {
          background: rgba(212, 175, 55, 0.2);
          color: #d4af37;
          border: 1px solid rgba(212, 175, 55, 0.4);
        }
        .action-btn.copy:hover {
          background: rgba(212, 175, 55, 0.35);
        }
        .action-btn.open {
          background: #334155;
          color: #f8fafc;
        }
        .action-btn.open:hover {
          background: #475569;
        }
        .action-btn.qr {
          background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
          color: #0f172a;
        }
        .action-btn.qr:hover {
          filter: brightness(1.1);
        }
        .action-btn.download {
          background: #0284c7;
          color: #fff;
        }
        .action-btn.download:hover {
          background: #0369a1;
        }

        .trackable-section {
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
          padding-top: 24px;
        }

        .trackable-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }

        .trackable-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }

        .trackable-desc {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .code-tag {
          background: #1e293b;
          color: #38bdf8;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.8rem;
        }

        .add-origin-btn {
          background: transparent;
          border: 1px solid #d4af37;
          color: #d4af37;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .add-origin-btn:hover {
          background: rgba(212, 175, 55, 0.15);
        }

        .add-origin-form {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .add-origin-form {
            flex-direction: row;
            align-items: flex-end;
          }
        }

        .form-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .form-input {
          background: #0f172a;
          border: 1px solid #475569;
          border-radius: 6px;
          padding: 8px 12px;
          color: #fff;
          font-size: 0.875rem;
        }
        .form-input:focus {
          outline: none;
          border-color: #d4af37;
        }

        .form-hint {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .submit-btn {
          background: #d4af37;
          color: #0b0f19;
          border: none;
          padding: 9px 18px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .trackable-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .trackable-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          transition: border-color 0.2s ease;
        }
        .trackable-card:hover {
          border-color: rgba(212, 175, 55, 0.4);
        }

        .trackable-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .trackable-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #ffffff;
        }

        .trackable-param {
          font-size: 0.75rem;
          color: #d4af37;
          font-family: monospace;
          background: rgba(212, 175, 55, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .trackable-count-badge {
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 8px;
          padding: 4px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 70px;
        }

        .count-num {
          font-size: 1rem;
          font-weight: 800;
          color: #38bdf8;
          line-height: 1;
        }

        .count-label {
          font-size: 0.65rem;
          color: #94a3b8;
        }

        .trackable-card-url {
          font-size: 0.75rem;
          color: #94a3b8;
          font-family: monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          background: #0f172a;
          padding: 6px 10px;
          border-radius: 6px;
        }

        .trackable-card-actions {
          display: flex;
          gap: 8px;
        }

        .card-act-btn {
          flex: 1;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }
        .card-act-btn.copy {
          background: #334155;
          color: #f8fafc;
        }
        .card-act-btn.copy:hover {
          background: #475569;
        }
        .card-act-btn.qr {
          background: rgba(212, 175, 55, 0.15);
          color: #d4af37;
          border: 1px solid rgba(212, 175, 55, 0.3);
        }
        .card-act-btn.qr:hover {
          background: rgba(212, 175, 55, 0.3);
        }
      `}</style>
    </div>
  );
}

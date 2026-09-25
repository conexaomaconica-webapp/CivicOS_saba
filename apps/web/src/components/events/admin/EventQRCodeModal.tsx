'use client';

import React, { useEffect, useState } from 'react';
import { generateQRCodeDataURL, downloadQRCodePNG, downloadQRCodeSVG } from '@/lib/events/qr-code';

interface EventQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  urlOrTokenText: string;
  filename: string;
}

export function EventQRCodeModal({
  isOpen,
  onClose,
  title,
  subtitle,
  urlOrTokenText,
  filename,
}: EventQRCodeModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !urlOrTokenText) return;
    setLoading(true);
    generateQRCodeDataURL(urlOrTokenText, 800)
      .then((url) => {
        setDataUrl(url);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, urlOrTokenText]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(urlOrTokenText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="eqr-modal-backdrop" onClick={onClose}>
      <div className="eqr-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="eqr-modal-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>

        <h3 className="eqr-modal-title">{title}</h3>
        {subtitle && <p className="eqr-modal-subtitle">{subtitle}</p>}

        <div className="eqr-qr-container">
          {loading ? (
            <div className="eqr-spinner" />
          ) : dataUrl ? (
            <img src={dataUrl} alt="QR Code" className="eqr-qr-img" />
          ) : (
            <p className="eqr-error">Erro ao gerar QR Code.</p>
          )}
        </div>

        <div className="eqr-url-box">
          <span className="eqr-url-text">{urlOrTokenText}</span>
          <button className="eqr-btn-copy" onClick={handleCopyLink}>
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        <div className="eqr-actions">
          <button
            className="eqr-btn-download png"
            onClick={() => downloadQRCodePNG(urlOrTokenText, filename)}
            disabled={loading}
          >
            📥 Baixar PNG (Alta Resolução)
          </button>
          <button
            className="eqr-btn-download svg"
            onClick={() => downloadQRCodeSVG(urlOrTokenText, filename)}
            disabled={loading}
          >
            🎨 Baixar SVG (Vetorial)
          </button>
        </div>
      </div>

      <style jsx>{`
        .eqr-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }

        .eqr-modal-card {
          background: #0f172a;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 16px;
          padding: 28px;
          max-width: 440px;
          width: 100%;
          color: #f8fafc;
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .eqr-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .eqr-modal-close:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .eqr-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #d4af37;
          margin-bottom: 4px;
        }

        .eqr-modal-subtitle {
          font-size: 0.875rem;
          color: #94a3b8;
          margin-bottom: 16px;
        }

        .eqr-qr-container {
          background: #ffffff;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          width: 240px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
        }

        .eqr-qr-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .eqr-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #d4af37;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .eqr-url-box {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 8px 12px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 20px;
        }

        .eqr-url-text {
          font-size: 0.8rem;
          color: #cbd5e1;
          font-family: monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
        }

        .eqr-btn-copy {
          background: rgba(212, 175, 55, 0.15);
          color: #d4af37;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .eqr-btn-copy:hover {
          background: rgba(212, 175, 55, 0.3);
        }

        .eqr-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .eqr-btn-download {
          width: 100%;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        .eqr-btn-download.png {
          background: linear-gradient(135deg, #d4af37 0%, #aa820a 100%);
          color: #0b0f19;
        }
        .eqr-btn-download.png:hover {
          filter: brightness(1.1);
        }
        .eqr-btn-download.svg {
          background: #334155;
          color: #f8fafc;
        }
        .eqr-btn-download.svg:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}

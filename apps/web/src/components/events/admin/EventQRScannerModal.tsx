'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Upload, X, RefreshCw } from 'lucide-react';

interface EventQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (tokenOrCode: string) => void;
}

export function EventQRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: EventQRScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (html5QrcodeRef.current) {
        await stopCamera();
      }

      const html5Qrcode = new Html5Qrcode('qr-reader-container');
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR Code detectado!
          stopCamera();
          onScanSuccess(decodedText);
        },
        () => {
          // Erro por frame - ignorar silenciosamente
        }
      );
    } catch (err) {
      console.error('[QRScanner] Erro ao acessar câmera:', err);
      setIsScanning(false);
      setCameraError(
        'Não foi possível acessar a câmera. Verifique as permissões do navegador ou utilize o envio de imagem.'
      );
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        await html5QrcodeRef.current.clear();
      } catch (e) {
        console.warn('[QRScanner] Erro ao parar câmera:', e);
      } finally {
        html5QrcodeRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5Qrcode = new Html5Qrcode('qr-reader-file-temp');
      const result = await html5Qrcode.scanFileV2(file, true);
      html5Qrcode.clear();
      if (result?.decodedText) {
        onScanSuccess(result.decodedText);
      } else {
        alert('Nenhum QR Code válido encontrado na imagem enviada.');
      }
    } catch (err) {
      console.error('[QRScanner] Erro ao ler arquivo:', err);
      alert('Não foi possível ler o QR Code do arquivo selecionado. Tente uma imagem mais nítida.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="scanner-backdrop" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <div>
            <h3 className="scanner-title">📱 Escanear QR Code</h3>
            <p className="scanner-subtitle">
              Aproxime o QR Code do participante ou envie uma imagem
            </p>
          </div>
          <button onClick={onClose} className="scanner-close-btn" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Abas: Câmera x Upload */}
        <div className="scanner-tabs">
          <button
            className={`scanner-tab ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => setActiveTab('camera')}
          >
            <Camera size={16} /> Câmera ao vivo
          </button>
          <button
            className={`scanner-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={16} /> Carregar Imagem
          </button>
        </div>

        {/* Conteúdo da Câmera */}
        {activeTab === 'camera' && (
          <div className="scanner-view">
            <div id="qr-reader-container" className="qr-reader-box" />

            {cameraError && (
              <div className="scanner-error-box">
                <p className="error-text">{cameraError}</p>
                <button onClick={startCamera} className="retry-btn">
                  <RefreshCw size={14} /> Tentar Novamente
                </button>
              </div>
            )}

            {isScanning && !cameraError && (
              <p className="scanner-hint">Aponta a câmera para o QR Code do participante</p>
            )}
          </div>
        )}

        {/* Conteúdo de Upload */}
        {activeTab === 'upload' && (
          <div className="scanner-upload-view">
            <div id="qr-reader-file-temp" style={{ display: 'none' }} />
            <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
              <Upload size={40} className="upload-icon" />
              <p className="upload-title">Clique para selecionar uma foto</p>
              <p className="upload-sub">Formatos suportados: PNG, JPG, WEBP</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden-file-input"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .scanner-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }

        .scanner-modal {
          background: #0f172a;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 16px;
          padding: 24px;
          max-width: 480px;
          width: 100%;
          color: #f8fafc;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }

        .scanner-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .scanner-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #d4af37;
          margin-bottom: 2px;
        }

        .scanner-subtitle {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .scanner-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }
        .scanner-close-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .scanner-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 1px solid #334155;
          padding-bottom: 12px;
        }

        .scanner-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid #334155;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .scanner-tab.active {
          background: rgba(212, 175, 55, 0.15);
          color: #d4af37;
          border-color: rgba(212, 175, 55, 0.4);
        }

        .scanner-view {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .qr-reader-box {
          width: 100%;
          max-width: 320px;
          min-height: 280px;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #d4af37;
        }

        .scanner-error-box {
          margin-top: 16px;
          padding: 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          text-align: center;
        }

        .error-text {
          font-size: 0.85rem;
          color: #fca5a5;
          margin-bottom: 12px;
        }

        .retry-btn {
          background: #ef4444;
          color: #fff;
          border: none;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .scanner-hint {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 12px;
        }

        .scanner-upload-view {
          padding: 20px 0;
        }

        .upload-dropzone {
          border: 2px dashed #475569;
          border-radius: 12px;
          padding: 32px 16px;
          text-align: center;
          cursor: pointer;
          background: #1e293b;
          transition: border-color 0.2s ease;
        }
        .upload-dropzone:hover {
          border-color: #d4af37;
        }

        .upload-icon {
          color: #d4af37;
          margin-bottom: 12px;
        }

        .upload-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 4px;
        }

        .upload-sub {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .hidden-file-input {
          display: none;
        }
      `}</style>
    </div>
  );
}

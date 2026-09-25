'use client';

import React, { useState } from 'react';
import {
  generateICSContent,
  downloadICSFile,
  buildShareUrl,
  shareOrCopy,
  formatConfirmationCode,
} from '@/lib/events/events-service';
import type { RSVPResult, PlatformEvent } from '@/app/actions/platform-events';
import { EventQRCodeModal } from './admin/EventQRCodeModal';

interface EventSuccessScreenProps {
  result: RSVPResult;
  event: PlatformEvent;
}

export function EventSuccessScreen({ result, event }: EventSuccessScreenProps) {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

  const isConfirmed = result.attendanceStatus === 'confirmed';
  const firstName = result.fullName.split(' ')[0] ?? result.fullName;
  const code = formatConfirmationCode(result.confirmationCode);

  // Formatar data do evento para exibição
  const eventDateFormatted = (() => {
    try {
      const [year, month, day] = event.event_date.split('-').map(Number);
      const date = new Date(year!, month! - 1, day!);
      return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Bahia',
      });
    } catch {
      return event.event_date;
    }
  })();

  const startTime = event.start_time.slice(0, 5).replace(':', 'h');

  const handleAddToCalendar = () => {
    const icsContent = generateICSContent(
      {
        title:        event.title,
        description:  event.description,
        event_date:   event.event_date,
        start_time:   event.start_time,
        end_time:     event.end_time,
        venue_name:   event.venue_name,
        venue_address: event.venue_address,
        city:         event.city,
      },
      result.confirmationCode
    );
    downloadICSFile(icsContent, `conexao-masonica-${event.slug}`);
  };

  const handleShare = async () => {
    const shareUrl = buildShareUrl(event.slug, 'compartilhamento');
    const { shared, copied } = await shareOrCopy(
      event.title,
      `${event.subtitle ?? ''}\n\n${eventDateFormatted} • ${startTime}\n${event.venue_name ?? ''}`,
      shareUrl
    );

    if (shared || copied) {
      setShareStatus(copied ? 'copied' : 'shared');
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const [showQRModal, setShowQRModal] = useState(false);
  const tokenToEncode = result.checkinToken || result.registrationId;

  return (
    <section className="success-screen" aria-live="polite">
      {/* Ícone de sucesso / cancelamento */}
      <div className={`success-icon-wrap ${isConfirmed ? 'success-icon-wrap--confirmed' : 'success-icon-wrap--declined'}`}>
        {isConfirmed ? (
          <svg className="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        ) : (
          <svg className="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
      </div>

      {/* Título de estado */}
      <h2 className="success-title">
        {isConfirmed ? 'Presença confirmada!' : 'Obrigado pelo retorno'}
      </h2>

      {/* Mensagem personalizada */}
      <p className="success-personal-message">
        {isConfirmed
          ? `${firstName}, será uma satisfação receber você.`
          : `${firstName}, lamentamos que não possa comparecer. Esperamos vê-lo em uma próxima oportunidade.`}
      </p>

      {/* Dados do evento */}
      <div className="success-event-card">
        <p className="success-event-title">{event.title}</p>
        <p className="success-event-datetime">
          {eventDateFormatted} • {startTime}
        </p>
        {event.venue_name && (
          <p className="success-event-venue">{event.venue_name}</p>
        )}
      </div>

      {/* Código de confirmação — apenas para confirmados */}
      {isConfirmed && (
        <div className="success-code-card">
          <p className="success-code-label">Código de confirmação</p>
          <p className="success-code" aria-label={`Código: ${code}`}>{code}</p>
          <p className="success-code-hint">Guarde este código. Ele será solicitado na recepção do evento.</p>
          
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="my-qr-btn"
          >
            📱 MEU QR CODE PARA CHECK-IN
          </button>
        </div>
      )}

      {/* Modal de QR Code do Participante */}
      {isConfirmed && (
        <EventQRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          title="Seu QR Code de Entrada"
          subtitle={`Apresente este QR Code na recepção para realizar seu check-in.\nCódigo: ${code}`}
          urlOrTokenText={tokenToEncode}
          filename={`qr-ingresso-${code}`}
        />
      )}

      {/* Ações — apenas para confirmados */}
      {isConfirmed && (
        <div className="success-actions">
          <button
            id="btn-add-to-calendar"
            type="button"
            onClick={handleAddToCalendar}
            className="success-btn success-btn--secondary"
          >
            <svg className="success-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            ADICIONAR À AGENDA
          </button>

          <button
            id="btn-share-invite"
            type="button"
            onClick={handleShare}
            className="success-btn success-btn--outline"
          >
            <svg className="success-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {shareStatus === 'copied'
              ? 'Link copiado!'
              : shareStatus === 'shared'
              ? 'Compartilhado!'
              : 'COMPARTILHAR CONVITE'}
          </button>
        </div>
      )}

      <style jsx>{`
        .my-qr-btn {
          margin-top: 14px;
          background: linear-gradient(135deg, #d4af37 0%, #aa820a 100%);
          color: #0b0f19;
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(212, 175, 55, 0.3);
          transition: transform 0.2s ease, filter 0.2s ease;
          width: 100%;
        }
        .my-qr-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }
      `}</style>

      {/* CTA futuro: Placeholder para integração de empresa (estrutura pronta, não implementado) */}
      {/* 
        EVOLUÇÃO FUTURA: Após confirmação bem-sucedida, exibir CTA para cadastro de empresa.
        Descomente quando o fluxo estiver implementado:

        {isConfirmed && (
          <div className="success-business-cta">
            <p className="success-business-cta-text">
              Você possui uma empresa?
            </p>
            <p className="success-business-cta-sub">
              Leve sua empresa para a Conexão Maçônica.
            </p>
            <Link href="/anunciar" className="success-business-cta-btn">
              CONHECER A CONEXÃO
            </Link>
          </div>
        )}
      */}
    </section>
  );
}

import { useState, type FormEvent } from 'react';
import {
  submitMobileEventRSVP,
  type MobileEventItem,
  type MobileEventRSVPAttendanceStatus,
  type MobileEventRSVPAttendeeType,
  type MobileEventRSVPResult,
} from './guide-data';

type MobileEventDetailScreenProps = {
  event: MobileEventItem;
  onBack: () => void;
  onSelectBusiness?: (slug: string) => void;
  onShare: (event: MobileEventItem) => Promise<void> | void;
};

type FormState = 'idle' | 'submitting' | 'success' | 'error';

type RSVPFormData = {
  fullName: string;
  whatsapp: string;
  email: string;
  attendeeType: MobileEventRSVPAttendeeType;
  masonicOrganization: string;
  companyName: string;
  city: string;
  attendanceStatus: MobileEventRSVPAttendanceStatus;
};

const INITIAL_RSVP_FORM: RSVPFormData = {
  fullName: '',
  whatsapp: '',
  email: '',
  attendeeType: 'macom',
  masonicOrganization: '',
  companyName: '',
  city: '',
  attendanceStatus: 'confirmed',
};

const ATTENDEE_TYPES: { value: MobileEventRSVPAttendeeType; label: string; icon: string }[] = [
  { value: 'macom', label: 'Maçom', icon: '🏛️' },
  { value: 'cunhada', label: 'Cunhada', icon: '🌸' },
  { value: 'familiar', label: 'Familiar', icon: '👨‍👩‍👦' },
  { value: 'convidado', label: 'Convidado Especial', icon: '🤝' },
];

const FAVORITE_EVENTS_KEY = 'cm_mobile_fav_events';

function loadFavoriteEventIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveFavoriteEventIds(ids: string[]) {
  try {
    localStorage.setItem(FAVORITE_EVENTS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

function formatFullEventDate(rawDate?: string | null, fallbackLabel?: string | null): string {
  if (rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    const [year, month, day] = rawDate.slice(0, 10).split('-').map(Number);
    if (year && month && day) {
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
  }
  return fallbackLabel || 'Data a confirmar';
}

function formatTimeDisplay(time?: string | null): string | null {
  if (!time) return null;
  const parts = time.split(':');
  if (parts.length < 2) return time;
  return `${parts[0]}h${parts[1] !== '00' ? parts[1] : ''}`;
}

function resolveDisplayOrganizer(event: MobileEventItem): {
  displayOrganizer: string;
  explanationText: string;
} {
  let displayOrganizer = event.organizer_name?.trim() || '';

  if (
    !displayOrganizer ||
    displayOrganizer.toLowerCase() === 'loja maçônica promotora' ||
    displayOrganizer.toLowerCase() === 'loja maçônica'
  ) {
    if (
      event.location_label &&
      (event.location_label.toLowerCase().includes('loja') ||
        event.location_label.toLowerCase().includes('templo') ||
        event.location_label.toLowerCase().includes('augusta') ||
        event.location_label.toLowerCase().includes('cavaleiro') ||
        event.location_label.toLowerCase().includes('calaveiro') ||
        event.location_label.toLowerCase().includes('16'))
    ) {
      displayOrganizer = event.location_label;
    } else if (event.title?.toLowerCase().includes('16')) {
      displayOrganizer = 'Loja Maçônica 16 de Junho';
    } else if (
      event.title?.toLowerCase().includes('calaveiro') ||
      event.title?.toLowerCase().includes('cavaleiro')
    ) {
      displayOrganizer = 'Loja Maçônica Cavaleiros de Aço';
    } else if (event.organizer_type === 'platform' || event.category_id === 'institucional') {
      displayOrganizer = 'Conexão Maçônica';
    } else if (event.organizer_type === 'social_action') {
      displayOrganizer = 'Ação Social Fraterna';
    } else if (event.category_id === 'festividades') {
      displayOrganizer = 'Comissão Organizadora & Conexão Maçônica';
    } else {
      displayOrganizer = event.location_label || 'Loja Maçônica Realizadora';
    }
  }

  const explanationText =
    event.organizer_type === 'platform' || event.category_id === 'institucional'
      ? 'Evento oficial promovido e coordenado pela plataforma Conexão Maçônica.'
      : event.organizer_type === 'social_action'
        ? 'Iniciativa beneficente fraterna em prol da solidariedade e assistência social.'
        : event.organizer_type === 'business'
          ? 'Empresa parceira com perfil homologado na vitrine comercial do Guia.'
          : event.category_id === 'festividades'
            ? `Organização e realização de ${displayOrganizer}, integrando a comunidade e a rede fraterna.`
            : `Realização oficial de ${displayOrganizer}, integrada à rede fraterna Conexão Maçônica.`;

  return { displayOrganizer, explanationText };
}

function downloadEventICS(event: MobileEventItem, confirmationCode?: string) {
  if (!event.raw_date || !/^\d{4}-\d{2}-\d{2}/.test(event.raw_date)) return;
  const datePart = event.raw_date.slice(0, 10).replace(/-/g, '');
  const startParts = (event.start_time || '19:00').split(':');
  const startHh = (startParts[0] || '19').padStart(2, '0');
  const startMm = (startParts[1] || '00').padStart(2, '0');

  const endParts = (event.end_time || '').split(':');
  const endHh = endParts[0] ? endParts[0].padStart(2, '0') : String(Math.min(23, Number(startHh) + 3)).padStart(2, '0');
  const endMm = endParts[1] ? endParts[1].padStart(2, '0') : startMm;

  const location = [event.location_label, event.address, event.city, event.state].filter(Boolean).join(', ');
  const description = [
    event.description || event.summary || '',
    confirmationCode ? `Codigo de Confirmacao: ${confirmationCode}` : '',
  ]
    .filter(Boolean)
    .join('\\n\\n')
    .replace(/\r?\n/g, '\\n');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Conexao Maconcia//Eventos Mobile//PT',
    'BEGIN:VEVENT',
    `UID:${event.id}@conexaomaconica.com.br`,
    `DTSTART;TZID=America/Bahia:${datePart}T${startHh}${startMm}00`,
    `DTEND;TZID=America/Bahia:${datePart}T${endHh}${endMm}00`,
    `SUMMARY:${event.title.replace(/\r?\n/g, ' ')}`,
    location ? `LOCATION:${location.replace(/\r?\n/g, ' ')}` : '',
    description ? `DESCRIPTION:${description}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `conexao-maconica-${event.slug || event.id}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function MobileEventDetailScreen({
  event,
  onBack,
  onSelectBusiness,
  onShare,
}: MobileEventDetailScreenProps) {
  const [formData, setFormData] = useState<RSVPFormData>(INITIAL_RSVP_FORM);
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RSVPFormData, string>>>({});
  const [successResult, setSuccessResult] = useState<MobileEventRSVPResult | null>(null);
  const [bannerZoomOpen, setBannerZoomOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isFavorited, setIsFavorited] = useState(() => loadFavoriteEventIds().includes(event.id));

  const dateDisplay = formatFullEventDate(event.raw_date, event.event_date);
  const timeDisplay = formatTimeDisplay(event.start_time);
  const endTimeDisplay = formatTimeDisplay(event.end_time);
  const locationLine = [event.location_label, event.city, event.state].filter(Boolean).join(' — ');
  const mapsQuery = encodeURIComponent(
    [event.location_label, event.address, event.city, event.state].filter(Boolean).join(', '),
  );
  const mapsUrl = mapsQuery ? `https://www.google.com/maps/search/?api=1&query=${mapsQuery}` : null;

  const whatsappDigits = (event.organizer_whatsapp || '').replace(/\D/g, '');
  const whatsappUrl =
    whatsappDigits.length >= 10
      ? `https://wa.me/${whatsappDigits.startsWith('55') ? whatsappDigits : `55${whatsappDigits}`}?text=${encodeURIComponent(
          `Olá! Gostaria de mais informações sobre o evento "${event.title}" visto na Conexão Maçônica.`,
        )}`
      : null;

  const externalTicketUrl = event.external_ticket_url || event.cta_url || null;
  const { displayOrganizer, explanationText } = resolveDisplayOrganizer(event);
  const isSubmitting = formState === 'submitting';

  const todayInBahia = (() => {
    try {
      const nowBahia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia' }));
      return [
        nowBahia.getFullYear(),
        String(nowBahia.getMonth() + 1).padStart(2, '0'),
        String(nowBahia.getDate()).padStart(2, '0'),
      ].join('-');
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();

  const isPastEvent =
    typeof event.is_past === 'boolean'
      ? event.is_past
      : Boolean(event.raw_date && event.raw_date.slice(0, 10) < todayInBahia);

  const updateField = <K extends keyof RSVPFormData>(field: K, value: RSVPFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleToggleFavorite = () => {
    const current = loadFavoriteEventIds();
    const exists = current.includes(event.id);
    const updated = exists ? current.filter((id) => id !== event.id) : [...current, event.id];
    saveFavoriteEventIds(updated);
    setIsFavorited(!exists);
  };

  const handleScrollToRsvp = () => {
    const target = document.getElementById('mobile-rsvp-form');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        const input = document.getElementById('mobile-rsvp-fullname');
        if (input instanceof HTMLInputElement) {
          input.focus();
        }
      }, 450);
    }
  };

  const validateRsvpForm = (): boolean => {
    const errors: Partial<Record<keyof RSVPFormData, string>> = {};

    if (formData.fullName.trim().length < 3) {
      errors.fullName = 'Nome completo deve ter pelo menos 3 caracteres.';
    }

    const cleanDigits = formData.whatsapp.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      errors.whatsapp = 'Informe o DDD + número (ex: 75 99999-9999).';
    } else if (cleanDigits.length > 13) {
      errors.whatsapp = 'Número de WhatsApp muito longo.';
    }

    if (formData.attendeeType === 'macom' && formData.masonicOrganization.trim().length < 2) {
      errors.masonicOrganization = 'Informe sua Loja e Potência Maçônica.';
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'E-mail inválido.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRsvpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateRsvpForm()) return;

    setFormState('submitting');

    const result = await submitMobileEventRSVP({
      eventId: event.id,
      fullName: formData.fullName.trim(),
      whatsapp: formData.whatsapp.replace(/\D/g, ''),
      email: formData.email.trim() || undefined,
      attendeeType: formData.attendeeType,
      masonicOrganization:
        formData.attendeeType === 'macom' ? formData.masonicOrganization.trim() || undefined : undefined,
      companyName: formData.companyName.trim() || undefined,
      city: formData.city.trim() || undefined,
      attendanceStatus: formData.attendanceStatus,
      source: 'app_mobile',
    });

    if (result.success && result.data) {
      setSuccessResult(result.data);
      setFormState('success');
      const formTop = document.getElementById('mobile-rsvp-form');
      if (formTop) {
        formTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setErrorMessage(result.error || 'Ocorreu um erro ao processar sua confirmação. Tente novamente.');
      setFormState('error');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Ignore clipboard failures on restricted WebViews
    }
  };

  return (
    <div className="mobile-event-detail-screen">
      {/* Barra Superior + Breadcrumb */}
      <div className="mobile-event-topbar">
        <button type="button" className="back-to-events-btn" onClick={onBack}>
          ← Agenda de Eventos
        </button>
        <span className="mobile-event-topbar-badge">
          {event.registration_enabled ? 'Inscrição RSVP' : 'Agenda Oficial'}
        </span>
      </div>

      {/* HERO BANNER CARD (Paridade Web Mobile /eventos/[slug]) */}
      <header className="mobile-event-hero-card">
        <div className="mobile-event-badges-row">
          <span className="mobile-event-cat-pill">
            <span>{event.category_icon || '📅'}</span>
            <span>{event.category_label || event.badge_text || 'Evento Especial'}</span>
          </span>

          {isPastEvent ? (
            <span className="mobile-event-status-pill mobile-event-status-pill--past">
              Evento Realizado
            </span>
          ) : (
            <span className="mobile-event-status-pill mobile-event-status-pill--confirmed">
              ✓ Confirmado
            </span>
          )}
        </div>

        <h1 className="mobile-event-detail-title">{event.title}</h1>
        {event.subtitle && <p className="mobile-event-detail-subtitle">{event.subtitle}</p>}

        {/* Dados Estruturados: Data/Horário, Localização, Realização */}
        <div className="mobile-event-info-rows">
          <div className="mobile-event-info-item">
            <div className="mobile-event-info-icon mobile-event-info-icon--gold">📅</div>
            <div className="mobile-event-info-text">
              <span className="mobile-event-info-strong">{dateDisplay}</span>
              {timeDisplay && <strong className="mobile-event-time-highlight"> às {timeDisplay}</strong>}
              {endTimeDisplay && (
                <span className="mobile-event-info-muted"> (término previsto {endTimeDisplay})</span>
              )}
            </div>
          </div>

          {(locationLine || event.address) && (
            <div className="mobile-event-info-item">
              <div className="mobile-event-info-icon">📍</div>
              <div className="mobile-event-info-text">
                {locationLine && <span className="mobile-event-info-strong">{locationLine}</span>}
                {event.address && <span className="mobile-event-info-sub">{event.address}</span>}
              </div>
            </div>
          )}

          {displayOrganizer && (
            <div className="mobile-event-info-item">
              <div className="mobile-event-info-icon">🏛️</div>
              <div className="mobile-event-info-text">
                <span>Realização: </span>
                <strong>{displayOrganizer}</strong>
                {event.organizer_slug && onSelectBusiness && (
                  <button
                    type="button"
                    className="mobile-event-inline-link"
                    onClick={() => onSelectBusiness(event.organizer_slug!)}
                  >
                    Ver perfil da empresa →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Destaque Valores & Ingressos */}
        <div className="mobile-event-price-highlight">
          <span className="mobile-event-price-label">🏷️ Valores &amp; Ingressos:</span>
          <div className="mobile-event-price-row">
            <span className="mobile-event-price-value">{event.price_info || 'Entrada Franca'}</span>
            <span className="mobile-event-price-note">
              {event.registration_enabled ? '• Inscrição antecipada recomendada' : '• Livre participação'}
            </span>
          </div>
        </div>

        {/* Barra de Ações Rápidas (RSVP / External URL, WhatsApp, Como Chegar, Compartilhar, Favoritar) */}
        <div className="mobile-event-actions-grid">
          {event.registration_enabled ? (
            <button
              type="button"
              className="mobile-event-cta-primary"
              onClick={handleScrollToRsvp}
            >
              ✍️ Confirmar Presença (Preencher Formulário)
            </button>
          ) : externalTicketUrl ? (
            <button
              type="button"
              className="mobile-event-cta-secondary"
              onClick={() => window.open(externalTicketUrl, '_blank', 'noopener,noreferrer')}
            >
              Mais Informações / Ingressos ↗
            </button>
          ) : null}

          <div className="mobile-event-actions-secondary-row">
            {whatsappUrl && (
              <button
                type="button"
                className="mobile-event-action-whatsapp"
                onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
              >
                💬 Falar no WhatsApp
              </button>
            )}

            {mapsUrl && (
              <button
                type="button"
                className="mobile-event-action-outline"
                onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
              >
                📍 Como Chegar
              </button>
            )}

            <button
              type="button"
              className="mobile-event-action-outline"
              onClick={() => void onShare(event)}
            >
              🔗 Compartilhar
            </button>

            <button
              type="button"
              aria-label={isFavorited ? 'Remover dos favoritos' : 'Favoritar evento'}
              className={`mobile-event-action-favorite ${isFavorited ? 'is-favorited' : ''}`}
              onClick={handleToggleFavorite}
            >
              {isFavorited ? '❤️ Salvo' : '🤍 Salvar'}
            </button>
          </div>
        </div>

        {/* Banner com Lightbox ao toque */}
        {event.cover_url && (
          <button
            type="button"
            className="mobile-event-cover-wrap mobile-event-cover-btn"
            onClick={() => setBannerZoomOpen(true)}
            aria-label={`Ampliar banner de ${event.title}`}
          >
            <img src={event.cover_url} alt={event.title} className="mobile-event-cover-img" />
            <span className="mobile-event-cover-zoom-hint">🔍 Ampliar</span>
          </button>
        )}
      </header>

      {/* SEÇÃO 1: SOBRE O EVENTO */}
      <section className="mobile-event-section-card">
        <div className="mobile-event-section-header">
          <span>ℹ️</span>
          <span>Sobre o Evento</span>
        </div>

        {event.description || event.summary ? (
          <p className="mobile-event-description-body">
            {event.description || event.summary}
          </p>
        ) : (
          <p className="mobile-event-empty-copy">
            Evento comemorativo e integrativo promovido na Conexão Maçônica.
          </p>
        )}
      </section>

      {/* SEÇÃO 2: INFORMAÇÕES DE ACESSO & VALORES */}
      <section className="mobile-event-section-card">
        <div className="mobile-event-section-header">
          <span>🏷️</span>
          <span>Informações de Acesso &amp; Valores</span>
        </div>

        <div className="mobile-event-access-grid">
          <div className="mobile-event-access-box">
            <span className="mobile-event-access-label">Investimento / Entrada</span>
            <strong className="mobile-event-access-value">{event.price_info || 'Entrada Franca'}</strong>
            <span className="mobile-event-access-sub">Valor de referência</span>
          </div>

          <div className="mobile-event-access-box">
            <span className="mobile-event-access-label">Modalidade de Confirmação</span>
            <strong className="mobile-event-access-value">
              {event.registration_enabled ? 'Inscrição RSVP Obrigatória' : 'Livre'}
            </strong>
            <span className="mobile-event-access-sub">
              {event.capacity
                ? `Vagas limitadas a ${event.capacity} participantes.`
                : 'Sem restrição rígida de lotação.'}
            </span>
          </div>
        </div>

        {event.footer_information && (
          <div className="mobile-event-footer-info-box">
            <strong>Observações da Organização:</strong>
            <p>{event.footer_information}</p>
          </div>
        )}
      </section>

      {/* SEÇÃO 3: FORMULÁRIO OFICIAL DE CONFIRMAÇÃO DE PRESENÇA (RSVP) */}
      {event.registration_enabled && (
        <section id="mobile-rsvp-form" className="mobile-event-section-card mobile-event-rsvp-section">
          <div className="mobile-event-section-header">
            <span>🛡️</span>
            <span>Confirmação de Presença Fraterna</span>
          </div>

          {formState === 'success' && successResult ? (
            <div className="mobile-rsvp-success" aria-live="polite">
              <div
                className={`mobile-rsvp-success-icon ${
                  successResult.attendanceStatus === 'confirmed' ? 'is-confirmed' : 'is-declined'
                }`}
              >
                {successResult.attendanceStatus === 'confirmed' ? '✓' : '!'}
              </div>

              <h2 className="mobile-rsvp-success-title">
                {successResult.attendanceStatus === 'confirmed'
                  ? 'Presença confirmada!'
                  : 'Obrigado pelo retorno'}
              </h2>

              <p className="mobile-rsvp-success-sub">
                {successResult.attendanceStatus === 'confirmed'
                  ? `${successResult.fullName.split(' ')[0]}, será uma satisfação receber você.`
                  : `${successResult.fullName.split(' ')[0]}, lamentamos que não possa comparecer. Esperamos vê-lo em uma próxima oportunidade.`}
              </p>

              <div className="mobile-rsvp-success-event-box">
                <strong>{event.title}</strong>
                <span>
                  {dateDisplay}
                  {timeDisplay ? ` • ${timeDisplay}` : ''}
                </span>
                {event.location_label && <span>{event.location_label}</span>}
              </div>

              {successResult.attendanceStatus === 'confirmed' && (
                <>
                  <div className="mobile-rsvp-code-card">
                    <span className="mobile-rsvp-code-label">Código de confirmação</span>
                    <strong className="mobile-rsvp-code-value">
                      {successResult.confirmationCode.toUpperCase()}
                    </strong>
                    <p className="mobile-rsvp-code-hint">
                      Guarde este código. Ele será solicitado na recepção do evento.
                    </p>
                    <button
                      type="button"
                      className="mobile-rsvp-copy-code-btn"
                      onClick={() => void handleCopyCode(successResult.confirmationCode.toUpperCase())}
                    >
                      {copiedCode ? '✓ Código copiado!' : '📋 Copiar código'}
                    </button>
                  </div>

                  <div className="mobile-rsvp-success-actions">
                    <button
                      type="button"
                      className="mobile-event-action-outline"
                      onClick={() => downloadEventICS(event, successResult.confirmationCode.toUpperCase())}
                    >
                      📅 Adicionar à Agenda
                    </button>
                    <button
                      type="button"
                      className="mobile-event-action-outline"
                      onClick={() => void onShare(event)}
                    >
                      🔗 Compartilhar Convite
                    </button>
                  </div>
                </>
              )}

              <button
                type="button"
                className="mobile-rsvp-edit-btn"
                onClick={() => {
                  setFormState('idle');
                  setErrorMessage('');
                }}
              >
                Atualizar ou enviar outra confirmação
              </button>
            </div>
          ) : (
            <>
              <p className="mobile-rsvp-intro">
                Preencha o formulário abaixo para registrar sua presença antecipada e receber a
                confirmação oficial no seu WhatsApp.
              </p>

              <form onSubmit={handleRsvpSubmit} noValidate className="mobile-rsvp-form">
                {/* Bloco 1 */}
                <div className="mobile-rsvp-block">
                  <div className="mobile-rsvp-block-title">
                    <span>👤</span>
                    <span>1. Dados Pessoais de Identificação</span>
                  </div>

                  <div className="mobile-rsvp-field">
                    <label htmlFor="mobile-rsvp-fullname">
                      Nome Completo <span>*</span>
                    </label>
                    <input
                      id="mobile-rsvp-fullname"
                      type="text"
                      autoComplete="name"
                      placeholder="Digite seu nome completo"
                      value={formData.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      disabled={isSubmitting}
                      className={fieldErrors.fullName ? 'has-error' : ''}
                    />
                    {fieldErrors.fullName && (
                      <span className="mobile-rsvp-field-error">{fieldErrors.fullName}</span>
                    )}
                  </div>

                  <div className="mobile-rsvp-field">
                    <label htmlFor="mobile-rsvp-whatsapp">
                      WhatsApp <span>*</span>
                    </label>
                    <input
                      id="mobile-rsvp-whatsapp"
                      type="tel"
                      autoComplete="tel"
                      placeholder="(75) 99999-9999"
                      value={formData.whatsapp}
                      onChange={(e) => updateField('whatsapp', e.target.value)}
                      disabled={isSubmitting}
                      className={fieldErrors.whatsapp ? 'has-error' : ''}
                    />
                    {fieldErrors.whatsapp && (
                      <span className="mobile-rsvp-field-error">{fieldErrors.whatsapp}</span>
                    )}
                  </div>

                  <div className="mobile-rsvp-field">
                    <label htmlFor="mobile-rsvp-email">
                      E-mail <small>(opcional)</small>
                    </label>
                    <input
                      id="mobile-rsvp-email"
                      type="email"
                      autoComplete="email"
                      placeholder="seuemail@exemplo.com"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      disabled={isSubmitting}
                      className={fieldErrors.email ? 'has-error' : ''}
                    />
                    {fieldErrors.email && (
                      <span className="mobile-rsvp-field-error">{fieldErrors.email}</span>
                    )}
                  </div>

                  <div className="mobile-rsvp-field">
                    <label>
                      Vínculo / Categoria do Participante <span>*</span>
                    </label>
                    <div className="mobile-rsvp-type-grid">
                      {ATTENDEE_TYPES.map(({ value, label, icon }) => (
                        <button
                          key={value}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => updateField('attendeeType', value)}
                          className={`mobile-rsvp-type-btn ${
                            formData.attendeeType === value ? 'is-selected' : ''
                          }`}
                        >
                          <span>{icon}</span>
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.attendeeType === 'macom' && (
                    <div className="mobile-rsvp-field">
                      <label htmlFor="mobile-rsvp-lodge">
                        Loja &amp; Potência Maçônica <span>*</span>
                      </label>
                      <input
                        id="mobile-rsvp-lodge"
                        type="text"
                        placeholder="Ex.: Loja 16 de Junho — GOB / GLEB"
                        value={formData.masonicOrganization}
                        onChange={(e) => updateField('masonicOrganization', e.target.value)}
                        disabled={isSubmitting}
                        className={fieldErrors.masonicOrganization ? 'has-error' : ''}
                      />
                      {fieldErrors.masonicOrganization && (
                        <span className="mobile-rsvp-field-error">{fieldErrors.masonicOrganization}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bloco 2 */}
                <div className="mobile-rsvp-block">
                  <div className="mobile-rsvp-block-title">
                    <span>🏛️</span>
                    <span>2. Confirmação &amp; Dados Complementares</span>
                  </div>

                  <div className="mobile-rsvp-field">
                    <label htmlFor="mobile-rsvp-status">
                      Você comparecerá ao evento? <span>*</span>
                    </label>
                    <select
                      id="mobile-rsvp-status"
                      value={formData.attendanceStatus}
                      onChange={(e) =>
                        updateField('attendanceStatus', e.target.value as MobileEventRSVPAttendanceStatus)
                      }
                      disabled={isSubmitting}
                    >
                      <option value="confirmed">✓ Sim, estarei presente com certeza</option>
                      <option value="declined">✗ Infelizmente não poderei comparecer</option>
                    </select>
                  </div>

                  <div className="mobile-rsvp-field">
                    <label htmlFor="mobile-rsvp-city">
                      Sua Cidade <small>(opcional)</small>
                    </label>
                    <input
                      id="mobile-rsvp-city"
                      type="text"
                      list="mobile-rsvp-city-list"
                      placeholder="Ex.: Feira de Santana - BA"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      disabled={isSubmitting}
                    />
                    <datalist id="mobile-rsvp-city-list">
                      <option value="Feira de Santana - BA" />
                      <option value="Salvador - BA" />
                      <option value="Vitória da Conquista - BA" />
                      <option value="Camaçari - BA" />
                      <option value="Juazeiro - BA" />
                      <option value="Itabuna - BA" />
                      <option value="Ilhéus - BA" />
                      <option value="Lauro de Freitas - BA" />
                      <option value="Alagoinhas - BA" />
                      <option value="Santo Antônio de Jesus - BA" />
                      <option value="Serrinha - BA" />
                    </datalist>
                  </div>

                  <div className="mobile-rsvp-field">
                    <label htmlFor="mobile-rsvp-company">
                      Empresa ou Atuação Profissional <small>(para networking fraterno)</small>
                    </label>
                    <input
                      id="mobile-rsvp-company"
                      type="text"
                      placeholder="Ex.: Escritório de Advocacia Silva / Médico / Empresário"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {formState === 'error' && errorMessage && (
                  <div className="mobile-rsvp-error-banner" role="alert">
                    ⚠️ {errorMessage}
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="mobile-rsvp-submit-btn">
                  {isSubmitting ? '⏳ Processando sua confirmação...' : '✓ CONFIRMAR MINHA PRESENÇA'}
                </button>

                <p className="mobile-rsvp-lgpd">
                  🔒 Seus dados são confidenciais e protegidos pela Conexão Maçônica. O comprovante
                  oficial de inscrição e orientações de acesso serão enviados via WhatsApp.
                </p>
              </form>
            </>
          )}
        </section>
      )}

      {/* SEÇÃO 4: LOCALIZAÇÃO */}
      <section className="mobile-event-section-card">
        <div className="mobile-event-section-header">
          <span>📍</span>
          <span>Localização</span>
        </div>

        <div className="mobile-event-location-copy">
          {event.location_label && <strong>{event.location_label}</strong>}
          {event.address && <p>{event.address}</p>}
          <p className="mobile-event-location-city">
            {[event.city, event.state].filter(Boolean).join(' - ') || 'Feira de Santana - BA'}
          </p>
        </div>

        {mapsUrl && (
          <button
            type="button"
            className="mobile-event-maps-btn"
            onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
          >
            📍 Traçar Rota no Google Maps ↗
          </button>
        )}
      </section>

      {/* SEÇÃO 5: REALIZAÇÃO & ORGANIZAÇÃO */}
      <section className="mobile-event-section-card">
        <div className="mobile-event-section-header">
          <span>🏛️</span>
          <span>Realização &amp; Organização</span>
        </div>

        <div className="mobile-event-organizer-box">
          <strong>{displayOrganizer}</strong>
          <p>{explanationText}</p>
        </div>

        {event.organizer_slug && onSelectBusiness && (
          <button
            type="button"
            className="mobile-event-organizer-link-btn"
            onClick={() => onSelectBusiness(event.organizer_slug!)}
          >
            Conhecer Empresa no Guia →
          </button>
        )}

        {whatsappUrl && (
          <button
            type="button"
            className="mobile-event-whatsapp-organizer-btn"
            onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
          >
            💬 Contato WhatsApp do Organizador
          </button>
        )}
      </section>

      {/* CARD VOLTAR À AGENDA */}
      <div className="mobile-event-agenda-footer-card">
        <span>Quer conferir outros eventos da comunidade?</span>
        <button type="button" className="mobile-event-back-agenda-btn" onClick={onBack}>
          ← Voltar para Todos os Eventos
        </button>
      </div>

      {/* LIGHTBOX DO BANNER */}
      {bannerZoomOpen && event.cover_url && (
        <div
          className="mobile-event-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Banner ampliado: ${event.title}`}
          onClick={() => setBannerZoomOpen(false)}
        >
          <button
            type="button"
            className="mobile-event-lightbox-close"
            onClick={() => setBannerZoomOpen(false)}
            aria-label="Fechar ampliação"
          >
            ✕
          </button>
          <img
            src={event.cover_url}
            alt={event.title}
            className="mobile-event-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}


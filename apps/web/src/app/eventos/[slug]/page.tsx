import React, { Suspense } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPlatformEventBySlugAction } from '@/app/actions/platform-events';
import { EventRSVPForm } from '@/components/events/EventRSVPForm';
import { StructuredEventData } from '@/components/events/StructuredEventData';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { appUrl } from '@/lib/seo/app-url';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}

// ---------------------------------------------------------------------------
// Metadata dinâmica via generateMetadata
// ---------------------------------------------------------------------------
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPlatformEventBySlugAction(slug);

  if (!result.success || !result.data) {
    return {
      title: 'Evento não encontrado · Conexão Maçônica',
      robots: { index: false, follow: false },
    };
  }

  const event = result.data;
  const pageUrl = appUrl(`/eventos/${slug}`);

  const [year, month, day] = event.event_date.split('-').map(Number);
  const dateDisplay = new Date(year!, month! - 1, day!).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bahia',
  });

  return {
    title: `${event.title} · Confirme sua presença`,
    description:
      event.subtitle ??
      event.description ??
      `${event.title} — ${dateDisplay} • ${event.venue_name ?? 'Feira de Santana – BA'}. Confirme sua presença.`,
    openGraph: {
      title: event.title,
      description: event.subtitle ?? `${dateDisplay} • ${event.venue_name ?? ''}`,
      url: pageUrl,
      type: 'website',
      locale: 'pt_BR',
      ...(event.cover_image_url
        ? { images: [{ url: event.cover_image_url, width: 1200, height: 630 }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: event.subtitle ?? '',
    },
    robots: { index: true, follow: true },
    alternates: { canonical: pageUrl },
  };
}

// ---------------------------------------------------------------------------
// Helpers de formatação
// ---------------------------------------------------------------------------
function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bahia',
  });
}

function formatEventTime(timeStr: string): string {
  return timeStr.slice(0, 5).replace(':', 'h');
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;

  const [eventResult, brand] = await Promise.all([
    getPlatformEventBySlugAction(slug),
    resolveTenantBrandContext(),
  ]);

  if (!eventResult.success || !eventResult.data) {
    notFound();
  }

  const event = eventResult.data;
  const pageUrl = appUrl(`/eventos/${slug}`);

  const dateDisplay  = formatEventDate(event.event_date);
  const timeDisplay  = formatEventTime(event.start_time);
  const locationLine = [event.venue_name, event.city].filter(Boolean).join(' — ');

  return (
    <>
      {/* JSON-LD para SEO */}
      <StructuredEventData event={event} pageUrl={pageUrl} />

      <div className="event-page">
        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <header className="event-hero">
          <div className="event-hero-inner">
            {/* Logo oficial (via tenant brand) */}
            {brand.logoUrl ? (
              <div className="event-logo-wrap">
                <Image
                  src={brand.logoUrl}
                  alt={brand.appName ?? 'Conexão Maçônica'}
                  width={160}
                  height={80}
                  className="event-logo"
                  priority
                />
              </div>
            ) : (
              <div className="event-logo-text" aria-label="Conexão Maçônica">
                Conexão Maçônica
              </div>
            )}

            {/* Badge convite */}
            <div className="event-badge" aria-label="Convite oficial">
              <span className="event-badge-deco" aria-hidden="true">✦</span>
              CONVITE
              <span className="event-badge-deco" aria-hidden="true">✦</span>
            </div>

            {/* Título principal */}
            <h1 className="event-title">{event.title}</h1>

            {/* Subtítulo / frase */}
            {event.subtitle && (
              <p className="event-subtitle">{event.subtitle}</p>
            )}

            {/* Separador ornamental */}
            <div className="event-divider" aria-hidden="true">
              <span className="event-divider-line" />
              <span className="event-divider-symbol">◆</span>
              <span className="event-divider-line" />
            </div>

            {/* Data, hora, local */}
            <div className="event-meta">
              <div className="event-meta-item">
                <svg className="event-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{dateDisplay}</span>
              </div>
              <div className="event-meta-item">
                <svg className="event-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{timeDisplay}</span>
              </div>
              {locationLine && (
                <div className="event-meta-item">
                  <svg className="event-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{locationLine}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── DESCRIÇÃO ──────────────────────────────────────────────────── */}
        {event.description && (
          <section className="event-description-section">
            <div className="event-description-inner">
              <p className="event-description">{event.description}</p>
            </div>
          </section>
        )}

        {/* ── FORMULÁRIO RSVP ───────────────────────────────────────────── */}
        {event.registration_enabled ? (
          <Suspense fallback={<div className="event-form-loading">Carregando formulário...</div>}>
            <EventRSVPForm event={event} />
          </Suspense>
        ) : (
          <section className="event-closed-section">
            <div className="event-closed-card">
              <p className="event-closed-title">Inscrições encerradas</p>
              <p className="event-closed-sub">
                O prazo para confirmação de presença foi encerrado.
              </p>
            </div>
          </section>
        )}

        {/* ── FOOTER MÍNIMO ─────────────────────────────────────────────── */}
        <footer className="event-footer">
          <p className="event-footer-brand">{brand.appName ?? 'Conexão Maçônica'}</p>
          <p className="event-footer-copy">
            &copy; {new Date().getFullYear()} · Todos os direitos reservados
          </p>
        </footer>
      </div>

      {/* ── CSS DO EVENTO ─────────────────────────────────────────────────── */}
      {/*
        Tokens de marca:
        --cm-bordeaux:  #4B161B  (bordô institucional)
        --cm-gold:      #C9A227  (dourado)
        --cm-ivory:     #F3EEDD  (marfim/fundo)
        --cm-dark:      #1A0507  (bordô escuro)
        --cm-text:      #2C0D10  (texto sobre marfim)
      */}
      <style>{`
        :root {
          --cm-bordeaux: #4B161B;
          --cm-gold:     #C9A227;
          --cm-ivory:    #F3EEDD;
          --cm-dark:     #1A0507;
          --cm-text:     #2C0D10;
          --cm-gold-light: #E8C96A;
          --cm-bordeaux-soft: rgba(75, 22, 27, 0.08);
          --font-inter:  'Inter', sans-serif;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .events-layout {
          font-family: var(--font-inter);
          background: var(--cm-ivory);
          color: var(--cm-text);
          min-height: 100dvh;
        }

        .event-page {
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
        }

        /* ── HERO ─────────────────────────────────────────────────────── */
        .event-hero {
          background: linear-gradient(160deg, var(--cm-dark) 0%, var(--cm-bordeaux) 50%, #6B1E25 100%);
          padding: 2.5rem 1.25rem 3rem;
          position: relative;
          overflow: hidden;
        }

        .event-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 70% 0%, rgba(201, 162, 39, 0.12) 0%, transparent 60%);
          pointer-events: none;
        }

        .event-hero-inner {
          max-width: 640px;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .event-logo-wrap {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
        }

        .event-logo {
          max-height: 72px;
          width: auto;
          object-fit: contain;
          filter: brightness(1.1);
        }

        .event-logo-text {
          color: var(--cm-gold);
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
        }

        .event-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(201, 162, 39, 0.15);
          border: 1px solid rgba(201, 162, 39, 0.4);
          color: var(--cm-gold-light);
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 0.375rem 1rem;
          border-radius: 100px;
          margin-bottom: 1.25rem;
        }

        .event-badge-deco {
          font-size: 0.5rem;
          opacity: 0.7;
        }

        .event-title {
          color: #FFFFFF;
          font-size: clamp(1.5rem, 5vw, 2.125rem);
          font-weight: 700;
          line-height: 1.25;
          letter-spacing: -0.01em;
          margin-bottom: 0.75rem;
        }

        .event-subtitle {
          color: var(--cm-gold-light);
          font-size: clamp(0.9375rem, 3vw, 1.0625rem);
          font-style: italic;
          line-height: 1.5;
          margin-bottom: 1.5rem;
          opacity: 0.9;
        }

        .event-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.25rem 0;
        }

        .event-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201, 162, 39, 0.4), transparent);
        }

        .event-divider-symbol {
          color: var(--cm-gold);
          font-size: 0.5rem;
          opacity: 0.7;
        }

        .event-meta {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          align-items: center;
        }

        .event-meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(243, 238, 221, 0.9);
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .event-meta-icon {
          width: 16px;
          height: 16px;
          color: var(--cm-gold);
          flex-shrink: 0;
        }

        /* ── DESCRIÇÃO ────────────────────────────────────────────────── */
        .event-description-section {
          padding: 2rem 1.25rem;
          background: #FFFFFF;
          border-bottom: 1px solid rgba(75, 22, 27, 0.1);
        }

        .event-description-inner {
          max-width: 640px;
          margin: 0 auto;
        }

        .event-description {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: #444;
          text-align: center;
        }

        /* ── FORMULÁRIO RSVP ──────────────────────────────────────────── */
        .rsvp-form-section {
          padding: 2rem 1.25rem;
          background: var(--cm-ivory);
          flex: 1;
        }

        .rsvp-form-container {
          max-width: 560px;
          margin: 0 auto;
        }

        .rsvp-form-header {
          text-align: center;
          margin-bottom: 1.75rem;
        }

        .rsvp-form-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--cm-bordeaux);
          margin-bottom: 0.375rem;
        }

        .rsvp-form-subtitle {
          font-size: 0.875rem;
          color: #666;
        }

        .rsvp-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .rsvp-fieldset {
          border: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rsvp-legend {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--cm-bordeaux);
          opacity: 0.7;
          margin-bottom: 0.5rem;
          display: block;
        }

        .rsvp-optional {
          font-weight: 400;
          font-style: italic;
          text-transform: none;
          letter-spacing: 0;
          opacity: 0.7;
        }

        .rsvp-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .rsvp-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--cm-text);
        }

        .rsvp-required {
          color: var(--cm-bordeaux);
          margin-left: 2px;
        }

        .rsvp-input,
        .rsvp-select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1.5px solid #D5C9A6;
          border-radius: 10px;
          font-size: 1rem;
          font-family: var(--font-inter);
          background: #FFFFFF;
          color: var(--cm-text);
          transition: border-color 0.15s, box-shadow 0.15s;
          -webkit-appearance: none;
          appearance: none;
        }

        .rsvp-input::placeholder {
          color: #AAA;
        }

        .rsvp-input:focus,
        .rsvp-select:focus {
          outline: none;
          border-color: var(--cm-bordeaux);
          box-shadow: 0 0 0 3px rgba(75, 22, 27, 0.12);
        }

        .rsvp-input--error {
          border-color: #C0392B;
        }

        .rsvp-input--error:focus {
          box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.15);
        }

        .rsvp-field-error {
          font-size: 0.8125rem;
          color: #C0392B;
          font-weight: 500;
        }

        .rsvp-radio-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .rsvp-radio-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 0.875rem;
          border: 1.5px solid #D5C9A6;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          background: #FFFFFF;
        }

        .rsvp-radio-label:has(.rsvp-radio:checked) {
          border-color: var(--cm-bordeaux);
          background: var(--cm-bordeaux-soft);
        }

        .rsvp-radio {
          accent-color: var(--cm-bordeaux);
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .rsvp-radio-text {
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--cm-text);
        }

        .rsvp-global-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          background: #FDF2F2;
          border: 1px solid #F5C6CB;
          border-radius: 10px;
          font-size: 0.9rem;
          color: #7B1E1E;
          font-weight: 500;
        }

        .rsvp-global-error-icon {
          font-size: 1rem;
        }

        .rsvp-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, var(--cm-bordeaux) 0%, #6B1E25 100%);
          color: var(--cm-gold-light);
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          box-shadow: 0 4px 16px rgba(75, 22, 27, 0.35);
          font-family: var(--font-inter);
          min-height: 54px;
        }

        .rsvp-submit-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .rsvp-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .rsvp-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .rsvp-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(201, 162, 39, 0.3);
          border-top-color: var(--cm-gold);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .rsvp-lgpd-notice {
          font-size: 0.75rem;
          color: #888;
          text-align: center;
          line-height: 1.5;
          padding: 0 0.5rem;
        }

        /* ── ENCERRADO ────────────────────────────────────────────────── */
        .event-closed-section {
          padding: 3rem 1.25rem;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .event-closed-card {
          text-align: center;
          max-width: 380px;
        }

        .event-closed-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--cm-bordeaux);
          margin-bottom: 0.5rem;
        }

        .event-closed-sub {
          font-size: 0.9375rem;
          color: #666;
        }

        /* ── TELA DE SUCESSO ─────────────────────────────────────────── */
        .success-screen {
          max-width: 560px;
          margin: 0 auto;
          padding: 2.5rem 1.25rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .success-icon-wrap {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .success-icon-wrap--confirmed {
          background: linear-gradient(135deg, #1A6B3C, #27AE60);
          box-shadow: 0 8px 24px rgba(39, 174, 96, 0.3);
        }

        .success-icon-wrap--declined {
          background: linear-gradient(135deg, #6B3A1A, #C0713A);
          box-shadow: 0 8px 24px rgba(192, 113, 58, 0.3);
        }

        .success-icon {
          width: 36px;
          height: 36px;
          color: white;
        }

        @keyframes pop-in {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .success-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--cm-bordeaux);
        }

        .success-personal-message {
          font-size: 1.0625rem;
          color: #444;
          line-height: 1.5;
        }

        .success-event-card {
          background: var(--cm-bordeaux);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          width: 100%;
        }

        .success-event-title {
          color: var(--cm-gold-light);
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.375rem;
        }

        .success-event-datetime {
          color: rgba(243, 238, 221, 0.85);
          font-size: 0.9375rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .success-event-venue {
          color: rgba(243, 238, 221, 0.7);
          font-size: 0.875rem;
        }

        .success-code-card {
          background: rgba(201, 162, 39, 0.08);
          border: 1.5px solid rgba(201, 162, 39, 0.35);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          width: 100%;
        }

        .success-code-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #888;
          margin-bottom: 0.375rem;
        }

        .success-code {
          font-size: 1.625rem;
          font-weight: 800;
          color: var(--cm-bordeaux);
          letter-spacing: 0.08em;
          font-variant-numeric: tabular-nums;
          margin-bottom: 0.375rem;
        }

        .success-code-hint {
          font-size: 0.8125rem;
          color: #888;
        }

        .success-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }

        .success-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          font-family: var(--font-inter);
          border: none;
        }

        .success-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .success-btn--secondary {
          background: linear-gradient(135deg, var(--cm-bordeaux), #6B1E25);
          color: var(--cm-gold-light);
          box-shadow: 0 4px 12px rgba(75, 22, 27, 0.3);
        }

        .success-btn--outline {
          background: transparent;
          color: var(--cm-bordeaux);
          border: 2px solid var(--cm-bordeaux);
        }

        .success-btn-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        /* ── FORM LOADING ─────────────────────────────────────────────── */
        .event-form-loading {
          text-align: center;
          padding: 3rem;
          color: #888;
          font-size: 0.9375rem;
        }

        /* ── FOOTER ───────────────────────────────────────────────────── */
        .event-footer {
          background: var(--cm-dark);
          padding: 1.5rem 1.25rem;
          text-align: center;
          margin-top: auto;
        }

        .event-footer-brand {
          color: var(--cm-gold);
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .event-footer-copy {
          color: rgba(243, 238, 221, 0.4);
          font-size: 0.75rem;
        }

        /* ── RESPONSIVO ───────────────────────────────────────────────── */
        @media (min-width: 480px) {
          .event-hero {
            padding: 3rem 2rem 3.5rem;
          }

          .rsvp-form-section {
            padding: 2.5rem 2rem;
          }

          .rsvp-radio-group {
            grid-template-columns: repeat(4, 1fr);
          }

          .success-actions {
            flex-direction: row;
          }
        }

        @media (min-width: 768px) {
          .event-hero {
            padding: 4rem 2rem 4.5rem;
          }
        }
      `}</style>
    </>
  );
}

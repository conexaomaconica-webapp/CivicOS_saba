'use client';

import React, { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { upsertEventRegistrationAction } from '@/app/actions/platform-events';
import { EventSuccessScreen } from './EventSuccessScreen';
import { normalizeWhatsApp, validateWhatsApp, sanitizeUTMParams } from '@/lib/events/events-service';
import type { PlatformEvent, RSVPResult } from '@/app/actions/platform-events';
import type { AttendeeType, AttendanceStatus } from '@/types/database-extensions';

interface EventRSVPFormProps {
  event: PlatformEvent;
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface FormData {
  fullName: string;
  whatsapp: string;
  email: string;
  attendeeType: AttendeeType;
  masonicOrganization: string;
  companyName: string;
  city: string;
  attendanceStatus: AttendanceStatus;
}

const INITIAL_FORM: FormData = {
  fullName: '',
  whatsapp: '',
  email: '',
  attendeeType: 'macom',
  masonicOrganization: '',
  companyName: '',
  city: '',
  attendanceStatus: 'confirmed',
};

const ATTENDEE_TYPES: { value: AttendeeType; label: string }[] = [
  { value: 'macom', label: 'Maçom' },
  { value: 'cunhada', label: 'Cunhada' },
  { value: 'familiar', label: 'Familiar' },
  { value: 'convidado', label: 'Convidado' },
];

export function EventRSVPForm({ event }: EventRSVPFormProps) {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [successResult, setSuccessResult] = useState<RSVPResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Captura UTMs da URL
  const utmParams = sanitizeUTMParams({
    ref:          searchParams.get('ref') ?? undefined,
    utm_source:   searchParams.get('utm_source') ?? undefined,
    utm_medium:   searchParams.get('utm_medium') ?? undefined,
    utm_campaign: searchParams.get('utm_campaign') ?? undefined,
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (formData.fullName.trim().length < 3) {
      errors.fullName = 'Nome completo deve ter pelo menos 3 caracteres.';
    }

    const whatsappValidation = validateWhatsApp(formData.whatsapp);
    if (!whatsappValidation.valid) {
      errors.whatsapp = whatsappValidation.message;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'E-mail inválido.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) return;

    setFormState('submitting');

    const result = await upsertEventRegistrationAction({
      eventId:             event.id,
      fullName:            formData.fullName,
      whatsapp:            normalizeWhatsApp(formData.whatsapp),
      email:               formData.email || undefined,
      attendeeType:        formData.attendeeType,
      masonicOrganization: formData.masonicOrganization || undefined,
      companyName:         formData.companyName || undefined,
      city:                formData.city || undefined,
      attendanceStatus:    formData.attendanceStatus,
      source:              utmParams.source,
      utmSource:           utmParams.utmSource,
      utmMedium:           utmParams.utmMedium,
      utmCampaign:         utmParams.utmCampaign,
    });

    if (result.success && result.data) {
      setSuccessResult(result.data);
      setFormState('success');
    } else {
      setErrorMessage(result.error ?? 'Ocorreu um erro. Tente novamente.');
      setFormState('error');
    }
  };

  if (formState === 'success' && successResult) {
    return <EventSuccessScreen result={successResult} event={event} />;
  }

  const isSubmitting = formState === 'submitting';

  return (
    <section id="confirmar-presenca" className="rsvp-form-section">
      <div className="rsvp-form-container">
        <div className="rsvp-form-header">
          <h2 className="rsvp-form-title">Confirme sua presença</h2>
          <p className="rsvp-form-subtitle">
            Preencha os dados abaixo para garantir sua vaga.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="rsvp-form">
          {/* ── Dados Obrigatórios ─────────────────────────────────────── */}
          <fieldset className="rsvp-fieldset">
            <legend className="rsvp-legend">Dados Pessoais</legend>

            {/* Nome completo */}
            <div className="rsvp-field">
              <label htmlFor="rsvp-fullname" className="rsvp-label">
                Nome completo <span className="rsvp-required" aria-hidden="true">*</span>
              </label>
              <input
                id="rsvp-fullname"
                type="text"
                autoComplete="name"
                placeholder="Seu nome completo"
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                className={`rsvp-input ${fieldErrors.fullName ? 'rsvp-input--error' : ''}`}
                required
                disabled={isSubmitting}
                aria-describedby={fieldErrors.fullName ? 'rsvp-fullname-error' : undefined}
              />
              {fieldErrors.fullName && (
                <p id="rsvp-fullname-error" className="rsvp-field-error" role="alert">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="rsvp-field">
              <label htmlFor="rsvp-whatsapp" className="rsvp-label">
                WhatsApp <span className="rsvp-required" aria-hidden="true">*</span>
              </label>
              <input
                id="rsvp-whatsapp"
                type="tel"
                autoComplete="tel"
                placeholder="(75) 99999-9999"
                value={formData.whatsapp}
                onChange={(e) => updateField('whatsapp', e.target.value)}
                className={`rsvp-input ${fieldErrors.whatsapp ? 'rsvp-input--error' : ''}`}
                required
                disabled={isSubmitting}
                aria-describedby={fieldErrors.whatsapp ? 'rsvp-whatsapp-error' : undefined}
              />
              {fieldErrors.whatsapp && (
                <p id="rsvp-whatsapp-error" className="rsvp-field-error" role="alert">
                  {fieldErrors.whatsapp}
                </p>
              )}
            </div>

            {/* Tipo de participante */}
            <div className="rsvp-field">
              <label className="rsvp-label">
                Tipo de participante <span className="rsvp-required" aria-hidden="true">*</span>
              </label>
              <div className="rsvp-radio-group" role="radiogroup" aria-label="Tipo de participante">
                {ATTENDEE_TYPES.map(({ value, label }) => (
                  <label key={value} className="rsvp-radio-label">
                    <input
                      type="radio"
                      name="attendeeType"
                      value={value}
                      checked={formData.attendeeType === value}
                      onChange={() => updateField('attendeeType', value)}
                      className="rsvp-radio"
                      disabled={isSubmitting}
                    />
                    <span className="rsvp-radio-text">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Presença */}
            <div className="rsvp-field">
              <label htmlFor="rsvp-attendance" className="rsvp-label">
                Confirmação de participação <span className="rsvp-required" aria-hidden="true">*</span>
              </label>
              <select
                id="rsvp-attendance"
                value={formData.attendanceStatus}
                onChange={(e) => updateField('attendanceStatus', e.target.value as AttendanceStatus)}
                className="rsvp-select"
                required
                disabled={isSubmitting}
              >
                <option value="confirmed">✓ Sim, estarei presente</option>
                <option value="declined">✗ Infelizmente não poderei comparecer</option>
              </select>
            </div>
          </fieldset>

          {/* ── Dados Opcionais ────────────────────────────────────────── */}
          <fieldset className="rsvp-fieldset">
            <legend className="rsvp-legend">Informações Adicionais <span className="rsvp-optional">(opcional)</span></legend>

            {/* E-mail */}
            <div className="rsvp-field">
              <label htmlFor="rsvp-email" className="rsvp-label">E-mail</label>
              <input
                id="rsvp-email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={`rsvp-input ${fieldErrors.email ? 'rsvp-input--error' : ''}`}
                disabled={isSubmitting}
                aria-describedby={fieldErrors.email ? 'rsvp-email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="rsvp-email-error" className="rsvp-field-error" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Loja / Potência */}
            <div className="rsvp-field">
              <label htmlFor="rsvp-lodge" className="rsvp-label">Loja / Potência Maçônica</label>
              <input
                id="rsvp-lodge"
                type="text"
                placeholder="Ex.: Loja Virtude e Sabedoria — GOB"
                value={formData.masonicOrganization}
                onChange={(e) => updateField('masonicOrganization', e.target.value)}
                className="rsvp-input"
                disabled={isSubmitting}
              />
            </div>

            {/* Empresa / Profissão */}
            <div className="rsvp-field">
              <label htmlFor="rsvp-company" className="rsvp-label">Empresa / Profissão</label>
              <input
                id="rsvp-company"
                type="text"
                placeholder="Ex.: Escritório Advocacia Silva | Médico"
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                className="rsvp-input"
                disabled={isSubmitting}
              />
            </div>

            {/* Cidade */}
            <div className="rsvp-field">
              <label htmlFor="rsvp-city" className="rsvp-label">Cidade</label>
              <input
                id="rsvp-city"
                type="text"
                placeholder="Ex.: Feira de Santana – BA"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="rsvp-input"
                disabled={isSubmitting}
              />
            </div>
          </fieldset>

          {/* Erro global */}
          {formState === 'error' && errorMessage && (
            <div className="rsvp-global-error" role="alert">
              <span className="rsvp-global-error-icon" aria-hidden="true">⚠</span>
              {errorMessage}
            </div>
          )}

          {/* Botão de submit */}
          <button
            id="rsvp-submit-btn"
            type="submit"
            className="rsvp-submit-btn"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="rsvp-spinner" aria-hidden="true" />
                <span>Confirmando...</span>
              </>
            ) : (
              'CONFIRMAR MINHA PRESENÇA'
            )}
          </button>

          {/* Aviso LGPD */}
          <p className="rsvp-lgpd-notice">
            Ao confirmar sua presença, seus dados serão utilizados exclusivamente para
            organização e comunicação relacionada ao evento.
          </p>
        </form>
      </div>
    </section>
  );
}

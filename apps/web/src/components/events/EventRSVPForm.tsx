'use client';

import React, { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  ChevronDown,
  Sparkles,
  Users,
  Check,
} from 'lucide-react';
import { upsertEventRegistrationAction } from '@/app/actions/platform-events';
import { EventSuccessScreen } from './EventSuccessScreen';
import { trackGa } from '@/lib/analytics/ga';
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

const ATTENDEE_TYPES: { value: AttendeeType; label: string; icon: string }[] = [
  { value: 'macom', label: 'Maçom', icon: '🏛️' },
  { value: 'cunhada', label: 'Cunhada', icon: '🌸' },
  { value: 'familiar', label: 'Familiar', icon: '👨‍👩‍👦' },
  { value: 'convidado', label: 'Convidado Especial', icon: '🤝' },
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
    ref: searchParams.get('ref') ?? undefined,
    utm_source: searchParams.get('utm_source') ?? undefined,
    utm_medium: searchParams.get('utm_medium') ?? undefined,
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

    if (formData.attendeeType === 'macom' && !formData.masonicOrganization.trim()) {
      errors.masonicOrganization = 'Informe sua Loja e Potência Maçônica.';
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
      eventId: event.id,
      fullName: formData.fullName,
      whatsapp: normalizeWhatsApp(formData.whatsapp),
      email: formData.email || undefined,
      attendeeType: formData.attendeeType,
      masonicOrganization: formData.masonicOrganization || undefined,
      companyName: formData.companyName || undefined,
      city: formData.city || undefined,
      attendanceStatus: formData.attendanceStatus,
      source: utmParams.source,
      utmSource: utmParams.utmSource,
      utmMedium: utmParams.utmMedium,
      utmCampaign: utmParams.utmCampaign,
    });

    if (result.success && result.data) {
      setSuccessResult(result.data);
      setFormState('success');
      if (formData.attendanceStatus === 'confirmed') {
        trackGa('generate_lead', { lead_type: 'event_rsvp', event_id: event.id, source_page: 'event' });
      }
    } else {
      setErrorMessage(result.error ?? 'Ocorreu um erro ao processar sua confirmação. Tente novamente.');
      setFormState('error');
    }
  };

  if (formState === 'success' && successResult) {
    return <EventSuccessScreen result={successResult} event={event} />;
  }

  const isSubmitting = formState === 'submitting';

  return (
    <div className="w-full">
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* BLOCO 1: Informações Obrigatórias de Contato */}
        <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#E8E2D9] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E8E2D9]/70 text-xs font-bold uppercase tracking-wider text-[#4b161b]">
            <User className="w-4 h-4 text-[#c59b27]" />
            <span>1. Dados Pessoais de Identificação</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome Completo */}
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="rsvp-fullname" className="block text-xs font-bold text-stone-800">
                Nome Completo <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="rsvp-fullname"
                  type="text"
                  autoComplete="name"
                  placeholder="Digite seu nome completo"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full py-2.5 px-3.5 rounded-xl bg-white border text-stone-900 text-sm focus:outline-none transition-all placeholder:text-stone-400 ${
                    fieldErrors.fullName
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-stone-300 focus:border-[#4b161b] focus:ring-2 focus:ring-[#4b161b]/10'
                  }`}
                  required
                />
              </div>
              {fieldErrors.fullName && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.fullName}</span>
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <label htmlFor="rsvp-whatsapp" className="block text-xs font-bold text-stone-800">
                WhatsApp <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="rsvp-whatsapp"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(75) 99999-9999"
                  value={formData.whatsapp}
                  onChange={(e) => updateField('whatsapp', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full py-2.5 px-3.5 rounded-xl bg-white border text-stone-900 text-sm focus:outline-none transition-all placeholder:text-stone-400 ${
                    fieldErrors.whatsapp
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-stone-300 focus:border-[#4b161b] focus:ring-2 focus:ring-[#4b161b]/10'
                  }`}
                  required
                />
              </div>
              {fieldErrors.whatsapp && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.whatsapp}</span>
                </p>
              )}
            </div>

            {/* E-mail (Opcional) */}
            <div className="space-y-1.5">
              <label htmlFor="rsvp-email" className="block text-xs font-bold text-stone-800">
                E-mail <span className="text-stone-400 font-normal">(opcional)</span>
              </label>
              <input
                id="rsvp-email"
                type="email"
                autoComplete="email"
                placeholder="seuemail@exemplo.com"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                disabled={isSubmitting}
                className={`w-full py-2.5 px-3.5 rounded-xl bg-white border text-stone-900 text-sm focus:outline-none transition-all placeholder:text-stone-400 ${
                  fieldErrors.email
                    ? 'border-red-400 ring-2 ring-red-100'
                    : 'border-stone-300 focus:border-[#4b161b] focus:ring-2 focus:ring-[#4b161b]/10'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>
          </div>

          {/* Vínculo / Tipo de Participante */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-stone-800">
              Vínculo / Categoria do Participante <span className="text-amber-600">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ATTENDEE_TYPES.map(({ value, label, icon }) => {
                const isSelected = formData.attendeeType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField('attendeeType', value)}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-[#3b0b14] text-[#c59b27] border-[#3b0b14] shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor Dinâmico: Loja / Potência (Obrigatório se Maçom) */}
          {formData.attendeeType === 'macom' && (
            <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
              <label htmlFor="rsvp-lodge" className="block text-xs font-bold text-stone-800">
                Loja &amp; Potência Maçônica <span className="text-amber-600">*</span>
              </label>
              <input
                id="rsvp-lodge"
                type="text"
                placeholder="Ex.: Loja 16 de Junho — GOB / GLEB"
                value={formData.masonicOrganization}
                onChange={(e) => updateField('masonicOrganization', e.target.value)}
                disabled={isSubmitting}
                className={`w-full py-2.5 px-3.5 rounded-xl bg-white border text-stone-900 text-sm focus:outline-none transition-all placeholder:text-stone-400 ${
                  fieldErrors.masonicOrganization
                    ? 'border-red-400 ring-2 ring-red-100'
                    : 'border-stone-300 focus:border-[#4b161b] focus:ring-2 focus:ring-[#4b161b]/10'
                }`}
                required
              />
              {fieldErrors.masonicOrganization && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.masonicOrganization}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* BLOCO 2: Informações de Presença e Cidade */}
        <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#E8E2D9] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E8E2D9]/70 text-xs font-bold uppercase tracking-wider text-[#4b161b]">
            <Building2 className="w-4 h-4 text-[#c59b27]" />
            <span>2. Confirmação &amp; Dados Complementares</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status da Presença */}
            <div className="space-y-1.5">
              <label htmlFor="rsvp-status" className="block text-xs font-bold text-stone-800">
                Você comparecerá ao evento? <span className="text-amber-600">*</span>
              </label>
              <select
                id="rsvp-status"
                value={formData.attendanceStatus}
                onChange={(e) => updateField('attendanceStatus', e.target.value as AttendanceStatus)}
                disabled={isSubmitting}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white border border-stone-300 text-stone-900 text-sm font-semibold focus:outline-none focus:border-[#4b161b] focus:ring-2 focus:ring-[#4b161b]/10 transition-all cursor-pointer"
              >
                <option value="confirmed">✓ Sim, estarei presente com certeza</option>
                <option value="declined">✗ Infelizmente não poderei comparecer</option>
              </select>
            </div>

            {/* Cidade / Município */}
            <div className="space-y-1.5">
              <label htmlFor="rsvp-city" className="block text-xs font-bold text-stone-800">
                Sua Cidade <span className="text-stone-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <input
                  id="rsvp-city"
                  type="text"
                  list="rsvp-city-list"
                  placeholder="Ex.: Feira de Santana - BA"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-3.5 pr-8 rounded-xl bg-white border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-[#4b161b] focus:ring-2 focus:ring-[#4b161b]/10 transition-all placeholder:text-stone-400"
                />
                <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <datalist id="rsvp-city-list">
                <option value="Feira de Santana - BA" />
                <option value="Salvador - BA" />
                <option value="Vitória da Conquista - BA" />
                <option value="Camaçari - BA" />
                <option value="Juazeiro - BA" />
                <option value="Itabuna - BA" />
                <option value="Ilhéus - BA" />
                <option value="Lauro de Freitas - BA" />
                <option value="Jequié - BA" />
                <option value="Alagoinhas - BA" />
                <option value="Barreiras - BA" />
                <option value="Porto Seguro - BA" />
                <option value="Santo Antônio de Jesus - BA" />
                <option value="Serrinha - BA" />
                <option value="Conceição do Coité - BA" />
                <option value="Cruz das Almas - BA" />
              </datalist>
            </div>

            {/* Empresa / Profissão (Opcional) */}
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="rsvp-company" className="block text-xs font-bold text-stone-800">
                Empresa ou Atuação Profissional <span className="text-stone-400 font-normal">(para networking fraterno)</span>
              </label>
              <input
                id="rsvp-company"
                type="text"
                placeholder="Ex.: Escritório de Advocacia Silva / Médico / Empresário"
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                disabled={isSubmitting}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-[#4b161b] focus:ring-2 focus:ring-[#4b161b]/10 transition-all placeholder:text-stone-400"
              />
            </div>
          </div>
        </div>

        {/* Mensagem de Erro Geral */}
        {formState === 'error' && errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* BOTÃO PRINCIPAL DE SUBMISSÃO (CONFIRMAR MINHA PRESENÇA) */}
        <div className="pt-2">
          <button
            id="rsvp-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#3b0b14] via-[#4b161b] to-[#2a060d] hover:from-[#4b161b] hover:to-[#3b0b14] text-[#c59b27] font-extrabold text-sm sm:text-base tracking-wide shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2.5 border border-[#c59b27]/40 active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#c59b27]" />
                <span className="text-white">Processando sua confirmação...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-[#c59b27]" />
                <span>CONFIRMAR MINHA PRESENÇA</span>
              </>
            )}
          </button>
        </div>

        {/* Termo e Segurança Fraterna (LGPD) */}
        <div className="text-center pt-1">
          <p className="text-[11px] text-stone-500 leading-relaxed max-w-lg mx-auto">
            🔒 Seus dados são confidenciais e protegidos pela Conexão Maçônica. O comprovante oficial de inscrição e orientações de acesso serão enviados via WhatsApp.
          </p>
        </div>
      </form>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  MapPin,
  Mic,
  ExternalLink,
  Phone,
  MessageCircle,
  Eye,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import {
  EVENT_CONFIRMATION_URL,
  EVENT_WHATSAPP_URL,
  EVENT_TIME_LABEL,
  EVENT_DAY_OF_WEEK,
  EVENT_VENUE_NAME,
  EVENT_VENUE_ADDRESS,
  EVENT_LECTURE_TITLE,
  EVENT_LECTURE_SPEAKER,
  EVENT_ORGANIZERS,
  EVENT_PHONE_FORMATTED,
  CANONICAL_WHATSAPP_NUMBER,
  OFFICIAL_SLOGAN,
} from './constants';
import { generateQRCodeDataURL } from '@/lib/events/qr-code';

export function LaunchEventSection() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isFlyerModalOpen, setIsFlyerModalOpen] = useState(false);

  useEffect(() => {
    generateQRCodeDataURL(EVENT_CONFIRMATION_URL, 600)
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('[LaunchEventSection] QR Code error:', err));
  }, []);

  return (
    <section
      id="lancamento"
      aria-labelledby="lancamento-title"
      className="scroll-mt-16 my-16 sm:my-24 rounded-3xl p-5 sm:p-10 md:p-14 bg-gradient-to-b from-[#380D12] via-[#2A080C] to-[#1A0407] border-2 border-[#C9A227]/40 shadow-2xl relative overflow-hidden text-white"
    >
      {/* 1. ATMOSPHERIC BOKEH & AMBIENT GLOW (Simulando o salão nobre e os lustres do convite) */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#C9A227]/12 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-[#E5C365]/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none"
      />

      {/* Decorative Golden Corner Filigree (Estilo Convite Oficial) */}
      <div
        aria-hidden="true"
        className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#C9A227]/60 pointer-events-none rounded-tl-sm"
      />
      <div
        aria-hidden="true"
        className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#C9A227]/60 pointer-events-none rounded-tr-sm"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#C9A227]/60 pointer-events-none rounded-bl-sm"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#C9A227]/60 pointer-events-none rounded-br-sm"
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* 2. TOP HEADER — CONVITE / LANÇAMENTO */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mb-8 sm:mb-10">
          <div className="h-[1px] flex-1 max-w-[120px] bg-gradient-to-r from-transparent via-[#C9A227]/70 to-[#C9A227]" />
          <span className="font-[family-name:var(--font-marcellus)] text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase text-[#F3EEDD] px-2 text-center">
            Convite / Lançamento
          </span>
          <div className="h-[1px] flex-1 max-w-[120px] bg-gradient-to-l from-transparent via-[#C9A227]/70 to-[#C9A227]" />
        </div>

        {/* 3. LOGO & BRAND TITLE */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center justify-center">
            {/* Medallion Emblem - Exact from flyer */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-3 drop-shadow-xl transition-transform hover:scale-105 duration-300">
              <Image
                src="/icone.png"
                alt="Emblema Oficial Conexão Maçônica"
                width={96}
                height={96}
                className="object-contain"
                priority
              />
            </div>

            <h2
              id="lancamento-title"
              className="font-[family-name:var(--font-marcellus)] text-3xl sm:text-5xl md:text-6xl text-[#FFFDF9] font-normal tracking-tight leading-tight"
            >
              Conexão Maçônica
            </h2>

            <p className="font-serif italic text-sm sm:text-lg text-[#C9A227] font-semibold mt-1">
              &ldquo;{OFFICIAL_SLOGAN}&rdquo;
            </p>
          </div>
        </div>

        {/* 4. INVITATION MESSAGE (Texto exato do convite oficial) */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <p className="text-sm sm:text-base md:text-lg text-[#F3EEDD]/95 font-light leading-relaxed">
            A Conexão Maçônica convida você para uma noite especial de relacionamentos, oportunidades e fortalecimento de negócios. Um encontro pensado para aproximar irmãos, cunhadas, sobrinhos e empresários, estimulando parcerias e novas conexões.
          </p>
        </div>

        {/* 5. COUNTDOWN TIMER */}
        <div className="mb-12">
          <CountdownTimer />
        </div>

        {/* 6. MAIN CONTENT GRID: DETALHES DO EVENTO (ESQUERDA) + RSVP CARD (DIREITA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10">
          {/* LADO ESQUERDO: COORDENADAS, PALESTRAS E PROGRAMAÇÃO */}
          <div className="lg:col-span-7 space-y-6">
            {/* DATA & HORÁRIO */}
            <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-[#200508]/80 border border-[#C9A227]/30 shadow-inner backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227] shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#C9A227] block mb-0.5">
                  Data e Horário
                </span>
                <p className="text-base sm:text-xl font-bold text-[#FFFDF9] leading-snug">
                  24 de novembro de 2026
                </p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#F3EEDD]/90 mt-1 font-medium">
                  <span>{EVENT_DAY_OF_WEEK}</span>
                  <span className="text-[#C9A227]">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#C9A227]">
                    <Clock className="w-3.5 h-3.5" />
                    {EVENT_TIME_LABEL}
                  </span>
                </div>
              </div>
            </div>

            {/* LOCAL */}
            <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-[#200508]/80 border border-[#C9A227]/30 shadow-inner backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227] shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#C9A227] block mb-0.5">
                  Localização
                </span>
                <p className="text-base sm:text-xl font-bold text-[#FFFDF9] leading-snug">
                  {EVENT_VENUE_NAME}
                </p>
                <p className="text-xs sm:text-sm text-[#F3EEDD]/85 mt-1 font-light leading-relaxed">
                  {EVENT_VENUE_ADDRESS}
                </p>
              </div>
            </div>

            {/* ORNAMENTAL DIVIDER COM LOSANGO DOURADO */}
            <div className="flex items-center justify-center gap-3 my-4">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#C9A227]/50" />
              <div className="w-2.5 h-2.5 rotate-45 border border-[#C9A227] bg-[#C9A227]/30" />
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#C9A227]/50" />
            </div>

            {/* PALESTRAS */}
            <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#2B080D] to-[#200508] border border-[#C9A227]/40 shadow-inner backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-[#C9A227]/20 border border-[#C9A227]/50 flex items-center justify-center text-[#C9A227] shrink-0">
                <Mic className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#C9A227] block mb-1">
                  Palestras:
                </span>
                <p className="text-base sm:text-lg font-semibold text-[#FFFDF9] leading-snug">
                  {EVENT_LECTURE_TITLE}
                </p>
                <p className="text-xs sm:text-sm text-[#F3EEDD]/90 font-medium mt-1">
                  {EVENT_LECTURE_SPEAKER}
                </p>
              </div>
            </div>

            {/* DESTAQUES DA NOITE: DRESS CODE, SAXOFONE, COQUETEL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Dress Code */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#200508]/70 border border-[#C9A227]/25">
                <div className="w-9 h-9 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227] shrink-0">
                  {/* Suit / Tuxedo Icon */}
                  <svg
                    className="w-4 h-4 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 2L9 8h6l-3-6zM4 4v16a2 2 0 002 2h12a2 2 0 002-2V4l-6 5.5V12h-4V9.5L4 4zm8 11a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#F3EEDD]/75 block">
                    Dress code:
                  </span>
                  <span className="text-xs font-semibold text-[#FFFDF9]">Esporte fino</span>
                </div>
              </div>

              {/* Recepção com Saxofone */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#200508]/70 border border-[#C9A227]/25">
                <div className="w-9 h-9 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227] shrink-0">
                  {/* Saxophone Icon */}
                  <svg
                    className="w-4 h-4 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19.5 3a2.5 2.5 0 00-2.5 2.5v7.1c-.6-.4-1.4-.6-2.2-.6-2.4 0-4.3 1.9-4.3 4.3 0 2.4 1.9 4.3 4.3 4.3 2.3 0 4.2-1.8 4.3-4.1l.4.1v-8h3V3h-3z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#F3EEDD]/75 block">
                    Recepção:
                  </span>
                  <span className="text-xs font-semibold text-[#FFFDF9]">Ao som de saxofone</span>
                </div>
              </div>

              {/* Coquetel com Voz e Violão */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#200508]/70 border border-[#C9A227]/25">
                <div className="w-9 h-9 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227] shrink-0">
                  {/* Guitar Icon */}
                  <svg
                    className="w-4 h-4 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19.8 4.2a3.5 3.5 0 00-4.9 0l-1.3 1.3 4.9 4.9 1.3-1.3a3.5 3.5 0 000-4.9zM12.2 6.9l-7 7a5 5 0 00-1.4 3.2 5 5 0 006.1 4.7 5 5 0 003.2-1.4l7-7-7.9-6.5zm-1.8 9.5a1.5 1.5 0 112.1-2.1 1.5 1.5 0 01-2.1 2.1z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#F3EEDD]/75 block">
                    Coquetel com:
                  </span>
                  <span className="text-xs font-semibold text-[#FFFDF9]">Voz e violão</span>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: CARD DE RSVP NO ESTILO PERGAMINHO / OURO DO CONVITE */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl p-5 sm:p-6 bg-[#FAF7F0] text-[#2A080C] border-2 border-[#C9A227] shadow-xl relative overflow-hidden">
              {/* Ornamental corner brackets on parchment card */}
              <div
                aria-hidden="true"
                className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#C9A227] pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#C9A227] pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#C9A227] pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#C9A227] pointer-events-none"
              />

              {/* RSVP Title */}
              <div className="text-center mb-4">
                <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[#4B161B] block">
                  RSVP · Confirmação de Presença
                </span>
                <p className="text-xs text-[#5A483E] font-medium mt-0.5">
                  Aponte a câmera do celular ou clique abaixo
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-white border border-[#C9A227]/40 shadow-inner mb-4">
                <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                  {qrDataUrl ? (
                    <Image
                      src={qrDataUrl}
                      alt="QR Code RSVP Conexão Maçônica"
                      width={192}
                      height={192}
                      className="object-contain rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#F3EEDD]/30 text-xs text-[#8B6D1B] animate-pulse">
                      Gerando QR Code...
                    </div>
                  )}

                  {/* Little Medallion Badge in Center of QR */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FAF7F0] p-0.5 flex items-center justify-center shadow-md">
                      <Image
                        src="/icone.png"
                        alt="Logo"
                        width={36}
                        height={36}
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-[#8B6D1B] uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Vagas limitadas</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {/* 1. Direct Online Confirmation Button */}
                <a
                  href={EVENT_CONFIRMATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#4B161B] via-[#611D23] to-[#4B161B] hover:brightness-110 shadow-md shadow-[#4B161B]/20 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
                  <span>Confirmar Presença no Evento</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                {/* 2. View Official Flyer Button */}
                <button
                  type="button"
                  onClick={() => setIsFlyerModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-[#4B161B] hover:text-[#C9A227] hover:bg-[#F3EEDD]/60 border border-[#C9A227]/40 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Visualizar convite oficial (imagem)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 7. BOTTOM CONTACT LINE & AUDIT VERIFICATION (Exato do convite) */}
        <div className="pt-6 border-t border-[#C9A227]/30 text-center">
          <p className="text-xs sm:text-sm text-[#F3EEDD]/95 font-medium leading-relaxed mb-3">
            <span className="text-[#C9A227] font-semibold">Informações:</span>{' '}
            {EVENT_ORGANIZERS} |{' '}
            <span className="text-[#C9A227] font-semibold">Telefone:</span>{' '}
            <a
              href={`tel:+${CANONICAL_WHATSAPP_NUMBER}`}
              className="text-[#FFFDF9] underline decoration-[#C9A227]/60 hover:text-[#C9A227]"
            >
              {EVENT_PHONE_FORMATTED}
            </a>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={EVENT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white bg-[#25D366] hover:bg-[#20bd5a] transition-colors shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Falar pelo WhatsApp com os organizadores</span>
            </a>

            <a
              href={`tel:+${CANONICAL_WHATSAPP_NUMBER}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium text-[#F3EEDD] bg-[#200508] border border-[#C9A227]/30 hover:border-[#C9A227] transition-colors"
            >
              <Phone className="w-3 h-3 text-[#C9A227]" />
              <span>Ligar {EVENT_PHONE_FORMATTED}</span>
            </a>
          </div>
        </div>
      </div>

      {/* 8. MODAL / LIGHTBOX DO CONVITE OFICIAL */}
      {isFlyerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Convite Oficial de Lançamento Conexão Maçônica"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsFlyerModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#200508] rounded-2xl border-2 border-[#C9A227] p-2 sm:p-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with actions */}
            <div className="flex items-center justify-between p-2 mb-2 border-b border-[#C9A227]/30">
              <span className="font-[family-name:var(--font-marcellus)] text-sm sm:text-base text-[#F3EEDD] font-medium">
                Convite Oficial de Lançamento · 24/11/2026
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="/convite-lancamento-conexao.jpg"
                  download="convite-lancamento-conexao-maconica.jpg"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#200508] bg-[#C9A227] hover:bg-[#E5C365] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsFlyerModalOpen(false)}
                  className="p-1.5 rounded-full text-[#F3EEDD]/80 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Flyer Image Container */}
            <div className="relative w-full aspect-[16/9] max-h-[75vh] overflow-hidden rounded-xl bg-black">
              <Image
                src="/convite-lancamento-conexao.jpg"
                alt="Convite Oficial de Lançamento Conexão Maçônica - 24 de Novembro de 2026"
                fill
                priority
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONSENT_STORAGE_KEY, markGaReady, resetGa } from '@/lib/analytics/ga';
import { isAnalyticsExcludedPath } from '@/lib/analytics/ga-paths';

export const CONSENT_KEY = CONSENT_STORAGE_KEY;
export const CONSENT_META_KEY = 'cm_analytics_consent_meta';
export const CONSENT_POLICY_VERSION = '2026.1';
export const CONSENT_EXPIRATION_DAYS = 365;
export const OPEN_COOKIE_PREFERENCES_EVENT = 'open-cookie-preferences';

export type ConsentState = 'granted' | 'denied' | null;

export interface ConsentRecord {
  status: 'granted' | 'denied';
  version: string;
  timestamp: string;
}

/**
 * Dispara evento global para abrir o modal de preferências de cookies de qualquer lugar (ex: rodapé).
 */
export function openCookiePreferences(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT));
  }
}

/**
 * Lê o estado de consentimento do localStorage, validando versão da política e expiração.
 */
export function readConsent(): ConsentState {
  try {
    if (typeof window === 'undefined') return null;
    const value = window.localStorage.getItem(CONSENT_KEY);
    if (value !== 'granted' && value !== 'denied') return null;

    // Validação de metadados de versão e prazo de expiração (LGPD / 12 meses)
    const metaRaw = window.localStorage.getItem(CONSENT_META_KEY);
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw) as ConsentRecord;
        if (meta.version !== CONSENT_POLICY_VERSION) {
          // Versão da política foi atualizada: requer novo consentimento ativo
          return null;
        }
        const recordedTime = new Date(meta.timestamp).getTime();
        const now = Date.now();
        const maxAgeMs = CONSENT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
        if (isNaN(recordedTime) || now - recordedTime > maxAgeMs) {
          // Consentimento expirou por tempo: solicita renovação
          return null;
        }
      } catch {
        // Se o JSON estiver inconsistente mas o valor base existir, mantém compatibilidade
      }
    }

    return value;
  } catch {
    return null;
  }
}

/**
 * Remove todos os cookies do Google Analytics (_ga, _ga_*, _gid, _gat*, _gac*)
 * em domínio atual, domínio raiz e subdomínios, preservando estritamente os cookies essenciais.
 */
export function clearGaCookies(): void {
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const cookies = document.cookie.split(';');
    const hostname = window.location.hostname;
    const hostParts = hostname.split('.');

    // Variações de domínio para abranger apex e subdomínios (ex: .conexaomaconica.com.br, conexaomaconica.com.br)
    const domainVariations: string[] = ['', hostname, `.${hostname}`];
    if (hostParts.length > 2) {
      const rootDomain = hostParts.slice(-2).join('.');
      domainVariations.push(rootDomain, `.${rootDomain}`);
    }

    for (const c of cookies) {
      const name = c.split('=')[0]?.trim();
      if (
        name &&
        (name === '_ga' ||
          name.startsWith('_ga_') ||
          name === '_gid' ||
          name === '_gat' ||
          name.startsWith('_gat_') ||
          name.startsWith('_gac_'))
      ) {
        for (const dom of domainVariations) {
          const domainAttr = dom ? `; domain=${dom}` : '';
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/${domainAttr}`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0${domainAttr}`;
        }
      }
    }
  } catch {
    // ignora exceções em ambientes SSR ou restrições de sandbox
  }
}

/**
 * Google Analytics 4 das páginas públicas com Consent Mode Básico Estrito e LGPD.
 * - Nenhuma tag (gtag.js) é baixada nem executada antes do consentimento ativo.
 * - Suporta banner informativo não bloqueante e modal acessível de preferências.
 * - Permite revogação e reconfiguração a qualquer momento via rodapé ou evento global.
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Inicialização no cliente
  useEffect(() => {
    setMounted(true);
    const initial = readConsent();
    setConsent(initial);
    setAnalyticsAllowed(initial === 'granted');
  }, []);

  // Listener para abertura de preferências permanentes via rodapé ou gatilho externo
  useEffect(() => {
    const handleOpen = () => {
      if (typeof document !== 'undefined') {
        triggerRef.current = document.activeElement as HTMLElement | null;
      }
      setAnalyticsAllowed(readConsent() === 'granted');
      setPreferencesOpen(true);
    };

    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpen);
    return () => {
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpen);
    };
  }, []);

  // Áreas internas e rotas com token na URL ficam fora do GA
  const excluded = isAnalyticsExcludedPath(pathname);
  useEffect(() => {
    (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] =
      excluded || consent !== 'granted';
  }, [excluded, measurementId, consent]);

  // Ação de registrar escolha (Aceitar / Rejeitar / Personalizar)
  const choose = useCallback(
    (value: 'granted' | 'denied') => {
      try {
        window.localStorage.setItem(CONSENT_KEY, value);
        window.localStorage.setItem(
          CONSENT_META_KEY,
          JSON.stringify({
            status: value,
            version: CONSENT_POLICY_VERSION,
            timestamp: new Date().toISOString(),
          } satisfies ConsentRecord)
        );
      } catch {
        // sem storage (navegação anônima restrita): a escolha vale na sessão do componente
      }

      if (value === 'denied') {
        (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = true;
        const currentGtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
        if (typeof currentGtag === 'function') {
          currentGtag('consent', 'update', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
          });
        }
        clearGaCookies();
        resetGa();
      } else {
        (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = false;
        const currentGtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
        if (typeof currentGtag === 'function') {
          currentGtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
          });
        }
      }

      setConsent(value);
      setPreferencesOpen(false);

      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    },
    [measurementId]
  );

  // Abertura do modal de personalização a partir do banner
  const openPreferencesModal = () => {
    if (typeof document !== 'undefined') {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
    setAnalyticsAllowed(consent === 'granted');
    setPreferencesOpen(true);
  };

  // Fechamento do modal de preferências
  const closePreferencesModal = useCallback(() => {
    setPreferencesOpen(false);
    if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
      triggerRef.current.focus();
    }
  }, []);

  // Salvar preferências selecionadas no modal
  const handleSavePreferences = () => {
    choose(analyticsAllowed ? 'granted' : 'denied');
  };

  // Gerenciamento de teclado (ESC fecha o modal)
  useEffect(() => {
    if (!preferencesOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePreferencesModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [preferencesOpen, closePreferencesModal]);

  // Foco automático ao abrir o modal
  useEffect(() => {
    if (preferencesOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [preferencesOpen]);

  // Evita hydration mismatch no Next.js
  if (!mounted || excluded) {
    return null;
  }

  return (
    <>
      {/* SOMENTE INJETA E EXECUTA GTAG.JS SE O CONSENTIMENTO FOI CONCEDIDO ('granted') */}
      {consent === 'granted' ? (
        <>
          <Script id="ga4-init" strategy="afterInteractive" onReady={markGaReady}>
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true,allow_google_signals:false});`}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
            strategy="afterInteractive"
          />
        </>
      ) : null}

      {/* BANNER DE CONSENTIMENTO: EXIBIDO QUANDO NÃO HOUVER DECISÃO REGISTRADA (consent === null) */}
      {consent === null && !preferencesOpen && (
        <div
          role="region"
          aria-label="Aviso de privacidade e cookies"
          className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-5 z-[60] mx-auto max-w-xl rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xl print:hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="mb-2 flex items-center gap-2">
            <span aria-hidden="true" className="text-[#C9A227] text-lg font-serif">
              ◈
            </span>
            <h2 className="font-serif text-base font-bold text-[#4B161B]">
              Sua privacidade é importante para nós.
            </h2>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-stone-700">
            Utilizamos cookies essenciais para o funcionamento da plataforma e, com sua autorização, cookies para
            analisar o uso e melhorar sua experiência. Você pode escolher suas preferências e alterá-las a qualquer momento.
          </p>

          <div className="mt-2.5">
            <Link
              href="/privacidade"
              className="inline-block text-xs font-semibold text-[#4B161B] hover:text-[#C9A227] underline underline-offset-2 transition-colors"
            >
              Política de Privacidade
            </Link>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={() => choose('denied')}
              className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-800 hover:bg-stone-50 transition shadow-2xs cursor-pointer text-center"
            >
              Rejeitar opcionais
            </button>

            <button
              type="button"
              onClick={openPreferencesModal}
              className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#4B161B] hover:bg-[#FAF7F2] transition shadow-2xs cursor-pointer text-center"
            >
              Personalizar
            </button>

            <button
              type="button"
              onClick={() => choose('granted')}
              className="min-h-11 rounded-xl bg-[#4B161B] hover:bg-[#351014] px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition shadow-2xs cursor-pointer text-center"
            >
              Aceitar todos
            </button>
          </div>
        </div>
      )}

      {/* MODAL PERSONALIZAR PREFERÊNCIAS */}
      {preferencesOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePreferencesModal();
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-labelledby="cookie-dialog-title"
            aria-describedby="cookie-dialog-description"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 outline-none max-h-[90vh] overflow-y-auto space-y-5"
          >
            {/* Cabeçalho do modal */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9A227] block">
                  Conexão Maçônica · LGPD
                </span>
                <h2 id="cookie-dialog-title" className="font-serif text-lg sm:text-xl font-bold text-[#4B161B]">
                  Preferências de cookies
                </h2>
              </div>
              <button
                type="button"
                onClick={closePreferencesModal}
                aria-label="Fechar preferências"
                className="rounded-xl p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p id="cookie-dialog-description" className="text-xs sm:text-sm leading-relaxed text-stone-600">
              Escolha quais categorias de cookies você autoriza. Os cookies essenciais são necessários para a
              operação segura do sistema, enquanto os cookies de análise dependem exclusivamente da sua escolha.
            </p>

            {/* Categorias */}
            <div className="space-y-4 pt-1">
              {/* Categoria 1: Cookies essenciais */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-serif text-sm font-bold text-stone-900">Cookies essenciais</h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 shrink-0">
                    Sempre ativos
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-stone-600">
                  Necessários para o funcionamento seguro, autenticação, integridade de sessões e navegação básica
                  na plataforma. Não podem ser desativados pelo painel.
                </p>
              </div>

              {/* Categoria 2: Cookies de análise */}
              <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2 hover:border-[#C9A227]/40 transition">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="analytics-cookies-toggle" className="font-serif text-sm font-bold text-stone-900 cursor-pointer">
                    Cookies de análise
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="analytics-cookies-toggle"
                      type="checkbox"
                      checked={analyticsAllowed}
                      onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4B161B]"></div>
                  </label>
                </div>
                <p className="text-xs leading-relaxed text-stone-600">
                  Desativados por padrão. Utilizados pelo Google Analytics 4 para entender, de forma agregada e anônima,
                  como as páginas públicas são acessadas, sem coletar dados que identifiquem você diretamente.
                </p>
              </div>
            </div>

            {/* Rodapé com botões de ação */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => choose('denied')}
                className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer text-center"
              >
                Rejeitar opcionais
              </button>

              <button
                type="button"
                onClick={handleSavePreferences}
                className="min-h-11 rounded-xl bg-[#4B161B] hover:bg-[#351014] px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition shadow-2xs cursor-pointer text-center"
              >
                Salvar preferências
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { businessSlugFromPath, classifyLinkClick, trackGaEvent } from '@/lib/analytics/ga-events';

const CONSENT_KEY = 'cm_analytics_consent';

export type ConsentState = 'granted' | 'denied' | null;

export function readConsent(): ConsentState {
  try {
    if (typeof window === 'undefined') return null;
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function clearGaCookies() {
  try {
    if (typeof document === 'undefined') return;
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const name = c.split('=')[0]?.trim();
      if (name && (name === '_ga' || name.startsWith('_ga_'))) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    }
  } catch {
    // ignora exceções no ambiente de teste/SSR
  }
}

/**
 * Google Analytics 4 das páginas públicas com Consent Mode Básico Estrito.
 * Nenhuma tag do Google (gtag.js) é baixada nem executada antes do "Aceitar".
 * Nenhum cookie _ga é criado antes da escolha ativa do visitante.
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(null);

  useEffect(() => {
    setMounted(true);
    setConsent(readConsent());
  }, []);

  // Evento view_business a cada navegação se o consentimento tiver sido concedido
  useEffect(() => {
    if (consent !== 'granted') return;
    const slug = businessSlugFromPath(pathname);
    if (slug) trackGaEvent({ name: 'view_business', params: { business_slug: slug } });
  }, [pathname, consent]);

  useEffect(() => {
    if (consent !== 'granted') return;
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const found = classifyLinkClick(anchor.getAttribute('href'), window.location.host, businessSlugFromPath(window.location.pathname));
      if (found) trackGaEvent(found);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [consent]);

  const choose = (value: 'granted' | 'denied') => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // sem storage: a escolha vale na sessão do componente
    }
    if (value === 'denied') {
      clearGaCookies();
    }
    setConsent(value);
  };

  // Evita hydration mismatch no Next.js (SSR não renderiza elementos dependentes do localStorage)
  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* SOMENTE INJETA E EXECUTA GTAG.JS SE O CONSENTIMENTO FOI CONCEDIDO ('granted') */}
      {consent === 'granted' ? (
        <>
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true,allow_google_signals:false});`}
          </Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />
        </>
      ) : null}

      {/* BANNER DE CONSENTIMENTO: EXIBIDO QUANDO NÃO HOUVER DECISÃO REGISTRADA (consent === null) */}
      {consent === null ? (
        <div
          role="dialog"
          aria-label="Aviso de medição de visitas"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl print:hidden sm:bottom-5"
        >
          <p className="text-sm leading-snug text-stone-700">
            Usamos o Google Analytics para entender como a Plataforma é usada para melhorar a experiência. Nenhum dado pessoal é enviado.{' '}
            <a href="/privacidade" className="font-semibold text-[#5d1523] underline">
              Política de Privacidade
            </a>
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => choose('denied')} className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100">
              Recusar
            </button>
            <button type="button" onClick={() => choose('granted')} className="rounded-lg bg-[#5d1523] px-4 py-2 text-sm font-bold text-white hover:bg-[#4B161B]">
              Aceitar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

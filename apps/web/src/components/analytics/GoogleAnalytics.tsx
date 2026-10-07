'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { businessSlugFromPath, classifyLinkClick, trackGaEvent } from '@/lib/analytics/ga-events';

const CONSENT_KEY = 'cm_analytics_consent';

type Consent = 'granted' | 'denied' | null;

function readConsent(): Consent {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function updateGoogleConsent(value: 'granted' | 'denied') {
  (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('consent', 'update', { analytics_storage: value });
}

/**
 * Google Analytics 4 das páginas públicas. Só carrega se NEXT_PUBLIC_GA_MEASUREMENT_ID estiver configurada.
 * Começa com o armazenamento negado (Consent Mode): os cookies de medição só são usados depois do "Aceitar".
 * Os cliques em WhatsApp, telefone, rota, Instagram e site da empresa são capturados por um único listener.
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>('denied'); // 'denied' no primeiro render evita piscar o aviso

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    if (stored === 'granted') updateGoogleConsent('granted');
  }, []);

  // view_business a cada navegação para uma página de empresa.
  useEffect(() => {
    const slug = businessSlugFromPath(pathname);
    if (slug) trackGaEvent({ name: 'view_business', params: { business_slug: slug } });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const found = classifyLinkClick(anchor.getAttribute('href'), window.location.host, businessSlugFromPath(window.location.pathname));
      if (found) trackGaEvent(found);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  const choose = (value: 'granted' | 'denied') => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // sem storage: a escolha vale só nesta visita
    }
    updateGoogleConsent(value);
    setConsent(value);
  };

  return (
    <>
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true,allow_google_signals:false});`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />

      {consent === null ? (
        <div
          role="dialog"
          aria-label="Aviso de medição de visitas"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl print:hidden sm:bottom-5"
        >
          <p className="text-sm leading-snug text-stone-700">
            Usamos o Google Analytics para entender como o guia é usado e melhorar a experiência. Nenhum dado pessoal é enviado.{' '}
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

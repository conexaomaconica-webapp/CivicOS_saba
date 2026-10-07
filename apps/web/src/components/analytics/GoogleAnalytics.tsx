'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { CONSENT_STORAGE_KEY, markGaReady, resetGa } from '@/lib/analytics/ga';
import { isAnalyticsExcludedPath } from '@/lib/analytics/ga-paths';

const CONSENT_KEY = CONSENT_STORAGE_KEY;

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

  // Áreas internas e rotas com token na URL ficam fora do GA: nada é enviado e o aviso de cookies nem aparece.
  const excluded = isAnalyticsExcludedPath(pathname);
  useEffect(() => {
    // Mesmo com o script já carregado (navegação do site público para uma área interna), desliga a coleta.
    (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = excluded;
  }, [excluded, measurementId]);

  const choose = (value: 'granted' | 'denied') => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // sem storage: a escolha vale na sessão do componente
    }
    if (value === 'denied') {
      clearGaCookies();
      resetGa();
    }
    setConsent(value);
  };

  // Evita hydration mismatch no Next.js (SSR não renderiza elementos dependentes do localStorage)
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
            Usamos cookies e o Google Analytics para entender como a plataforma é utilizada e melhorar sua experiência. Os dados são analisados de forma agregada e não utilizamos o Analytics para identificar você diretamente.{' '}
            <a href="/privacidade" className="font-semibold text-[#5d1523] underline">
              Consulte nossa Política de Privacidade.
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

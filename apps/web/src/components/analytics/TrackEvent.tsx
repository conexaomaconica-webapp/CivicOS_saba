'use client';

import { useEffect } from 'react';
import { trackGa, trackGaOnce } from '@/lib/analytics/ga';
import type { GaEventName, GaParams } from '@/lib/analytics/types';

/**
 * Dispara um evento do GA4 quando a página (ou o bloco) aparece. Serve para páginas renderizadas no servidor, que não
 * têm onde chamar o GA: elas só renderizam <TrackEvent name="..." params={{...}} />. Não desenha nada na tela.
 * Com `onceKey`, o evento sai no máximo uma vez por sessão do navegador (ex.: início do cadastro do anunciante).
 */
export function TrackEvent({ name, params, onceKey }: { name: GaEventName; params?: GaParams; onceKey?: string }) {
  const signature = JSON.stringify([name, params ?? {}, onceKey ?? null]);

  useEffect(() => {
    if (onceKey) trackGaOnce(onceKey, name, params ?? {});
    else trackGa(name, params ?? {});
    // O JSON dos parâmetros identifica o evento: navegar para outra cidade/empresa dispara de novo; re-render não.
  }, [signature]);

  return null;
}

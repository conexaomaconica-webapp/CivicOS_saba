'use client';

import { useEffect } from 'react';

/**
 * Componente cliente leve responsável por registrar o Service Worker PWA
 * sem bloquear a renderização nem interferir na performance do servidor.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[PWA] Service Worker registrado:', reg.scope);
          }
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err);
        });
    }
  }, []);

  return null;
}

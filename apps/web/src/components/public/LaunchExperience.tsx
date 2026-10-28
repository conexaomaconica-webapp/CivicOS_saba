'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY_SESSION = 'cm_launch_shown_session';
const STORAGE_KEY_PERMANENT = 'cm_launch_last_seen_ts';
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 horas

export function hasLaunchBeenShown(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (sessionStorage.getItem(STORAGE_KEY_SESSION) === '1') {
      return true;
    }
    const lastSeen = localStorage.getItem(STORAGE_KEY_PERMANENT);
    if (lastSeen && Date.now() - Number(lastSeen) < COOLDOWN_MS) {
      return true;
    }
  } catch {
    // Caso storage esteja indisponível
  }
  return false;
}

export function markLaunchAsShown(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY_SESSION, '1');
    localStorage.setItem(STORAGE_KEY_PERMANENT, String(Date.now()));
  } catch {}
}

type LaunchExperienceProps = {
  forceShow?: boolean;
};

export function LaunchExperience({ forceShow = false }: LaunchExperienceProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // Verifica se o usuário prefere redução de movimento
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion && !forceShow) return;

    // Apenas deve ser elegível para exibição automática na raiz da plataforma (home /)
    const isRootLanding = pathname === '/' || pathname === '';
    if (!forceShow && !isRootLanding) {
      return;
    }

    // Se já foi exibida nesta sessão (sobrevive a F5 e navegação) ou nas últimas 24h, não exibe
    if (!forceShow && hasLaunchBeenShown()) {
      return;
    }

    // Marca imediatamente para não disparar em requisições paralelas ou re-renders
    markLaunchAsShown();
    setVisible(true);
  }, [forceShow, pathname]);

  const handleComplete = useCallback(() => {
    setFading(true);
    markLaunchAsShown();
    setTimeout(() => {
      setVisible(false);
    }, 280);
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Timeout de segurança para nunca travar a experiência do usuário
    const timer = setTimeout(() => {
      handleComplete();
    }, 4500);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleComplete();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [visible, handleComplete]);

  if (!visible) return null;

  const bgColor = playing ? '#321511' : '#491519';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Abertura da Conexão Maçônica"
      className={`fixed inset-0 z-[99999] flex items-center justify-center transition-colors duration-200 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundColor: bgColor,
        padding:
          'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      }}
    >
      <button
        type="button"
        onClick={handleComplete}
        className="absolute top-4 right-4 z-20 rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md transition hover:bg-black/60"
        aria-label="Pular abertura"
      >
        Pular
      </button>

      {failed ? (
        <button
          type="button"
          onClick={handleComplete}
          className="flex h-full w-full items-center justify-center p-6"
          style={{ backgroundColor: '#491519' }}
          aria-label="Continuar para a plataforma"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/splash.svg"
            alt="Conexão Maçônica — Tradição que une, conexão que nos fortalece"
            className="max-h-[75vh] max-w-[85vw] object-contain"
          />
        </button>
      ) : (
        <video
          autoPlay
          muted
          playsInline
          preload="auto"
          poster="/splash.svg"
          onPlay={() => setPlaying(true)}
          onEnded={handleComplete}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
          style={{ backgroundColor: bgColor }}
        >
          <source src="/splash_conexao1.webm" type="video/webm" />
        </video>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';

export interface ToastMessage {
  id: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const { id, type = 'info', title, message, duration = 4000 } = toast;
  const isPausedRef = useRef(false);
  const remainingTimeRef = useRef(duration);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (duration <= 0) return;

    const startTimer = () => {
      timerIdRef.current = setTimeout(() => {
        if (!isPausedRef.current) {
          onDismiss(id);
        }
      }, remainingTimeRef.current);
    };

    startTimer();

    return () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
    };
  }, [id, duration, onDismiss]);

  const handleMouseEnter = () => {
    isPausedRef.current = true;
    if (timerIdRef.current) clearTimeout(timerIdRef.current);
  };

  const handleMouseLeave = () => {
    isPausedRef.current = false;
    if (duration > 0) {
      timerIdRef.current = setTimeout(() => {
        onDismiss(id);
      }, 2000); // 2s Grace period on mouse leave
    }
  };

  const typeClasses = {
    info: 'bg-slate-900 border-blue-500/50 text-slate-100',
    success: 'bg-slate-900 border-emerald-500/50 text-slate-100',
    warning: 'bg-slate-900 border-amber-500/50 text-slate-100',
    danger: 'bg-slate-900 border-rose-500/50 text-slate-100'
  };

  const iconMap = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    danger: '🚨'
  };

  const ariaLiveMode = type === 'danger' ? 'assertive' : 'polite';

  return (
    <div
      role="status"
      aria-live={ariaLiveMode}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      className={`max-w-md w-full p-4 rounded-xl border shadow-xl flex items-start gap-3 transition-all animate-in slide-in-from-top duration-300 ${typeClasses[type]}`}
    >
      <span className="text-base shrink-0" aria-hidden="true">
        {iconMap[type]}
      </span>
      <div className="flex-1 space-y-0.5 text-xs">
        {title && <div className="font-bold text-white tracking-tight">{title}</div>}
        <div className="text-slate-300 leading-relaxed">{message}</div>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="text-slate-400 hover:text-white p-0.5 rounded text-xs transition-colors shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="Fechar Notificação"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificações do Sistema"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-auto"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Button, Dialog } from '@saas/ui';

type FeedbackType = 'info' | 'success' | 'warning' | 'danger';
export interface SystemNotice { type?: FeedbackType; title?: string; message: string; duration?: number }
interface NoticeWithId extends SystemNotice { id: string }
interface ConfirmRequest { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }

const NOTICE_EVENT = 'saba:system-notice';
const CONFIRM_EVENT = 'saba:system-confirm';

export function systemNotify(notice: SystemNotice | string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTICE_EVENT, { detail: typeof notice === 'string' ? { message: notice } : notice }));
}

export function systemConfirm(request: ConfirmRequest | string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent(CONFIRM_EVENT, {
    detail: { request: typeof request === 'string' ? { message: request } : request, resolve },
  })));
}

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };
const styles = {
  info: 'border-blue-200 bg-blue-50 text-blue-950',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  danger: 'border-red-200 bg-red-50 text-red-950',
};

export function SystemFeedbackProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<NoticeWithId[]>([]);
  const [confirmation, setConfirmation] = useState<(ConfirmRequest & { resolve: (value: boolean) => void }) | null>(null);
  const dismiss = useCallback((id: string) => setNotices((current) => current.filter((notice) => notice.id !== id)), []);

  useEffect(() => {
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<SystemNotice>).detail;
      const id = crypto.randomUUID();
      setNotices((current) => [...current.slice(-3), { ...detail, id }]);
      if ((detail.duration ?? 5000) > 0) window.setTimeout(() => dismiss(id), detail.duration ?? 5000);
    };
    const onConfirm = (event: Event) => {
      const detail = (event as CustomEvent<{ request: ConfirmRequest; resolve: (value: boolean) => void }>).detail;
      setConfirmation({ ...detail.request, resolve: detail.resolve });
    };
    window.addEventListener(NOTICE_EVENT, onNotice);
    window.addEventListener(CONFIRM_EVENT, onConfirm);
    return () => {
      window.removeEventListener(NOTICE_EVENT, onNotice);
      window.removeEventListener(CONFIRM_EVENT, onConfirm);
    };
  }, [dismiss]);

  const answer = (value: boolean) => {
    confirmation?.resolve(value);
    setConfirmation(null);
  };

  return <>
    {children}
    <div className="fixed right-4 top-4 z-[600] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-label="Notificações do sistema">
      {notices.map((notice) => {
        const type = notice.type ?? 'info';
        const Icon = icons[type];
        return <div key={notice.id} role={type === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ${styles[type]}`}>
          <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">{notice.title ? <p className="text-sm font-bold">{notice.title}</p> : null}<p className="text-sm leading-relaxed">{notice.message}</p></div>
          <button type="button" onClick={() => dismiss(notice.id)} className="rounded-md p-1 opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Fechar notificação"><X className="h-4 w-4" /></button>
        </div>;
      })}
    </div>
    <Dialog isOpen={Boolean(confirmation)} onClose={() => answer(false)} title={confirmation?.title ?? 'Confirmar ação'} footer={<><Button variant="outline" onClick={() => answer(false)}>{confirmation?.cancelLabel ?? 'Cancelar'}</Button><Button variant={confirmation?.danger ? 'danger' : 'primary'} onClick={() => answer(true)}>{confirmation?.confirmLabel ?? 'Confirmar'}</Button></>}>
      <p>{confirmation?.message}</p>
    </Dialog>
  </>;
}

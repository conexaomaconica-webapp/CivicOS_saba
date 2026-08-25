'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Check, ArrowRight, X } from 'lucide-react';
import {
  getInAppNotificationsAction,
  markNotificationAsReadAction,
  OperationalNotificationItem,
} from '@/lib/notifications/notification-service';

type AdvertiserNotificationBellProps = {
  userId?: string;
};

export default function AdvertiserNotificationBell({ userId }: AdvertiserNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<OperationalNotificationItem[]>([]);

  const loadNotifications = async () => {
    try {
      const res = await getInAppNotificationsAction(userId);
      setUnreadCount(res.unreadCount);
      setNotifications(res.items);
    } catch (_err) {
      // Fallback
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [userId]);

  const handleMarkRead = async (id: string) => {
    await markNotificationAsReadAction(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="relative inline-block">
      {/* Botão do Sino */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 transition-colors relative cursor-pointer"
        title="Central de Notificações"
      >
        <Bell className="w-5 h-5 text-[#C9A227]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white font-mono font-bold text-[10px] flex items-center justify-center border-2 border-stone-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown de Notificações */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-stone-950 border border-[#C9A227]/40 rounded-2xl shadow-2xl z-50 p-4 space-y-3 text-white text-left animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#C9A227]" />
              <h3 className="font-serif font-bold text-sm text-white">Notificações</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A227]/20 text-[#C9A227]">
                  {unreadCount} não lida(s)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-stone-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista de Notificações Recentes */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                    n.is_read
                      ? 'bg-stone-900/40 border-stone-800/80 text-stone-400'
                      : 'bg-[#3B0B14]/40 border-[#C9A227]/40 text-stone-100 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white text-xs">{n.title}</h4>
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => void handleMarkRead(n.id)}
                        className="text-[10px] text-amber-300 hover:underline shrink-0 font-semibold"
                        title="Marcar como lida"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed text-stone-300">{n.body}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                    <span className="text-[10px] font-mono text-stone-500">
                      {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        onClick={() => setOpen(false)}
                        className="text-[11px] font-bold text-[#C9A227] hover:underline flex items-center gap-1"
                      >
                        <span>Acessar</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-500 italic text-center py-4">Nenhuma notificação no momento.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

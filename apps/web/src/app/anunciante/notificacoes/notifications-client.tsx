'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  ExternalLink,
} from 'lucide-react';
import {
  AdvertiserNotificationsDTO,
  AdvertiserNotificationItem,
  markNotificationAsReadAction,
} from '@/lib/advertiser/advertiser-notifications-service';

export default function AdvertiserNotificationsClient({ data }: { data: AdvertiserNotificationsDTO }) {
  const [notifications, setNotifications] = useState<AdvertiserNotificationItem[]>(data.notifications);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsReadAction(id);
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Central de Comunicação • Notificações do Anúncio
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Notificações &amp; Avisos
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Acompanhe atualizações de moderação, financeiro e mensagens dos seus anúncios.
          </p>
        </div>

        <span className="px-3.5 py-1.5 bg-stone-100 border border-stone-200 rounded-full text-xs font-mono font-bold text-stone-700 self-start sm:self-auto">
          {unreadCount} não lidas
        </span>
      </div>

      {/* LISTA DE NOTIFICAÇÕES */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center space-y-2">
            <Bell className="w-8 h-8 text-stone-300 mx-auto" />
            <h3 className="font-serif font-bold text-stone-800 text-sm">Nenhuma notificação recente</h3>
            <p className="text-xs text-stone-500">Você está em dia com todos os comunicados da plataforma.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 rounded-3xl border transition-all text-xs space-y-2 ${
                notif.is_read
                  ? 'bg-white border-stone-200'
                  : 'bg-amber-50/40 border-amber-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      notif.category === 'moderation'
                        ? 'bg-purple-100 text-purple-800'
                        : notif.category === 'billing'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    {notif.category_label}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">{notif.created_at}</span>
                </div>

                {!notif.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="text-[11px] text-amber-900 font-bold hover:underline"
                  >
                    Marcar como lida
                  </button>
                )}
              </div>

              <h3 className="font-serif font-bold text-stone-900 text-sm leading-snug">
                {notif.title}
              </h3>

              <p className="text-stone-600 leading-relaxed">
                {notif.message}
              </p>

              {notif.action_url && (
                <div className="pt-2 border-t border-stone-100 flex items-center justify-end">
                  <Link
                    href={notif.action_url}
                    className="text-[#3B0B14] font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>Ver detalhes</span>
                    <ExternalLink className="w-3 h-3 text-[#C9A227]" />
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Mail,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  FileText,
  Clock,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  getAdminNotificationsListAction,
  reprocessNotificationAction,
  OperationalNotificationItem,
} from '@/lib/notifications/notification-service';

export default function NotificationsManagementClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OperationalNotificationItem[]>([]);
  const [kpis, setKpis] = useState({ total: 15, sent: 12, queued: 1, failed: 2, unread: 4 });
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNotif, setSelectedNotif] = useState<OperationalNotificationItem | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadNotifications = async (filter: string) => {
    setLoading(true);
    const res = await getAdminNotificationsListAction({
      status: filter,
      page: 1,
      pageSize: 20,
    });
    setItems(res.items);
    if (res.kpis) {
      setKpis({
        total: res.kpis.total,
        sent: res.kpis.sent,
        queued: res.kpis.queued,
        failed: res.kpis.failed,
        unread: 4,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications(selectedFilter);
  }, [selectedFilter]);

  const handleRetry = async (notificationId: string) => {
    setReprocessingId(notificationId);
    setActionMsg(null);
    const res = await reprocessNotificationAction(notificationId);
    if (res.success) {
      setActionMsg({ type: 'success', text: res.message || 'Notificação re-enviada com sucesso!' });
      loadNotifications(selectedFilter);
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Falha ao reprocessar envio.' });
    }
    setReprocessingId(null);
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.recipient_email.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.body.toLowerCase().includes(q) ||
      item.event_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-left">
      {/* 1. TOPO EXECUTIVO DE KPIS */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-[#3B0B14] text-white border border-[#C9A227]/50 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#C9A227]">
            <span>Total Disparadas</span>
            <Bell className="w-4 h-4 text-[#C9A227]" />
          </div>
          <p className="text-2xl font-serif font-bold mt-1 text-white">{kpis.total}</p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            <span>Entregues</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-900 mt-1">{kpis.sent}</p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-800">
            <span>Em Fila</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-amber-900 mt-1">{kpis.queued}</p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-rose-800">
            <span>Falhas</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-rose-900 mt-1">{kpis.failed}</p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <span>Não Lidas</span>
            <Eye className="w-4 h-4 text-stone-500" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{kpis.unread}</p>
        </div>
      </section>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* 2. BUSCA & FILTROS OPERACIONAIS */}
      <div className="bg-white border border-stone-300 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar notificação por destinatário, título ou evento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <Filter className="w-4 h-4 text-stone-500 shrink-0" />
            <span className="text-xs font-bold text-stone-600 shrink-0">Filtro:</span>

            {[
              { id: 'all', label: 'Todas' },
              { id: 'sent', label: 'Entregues' },
              { id: 'queued', label: 'Em Fila' },
              { id: 'failed', label: 'Falhas' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/40 shadow-xs'
                    : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. TABELA / CARDS DE NOTIFICAÇÕES */}
      <div className="bg-white border border-stone-300 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500 font-semibold">
            Carregando central de comunicações operacionais...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Bell className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-sm font-bold text-stone-800">
              Nenhuma notificação operacional encontrada neste filtro.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Destinatário & Evento</th>
                  <th className="py-3 px-4 text-center">Canal</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Data / Hora</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                    {/* DESTINATÁRIO & EVENTO */}
                    <td className="py-3.5 px-4">
                      <div className="font-serif font-bold text-sm text-stone-900 line-clamp-1">
                        {item.title}
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {item.recipient_masked_email} • Evento: <strong className="text-stone-700">{item.event_type}</strong>
                      </span>
                    </td>

                    {/* CANAL */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-extrabold text-[10px] uppercase border border-stone-300 inline-flex items-center gap-1">
                        {item.channel === 'email' ? (
                          <>
                            <Mail className="w-3 h-3 text-stone-600" /> E-mail
                          </>
                        ) : item.channel === 'in_app' ? (
                          <>
                            <Bell className="w-3 h-3 text-stone-600" /> In-App
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3 text-stone-600" /> E-mail + In-App
                          </>
                        )}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'sent' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                          ✓ Entregue
                        </span>
                      ) : item.status === 'queued' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                          Em Fila
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px]">
                          ⚠ Falha
                        </span>
                      )}
                    </td>

                    {/* DATA / HORA */}
                    <td className="py-3.5 px-4 text-center font-mono text-stone-700">
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </td>

                    {/* AÇÃO */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedNotif(item)}
                        className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold text-xs rounded-xl border border-stone-300 transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Ver Detalhes</span>
                        <ArrowRight className="w-3.5 h-3.5 text-stone-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. DRAWER / MODAL DE DETALHES 360º DA NOTIFICAÇÃO */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase">
                  Prontuário de Comunicação Operacional
                </span>
                <h3 className="font-serif font-bold text-lg text-stone-900 mt-1">
                  {selectedNotif.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-600">Destinatário:</span>
                <strong className="font-mono text-stone-900">{selectedNotif.recipient_email}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Tipo de Evento:</span>
                <strong className="font-mono text-[#3B0B14]">{selectedNotif.event_type}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Canal de Envio:</span>
                <strong className="uppercase">{selectedNotif.channel}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Data de Envio:</span>
                <strong className="font-mono">{new Date(selectedNotif.created_at).toLocaleString('pt-BR')}</strong>
              </div>

              {selectedNotif.error_details && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 mt-2">
                  <span className="font-bold block">Motivo da Falha:</span>
                  <code className="text-[11px] font-mono">{selectedNotif.error_details}</code>
                </div>
              )}
            </div>

            {/* PREVIEW DO TEMPLATE / CORPO TRANSACIONAL */}
            <div className="p-4 bg-stone-900 text-white rounded-2xl border border-stone-800 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227] block">
                Conteúdo Transacional Enviado:
              </span>
              <p className="text-stone-300 leading-relaxed font-sans">{selectedNotif.body}</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              {selectedNotif.action_url && (
                <Link
                  href={selectedNotif.action_url}
                  className="text-xs font-bold text-[#3B0B14] hover:underline flex items-center gap-1"
                >
                  <FileText className="w-4 h-4" />
                  <span>Abrir Destino no Sistema →</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => handleRetry(selectedNotif.id)}
                disabled={reprocessingId === selectedNotif.id}
                className="px-4 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs border border-[#C9A227]/40"
              >
                {reprocessingId === selectedNotif.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-[#C9A227]" />
                )}
                <span>Reenviar Notificação</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

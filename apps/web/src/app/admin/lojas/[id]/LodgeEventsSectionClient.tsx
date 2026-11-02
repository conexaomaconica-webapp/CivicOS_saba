'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  ExternalLink,
  Edit3,
  Users,
  Megaphone,
  Loader2,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react';
import { AdminCreateEventModal } from '@/components/events/admin/AdminCreateEventModal';
import { AdminEditEventModal } from '@/components/events/admin/AdminEditEventModal';
import {
  getEventsForLodgeAction,
  type PlatformEvent,
} from '@/app/actions/platform-events';

interface Props {
  lodgeId?: string;
  _lodgeId?: string;
  lodgeName: string;
  lodgeCity?: string | null;
  lodgeAddress?: string | null;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0));
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function LodgeEventsSectionClient({
  lodgeId: _lodgeId,
  lodgeName,
  lodgeCity,
  lodgeAddress,
}: Props) {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlatformEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res = await getEventsForLodgeAction(lodgeName);
    if (res.success && res.data) {
      setEvents(res.data);
    }
    setLoading(false);
  }, [lodgeName]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <section className="bg-white border border-stone-300 rounded-2xl p-5 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div>
          <h3 className="font-serif font-bold text-base text-[#1f1914] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#4B161B]" />
            <span>Eventos, Sessões &amp; Ações Sociais da Loja</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Divulgue sessões abertas, aniversários de fundação, banquetes ou campanhas filantrópicas desta oficina.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Divulgar Evento desta Loja</span>
        </button>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
          <span>Carregando eventos da Loja...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="py-6 px-4 bg-stone-50 rounded-xl border border-dashed border-stone-300 text-center space-y-2">
          <Sparkles className="w-6 h-6 text-[#C9A227] mx-auto" />
          <p className="text-xs font-semibold text-stone-700">
            Nenhum evento ou comunicado divulgado por esta Loja ainda.
          </p>
          <p className="text-[11px] text-stone-500 max-w-md mx-auto">
            Você pode divulgar sessões magnas (aniversário, posse, recepção), ações sociais da Fraternidade Feminina ou encontros fraternos.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-1 px-3 py-1.5 bg-white hover:bg-stone-100 text-[#3B0B14] font-bold text-xs rounded-lg border border-stone-300 transition-colors inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Criar primeira divulgação</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 bg-stone-50 hover:bg-amber-50/40 rounded-xl border border-stone-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/30">
                    {evt.badge_text || 'Loja Maçônica'}
                  </span>

                  {!evt.registration_enabled ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <Megaphone className="w-2.5 h-2.5 text-amber-700" /> Apenas Divulgação
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-emerald-700" /> Com RSVP ({evt.capacity ? `${evt.capacity} vagas` : 'Ilimitado'})
                    </span>
                  )}

                  <span className="text-xs font-semibold text-stone-600 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#C9A227]" />
                    {formatDateBR(evt.event_date)} às {evt.start_time?.slice(0, 5)}
                  </span>
                </div>

                <h4 className="font-serif font-bold text-sm text-[#1f1914]">{evt.title}</h4>
                {evt.subtitle && <p className="text-xs text-stone-600 line-clamp-1">{evt.subtitle}</p>}
                {evt.venue_name && (
                  <p className="text-[11px] text-stone-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    <span>{evt.venue_name}{evt.city ? ` · ${evt.city}` : ''}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  href={`/eventos/${evt.slug}`}
                  target="_blank"
                  className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-[#3B0B14] font-semibold text-xs rounded-lg border border-stone-300 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Ver Página</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setEditingEvent(evt)}
                  className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 font-semibold text-xs rounded-lg border border-stone-300 transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação Pré-configurado para esta Loja */}
      {showCreateModal && (
        <AdminCreateEventModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchEvents}
          prefillCategory="lodge"
          prefillLodgeName={lodgeName}
          prefillCity={lodgeCity || ''}
          prefillAddress={lodgeAddress || ''}
        />
      )}

      {/* Modal de Edição */}
      {editingEvent && (
        <AdminEditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSuccess={fetchEvents}
        />
      )}
    </section>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  Eye,
  CheckCircle2,
  Loader2,
  MapPin,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  AdvertiserContentDTO,
  AdvertiserEventItem,
  saveAdvertiserEventAction,
} from '@/lib/advertiser/advertiser-content-service';

export default function AdvertiserEventsClient({ data }: { data: AdvertiserContentDTO }) {
  const { business, quotas, events: initialEvents } = data;
  const [events, setEvents] = useState<AdvertiserEventItem[]>(initialEvents);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [ctaLink, setCtaLink] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await saveAdvertiserEventAction({
        business_id: business.id,
        title,
        description,
        event_date: eventDate || new Date().toISOString(),
        location,
        cta_link: ctaLink,
      });

      if (!res.success) {
        setFeedback({
          type: 'error',
          message: res.message,
        });
        setSaving(false);
        return;
      }

      const newEvt: AdvertiserEventItem = {
        id: `evt-${Date.now()}`,
        title,
        description,
        event_date: eventDate || new Date().toLocaleDateString('pt-BR'),
        location,
        cta_link: ctaLink,
        is_active: true,
        status: 'published',
        status_label: 'Publicado',
      };

      setEvents([newEvt, ...events]);
      setSaving(false);
      setFeedback({
        type: 'success',
        message: 'Evento cadastrado com sucesso!',
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setEventDate('');
      setLocation('');
      setCtaLink('');
    } catch (err: unknown) {
      setSaving(false);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao cadastrar evento.',
      });
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA & BOTÃO ADICIONAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Conteúdo do Anúncio • Eventos Corporativos &amp; Encontros
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Eventos da Empresa
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Divulgue palestras, workshops, inaugurações e eventos organizados pela sua empresa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 transition-all flex items-center gap-2 self-start sm:self-auto shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#C9A227]" />
          <span>Criar Novo Evento</span>
        </button>
      </div>

      {/* COTA NUMÉRICA DO PLANO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-700" /> Cotas do {business.plan_name}: {events.length} de {quotas.events_limit} eventos utilizados
          </span>
          <span className="text-xs font-mono font-bold text-stone-600">
            {events.length} / {quotas.events_limit}
          </span>
        </div>

        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-700 rounded-full"
            style={{ width: `${(events.length / quotas.events_limit) * 100}%` }}
          />
        </div>
      </div>

      {/* FEEDBACK DE AÇÃO */}
      {feedback && (
        <div className="p-4 rounded-2xl border text-xs flex items-center gap-3 bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* LISTA DE EVENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 bg-stone-100 text-stone-800 rounded-lg text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-500" /> {evt.event_date}
                </span>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {evt.status_label}
                </span>
              </div>

              <h3 className="font-serif font-bold text-base text-stone-900 leading-snug">
                {evt.title}
              </h3>

              <p className="text-xs text-stone-600 leading-relaxed">
                {evt.description}
              </p>

              <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{evt.location}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              {evt.cta_link ? (
                <a
                  href={evt.cta_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#3B0B14] hover:underline flex items-center gap-1"
                >
                  <span>Link de Inscrição</span>
                  <ExternalLink className="w-3 h-3 text-[#C9A227]" />
                </a>
              ) : (
                <span className="text-[11px] text-stone-400 font-mono">Presencial</span>
              )}

              <Link
                href={`/guia/${business.slug}`}
                target="_blank"
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded text-[11px] font-bold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Ver no anúncio</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE NOVO EVENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Criar Novo Evento da Empresa
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-800">Título do Evento</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                  placeholder="Ex: Workshop: Tendências em Segurança Física"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800">Data e Hora</label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                    placeholder="Ex: 15/09/2026 às 19:00"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">Local</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                    placeholder="Ex: Auditório Comandos — SP"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Link de Inscrição / Mais Informações (CTA)</label>
                <input
                  type="url"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                  placeholder="https://suaempresa.com.br/evento"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Descrição do Evento</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                  placeholder="Descreva a programação e objetivo do evento..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#3B0B14] text-[#C9A227] font-bold rounded-xl border border-[#C9A227]/40 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />}
                  <span>Salvar Evento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

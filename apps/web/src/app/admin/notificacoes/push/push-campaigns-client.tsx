'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, ImageIcon, Type, Users, Clock, Loader2 } from 'lucide-react';
import {
  countPushAudienceAction,
  listPushCampaignsAction,
  sendPushCampaignAction,
  type PushCampaignListItem,
} from '@/lib/push/push-campaigns-service';

type ContentMode = 'text' | 'image' | 'image_text';

const MODES: Array<{ value: ContentMode; label: string; hint: string; icon: React.ReactNode }> = [
  { value: 'text', label: 'Só texto', hint: 'Título e mensagem', icon: <Type className="w-4 h-4" /> },
  { value: 'image', label: 'Só imagem', hint: 'Título curto e imagem grande', icon: <ImageIcon className="w-4 h-4" /> },
  { value: 'image_text', label: 'Imagem e texto', hint: 'Título, mensagem e imagem', icon: <Send className="w-4 h-4" /> },
];

const ROUTES = [
  { value: '', label: 'Abrir o app normalmente' },
  { value: 'inicio', label: 'Início' },
  { value: 'beneficios', label: 'Benefícios' },
  { value: 'empresas', label: 'Empresas' },
  { value: 'lojas', label: 'Lojas' },
  { value: 'mais', label: 'Mais' },
];

const STATUS_LABEL: Record<string, string> = { sent: 'Enviada', partial: 'Parcial', failed: 'Falhou' };

function defaultExpiry(): string {
  const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function PushCampaignsClient() {
  const [mode, setMode] = useState<ContentMode>('image_text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [route, setRoute] = useState('');
  const [audience, setAudience] = useState<'all' | 'emails'>('all');
  const [emails, setEmails] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<PushCampaignListItem[]>([]);

  const loadHistory = useCallback(async () => {
    const res = await listPushCampaignsAction();
    if (res.success) setHistory(res.items);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await countPushAudienceAction(audience, emails);
      setAudienceCount(res.success ? (res.count ?? 0) : null);
    }, 400);
    return () => clearTimeout(timer);
  }, [audience, emails]);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const needsImage = mode !== 'text';
  const needsBody = mode !== 'image';

  const canSend = useMemo(() => {
    if (sending || !title.trim() || !expiresAt) return false;
    if (needsBody && !body.trim()) return false;
    if (needsImage && !image) return false;
    if (audience === 'emails' && !emails.trim()) return false;
    return true;
  }, [sending, title, expiresAt, needsBody, body, needsImage, image, audience, emails]);

  const handleSend = async () => {
    if (!canSend) return;
    const target = audienceCount !== null ? `${audienceCount} aparelho(s)` : 'o público selecionado';
    if (!window.confirm(`Enviar esta notificação agora para ${target}? Essa ação não pode ser desfeita.`)) return;
    setSending(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('contentMode', mode);
    formData.append('title', title);
    formData.append('body', body);
    formData.append('route', route);
    formData.append('audience', audience);
    formData.append('emails', emails);
    // datetime-local é horário local do navegador: converte para ISO (UTC)
    formData.append('expiresAt', new Date(expiresAt).toISOString());
    if (needsImage && image) formData.append('image', image);
    const res = await sendPushCampaignAction(formData);
    if (res.success) {
      setMessage({
        type: 'success',
        text: `Enviada: ${res.sent} entregue(s) ao serviço de push, ${res.failed} falha(s), de ${res.target} aparelho(s).`,
      });
      setTitle('');
      setBody('');
      setImage(null);
      void loadHistory();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao enviar notificação.' });
    }
    setSending(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <p className="text-xs font-bold text-stone-700 mb-2">Formato da notificação</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                  mode === m.value ? 'border-[#3B0B14] bg-[#3B0B14]/5' : 'border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold text-stone-900">
                  {m.icon}
                  {m.label}
                </span>
                <span className="text-stone-500">{m.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-stone-700" htmlFor="push-title">
            Título ({title.length}/65)
          </label>
          <input
            id="push-title"
            value={title}
            maxLength={65}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm"
            placeholder="Ex.: Novo benefício disponível"
          />
        </div>

        {needsBody && (
          <div>
            <label className="text-xs font-bold text-stone-700" htmlFor="push-body">
              Mensagem ({body.length}/240)
            </label>
            <textarea
              id="push-body"
              value={body}
              maxLength={240}
              rows={3}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm"
              placeholder="Texto que aparece na notificação"
            />
          </div>
        )}

        {needsImage && (
          <div>
            <label className="text-xs font-bold text-stone-700" htmlFor="push-image">
              Imagem (JPG, PNG ou WebP, até 1 MB; proporção 2:1 recomendada)
            </label>
            <input
              id="push-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-xs"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-stone-700" htmlFor="push-route">
              Ao tocar, abrir
            </label>
            <select
              id="push-route"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm bg-white"
            >
              {ROUTES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1" htmlFor="push-expires">
              <Clock className="w-3.5 h-3.5" /> Prazo de validade
            </label>
            <input
              id="push-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Aparelhos desligados ou sem internet só recebem até esta data (máx. 28 dias).
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-stone-700 mb-2 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Público
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={audience === 'all'} onChange={() => setAudience('all')} /> Todos os aparelhos Android
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={audience === 'emails'} onChange={() => setAudience('emails')} /> Membros específicos (e-mails)
            </label>
          </div>
          {audience === 'emails' && (
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={2}
              className="mt-2 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm"
              placeholder="um@email.com, outro@email.com"
            />
          )}
          <p className="text-[11px] text-stone-500 mt-1">
            {audienceCount === null
              ? 'Calculando público…'
              : `${audienceCount} aparelho(s) ativo(s) receberão esta notificação.`}
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-[#C9A227]" />}
          {sending ? 'Enviando…' : 'Enviar agora'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-3">
          <p className="text-xs font-bold text-stone-700">Pré-visualização</p>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 space-y-2 max-w-sm">
            <p className="text-[10px] text-stone-500 font-semibold">Conexão Maçônica • agora</p>
            <p className="text-sm font-bold text-stone-900">{title || 'Título da notificação'}</p>
            {needsBody && <p className="text-xs text-stone-700">{body || 'Mensagem da notificação'}</p>}
            {needsImage &&
              (preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Pré-visualização da imagem" className="w-full rounded-lg object-cover aspect-[2/1]" />
              ) : (
                <div className="w-full aspect-[2/1] rounded-lg bg-stone-200 text-[11px] text-stone-500 flex items-center justify-center">
                  Imagem
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-3">
          <p className="text-xs font-bold text-stone-700">Histórico de envios</p>
          {history.length === 0 ? (
            <p className="text-xs text-stone-500">Nenhuma notificação enviada ainda.</p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {history.map((item) => (
                <li key={item.id} className="p-2.5 rounded-xl border border-stone-200 text-xs space-y-0.5">
                  <div className="flex justify-between gap-2">
                    <strong className="text-stone-900 truncate">{item.title}</strong>
                    <span className="font-bold text-[10px] shrink-0">{STATUS_LABEL[item.status] ?? item.status}</span>
                  </div>
                  <p className="text-stone-500">
                    {new Date(item.created_at).toLocaleString('pt-BR')} • {item.sent_count}/{item.target_count} entregues
                    {item.failed_count > 0 ? ` • ${item.failed_count} falha(s)` : ''}
                  </p>
                  <p className="text-stone-500">Validade: {new Date(item.expires_at).toLocaleString('pt-BR')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

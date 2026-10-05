'use client';

import React, { useEffect, useState } from 'react';
import { BadgeCheck, Camera, Handshake, Loader2, MapPin, ShoppingBag, Wrench, X, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { optimizeImageForUpload } from '@/lib/media/optimize-image';
import { ConnectionLikeButton } from './ConnectionLikeButton';
import { getPublicReferralCountAction } from '@/app/actions/referrals';
import { ReportConnectionButton } from './ReportConnectionButton';
import {
  getPublicBusinessConnectionsAction,
  registerConnectionAction,
  type ConnectionType,
  type PublicConnectionItem,
} from '@/app/actions/connections';

const TYPE_INFO: Record<ConnectionType, { label: string; short: string; Icon: typeof ShoppingBag }> = {
  compra: { label: 'Compra realizada', short: 'comprou', Icon: ShoppingBag },
  servico: { label: 'Serviço contratado', short: 'contratou', Icon: Wrench },
  parceria: { label: 'Parceria realizada', short: 'firmou parceria', Icon: Handshake },
  visita: { label: 'Visita realizada', short: 'visitou a empresa', Icon: MapPin },
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });

type Props = { businessSlug: string };

export function BusinessConnectionsCard({ businessSlug }: Props) {
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [items, setItems] = useState<PublicConnectionItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getPublicBusinessConnectionsAction(businessSlug).then((res) => {
      if (!active) return;
      setConfirmedCount(res.confirmedCount);
      setVisitCount(res.visitCount);
      setItems(res.items);
      setLoaded(true);
    });
    getPublicReferralCountAction(businessSlug).then((count) => active && setReferralCount(count));
    return () => {
      active = false;
    };
  }, [businessSlug]);

  const handleOpen = async () => {
    const { data } = await createClient().auth.getUser();
    if (!data.user) {
      const back = `${window.location.pathname}#conexoes`;
      window.location.href = `/login?redirect=${encodeURIComponent(back)}`;
      return;
    }
    setOpen(true);
  };

  return (
    <section id="conexoes" className="p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-sm text-[#4B161B] flex items-center gap-1.5">
            <Handshake className="w-4 h-4 text-[#C9A227]" />
            <span>Mural de Conexões</span>
          </h3>
          {confirmedCount > 0 || visitCount > 0 || referralCount > 0 ? (
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {confirmedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {confirmedCount} {confirmedCount === 1 ? 'negócio confirmado' : 'negócios confirmados'} pela Conexão
                </span>
              )}
              {referralCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[#4B161B] bg-[#FDFBF7] border border-[#E8E5DF] px-2.5 py-1 rounded-full">
                  <Handshake className="w-3.5 h-3.5 text-[#C9A227]" />
                  {referralCount} {referralCount === 1 ? 'indicação pessoal' : 'indicações pessoais'}
                </span>
              )}
              {visitCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5" />
                  {visitCount} {visitCount === 1 ? 'visita' : 'visitas'}
                </span>
              )}
            </p>
          ) : (
            loaded && <p className="text-xs text-stone-600">Visitou ou comprou aqui? Seja o primeiro a compartilhar sua foto e comentário.</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleOpen()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#4B161B] px-4 py-2 text-xs font-bold text-[#F3EEDD] shadow-xs transition hover:bg-[#3B0B14]"
        >
          <Handshake className="w-3.5 h-3.5 text-[#C9A227]" />
          Visitei / Comprei na Conexão
        </button>
      </div>

      {items.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const info = TYPE_INFO[item.connection_type] || TYPE_INFO.compra;
            return (
              <li key={item.id} className="rounded-xl border border-[#E8E5DF] bg-[#FDFBF7] p-3.5 space-y-2">
                {item.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo_url} alt={`Registro de ${item.member_first_name}`} className="h-32 w-full rounded-lg object-cover" loading="lazy" />
                )}
                <p className="text-xs text-stone-800 leading-relaxed">
                  <strong>{item.member_first_name}</strong> {info.short}
                  {item.item_description ? <> — {item.item_description}</> : null}
                </p>
                {item.message && <p className="text-xs italic text-stone-600">“{item.message}”</p>}
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#4B161B]">
                    <info.Icon className="w-3 h-3" />
                    {info.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <BadgeCheck className="w-3 h-3" />
                    Confirmado · {dateFmt.format(new Date(item.confirmed_at))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <ConnectionLikeButton
                    connectionId={item.id}
                    initialCount={item.like_count ?? 0}
                    initialLiked={Boolean(item.liked_by_me)}
                    loginRedirect={`${typeof window !== 'undefined' ? window.location.pathname : '/guia'}#conexoes`}
                  />
                  <ReportConnectionButton
                    connectionId={item.id}
                    loginRedirect={`${typeof window !== 'undefined' ? window.location.pathname : '/guia'}#conexoes`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && <RegisterConnectionModal businessSlug={businessSlug} onClose={() => setOpen(false)} />}
    </section>
  );
}

export function RegisterConnectionModal({ businessSlug, onClose }: { businessSlug: string; onClose: () => void }) {
  const [type, setType] = useState<ConnectionType>('compra');
  const [item, setItem] = useState('');
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !submitting && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const handlePhoto = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const supabase = createClient();
    let uploadedPath: string | null = null;

    try {
      let photoUrl: string | null = null;
      if (photo) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Sua sessão expirou. Entre novamente.');
        const optimized = await optimizeImageForUpload(photo, { maxBytes: 700 * 1024, maxDimension: 1600 });
        uploadedPath = `${userData.user.id}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('connection-photos')
          .upload(uploadedPath, optimized, { contentType: 'image/webp', upsert: false });
        if (uploadError) throw new Error('Não foi possível enviar a foto. Você pode registrar a conexão sem ela.');
        photoUrl = supabase.storage.from('connection-photos').getPublicUrl(uploadedPath).data.publicUrl;
      }

      const res = await registerConnectionAction({ businessSlug, type, item, message, photoUrl });
      if (!res.success) {
        if (uploadedPath) await supabase.storage.from('connection-photos').remove([uploadedPath]);
        throw new Error(res.error || 'Não foi possível registrar a conexão.');
      }
      setDone(res.businessName || 'a empresa');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar a conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar conexão comercial"
      onClick={() => !submitting && onClose()}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-3 top-3 rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h4 className="font-serif text-lg font-bold text-[#4B161B]">Conexão registrada!</h4>
            <p className="text-sm text-stone-600">
              Avisamos {done}. Assim que a empresa confirmar o atendimento, a conexão aparece no mural; a foto, se houver, aparece depois da análise da plataforma. Obrigado por fortalecer a rede!
            </p>
            <button type="button" onClick={onClose} className="rounded-xl bg-[#4B161B] px-5 py-2 text-sm font-bold text-[#F3EEDD]">
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h4 className="font-serif text-lg font-bold text-[#4B161B]">Comprei na Conexão</h4>
              <p className="mt-1 text-xs text-stone-600">
                Conte como foi sua experiência. A empresa confirma o atendimento, sem precisar informar valores.
              </p>
            </div>

            <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <legend className="sr-only">Tipo de conexão</legend>
              {(Object.keys(TYPE_INFO) as ConnectionType[]).map((key) => {
                const { label, Icon } = TYPE_INFO[key];
                const selected = type === key;
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-2.5 text-center text-[11px] font-semibold transition ${
                      selected ? 'border-[#4B161B] bg-[#4B161B] text-[#F3EEDD]' : 'border-stone-200 text-stone-700 hover:border-[#C9A227]'
                    }`}
                  >
                    <input type="radio" name="connection-type" value={key} checked={selected} onChange={() => setType(key)} className="sr-only" />
                    <Icon className="h-4 w-4" />
                    {label}
                  </label>
                );
              })}
            </fieldset>

            <label className="block text-xs font-bold text-stone-700">
              {type === 'visita' ? 'O que você conheceu ou fez lá?' : 'O que você comprou ou contratou?'} <span className="font-normal text-stone-500">(opcional)</span>
              <input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                maxLength={160}
                placeholder={type === 'visita' ? 'Ex.: conheci a loja, fui ao evento' : 'Ex.: óculos de grau, reforma da cozinha'}
                className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal"
              />
            </label>

            <label className="block text-xs font-bold text-stone-700">
              Sua experiência <span className="font-normal text-stone-500">(opcional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={400}
                rows={3}
                placeholder="Ex.: Fiz meus óculos na Óptica X através da Conexão."
                className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal"
              />
            </label>

            <div>
              <span className="block text-xs font-bold text-stone-700">
                Foto <span className="font-normal text-stone-500">(opcional)</span>
              </span>
              {preview ? (
                <div className="mt-1 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Prévia da foto" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPreview(null);
                    }}
                    className="text-xs font-semibold text-rose-700 hover:underline"
                  >
                    Remover foto
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 px-3 py-3 text-xs text-stone-600 hover:border-[#C9A227]">
                  <Camera className="h-4 w-4 text-[#C9A227]" />
                  Adicionar uma foto
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => handlePhoto(e.target.files?.[0])} />
                </label>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">
                {error}
              </p>
            )}

            <p className="text-[11px] text-stone-500">
              Seu primeiro nome aparece no mural só depois da confirmação da empresa. Nada de preço é exibido. Se você enviar foto, ela passa por uma análise rápida da plataforma antes de aparecer.
            </p>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4B161B] px-5 py-2 text-sm font-bold text-[#F3EEDD] disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar conexão
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, MessageCircle, Share2, Users, X } from 'lucide-react';
import { getMyReferralLinkAction } from '@/app/actions/referrals';
import { useBusinessAnalytics } from '@/components/public/business/BusinessContactTracker';
import { trackGa } from '@/lib/analytics/ga';
import { trackEvent } from '@/lib/analytics/track-client';

type Props = {
  businessName: string;
  businessSlug: string;
  onClose: () => void;
  /** Chamado quando a pessoa de fato copia o link, abre o WhatsApp ou compartilha (para métricas). */
  onShared?: () => void;
};

/**
 * "Indicar esta empresa". Membro logado: link com o próprio código (a indicação é contada e acompanhada).
 * Visitante sem login: link comum, com convite para entrar e acompanhar as indicações.
 */
export function ReferBusinessModal({ businessName, businessSlug, onClose, onShared }: Props) {
  const [loading, setLoading] = useState(true);
  const [trackedUrl, setTrackedUrl] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const analytics = useBusinessAnalytics();

  // Compartilhar (copiar link, WhatsApp ou menu do aparelho): vai ao GA4 (com os dados da empresa quando a página é de empresa,
  // só com o slug quando vem de um card do guia) e à medição própria do painel do anunciante.
  // Na página da empresa não há onShared: o modal registra o compartilhamento. Nos cards do guia, quem registra é o onShared.
  const notifyShared = () => {
    if (analytics) {
      analytics.track('share_business');
      if (!onShared) trackEvent({ businessId: analytics.business.id, eventType: 'share', source: 'business_profile' });
    } else {
      trackGa('share_business', { business_slug: businessSlug, source_page: 'directory_card' });
    }
    onShared?.();
  };

  const plainUrl = typeof window !== 'undefined' ? `${window.location.origin}/guia/${encodeURIComponent(businessSlug)}` : '';
  const url = trackedUrl || plainUrl;
  const message = `Conheça ${businessName} na Conexão Maçônica: ${url}`;

  useEffect(() => {
    let active = true;
    getMyReferralLinkAction(businessSlug).then((res) => {
      if (!active) return;
      if (res.success && res.url) setTrackedUrl(res.url);
      else if (res.unauthorized) setNeedsLogin(true);
      else setError(res.error || '');
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [businessSlug]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notifyShared();
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: businessName, text: `Conheça ${businessName} na Conexão Maçônica.`, url });
      notifyShared();
    } catch {}
  };

  const loginHref = `/login?redirect=${encodeURIComponent(`/guia/${businessSlug}`)}`;
  const registerHref = `/register?redirect=${encodeURIComponent(`/guia/${businessSlug}`)}`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Indicar esta empresa"
      onClick={onClose}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>

        <h4 className="flex items-center gap-2 font-serif text-lg font-bold text-[#4B161B]">
          <Users className="h-5 w-5 text-[#C9A227]" /> Indicar esta empresa
        </h4>
        <p className="mt-1 text-xs text-stone-600">
          Indique <strong>{businessName}</strong> a um irmão, amigo ou cliente. Cada pessoa que abrir o seu link conta como uma indicação pessoal da empresa.
        </p>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Gerando seu link…
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {needsLogin && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Este é um link comum. Para o <strong>seu nome</strong> ficar registrado como quem indicou e para acompanhar o resultado, <a className="font-bold underline" href={loginHref}>entre</a> ou <a className="font-bold underline" href={registerHref}>cadastre-se grátis</a>.
              </p>
            )}
            {trackedUrl && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">Link pessoal: as indicações feitas por ele aparecem em “Minhas indicações”.</p>}

            <div className="flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 p-2">
              <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-1 text-xs text-stone-800 outline-none" aria-label="Link de indicação" />
              <button type="button" onClick={() => void copy()} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#4B161B] px-3 py-1.5 text-xs font-bold text-[#F3EEDD]">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => notifyShared()}
                data-cm-tracked
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              {typeof navigator !== 'undefined' && 'share' in navigator ? (
                <button type="button" onClick={() => void nativeShare()} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs font-bold text-stone-800">
                  <Share2 className="h-4 w-4" /> Compartilhar…
                </button>
              ) : (
                <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs font-bold text-stone-800">
                  Fechar
                </button>
              )}
            </div>

            {error && <p className="text-[11px] text-rose-700" role="alert">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

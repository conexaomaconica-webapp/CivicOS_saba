'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight, Handshake, MapPin, ShoppingBag, Wrench } from 'lucide-react';
import type { ConnectionFeedItem, ConnectionType } from '@/app/actions/connections';
import { ConnectionLikeButton } from '@/components/public/business/sections/ConnectionLikeButton';
import { ConnectionPhotoPreview } from '@/components/public/connections/ConnectionPhotoPreview';
import { ReportConnectionButton } from '@/components/public/business/sections/ReportConnectionButton';
import { connectionPath, isConnectionId } from '@/lib/directory/connections-share';

const TYPE_INFO: Record<ConnectionType, { label: string; verb: string; preposition: string; Icon: typeof ShoppingBag }> = {
  compra: { label: 'Compra', verb: 'comprou', preposition: 'em', Icon: ShoppingBag },
  servico: { label: 'Serviço', verb: 'contratou', preposition: 'em', Icon: Wrench },
  parceria: { label: 'Parceria', verb: 'firmou parceria', preposition: 'com', Icon: Handshake },
  visita: { label: 'Visita', verb: 'visitou', preposition: '', Icon: MapPin },
};

type Props = {
  items: ConnectionFeedItem[];
  /** Onde a pessoa volta depois de entrar para curtir/denunciar. */
  loginRedirect?: string;
  /** Origem registrada no link da empresa (métricas). */
  source?: string;
  /** Mostra o botão de denúncia (a landing mostra só a curtida). */
  showReport?: boolean;
};

/**
 * Vitrine COMPACTA do Mural de Conexões: texto curto; mostra a fotografia SOMENTE quando aprovada.
 * Desktop: até 3 cartões lado a lado. Celular: 1 cartão por vez, com rolagem horizontal, setas e indicador.
 * A escolha das conexões é sorteada no servidor (preferindo as com foto); aqui só se exibe o que chegou.
 */
export function ConnectionsCompactShowcase({ items, loginRedirect = '/guia#mural-de-conexoes', source = 'feed_wall', showReport = true }: Props) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const total = items.length;

  const updateActive = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  }, [total]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateActive, { passive: true });
    return () => el.removeEventListener('scroll', updateActive);
  }, [updateActive]);

  if (total === 0) return null;

  const go = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.min(total - 1, Math.max(0, active + direction)) * el.clientWidth, behavior: 'smooth' });
  };

  const cols = total >= 3 ? 'md:grid-cols-3' : total === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1 md:max-w-xl';

  return (
    <div className="relative" role="region" aria-roledescription="carrossel" aria-label="Conexões recentes">
      <ul
        ref={trackRef}
        className={`flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:gap-4 md:overflow-visible ${cols}`}
      >
        {items.map((item, index) => {
          const info = TYPE_INFO[item.connection_type] || TYPE_INFO.compra;
          const Icon = info.Icon;
          return (
            <li
              key={item.id}
              className="w-full shrink-0 snap-center px-1 md:px-0"
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${total}`}
            >
              <article className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs transition hover:border-[#C9A227]/60">
                {item.photo_url && (
                  <ConnectionPhotoPreview
                    src={item.photo_url}
                    alt={`Registro de ${item.member_first_name} em ${item.business_name}`}
                    containerClassName="relative -mx-4 -mt-4 mb-1 w-[calc(100%+2rem)] max-w-none overflow-hidden bg-stone-100"
                    imgClassName="h-44 w-full object-contain"
                  />
                )}
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4B161B] text-[#C9A227]" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a6d12]">{info.label}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-stone-800">
                      <strong>{item.member_first_name}</strong> {info.verb}
                      {item.item_description ? <> {item.item_description}</> : null}{' '}
                      {info.preposition ? `${info.preposition} ` : ''}
                      <Link href={`/guia/${item.business_slug}?src=${source}`} className="font-bold text-[#4B161B] hover:underline">
                        {item.business_name}
                      </Link>
                    </p>
                  </div>
                </div>
                {item.message && <p className="line-clamp-2 text-xs italic text-stone-600">“{item.message}”</p>}
                <div className="mt-auto flex items-center justify-between pt-1 text-[11px] text-stone-500">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" /> Confirmado pela empresa
                  </span>
                  <span className="flex items-center gap-3">
                    {isConnectionId(item.id) && (
                      <Link href={connectionPath(item.id)} aria-label={`Abrir a conexão de ${item.business_name}`} title="Abrir conexão" className="text-stone-400 transition hover:text-[#4B161B]">
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                    <ConnectionLikeButton connectionId={item.id} initialCount={item.like_count ?? 0} initialLiked={Boolean(item.liked_by_me)} loginRedirect={loginRedirect} />
                    {showReport && <ReportConnectionButton connectionId={item.id} loginRedirect={loginRedirect} />}
                  </span>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {/* Navegação do carrossel: somente no celular (no desktop os cartões ficam todos visíveis) */}
      {total > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 md:hidden">
          <button type="button" onClick={() => go(-1)} disabled={active === 0} aria-label="Conexão anterior" className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-[#4B161B] disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-stone-500" aria-live="polite">{active + 1} de {total}</span>
          <button type="button" onClick={() => go(1)} disabled={active === total - 1} aria-label="Próxima conexão" className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-[#4B161B] disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

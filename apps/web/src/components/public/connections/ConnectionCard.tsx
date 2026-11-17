'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Handshake, MapPin, ShoppingBag, Wrench } from 'lucide-react';
import type { ConnectionType, PublicConnectionListItem } from '@/app/actions/connections';
import { ConnectionLikeButton } from '@/components/public/business/sections/ConnectionLikeButton';
import { ReportConnectionButton } from '@/components/public/business/sections/ReportConnectionButton';
import { connectionPath, isConnectionId } from '@/lib/directory/connections-share';

const TYPE_INFO: Record<ConnectionType, { label: string; verb: string; preposition: string; Icon: typeof ShoppingBag }> = {
  compra: { label: 'Compra', verb: 'comprou', preposition: 'em', Icon: ShoppingBag },
  servico: { label: 'Serviço', verb: 'contratou', preposition: 'em', Icon: Wrench },
  parceria: { label: 'Parceria', verb: 'firmou parceria', preposition: 'com', Icon: Handshake },
  visita: { label: 'Visita', verb: 'visitou', preposition: '', Icon: MapPin },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Cartão do mural completo (/conexoes): informação objetiva, empresa em destaque e fotografia SOMENTE quando
 * aprovada na moderação (a consulta já entrega photo_url vazio nos demais casos).
 */
export function ConnectionCard({ item, loginRedirect = '/conexoes' }: { item: PublicConnectionListItem; loginRedirect?: string }) {
  const info = TYPE_INFO[item.connection_type] || TYPE_INFO.compra;
  const Icon = info.Icon;
  const date = formatDate(item.confirmed_at);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs transition hover:border-[#C9A227]/60 hover:shadow-md">
      {item.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.photo_url} alt={`Registro de ${item.member_first_name} em ${item.business_name}`} className="h-44 w-full object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4B161B]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#4B161B]">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {info.label}
          </span>
          {date && <time dateTime={item.confirmed_at} className="text-[11px] text-stone-500">{date}</time>}
        </div>

        <p className="text-sm leading-relaxed text-stone-800">
          <strong>{item.member_first_name}</strong> {info.verb}
          {item.item_description ? <> {item.item_description}</> : null}{' '}
          {info.preposition ? `${info.preposition} ` : ''}
          <Link href={`/guia/${item.business_slug}?src=connections_wall`} className="font-bold text-[#4B161B] hover:underline">
            {item.business_name}
          </Link>
        </p>

        {item.message && <p className="line-clamp-4 text-xs italic text-stone-600">“{item.message}”</p>}

        {isConnectionId(item.id) && (
          <Link href={connectionPath(item.id)} className="inline-flex items-center gap-1 self-start text-xs font-bold text-[#4B161B] hover:underline">
            Ver conexão
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-stone-100 pt-3 text-[11px] text-stone-500">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" /> Confirmado pela empresa
          </span>
          <span className="flex items-center gap-3">
            <ConnectionLikeButton connectionId={item.id} initialCount={item.like_count ?? 0} initialLiked={Boolean(item.liked_by_me)} loginRedirect={loginRedirect} />
            <ReportConnectionButton connectionId={item.id} loginRedirect={loginRedirect} />
          </span>
        </div>
      </div>
    </article>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { BadgeCheck, Camera, Handshake, MapPin, ShoppingBag, Wrench } from 'lucide-react';
import type { ConnectionFeedItem, ConnectionType } from '@/app/actions/connections';
import { ConnectionLikeButton } from '@/components/public/business/sections/ConnectionLikeButton';
import { ReportConnectionButton } from '@/components/public/business/sections/ReportConnectionButton';
import { ConnectionStartFlow } from './ConnectionStartFlow';

const TYPE_INFO: Record<ConnectionType, { label: string; verb: string; preposition: string; Icon: typeof ShoppingBag }> = {
  compra: { label: 'Compra realizada', verb: 'comprou', preposition: 'em', Icon: ShoppingBag },
  servico: { label: 'Serviço contratado', verb: 'contratou', preposition: 'em', Icon: Wrench },
  parceria: { label: 'Parceria realizada', verb: 'firmou parceria', preposition: 'com', Icon: Handshake },
  visita: { label: 'Visita realizada', verb: 'visitou', preposition: '', Icon: MapPin },
};

type Props = {
  items: ConnectionFeedItem[];
  confirmedTotal: number;
};

export function DirectoryConnectionsMural({ items, confirmedTotal }: Props) {
  return (
    <section className="dh-container py-4" id="mural-de-conexoes">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="dh-section-title flex items-center gap-2">
            <Handshake className="h-7 w-7 text-amber-900" />
            <span>Mural de Conexões</span>
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Conexões reais de quem comprou, contratou, fez parceria ou visitou empresas da Plataforma. Cada registro é confirmado pela empresa.
          </p>
        </div>
        {confirmedTotal > 0 && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 sm:self-auto">
            <BadgeCheck className="h-3.5 w-3.5" />
            {confirmedTotal} {confirmedTotal === 1 ? 'negócio confirmado' : 'negócios confirmados'}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const info = TYPE_INFO[item.connection_type] || TYPE_INFO.compra;
          return (
            <article key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
              {item.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photo_url} alt={`Registro de ${item.member_first_name} em ${item.business_name}`} className="h-44 w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[#4B161B] to-[#3B0B14] text-[#C9A227]">
                  <info.Icon className="h-8 w-8" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-sm leading-relaxed text-stone-800">
                  <strong>{item.member_first_name}</strong> {info.verb}
                  {item.item_description ? <> {item.item_description}</> : null}{' '}
                  {info.preposition ? `${info.preposition} ` : ''}
                  <Link href={`/guia/${item.business_slug}`} className="font-bold text-[#4B161B] hover:underline">
                    {item.business_name}
                  </Link>
                </p>
                {item.message && <p className="text-xs italic text-stone-600">“{item.message}”</p>}
                <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-stone-500">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <BadgeCheck className="h-3 w-3" /> Confirmado pela empresa
                  </span>
                  <span className="flex items-center gap-3">
                    <ConnectionLikeButton
                      connectionId={item.id}
                      initialCount={item.like_count ?? 0}
                      initialLiked={Boolean(item.liked_by_me)}
                      loginRedirect="/guia#mural-de-conexoes"
                    />
                    <ReportConnectionButton connectionId={item.id} loginRedirect="/guia#mural-de-conexoes" />
                  </span>
                </div>
              </div>
            </article>
          );
        })}

        {/* Convite para registrar: sempre presente, é o que alimenta o mural */}
        <article className="col-span-full flex flex-col gap-4 rounded-2xl border border-dashed border-[#C9A227]/70 bg-[#FDFBF7] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 text-[#4B161B]">
              <Camera className="h-5 w-5 shrink-0 text-[#C9A227]" />
              <h3 className="font-serif text-lg font-bold">Visitou ou comprou em uma empresa da Conexão?</h3>
            </div>
            <p className="text-sm leading-relaxed text-stone-600">
              Conte como foi sua experiência. É rápido, a foto é opcional e seu registro ajuda a valorizar e reconhecer as empresas que fazem parte da Conexão Maçônica.
            </p>
            {items.length === 0 && <p className="text-xs text-stone-500">Seja o primeiro a compartilhar sua experiência no mural.</p>}
          </div>
          <ConnectionStartFlow
            loginRedirect="/guia#mural-de-conexoes"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#4B161B] px-6 py-3 text-sm font-bold text-[#F3EEDD] shadow-xs transition hover:bg-[#3B0B14]"
          >
            <Handshake className="h-4 w-4 text-[#C9A227]" />
            Registrar minha conexão
          </ConnectionStartFlow>
        </article>
      </div>
    </section>
  );
}

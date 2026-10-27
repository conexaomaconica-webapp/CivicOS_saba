'use client';

import React from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Camera,
  Handshake,
  MapPin,
  ShoppingBag,
  Wrench,
  ArrowRight,
  ShieldCheck,
  Store,
} from 'lucide-react';
import type { ConnectionFeedItem, ConnectionType } from '@/app/actions/connections';
import { ConnectionLikeButton } from '@/components/public/business/sections/ConnectionLikeButton';

const TYPE_INFO: Record<ConnectionType, { label: string; verb: string; preposition: string; Icon: typeof ShoppingBag }> = {
  compra: { label: 'Compra realizada', verb: 'comprou', preposition: 'em', Icon: ShoppingBag },
  servico: { label: 'Serviço contratado', verb: 'contratou serviços', preposition: 'em', Icon: Wrench },
  parceria: { label: 'Parceria realizada', verb: 'firmou parceria', preposition: 'com', Icon: Handshake },
  visita: { label: 'Visita realizada', verb: 'visitou', preposition: '', Icon: MapPin },
};

type Props = {
  items: ConnectionFeedItem[];
  confirmedTotal: number;
};

export function LandingConnectionsMuralSection({ items, confirmedTotal }: Props) {
  const hasItems = items && items.length > 0;

  return (
    <section id="mural" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#8a6d12]">
              <Handshake className="h-4 w-4 text-[#C9A227]" />
              Mural de Conexões
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#2a0a10] sm:text-4xl">
              Da conexão ao encontro. Do encontro a novas oportunidades.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-stone-600 sm:text-lg">
              A cada visita, compra ou parceria, os laços que nos unem se transformam em novas histórias.
              O Mural de Conexões valoriza esses encontros reais, dando visibilidade aos irmãos e familiares que prestigiam
              os negócios participantes da nossa rede, mediante autorização.
            </p>
          </div>

          {confirmedTotal > 0 && (
            <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 sm:self-auto">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <span>
                {confirmedTotal} {confirmedTotal === 1 ? 'conexão confirmada' : 'conexões confirmadas'} na rede
              </span>
            </div>
          )}
        </div>

        {hasItems ? (
          /* FEED DE REGISTROS REAIS CONFIRMADOS */
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 6).map((item) => {
              const info = TYPE_INFO[item.connection_type] || TYPE_INFO.compra;
              const Icon = info.Icon;
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs transition hover:border-[#C9A227]/60 hover:shadow-md"
                >
                  {item.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photo_url}
                      alt={`Registro de ${item.member_first_name} em ${item.business_name}`}
                      className="h-48 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#4B161B] to-[#2a0a10] text-[#C9A227]">
                      <Icon className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <p className="text-sm leading-relaxed text-stone-800">
                      <strong>{item.member_first_name}</strong> {info.verb}
                      {item.item_description ? <> {item.item_description}</> : null}{' '}
                      {info.preposition ? `${info.preposition} ` : ''}
                      <Link
                        href={`/guia/${item.business_slug}`}
                        className="font-bold text-[#5d1523] hover:underline"
                      >
                        {item.business_name}
                      </Link>
                    </p>

                    {item.message && (
                      <p className="text-xs italic text-stone-600">“{item.message}”</p>
                    )}

                    <div className="mt-auto flex items-center justify-between border-t border-stone-100 pt-3 text-[11px] text-stone-500">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <BadgeCheck className="h-3.5 w-3.5" /> Confirmado pela empresa
                      </span>
                      <ConnectionLikeButton
                        connectionId={item.id}
                        initialCount={item.like_count ?? 0}
                        initialLiked={Boolean(item.liked_by_me)}
                        loginRedirect="/guia#mural-de-conexoes"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* ESTADO VAZIO INSTITUCIONAL ELEGANTE */
          <div className="mt-12 rounded-3xl border border-stone-200 bg-[#fbf7ee]/60 p-8 sm:p-12">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A227]/40 bg-white px-3 py-1 text-xs font-bold text-[#8a6d12]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#C9A227]" />
                Registros reais, compartilhados com autorização e confirmação
              </span>
              <h3 className="mt-4 text-2xl font-bold text-[#2a0a10]">
                O que acontece quando você prestigia uma empresa da Conexão?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-base">
                Diferente de um catálogo tradicional de anúncios, a Conexão Maçônica valoriza e reconhece os encontros
                reais. Veja como o ciclo de relacionamento funciona:
              </p>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5d1523]/10 text-[#5d1523]">
                  <Store className="h-5 w-5" />
                </div>
                <h4 className="mt-3 font-bold text-[#2a0a10]">1. Prestigie uma empresa</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Visite o estabelecimento, contrate um serviço ou firme uma parceria com um irmão ou familiar da rede.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9A227]/20 text-[#8a6d12]">
                  <Camera className="h-5 w-5" />
                </div>
                <h4 className="mt-3 font-bold text-[#2a0a10]">2. Registre a experiência</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Compartilhe um registro voluntário, com foto opcional e total privacidade. Valores e dados financeiros nunca são exibidos.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <h4 className="mt-3 font-bold text-[#2a0a10]">3. Confirmação mútua</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  A empresa confirma o atendimento no seu painel. O registro passa a inspirar e fortalecer toda a comunidade.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-stone-200/70 pt-6 sm:flex-row sm:items-center">
              <p className="text-xs text-stone-500">
                Os registros são compartilhados voluntariamente e passam por confirmação prévia antes da publicação na rede.
              </p>
              <Link
                href="/guia#mural-de-conexoes"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5d1523] transition hover:underline"
              >
                <span>Acessar o Mural no Guia de Empresas</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {hasItems && (
          <div className="mt-10 text-center">
            <Link
              href="/guia#mural-de-conexoes"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#5d1523]/25 bg-white px-6 py-3 text-sm font-bold text-[#5d1523] shadow-xs transition hover:border-[#5d1523]/50 hover:bg-stone-50"
            >
              <span>Ver todos os registros no Mural do Guia</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { Landmark, MapPin, Calendar, User, Navigation, ChevronRight, ShieldCheck } from 'lucide-react';

export type LodgeMeetingData = {
  day?: string | null;
  time?: string | null;
  label?: string | null;
};

export type LodgeCardData = {
  id: string;
  slug: string;
  name: string;
  code_number?: number | null;
  potency?: string | null;
  potency_name?: string | null;
  rite?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  logo_url?: string | null;
  cover_url?: string | null;
  worshipful_master_name?: string | null;
  primary_meeting?: LodgeMeetingData | null;
  is_featured?: boolean;
};

type LodgeCardProps = {
  data: LodgeCardData;
  variant?: 'featured' | 'compact';
};

const DAY_LABELS: Record<string, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export function LodgeCard({ data, variant: _variant = 'compact' }: LodgeCardProps) {
  const meetingDay = data.primary_meeting?.day ? DAY_LABELS[data.primary_meeting.day.toLowerCase()] || data.primary_meeting.day : null;
  const meetingTime = data.primary_meeting?.time || null;

  const mapsUrl = data.latitude && data.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
    : data.address && data.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.name}, ${data.address}, ${data.city} - ${data.state || ''}`)}`
    : null;

  return (
    <article className="group bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between h-full relative">
      {/* Imagem de Capa ou Banner Institucional */}
      <div className="relative h-28 w-full bg-gradient-to-r from-[#3b0b14] via-[#5d1523] to-[#2b060d] overflow-hidden">
        {data.cover_url ? (
          <img src={data.cover_url} alt={data.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80" />
        ) : (
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fef3c7_1px,transparent_1px)] [background-size:12px_12px]" />
        )}

        {/* Badge de Destaque */}
        {data.is_featured && (
          <div className="absolute top-2.5 right-2.5 bg-amber-400/95 backdrop-blur-xs text-amber-950 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3 h-3" />
            <span>Loja em Destaque</span>
          </div>
        )}

        {/* Avatar / Brasão da Loja */}
        <div className="absolute -bottom-5 left-4 w-14 h-14 rounded-2xl bg-white border-2 border-stone-100 shadow-md flex items-center justify-center overflow-hidden">
          {data.logo_url ? (
            <img src={data.logo_url} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <Landmark className="w-7 h-7 text-[#3b0b14]" />
          )}
        </div>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-4 pt-7 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Tag Potência + Rito */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-amber-900 mb-1">
            {data.potency && (
              <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                {data.potency}
              </span>
            )}
            {data.rite && (
              <span className="bg-stone-100 border border-stone-200 text-stone-700 px-2 py-0.5 rounded-md">
                {data.rite}
              </span>
            )}
          </div>

          {/* Nome da Loja + Número */}
          <h3 className="font-serif font-bold text-gray-900 text-base leading-snug group-hover:text-[#3b0b14] transition-colors">
            <Link href={`/guia/lojas/${data.slug}`}>
              {data.name} {data.code_number ? `nº ${data.code_number}` : ''}
            </Link>
          </h3>

          {/* Cidade e UF */}
          {(data.city || data.state) && (
            <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>
                {data.city}
                {data.state ? `, ${data.state}` : ''}
                {data.distance_km != null && <strong className="text-amber-900 ml-1">• {data.distance_km} km</strong>}
              </span>
            </div>
          )}
        </div>

        {/* Informações Complementares: Reunião e Venerável */}
        <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs">
          {meetingDay && (
            <div className="flex items-center gap-1.5 text-stone-700 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-800 shrink-0" />
              <span>
                Reuniões: <strong>{meetingDay}</strong>
                {meetingTime && ` • ${meetingTime}`}
              </span>
            </div>
          )}

          {data.worshipful_master_name && (
            <div className="flex items-center gap-1.5 text-stone-600 text-[11px]">
              <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>
                Venerável: <strong className="text-stone-800">{data.worshipful_master_name}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="pt-2 flex items-center gap-2">
          <Link
            href={`/guia/lojas/${data.slug}`}
            className="flex-1 bg-[#3b0b14] text-white py-2 px-3 rounded-xl text-xs font-bold hover:bg-[#5d1523] transition-colors text-center flex items-center justify-center gap-1 shadow-2xs"
          >
            <span>Ver informações</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 p-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center shrink-0 border border-stone-200"
              title="Traçar rota no mapa"
            >
              <Navigation className="w-4 h-4 text-amber-900" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

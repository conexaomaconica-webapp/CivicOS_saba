'use client';

import React from 'react';
import Link from 'next/link';
import { Landmark, MapPin, Calendar, User, Navigation, ChevronRight, ShieldCheck } from 'lucide-react';
import type { LodgeCardData } from './LodgeCard';

type LodgeListCardProps = {
  data: LodgeCardData;
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

export function LodgeListCard({ data }: LodgeListCardProps) {
  const meetingDay = data.primary_meeting?.day ? DAY_LABELS[data.primary_meeting.day.toLowerCase()] || data.primary_meeting.day : null;
  const meetingTime = data.primary_meeting?.time || null;

  const mapsUrl = data.latitude && data.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
    : data.address && data.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.name}, ${data.address}, ${data.city} - ${data.state || ''}`)}`
    : null;

  return (
    <article className="group bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Esquerda: Avatar / Brasão + Informações Principais */}
      <div className="flex items-start gap-4 flex-1">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-stone-100 border border-stone-200 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
          {data.logo_url ? (
            <img src={data.logo_url} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <Landmark className="w-8 h-8 text-[#3b0b14]" />
          )}
        </div>

        <div className="space-y-1.5 flex-1">
          {/* Tags Potência + Rito + Destaque */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-amber-900">
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
            {data.is_featured && (
              <span className="bg-amber-400/90 text-amber-950 px-2 py-0.5 rounded-md flex items-center gap-1 text-[10px]">
                <ShieldCheck className="w-3 h-3" />
                <span>Destaque</span>
              </span>
            )}
          </div>

          {/* Nome completo + Número */}
          <h3 className="font-serif font-bold text-gray-900 text-base md:text-lg leading-snug group-hover:text-[#3b0b14] transition-colors">
            <Link href={`/guia/lojas/${data.slug}`}>
              {data.name} {data.code_number ? `nº ${data.code_number}` : ''}
            </Link>
          </h3>

          {/* Localização */}
          {(data.city || data.state || data.address) && (
            <div className="flex items-center gap-1.5 text-xs text-stone-600 flex-wrap">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>
                {data.address ? `${data.address} - ` : ''}
                {data.city}
                {data.state ? `, ${data.state}` : ''}
                {data.distance_km != null && <strong className="text-amber-900 ml-1.5">• {data.distance_km} km de você</strong>}
              </span>
            </div>
          )}

          {/* Reunião & Venerável em Linha */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-stone-600 pt-1">
            {meetingDay && (
              <div className="flex items-center gap-1 font-medium text-stone-700">
                <Calendar className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                <span>
                  Reuniões: <strong>{meetingDay}</strong>
                  {meetingTime && ` às ${meetingTime}`}
                </span>
              </div>
            )}
            {data.worshipful_master_name && (
              <div className="flex items-center gap-1 text-stone-600">
                <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>
                  Venerável: <strong className="text-stone-800">{data.worshipful_master_name}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Direita: Ações (Botões) */}
      <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
        <Link
          href={`/guia/lojas/${data.slug}`}
          className="w-full sm:w-auto bg-[#3b0b14] text-white py-2 px-4 rounded-xl text-xs font-bold hover:bg-[#5d1523] transition-colors text-center flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
        >
          <span>Ver informações</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shrink-0 border border-stone-200 whitespace-nowrap"
            title="Traçar rota no mapa"
          >
            <Navigation className="w-3.5 h-3.5 text-amber-900" />
            <span>Traçar rota</span>
          </a>
        )}
      </div>
    </article>
  );
}

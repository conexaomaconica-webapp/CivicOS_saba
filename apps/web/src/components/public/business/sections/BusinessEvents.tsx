import React from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import type { PublicBusinessEvent } from '@/lib/business/public-business-presentation';

type BusinessEventsProps = {
  events: PublicBusinessEvent[];
  className?: string;
};

export function BusinessEvents({
  events,
  className = '',
}: BusinessEventsProps) {
  if (!events || events.length === 0) return null;

  return (
    <section className={`p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <h2 className="text-base font-serif font-bold text-[#4B161B] tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#C9A227]" />
          <span>Eventos e Novidades</span>
        </h2>
        <span className="text-xs font-semibold text-[#4B161B] hover:underline cursor-pointer">
          Ver todas
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E5DF] hover:border-[#C9A227]/60 transition-all space-y-2.5 shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-2">
              {event.imageUrl && (
                <div className="aspect-16/9 rounded-lg overflow-hidden bg-stone-100 mb-2">
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <h3 className="font-serif font-bold text-stone-900 text-sm">
                {event.title}
              </h3>

              {event.startDate && (
                <div className="flex items-center gap-1.5 text-xs text-[#4B161B] font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>{event.startDate}{event.endDate ? ` até ${event.endDate}` : ''}</span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-1.5 text-xs text-stone-600">
                  <MapPin className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}

              {event.description && (
                <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                  {event.description}
                </p>
              )}
            </div>

            {event.externalUrl && (
              <a
                href={event.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4B161B] hover:underline pt-2"
              >
                <span>Mais informações</span>
                <ExternalLink className="w-3 h-3 text-[#C9A227]" />
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

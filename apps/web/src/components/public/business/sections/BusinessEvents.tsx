import React from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import type { PublicBusinessEvent } from '@/lib/business/public-business-presentation';

function formatEventDateBR(isoOrText: string | null): string | null {
  if (!isoOrText) return null;
  const d = new Date(isoOrText);
  if (Number.isNaN(d.getTime())) return isoOrText;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
    <section id="eventos" className={`p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <h2 className="text-base font-serif font-bold text-[#4B161B] tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#C9A227]" />
          <span>Eventos da Empresa</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {events.map((event) => {
          const startLabel = formatEventDateBR(event.startDate);
          const endLabel = formatEventDateBR(event.endDate);
          return (
            <div
              key={event.id}
              className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E5DF] hover:border-[#C9A227]/60 transition-all space-y-2.5 shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-2">
                {event.imageUrl && (
                  <div className="w-full rounded-lg overflow-hidden bg-stone-50 border border-stone-200 mb-2 flex items-center justify-center">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-auto max-h-64 object-contain"
                      loading="lazy"
                    />
                  </div>
                )}

                <h3 className="font-serif font-bold text-stone-900 text-sm">
                  {event.title}
                </h3>

                {startLabel && (
                  <div className="flex items-center gap-1.5 text-xs text-[#4B161B] font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span suppressHydrationWarning>{startLabel}{endLabel ? ` até ${endLabel}` : ''}</span>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <MapPin className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                {event.description && (
                  <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                )}
              </div>

              {event.externalUrl && (
                <a
                  href={/^https?:\/\//i.test(event.externalUrl) ? event.externalUrl : `https://${event.externalUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4B161B] hover:underline pt-2"
                >
                  <span>Mais informações</span>
                  <ExternalLink className="w-3 h-3 text-[#C9A227]" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

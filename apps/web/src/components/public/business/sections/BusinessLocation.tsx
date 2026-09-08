import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';

type BusinessLocationProps = {
  location: PublicBusinessPresentation['location'];
  businessName: string;
  variant?: 'bronze' | 'prata' | 'ouro';
  className?: string;
};

export function BusinessLocation({
  location,
  businessName,
  className = '',
}: BusinessLocationProps) {
  if (!location || !location.address) return null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${businessName}, ${location.address}`)}`;

  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 border-b border-stone-800/80 pb-2">
        <MapPin className="w-4 h-4 text-[#C9A227]" />
        <h3 className="text-sm font-serif font-bold text-stone-200">
          Localização e Endereço
        </h3>
      </div>

      <div className="p-3.5 rounded-xl bg-stone-900/70 border border-stone-800 space-y-3 shadow-xs">
        <div className="space-y-1">
          <p className="text-xs text-stone-200 leading-snug font-medium">
            {location.address}
          </p>
          {(location.city || location.state) && (
            <p className="text-[11px] text-stone-400">
              {location.city}{location.city && location.state ? ' — ' : ''}{location.state}
            </p>
          )}
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4B161B] hover:bg-[#5C1C22] text-[#F3EEDD] border border-[#C9A227]/30 text-xs font-semibold transition-all shadow-xs"
        >
          <Navigation className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>Abrir no Google Maps</span>
        </a>
      </div>
    </section>
  );
}

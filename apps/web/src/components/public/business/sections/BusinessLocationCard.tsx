import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';

type BusinessLocationCardProps = {
  location: PublicBusinessPresentation['location'];
  businessName: string;
  className?: string;
};

export function BusinessLocationCard({
  location,
  businessName,
  className = '',
}: BusinessLocationCardProps) {
  if (!location || !location.address) return null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${businessName}, ${location.address}`)}`;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(`${location.address}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <section id="localizacao" className={`p-4 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-3 ${className}`}>
      
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <h3 className="font-serif font-bold text-sm text-[#4B161B] tracking-tight flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[#C9A227]" />
          <span>Endereço</span>
        </h3>
      </div>

      <p className="text-xs text-stone-700 leading-snug font-medium">
        {location.address}
      </p>

      {/* Container de Mapa Interativo Incorporado */}
      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-[#E8E5DF] shadow-inner bg-[#FDFBF7]">
        <iframe
          title={`Mapa de localização de ${businessName}`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl}
          className="w-full h-full rounded-xl"
        />
      </div>

      {/* Botão Traçar Rota */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9A227] hover:bg-[#B89320] text-stone-950 font-bold text-xs shadow-xs transition-all hover:scale-[1.01]"
      >
        <Navigation className="w-4 h-4 fill-current" />
        <span>Traçar rota no Google Maps</span>
      </a>

    </section>
  );
}

export function BusinessLocation(props: BusinessLocationCardProps) {
  return <BusinessLocationCard {...props} />;
}

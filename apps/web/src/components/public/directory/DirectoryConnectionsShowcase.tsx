import React from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Handshake } from 'lucide-react';
import type { ConnectionFeedItem } from '@/app/actions/connections';
import { ConnectionsCompactShowcase } from '@/components/public/connections/ConnectionsCompactShowcase';

type Props = {
  items: ConnectionFeedItem[];
  confirmedTotal: number;
};

/**
 * Vitrine do Mural de Conexões na Home do Guia: até 3 conexões de empresas distintas, sem fotografias grandes.
 * Sem registros elegíveis a seção NÃO é exibida (o convite para registrar fica na seção própria do Guia).
 */
export function DirectoryConnectionsShowcase({ items, confirmedTotal }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className="dh-container py-4" id="mural-de-conexoes" aria-labelledby="mural-conexoes-titulo">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="mural-conexoes-titulo" className="dh-section-title flex items-center gap-2">
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

      <div className="mt-5">
        <ConnectionsCompactShowcase items={items} loginRedirect="/guia#mural-de-conexoes" source="feed_wall" showReport />
      </div>

      <div className="mt-4 text-center sm:text-right">
        <Link href="/conexoes" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4B161B] hover:underline">
          Ver todas as conexões
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

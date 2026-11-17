import React from 'react';
import Link from 'next/link';
import { Camera, Handshake, RefreshCcw, SearchX, TriangleAlert } from 'lucide-react';
import { ConnectionStartFlow } from '@/components/public/directory/ConnectionStartFlow';

/** Nenhuma conexão pública ainda (sem busca nem filtro): convida a registrar, sem simular registros. */
export function ConnectionsEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#C9A227]/70 bg-[#FDFBF7] p-6 sm:p-8" role="status">
      <div className="flex items-center gap-2 text-[#4B161B]">
        <Camera className="h-5 w-5 text-[#C9A227]" aria-hidden="true" />
        <h2 className="font-serif text-lg font-bold">Ainda não há conexões publicadas</h2>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
        As conexões são registradas por quem comprou, contratou, fez parceria ou visitou uma empresa da Conexão Maçônica, confirmadas pela empresa e publicadas com autorização.
        Seja o primeiro a compartilhar a sua experiência.
      </p>
      <div className="mt-4">
        <ConnectionStartFlow
          loginRedirect="/conexoes"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#4B161B] px-6 py-3 text-sm font-bold text-[#F3EEDD] shadow-xs transition hover:bg-[#3B0B14]"
        >
          <Handshake className="h-4 w-4 text-[#C9A227]" />
          Registrar minha conexão
        </ConnectionStartFlow>
      </div>
    </div>
  );
}

/** Busca ou filtro sem correspondência. */
export function ConnectionsNoResults() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center" role="status">
      <SearchX className="mx-auto h-8 w-8 text-stone-400" aria-hidden="true" />
      <h2 className="mt-3 font-serif text-lg font-bold text-[#4B161B]">Nenhuma conexão encontrada</h2>
      <p className="mt-1 text-sm text-stone-600">Tente outro termo, outro tipo de conexão ou remova os filtros.</p>
      <Link href="/conexoes" className="mt-4 inline-flex rounded-xl border border-[#4B161B] px-5 py-2.5 text-sm font-bold text-[#4B161B] transition hover:bg-[#4B161B] hover:text-white">
        Ver todas as conexões
      </Link>
    </div>
  );
}

/** Falha ao consultar o mural (rede, banco ou migration ausente): mensagem simples e nova tentativa. */
export function ConnectionsErrorState({ retryHref = '/conexoes' }: { retryHref?: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center" role="alert">
      <TriangleAlert className="mx-auto h-8 w-8 text-rose-700" aria-hidden="true" />
      <h2 className="mt-3 font-serif text-lg font-bold text-rose-900">Não foi possível carregar as conexões</h2>
      <p className="mt-1 text-sm text-rose-800">Tente novamente em instantes.</p>
      <Link href={retryHref} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-900">
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        Tentar novamente
      </Link>
    </div>
  );
}

/** Esqueleto de carregamento (loading.tsx). */
export function ConnectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Carregando conexões">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl border border-stone-200 bg-white">
          <div className="space-y-3 p-4">
            <div className="h-5 w-24 rounded-full bg-stone-200" />
            <div className="h-4 w-full rounded bg-stone-200" />
            <div className="h-4 w-4/5 rounded bg-stone-200" />
            <div className="h-3 w-1/2 rounded bg-stone-100" />
          </div>
        </div>
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

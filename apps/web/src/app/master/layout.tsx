import React from 'react';
import Link from 'next/link';
import { Terminal, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Torre de Controle — Engenharia & SuperAdmin | Conexão Maçônica',
};

export default function MasterControlLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col">
      {/* BARRA SUPERIOR DE ENGENHARIA / MASTER */}
      <header className="bg-stone-900 border-b border-stone-800 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm text-white tracking-wide">
                TORRE DE CONTROLE
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
                SuperAdmin / Engenharia
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-mono">
              Monitoramento Técnico System-Wide • Conexão Maçônica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-bold">STATUS: OPERACIONAL</span>
          </div>

          <Link
            href="/admin"
            className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Admin Operacional</span>
          </Link>
        </div>
      </header>

      {/* CONTEÚDO DA TORRE */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">{children}</main>
    </div>
  );
}

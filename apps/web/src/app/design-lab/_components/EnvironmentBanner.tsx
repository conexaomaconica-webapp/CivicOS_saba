'use client';

import React from 'react';

export function EnvironmentBanner() {
  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-300 px-4 py-1.5 text-xs font-mono font-medium flex items-center justify-between z-50">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span className="font-bold tracking-wide">DESIGN LAB</span>
        <span className="text-amber-400/60">|</span>
        <span>AMB-SPIKE-0.1 — AMBIENTE LABORATORIAL DE UX/UI (DADOS MOCKADOS)</span>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-[11px] text-amber-400/80">
        <span>NENHUMA CONEXÃO COM SUPABASE / PROD</span>
        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200">
          PROHIBITED IN PROD
        </span>
      </div>
    </div>
  );
}

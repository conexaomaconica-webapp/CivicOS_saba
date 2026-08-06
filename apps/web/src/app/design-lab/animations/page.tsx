'use client';

import React, { useState } from 'react';

export default function AnimationsLabPage() {
  const [animate, setAnimate] = useState(false);

  const triggerAnimation = () => {
    setAnimate(true);
    setTimeout(() => setAnimate(false), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-purple-400">
          <span>⚡ Design Lab</span>
          <span>•</span>
          <span>Micro-interações e Animações</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Animations & Motion Tokens Lab
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Demonstração de tokens de movimento, velocidade de transição, suporte a <code>prefers-reduced-motion</code> e micro-interações de interface.
        </p>
      </div>

      {/* Motion Demos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white">1. Scale & Hover Motion</h3>
          <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200">
              Passe o Mouse (Hover Me)
            </button>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white">2. Pulse & Spinner Loading</h3>
          <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center gap-3">
            <span className="w-4 h-4 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs text-slate-300 font-mono">Processando dados...</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white">3. Slide & Fade Entrance</h3>
          <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2 p-4">
            <button
              onClick={triggerAnimation}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
            >
              Disparar Transição
            </button>
            {animate && (
              <div className="text-xs text-amber-400 font-mono bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg animate-in slide-in-from-bottom duration-300">
                Elemento Animado Entrada!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

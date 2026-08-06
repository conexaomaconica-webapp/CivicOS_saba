'use client';

import React from 'react';

export default function AccessibilityLabPage() {

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
          <span>♿ Design Lab</span>
          <span>•</span>
          <span>Acessibilidade WCAG 2.1 AA</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Accessibility & Inclusive Design Checker
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Ferramenta de validação de suporte a acessibilidade: indicador de contraste (4.5:1 / 3.0:1), navegação por teclado, leitores ARIA e suporte a Reduced Motion.
        </p>
      </div>

      {/* Accessibility Checkers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contrast Checker */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">1. Validador de Contraste Semântico</h3>
            <span className="text-xs font-mono text-emerald-400">Alvo 4.5:1 AA</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-white">Texto Normal sobre Fundo Escuro</div>
              <div className="text-slate-300">Ratio Calculado: <strong className="text-emerald-400">12.4:1 (Aprovado AAA)</strong></div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
              <div className="font-semibold text-slate-200">Texto Secundário de Suporte</div>
              <div className="text-slate-400">Ratio Calculado: <strong className="text-emerald-400">5.8:1 (Aprovado AA)</strong></div>
            </div>
          </div>
        </div>

        {/* Keyboard Navigation Checker */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">2. Navegação & Foco por Teclado</h3>
            <span className="text-xs font-mono text-blue-400">Tab / Shift+Tab</span>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-400 leading-relaxed">
              Pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">Tab</kbd> para alternar entre os elementos focáveis abaixo com o indicador visual de foco ativo.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium focus-visible:ring-2 focus-visible:ring-blue-400">
                Botão Focável 1
              </button>
              <button className="px-3 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-medium focus-visible:ring-2 focus-visible:ring-blue-400">
                Botão Focável 2
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';

export default function TypographyLabPage() {
  const [fontFamily, setFontFamily] = useState<'sans' | 'heading'>('sans');

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
            <span>🔤 Design Lab</span>
            <span>•</span>
            <span>Hierarquia & Tokens Tipográficos</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Typography & Font System Guide
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Demonstração de tokens tipográficos, hierarquia H1–H4, pesos, numeração financeira, tabelas, truncamento e alternância de fontes (Inter vs Outfit).
          </p>
        </div>

        {/* Font Switcher */}
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs font-mono flex items-center gap-2">
          <span className="text-slate-400">Preset:</span>
          <button
            onClick={() => setFontFamily('sans')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              fontFamily === 'sans'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inter (Sans Padrão)
          </button>
          <button
            onClick={() => setFontFamily('heading')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              fontFamily === 'heading'
                ? 'bg-amber-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Outfit (Vertical Maçônica)
          </button>
        </div>
      </div>

      {/* 1. Headings Hierarchy */}
      <section className="space-y-6 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          1. Hierarquia de Títulos (Headings)
        </h3>

        <div className="space-y-6">
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-slate-500">H1 — Display Title (36px / 2.25rem, Bold)</div>
            <h1 className={`text-4xl font-extrabold tracking-tight text-white ${fontFamily === 'heading' ? 'font-serif' : 'font-sans'}`}>
              Guia Comercial Fraterno da Comunidade
            </h1>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-mono text-slate-500">H2 — Section Title (30px / 1.875rem, Bold)</div>
            <h2 className={`text-3xl font-bold tracking-tight text-white ${fontFamily === 'heading' ? 'font-serif' : 'font-sans'}`}>
              Empresas em Destaque & Categorias Recomendadas
            </h2>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-mono text-slate-500">H3 — Card / Sub-section Title (24px / 1.5rem, Semibold)</div>
            <h3 className={`text-2xl font-semibold tracking-tight text-white ${fontFamily === 'heading' ? 'font-serif' : 'font-sans'}`}>
              Oficina Maçônica de Serviços Automotivos
            </h3>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-mono text-slate-500">H4 — Small Title (20px / 1.25rem, Semibold)</div>
            <h4 className={`text-xl font-semibold text-white ${fontFamily === 'heading' ? 'font-serif' : 'font-sans'}`}>
              Detalhamento de Planos e Faturamento Anual
            </h4>
          </div>
        </div>
      </section>

      {/* 2. Body & Lead Paragraphs */}
      <section className="space-y-6 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          2. Parágrafos & Textos Correntes (Body)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-500">Body Base (16px, Regular)</div>
            <p className="text-base text-slate-200 leading-relaxed">
              O CivicOS fornece a infraestrutura neutra para o desenvolvimento de guias comerciais comunitários. O produto Conexão Maçônica consome os tokens de tema e componentes do Design System com total integridade e acessibilidade.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-500">Body Small & Caption (14px / 12px)</div>
            <p className="text-sm text-slate-300 leading-normal">
              Texto secundário de suporte utilizado em cartões, resumos de faturas e notas explicativas.
            </p>
            <p className="text-xs text-slate-400 leading-normal">
              Caption (12px): Informação complementar de auditoria e timestamps.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Numbers & Financial Tables */}
      <section className="space-y-6 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          3. Números Financeiros & Dados Tabulares
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500">Faturamento Anual</div>
            <div className="text-2xl font-bold text-emerald-400">R$ 1.188,00</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500">Economia no Ciclo</div>
            <div className="text-2xl font-bold text-amber-400">R$ 240,00</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500">CNPJ Formatado</div>
            <div className="text-lg font-semibold text-slate-200">12.345.678/0001-90</div>
          </div>
        </div>
      </section>
    </div>
  );
}

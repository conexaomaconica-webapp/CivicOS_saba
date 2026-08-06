'use client';

import React from 'react';
import Link from 'next/link';
import { useDesignLab } from './_providers/DesignLabProvider';
import { MOCK_TENANTS } from './_mocks/tenants';
import { MOCK_BUSINESSES } from './_mocks/businesses';

export default function DesignLabOverviewPage() {
  const { preferences } = useDesignLab();
  const currentTenant = MOCK_TENANTS.find((t) => t.themePreset === preferences.theme) || MOCK_TENANTS[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-blue-900/40 via-slate-900 to-amber-900/20 border border-slate-800 p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
              <span>🚀 Sprint Visual 0.1</span>
              <span>•</span>
              <span>Laboratório Permanente de UX/UI</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              CivicOS & Conexão Maçônica — Design Lab
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ambiente isolado para validação de componentes, hierarquia tipográfica, responsividade, acessibilidade e governança de temas <i>White Label</i> com 100% de dados simulados (sem backend).
            </p>
          </div>

          <div className="shrink-0 bg-slate-900/90 border border-slate-700/80 p-4 rounded-xl space-y-2 text-xs font-mono shadow-xl">
            <div className="text-slate-400">Tema Ativo:</div>
            <div className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: currentTenant?.primaryColor || '#1E3A8A' }} />
              {currentTenant?.name || 'Conexão Maçônica'}
            </div>
            <div className="text-slate-400">Modo: <span className="text-white capitalize">{preferences.colorMode}</span></div>
            <div className="text-slate-400">Densidade: <span className="text-white capitalize">{preferences.density}</span></div>
          </div>
        </div>
      </div>

      {/* Metrics & Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-mono">Rotas Auditadas</div>
          <div className="text-2xl font-bold text-white">14 Rotas</div>
          <div className="text-[11px] text-emerald-400 font-mono">100% Mapeadas & Isoladas</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-mono">Temas de Marca</div>
          <div className="text-2xl font-bold text-white">4 Presets</div>
          <div className="text-[11px] text-blue-400 font-mono">2 Oficiais + 2 Conceitos</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-mono">Empresas Simuladas</div>
          <div className="text-2xl font-bold text-white">{MOCK_BUSINESSES.length} Mocks</div>
          <div className="text-[11px] text-amber-400 font-mono">Com Casos Borda & Limites</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-mono">Conformidade WCAG</div>
          <div className="text-2xl font-bold text-white">2.1 AA Target</div>
          <div className="text-[11px] text-emerald-400 font-mono">Contraste ≥ 4.5:1</div>
        </div>
      </div>

      {/* Quick Navigation Cards to Key Lab Modules */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>⚡</span> Módulos Principais do Laboratório
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Components */}
          <Link
            href="/design-lab/components"
            className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/10 space-y-3"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-bold">
              🧩
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                Component Playground
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Primitivas UI com variações de estados, tamanhos, botões, inputs, cards e esqueletos.
              </p>
            </div>
            <div className="text-xs font-mono text-blue-400 flex items-center gap-1 pt-2">
              Explorar componentes &rarr;
            </div>
          </Link>

          {/* Card 2: White Label */}
          <Link
            href="/design-lab/themes"
            className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-amber-500/10 space-y-3"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold">
              🎭
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-white group-hover:text-amber-400 transition-colors">
                White Label & Temas
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Troca dinâmica em tempo real entre Conexão Maçônica, CivicOS e conceitos comunitários.
              </p>
            </div>
            <div className="text-xs font-mono text-amber-400 flex items-center gap-1 pt-2">
              Testar governança visual &rarr;
            </div>
          </Link>

          {/* Card 3: Telas Piloto */}
          <Link
            href="/design-lab/pilots/public"
            className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/10 space-y-3"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold">
              🏛️
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors">
                3 Telas Piloto Navegáveis
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Prototipagem em alta fidelidade da área Pública, Painel do Anunciante e Fila de Moderação ADM.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1 pt-2">
              Navegar pelos pilotos &rarr;
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

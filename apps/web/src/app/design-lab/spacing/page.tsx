'use client';

import React from 'react';
import { useDesignLab } from '../_providers/DesignLabProvider';
import { LayoutDensity } from '../_types/design-lab';

export default function SpacingLabPage() {
  const { preferences, setDensity } = useDesignLab();

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
          <span>📐 Design Lab</span>
          <span>•</span>
          <span>Escala de Espaçamento & Densidade</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Spacing Scale & Density Playground
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Demonstração do sistema de espaçamento baseado em escala de 4px e alternância de densidade de layout (*Compact*, *Comfortable*, *Relaxed*).
        </p>
      </div>

      {/* Density Switcher Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="text-xs text-slate-300">
          Densidade Atual: <span className="font-bold text-white uppercase font-mono">{preferences.density}</span>
        </div>

        <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800 text-xs">
          {(['compact', 'comfortable', 'relaxed'] as LayoutDensity[]).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={`px-3 py-1.5 capitalize rounded-md transition-colors ${
                preferences.density === d
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Spacing Grid Scale */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          Escala Numérica de Espaçamento (Base 4px)
        </h3>

        <div className="space-y-3 font-mono text-xs">
          {[
            { label: 'space-1 (4px)', size: 'w-1 h-4 bg-blue-500' },
            { label: 'space-2 (8px)', size: 'w-2 h-4 bg-blue-500' },
            { label: 'space-3 (12px)', size: 'w-3 h-4 bg-blue-500' },
            { label: 'space-4 (16px)', size: 'w-4 h-4 bg-blue-500' },
            { label: 'space-6 (24px)', size: 'w-6 h-4 bg-blue-500' },
            { label: 'space-8 (32px)', size: 'w-8 h-4 bg-blue-500' },
            { label: 'space-12 (48px)', size: 'w-12 h-4 bg-blue-500' },
            { label: 'space-16 (64px)', size: 'w-16 h-4 bg-blue-500' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <span className="w-32 text-slate-400">{item.label}</span>
              <div className={`${item.size} rounded-sm shadow-sm`} />
            </div>
          ))}
        </div>
      </section>

      {/* Density Component Demo */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          Demonstração de Tabela com Densidade Dinâmica
        </h3>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
              <tr>
                <th className="p-3">Empresa</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Status</th>
                <th className="p-3">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-white">Oficina Irmãos Unidos</td>
                <td className="p-3">Automotivo</td>
                <td className="p-3 text-emerald-400 font-mono">Aprovada</td>
                <td className="p-3 font-mono">R$ 1.188,00</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-white">Advocacia Fraterna</td>
                <td className="p-3">Serviços Jurídicos</td>
                <td className="p-3 text-emerald-400 font-mono">Aprovada</td>
                <td className="p-3 font-mono">R$ 588,00</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-white">Padaria Pão da Cidade</td>
                <td className="p-3">Alimentação</td>
                <td className="p-3 text-amber-400 font-mono">Em Análise</td>
                <td className="p-3 font-mono">R$ 588,00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

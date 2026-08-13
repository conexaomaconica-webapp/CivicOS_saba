'use client';

import React from 'react';
import { useDesignLab } from '../_providers/DesignLabProvider';
import { MOCK_TENANTS } from '../_mocks/tenants';

export default function ThemesLabPage() {
  const { preferences, setTheme } = useDesignLab();

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
          <span>🎭 Design Lab</span>
          <span>•</span>
          <span>Governança de Temas & White Label</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          White Label Theme Governance & Live Switcher
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Laboratório de troca dinâmica entre presets visuais. Exibição simultânea dos 4 temas (2 oficiais e 2 conceitos não oficiais) em modo Claro e Escuro.
        </p>
      </div>

      {/* Grid of the 4 Themes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MOCK_TENANTS.map((tenant) => {
          const isActive = preferences.theme === tenant.themePreset;

          return (
            <div
              key={tenant.id}
              className={`p-6 rounded-2xl border transition-all duration-300 space-y-4 ${
                isActive
                  ? 'bg-slate-900 border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: tenant.primaryColor }}
                    />
                    <h3 className="text-base font-bold text-white tracking-tight">{tenant.name}</h3>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{tenant.slug}</div>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    tenant.isOfficial
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {tenant.isOfficial ? tenant.labelBadge : 'CONCEITO VISUAL NÃO OFICIAL'}
                </span>
              </div>

              {/* Color Swatches */}
              <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-2">
                <div className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500">Primary</div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tenant.primaryColor }} />
                    {tenant.primaryColor}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500">Accent</div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tenant.accentColor }} />
                    {tenant.accentColor}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500">Surface Dark</div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tenant.surfaceColor }} />
                    {tenant.surfaceColor}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => setTheme(tenant.themePreset)}
                  className={`w-full py-2 px-4 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isActive ? '✓ Tema Ativo' : 'Ativar Este Tema'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

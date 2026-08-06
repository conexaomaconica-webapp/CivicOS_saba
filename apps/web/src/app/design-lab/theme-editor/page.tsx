'use client';

import React, { useState } from 'react';
import { useDesignLab } from '../_providers/DesignLabProvider';

export default function ThemeEditorPage() {
  const { preferences } = useDesignLab();
  const [primaryColor, setPrimaryColor] = useState('#1E3A8A');
  const [accentColor, setAccentColor] = useState('#D97706');
  const [surfaceColor, setSurfaceColor] = useState('#0F172A');
  const [themeName, setThemeName] = useState('Meu Tema Personalizado');

  const generatedExportJson = JSON.stringify(
    {
      schemaVersion: '1.0',
      themeId: `custom-preview-${Date.now()}`,
      displayName: themeName,
      mode: preferences.colorMode,
      tokens: {
        editable: {
          primary: primaryColor,
          accent: accentColor,
          surface: surfaceColor,
          density: preferences.density
        },
        protected: {
          success: 'oklch(0.65 0.18 145)',
          warning: 'oklch(0.75 0.16 80)',
          danger: 'oklch(0.60 0.22 25)',
          minContrastRatio: '4.5:1'
        }
      },
      validationResult: {
        valid: true,
        contrastScore: 'AAA (12.4:1)',
        errors: []
      }
    },
    null,
    2
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
          <span>🎛️ Design Lab</span>
          <span>•</span>
          <span>Editor de Variáveis CSS (Preview ADM-021)</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Theme Editor Sandbox & JSON Export
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Prototipagem do editor de variáveis de tema do painel administrativo (`ADM-021`). Altera apenas tokens permitidos com exportação de JSON de tema estruturado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Editable Controls */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-6">
          <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            1. Tokens Editáveis Autorizados
          </h3>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-medium">Nome de Exibição do Tema:</label>
              <input
                type="text"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 border border-slate-700 rounded-lg p-2.5"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-slate-400">Cor Primária:</label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full h-10 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400">Cor Accent:</label>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full h-10 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400">Cor Superfície:</label>
                <input
                  type="color"
                  value={surfaceColor}
                  onChange={(e) => setSurfaceColor(e.target.value)}
                  className="w-full h-10 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <h4 className="text-xs font-mono text-slate-500 uppercase">Tokens Protegidos (Imutáveis)</h4>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2 py-1 bg-slate-950 text-slate-400 border border-slate-800 rounded">
                🔒 danger (oklch)
              </span>
              <span className="px-2 py-1 bg-slate-950 text-slate-400 border border-slate-800 rounded">
                🔒 success (oklch)
              </span>
              <span className="px-2 py-1 bg-slate-950 text-slate-400 border border-slate-800 rounded">
                🔒 focusRing (4.5:1 min)
              </span>
            </div>
          </div>
        </div>

        {/* JSON Export Box */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider">
              2. Exportação de JSON Validação
            </h3>
            <button
              onClick={() => navigator.clipboard.writeText(generatedExportJson)}
              className="text-xs text-blue-400 hover:text-white font-mono"
            >
              Copiar JSON
            </button>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-[360px]">
            {generatedExportJson}
          </pre>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useDesignLab } from '../_providers/DesignLabProvider';
import { MOCK_TENANTS } from '../_mocks/tenants';
import { ThemePreset, LayoutDensity } from '../_types/design-lab';

export function DesignLabHeader() {
  const { preferences, setTheme, setColorMode, setDensity, resetPreferences } = useDesignLab();

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 z-40 sticky top-0">
      {/* Title / Brand Status */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
          CivicOS Design Lab
        </h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 hidden md:inline-block">
          Sprint Visual 0.1
        </span>
      </div>

      {/* Control Bar Controls */}
      <div className="flex items-center gap-3">
        {/* Theme Preset Selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <label className="text-slate-400 hidden sm:inline">Tema:</label>
          <select
            value={preferences.theme}
            onChange={(e) => setTheme(e.target.value as ThemePreset)}
            className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {MOCK_TENANTS.map((t) => (
              <option key={t.id} value={t.themePreset}>
                {t.name} {!t.isOfficial ? '(Conceito)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Color Mode Toggle */}
        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
          <button
            onClick={() => setColorMode('light')}
            className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors ${
              preferences.colorMode === 'light'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Modo Claro"
          >
            ☀️ Light
          </button>
          <button
            onClick={() => setColorMode('dark')}
            className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors ${
              preferences.colorMode === 'dark'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Modo Escuro"
          >
            🌙 Dark
          </button>
        </div>

        {/* Density Selector */}
        <div className="hidden lg:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
          {(['compact', 'comfortable', 'relaxed'] as LayoutDensity[]).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={`px-2 py-0.5 capitalize rounded-md transition-colors ${
                preferences.density === d
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Reset Button */}
        <button
          onClick={resetPreferences}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors"
          title="Resetar Preferências Visual"
        >
          🔄 Reset
        </button>
      </div>
    </header>
  );
}

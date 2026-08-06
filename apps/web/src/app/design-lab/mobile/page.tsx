'use client';

import React, { useState } from 'react';

export default function MobileLabPage() {
  const [device, setDevice] = useState<'iphone-se' | 'iphone-16' | 'pixel-9' | 'ipad'>('iphone-16');

  const deviceDimensions = {
    'iphone-se': { width: '375px', height: '667px', name: 'iPhone SE (375px)' },
    'iphone-16': { width: '393px', height: '852px', name: 'iPhone 16 Pro (393px)' },
    'pixel-9': { width: '412px', height: '915px', name: 'Google Pixel 9 (412px)' },
    'ipad': { width: '768px', height: '1024px', name: 'iPad Mini (768px)' }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
          <span>📱 Design Lab</span>
          <span>•</span>
          <span>Simulador de Molduras Dispositivos Móveis</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Mobile Viewport & Device Simulator
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Simulador visual com dimensões reais de viewport para inspeção rápida de layout responsivo, safe-areas e menus móveis.
        </p>
      </div>

      {/* Device Selector */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-300">
          Dispositivo Selecionado: <span className="font-bold text-white font-mono">{deviceDimensions[device].name}</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          {(Object.keys(deviceDimensions) as (keyof typeof deviceDimensions)[]).map((devKey) => (
            <button
              key={devKey}
              onClick={() => setDevice(devKey)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                device === devKey
                  ? 'bg-blue-600 text-white border-blue-500 font-semibold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {devKey.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Simulated Device Frame Container */}
      <div className="flex justify-center p-6 bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-x-auto">
        <div
          style={{ width: deviceDimensions[device].width, height: deviceDimensions[device].height }}
          className="bg-slate-900 border-8 border-slate-800 rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300"
        >
          {/* Simulated Notch / Dynamic Island */}
          <div className="w-full bg-slate-950 h-7 flex items-center justify-center shrink-0">
            <div className="w-24 h-4 bg-black rounded-full" />
          </div>

          {/* Device Screen Content */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs text-slate-200">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl space-y-1">
              <div className="font-bold text-white">Interface PWA Mobile</div>
              <p className="text-[11px] text-slate-300">
                Visualização responsiva no container móvel.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-semibold text-white">Oficina Irmãos Unidos</div>
              <div className="text-[11px] text-slate-400">Automotivo • São Paulo/SP</div>
              <button className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium text-xs">
                Contactar no WhatsApp
              </button>
            </div>
          </div>

          {/* Bottom Home Indicator */}
          <div className="w-full bg-slate-950 h-5 flex items-center justify-center shrink-0">
            <div className="w-32 h-1 bg-slate-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

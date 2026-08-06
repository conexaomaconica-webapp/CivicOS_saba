'use client';

import React from 'react';
import { MockBusiness } from '../_types/design-lab';

export interface MapAdapterProps {
  businesses: MockBusiness[];
  selectedBusinessId?: string;
  onSelectBusiness?: (id: string) => void;
  className?: string;
  zoom?: number;
}

export function MapProviderAdapter({
  businesses,
  selectedBusinessId,
  onSelectBusiness,
  className = '',
  zoom = 13
}: MapAdapterProps) {
  return (
    <div
      className={`relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/90 shadow-inner ${className}`}
    >
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs text-slate-300 font-mono flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        SvgMockMapAdapter (Simulador de Mapa) — Zoom {zoom}x
      </div>

      {/* SVG Vector Map Mock Container */}
      <svg
        className="w-full h-full text-slate-800"
        viewBox="0 0 800 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Synthetic Map Grid Lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#0B0F19" />
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Synthetic Roads */}
        <path d="M 0 150 Q 300 200 800 100" stroke="#1E293B" strokeWidth="12" fill="none" />
        <path d="M 200 0 Q 250 250 400 500" stroke="#1E293B" strokeWidth="8" fill="none" />
        <path d="M 500 0 Q 450 300 800 400" stroke="#1E293B" strokeWidth="10" fill="none" />

        {/* Interactive Pin Markers */}
        {businesses.map((biz, idx) => {
          // Compute synthetic coordinates based on index
          const cx = 150 + (idx * 160) % 600;
          const cy = 120 + (idx * 110) % 300;
          const isSelected = selectedBusinessId === biz.id;

          return (
            <g
              key={biz.id}
              onClick={() => onSelectBusiness?.(biz.id)}
              className="cursor-pointer group transition-all duration-300"
            >
              {/* Pulse Ring when selected */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="24"
                  className="fill-amber-500/20 stroke-amber-400 stroke-2 animate-ping"
                />
              )}

              {/* Pin Base Shadow */}
              <ellipse cx={cx} cy={cy + 18} rx="10" ry="4" fill="rgba(0,0,0,0.5)" />

              {/* Pin Pinbody */}
              <path
                d={`M ${cx} ${cy - 20} C ${cx - 14} ${cy - 20} ${cx - 14} ${cy} ${cx} ${cy + 16} C ${cx + 14} ${cy} ${cx + 14} ${cy - 20} Z`}
                fill={isSelected ? '#F59E0B' : '#2563EB'}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="group-hover:scale-110 transition-transform origin-bottom"
              />

              {/* Pin Center Badge */}
              <circle cx={cx} cy={cy - 10} r="5" fill="#FFFFFF" />

              {/* Tooltip Label on Hover/Selected */}
              <g className={`transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <rect
                  x={cx - 70}
                  y={cy - 48}
                  width="140"
                  height="22"
                  rx="6"
                  fill="#0F172A"
                  stroke="#334155"
                  strokeWidth="1"
                />
                <text
                  x={cx}
                  y={cy - 34}
                  textAnchor="middle"
                  fill="#F8FAFC"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {biz.tradeName.length > 18 ? biz.tradeName.slice(0, 16) + '...' : biz.tradeName}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Map Legend */}
      <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs text-slate-300 flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white" /> Anúncio Ativo
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" /> Selecionado
        </span>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Image from 'next/image';
import { OFFICIAL_SLOGAN } from './constants';

export function EntreColunasFooter() {
  return (
    <footer
      aria-label="Rodapé institucional"
      className="pt-16 pb-28 md:pb-16 bg-gradient-to-b from-[#380E12] via-[#431317] to-[#4B161B] border-t border-[#C9A227]/40 text-center text-xs text-[#F3EEDD]/80 font-light shadow-2xl relative overflow-hidden"
    >
      {/* Subtle ambient glow */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-[#C9A227]/10 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center px-4">
        {/* Enlarged Logo matching the top */}
        <div className="relative h-18 w-60 sm:h-22 sm:w-72 mb-4">
          <Image
            src="/logoconexao_red_vert.png"
            alt="Conexão Maçônica"
            fill
            sizes="(max-width: 640px) 240px, 288px"
            className="object-contain"
          />
        </div>

        {/* Slogan */}
        <p className="font-serif italic text-sm sm:text-base text-[#F3EEDD] font-medium mb-3">
          &ldquo;{OFFICIAL_SLOGAN}&rdquo;
        </p>

        {/* City and State */}
        <p className="text-[11px] text-[#C9A227] tracking-wider uppercase font-semibold mb-3">
          Feira de Santana — Bahia
        </p>

        {/* Brand & Social Link */}
        <div className="mb-6">
          <a
            href="https://instagram.com/conexaomaconica"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#F3EEDD]/75 hover:text-[#C9A227] transition-colors font-medium tracking-wide"
          >
            @conexaomaconica
          </a>
        </div>

        {/* Bottom copyright */}
        <div className="text-[11px] text-[#F3EEDD]/45 pt-6 border-t border-[#C9A227]/20 w-full">
          <p>© {new Date().getFullYear()} Conexão Maçônica · Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}




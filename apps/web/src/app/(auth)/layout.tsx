import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Entrar · Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#1f0509] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Luzes de fundo com brilho sutil em Bordô e Dourado */}
      <div className="absolute w-[50vw] h-[50vw] rounded-full bg-gradient-to-r from-[#4B161B]/40 to-transparent top-[-10%] left-[-10%] blur-3xl pointer-events-none" />
      <div className="absolute w-[50vw] h-[50vw] rounded-full bg-gradient-to-l from-[#C9A227]/15 to-transparent bottom-[-10%] right-[-10%] blur-3xl pointer-events-none" />

      {/* Card Principal em Glassmorphism da Conexão Maçônica */}
      <div className="w-full max-w-md bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 backdrop-blur-md flex flex-col gap-6 text-white">
        {/* Cabeçalho de Identidade da Marca Conexão Maçônica */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-[#3B0B14] border border-[#C9A227]/50 flex items-center justify-center p-2 shadow-lg mb-1">
            <Image
              src="/logoconexao_red_vert.png"
              alt="Conexão Maçônica Logo"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="font-serif font-bold text-2xl tracking-tight text-[#FAF7F2]">
            Conexão Maçônica
          </h1>
          <p className="text-xs text-amber-200/80 font-medium">
            Portal de Negócios & Governança da Plataforma
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}

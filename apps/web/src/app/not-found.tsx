import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Compass, Home, Landmark, Store, Search } from 'lucide-react';

export const metadata = {
  title: 'Página Não Encontrada (404) · Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] flex flex-col justify-between font-sans antialiased">
      {/* Top Header Simplificado */}
      <header className="bg-[#3b0b14] border-b border-[#c59b27]/30 py-4 px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/guia" className="flex items-center gap-3">
            <Image
              src="/logoconexao_red_vert.png"
              alt="Conexão Maçônica"
              width={160}
              height={56}
              className="h-12 w-auto object-contain py-1"
              priority
              unoptimized
            />
          </Link>
          <Link
            href="/guia"
            className="text-xs font-semibold text-[#c59b27] hover:text-amber-300 transition-colors flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Ir para o Guia</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8 flex-1 flex flex-col items-center justify-center">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-[#fdf8eb] border-2 border-[#c59b27]/40 rounded-full flex items-center justify-center mx-auto shadow-md">
            <Compass className="w-10 h-10 text-[#c59b27] animate-spin-slow" />
          </div>

          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#c59b27] bg-[#3b0b14] px-3 py-1 rounded-full border border-[#c59b27]/40">
            Erro 404 · Conteúdo Não Localizado
          </span>

          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#3b0b14]">
            Página ou Recurso Não Encontrado
          </h1>

          <p className="text-xs md:text-sm text-[#6b625b] leading-relaxed max-w-md mx-auto">
            O endereço buscado não existe ou foi alterado. Utilize os atalhos fraternos abaixo para encontrar o que procura na plataforma.
          </p>
        </div>

        {/* Atalhos Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4">
          <Link
            href="/guia"
            className="p-4 bg-white border border-[#e8e2d9] hover:border-[#c59b27] rounded-2xl flex flex-col items-center gap-2 shadow-xs hover:shadow-md transition-all group"
          >
            <Search className="w-5 h-5 text-[#c59b27] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-[#1f1914] group-hover:text-[#3b0b14]">Início do Guia</span>
          </Link>

          <Link
            href="/guia/empresas"
            className="p-4 bg-white border border-[#e8e2d9] hover:border-[#c59b27] rounded-2xl flex flex-col items-center gap-2 shadow-xs hover:shadow-md transition-all group"
          >
            <Store className="w-5 h-5 text-[#c59b27] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-[#1f1914] group-hover:text-[#3b0b14]">Empresas da Rede</span>
          </Link>

          <Link
            href="/guia/lojas"
            className="p-4 bg-white border border-[#e8e2d9] hover:border-[#c59b27] rounded-2xl flex flex-col items-center gap-2 shadow-xs hover:shadow-md transition-all group"
          >
            <Landmark className="w-5 h-5 text-[#c59b27] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-[#1f1914] group-hover:text-[#3b0b14]">Lojas Maçônicas</span>
          </Link>
        </div>
      </main>

      {/* Footer Minimalista */}
      <footer className="bg-[#2b060d] text-amber-100/70 py-6 px-4 text-center text-xs border-t border-[#c59b27]/20">
        <p>© Conexão Maçônica — Rede Fraterna de Negócios e Credibilidade</p>
      </footer>
    </div>
  );
}

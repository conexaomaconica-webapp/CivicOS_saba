'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RefreshCw, Home, Mail, AlertTriangle } from 'lucide-react';

export default function Error({ error: _error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] flex flex-col justify-between font-sans antialiased">
      {/* Header */}
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
            <span>Página Inicial</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-amber-950/20 border-2 border-[#c59b27]/50 rounded-full flex items-center justify-center mx-auto shadow-md">
          <AlertTriangle className="w-10 h-10 text-[#c59b27]" />
        </div>

        <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#c59b27] bg-[#3b0b14] px-3.5 py-1 rounded-full border border-[#c59b27]/40">
          Erro 500 · Erro Interno de Servidor
        </span>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#3b0b14]">
          Instabilidade Temporária
        </h1>

        <p className="text-xs md:text-sm text-[#6b625b] leading-relaxed max-w-md mx-auto">
          Não foi possível concluir esta requisição no momento. Nossa equipe de engenharia já recebeu o registro para análise rápida.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-4">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 bg-[#3b0b14] hover:bg-[#c59b27] text-white hover:text-[#1f1914] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>

          <Link
            href="/guia"
            className="w-full sm:w-auto px-6 py-3 bg-white border border-[#e8e2d9] hover:border-[#c59b27] text-[#1f1914] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Home className="w-4 h-4 text-[#c59b27]" />
            <span>Ir para o Guia</span>
          </Link>
        </div>

        <div className="pt-6 border-t border-[#e8e2d9] w-full max-w-md">
          <p className="text-[11px] text-[#6b625b] flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-[#c59b27]" />
            <span>Dúvidas ou suporte: <strong>contato@conexaomaconica.com.br</strong></span>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#2b060d] text-amber-100/70 py-6 px-4 text-center text-xs border-t border-[#c59b27]/20">
        <p>© Conexão Maçônica — Rede Fraterna de Negócios e Credibilidade</p>
      </footer>
    </div>
  );
}

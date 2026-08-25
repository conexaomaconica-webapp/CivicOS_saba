import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export interface PermissionDeniedProps {
  requiredPermission?: string;
  description?: string;
}

export function PermissionDenied({
  requiredPermission,
  description = 'Sua conta não possui permissão para acessar este recurso ou área administrativa. Entre em contato com o suporte fraterno se acredita que isso é um erro.',
}: PermissionDeniedProps) {
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
            <span>Voltar ao Guia</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-red-950/20 border-2 border-red-800/40 rounded-full flex items-center justify-center mx-auto shadow-md">
          <ShieldAlert className="w-10 h-10 text-red-700" />
        </div>

        <span className="inline-block text-xs font-bold uppercase tracking-widest text-red-800 bg-red-100 px-3.5 py-1 rounded-full border border-red-300">
          Erro 403 · Acesso Restrito
        </span>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#3b0b14]">
          Acesso Não Autorizado
        </h1>

        <p className="text-xs md:text-sm text-[#6b625b] leading-relaxed max-w-md mx-auto">
          {description}
        </p>

        {requiredPermission && (
          <div className="p-3 bg-[#fdf8eb] border border-[#c59b27]/40 rounded-xl text-xs text-[#3b0b14] font-mono">
            Permissão Requerida: <strong>{requiredPermission}</strong>
          </div>
        )}

        <div className="pt-4 flex items-center gap-3">
          <Link
            href="/guia"
            className="px-6 py-3 bg-[#3b0b14] hover:bg-[#c59b27] text-white hover:text-[#1f1914] text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retornar à Navegação Pública</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#2b060d] text-amber-100/70 py-6 px-4 text-center text-xs border-t border-[#c59b27]/20">
        <p>© Conexão Maçônica — Controle de Acesso e Segurança Fraterna</p>
      </footer>
    </div>
  );
}
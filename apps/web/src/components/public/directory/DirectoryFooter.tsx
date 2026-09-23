'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

export function DirectoryFooter() {
  return (
    <footer className="dh-footer">
      <div className="dh-container">
        {/* Trust Badges Bar */}
        <div className="dh-footer__trust-bar">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 shrink-0 text-amber-500" />
            <span>Ambiente protegido</span>
          </div>
          <div className="flex items-center gap-2 border-x border-white/10 px-6">
            <Lock className="h-5 w-5 shrink-0 text-amber-500" />
            <span>Privacidade e LGPD</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-500" />
            <span>Rede verificada</span>
          </div>
        </div>

        {/* Footer Main Content */}
        <div className="flex flex-col items-center justify-between gap-6 py-6 md:flex-row md:gap-8">
          {/* Logo & Rights */}
          <div className="flex flex-col items-center md:items-start text-xs space-y-2">
            <Image
              src="/logoconexao_red_vert.png"
              alt="Conexão Maçônica"
              width={140}
              height={50}
              className="h-10 w-auto object-contain opacity-90 brightness-200"
            />
            <p className="text-gray-400">© Conexão Maçônica. Todos os direitos reservados.</p>
          </div>

          {/* Links & Menu */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-center text-sm font-medium">
            <Link href="/guia" className="text-gray-300 hover:text-amber-400 transition-colors">
              Início
            </Link>
            <Link href="/guia#empresas" className="text-gray-300 hover:text-amber-400 transition-colors">
              Empresas
            </Link>
            <Link href="/guia#beneficios" className="text-gray-300 hover:text-amber-400 transition-colors">
              Benefícios
            </Link>
            <Link href="/guia#lojas" className="text-gray-300 hover:text-amber-400 transition-colors">
              Lojas Maçônicas
            </Link>
            <Link href="/termos" className="text-gray-300 hover:text-amber-400 transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="text-gray-300 hover:text-amber-400 transition-colors">
              Privacidade e LGPD
            </Link>
          </div>

          {/* Signature */}
          <div className="flex flex-col items-center md:items-end gap-1">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Desenvolvido por</span>
            <a
              href="https://sabastudioblog.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 opacity-70 transition-opacity"
            >
              <Image
                src="/logosabastudio.svg"
                alt="Saba Studio"
                width={130}
                height={35}
                className="h-7 w-auto brightness-0 invert"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

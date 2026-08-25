'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, ExternalLink, ShieldCheck, Menu, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type AdminHeaderProps = {
  userName?: string;
  userRole?: string;
  onMobileMenuToggle?: () => void;
};

export function AdminHeader({
  userName = 'Administrador Master',
  userRole = 'master',
  onMobileMenuToggle,
}: AdminHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (_e) {
      router.push('/login');
    }
  };

  return (
    <header className="bg-[#4B161B] text-white border-b border-[#C9A227]/30 sticky top-0 z-40 shadow-md">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Lado Esquerdo: Mobile Menu Toggle + Identificação da Marca */}
        <div className="flex items-center gap-3">
          {onMobileMenuToggle && (
            <button
              type="button"
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-lg bg-stone-900/40 hover:bg-stone-800 text-stone-200 border border-[#C9A227]/30 transition-colors cursor-pointer"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5 text-[#C9A227]" />
            </button>
          )}

          <Link href="/admin" className="flex items-center gap-3 group">
            <Image
              src="/logoconexao_red_vert.png"
              alt="Conexão Maçônica"
              width={140}
              height={48}
              className="h-9 w-auto object-contain py-0.5"
              priority
              unoptimized
            />
            <div className="hidden sm:flex flex-col border-l border-[#C9A227]/30 pl-3">
              <span className="font-serif font-bold text-sm tracking-wide text-white group-hover:text-[#C9A227] transition-colors">
                CONEXÃO MAÇÔNICA
              </span>
              <span className="text-[10px] font-semibold text-[#C9A227] uppercase tracking-widest">
                Painel Administrativo
              </span>
            </div>
          </Link>
        </div>

        {/* Lado Direito: Atalhos, Notificações & Perfil do Admin */}
        <div className="flex items-center gap-3">
          <Link
            href="/guia"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3B0B14] hover:bg-[#2b060d] text-amber-200 hover:text-white border border-[#C9A227]/40 text-xs font-medium transition-colors"
            title="Visualizar Guia Público"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Ver Guia Público</span>
          </Link>

          <button
            type="button"
            className="relative p-2 rounded-full bg-[#3B0B14] hover:bg-[#2b060d] text-stone-200 border border-[#C9A227]/30 transition-colors cursor-pointer"
            title="Notificações Administrativas"
          >
            <Bell className="w-4 h-4 text-[#C9A227]" />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </button>

          {/* Avatar e Informações da Sessão */}
          <div className="flex items-center gap-2.5 bg-[#3B0B14] border border-[#C9A227]/40 rounded-full px-3 py-1 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-[#C9A227] text-[#3B0B14] font-bold text-xs flex items-center justify-center font-serif shrink-0">
              {userName ? userName.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="hidden lg:flex flex-col text-left pr-1">
              <span className="text-xs font-bold text-white leading-tight truncate max-w-[130px]">
                {userName}
              </span>
              <span className="text-[9px] font-semibold text-[#C9A227] flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5 text-[#C9A227]" />
                {userRole === 'master' ? 'Super Admin' : 'Sócio Admin'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="p-1 text-stone-400 hover:text-red-400 transition-colors cursor-pointer ml-1"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

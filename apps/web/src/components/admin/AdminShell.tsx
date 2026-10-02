'use client';

import React, { useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

import Link from 'next/link';

interface AdminShellProps {
  children: React.ReactNode;
  isSandbox?: boolean;
}

import { usePathname } from 'next/navigation';

export function AdminShell({ children, isSandbox }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  if (pathname?.endsWith('/preview')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1f1914] flex flex-col font-sans antialiased">
      {/* Alerta Permanente: Modo Sandbox Ativo */}
      {isSandbox && (
        <div className="bg-amber-400 text-stone-950 font-medium px-4 py-2 text-xs md:text-sm text-center flex items-center justify-center gap-2 border-b border-amber-500 shadow-xs sticky top-0 z-50">
          <span className="w-2 h-2 rounded-full bg-amber-900 animate-ping inline-block" />
          <span>
            🧪 <strong>AMBIENTE FINANCEIRO: SANDBOX</strong> — Cobranças deste ambiente não devem ser tratadas como operação real.
          </span>
          <Link
            href="/admin/configuracoes/integracoes/asaas"
            className="ml-2 text-xs font-bold underline hover:text-stone-800 transition-colors"
          >
            Configurações Asaas
          </Link>
        </div>
      )}

      {/* Header Administrativo Conexão Maçônica */}
      <AdminHeader onMobileMenuToggle={() => setMobileOpen((prev) => !prev)} />

      <div className="flex-1 flex w-full max-w-[1400px] mx-auto">
        {/* Sidebar Administrativa */}
        <AdminSidebar isMobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        {/* Conteúdo Principal da Rota Administrativa */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>

      {/* Footer Administrativo Discreto */}
      <footer className="bg-[#2b060d] text-amber-100/70 border-t border-[#C9A227]/30 py-3 px-6 text-center text-xs">
        <p>© Conexão Maçônica — Ambiente Administrativo · Central de Gestão Operacional</p>
      </footer>
    </div>
  );
}

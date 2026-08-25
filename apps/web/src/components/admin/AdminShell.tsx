'use client';

import React, { useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1f1914] flex flex-col font-sans antialiased">
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

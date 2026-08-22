'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Image, Tag, Award, Settings } from 'lucide-react';

const TABS = [
  { href: '/admin/guia/geral', label: 'Geral & Seções', icon: Settings },
  { href: '/admin/guia/banners', label: 'Banners', icon: Image },
  { href: '/admin/guia/categorias', label: 'Categorias em Destaque', icon: Tag },
  { href: '/admin/guia/destaques', label: 'Empresas Patrocinadas', icon: Award },
];

export default function AdminGuiaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-amber-700" /> Gestão da Home do Guia
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administre os banners, destaques comerciais, seções e parâmetros visuais da Home do Guia Comercial e Maçônico.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex space-x-1 border-b border-gray-200 bg-white p-1 rounded-lg border shadow-sm">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href === '/admin/guia/geral' && pathname === '/admin/guia');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                isActive
                  ? 'bg-amber-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Tab Content */}
      <div>{children}</div>
    </div>
  );
}

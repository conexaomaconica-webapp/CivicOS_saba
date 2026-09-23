import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Award, Tag, Sparkles, ArrowRight, Store } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import '@/styles/directory-home.css';

export const metadata: Metadata = {
  title: 'Clube de Benefícios e Vantagens · Conexão Maçônica',
  description: 'Confira vantagens exclusivas, descontos e benefícios oferecidos por empresas da rede Conexão Maçônica.',
};

export default async function PublicBenefitsDirectoryPage() {
  const supabase = await createServerSideClient();

  // Fetch businesses with active benefits via RPC
  const { data: searchRes } = await (supabase as any).rpc('public_businesses_search', {
    p_host: 'localhost',
    p_has_benefits: true,
    p_page: 1,
    p_page_size: 24,
  });

  const items = (searchRes as any)?.items || [];

  return (
    <FavoritesProvider>
      <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] font-sans antialiased relative">
        <DirectoryHeader />

        {/* Sub-Hero Header com Paleta Bordô & Dourada do Sistema */}
        <section className="bg-gradient-to-b from-[#3b0b14] via-[#3b0b14] to-[#2b060d] text-white py-10 px-4 relative overflow-hidden border-b border-[#c59b27]/30 shadow-lg">
          <div className="dh-container relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-amber-200/80 mb-3" aria-label="Breadcrumb">
              <Link href="/guia" className="hover:text-amber-300 transition-colors">
                Início
              </Link>
              <ChevronRight className="w-3 h-3 text-[#c59b27]" />
              <span className="text-white font-semibold">Clube de Benefícios</span>
            </nav>

            <div className="flex items-center gap-2 text-[#c59b27] text-xs font-bold uppercase tracking-wider mb-2">
              <Award className="w-4 h-4 text-[#c59b27]" />
              <span>Vantagens Fraternas Exclusivas</span>
            </div>

            <h1 className="font-serif font-bold text-3xl md:text-4xl text-white">
              Clube de Benefícios & Ofertas
            </h1>
            <p className="text-xs md:text-sm text-amber-100/90 max-w-2xl mt-2 leading-relaxed">
              Condições diferenciadas, descontos especiais e atendimento exclusivo oferecidos por empresários fraternos cadastrados na rede Conexão Maçônica.
            </p>
          </div>
        </section>

        <main className="dh-container space-y-8 py-7 sm:py-10">
          {/* Grid de Ofertas */}
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 xl:gap-6">
              {items.map((biz: any) => (
                <div
                  key={biz.business_id || biz.slug}
                  className="group flex min-w-0 flex-col justify-between space-y-4 rounded-2xl border border-[#e8e2d9] bg-white p-4 shadow-sm transition-all hover:border-[#c59b27]/60 hover:shadow-md sm:p-5 lg:p-6"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex max-w-full items-center gap-1.5 rounded-full border border-[#c59b27]/40 bg-[#fdf8eb] px-3 py-1 text-[11px] font-bold text-[#3b0b14] shadow-xs">
                        <Tag className="w-3.5 h-3.5 text-[#c59b27]" /> Benefício Ativo
                      </span>
                      {biz.is_founder && (
                        <span className="bg-[#3b0b14] text-[#c59b27] font-bold text-[10px] px-2.5 py-0.5 rounded border border-[#c59b27]/50 shadow-xs">
                          Pedra Fundamental
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="break-words font-serif text-lg font-bold leading-tight text-[#1f1914] transition-colors group-hover:text-[#3b0b14] sm:text-xl">
                        {biz.business_name || biz.name}
                      </h3>
                      <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#6b625b]">
                        <Store className="h-3.5 w-3.5 shrink-0 text-[#c59b27]" />
                        <span className="break-words">{biz.primary_category_name || biz.category || 'Empresa Parceira'}</span>
                        {biz.city && <span>• {biz.city}</span>}
                      </p>
                    </div>

                    <p className="text-xs text-[#6b625b] leading-relaxed line-clamp-3">
                      {biz.description || 'Confira as condições especiais de atendimento e descontos exclusivos no perfil público.'}
                    </p>
                  </div>

                  <Link
                    href={`/guia/${biz.business_slug || biz.slug}`}
                    className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3b0b14] px-3 py-2.5 text-center text-xs font-bold text-white shadow-sm transition-all hover:bg-[#c59b27] hover:text-[#1f1914]"
                  >
                    <span>Ver Benefício no Perfil</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 bg-white border border-[#e8e2d9] rounded-2xl text-center space-y-3 shadow-xs">
              <Sparkles className="w-10 h-10 text-[#c59b27] mx-auto" />
              <h3 className="text-lg font-bold font-serif text-[#1f1914]">Nenhum benefício cadastrado no momento</h3>
              <p className="text-xs text-[#6b625b] max-w-md mx-auto">
                À medida que novas empresas entrarem na rede Conexão Maçônica, as ofertas e descontos exclusivos aparecerão nesta página.
              </p>
            </div>
          )}
        </main>

        <DirectoryFooter />
        <DirectoryFavoritesModal />
      </div>
    </FavoritesProvider>
  );
}

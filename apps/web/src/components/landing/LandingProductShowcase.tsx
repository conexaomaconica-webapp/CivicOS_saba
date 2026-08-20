import React from 'react';
import { Monitor, Smartphone, Search } from 'lucide-react';

export function LandingProductShowcase() {
  return (
    <section className="py-20 bg-[#20080a] text-white border-t border-[#4B161B]">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-[#C9A227] tracking-widest uppercase">
            Interface Real do Sistema
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Veja como sua empresa aparecerá no Conexão Maçônica
          </h3>
          <p className="text-slate-400 text-base">
            Desenvolvido com tecnologia moderna, layout responsivo e experiência de usuário premium em desktop e mobile.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#300d11] border border-[#4B161B] space-y-4">
            <div className="h-48 rounded-xl bg-[#20080a] border border-[#4B161B] flex items-center justify-center p-4 text-center">
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl !bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227]">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-300">Perfil Ouro em Desktop</p>
                  <p className="text-[10px] text-slate-500">Banner, Galeria, Serviços e Avaliações</p>
                </div>
              </div>
            </div>
            <h4 className="text-base font-bold text-white">Página Exclusiva da Empresa</h4>
            <p className="text-xs text-slate-400">Layout amplo e profissional com todas as informações essenciais do seu negócio.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#300d11] border border-[#C9A227]/30 space-y-4">
            <div className="h-48 rounded-xl bg-[#20080a] border border-[#C9A227]/20 flex items-center justify-center p-4 text-center">
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl !bg-[#C9A227]/20 border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227]">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#C9A227]">Selo Empresa Fundadora em Mobile</p>
                  <p className="text-[10px] text-slate-500">Exibição rápida com WhatsApp Direto</p>
                </div>
              </div>
            </div>
            <h4 className="text-base font-bold text-white">Otimização Mobile NCL</h4>
            <p className="text-xs text-slate-400">Navegação rápida em smartphones com clique direto para chamar no WhatsApp.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#300d11] border border-[#4B161B] space-y-4">
            <div className="h-48 rounded-xl bg-[#20080a] border border-[#4B161B] flex items-center justify-center p-4 text-center">
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl !bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227]">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-300">Busca por Categorias</p>
                  <p className="text-[10px] text-slate-500">Filtros por cidade e serviços</p>
                </div>
              </div>
            </div>
            <h4 className="text-base font-bold text-white">Diretório Inteligente</h4>
            <p className="text-xs text-slate-400">Resultados organizados com destaque prioritário para os planos superiores.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

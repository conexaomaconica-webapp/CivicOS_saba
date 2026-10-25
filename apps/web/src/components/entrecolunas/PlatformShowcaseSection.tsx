'use client';

import React from 'react';
import { Search, ShieldCheck, MessageCircle, MapPin, Sparkles, Smartphone, Laptop } from 'lucide-react';

export function PlatformShowcaseSection() {
  const sampleCategories = [
    'Construção Civil',
    'Saúde & Medicina',
    'Direito & Jurídico',
    'Contabilidade',
    'Serviços Automotivos',
    'Gastronomia',
  ];

  return (
    <section
      aria-labelledby="demonstracao-title"
      className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 md:px-8"
    >
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C9A227]/40 bg-[#FAF7F2] text-[11px] font-semibold text-[#8B6D1B] uppercase tracking-wider mb-3 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>Demonstração Ilustrativa da Interface</span>
        </div>

        <h2
          id="demonstracao-title"
          className="font-[family-name:var(--font-marcellus)] text-3xl sm:text-4xl md:text-5xl text-[#4B161B] font-normal tracking-tight mb-4"
        >
          Acesso rápido e direto pelo celular ou computador.
        </h2>
        <p className="text-base sm:text-lg text-[#5A483E] max-w-2xl mx-auto font-light leading-relaxed">
          Desenvolvida com tecnologia de alta performance para garantir buscas velozes, navegação intuitiva e total clareza.
        </p>
      </div>

      {/* Illustrative Device Frame */}
      <div className="rounded-3xl bg-white border border-[#C9A227]/30 shadow-xl overflow-hidden">
        {/* Browser Top Bar */}
        <div className="px-4 py-3 bg-[#FAF7F2] border-b border-[#C9A227]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E57373]/80" />
            <div className="w-3 h-3 rounded-full bg-[#FFB74D]/80" />
            <div className="w-3 h-3 rounded-full bg-[#81C784]/80" />
            <span className="text-[11px] font-mono text-[#8C7A70] ml-2 hidden sm:inline">
              conexaomaconica.com.br
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8B6D1B]">
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile & Desktop</span>
            <Laptop className="w-3.5 h-3.5 hidden sm:inline" />
          </div>
        </div>

        {/* Mock Search Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-[#FAF7F2]/60 to-white border-b border-[#C9A227]/15">
          <div className="max-w-xl mx-auto">
            {/* Search Bar Input Simulation */}
            <div className="relative flex items-center w-full rounded-2xl bg-white border border-[#C9A227]/40 px-4 py-3 shadow-xs">
              <Search className="w-4 h-4 text-[#C9A227] mr-3 shrink-0" />
              <span className="text-xs sm:text-sm text-[#8C7A70] font-light">
                Buscar por médicos, advogados, engenharia, serviços...
              </span>
              <span className="ml-auto px-2.5 py-1 rounded-lg bg-[#4B161B] text-white text-[11px] font-semibold hidden sm:inline">
                Buscar
              </span>
            </div>

            {/* Category pills simulation */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {sampleCategories.map((cat) => (
                <span
                  key={cat}
                  className="px-2.5 py-1 rounded-full bg-white border border-[#C9A227]/25 text-[11px] text-[#5A483E] font-medium"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Illustrative Cards Showcase (No fake business names presented as real) */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#FAF7F2]/30">
          {/* Feature 1 */}
          <div className="p-5 rounded-2xl bg-white border border-[#C9A227]/25 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#C9A227]">
                Exemplo de Perfil
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full font-medium">
                <ShieldCheck className="w-3 h-3" />
                Verificado
              </span>
            </div>
            <h4 className="text-sm font-semibold text-[#4B161B] mb-1">
              Engenharia, Laudos & Projetos
            </h4>
            <p className="text-xs text-[#6B5B52] mb-3 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#C9A227]" />
              Feira de Santana — BA
            </p>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-[#8C7A70]">Especialidades estruturais</span>
              <span className="inline-flex items-center gap-1 text-xs text-[#25D366] font-medium">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-5 rounded-2xl bg-white border border-[#C9A227]/25 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#C9A227]">
                Exemplo de Perfil
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full font-medium">
                <ShieldCheck className="w-3 h-3" />
                Verificado
              </span>
            </div>
            <h4 className="text-sm font-semibold text-[#4B161B] mb-1">
              Advocacia Cível & Empresarial
            </h4>
            <p className="text-xs text-[#6B5B52] mb-3 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#C9A227]" />
              Feira de Santana — BA
            </p>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-[#8C7A70]">Assessoria jurídica</span>
              <span className="inline-flex items-center gap-1 text-xs text-[#25D366] font-medium">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-5 rounded-2xl bg-white border border-[#C9A227]/25 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#C9A227]">
                Exemplo de Perfil
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full font-medium">
                <ShieldCheck className="w-3 h-3" />
                Verificado
              </span>
            </div>
            <h4 className="text-sm font-semibold text-[#4B161B] mb-1">
              Clínica de Especialidades & Saúde
            </h4>
            <p className="text-xs text-[#6B5B52] mb-3 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#C9A227]" />
              Feira de Santana — BA
            </p>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-[#8C7A70]">Atendimento integrado</span>
              <span className="inline-flex items-center gap-1 text-xs text-[#25D366] font-medium">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-4 bg-[#FAF7F2] border-t border-[#C9A227]/20 text-center">
          <p className="text-xs text-[#8B6D1B] font-light">
            * Demonstração puramente ilustrativa dos recursos da plataforma. O catálogo oficial de empresas e profissionais cadastrados será aberto publicamente no lançamento de 24 de novembro.
          </p>
        </div>
      </div>
    </section>
  );
}

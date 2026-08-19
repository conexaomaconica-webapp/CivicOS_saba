import React from 'react';
import { CheckCircle2, Search, Building2 } from 'lucide-react';

export function LandingAudience() {
  return (
    <section className="py-20 bg-slate-900 text-white" id="para-quem">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-[#C9A227] tracking-widest uppercase">
            Público e Elegibilidade
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Para quem é o Conexão Maçônica?
          </h3>
          <p className="text-slate-300 text-sm max-w-2xl mx-auto">
            O Guia é aberto ao público geral para consulta, conectando a comunidade a empresas e profissionais com vínculo maçônico verificado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Para Quem Procura */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] text-xs font-bold uppercase">
              <Search className="w-3.5 h-3.5" />
              <span>Para Quem Procura</span>
            </div>
            <h4 className="text-2xl font-bold text-white">Encontrar serviços e profissionais de confiança</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
                <span>Acesso público e aberto a empresas, profissionais liberais e estabelecimentos.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
                <span>Identificação transparente de vínculo maçônico verificado no perfil.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
                <span>Contato direto via WhatsApp, mapa de localização e avaliações autênticas.</span>
              </li>
            </ul>
          </div>

          {/* Para Quem Anuncia & Elegibilidade */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-[#C9A227]/30 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] text-xs font-bold uppercase">
              <Building2 className="w-3.5 h-3.5" />
              <span>Para Quem Anuncia — Critérios de Vínculo</span>
            </div>
            <h4 className="text-2xl font-bold text-white">Empresas e profissionais elegíveis</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
                <span>Empresa ou atividade profissional de <strong>maçom ativo ou adormecido</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
                <span>Empresa ou atividade de <strong>cunhadas e sobrinhos</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
                <span>Empresas em que atue um irmão maçom como gestor ou profissional, exibidas com a identificação: <em>"Profissional maçom vinculado"</em>.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

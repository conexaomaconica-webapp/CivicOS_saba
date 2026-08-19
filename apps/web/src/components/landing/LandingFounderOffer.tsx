'use client';

import React from 'react';
import { Button, Badge } from '@saas/ui';

export function LandingFounderOffer() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      className="py-20 bg-gradient-to-b from-slate-950 via-[#4B161B]/30 to-slate-950 text-white border-y border-[#C9A227]/40 relative"
      id="oferta-fundador"
    >
      <div className="container mx-auto px-4 max-w-4xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/40 text-[#C9A227] text-xs font-bold uppercase">
          <Badge variant="warning">OFERTA DE LANÇAMENTO</Badge>
          <span>EXCLUSIVA PARA AS 100 PRIMEIRAS EMPRESAS</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
          Toda grande comunidade começa com aqueles que{' '}
          <span className="text-[#C9A227]">acreditaram primeiro</span>
        </h2>

        <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Seja uma das <strong>100 primeiras Empresas Fundadoras</strong> do Conexão Maçônica. Tenha acesso a todos os recursos do Plano Ouro por uma condição histórica de lançamento.
        </p>

        <div className="p-8 rounded-2xl bg-slate-900/90 border border-[#C9A227]/40 shadow-2xl max-w-xl mx-auto space-y-6 text-left relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-2xl font-extrabold text-[#C9A227]">Plano Ouro Fundador</h3>
              <p className="text-xs text-slate-400">Oferta Especial Reservada a 100 Empresas</p>
            </div>
            <div className="text-right">
              <span className="text-xs line-through text-slate-500 block">R$ 1.000 / ano</span>
              <span className="text-2xl font-black text-white">R$ 599 <small className="text-xs font-normal text-slate-300">/ ano¹</small></span>
            </div>
          </div>

          <div className="bg-[#C9A227]/10 p-3 rounded-lg border border-[#C9A227]/30 text-center text-xs font-semibold text-[#C9A227]">
            💡 Economia de R$ 401/ano (R$ 802,00 no período de 2 anos) em relação ao preço atual do Plano Ouro!
          </div>

          <ul className="space-y-3 text-sm text-slate-200">
            <li className="flex items-start gap-2">
              <span className="text-[#C9A227] font-bold">✓</span>
              <span><strong>Todos os benefícios do Plano Ouro</strong> (25 Serviços, 10 Fotos, 3 Ofertas, 5 Eventos e 10 Posts)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C9A227] font-bold">✓</span>
              <span><strong>Selo Empresa Fundadora</strong> de exibição permanente no perfil</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C9A227] font-bold">✓</span>
              <span>Condição especial de <strong>R$ 599/ano garantida pelos 2 primeiros anos</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C9A227] font-bold">✓</span>
              <span>Destaque de busca máximo equivalente ao Plano Ouro</span>
            </li>
          </ul>

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full py-4 bg-[#C9A227] hover:bg-[#B89628] text-[#4B161B] font-extrabold shadow-lg shadow-[#C9A227]/20 rounded-lg text-base"
              onClick={() => scrollTo('captacao-lead')}
            >
              GARANTIR MINHA VAGA DE FUNDADOR
            </Button>
            <p className="text-center text-[11px] text-slate-400 italic">
              ¹ A partir do 3º ano, a renovação passa a seguir o valor vigente do Plano Ouro, mantendo permanentemente o selo Empresa Fundadora.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

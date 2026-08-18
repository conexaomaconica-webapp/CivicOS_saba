'use client';

import React from 'react';
import { Button, Badge } from '@saas/ui';

export function LandingFounderOffer() {
  return (
    <section
      className="py-20 bg-gradient-to-b from-slate-950 via-[#4B161B]/30 to-slate-950 text-white border-y border-[#C9A227]/30 relative"
      id="oferta-fundador"
    >
      <div className="container mx-auto px-4 max-w-4xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/40 text-[#C9A227] text-xs font-bold uppercase">
          <Badge variant="warning">CONDIÇÃO ESPECIAL</Badge>
          <span>SEJA UMA EMPRESA FUNDADORA</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
          Toda grande comunidade começa com aqueles que{' '}
          <span className="text-[#C9A227]">acreditaram primeiro</span>
        </h2>

        <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Uma condição especial de lançamento destinada às primeiras empresas que fizerem parte do <strong>Conexão Maçônica</strong>. Garanta presenças prioritárias no ecossistema comercial.
        </p>

        <div className="p-8 rounded-2xl bg-slate-900/90 border border-[#C9A227]/40 shadow-2xl max-w-xl mx-auto space-y-6 text-left">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-[#C9A227]">Plano Ouro Fundador</h3>
              <p className="text-xs text-slate-400">Pacote Completo com Selo de Reconhecimento</p>
            </div>
            <Badge variant="warning">OFERTA DE PRÉ-LANÇAMENTO</Badge>
          </div>

          <ul className="space-y-3 text-sm text-slate-200">
            <li className="flex items-start gap-2">
              <span className="text-[#C9A227] font-bold">✓</span>
              <span>Todos os recursos do Plano Ouro (Serviços, Fotos, Eventos e Posts)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C9A227] font-bold">✓</span>
              <span>Selo <strong>Selo Founder Ativo</strong> visível no perfil da empresa</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C9A227] font-bold">✓</span>
              <span>Destaque prioritário no Guia de Empresas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C9A227] font-bold">✓</span>
              <span>Condição especial de pré-lançamento para os primeiros inscritos</span>
            </li>
          </ul>

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full py-4 bg-[#C9A227] hover:bg-[#b08c1e] text-[#4B161B] font-extrabold shadow-lg shadow-[#C9A227]/20 rounded-lg text-base"
              onClick={() => {
                document.getElementById('captacao-lead')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              GARANTIR MINHA VAGA DE FUNDADOR
            </Button>
            <p className="text-center text-xs text-slate-400 italic">
              Vagas limitadas para a primeira fase de homologação comercial.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

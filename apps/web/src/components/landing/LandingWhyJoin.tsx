import React from 'react';
import { Eye, ShieldCheck, Award } from 'lucide-react';

export function LandingWhyJoin() {
  const reasons = [
    {
      icon: Eye,
      num: '01',
      title: 'Visibilidade desde o Lançamento',
      text: 'Sua empresa estará devidamente posicionada quando a comunidade começar a navegar e buscar serviços no Guia.',
    },
    {
      icon: ShieldCheck,
      num: '02',
      title: 'Condição Especial Reservada',
      text: 'Benefícios e vantagens comerciais garantidas exclusivamente para as empresas que participarem da fase inicial.',
    },
    {
      icon: Award,
      num: '03',
      title: 'Posicionamento Institucional',
      text: 'Sua marca passa a integrar o grupo pioneiro que ajudou a construir a primeira versão do Conexão Maçônica.',
    },
  ];

  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-[#C9A227] tracking-widest uppercase">
            Vantagem Competitiva
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Por que cadastrar sua empresa agora?
          </h3>
          <p className="text-slate-400 text-base">
            Quem chega primeiro não é apenas um anunciante: faz parte da história inicial do ecossistema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reasons.map((r) => {
            const IconComponent = r.icon;
            return (
              <div key={r.num} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-[#C9A227]/40 transition-all duration-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227]">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-[#C9A227] font-mono">{r.num}</span>
                </div>
                <h4 className="text-xl font-bold text-white">{r.title}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{r.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

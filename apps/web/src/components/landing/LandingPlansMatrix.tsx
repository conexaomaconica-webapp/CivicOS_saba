import React from 'react';
import { Badge } from '@saas/ui';

export function LandingPlansMatrix() {
  const plans = [
    {
      code: 'bronze',
      name: 'BRONZE',
      tagline: 'Presença básica no Guia',
      services: '1 Serviço',
      gallery: '—',
      events: '—',
      posts: '—',
      highlight: 'Padrão',
      founderBadge: '—',
      border: 'border-slate-800',
    },
    {
      code: 'prata',
      name: 'PRATA',
      tagline: 'Para pequenas empresas',
      services: 'Até 5 Serviços',
      gallery: 'Até 3 Fotos',
      events: '—',
      posts: '—',
      highlight: 'Moderado',
      founderBadge: '—',
      border: 'border-slate-700',
    },
    {
      code: 'ouro',
      name: 'OURO',
      tagline: 'Presença comercial completa',
      services: 'Até 15 Serviços',
      gallery: 'Até 10 Fotos',
      events: 'Até 5 Eventos',
      posts: 'Até 10 Posts',
      highlight: 'Máximo na Busca',
      founderBadge: '—',
      border: 'border-amber-500/50',
    },
    {
      code: 'ouro_founder',
      name: 'OURO FUNDADOR',
      tagline: 'Condição Especial de Lançamento',
      services: 'Até 15 Serviços',
      gallery: 'Até 10 Fotos',
      events: 'Até 5 Eventos',
      posts: 'Até 10 Posts',
      highlight: 'Máximo com Destaque Especial',
      founderBadge: '✓ Selo Founder Ativo',
      border: 'border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10',
      isPopular: true,
    },
  ];

  return (
    <section className="py-20 bg-slate-900 text-white" id="planos">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-amber-400 tracking-widest uppercase">
            Transparência e Recursos
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Matriz Comparativa dos Planos
          </h3>
          <p className="text-slate-400 text-base">
            Escolha a modalidade de anúncio ideal para o tamanho e a necessidade da sua empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => (
            <div
              key={p.code}
              className={`p-6 rounded-2xl bg-slate-950 border ${p.border} flex flex-col justify-between space-y-6 relative`}
            >
              {p.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="warning">OFERTA DE LANÇAMENTO</Badge>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-white uppercase">{p.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{p.tagline}</p>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-800 pt-4 text-slate-300">
                  <div className="flex justify-between">
                    <span>Presença no Guia:</span>
                    <strong className="text-emerald-400">✓ Sim</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Limite de Serviços:</span>
                    <strong>{p.services}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Galeria de Fotos:</span>
                    <strong>{p.gallery}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Eventos no Guia:</span>
                    <strong>{p.events}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Novidades / Posts:</span>
                    <strong>{p.posts}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Destaque na Busca:</span>
                    <strong className="text-amber-400">{p.highlight}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Selo Founder:</span>
                    <strong className={p.founderBadge.includes('✓') ? 'text-amber-300' : 'text-slate-500'}>
                      {p.founderBadge}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

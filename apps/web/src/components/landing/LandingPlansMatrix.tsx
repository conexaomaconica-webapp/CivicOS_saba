import React from 'react';
import { Badge } from '@saas/ui';

export function LandingPlansMatrix() {
  const plans = [
    {
      code: 'bronze',
      name: 'BRONZE',
      tagline: 'Esteja presente',
      priceText: 'R$ 500 / ano',
      priceSubtext: 'Presença essencial no Guia',
      services: '3 Serviços / Produtos',
      gallery: '— (Apenas Foto Principal)',
      benefits: '—',
      events: '—',
      posts: '—',
      highlight: 'Padrão nas buscas',
      founderBadge: '—',
      border: 'border-slate-800',
    },
    {
      code: 'prata',
      name: 'PRATA',
      tagline: 'Mostre melhor sua empresa',
      priceText: 'R$ 800 / ano',
      priceSubtext: 'Mais conteúdo e galeria de fotos',
      services: 'Até 10 Serviços / Produtos',
      gallery: 'Até 3 Fotos na Galeria',
      benefits: '1 Oferta / Benefício Ativo',
      events: '—',
      posts: '—',
      highlight: 'Intermediário',
      founderBadge: '—',
      border: 'border-slate-700',
    },
    {
      code: 'ouro',
      name: 'OURO',
      tagline: 'Amplie sua presença e gere oportunidades',
      priceText: 'R$ 1.000 / ano',
      priceSubtext: 'Recursos completos + Eventos e Posts',
      services: 'Até 25 Serviços / Produtos',
      gallery: 'Até 10 Fotos na Galeria',
      benefits: 'Até 3 Ofertas / Benefícios',
      events: 'Até 5 Eventos no Guia',
      posts: 'Até 10 Posts / Novidades',
      highlight: 'Máximo na Busca',
      founderBadge: '—',
      border: 'border-[#C9A227]/50',
    },
    {
      code: 'ouro_founder',
      name: 'OURO FUNDADOR',
      tagline: 'Faça parte da história',
      priceText: 'R$ 599 / ano¹',
      priceSubtext: 'Garantido nos 2 primeiros anos (100 Vagas)',
      services: 'Até 25 Serviços / Produtos',
      gallery: 'Até 10 Fotos na Galeria',
      benefits: 'Até 3 Ofertas / Benefícios',
      events: 'Até 5 Eventos no Guia',
      posts: 'Até 10 Posts / Novidades',
      highlight: 'Máximo na Busca (Igual ao Ouro)',
      founderBadge: '✓ Selo Empresa Fundadora',
      border: 'border-[#C9A227] bg-[#C9A227]/10 shadow-xl shadow-[#C9A227]/10',
      isPopular: true,
    },
  ];

  return (
    <section className="py-20 bg-slate-900 text-white" id="planos">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-[#C9A227] tracking-widest uppercase">
            Transparência e Recursos
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Matriz Comercial dos Planos
          </h3>
          <p className="text-slate-400 text-base">
            Escolha o plano ideal para a necessidade do seu negócio e o nível de presença desejado na comunidade.
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
                  <p className="text-xs text-[#C9A227] font-semibold mt-1">{p.tagline}</p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-xl font-extrabold text-white">{p.priceText}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.priceSubtext}</div>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-800 pt-4 text-slate-300">
                  <div className="flex justify-between">
                    <span>Presença no Guia:</span>
                    <strong className="text-emerald-400">✓ Sim</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Vínculo Verificado:</span>
                    <strong className="text-emerald-400">✓ Sim</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Serviços / Produtos:</span>
                    <strong>{p.services}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Galeria de Fotos:</span>
                    <strong>{p.gallery}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ofertas / Benefícios:</span>
                    <strong>{p.benefits}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Eventos no Guia:</span>
                    <strong>{p.events}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Posts / Novidades:</span>
                    <strong>{p.posts}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Destaque na Busca:</span>
                    <strong className="text-[#C9A227]">{p.highlight}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Selo Fundadora:</span>
                    <strong className={p.founderBadge.includes('✓') ? 'text-[#C9A227]' : 'text-slate-500'}>
                      {p.founderBadge}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-slate-400 max-w-3xl mx-auto pt-4 leading-relaxed">
          ¹ <strong>Condição do Plano Ouro Fundador:</strong> R$ 599/ano garantidos durante os 2 primeiros anos para as 100 primeiras empresas cadastradas. A partir do 3º ano, a renovação passa a seguir o valor vigente do Plano Ouro, mantendo permanentemente o selo Empresa Fundadora.
        </div>
      </div>
    </section>
  );
}

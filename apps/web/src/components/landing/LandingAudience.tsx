import React from 'react';

export function LandingAudience() {
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-amber-400 tracking-widest uppercase">
            Público-Alvo
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Para quem é o Conexão Maçônica?
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 space-y-6">
            <div className="inline-block px-3 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase">
              Para Quem Procura
            </div>
            <h4 className="text-2xl font-bold text-white">Encontrar serviços e profissionais de confiança</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Localize empresas, profissionais liberais e estabelecimentos da sua região.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Descubra negócios e serviços ligados à comunidade com informações organizadas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Acesse avaliações autênticas, horários de atendimento e rotas pelo mapa.</span>
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 space-y-6">
            <div className="inline-block px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase">
              Para Quem Anuncia
            </div>
            <h4 className="text-2xl font-bold text-white">Ganhar visibilidade perante um público qualificado</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>Empresários, médicos, advogados, consultores, prestadores de serviços e comércio.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>Marque presença institucional onde os clientes realmente procuram pela sua marca.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>Receba contatos diretos no WhatsApp sem intermediários ou comissões de terceiros.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

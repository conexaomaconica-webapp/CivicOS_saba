import React from 'react';
import { Search, Building2, Star, Calendar } from 'lucide-react';

export function LandingEcosystem() {
  const pillars = [
    {
      icon: Search,
      title: 'Busca por Relevância',
      description: 'Localize facilmente empresas, profissionais liberais e prestadores de serviços qualificados por categoria e cidade.',
    },
    {
      icon: Building2,
      title: 'Perfis Completos',
      description: 'Página exclusiva da sua empresa com fotos, horários de funcionamento, localização geográfica e integração direta com WhatsApp.',
    },
    {
      icon: Star,
      title: 'Reputação Autêntica',
      description: 'Avaliações de clientes moderadas pela equipe para garantir transparência e confiança institucional.',
    },
    {
      icon: Calendar,
      title: 'Eventos & Notícias',
      description: 'Divulgação de encontros de negócios, palestras e comunicados institucionais com controle de cotas por plano.',
    },
  ];

  return (
    <section className="py-20 bg-slate-950 text-white border-t border-slate-800/60" id="como-funciona">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-[#C9A227] tracking-widest uppercase">
            Ecossistema Conexão Maçônica
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Muito mais que uma simples lista de empresas
          </h3>
          <p className="text-slate-400 text-base">
            Encontre. Conheça. Conecte-se. Valorize quem faz parte da comunidade através de um ecossistema estruturado para apoiar negócios reais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-[#C9A227]/40 transition-all duration-200 flex flex-col space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227]">
                  <IconComponent className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white">{item.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

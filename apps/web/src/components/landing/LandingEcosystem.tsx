import React from 'react';

export function LandingEcosystem() {
  const pillars = [
    {
      icon: '🔍',
      title: 'Busca por Relevância',
      description: 'Localize facilmente empresas, profissionais liberais e prestadores de serviços qualificados por categoria e cidade.',
    },
    {
      icon: '🏢',
      title: 'Perfis Completos',
      description: 'Página exclusiva da sua empresa com fotos, horários de funcionamento, localização geográfica e integração direta com WhatsApp.',
    },
    {
      icon: '⭐',
      title: 'Reputação Autêntica',
      description: 'Avaliações de clientes moderadas pela equipe para garantir transparência e confiança institucional.',
    },
    {
      icon: '📅',
      title: 'Eventos & Notícias',
      description: 'Divulgação de encontros de negócios, palestras e comunicados institucionais com controle de cotas por plano.',
    },
  ];

  return (
    <section className="py-20 bg-slate-950 text-white border-t border-slate-800/60">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-amber-400 tracking-widest uppercase">
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
          {pillars.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all duration-200 flex flex-col space-y-3"
            >
              <div className="text-3xl">{item.icon}</div>
              <h4 className="text-lg font-bold text-white">{item.title}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

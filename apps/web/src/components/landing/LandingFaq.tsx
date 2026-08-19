import React from 'react';

export function LandingFaq() {
  const faqs = [
    {
      q: 'O que é o Conexão Maçônica?',
      a: 'O Conexão Maçônica é um guia criado para aproximar pessoas, profissionais, empresas e serviços em um ambiente organizado, confiável e pensado para gerar novas conexões comerciais.',
    },
    {
      q: 'Quem pode anunciar no Guia?',
      a: 'Podem anunciar empresas ou profissionais com vínculo maçônico elegível (maçons ativos ou adormecidos, cunhadas e sobrinhos). Empresas em que atue um irmão maçom profissionalmente também são elegíveis, sendo identificadas no perfil como "Profissional maçom vinculado".',
    },
    {
      q: 'O Guia é aberto ao público geral?',
      a: 'Sim! O Guia é aberto ao público geral para consulta, permitindo que qualquer pessoa localize empresas qualificadas, veja a localização no mapa e entre em contato direto pelo WhatsApp.',
    },
    {
      q: 'O que significa "Vínculo Maçônico Verificado"?',
      a: 'Indica que a equipe do Conexão Maçônica realizou a validação administrativa cadastral do vínculo declarado para participação no Guia.',
    },
    {
      q: 'O que é uma Empresa Fundadora e qual a limitação de vagas?',
      a: 'É a condição histórica reservada exclusivamente às 100 primeiras empresas que participarem do lançamento. O Plano Ouro Fundador oferece todos os recursos do Plano Ouro por R$ 599/ano durante os 2 primeiros anos.',
    },
    {
      q: 'Como funciona a renovação do Plano Fundador a partir do 3º ano?',
      a: 'A condição promocional de R$ 599/ano é garantida pelos 2 primeiros anos. A partir do 3º ano, a renovação passa a seguir o valor vigente do Plano Ouro, mantendo permanentemente o selo Empresa Fundadora no perfil.',
    },
  ];

  return (
    <section className="py-20 bg-slate-900 text-white" id="faq">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-xs font-bold text-[#C9A227] tracking-widest uppercase">
            Esclareça suas Dúvidas
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Perguntas Frequentes
          </h3>
        </div>

        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="text-base font-bold text-[#C9A227]">{f.q}</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

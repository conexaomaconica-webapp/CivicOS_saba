import React from 'react';

export function LandingFaq() {
  const faqs = [
    {
      q: 'O Conexão Maçônica é exclusivo para maçons?',
      a: 'O ecossistema foi pensado para conectar a comunidade maçônica, familiares, amigos e simpatizantes que valorizam relacionamentos e negócios baseados em princípios de confiança.',
    },
    {
      q: 'Quem pode cadastrar uma empresa?',
      a: 'Empresários, profissionais liberais, prestadores de serviços, médicos, advogados e estabelecimentos comerciais que desejam divulgar seus produtos para a comunidade.',
    },
    {
      q: 'A empresa precisa pertencer a um maçom?',
      a: 'Não obrigatoriamente. Qualquer empresa legalmente constituída ou profissional habilitado que concorde com as diretrizes de ética e transparência do ecossistema pode solicitar seu cadastro.',
    },
    {
      q: 'Quais a diferença entre os planos Bronze, Prata, Ouro e Fundador?',
      a: 'O plano Bronze oferece a presença básica. O Prata inclui galeria de fotos. O Ouro adiciona eventos, novidades/posts e destaque comercial máximo. O Ouro Fundador traz todas as vantagens do Ouro acrescido do Selo de Fundador.',
    },
    {
      q: 'Como funciona a moderação das empresas?',
      a: 'Todas as empresas e avaliações enviadas passam por auditoria da equipe administrativa antes da publicação no Guia, garantindo a integridade do diretório.',
    },
    {
      q: 'Quando os dados da minha empresa estarão publicados?',
      a: 'Na fase de pré-lançamento, seu cadastro fica reservado e aprovado. A liberação completa do Guia público ocorre na conclusão do cronograma de lançamento 2026.',
    },
  ];

  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-xs font-bold text-amber-400 tracking-widest uppercase">
            Esclareça suas Dúvidas
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Perguntas Frequentes
          </h3>
        </div>

        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="text-base font-bold text-amber-300">p. {f.q}</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import Link from 'next/link';
import { FileText, CheckSquare, Sparkles, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    step: '1',
    icon: FileText,
    title: 'Preencha o cadastro da empresa',
    description: 'Informe os dados do seu negócio, categoria de atuação, cidade e canais de atendimento direto.',
  },
  {
    step: '2',
    icon: CheckSquare,
    title: 'Escolha seu plano e assine digitalmente',
    description: 'Selecione o plano ideal (Esquadro, Compasso ou Acácia), pague no Pix ou cartão e assine o contrato formal.',
  },
  {
    step: '3',
    icon: Sparkles,
    title: 'Perfil publicado e ativo no ecossistema',
    description: 'Após rápida validação cadastral, sua empresa ganha visibilidade no guia e você acompanha suas métricas no painel.',
  },
];

export function LandingHowItWorksSection() {
  return (
    <section id="como-participar" className="scroll-mt-24 bg-[#fbf7ee] py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6d12]">
            Como participar
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#2a0a10] sm:text-4xl">
            Uma jornada simples para fazer parte da Conexão
          </h2>
          <p className="mt-3 text-base leading-relaxed text-stone-600 sm:text-lg">
            Apresentamos seu negócio de forma organizada para a comunidade maçônica em três etapas transparentes.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-7 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5d1523] text-sm font-extrabold text-white">
                      {item.step}
                    </span>
                    <Icon className="h-5 w-5 text-[#8a6d12]" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-[#2a0a10]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#C9A227]/40 bg-white p-6 shadow-xs sm:flex-row">
          <div>
            <h4 className="text-base font-bold text-[#2a0a10]">Pronto para posicionar sua empresa?</h4>
            <p className="text-xs text-stone-600">Cadastro rápido, seguro e sem burocracia.</p>
          </div>
          <Link
            href="/anunciar/passo-1"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5d1523] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#5d1523]/20 transition hover:bg-[#4B161B]"
          >
            <span>Iniciar cadastro da minha empresa</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

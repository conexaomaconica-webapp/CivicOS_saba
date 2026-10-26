import React from 'react';
import { Megaphone, Users, Share2, MessageSquare, Briefcase, BookOpen } from 'lucide-react';

const DIFFERENTIALS = [
  {
    icon: Megaphone,
    title: 'Exposição em mídia',
    description: 'Visibilidade para empresas e profissionais nos canais de comunicação e divulgação institucional da iniciativa.',
    status: 'Iniciativa do ecossistema',
  },
  {
    icon: Users,
    title: 'Networking e relacionamento',
    description: 'Aproximação genuína entre irmãos, cunhadas, familiares e profissionais que valorizam relações baseadas em confiança.',
    status: 'Fomento contínuo',
  },
  {
    icon: Share2,
    title: 'Divulgação nas redes sociais',
    description: 'Apresentação de empresas participantes, novidades e destaques nos canais digitais oficiais da Conexão Maçônica.',
    status: 'Iniciativa do ecossistema',
  },
  {
    icon: MessageSquare,
    title: 'Listas de transmissão autorizadas',
    description: 'Comunicação direta e respeitosa com a comunidade participante, mediante autorização prévia de recebimento.',
    status: 'Iniciativa prevista',
  },
  {
    icon: Briefcase,
    title: 'Encontros de negócios',
    description: 'Oportunidades de integração presencial, apresentação de portfólios, parcerias estratégicas e novas contratações.',
    status: 'Iniciativa prevista',
  },
  {
    icon: BookOpen,
    title: 'Palestras e conhecimento',
    description: 'Encontros e conteúdos para compartilhar experiências empresariais, boas práticas de gestão e liderança.',
    status: 'Iniciativa em expansão',
  },
];

export function LandingDifferentialsSection() {
  return (
    <section id="diferenciais" className="scroll-mt-24 bg-[#fbf7ee] py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6d12]">
            O diferencial da Conexão Maçônica
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#2a0a10] sm:text-4xl">
            Como fortalecemos essas conexões
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
            Muito além de apresentar empresas em um catálogo. Promovemos visibilidade, incentivamos relacionamentos
            e criamos oportunidades para que os negócios dos irmãos e familiares sejam conhecidos, valorizados e fortalecidos.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIALS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs transition hover:border-[#C9A227]/60 hover:shadow-md"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5d1523]/10 text-[#5d1523] transition group-hover:bg-[#5d1523] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#2a0a10]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
                </div>
                <div className="mt-6 border-t border-stone-100 pt-3">
                  <span className="inline-flex items-center text-[11px] font-semibold text-stone-500">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#C9A227]" />
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-[#C9A227]/50 bg-white/70 p-5 text-center text-xs leading-relaxed text-stone-600 sm:text-left">
          <p>
            <strong className="text-[#5d1523]">Compromisso de Transparência:</strong> Os diferenciais acima integram as
            ações comunitárias de fomento do ecossistema Conexão Maçônica. Iniciativas ainda não operacionalizadas estão em
            estruturação progressiva e não representam promessa de entrega contratual individual ou garantia de faturamento.
          </p>
        </div>
      </div>
    </section>
  );
}

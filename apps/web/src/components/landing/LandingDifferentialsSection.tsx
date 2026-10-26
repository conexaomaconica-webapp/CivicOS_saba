import React from 'react';
import {
  Megaphone,
  Users,
  Share2,
  MessageSquare,
  Briefcase,
  BookOpen,
  CalendarDays,
} from 'lucide-react';

const DIFFERENTIALS = [
  {
    icon: Megaphone,
    title: 'Exposição em mídia',
    description:
      'Mais visibilidade para empresas e profissionais por meio de ações de divulgação e comunicação institucional.',
    pilar: 'VISIBILIDADE',
  },
  {
    icon: Users,
    title: 'Networking e relacionamento',
    description:
      'Conexões entre irmãos e familiares que fortalecem relacionamentos e abrem caminhos para novas oportunidades.',
    pilar: 'CONEXÕES',
  },
  {
    icon: Share2,
    title: 'Divulgação nas redes sociais e tráfego pago',
    description:
      'Ampliamos a visibilidade de empresas, produtos, serviços e novidades por meio dos nossos canais digitais, com publicações e campanhas de impulsionamento (tráfego pago) para alcançar novos públicos.',
    pilar: 'DIVULGAÇÃO',
  },
  {
    icon: MessageSquare,
    title: 'Comunicação direcionada',
    description:
      'Novidades, oportunidades e informações relevantes compartilhadas com participantes que autorizarem o recebimento.',
    pilar: 'COMUNICAÇÃO',
  },
  {
    icon: Briefcase,
    title: 'Encontros de negócios',
    description:
      'Momentos para apresentar empresas, trocar experiências, criar parcerias e ampliar relacionamentos profissionais.',
    pilar: 'OPORTUNIDADES',
  },
  {
    icon: BookOpen,
    title: 'Palestras e conhecimento',
    description:
      'Troca de experiências e conhecimentos sobre negócios, empreendedorismo, gestão e desenvolvimento profissional.',
    pilar: 'CONHECIMENTO',
  },
  {
    icon: CalendarDays,
    title: 'Divulgação de eventos maçônicos',
    description:
      'Valorizamos e divulgamos eventos promovidos por Lojas Maçônicas, incentivando a participação, a integração entre irmãos e o fortalecimento dos laços fraternos.',
    pilar: 'INTEGRAÇÃO',
  },
];

export function LandingDifferentialsSection() {
  return (
    <section id="diferenciais" className="scroll-mt-24 bg-[#fbf7ee] py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6d12]">
            NOSSO DIFERENCIAL
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#2a0a10] sm:text-4xl">
            Conexões que vão além do digital.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
            A Conexão Maçônica promove visibilidade, fortalece relacionamentos e incentiva oportunidades por meio de
            divulgação, networking, encontros, conhecimento e valorização das iniciativas maçônicas.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIALS.map((item, index) => {
            const Icon = item.icon;
            const isLastOdd = index === DIFFERENTIALS.length - 1;
            return (
              <div
                key={item.title}
                className={`group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs transition hover:border-[#C9A227]/60 hover:shadow-md ${
                  isLastOdd ? 'sm:col-span-2 lg:col-span-3 lg:flex-row lg:items-center lg:gap-6' : ''
                }`}
              >
                <div className={isLastOdd ? 'lg:flex lg:items-center lg:gap-5' : ''}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#5d1523]/10 text-[#5d1523] transition group-hover:bg-[#5d1523] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className={isLastOdd ? 'mt-4 lg:mt-0' : 'mt-4'}>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-[#ebd9c8] bg-[#faf6f0] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.16em] text-[#8a6d12]">
                        {item.pilar}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-[#2a0a10]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Observação discreta e transparente */}
        <div className="mt-10 rounded-2xl border border-dashed border-[#C9A227]/50 bg-white/70 p-5 text-center text-xs leading-relaxed text-stone-600 sm:text-left">
          <p>
            <strong className="text-[#5d1523]">Compromisso Institucional:</strong> As ações de divulgação, comunicação e
            encontros fazem parte das iniciativas institucionais da Conexão Maçônica. O impulsionamento em redes sociais é
            realizado em campanhas institucionais e de divulgação da plataforma, conforme planejamento e disponibilidade,
            não representando verba de anúncios individual garantida para os planos comerciais.
          </p>
        </div>

        {/* Transição para o Mural de Conexões */}
        <div className="mt-14 border-t border-stone-200/80 pt-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8a6d12]">
            DA CONEXÃO AO ENCONTRO
          </p>
          <p className="mt-2 text-xl font-bold text-[#2a0a10] sm:text-2xl">
            Do encontro a novas oportunidades.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            Conheça abaixo registros reais de irmãos e familiares prestigiando os negócios da nossa rede, mediante autorização.
          </p>
        </div>
      </div>
    </section>
  );
}

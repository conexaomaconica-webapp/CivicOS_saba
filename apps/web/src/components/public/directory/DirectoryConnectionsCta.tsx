import React from 'react';
import { BadgeCheck, Building2, Camera, Handshake, MessageSquareText } from 'lucide-react';
import { ConnectionStartFlow } from './ConnectionStartFlow';

const STEPS = [
  { Icon: Building2, title: 'Escolha a empresa', text: 'Busque pelo nome e selecione a empresa que você visitou, onde comprou, contratou um serviço ou realizou uma parceria.' },
  { Icon: Camera, title: 'Conte sua experiência', text: 'Adicione um comentário e, se quiser, uma foto. A foto e o comentário são opcionais.' },
  { Icon: BadgeCheck, title: 'Confirmação e publicação', text: 'A empresa confirma a conexão e, quando houver foto, ela passa por análise antes da publicação.' },
];

/** Convite de destaque, no topo da página principal, para registrar visitas e negócios com foto. */
export function DirectoryConnectionsCta() {
  return (
    <section className="dh-container py-4" aria-labelledby="cta-mural-conexoes">
      <div className="relative overflow-hidden rounded-3xl border border-[#C9A227]/40 bg-gradient-to-br from-[#3B0B14] via-[#4B161B] to-[#2b060d] p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#C9A227]/20 blur-3xl" aria-hidden="true" />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A227]/50 bg-[#C9A227]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F3CF68]">
              <Handshake className="h-3.5 w-3.5" /> Novo · Mural de Conexões
            </span>
            <h2 id="cta-mural-conexoes" className="font-serif text-2xl font-bold leading-tight sm:text-3xl">
              Visitou, comprou ou contratou uma empresa da Conexão? Compartilhe sua experiência.
            </h2>
            <p className="max-w-xl text-sm text-white/80">
              Conte como foi, marque a empresa e, se quiser, compartilhe uma foto. Seu registro valoriza quem atende bem, inspira novas conexões e fortalece a Conexão Maçônica.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <ConnectionStartFlow
                loginRedirect="/guia#mural-de-conexoes"
                className="inline-flex items-center gap-2 rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-bold text-[#2b060d] shadow-md transition hover:bg-[#b89320]"
              >
                <Camera className="h-4 w-4" />
                Compartilhar minha experiência
              </ConnectionStartFlow>
              <a href="#mural-de-conexoes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F3CF68] hover:text-white">
                <MessageSquareText className="h-4 w-4" />
                Ver o Mural
              </a>
            </div>
            <p className="text-[11px] text-white/60">É necessário estar logado (cadastro gratuito). Seu primeiro nome só será exibido após a confirmação da empresa.</p>
          </div>

          <ol className="grid gap-3">
            {STEPS.map(({ Icon, title, text }, index) => (
              <li key={title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C9A227]/20 text-[#F3CF68]">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <strong className="block text-sm">{index + 1}. {title}</strong>
                  <span className="text-xs text-white/70">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

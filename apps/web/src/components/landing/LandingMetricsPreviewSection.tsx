import React from 'react';
import {
  Eye,
  MessageCircle,
  MapPin,
  Globe,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const WEEKLY_DATA = [
  { week: 'Sem. 1', value: 110, percentage: '33%' },
  { week: 'Sem. 2', value: 165, percentage: '50%' },
  { week: 'Sem. 3', value: 220, percentage: '66%' },
  { week: 'Sem. 4', value: 275, percentage: '83%' },
  { week: 'Sem. 5', value: 310, percentage: '93%' },
  { week: 'Sem. 6', value: 330, percentage: '100%' },
];

export function LandingMetricsPreviewSection() {
  return (
    <section id="resultados" className="scroll-mt-24 bg-[#2a0a10] py-16 text-white sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.15fr]">
          {/* LADO ESQUERDO: Texto de Posicionamento e Diferencial */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#C9A227]">
              <BarChart3 className="h-4 w-4 text-[#C9A227]" />
              Transparência e Desempenho
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Sua empresa em evidência. Resultados que você acompanha.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
              Mais do que divulgar seu negócio, a Conexão Maçônica permite acompanhar visualizações do perfil,
              acessos aos canais de contato e outras interações registradas na plataforma. Transparência para entender
              como sua empresa está sendo encontrada.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#C9A227]" />
                <div>
                  <h3 className="text-sm font-bold text-white">Visualizações do perfil e alcance</h3>
                  <p className="text-xs text-white/70">
                    Acompanhe quantas vezes seu perfil foi acessado na sua cidade e em buscas por categorias.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#C9A227]" />
                <div>
                  <h3 className="text-sm font-bold text-white">Cliques no WhatsApp e canais diretos</h3>
                  <p className="text-xs text-white/70">
                    Métricas reais de interesse para iniciar conversas, solicitar orçamentos e agendamentos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#C9A227]" />
                <div>
                  <h3 className="text-sm font-bold text-white">Solicitações de rotas GPS e mapa</h3>
                  <p className="text-xs text-white/70">
                    Identifique o interesse real de visitas presenciais ao seu estabelecimento comercial.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#C9A227]" />
                <div>
                  <h3 className="text-sm font-bold text-white">Incluso em todos os planos comerciais</h3>
                  <p className="text-xs text-white/70">
                    Do Plano Esquadro ao Acácia, a transparência nos números é um compromisso da plataforma.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs text-[#C9A227] ring-1 ring-[#C9A227]/30">
              <Lock className="h-3.5 w-3.5" />
              <span>Acesso restrito ao titular via autenticação segura</span>
            </div>
          </div>

          {/* LADO DIREITO: Mockup Ilustrativo do Painel do Anunciante */}
          <div className="relative rounded-3xl border border-[#C9A227]/40 bg-white p-6 text-stone-900 shadow-2xl sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a6d12]">
                  Visão ilustrativa do painel de desempenho
                </span>
                <h3 className="text-lg font-bold text-[#2a0a10]">Exemplo de Acompanhamento</h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> +24% este mês
              </span>
            </div>

            {/* CARDS DE KPIS */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
                <div className="flex items-center gap-1 text-[#5d1523]">
                  <Eye className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase text-stone-500">Visualizações</span>
                </div>
                <p className="mt-2 text-xl font-extrabold text-[#2a0a10]">1.248</p>
                <p className="text-[10px] text-stone-500">Perfil visto</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <div className="flex items-center gap-1 text-emerald-800">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <span className="text-[10px] font-bold uppercase text-emerald-800">WhatsApp</span>
                </div>
                <p className="mt-2 text-xl font-extrabold text-emerald-900">86</p>
                <p className="text-[10px] text-emerald-700">Contatos diretos</p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
                <div className="flex items-center gap-1 text-[#8a6d12]">
                  <MapPin className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase text-stone-500">Rotas GPS</span>
                </div>
                <p className="mt-2 text-xl font-extrabold text-[#2a0a10]">42</p>
                <p className="text-[10px] text-stone-500">Abriram mapa</p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
                <div className="flex items-center gap-1 text-stone-700">
                  <Globe className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase text-stone-500">Site/Redes</span>
                </div>
                <p className="mt-2 text-xl font-extrabold text-[#2a0a10]">65</p>
                <p className="text-[10px] text-stone-500">Links externos</p>
              </div>
            </div>

            {/* GRÁFICO CONCEITUAL DE EVOLUÇÃO SEMANAL */}
            <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                <span>Evolução de visualizações por período</span>
                <span className="font-mono text-[#8a6d12]">Sem. 1 a Sem. 6</span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-2 pt-4">
                {WEEKLY_DATA.map((item) => (
                  <div key={item.week} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-stone-600">{item.value}</span>
                    <div className="relative flex h-28 w-full max-w-[36px] items-end justify-center rounded-lg bg-stone-200/80 p-0.5">
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-[#5d1523] to-[#C9A227] transition-all"
                        style={{ height: item.percentage }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-stone-500">{item.week}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* LEGENDA OBRIGATÓRIA DE TRANSPARÊNCIA */}
            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-100/80 p-3 text-center text-[11px] leading-relaxed text-stone-600 sm:text-left">
              <p>
                <strong>Aviso:</strong> Painel demonstrativo com dados ilustrativos. Os resultados variam conforme a busca,
                localização e as interações registradas na plataforma. Métricas de cliques e visualizações indicam interesse
                e não representam vendas ou faturamento garantido.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ShieldCheck, Scale, AlertCircle, ArrowLeft, Building2, HelpCircle } from 'lucide-react';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { StructuredData } from '@/components/seo/StructuredData';

export const metadata: Metadata = {
  title: 'Termos de Uso da Plataforma | Conexão Maçônica',
  description: 'Termos de Uso e Condições Gerais de Prestação de Serviços da plataforma Conexão Maçônica.',
  openGraph: {
    title: 'Termos de Uso da Plataforma | Conexão Maçônica',
    description: 'Termos de Uso e Condições Gerais de Prestação de Serviços da plataforma Conexão Maçônica.',
  },
};

export default function TermosPage() {
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Termos de Uso da Plataforma',
    description: 'Termos de Uso e Condições Gerais da plataforma Conexão Maçônica.',
    publisher: {
      '@type': 'Organization',
      name: 'Conexão Maçônica',
    },
  };

  return (
    <div className="min-h-screen bg-[#2b060d] text-stone-200 flex flex-col justify-between selection:bg-[#C9A227] selection:text-[#2b060d]">
      <StructuredData schema={jsonLdSchema} />
      <DirectoryHeader />

      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <Link
              href="/guia"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#C9A227] hover:text-[#e0b838] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Guia Comercial</span>
            </Link>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 bg-stone-900/90 px-3 py-1 rounded-full border border-stone-800">
              Contrato de Adesão · Termos Gerais
            </span>
          </div>

          {/* Document Header Card */}
          <div className="bg-[#3b0b14]/90 border border-[#C9A227]/30 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 text-[#C9A227] mb-3">
              <Scale className="w-7 h-7 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest">Condições Gerais de Uso</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Termos de Uso da Plataforma
            </h1>

            <p className="mt-3 text-sm text-stone-300 max-w-2xl leading-relaxed">
              O presente instrumento regula as condições gerais de acesso, uso, contratação e publicação de conteúdos na plataforma Conexão Maçônica. Ao cadastrar-se ou utilizar qualquer um de nossos serviços, você declara a leitura integral, compreensão e aceite irrestrito destes Termos de Uso.
            </p>

            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs text-stone-400">
              <div><strong>Versão:</strong> 2.1 — Atualizada em Setembro / 2026</div>
              <div><strong>Alcance:</strong> Todos os usuários cadastrados e visitantes do Guia</div>
              <div><strong>Suporte Jurídico:</strong> <a href="mailto:juridico@conexaomaconica.com.br" className="text-[#C9A227] underline">juridico@conexaomaconica.com.br</a></div>
            </div>
          </div>

          {/* Legal Body Sections */}
          <div className="bg-[#24050a]/90 border border-stone-800 rounded-3xl p-8 md:p-12 shadow-xl space-y-10 text-sm leading-relaxed">
            
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <FileText className="w-5 h-5 shrink-0" />
                <span>1. Objeto e Natureza da Plataforma</span>
              </h2>
              <p className="text-stone-300">
                O Conexão Maçônica é uma plataforma digital privada de tecnologia destinada ao fomento de networking profissional, divulgação de empresas, benefícios comerciais e interação fraterna de confiança. A plataforma atua como ponte aproximadora e veiculadora de anúncios comerciais e eventos da comunidade.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>2. Elegibilidade, Veracidade e Conduta Ética</span>
              </h2>
              <p className="text-stone-300">
                Para utilizar os recursos da plataforma, o usuário declara e garante que:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-400">
                <li>Possui plena capacidade civil sob as leis brasileiras para firmar obrigações contratuais;</li>
                <li>Todas as informações fornecidas no momento do cadastro (dados pessoais, empresariais e de vínculo institucional) são verídicas, exatas, completas e atualizadas;</li>
                <li>Manterá conduta ética, respeitosa e alinhada aos valores fraternos, sendo estritamente vedada a veiculação de conteúdos ilícitos, ofensivos, enganosos ou de concorrência desleal.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <Building2 className="w-5 h-5 shrink-0" />
                <span>3. Planos Comerciais e Reconhecimentos Institucionais</span>
              </h2>
              <p className="text-stone-300">
                A contratação de anúncios no Guia de Empresas observa as regras comerciais dos planos disponíveis (ex: Esquadro, Compasso, Acácia):
              </p>
              
              <div className="bg-[#1f0509] p-5 rounded-2xl border border-stone-800 space-y-3 mt-2">
                <div className="flex items-center gap-2 text-[#C9A227] font-bold text-xs uppercase">
                  <AlertCircle className="w-4 h-4" />
                  <span>Regra de Isolamento dos Selos de Honra (Cláusula Canônica)</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Os selos de reconhecimento histórico/institucional — nomeadamente <strong>Pedra Fundamental</strong>, <strong>Empresa Fundadora</strong> e <strong>Coluna de Honra</strong> — possuem caráter exclusivamente honorífico e histórico, concedidos segundo critérios institucionais próprios. <strong>Estes selos jamais se confundem, comercializam ou funcionam como benefício, cota ou entitlement de upgrades dos planos comerciais.</strong>
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-1.5 text-stone-400 pt-2">
                <li><strong className="text-stone-200">Cobrança e Faturamento:</strong> Os valores e periodicidades dos planos comerciais estão detalhados na tela de checkout e no contrato de adesão específico.</li>
                <li><strong className="text-stone-200">Renovação e Cancelamento:</strong> As assinaturas recorrentes podem ser geridas ou canceladas diretamente no painel da empresa, respeitando-se os ciclos já faturados.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <Scale className="w-5 h-5 shrink-0" />
                <span>4. Limitação de Responsabilidade</span>
              </h2>
              <p className="text-stone-300">
                O Conexão Maçônica atua exclusivamente como provedor de tecnologia e veiculador dos anúncios cadastrados pelos seus respectivos responsáveis:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-400">
                <li>Não intermediamos nem garantimos as negociações comerciais, contratações de serviços ou compra de produtos realizadas diretamente entre os usuários e as empresas anunciantes;</li>
                <li>Cada anunciante é único e exclusivo responsável pela entrega, qualidade, prazos e garantias legais dos produtos e serviços oferecidos;</li>
                <li>Não nos responsabilizamos por indisponibilidades temporárias da plataforma decorrentes de manutenções técnicas ou falhas de infraestrutura global da internet.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <FileText className="w-5 h-5 shrink-0" />
                <span>5. Propriedade Intelectual</span>
              </h2>
              <p className="text-stone-300">
                Todo o código-fonte, arquitetura de software, design, marca Conexão Maçônica, elementos gráficos e banco de dados são de propriedade intelectual exclusiva da mantenedora da plataforma, protegidos pela Lei nº 9.609/1998 (Lei do Software) e Lei nº 9.610/1998 (Direitos Autorais). O anunciante concede licença não exclusiva para exibição de sua logomarca e material publicitário durante a vigência da publicação.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <HelpCircle className="w-5 h-5 shrink-0" />
                <span>6. Modificações dos Termos e Foro Elegível</span>
              </h2>
              <p className="text-stone-300">
                Estes Termos de Uso poderão ser revisados e atualizados periodicamente. Alterações significativas serão informadas através de aviso na plataforma ou por e-mail cadastrado. Fica eleito o Foro da Comarca da Sede do Controlador para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia expressa a qualquer outro.
              </p>
            </section>

            <footer className="pt-6 border-t border-stone-800 text-xs text-stone-500 italic text-center">
              Para esclarecimento de dúvidas jurídicas ou suporte comercial aos Termos de Uso, entre em contato através do e-mail: <a href="mailto:contato@conexaomaconica.com.br" className="text-[#C9A227] underline">contato@conexaomaconica.com.br</a>.
            </footer>
          </div>
        </div>
      </main>

      <DirectoryFooter />
    </div>
  );
}

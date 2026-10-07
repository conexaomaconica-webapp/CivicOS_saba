import React from 'react';
import type { Metadata } from 'next';
import { appUrl } from '@/lib/seo/app-url';
import Link from 'next/link';
import { ShieldCheck, Lock, Eye, FileText, UserCheck, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { StructuredData } from '@/components/seo/StructuredData';

export const metadata: Metadata = {
  title: { absolute: 'Política de Privacidade (LGPD) | Conexão Maçônica' },
  alternates: { canonical: appUrl('/privacidade') },
  description: 'Diretrizes oficiais de privacidade, tratamento de dados pessoais (LGPD - Lei 13.709/2018) e governança da informação da plataforma Conexão Maçônica.',
  openGraph: {
    title: 'Política de Privacidade (LGPD) | Conexão Maçônica',
    description: 'Diretrizes oficiais de privacidade, tratamento de dados pessoais (LGPD - Lei 13.709/2018) e governança da informação da plataforma Conexão Maçônica.',
  },
};

export default function PrivacidadePage() {
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Política de Privacidade e Proteção de Dados (LGPD)',
    description: 'Diretrizes de privacidade e LGPD da plataforma Conexão Maçônica.',
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
              Conformidade LGPD · Lei nº 13.709/2018
            </span>
          </div>

          {/* Document Header Card */}
          <div className="bg-[#3b0b14]/90 border border-[#C9A227]/30 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 text-[#C9A227] mb-3">
              <ShieldCheck className="w-7 h-7 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest">Governança & Segurança da Informação</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Política de Privacidade e Proteção de Dados
            </h1>

            <p className="mt-3 text-sm text-stone-300 max-w-2xl leading-relaxed">
              O Conexão Maçônica reafirma seu compromisso inegociável com a transparência, privacidade e proteção dos dados pessoais de seus membros, anunciantes e visitantes, aplicando rigorosamente as diretrizes da Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018) e do Marco Civil da Internet (Lei nº 12.965/2014).
            </p>

            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs text-stone-400">
              <div><strong>Controlador:</strong> Conexão Maçônica Tecnologia Ltda.</div>
              <div><strong>Vigência:</strong> Setembro / 2026 — Versão 2.1</div>
              <div><strong>Canal DPO:</strong> <a href="mailto:privacidade@conexaomaconica.com.br" className="text-[#C9A227] underline">privacidade@conexaomaconica.com.br</a></div>
            </div>
          </div>

          {/* Legal Body Sections */}
          <div className="bg-[#24050a]/90 border border-stone-800 rounded-3xl p-8 md:p-12 shadow-xl space-y-10 text-sm leading-relaxed">
            
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <FileText className="w-5 h-5 shrink-0" />
                <span>1. Glossário e Princípios Fundamentais</span>
              </h2>
              <p className="text-stone-300">
                Para fins desta Política, consideram-se:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-400">
                <li><strong className="text-stone-200">Titular:</strong> Pessoa natural a quem se referem os dados pessoais que são objeto de tratamento.</li>
                <li><strong className="text-stone-200">Dado Pessoal:</strong> Informação relacionada a pessoa natural identificada ou identificável (ex: nome, CPF, e-mail, telefone).</li>
                <li><strong className="text-stone-200">Dado Pessoal Sensível:</strong> Dado sobre origem racial/étnica, convicção religiosa, filiação a organização de caráter religioso, filosófico ou político, dado referente à saúde ou à vida sexual. A menção ou vínculo institucional fraterno é tratado com elevado padrão de confidencialidade e segurança estrita.</li>
                <li><strong className="text-stone-200">Tratamento:</strong> Toda operação realizada com dados pessoais, como coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, processamento, arquivamento, eliminação ou modificação.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <Lock className="w-5 h-5 shrink-0" />
                <span>2. Dados Pessoais Coletados e Finalidades</span>
              </h2>
              <p className="text-stone-300">
                A coleta de dados ocorre de forma transparente e estritamente necessária para o cumprimento das finalidades descritas abaixo:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-2">
                  <h3 className="font-bold text-white text-xs uppercase text-[#C9A227]">A. Cadastro e Perfil do Usuário</h3>
                  <p className="text-xs text-stone-400">
                    Nome completo, e-mail, telefone/WhatsApp, senha criptografada e vínculo de Loja Maçônica. 
                    <br/><span className="text-stone-500 italic">Finalidade: Autenticação, controle de acesso seguro e verificação de integridade da rede.</span>
                  </p>
                </div>

                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-2">
                  <h3 className="font-bold text-white text-xs uppercase text-[#C9A227]">B. Anúncios Comerciais no Guia</h3>
                  <p className="text-xs text-stone-400">
                    Razão social, nome fantasia, CNPJ, endereço comercial, fotos do estabelecimento, logomarca e contatos comerciais.
                    <br/><span className="text-stone-500 italic">Finalidade: Publicação no Guia de Empresas e fomento de networking profissional.</span>
                  </p>
                </div>

                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-2">
                  <h3 className="font-bold text-white text-xs uppercase text-[#C9A227]">C. Processamento Financeiro</h3>
                  <p className="text-xs text-stone-400">
                    Dados bancários, CPF/CNPJ do responsável financeiro, histórico de faturamento de planos.
                    <br/><span className="text-stone-500 italic">Finalidade: Emissão de cobrança e cumprimento de obrigações tributárias e fiscais.</span>
                  </p>
                </div>

                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-2">
                  <h3 className="font-bold text-white text-xs uppercase text-[#C9A227]">D. Dados de Conexão e Navegação</h3>
                  <p className="text-xs text-stone-400">
                    Endereço IP, data/hora dos acessos, tipo de navegador e preferências do usuário.
                    <br/><span className="text-stone-500 italic">Finalidade: Cumprimento da obrigação legal de guarda de logs (Art. 15 da Lei nº 12.965/2014 - Marco Civil).</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <UserCheck className="w-5 h-5 shrink-0" />
                <span>3. Hipóteses Legais de Tratamento (Art. 7º da LGPD)</span>
              </h2>
              <p className="text-stone-300">
                Todo tratamento de dados pessoais realizado pela plataforma fundamenta-se estritamente em uma das seguintes hipóteses autorizadoras da LGPD:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-400">
                <li><strong>Execução de Contrato ou Procedimentos Preliminares (Art. 7º, V):</strong> Para prestação dos serviços do guia comercial, manutenção de assinaturas e publicação de anúncios.</li>
                <li><strong>Cumprimento de Obrigação Legal ou Regulatória (Art. 7º, II):</strong> Para manutenção dos registros de acesso por 6 (seis) meses e emissão de notas fiscais.</li>
                <li><strong>Legítimo Interesse (Art. 7º, IX):</strong> Para aprimoramento da segurança da plataforma, prevenção contra fraudes e garantia da qualidade dos serviços oferecidos à comunidade.</li>
                <li><strong>Consentimento (Art. 7º, I):</strong> Para envio de comunicações institucionais promocionais e pesquisas de satisfação opcionais, revogável a qualquer momento pelo titular.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <Eye className="w-5 h-5 shrink-0" />
                <span>4. Compartilhamento Transparente de Dados</span>
              </h2>
              <p className="text-stone-300">
                O Conexão Maçônica <strong>NUNCA comercializa, aluga ou vende dados pessoais</strong> de seus usuários a terceiros. O compartilhamento ocorre exclusivamente nas seguintes hipóteses:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-400">
                <li><strong className="text-stone-200">Perfil Público no Guia Commercial:</strong> Dados comerciais cadastrados voluntariamente pelo usuário (nome da empresa, endereço, telefone, e-mail comercial) são exibidos publicamente na plataforma para atingir o objetivo contratado de visibilidade e novos negócios.</li>
                <li><strong className="text-stone-200">Operadores de Infraestrutura e Pagamentos:</strong> Provedores essenciais de tecnologia, tais como gateways de pagamento auditados (Asaas), serviços de hospedagem e banco de dados em nuvem com RLS habilitado (Supabase), sujeitos a rigorosos acordos de confidencialidade e segurança.</li>
                <li><strong className="text-stone-200">Requisição Judicial ou Autoridade Competente:</strong> Por determinação judicial expressa ou requisição formal de autoridade pública munida de competência legal.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>5. Segurança da Informação e Armazenamento</span>
              </h2>
              <p className="text-stone-300">
                Adotamos medidas técnicas, administrativas e organizacionais adequadas para proteger os dados pessoais contra acessos não autorizados, destruição, perda, alteração ou qualquer forma de tratamento inadequado:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-400">
                <li>Comunicação 100% criptografada via protocolo HTTPS/TLS de última geração;</li>
                <li>Isolamento lógico de dados de múltiplos inquilinos (Multi-tenant Architecture) via Row Level Security (RLS);</li>
                <li>Políticas estritas de controle de acesso baseadas no princípio do menor privilégio;</li>
                <li>Monitoramento e auditoria contínua de logs de segurança.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>6. Direitos do Titular dos Dados (Art. 18 da LGPD)</span>
              </h2>
              <p className="text-stone-300">
                O titular dos dados pessoais tem o direito de obter do Conexão Maçônica, a qualquer momento e mediante requisição gratuita:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                <div className="bg-[#1f0509] p-3 rounded-lg border border-stone-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0" />
                  <span>Confirmação da existência de tratamento</span>
                </div>
                <div className="bg-[#1f0509] p-3 rounded-lg border border-stone-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0" />
                  <span>Acesso facilitado aos seus dados armazenados</span>
                </div>
                <div className="bg-[#1f0509] p-3 rounded-lg border border-stone-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0" />
                  <span>Correção de dados incompletos ou inexatos</span>
                </div>
                <div className="bg-[#1f0509] p-3 rounded-lg border border-stone-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0" />
                  <span>Anonimização, bloqueio ou eliminação</span>
                </div>
                <div className="bg-[#1f0509] p-3 rounded-lg border border-stone-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0" />
                  <span>Portabilidade dos dados em formato estruturado</span>
                </div>
                <div className="bg-[#1f0509] p-3 rounded-lg border border-stone-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0" />
                  <span>Revogação do consentimento concedido</span>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <Mail className="w-5 h-5 shrink-0" />
                <span>7. Canal do Encarregado de Dados (DPO) e Contato</span>
              </h2>
              <p className="text-stone-300">
                Para exercer qualquer um dos seus direitos de titular ou sanar dúvidas sobre este documento, entre em contato direto com o nosso Encarregado de Proteção de Dados (DPO):
              </p>
              <div className="bg-[#3b0b14] border border-[#C9A227]/40 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-white text-sm">Encarregado pelo Tratamento de Dados Pessoais (DPO)</h4>
                  <p className="text-xs text-stone-400 mt-0.5">Atendimento a Titulares de Dados & Comunicações com a ANPD</p>
                </div>
                <a
                  href="mailto:privacidade@conexaomaconica.com.br"
                  className="bg-[#C9A227] hover:bg-[#b89320] text-[#2b060d] font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Enviar E-mail ao DPO</span>
                </a>
              </div>
            </section>

            {/* Section 8 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2">
                <Eye className="w-5 h-5 shrink-0" />
                <span>8. Google Analytics (GA4), Cookies e Gestão de Consentimento</span>
              </h2>
              <p className="text-stone-300 leading-relaxed">
                Utilizamos a ferramenta <strong className="text-white">Google Analytics 4 (GA4)</strong>, disponibilizada pela Google LLC, para compreender o perfil de uso e aprimorar continuamente a experiência de navegação em nossa plataforma.
              </p>

              <div className="space-y-3 pt-1">
                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-1.5">
                  <h3 className="font-bold text-[#C9A227] text-xs uppercase">A. Dados Coletados pelo Google Analytics</h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    São coletadas informações estatísticas e pseudonimizadas, tais como: páginas visualizadas, tempo de navegação, origem do tráfego, tipo de navegador, sistema operacional, resolução de tela e interações com anúncios do Guia Comercial. Os endereços IP são obrigatoriamente anonimizados (<code className="text-amber-300 font-mono">anonymize_ip: true</code>) e o rastreamento individualizado cruzado (Google Signals) permanece desativado.
                  </p>
                </div>

                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-1.5">
                  <h3 className="font-bold text-[#C9A227] text-xs uppercase">B. Categorias de Cookies Utilizados</h3>
                  <ul className="list-disc pl-5 text-xs text-stone-400 space-y-1">
                    <li><strong className="text-stone-200">Cookies Necessários (Primários):</strong> Essenciais para a segurança, autenticação de sessão e navegação funcional (ex: cookies de sessão Supabase, preferências de localização aproximada).</li>
                    <li><strong className="text-stone-200">Cookies de Desempenho e Analytics (Terceiros):</strong> Definidos pelo Google Analytics (ex: <code className="text-amber-300 font-mono">_ga</code>, <code className="text-amber-300 font-mono">_ga_*</code>) para distinguir visitantes de forma anônima e compilar dados estatísticos.</li>
                  </ul>
                </div>

                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-1.5">
                  <h3 className="font-bold text-[#C9A227] text-xs uppercase">C. Finalidade do Tratamento</h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    A mensuração de audiência destina-se exclusivamente ao diagnóstico técnico de desempenho, prevenção a fraudes, otimização de velocidade de carregamento e apresentação de relatórios consolidados de alcance aos anunciantes.
                  </p>
                </div>

                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-1.5">
                  <h3 className="font-bold text-[#C9A227] text-xs uppercase">D. Mecanismo de Consentimento e Como Recusar</h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Em conformidade com as diretrizes de Consent Mode v2, a medição por cookies de analytics inicia-se por padrão bloqueada. O visitante pode autorizar ou recusar a coleta a qualquer momento através do banner de cookies na plataforma. Adicionalmente, é possível gerenciar ou desativar os cookies diretamente nas configurações do seu navegador ou instalando o{' '}
                    <a
                      href="https://tools.google.com/dlpage/gaoptout"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#C9A227] underline hover:text-amber-300"
                    >
                      Add-on de Opt-out do Google Analytics
                    </a>.
                  </p>
                </div>
              </div>
            </section>

            <footer className="pt-6 border-t border-stone-800 text-xs text-stone-500 italic text-center">
              Esta Política de Privacidade poderá ser atualizada periodicamente para refletir melhorias na plataforma ou alterações regulatórias. Notificaremos os usuários cadastrados sobre alterações relevantes.
            </footer>
          </div>
        </div>
      </main>

      <DirectoryFooter />
    </div>
  );
}

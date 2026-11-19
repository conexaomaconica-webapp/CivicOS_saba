import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Database, Globe, Mail, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { appUrl } from '@/lib/seo/app-url';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { StructuredData } from '@/components/seo/StructuredData';

const TITLE = 'Como excluir sua conta e seus dados | Conexão Maçônica';
const DESCRIPTION =
  'Passo a passo para excluir sua conta do Conexão Maçônica no aplicativo, no site ou por e-mail, e o que acontece com os seus dados.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: appUrl('/excluir-conta') },
  openGraph: { title: TITLE, description: DESCRIPTION },
};

const DPO_EMAIL = 'privacidade@conexaomaconica.com.br';
const MAIL_SUBJECT = encodeURIComponent('Exclusão de conta - Conexão Maçônica');
const MAIL_BODY = encodeURIComponent(
  'Olá! Solicito a exclusão da minha conta e dos meus dados pessoais no Conexão Maçônica.\n\nNome completo:\nE-mail cadastrado na conta:\n\nObrigado.',
);

const SECTION_TITLE = 'text-xl font-bold text-[#C9A227] flex items-center gap-2 border-b border-stone-800 pb-2';

export default function ExcluirContaPage() {
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Como excluir sua conta e seus dados',
    description: DESCRIPTION,
    url: appUrl('/excluir-conta'),
    isPartOf: { '@id': appUrl('/#website') },
    publisher: { '@type': 'Organization', name: 'Conexão Maçônica' },
  };

  return (
    <div className="min-h-screen bg-[#2b060d] text-stone-200 flex flex-col justify-between selection:bg-[#C9A227] selection:text-[#2b060d]">
      <StructuredData schema={jsonLdSchema} />
      <DirectoryHeader />

      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <Link href="/guia" className="inline-flex items-center gap-2 text-xs font-semibold text-[#C9A227] hover:text-[#e0b838] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Guia Comercial</span>
            </Link>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 bg-stone-900/90 px-3 py-1 rounded-full border border-stone-800">
              Seus dados · LGPD
            </span>
          </div>

          <div className="bg-[#3b0b14]/90 border border-[#C9A227]/30 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-3 text-[#C9A227] mb-3">
              <Trash2 className="w-7 h-7 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest">Exclusão de conta</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Como excluir sua conta e seus dados</h1>
            <p className="mt-3 text-sm text-stone-300 max-w-2xl leading-relaxed">
              Você pode excluir sua conta do Conexão Maçônica a qualquer momento, sem custo. Escolha abaixo o jeito mais
              conveniente: pelo aplicativo, pelo site ou por e-mail. Esta página vale para o aplicativo Conexão Maçônica
              (Android e iOS) e para o site.
            </p>
          </div>

          <div className="bg-[#24050a]/90 border border-stone-800 rounded-3xl p-8 md:p-12 shadow-xl space-y-10 text-sm leading-relaxed">
            {/* 1. Aplicativo */}
            <section className="space-y-3" id="aplicativo">
              <h2 className={SECTION_TITLE}>
                <Smartphone className="w-5 h-5 shrink-0" />
                <span>1. Pelo aplicativo (o jeito mais rápido)</span>
              </h2>
              <ol className="list-decimal pl-5 space-y-2 text-stone-300">
                <li>Abra o aplicativo <strong className="text-white">Conexão Maçônica</strong> e entre na sua conta.</li>
                <li>
                  Toque em <strong className="text-white">Mais</strong>, no menu de baixo. No quadro{' '}
                  <strong className="text-white">Minha Conta</strong>, toque em{' '}
                  <strong className="text-white">Excluir minha conta definitivamente</strong>.
                </li>
                <li>
                  Você também encontra a mesma opção dentro de <strong className="text-white">Minha Conta</strong>, na aba{' '}
                  <strong className="text-white">Meu perfil</strong>, em <strong className="text-white">Exclusão permanente da conta</strong>.
                </li>
                <li>
                  Confirme em <strong className="text-white">Sim, excluir conta</strong>.
                </li>
              </ol>
              <p className="text-stone-400">
                A exclusão pelo aplicativo é feita na hora: seus dados de cadastro e suas credenciais de acesso são removidos e
                não será mais possível entrar com o mesmo e-mail e senha. Se quiser voltar depois, será preciso criar uma nova conta.
              </p>
            </section>

            {/* 2. Site */}
            <section className="space-y-3" id="site">
              <h2 className={SECTION_TITLE}>
                <Globe className="w-5 h-5 shrink-0" />
                <span>2. Pelo site</span>
              </h2>
              <ol className="list-decimal pl-5 space-y-2 text-stone-300">
                <li>
                  Entre na sua conta em <Link href="/login" className="text-[#C9A227] underline">conexaomaconica.com.br/login</Link>.
                </li>
                <li>
                  Abra <Link href="/usuario/perfil" className="text-[#C9A227] underline">Meu perfil</Link>, na área de{' '}
                  <strong className="text-white">Privacidade</strong>.
                </li>
                <li>
                  Em <strong className="text-white">Excluir minha conta</strong>, digite <strong className="text-white">EXCLUIR</strong> e clique em{' '}
                  <strong className="text-white">Solicitar exclusão da conta</strong>.
                </li>
              </ol>
              <p className="text-stone-400">
                O pedido é registrado na hora: seus consentimentos são revogados, sua afiliação e dados sensíveis são removidos e,
                se você for anunciante, suas empresas saem do Guia. A remoção definitiva do cadastro é concluída pela nossa equipe
                no prazo descrito no item 3.
              </p>
            </section>

            {/* 3. E-mail */}
            <section className="space-y-3" id="email">
              <h2 className={SECTION_TITLE}>
                <Mail className="w-5 h-5 shrink-0" />
                <span>3. Por e-mail (sem precisar entrar na conta)</span>
              </h2>
              <p className="text-stone-300">
                Se você não consegue acessar o aplicativo ou o site, envie um e-mail para o nosso Encarregado de Proteção de Dados:
              </p>
              <div className="bg-[#3b0b14] border border-[#C9A227]/40 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-sm">{DPO_EMAIL}</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Assunto: &ldquo;Exclusão de conta&rdquo;</p>
                </div>
                <a
                  href={`mailto:${DPO_EMAIL}?subject=${MAIL_SUBJECT}&body=${MAIL_BODY}`}
                  className="bg-[#C9A227] hover:bg-[#b89320] text-[#2b060d] font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Pedir exclusão por e-mail</span>
                </a>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-300">
                <li>Escreva do <strong className="text-white">mesmo e-mail cadastrado</strong> na conta e informe seu nome completo.</li>
                <li>Podemos pedir uma confirmação de identidade antes de excluir, para que ninguém apague a conta de outra pessoa.</li>
                <li>
                  Respondemos e concluímos a exclusão em até <strong className="text-white">15 dias</strong> a partir da confirmação da sua identidade.
                </li>
                <li>Você nunca precisa enviar sua senha. Não a peça nem a informe a ninguém.</li>
              </ul>
            </section>

            {/* 4. O que acontece */}
            <section className="space-y-3" id="dados">
              <h2 className={SECTION_TITLE}>
                <Database className="w-5 h-5 shrink-0" />
                <span>4. O que acontece com os seus dados</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-2">
                  <h3 className="font-bold text-white text-sm">É excluído ou deixa de ser usado</h3>
                  <ul className="list-disc pl-5 space-y-1 text-stone-400 text-xs">
                    <li>Seu acesso: e-mail e senha de login.</li>
                    <li>Os dados do seu perfil, como nome, telefone, cidade e foto.</li>
                    <li>A afiliação ou vínculo maçônico que você declarou.</li>
                    <li>Seus consentimentos, que são revogados.</li>
                    <li>Os avisos (notificações) enviados ao seu aparelho.</li>
                    <li>Se você é anunciante: suas empresas deixam de aparecer no Guia.</li>
                  </ul>
                </div>
                <div className="bg-[#1f0509] p-4 rounded-xl border border-stone-800 space-y-2">
                  <h3 className="font-bold text-white text-sm">Pode ser mantido por obrigação legal</h3>
                  <ul className="list-disc pl-5 space-y-1 text-stone-400 text-xs">
                    <li>Registros de contratos e de pagamentos, exigidos por obrigações fiscais e contábeis.</li>
                    <li>Registros de aceite dos Termos de Uso e da Política de Privacidade e de consentimento.</li>
                    <li>Registros de segurança e auditoria, para prevenção a fraudes e defesa em eventuais disputas.</li>
                  </ul>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Esses registros são guardados somente pelo tempo exigido em lei, com acesso restrito, e não são usados para
                    outros fins (LGPD, art. 16).
                  </p>
                </div>
              </div>
              <p className="text-stone-400">
                A exclusão não pode ser desfeita. Se tiver dúvida sobre algum dado em especial, escreva para o e-mail acima antes
                de excluir.
              </p>
            </section>

            {/* 5. Bloqueio financeiro */}
            <section className="space-y-3" id="pendencias">
              <h2 className={SECTION_TITLE}>
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>5. Quando a exclusão não pode ser feita na hora</span>
              </h2>
              <p className="text-stone-300">
                Se houver <strong className="text-white">assinatura, pagamento ou reserva pendente</strong> ligados à sua conta, o aplicativo
                e o site avisam que a exclusão está bloqueada. Finalize ou cancele a pendência e tente de novo. Se precisar de ajuda para
                resolver, escreva para{' '}
                <a href={`mailto:${DPO_EMAIL}`} className="text-[#C9A227] underline">{DPO_EMAIL}</a>.
              </p>
            </section>

            {/* 6. Mais informações */}
            <section className="space-y-3" id="mais">
              <h2 className={SECTION_TITLE}>
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>6. Mais informações</span>
              </h2>
              <p className="text-stone-300">
                Para saber como tratamos os seus dados e quais são todos os seus direitos, leia a{' '}
                <Link href="/privacidade" className="text-[#C9A227] underline">Política de Privacidade</Link> e os{' '}
                <Link href="/termos" className="text-[#C9A227] underline">Termos de Uso</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <DirectoryFooter />
    </div>
  );
}

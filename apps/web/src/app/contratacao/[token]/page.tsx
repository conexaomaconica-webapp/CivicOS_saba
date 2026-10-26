import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { getPublicContractByTokenAction } from '@/lib/contracts/admin-contracts-service';
import { contractTextForPlainDisplay } from '@/lib/contracts/contract-template-renderer';
import { formatDateTimeBR } from '@/lib/format/datetime-br';
import { formatCpfCnpj } from '@/lib/onboarding/onboarding-validation';
import { ContractPrintButton } from '@/components/contracts/ContractPrintButton';
import { ContractSignatureClient } from './contract-signature-client';

export const metadata: Metadata = {
  title: { absolute: 'Contrato de Adesão | Conexão Maçônica' },
  description: 'Conferência e assinatura eletrônica do contrato de adesão ao Guia Conexão Maçônica.',
  robots: {
    index: false,
    follow: false,
  },
};

interface ContratacaoPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ContratacaoPublicPage({ params }: ContratacaoPageProps) {
  const { token } = await params;
  const res = await getPublicContractByTokenAction(token);

  if (!res.success || !res.data) {
    const isTechnical = res.errorType === 'technical_error';
    const isExpiredOrRevoked = res.errorType === 'expired_or_revoked';

    return (
      <main className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden text-center">
          {/* Cabeçalho Bordô Institucional para destacar a logomarca */}
          <div className="bg-[#3B0B14] border-b border-[#C9A227]/30 px-6 py-6 flex flex-col items-center justify-center">
            <Image
              src="/logoconexao_red.png"
              alt="Conexão Maçônica"
              width={220}
              height={72}
              className="mx-auto h-auto w-48 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
              priority
            />
            <span className="text-[10px] font-bold tracking-widest text-[#E6C659] uppercase mt-2.5">
              Conexão Maçônica · Assinatura Digital
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            {isTechnical ? (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="font-serif text-xl font-bold text-stone-900">
                    Instabilidade Técnica Temporária
                  </h1>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Não foi possível carregar os dados do contrato no momento devido a uma oscilação temporária de conexão.
                    A sua minuta contratual e os termos acordados permanecem preservados com total segurança.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href={`/contratacao/${token}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B0B14] hover:bg-[#2b060d] border border-[#C9A227]/40 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Tentar Novamente
                  </Link>
                </div>
              </>
            ) : isExpiredOrRevoked ? (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <Clock className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h1 className="font-serif text-xl font-bold text-stone-900">
                    Link Expirado ou Revogado
                  </h1>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {res.error || 'O link de acesso ao contrato perdeu a validade ou foi revogado pela administração.'}
                  </p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200 text-[11px] text-stone-500 text-left space-y-1">
                  <p className="font-bold text-stone-700">Possíveis motivos:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>O link ultrapassou o prazo de validade de 7 dias.</li>
                    <li>Uma nova versão da minuta foi emitida pela administração.</li>
                    <li>O contrato foi revogado administrativamente para ajustes.</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h1 className="font-serif text-xl font-bold text-stone-900">
                    Link Indisponível
                  </h1>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {res.error || 'O link de acesso ao contrato não foi localizado ou é inválido.'}
                  </p>
                </div>
              </>
            )}

            <p className="text-xs text-stone-500 pt-2 border-t border-stone-100">
              Entre em contato com o suporte da <strong>Conexão Maçônica</strong> para assistência ou solicitação de um novo link.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const {
    business_name,
    business_legal_name,
    cnpj,
    responsavel_nome,
    template_title,
    template_version,
    rendered_markdown,
    sha256_hash,
    created_at,
    expires_at,
  } = res.data;

  const formattedEmissionDate = new Date(created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formattedExpirationDate = new Date(expires_at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main className="min-h-screen bg-stone-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Header Institucional */}
        <header className="rounded-2xl border border-[#C9A227]/35 bg-[#3B0B14] p-6 text-white shadow-lg sm:p-8 space-y-4">
          <div className="flex flex-col items-center gap-5 border-b border-white/15 pb-6 text-center">
            <div className="flex min-w-0 flex-col items-center gap-4">
              <div className="flex shrink-0 items-center justify-center">
                <Image
                  src="/logoconexao_red.png"
                  alt="Conexão Maçônica"
                  width={220}
                  height={72}
                  className="h-auto w-52 object-contain sm:w-60"
                  priority
                />
              </div>
              <div className="min-w-0 max-w-2xl space-y-2">
              <span className="text-[11px] font-bold tracking-widest text-[#E6C659] uppercase block">
                Conexão Maçônica · Guia Comercial Oficial
              </span>
              <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
                {template_title}
              </h1>
              <p className="text-xs text-white/70">
                Versão do Instrumento: <span className="font-mono font-semibold text-white">{template_version}</span> · Emissão: {formattedEmissionDate}
              </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Integridade do documento verificada por SHA-256
              </div>
              <span className="text-[11px] text-white/65 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Válido até {formattedExpirationDate}
              </span>
            </div>
          </div>

          {/* Dados Resumidos das Partes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-xs">
            <div>
              <span className="text-white/65 font-medium block">Nome Fantasia:</span>
              <strong className="text-white font-semibold">{business_name}</strong>
            </div>
            <div>
              <span className="text-white/65 font-medium block">Contratante / Razão Social:</span>
              <strong className="text-white font-semibold">{business_legal_name}</strong>
            </div>
            <div>
              <span className="text-white/65 font-medium block">CNPJ:</span>
              <strong className="font-mono text-white">{cnpj}</strong>
            </div>
            <div>
              <span className="text-white/65 font-medium block">Representante Legal:</span>
              <strong className="text-white font-semibold">{responsavel_nome}</strong>
            </div>
          </div>
        </header>

        {/* Corpo Oficial do Contrato */}
        <article className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#3B0B14]" />
              <h2 className="font-serif font-bold text-base text-stone-900">
                Termos e Cláusulas Contratuais
              </h2>
            </div>
            <span className="text-[11px] text-stone-400 font-mono">
              Via Digital Oficial
            </span>
          </div>

          <div className="flex justify-end">
            <ContractPrintButton
              text={contractTextForPlainDisplay(rendered_markdown)}
              businessName={business_name}
              legalName={res.data.business_legal_name || business_name}
              signatureImage={res.data.signature_image_data}
              signerName={responsavel_nome}
              signerCpf={res.data.signer_cpf ? formatCpfCnpj(res.data.signer_cpf) : undefined}
              signedAtLabel={res.data.accepted_at ? formatDateTimeBR(res.data.accepted_at) : undefined}
              sha256Hash={sha256_hash}
            />
          </div>

          {/* Visualizador de Texto Integral */}
          <div className="rounded-xl border border-stone-300 bg-stone-50/60 p-6 sm:p-8 font-sans text-xs sm:text-sm text-stone-800 leading-relaxed max-h-[600px] overflow-y-auto whitespace-pre-wrap select-text space-y-4">
            {contractTextForPlainDisplay(rendered_markdown)}
          </div>

          {/* Assinatura eletrônica registrada (aparece assim que o contrato é assinado) */}
          {res.data.signature_image_data && (
            <div className="mx-auto w-full max-w-md space-y-2 rounded-xl border border-stone-200 bg-white p-4 text-center">
              <p className="font-serif text-xs font-bold uppercase tracking-wider text-[#3B0B14]">
                Assinatura eletrônica do representante legal
              </p>
              <div className="flex min-h-24 items-center justify-center rounded-lg bg-stone-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={res.data.signature_image_data}
                  alt="Assinatura eletrônica do representante legal"
                  className="max-h-28 max-w-full object-contain"
                />
              </div>
              <div className="border-t border-stone-700 pt-1.5 text-xs font-semibold text-stone-900">
                {res.data.business_legal_name || business_name}
              </div>
              <p className="text-[10px] text-stone-500">
                Representante legal: {responsavel_nome}
                {res.data.accepted_at ? ` • Registrada em ${formatDateTimeBR(res.data.accepted_at)}` : ''}
              </p>
            </div>
          )}

          {/* Resumo Criptográfico SHA-256 */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Integridade do Documento Verificada por SHA-256
              </span>
              <span className="text-[11px] text-stone-500">
                Imutabilidade Técnica
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              O hash criptográfico abaixo garante matematicamente a integridade do conteúdo deste contrato, comprovando que seu texto permanece exatamente idêntico ao emitido.
            </p>
            <div className="font-mono text-[11px] bg-white p-2.5 rounded-lg border border-stone-200 break-all select-all text-stone-700">
              <strong className="font-sans text-stone-500 mr-2">SHA-256:</strong>
              {sha256_hash}
            </div>
          </div>
        </article>

        {/* Módulo de Assinatura Eletrônica e Aceite (Fase 5: Microetapas 5.1, 5.2 e 5.5) */}
        <ContractSignatureClient token={token} contractData={res.data} />

        {/* Rodapé Institucional */}
        <footer className="text-center text-xs text-stone-400 pb-8 space-y-1">
          <p>© {new Date().getFullYear()} Conexão Maçônica Comunicação e Tecnologia Ltda. Todos os direitos reservados.</p>
          <p>Ambiente seguro e auditado · Conexão Maçônica Platform</p>
        </footer>
      </div>
    </main>
  );
}

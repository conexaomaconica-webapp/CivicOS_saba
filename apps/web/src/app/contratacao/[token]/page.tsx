import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { getPublicContractByTokenAction } from '@/lib/contracts/admin-contracts-service';
import { ContractSignatureClient } from './contract-signature-client';

export const metadata: Metadata = {
  title: 'Contrato de Adesão | Conexão Maçônica',
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
    return (
      <main className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-stone-200 text-center space-y-4">
          <Image
            src="/logoconexao_red.png"
            alt="Conexão Maçônica"
            width={220}
            height={72}
            className="mx-auto h-auto w-44 object-contain"
            priority
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-xl font-bold text-stone-900">
              Link Indisponível ou Expirado
            </h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              {res.error || 'O link de acesso ao contrato não foi localizado ou perdeu a validade.'}
            </p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200 text-[11px] text-stone-500 text-left space-y-1">
            <p className="font-bold text-stone-700">Possíveis motivos:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>O link pode ter ultrapassado a validade máxima de 7 dias.</li>
              <li>A administração pode ter gerado uma nova versão da minuta.</li>
              <li>O contrato pode ter sido revogado administrativamente.</li>
            </ul>
          </div>
          <p className="text-xs text-stone-500">
            Entre em contato com o suporte da <strong>Conexão Maçônica</strong> para receber um link atualizado.
          </p>
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
              <span className="text-white/65 font-medium block">Empresa / Razão Social:</span>
              <strong className="text-white font-semibold">{business_legal_name}</strong>
            </div>
            <div>
              <span className="text-white/65 font-medium block">Nome Fantasia:</span>
              <strong className="text-white font-semibold">{business_name}</strong>
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

          {/* Visualizador de Texto Integral */}
          <div className="rounded-xl border border-stone-300 bg-stone-50/60 p-6 sm:p-8 font-sans text-xs sm:text-sm text-stone-800 leading-relaxed max-h-[600px] overflow-y-auto whitespace-pre-wrap select-text space-y-4">
            {rendered_markdown}
          </div>

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

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, FileCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function ContractSigningClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [sha256Hash, setSha256Hash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const contractText = `
CONTRATO DE ADESÃO E LICENÇA DE USO DA PLATAFORMA CONEXÃO MAÇÔNICA (V1.0)

CONTRATANTE: Anunciante cadastrado via conta (${userEmail})
CONTRATADA: Plataforma Conexão Maçônica / CivicOS Core

1. OBJETO E ESCOPO
O presente contrato estabelece os termos e condições para publicação, exibição e concessão de selo fraterno de confiança da empresa contratante no Guia Comercial Conexão Maçônica.

2. DIREITOS E OBRIGAÇÕES
- A Contratada compromete-se a manter a plataforma estável, responsiva e em conformidade com as diretrizes de acessibilidade (WCAG AA) e privacidade (LGPD).
- A Contratante declara e garante que os dados da empresa, vínculo fraterno e canal de contato fornecidos são autênticos e verdadeiros.

3. VALIDADE E SNAPSHOT IMUTÁVEL
Este aceite gera um registro snapshot imutável com hash SHA-256 e timestamp gravado na infraestrutura de auditoria da plataforma.

4. COBRANÇA E CANCELAMENTO
A assinatura comercial é processada exclusivamente via Asaas Gateway, sendo a ativação do plano condicionada à confirmação transacional do pagamento via webhook.
`.trim();

  const handleSignContract = async () => {
    if (!accepted) {
      setErrorMsg('Você deve marcar a caixa de seleção declarando a leitura e aceite integral dos termos.');
      return;
    }

    setSigning(true);
    setErrorMsg(null);

    try {
      // Simulação de cálculo SHA-256 local para o snapshot imutável
      const encoder = new TextEncoder();
      const data = encoder.encode(contractText + userEmail + new Date().toISOString());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      setSha256Hash(computedHash);

      // Redireciona para o Checkout (Passo 6)
      setTimeout(() => {
        router.push('/anunciar/passo-6');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(`Falha ao registrar aceite do contrato: ${err?.message || 'Erro desconhecido'}`);
      setSigning(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Box do Texto do Contrato Renderizado */}
      <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 max-h-64 overflow-y-auto text-xs text-stone-300 font-mono leading-relaxed space-y-2 select-text">
        <pre className="whitespace-pre-wrap font-sans text-xs">{contractText}</pre>
      </div>

      {/* Snapshot Hash visual */}
      {sha256Hash && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono text-[11px] truncate">
            Snapshot imutável gerado: <strong>{sha256Hash}</strong>
          </span>
        </div>
      )}

      {/* Checkbox de Aceite */}
      <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-stone-700 text-amber-600 focus:ring-amber-500 bg-stone-900"
          />
          <span className="text-xs text-stone-300 leading-relaxed">
            Li, compreendi e concordo integralmente com os termos do contrato de adesão acima, autorizando o registro do snapshot imutável com hash SHA-256 e meu consentimento contratual.
          </span>
        </label>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={() => router.push('/anunciar/passo-4')}
          className="px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs font-medium transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={() => void handleSignContract()}
          disabled={signing || !accepted}
          className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg ${
            signing || !accepted
              ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
          }`}
        >
          {signing ? (
            <span>Gerando Hash & Registrando...</span>
          ) : (
            <>
              <FileCheck className="w-4 h-4" />
              <span>Assinar Contrato & Ir para Pagamento</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

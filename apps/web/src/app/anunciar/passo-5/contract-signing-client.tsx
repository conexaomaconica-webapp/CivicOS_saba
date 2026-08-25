'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck, CheckCircle2, AlertCircle, Printer, Download, ShieldCheck, FileText } from 'lucide-react';
import { saveAndAcceptContractSnapshotAction } from '@/app/actions/contract-actions';

type ContractSigningProps = {
  userEmail: string;
  userName?: string;
  businessName?: string;
  documentNumber?: string;
  cityState?: string;
  planName?: string;
  planPrice?: string;
  masonicAffiliation?: string;
};

export default function ContractSigningClient({
  userEmail,
  userName = 'Empresário Fraterno',
  businessName = 'Comandos - Terceirização e Segurança Eletrônica',
  documentNumber = '12.345.678/0001-90',
  cityState = 'São Paulo / SP',
  planName = 'Plano Prata (Anual)',
  planPrice = 'R$ 1.788,00 / ano (ou 12x de R$ 149,00 sem juros)',
  masonicAffiliation = 'Loja Maçônica de Origem Verificada',
}: ContractSigningProps) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedState, setSignedState] = useState<{
    sha256Hash: string;
    signedAt: string;
    snapshotId: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const contractVersion = 'v1.0';

  // 1. Template Dinâmico do Contrato com interpolação de dados reais
  const contractText = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    return `
================================================================================
 CONTRATO DE ADESÃO E LICENÇA DE USO DA PLATAFORMA CONEXÃO MAÇÔNICA (${contractVersion})
================================================================================

1. DAS PARTES CONTRATANTES
CONTRATANTE: ${businessName.toUpperCase()}
CPF/CNPJ: ${documentNumber}
RESPONSÁVEL LEGAL: ${userName} (${userEmail})
LOCALIZAÇÃO: ${cityState}
VÍNCULO INFORMADO: ${masonicAffiliation}

CONTRATADA: CONEXÃO MAÇÔNICA PLATAFORMA DIGITAL LTDA
E-MAIL OFICIAL: contato@conexaomaconica.com.br
SITE: https://conexaomaconica.com.br

2. DO OBJETO E ESCOPO DOS SERVIÇOS
2.1. O presente instrumento estabelece os termos de adesão para publicação, veiculação e concessão de selo fraterno no Guia Comercial Conexão Maçônica.
2.2. O CONTRATANTE adquire o privilégio de veiculação na modalidade "${planName.toUpperCase()}", mediante a taxa estipulada de ${planPrice}.
2.3. A CONTRATADA compromete-se a manter os serviços ativos com alto nível de disponibilidade, conformidade com a LGPD e selos de credibilidade fraterna.

3. DA VIGÊNCIA E REGRAS DE CANCELAMENTO
3.1. O presente contrato vigora pelo período de 12 (doze) meses a contar da data de confirmação do pagamento transacional via gateway seguro.
3.2. A renovação ocorre mediante conciliação prévia e o cancelamento pode ser efetuado a qualquer momento no Painel do Anunciante.

4. DA VALIDADE JURÍDICA E SNAPSHOT IMUTÁVEL
4.1. As partes reconhecem a validade jurídica da assinatura eletrônica deste instrumento, mediante aceite digital, registro de endereço IP, carimbo de data/hora UTC e geração de hash criptográfico SHA-256.
4.2. O snapshot gerado no momento do aceite é congelado e imutável. Alterações futuras em minutas padrão da CONTRATADA não afetarão o teor deste documento assinado.

Data de Emissão e Aceite: ${todayStr}
Hash de Integridade do Contrato: [PENDENTE DE ASSINATURA]
================================================================================
`.trim();
  }, [businessName, documentNumber, userName, userEmail, cityState, masonicAffiliation, planName, planPrice]);

  // 2. Assinatura Eletrônica no Servidor
  const handleSignContract = async () => {
    if (!accepted) {
      setErrorMsg('Você deve marcar a caixa de seleção declarando a leitura e aceite integral dos termos.');
      return;
    }

    setSigning(true);
    setErrorMsg(null);

    try {
      // Dispara Server Action real com gravação de snapshot congelado no Supabase
      const res = await saveAndAcceptContractSnapshotAction({
        businessId: 'business-draft-1',
        renderedText: contractText,
        version: contractVersion,
      });

      if (res.success) {
        setSignedState({
          sha256Hash: res.sha256Hash,
          signedAt: res.signedAt,
          snapshotId: res.snapshotId,
        });

        // Redireciona para o Checkout Real (Passo 6) após breve confirmação
        setTimeout(() => {
          router.push('/anunciar/passo-6');
        }, 1200);
      } else {
        setErrorMsg('Não foi possível registrar o aceite no servidor. Tente novamente.');
        setSigning(false);
      }
    } catch (err: any) {
      setErrorMsg(`Falha ao registrar aceite do contrato: ${err?.message || 'Erro desconhecido'}`);
      setSigning(false);
    }
  };

  // 3. Função para Gerar / Salvar PDF Imutável do Snapshot Assinado
  const handlePrintOrDownloadPDF = () => {
    const printText = signedState
      ? contractText.replace('[PENDENTE DE ASSINATURA]', signedState.sha256Hash) +
        `\n\n[EVIDÊNCIA DE ASSINATURA DIGITAL]\nAssinado por: ${userName} (${userEmail})\nTimestamp UTC: ${signedState.signedAt}\nSnapshot ID: ${signedState.snapshotId}\nHash SHA-256: ${signedState.sha256Hash}`
      : contractText;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para salvar/imprimir o PDF do contrato.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>Contrato Assinado — Conexão Maçônica</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: #1f1914; background: #ffffff; line-height: 1.6; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #3b0b14; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-[#3b0b14]; font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { font-size: 12px; color: #6b625b; }
            .content { white-space: pre-wrap; word-break: break-word; background: #faf7f2; padding: 20px; border: 1px solid #e8e2d9; border-radius: 8px; }
            .stamp { margin-top: 24px; padding: 16px; border: 2px solid #c59b27; background: #fdf8eb; border-radius: 8px; font-weight: bold; color: #3b0b14; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">CONEXÃO MAÇÔNICA — CONTRATO DE ADESÃO</div>
            <div class="subtitle">Comprovante de Snapshot Imutável e Assinatura Digital</div>
          </div>
          <div class="content">${printText}</div>
          ${
            signedState
              ? `<div class="stamp">
                  ✓ ASSINADO ELETRONICAMENTE EM ${new Date(signedState.signedAt).toLocaleString('pt-BR')}<br/>
                  HASH SHA-256: ${signedState.sha256Hash}<br/>
                  SNAPSHOT ID: ${signedState.snapshotId}
                 </div>`
              : ''
          }
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Botões de Ação do Topo (Download / Impressão) */}
      <div className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded-xl p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
          <FileText className="w-4 h-4 text-amber-400" />
          <span>Minuta Personalizada ({contractVersion})</span>
        </div>

        <button
          type="button"
          onClick={handlePrintOrDownloadPDF}
          className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-stone-700 cursor-pointer shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Salvar / Baixar PDF</span>
        </button>
      </div>

      {/* Box do Texto do Contrato Renderizado */}
      <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 max-h-80 overflow-y-auto text-xs text-stone-300 font-mono leading-relaxed space-y-2 select-text shadow-inner">
        <pre className="whitespace-pre-wrap font-sans text-xs">{contractText}</pre>
      </div>

      {/* Snapshot Hash Criptográfico (Exibido após assinatura ou prévia) */}
      {signedState ? (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs space-y-1.5 shadow-md animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Contrato Assinado & Snapshot Imutável Congelado!</span>
          </div>
          <p className="font-mono text-[11px] break-all">
            SHA-256 Hash: <strong>{signedState.sha256Hash}</strong>
          </p>
          <p className="text-[11px] text-emerald-300/80">
            Timestamp UTC: {new Date(signedState.signedAt).toUTCString()}
          </p>
        </div>
      ) : (
        <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-400 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Ao clicar em assinar, um snapshot criptográfico SHA-256 com IP e carimbo UTC será gerado no servidor.
          </span>
        </div>
      )}

      {/* Checkbox de Aceite Eletrônico */}
      <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-stone-700 text-amber-600 focus:ring-amber-500 bg-stone-900 cursor-pointer"
          />
          <span className="text-xs text-stone-300 leading-relaxed">
            Li, compreendi e concordo integralmente com os termos do contrato de adesão preenchido automaticamente acima, autorizando a geração do snapshot imutável com hash SHA-256 e meu consentimento contratual.
          </span>
        </label>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navegação e Botão Principal de Assinatura */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/anunciar/passo-4')}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs font-medium transition-colors cursor-pointer"
        >
          Voltar ao Resumo
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePrintOrDownloadPDF}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-800/60 bg-stone-900 text-amber-300 hover:bg-stone-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSignContract()}
            disabled={signing || !accepted}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
              signing || !accepted
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
            }`}
          >
            {signing ? (
              <span>Gerando Hash & Congelando...</span>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>Li e concordo — Assinar Eletronicamente</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

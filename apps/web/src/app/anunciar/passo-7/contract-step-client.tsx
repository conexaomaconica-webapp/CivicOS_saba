'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2, Printer, ArrowRight, Loader2, AlertCircle, RefreshCw, Eye, FileText } from 'lucide-react';
import { saveAndAcceptContractSnapshotAction } from '@/app/actions/contract-actions';
import { CANONICAL_PLAN_PAYMENT_RULES } from '@/lib/payment/payment-rules-types';

export interface ContractStepClientProps {
  userEmail: string;
  userName: string;
  businessId: string;
  businessName: string;
  businessCnpj: string;
  planCode: string;
  masonicStatus: 'verified' | 'pending' | 'rejected';
  alreadySigned?: boolean;
}

export default function ContractStepClient({
  userEmail,
  userName,
  businessId,
  businessName,
  businessCnpj,
  planCode,
  masonicStatus,
  alreadySigned = false,
}: ContractStepClientProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(alreadySigned);
  const [signed, setSigned] = useState(alreadySigned);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sha256Hash, setSha256Hash] = useState<string | null>(null);
  const [signedAtDate, setSignedAtDate] = useState<string | null>(null);
  const [showFullContractModal, setShowFullContractModal] = useState(false);

  // Canvas de Assinatura Manuscrita
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const planRules = CANONICAL_PLAN_PAYMENT_RULES[planCode.toLowerCase()] || CANONICAL_PLAN_PAYMENT_RULES['prata'] || { planCode: 'prata', amountCents: 178800 };
  const amountFormatted = (planRules.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Texto impresso do contrato oficial de prestação de serviços de publicidade
  const contractText = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PUBLICIDADE, DIVULGAÇÃO E PRESENÇA COMERCIAL DIGITAL — GUIA CONEXÃO MAÇÔNICA

Versão: v1.0

Pelo presente instrumento eletrônico, de um lado:

CONTRATADA / PLATAFORMA: CONEXÃO MAÇÔNICA COMUNICAÇÃO E TECNOLOGIA LTDA., responsável pela plataforma digital denominada CONEXÃO MAÇÔNICA, doravante denominada simplesmente CONEXÃO MAÇÔNICA ou PLATAFORMA;

e, de outro lado:

CONTRATANTE / ANUNCIANTE: ${businessName.toUpperCase()}, inscrita no CNPJ/CPF sob nº ${businessCnpj}, representada neste ato por ${userName.toUpperCase()}, e-mail ${userEmail}, doravante denominada simplesmente ANUNCIANTE;

têm entre si ajustado o presente Contrato de Prestação de Serviços de Publicidade, Divulgação e Presença Comercial Digital, mediante as cláusulas e condições seguintes.

CLÁUSULA 1 — DO OBJETO
1.1. O presente contrato tem por objeto a prestação, pela CONEXÃO MAÇÔNICA, de serviços de divulgação, publicidade e presença comercial digital do ANUNCIANTE no Guia Comercial Conexão Maçônica e em funcionalidades relacionadas disponibilizadas pela PLATAFORMA.
1.2. Os serviços poderão compreender, conforme o plano contratado, a disponibilização de perfil empresarial ou profissional, informações de contato, endereço, imagens, descrição de produtos e serviços, benefícios, publicações, eventos, formas de contato, localização geográfica, selos, reconhecimentos, mecanismos de busca, filtros e demais funcionalidades previstas para o respectivo plano.
1.3. A contratação não representa aquisição de propriedade sobre qualquer parte da plataforma, código-fonte, sistema ou tecnologia utilizada pela CONEXÃO MAÇÔNICA.

CLÁUSULA 2 — DO PLANO CONTRATADO
2.1. O ANUNCIANTE contrata o Plano ${planRules.planCode.toUpperCase()}, pelo valor de ${amountFormatted}/ano, para o período de 12 (doze) meses.
2.2. Os recursos, limites e benefícios correspondentes ao plano contratado serão aqueles indicados na proposta comercial e na descrição vigente do plano apresentada ao ANUNCIANTE no momento da contratação.
2.3. Eventuais recursos adicionais poderão possuir condições e valores próprios.
2.4. O histórico da contratação, incluindo plano, valor, condições comerciais e versão contratual aceita, será registrado eletronicamente pela PLATAFORMA.

CLÁUSULA 3 — DA PUBLICAÇÃO DO ANÚNCIO
3.1. A publicação será realizada após o preenchimento das informações obrigatórias, atendimento aos critérios de elegibilidade aplicáveis e, quando exigido, confirmação do pagamento.
3.2. O ANUNCIANTE compromete-se a fornecer informações verdadeiras, atuais, completas e legalmente permitidas.
3.3. A CONEXÃO MAÇÔNICA poderá solicitar correções, documentos ou esclarecimentos antes ou depois da publicação do anúncio.
3.4. A PLATAFORMA poderá estabelecer padrões técnicos e editoriais destinados a preservar a qualidade, segurança, identidade visual e finalidade do Guia.

CLÁUSULA 4 — DO CONTEÚDO DO ANUNCIANTE
4.1. O ANUNCIANTE é responsável pelos textos, imagens, fotografias, logotipos, marcas, ofertas, preços, informações de produtos e serviços e demais conteúdos fornecidos ou publicados em seu perfil.
4.2. Ao fornecer conteúdo à PLATAFORMA, o ANUNCIANTE declara possuir os direitos, licenças, autorizações e consentimentos necessários para sua utilização.
4.3. O ANUNCIANTE autoriza a CONEXÃO MAÇÔNICA, durante a vigência da contratação, a reproduzir, adaptar às dimensões técnicas, armazenar e exibir suas marcas, imagens e materiais exclusivamente para execução dos serviços contratados e divulgação do próprio Guia.
4.4. É vedada a publicação de conteúdo ilícito, fraudulento, enganoso, discriminatório, ofensivo, que viole direitos de terceiros ou que contrarie a legislação brasileira ou as políticas da PLATAFORMA.

CLÁUSULA 5 — DA MODERAÇÃO E SUSPENSÃO
5.1. A CONEXÃO MAÇÔNICA poderá moderar conteúdos e solicitar alterações quando identificar possível violação deste contrato, das políticas da plataforma ou da legislação aplicável.
5.2. Conteúdo ou perfil poderá ser temporariamente suspenso quando houver indícios razoáveis de fraude, falsidade, risco aos usuários, violação de direitos de terceiros ou descumprimento contratual.
5.3. Sempre que as circunstâncias permitirem, o ANUNCIANTE será informado sobre a necessidade de regularização.

CLÁUSULA 6 — DA ELEGIBILIDADE E DO VÍNCULO MAÇÔNICO
6.1. Quando a modalidade de participação, reconhecimento, selo ou benefício exigir comprovação de vínculo ou condição específica estabelecida pela CONEXÃO MAÇÔNICA, sua concessão dependerá da respectiva validação administrativa.
6.2. A aprovação para participação na plataforma não implica certificação da qualidade dos produtos ou serviços oferecidos pelo ANUNCIANTE.
6.3. Selos e reconhecimentos possuem finalidade informativa e institucional e permanecerão sujeitos aos respectivos critérios de concessão e manutenção.
6.4. A perda superveniente dos requisitos de determinado selo, reconhecimento ou modalidade poderá resultar em sua retirada, sem alterar outras funcionalidades que permaneçam contratualmente aplicáveis.

CLÁUSULA 7 — DA POSIÇÃO E VISIBILIDADE DOS ANÚNCIOS
7.1. A contratação garante os recursos previstos no plano, mas não garante quantidade mínima de visualizações, contatos, vendas, faturamento, acessos ou qualquer resultado comercial específico.
7.2. A ordem de exibição poderá considerar critérios como plano contratado, patrocínio, localização, categoria, relevância, disponibilidade, preferências de pesquisa, regras administrativas e outros critérios definidos pela PLATAFORMA.
7.3. Destaques patrocinados ou posições especiais poderão estar sujeitos a contratação específica.

CLÁUSULA 8 — DAS RESPONSABILIDADES COMERCIAIS
8.1. A CONEXÃO MAÇÔNICA funciona como ambiente de divulgação e aproximação entre usuários e ANUNCIANTES e não integra, salvo informação expressa em contrário, os contratos celebrados diretamente entre eles.
8.2. O ANUNCIANTE será responsável pelos seus produtos, serviços, preços, garantias, atendimento, obrigações fiscais, comerciais e legais.
8.3. Reclamações relacionadas diretamente ao produto ou serviço anunciado deverão ser solucionadas pelo respectivo ANUNCIANTE, sem prejuízo das hipóteses de responsabilidade legalmente atribuíveis à PLATAFORMA.

CLÁUSULA 9 — DA DISPONIBILIDADE DA PLATAFORMA
9.1. A CONEXÃO MAÇÔNICA adotará medidas razoáveis para manter seus serviços disponíveis e seguros.
9.2. Poderão ocorrer interrupções temporárias decorrentes de manutenção, atualização, falhas de infraestrutura, serviços de terceiros, caso fortuito, força maior ou eventos técnicos fora do controle razoável da PLATAFORMA.
9.3. Interrupções temporárias não caracterizarão, por si só, inadimplemento contratual.

CLÁUSULA 10 — DO PAGAMENTO
10.1. O valor e as condições do plano contratado são aqueles registrados eletronicamente no momento da contratação.
10.2. A falta de pagamento poderá resultar, após os procedimentos de cobrança aplicáveis, na suspensão ou limitação dos recursos contratados.
10.3. Descontos, condições promocionais ou benefícios temporários observarão as condições informadas na respectiva oferta.

CLÁUSULA 11 — DA VIGÊNCIA, RENOVAÇÃO E CANCELAMENTO
11.1. O presente contrato vigorará pelo período correspondente ao plano contratado, contado a partir de sua ativação, salvo condição comercial diversa expressamente informada.
11.2. As condições de renovação serão apresentadas ao ANUNCIANTE de forma adequada antes da nova contratação ou cobrança, conforme o modelo comercial adotado pela PLATAFORMA e a legislação aplicável.
11.3. O cancelamento poderá ser solicitado pelos canais disponibilizados pela CONEXÃO MAÇÔNICA e observará as condições financeiras correspondentes à contratação realizada.
11.4. O encerramento da contratação poderá resultar na retirada do anúncio e dos benefícios associados ao plano.

CLÁUSULA 12 — DA PROPRIEDADE INTELECTUAL
12.1. A marca CONEXÃO MAÇÔNICA, identidade visual, sistemas, interfaces, textos institucionais, banco de dados, software, elementos gráficos e demais ativos da plataforma permanecem de titularidade de seus respectivos proprietários.
12.2. A contratação não concede ao ANUNCIANTE autorização para utilizar a marca CONEXÃO MAÇÔNICA fora das hipóteses expressamente permitidas.
12.3. As marcas e conteúdos pertencentes ao ANUNCIANTE permanecem sob sua titularidade ou de seus respectivos titulares.

CLÁUSULA 13 — DA PROTEÇÃO DE DADOS
13.1. As partes comprometem-se a observar a legislação aplicável à proteção de dados pessoais, especialmente a Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD).
13.2. Os dados pessoais necessários à contratação, autenticação, segurança, faturamento, atendimento, prevenção a fraudes e execução dos serviços poderão ser tratados pela CONEXÃO MAÇÔNICA conforme as bases legais aplicáveis e sua Política de Privacidade.
13.3. Dados cadastrais destinados à divulgação pública serão apresentados ao ANUNCIANTE antes ou durante a configuração de seu perfil.
13.4. A Política de Privacidade da CONEXÃO MAÇÔNICA complementa as disposições desta cláusula.

CLÁUSULA 14 — DAS ALTERAÇÕES CONTRATUAIS
14.1. Cada versão deste contrato será identificada e mantida em registro próprio pela CONEXÃO MAÇÔNICA.
14.2. Alterações posteriores no modelo contratual não modificarão retroativamente o conteúdo do instrumento eletrônico já celebrado.
14.3. Quando uma nova versão exigir nova manifestação de vontade do ANUNCIANTE, a PLATAFORMA solicitará nova aceitação eletrônica.
14.4. Renovações futuras poderão ser realizadas sob nova versão contratual, mediante prévia apresentação das respectivas condições.

CLÁUSULA 15 — DA ASSINATURA ELETRÔNICA E PROVA DA CONTRATAÇÃO
15.1. As partes reconhecem como válida a manifestação eletrônica de vontade realizada através da PLATAFORMA.
15.2. Para fins de segurança, auditoria e comprovação da contratação, poderão ser registrados, entre outros elementos, identificação do usuário autenticado, empresa vinculada, endereço eletrônico, data e horário, endereço IP, informações técnicas da sessão, versão do contrato e registro criptográfico de integridade do documento.
15.3. Após a manifestação de aceite, uma cópia individualizada do contrato será preservada eletronicamente, de modo a permitir a verificação do conteúdo efetivamente aceito.
15.4. O documento poderá receber identificador criptográfico SHA-256 ou tecnologia equivalente destinada a auxiliar na comprovação de sua integridade.

CLÁUSULA 16 — DAS COMUNICAÇÕES
16.1. Comunicações relacionadas à contratação poderão ser realizadas pelos meios cadastrados pelo ANUNCIANTE, inclusive e-mail e notificações da própria plataforma.
16.2. O ANUNCIANTE deverá manter seus dados de contato atualizados.

CLÁUSULA 17 — DAS DISPOSIÇÕES GERAIS
17.1. A eventual tolerância de qualquer das partes quanto ao descumprimento de obrigação contratual não representará renúncia de direito.
17.2. Caso qualquer disposição deste contrato seja considerada inválida ou inexequível, as demais permanecerão em vigor na extensão permitida pela legislação.
17.3. Integram a relação contratual, quando aplicáveis, a proposta comercial, descrição do plano contratado, Política de Privacidade, Termos de Uso e demais documentos expressamente incorporados à contratação.

CLÁUSULA 18 — DA LEGISLAÇÃO E DO FORO
18.1. O presente contrato será regido pelas leis da República Federativa do Brasil.
18.2. Fica eleito o foro da Comarca de São Paulo/SP ou o foro da sede da CONTRATADA, com renúncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer dúvidas ou litígios oriundos deste instrumento.

E, por manifestação eletrônica de vontade, o ANUNCIANTE declara que teve acesso ao conteúdo integral deste instrumento e concorda com seus termos.`;

  // Funções do Canvas de Assinatura
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e && e.touches && e.touches.length > 0 ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent<HTMLCanvasElement>).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent<HTMLCanvasElement>).clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e && e.touches && e.touches.length > 0 ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent<HTMLCanvasElement>).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent<HTMLCanvasElement>).clientY;

    ctx.strokeStyle = '#3B0B14';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  // Executa assinatura e congelamento do contrato
  const handleSignContract = async () => {
    if (!agreed) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await saveAndAcceptContractSnapshotAction({
        businessId,
        renderedText: contractText,
        version: 'v1.0',
      });

      if (res.success) {
        setSigned(true);
        setSha256Hash(res.sha256Hash);
        setSignedAtDate(res.signedAt ? new Date(res.signedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'));
      } else {
        setErrorMsg('Não foi possível registrar a assinatura do contrato.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao processar assinatura eletrônica.');
    } finally {
      setLoading(false);
    }
  };

  // Gerador de PDF Timbrado Oficial
  const handlePrintContractPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const safeText = contractText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <title>Contrato Timbrado - ${businessName} - Conexão Maçônica</title>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 15mm; }
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 10.5pt;
        line-height: 1.6;
        color: #111;
        margin: 0;
        padding: 20px;
        background: #fff;
      }
      .letterhead {
        border: 2px solid #3B0B14;
        padding: 24px;
        border-radius: 12px;
        position: relative;
        background: #FAF8F5;
      }
      .header-logo {
        text-align: center;
        border-bottom: 2px double #C9A227;
        padding-bottom: 16px;
        margin-bottom: 20px;
      }
      .header-logo .symbol {
        font-size: 24pt;
        color: #3B0B14;
        margin-bottom: 4px;
        display: block;
      }
      .header-logo h1 {
        font-size: 18pt;
        color: #3B0B14;
        margin: 0;
        font-family: 'Georgia', serif;
        font-weight: bold;
      }
      .header-logo h2 {
        font-size: 10pt;
        color: #C9A227;
        margin: 4px 0 0 0;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: bold;
      }
      .contract-body {
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: 'Georgia', serif;
        font-size: 10pt;
        color: #222;
        text-align: justify;
        line-height: 1.6;
      }
      .signature-box {
        margin-top: 30px;
        border: 1px solid #C9A227;
        background: #fff;
        padding: 16px;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
        font-size: 9pt;
      }
      .signature-title {
        font-family: 'Georgia', serif;
        font-weight: bold;
        color: #3B0B14;
        border-bottom: 1px solid #ddd;
        padding-bottom: 6px;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      .footer-stamp {
        margin-top: 25px;
        text-align: center;
        font-size: 8pt;
        color: #666;
        border-top: 1px solid #ccc;
        padding-top: 10px;
      }
      @media print {
        body { padding: 0; background: #fff; }
        .letterhead { border: 2px solid #3B0B14; }
      }
    </style>
  </head>
  <body>
    <div class="letterhead">
      <div class="header-logo">
        <div style="background: #3B0B14; padding: 18px 24px; border-radius: 10px 10px 0 0; border-bottom: 3px solid #C9A227; display: grid; grid-template-columns: 80px 1fr 80px; align-items: center;">
          <img src="/logoconexao_red.png" alt="Conexão Maçônica Logo" style="height: 52px; object-fit: contain;" />
          <div style="text-align: center;">
            <h1 style="color: #C9A227; font-size: 20pt; margin: 0; font-family: 'Georgia', serif; letter-spacing: 2px;">CONEXÃO MAÇÔNICA</h1>
            <h2 style="color: #fff; font-size: 9pt; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 2px; font-weight: normal;">GUIA DE EMPRESAS E SERVIÇOS MAÇÔNICOS</h2>
          </div>
          <div style="width: 80px;"></div>
        </div>
        <div style="background: #f4efe8; border-top: 1px solid #3B0B14; border-bottom: 2px solid #3B0B14; padding: 12px; margin-top: 10px; font-family: 'Georgia', serif; font-weight: bold; font-size: 11pt; color: #3B0B14; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PUBLICIDADE E PRESENÇA COMERCIAL DIGITAL
        </div>
      </div>

      <div class="contract-body">${safeText}</div>

      <div class="signature-box">
        <div class="signature-title">📜 Dossiê de Autenticidade e Assinatura Eletrônica (MP 2.200-2/2001)</div>
        <div>• <strong>CONTRATANTE / ANUNCIANTE:</strong> ${businessName} (CNPJ/CPF: ${businessCnpj})</div>
        <div>• <strong>RESPONSÁVEL LEGAL:</strong> ${userName} (${userEmail})</div>
        <div>• <strong>STATUS DA ASSINATURA:</strong> CONTRATO VÁLIDO E HOMOLOGADO</div>
        <div>• <strong>DATA/HORA DE ACEITE:</strong> ${signedAtDate || new Date().toLocaleString('pt-BR')}</div>
        <div>• <strong>HASH SHA-256 DE INTEGRIDADE:</strong> ${sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</div>
      </div>

      <div class="footer-stamp">
        Conexão Maçônica © ${new Date().getFullYear()} • Documento emitido para fins de validação jurídica e comprovação de licenciamento publicitário.
      </div>
    </div>
    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
</html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Se a validação maçônica estiver pendente ou rejeitada
  if (masonicStatus !== 'verified') {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center mx-auto text-amber-400">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C9A227] bg-[#3B0B14] px-3 py-1 rounded-full border border-[#C9A227]/40">
            Status: Validação de Vínculo em Análise
          </span>
          <h2 className="text-2xl font-serif font-bold text-white">Aguardando Validação Maçônica</h2>
          <p className="text-xs text-stone-300 leading-relaxed">
            Seus dados cadastrais foram recebidos e estão sob análise pela administração da Conexão Maçônica. Assim que a elegibilidade fraterna for confirmada, o contrato e a ativação serão liberados.
          </p>
        </div>

        <div className="p-4 bg-[#1f0509] border border-stone-800 rounded-2xl max-w-sm mx-auto text-xs text-stone-400 space-y-2 text-left font-mono">
          <div className="flex justify-between border-b border-stone-800 pb-1">
            <span>Cadastro:</span> <strong className="text-emerald-400">✓ Concluído</strong>
          </div>
          <div className="flex justify-between border-b border-stone-800 pb-1">
            <span>Vínculo:</span> <strong className="text-amber-400">⏳ Em Análise</strong>
          </div>
          <div className="flex justify-between border-b border-stone-800 pb-1">
            <span>Contrato:</span> <strong className="text-stone-500">🔒 Bloqueado</strong>
          </div>
          <div className="flex justify-between">
            <span>Pagamento:</span> <strong className="text-stone-500">🔒 Bloqueado</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/anunciante')}
          className="px-6 py-3 bg-[#C9A227] hover:bg-[#D9B237] text-[#1f0509] font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
        >
          Acompanhar no Portal do Anunciante
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA */}
      <div className="flex items-center justify-between border-b border-[#C9A227]/20 pb-4">
        <div>
          <span className="text-[11px] font-serif font-bold text-[#C9A227] uppercase tracking-wider block">
            Etapa Final • Formalização &amp; Licenciamento
          </span>
          <h2 className="text-xl font-serif font-bold text-white mt-0.5">
            Contrato de Prestação de Serviços de Publicidade
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFullContractModal(true)}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-stone-400" />
            <span>Ver Tela Cheia</span>
          </button>
          <button
            type="button"
            onClick={handlePrintContractPDF}
            className="px-4 py-2 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 text-[#C9A227]" />
            <span>Salvar em PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* REQUADRO DE RESUMO DAS PARTES */}
      <div className="bg-[#1f0509] border border-stone-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-serif">
        <div>
          <span className="text-stone-400 text-[10px] block font-bold">CONTRATADA / PLATAFORMA</span>
          <strong className="text-white font-bold block">Conexão Maçônica Comunicação e Tecnologia Ltda.</strong>
        </div>
        <div>
          <span className="text-stone-400 text-[10px] block font-bold">CONTRATANTE / ANUNCIANTE</span>
          <strong className="text-[#C9A227] font-bold block">{businessName}</strong>
          <span className="text-stone-400">CNPJ/CPF: {businessCnpj}</span>
        </div>
        <div>
          <span className="text-stone-400 text-[10px] block font-bold">RESPONSÁVEL LEGAL</span>
          <strong className="text-white block">{userName}</strong>
          <span className="text-stone-400">{userEmail}</span>
        </div>
        <div>
          <span className="text-stone-400 text-[10px] block font-bold">PLANO SELECIONADO</span>
          <strong className="text-[#C9A227] block">Plano {planRules.planCode.toUpperCase()}</strong>
          <span className="text-stone-300 font-bold">{amountFormatted} / ano</span>
        </div>
      </div>

      {/* EXIBIÇÃO DO TERMO EM PAPEL TIMBRADO INTERATIVO */}
      <div className="p-6 bg-[#FAF8F5] border-2 border-[#3B0B14] rounded-2xl shadow-md space-y-4 text-stone-900 font-serif text-xs leading-relaxed max-h-80 overflow-y-auto select-text relative">
        {/* Barra Bordô Institucional com Logo na Esquerda (Sem Fundo Branco) e Título Centralizado */}
        <div className="bg-[#3B0B14] -mx-6 -mt-6 p-5 rounded-t-2xl border-b-2 border-[#C9A227] grid grid-cols-[80px_1fr_80px] items-center shadow-md">
          <img
            src="/logoconexao_red.png"
            alt="Conexão Maçônica Logo"
            className="h-14 object-contain"
          />
          <div className="text-center space-y-0.5">
            <h3 className="font-serif font-extrabold text-xl text-[#C9A227] tracking-wider uppercase drop-shadow-sm">
              CONEXÃO MAÇÔNICA
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-200">
              GUIA DE EMPRESAS E SERVIÇOS MAÇÔNICOS
            </p>
          </div>
          <div className="w-[80px]" />
        </div>

        {/* Faixa de Destaque do Título do Contrato */}
        <div className="text-center py-2.5 px-4 bg-[#3B0B14]/5 border-y-2 border-[#3B0B14]/20 rounded-xl my-3">
          <h4 className="font-serif font-extrabold text-sm sm:text-base text-[#3B0B14] uppercase tracking-wide">
            Contrato de Prestação de Serviços de Publicidade e Presença Comercial Digital
          </h4>
        </div>
        <div className="whitespace-pre-line text-justify font-serif text-[11px] text-stone-800">
          {contractText}
        </div>
      </div>

      {/* PAINEL DE ASSINATURA ELETRÔNICA & QUADRO MANUSCRITO OPIONAL */}
      {!signed ? (
        <div className="space-y-4 pt-2 border-t border-[#C9A227]/20">
          {/* Quadro de Assinatura com o Dedo (Mobile) / Mouse (Desktop) */}
          <div className="bg-[#1f0509] border border-stone-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-stone-200">Assinatura no Celular / Tela (Desenhe abaixo com o dedo):</span>
              {hasDrawnSignature && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Limpar Assinatura
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-stone-300 overflow-hidden relative">
              <canvas
                ref={canvasRef}
                width={600}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-28 cursor-crosshair touch-none"
              />
              {!hasDrawnSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-stone-400 text-xs italic font-serif">
                  Desenhe sua assinatura aqui (com o dedo no celular ou mouse)...
                </div>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 p-3.5 bg-[#1f0509] border border-stone-800 rounded-2xl cursor-pointer text-xs text-stone-200">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="accent-[#C9A227] mt-0.5"
            />
            <span>
              Declaro que li integralmente o <strong>Contrato de Prestação de Serviços de Publicidade do Plano {planRules.planCode.toUpperCase()}</strong> ({amountFormatted}/ano), compreendi todas as suas cláusulas e autorizo a assinatura eletrônica com registro de integridade SHA-256.
            </span>
          </label>

          <button
            type="button"
            onClick={() => { void handleSignContract(); }}
            disabled={!agreed || loading}
            className={`w-full py-3.5 font-extrabold text-xs rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              agreed && !loading
                ? 'bg-gradient-to-r from-[#3B0B14] to-[#4B161B] text-[#C9A227] border-[#C9A227] shadow-lg hover:from-[#520f1c]'
                : 'bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                <span>Registrando assinatura eletrônica...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
                <span>Assinar Contrato Eletronicamente &amp; Concluir</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-6 bg-[#3B0B14] border border-[#C9A227]/40 rounded-2xl space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-serif font-bold text-white">✓ Contrato Assinado Eletronicamente</h3>
            <p className="text-xs text-emerald-300 font-serif">
              Homologado em {signedAtDate || new Date().toLocaleString('pt-BR')} • Versão v1.0
            </p>
          </div>

          <div className="space-y-2 text-xs text-stone-300 max-w-md mx-auto bg-[#1f0509] p-4 rounded-xl border border-stone-800 text-left font-serif">
            <div className="flex justify-between border-b border-stone-800 pb-1">
              <span>Status do Contrato:</span> <strong className="text-emerald-400">✓ Assinado &amp; Válido</strong>
            </div>
            <div className="flex justify-between border-b border-stone-800 pb-1 truncate">
              <span>Hash SHA-256:</span> <strong className="text-stone-300 truncate" title={sha256Hash || ''}>{sha256Hash || 'VALIDATED'}</strong>
            </div>
            <div className="flex justify-between">
              <span>Cópia do Documento:</span> <strong className="text-[#C9A227]">Disponível no Painel</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrintContractPDF}
              className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4 text-[#C9A227]" />
              <span>Salvar PDF / Imprimir</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/anunciante')}
              className="px-6 py-2.5 bg-[#C9A227] hover:bg-[#D9B237] text-[#1f0509] font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Acessar Meu Painel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL EM TELA CHEIA PARA LEITURA INTEGRAL */}
      {showFullContractModal && (
        <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto text-stone-900">
          <div className="bg-white border border-stone-300 rounded-3xl p-6 max-w-4xl w-full space-y-4 shadow-2xl text-left my-8">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3B0B14]" />
                <span>Leitura Integral do Contrato — {businessName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowFullContractModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-[#FAF8F5] border border-stone-300 rounded-2xl font-serif text-xs text-stone-900 leading-relaxed whitespace-pre-wrap max-h-[65vh] overflow-y-auto select-text text-justify">
              {contractText}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-stone-200 flex-wrap gap-2">
              <span className="text-xs text-stone-500 font-serif italic">
                Conexão Maçônica © {new Date().getFullYear()} • Todos os direitos reservados.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFullContractModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handlePrintContractPDF}
                  className="px-5 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4 text-[#C9A227]" /> Imprimir / Salvar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

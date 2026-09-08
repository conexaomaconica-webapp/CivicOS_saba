'use client';

import React, { useState } from 'react';
import {
  Scale,
  FileText,
  ShieldCheck,
  Printer,
  History,
  Code2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Plus,
  Lock,
} from 'lucide-react';

export default function ContractsManagementClient() {
  const [selectedDocType, setSelectedDocType] = useState<'anunciante' | 'termos' | 'privacidade'>('anunciante');
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modelo ativo v1.0
  const [activeVersion, setActiveVersion] = useState('v1.0');
  const [activeContractText, setActiveContractText] = useState(`CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PUBLICIDADE, DIVULGAÇÃO E PRESENÇA COMERCIAL DIGITAL — GUIA CONEXÃO MAÇÔNICA

Versão: v1.0

Pelo presente instrumento eletrônico, de um lado:

CONTRATADA / PLATAFORMA: CONEXÃO MAÇÔNICA COMUNICAÇÃO E TECNOLOGIA LTDA., responsável pela plataforma digital denominada CONEXÃO MAÇÔNICA, doravante denominada simplesmente CONEXÃO MAÇÔNICA ou PLATAFORMA;

e, de outro lado:

CONTRATANTE / ANUNCIANTE: {{empresa_anunciante}}, inscrita no CNPJ/CPF sob nº {{documento_anunciante}}, representada neste ato por {{responsavel_legal}}, e-mail {{email_responsavel}}, doravante denominada simplesmente ANUNCIANTE;

têm entre si ajustado o presente Contrato de Prestação de Serviços de Publicidade, Divulgação e Presença Comercial Digital, mediante as cláusulas e condições seguintes.

CLÁUSULA 1 — DO OBJETO
1.1. O presente contrato tem por objeto a prestação, pela CONEXÃO MAÇÔNICA, de serviços de divulgação, publicidade e presença comercial digital do ANUNCIANTE no Guia Comercial Conexão Maçônica e em funcionalidades relacionadas disponibilizadas pela PLATAFORMA.
1.2. Os serviços poderão compreender, conforme o plano contratado, a disponibilização de perfil empresarial ou profissional, informações de contato, endereço, imagens, descrição de produtos e serviços, benefícios, publicações, eventos, formas de contato, localização geográfica, selos, reconhecimentos, mecanismos de busca, filtros e demais funcionalidades previstas para o respectivo plano.
1.3. A contratação não representa aquisição de propriedade sobre qualquer parte da plataforma, código-fonte, sistema ou tecnologia utilizada pela CONEXÃO MAÇÔNICA.

CLÁUSULA 2 — DO PLANO CONTRATADO
2.1. O ANUNCIANTE contrata o {{plano_nome}}, pelo valor de {{plano_valor}}, para o período de {{vigencia}}.
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

E, por manifestação eletrônica de vontade, o ANUNCIANTE declara que teve acesso ao conteúdo integral deste instrumento e concorda com seus termos.`);

  const [editText, setEditText] = useState(activeContractText);
  const [newVersionTag, setNewVersionTag] = useState('v1.1');

  const variablesList = [
    { name: '{{empresa_anunciante}}', desc: 'Nome Fantasia / Razão Social da Empresa Anunciante' },
    { name: '{{documento_anunciante}}', desc: 'CNPJ ou CPF cadastrado na plataforma' },
    { name: '{{responsavel_legal}}', desc: 'Nome completo do Responsável Legal' },
    { name: '{{email_responsavel}}', desc: 'E-mail autenticado do Responsável Legal' },
    { name: '{{plano_nome}}', desc: 'Nome comercial do plano (ex: Plano Ouro, Plano Prata)' },
    { name: '{{plano_valor}}', desc: 'Valor oficial do plano contratado (ex: R$ 2.388,00/ano)' },
    { name: '{{vigencia}}', desc: 'Período contratual (ex: 12 meses / 1 ano)' },
    { name: '{{sha256_hash}}', desc: 'Hash criptográfico gerado no aceite eletrônico' },
  ];

  const versionHistory = [
    { version: 'v1.0', date: '31/08/2026', status: 'Em Vigor (Ativo)', count: 'Homologado no Onboarding & Admin 360' },
    { version: 'v0.9 (Legado)', date: '15/05/2026', status: 'Arquivado (Substituído)', count: 'Congelado para contratos antigos' },
  ];

  const handlePublishNewVersion = () => {
    setActiveVersion(newVersionTag);
    setActiveContractText(editText);
    setShowEditorModal(false);
    setMessage({ type: 'success', text: `Nova versão contratual ${newVersionTag} publicada com sucesso! Os novos anunciantes passarão a assinar este modelo.` });
  };

  const handlePrintTemplatePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const previewText = activeContractText
      .replace(/{{empresa_anunciante}}/g, 'EMPRESA ANUNCIANTE EXEMPLO LTDA')
      .replace(/{{documento_anunciante}}/g, '12.345.678/0001-99')
      .replace(/{{responsavel_legal}}/g, 'EDUARDO P. SABA')
      .replace(/{{email_responsavel}}/g, 'anunciante@conexaomaconica.com.br')
      .replace(/{{plano_nome}}/g, 'Plano Ouro Anual')
      .replace(/{{plano_valor}}/g, 'R$ 2.388,00/ano')
      .replace(/{{vigencia}}/g, '12 (doze) meses')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <title>Modelo de Contrato - Conexão Maçônica - ${activeVersion}</title>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family: 'Georgia', serif; font-size: 10.5pt; line-height: 1.6; color: #111; margin: 0; padding: 20px; background: #fff; }
      .letterhead { border: 2px solid #3B0B14; padding: 24px; border-radius: 12px; background: #FAF8F5; }
      .contract-body { white-space: pre-wrap; font-family: 'Georgia', serif; font-size: 10pt; color: #222; text-align: justify; }
      @media print { body { padding: 0; background: #fff; } }
    </style>
  </head>
  <body>
    <div class="letterhead">
      <div style="background: #3B0B14; padding: 18px 24px; border-radius: 10px 10px 0 0; border-bottom: 3px solid #C9A227; display: grid; grid-template-columns: 80px 1fr 80px; align-items: center;">
        <img src="/logoconexao_red.png" alt="Conexão Maçônica Logo" style="height: 52px; object-fit: contain;" />
        <div style="text-align: center;">
          <h1 style="color: #C9A227; font-size: 20pt; margin: 0; font-family: 'Georgia', serif; letter-spacing: 2px;">CONEXÃO MAÇÔNICA</h1>
          <h2 style="color: #fff; font-size: 9pt; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 2px; font-weight: normal;">GUIA DE EMPRESAS E SERVIÇOS MAÇÔNICOS</h2>
        </div>
        <div style="width: 80px;"></div>
      </div>
      <div style="background: #f4efe8; border-top: 1px solid #3B0B14; border-bottom: 2px solid #3B0B14; padding: 12px; margin-top: 10px; font-family: 'Georgia', serif; font-weight: bold; font-size: 11pt; color: #3B0B14; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
        MODELO OFICIAL DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PUBLICIDADE (${activeVersion})
      </div>
      <div class="contract-body" style="margin-top: 20px;">${previewText}</div>
    </div>
    <script>window.onload = function() { window.print(); };</script>
  </body>
</html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase rounded-md tracking-wider">
              Módulo Jurídico &amp; Governança
            </span>
            <span className="text-xs text-stone-400 font-serif">Versão em vigor: {activeVersion}</span>
          </div>
          <h1 className="font-serif font-bold text-2xl text-stone-900 mt-1 flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#3B0B14]" />
            <span>Gestão de Modelos de Contratos &amp; Termos</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 font-serif">
            Administração centralizada dos instrumentos contratuais, termos de uso e políticas de privacidade da Conexão Maçônica.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-all flex items-center gap-1.5 cursor-pointer font-serif"
          >
            <Eye className="w-4 h-4 text-stone-600" /> Pré-visualizar Modelo
          </button>

          <button
            type="button"
            onClick={() => setShowEditorModal(true)}
            className="px-4 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md font-serif"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" /> Criar Nova Versão ({newVersionTag})
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-serif flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* TABS DE TIPO DE DOCUMENTO */}
      <div className="flex gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setSelectedDocType('anunciante')}
          className={`px-4 py-2 text-xs font-bold font-serif rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedDocType === 'anunciante'
              ? 'bg-[#3B0B14] text-[#C9A227] shadow-sm'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Contrato de Anunciante (Publicidade Digital)
        </button>

        <button
          type="button"
          onClick={() => setSelectedDocType('termos')}
          className={`px-4 py-2 text-xs font-bold font-serif rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedDocType === 'termos'
              ? 'bg-[#3B0B14] text-[#C9A227] shadow-sm'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Termos de Uso da Plataforma
        </button>

        <button
          type="button"
          onClick={() => setSelectedDocType('privacidade')}
          className={`px-4 py-2 text-xs font-bold font-serif rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedDocType === 'privacidade'
              ? 'bg-[#3B0B14] text-[#C9A227] shadow-sm'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Lock className="w-4 h-4" /> Política de Privacidade &amp; LGPD
        </button>
      </div>

      {/* GRID DE DETALHES E VARIÁVEIS DO MODELO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA 1 & 2: MODELO ATIVO EM PAPEL TIMBRADO */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#3B0B14]" />
                  <span>Modelo de Contrato Vigente ({activeVersion})</span>
                </h3>
                <p className="text-xs text-stone-500 font-serif mt-0.5">
                  Este modelo é utilizado para novos aceites no Onboarding (Passo 7) e no Admin 360º.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrintTemplatePDF}
                className="px-3 py-1.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs font-serif"
              >
                <Printer className="w-4 h-4 text-[#C9A227]" /> Imprimir Modelo A4
              </button>
            </div>

            {/* Documento em Papel Timbrado Oficial */}
            <div className="p-8 bg-[#FAF8F5] border-2 border-[#3B0B14] rounded-3xl shadow-md space-y-4 relative overflow-hidden font-serif">
              {/* Barra Bordô com Logo na Esquerda e Título Centralizado */}
              <div className="bg-[#3B0B14] -mx-8 -mt-8 p-5 rounded-t-3xl border-b-2 border-[#C9A227] grid grid-cols-[80px_1fr_80px] items-center shadow-md">
                <img
                  src="/logoconexao_red.png"
                  alt="Conexão Maçônica Logo"
                  className="h-14 object-contain"
                />
                <div className="text-center space-y-0.5">
                  <h4 className="font-serif font-extrabold text-xl text-[#C9A227] tracking-wider uppercase">
                    CONEXÃO MAÇÔNICA
                  </h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-200">
                    GUIA DE EMPRESAS E SERVIÇOS MAÇÔNICOS
                  </p>
                </div>
                <div className="w-[80px]" />
              </div>

              {/* Faixa de Destaque do Título */}
              <div className="text-center py-2.5 px-4 bg-[#3B0B14]/5 border-y-2 border-[#3B0B14]/20 rounded-xl my-3">
                <h5 className="font-serif font-extrabold text-sm text-[#3B0B14] uppercase tracking-wide">
                  Contrato de Prestação de Serviços de Publicidade e Presença Comercial Digital
                </h5>
              </div>

              {/* Corpo do Texto */}
              <div className="font-serif text-xs text-stone-900 leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto select-text pr-2 text-justify">
                {activeContractText}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA 3: VARIÁVEIS AUTOMÁTICAS E HISTÓRICO DE VERSÕES */}
        <div className="space-y-6">
          {/* Variáveis Dinâmicas */}
          <div className="bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-4 font-serif">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
              <Code2 className="w-4 h-4 text-[#3B0B14]" />
              <span>Variáveis Automáticas da Plataforma</span>
            </h3>
            <p className="text-[11px] text-stone-500">
              O sistema substitui automaticamente estas tags pelos dados da empresa no momento da assinatura.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {variablesList.map((v) => (
                <div key={v.name} className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-0.5">
                  <strong className="text-[#3B0B14] font-mono text-[11px] block">{v.name}</strong>
                  <span className="text-stone-600 text-[11px] block">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico de Versões */}
          <div className="bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-4 font-serif">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
              <History className="w-4 h-4 text-[#3B0B14]" />
              <span>Regra de Imutabilidade &amp; Histórico</span>
            </h3>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              <strong>Regra Fundamental:</strong> Versões já publicadas e assinadas nunca são alteradas. Novas edições criam uma nova versão (ex: v1.1).
            </p>

            <div className="space-y-2">
              {versionHistory.map((item) => (
                <div key={item.version} className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <strong className="text-stone-900">{item.version}</strong>
                    <span className="text-[10px] text-stone-500">{item.date}</span>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-bold block">{item.status}</span>
                  <span className="text-[10px] text-stone-500 block">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDITAR / PUBLICAR NOVA VERSÃO */}
      {showEditorModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto text-stone-900 font-serif">
          <div className="bg-white border border-stone-300 rounded-3xl p-6 max-w-4xl w-full space-y-4 shadow-2xl text-left my-8">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#3B0B14]" />
                  <span>Publicar Nova Versão do Contrato</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Edite as cláusulas abaixo para criar e publicar a versão <strong>{newVersionTag}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-stone-700">Identificador da Nova Versão:</label>
                <input
                  type="text"
                  value={newVersionTag}
                  onChange={(e) => setNewVersionTag(e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900"
                />
              </div>

              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={16}
                className="w-full p-4 bg-stone-50 border border-stone-300 rounded-2xl font-serif text-xs leading-relaxed text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
              />
            </div>

            <div className="flex justify-end items-center gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePublishNewVersion}
                className="px-5 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4 text-[#C9A227]" /> Publicar Versão {newVersionTag}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto text-stone-900 font-serif">
          <div className="bg-white border border-stone-300 rounded-3xl p-6 max-w-4xl w-full space-y-4 shadow-2xl text-left my-8">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#3B0B14]" />
                <span>Pré-visualização do Modelo em Papel Timbrado</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-[#FAF8F5] border border-stone-300 rounded-2xl font-serif text-xs text-stone-900 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto select-text text-justify">
              {activeContractText}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-stone-200">
              <span className="text-xs text-stone-500 italic">Conexão Maçônica © {new Date().getFullYear()}</span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import crypto from 'crypto';

export const CANONICAL_ADVERTISER_CONTRACT_CODE = 'contrato_adesao_anunciante_v1';
export const CANONICAL_ADVERTISER_CONTRACT_VERSION = 'v1.0';

/**
 * Template canônico oficial de adesão do anunciante em Markdown.
 * Alinhado integralmente com a Migration 129 e o modelo contratual do Conexão Maçônica.
 */
export const CANONICAL_ADVERTISER_CONTRACT_MARKDOWN = `# CONTRATO DE ADESÃO À PLATAFORMA CONEXÃO MAÇÔNICA

Pelo presente instrumento eletrônico, de um lado:

**CONTRATADA / PLATAFORMA:** CONEXÃO MAÇÔNICA COMUNICAÇÃO E TECNOLOGIA LTDA., responsável pela plataforma digital denominada CONEXÃO MAÇÔNICA, doravante denominada simplesmente **CONEXÃO MAÇÔNICA** ou **PLATAFORMA**;

e, de outro lado:

**CONTRATANTE / ANUNCIANTE:**
- **Razão Social:** {{razao_social}}
- **Nome Fantasia:** {{nome_fantasia}}
- **CNPJ:** {{cnpj}}
- **Endereço:** {{endereco}}

Representada neste ato por:
- **Nome:** {{responsavel_nome}}
- **CPF:** {{responsavel_cpf}}
- **E-mail:** {{responsavel_email}}

têm entre si justo e acordado o presente Contrato de Prestação de Serviços de Publicidade, Divulgação e Presença Comercial Digital, mediante as cláusulas e condições seguintes:

## CLÁUSULA 1 — DO OBJETO
1.1. O presente contrato tem por objeto a prestação, pela CONEXÃO MAÇÔNICA, de serviços de divulgação, publicidade e presença comercial digital da CONTRATANTE no Guia Oficial Conexão Maçônica e funcionalidades do ecossistema fraterno.  
1.2. Os serviços compreendem a disponibilização de perfil empresarial, informações de contato, logotipo, galeria de imagens, catálogo de produtos/serviços, benefícios, eventos e ferramentas de localização e busca, conforme os limites e prerrogativas do plano contratado.  
1.3. A presente contratação não outorga qualquer direito de propriedade sobre a plataforma, software ou ativos intelectuais da CONEXÃO MAÇÔNICA.

## CLÁUSULA 2 — DO PLANO E CONDIÇÕES COMERCIAIS
2.1. A CONTRATANTE adere expressamente às seguintes condições comerciais conferidas e acordadas:
- **Plano Contratado:** {{plano_nome}}
- **Vigência:** {{vigencia}}
- **Valor Total:** {{valor_total}}
- **Forma de Pagamento:** {{forma_pagamento}}
- **Quantidade de Parcelas:** {{parcelas}}
- **Valor por Parcela:** {{valor_parcela}}
{{selo_pedra_fundamental}}

2.2. O histórico e detalhamento das cotas contratuais encontram-se registrados no sistema e vinculados a este instrumento.

## CLÁUSULA 3 — DA PUBLICAÇÃO DO ANÚNCIO
3.1. A veiculação e publicação do perfil dar-se-á após a validação cadastral, conferência de vínculo aplicável e confirmação da quitação financeira ou aprovação do meio de pagamento.  
3.2. A CONTRATANTE declara a veracidade e autenticidade dos dados e informações fornecidos, sob as penas da lei.  
3.3. A PLATAFORMA poderá solicitar correções cadastrais a fim de preservar a integridade e qualidade do Guia.

## CLÁUSULA 4 — DO CONTEÚDO DO ANUNCIANTE
4.1. A CONTRATANTE é a única e exclusiva responsável pelas informações, marcas, logotipos, imagens, serviços e ofertas inseridos em seu perfil.  
4.2. A CONTRATANTE autoriza a exibição de suas marcas e fotos exclusivamente para fins de execução deste contrato e divulgação no Guia.  
4.3. É terminantemente vedada a publicação de conteúdo que viole a legislação brasileira, direitos de terceiros ou preceitos éticos da comunidade.

## CLÁUSULA 5 — DA MODERAÇÃO E SUSPENSÃO
5.1. A CONEXÃO MAÇÔNICA reserva-se o direito de moderar, solicitar ajustes ou suspender provisoriamente perfis com pendências éticas, documentais ou indícios de irregularidade.

## CLÁUSULA 6 — DA ELEGIBILIDADE E VÍNCULO FRATERNO
6.1. A admissão no Guia Comercial observa as diretrizes de elegibilidade da comunidade fraterna, não constituindo garantia da idoneidade civil de transações comerciais entre membros e terceiros.  
6.2. Selos institucionais e de honra obedecem estritamente a critérios históricos e regulamentares da plataforma, sendo vedada sua comercialização ou vinculação como cota financeira.

## CLÁUSULA 7 — DA DISPONIBILIDADE E RESPONSABILIDADES
7.1. A PLATAFORMA adota as melhores práticas de disponibilidade e segurança, não respondendo por descontinuidades decorrentes de falhas externas de infraestrutura ou caso fortuito.  
7.2. A CONEXÃO MAÇÔNICA atua como catalisadora de divulgação, não integrando a cadeia de fornecimento dos produtos e serviços ofertados pela CONTRATANTE.

## CLÁUSULA 8 — DO PAGAMENTO E INADIMPLEMENTO
8.1. O pagamento deverá ser efetuado na forma e prazos pactuados. A inadimplência ensejará a suspensão da visibilidade do anúncio até a regularização.

## CLÁUSULA 9 — DA VIGÊNCIA, RENOVAÇÃO E RESCISÃO
9.1. O contrato vigorará pelo período indicado na Cláusula 2, podendo ser renovado mediante acordo entre as partes.  
9.2. A rescisão imotivada observará as condições financeiras ajustadas para o período contratual em curso.

## CLÁUSULA 10 — DA PROTEÇÃO DE DADOS (LGPD)
10.1. As partes comprometem-se a cumprir integralmente a Lei nº 13.709/2018 (LGPD), assegurando o tratamento seguro e transparente de dados pessoais.

## CLÁUSULA 11 — DA VALIDADE DA ASSINATURA ELETRÔNICA E INTEGRIDADE
11.1. As partes reconhecem como plenamente válida a celebração por meio eletrônico, com fulcro no Art. 10, § 2º da MP nº 2.200-2/2001, atestada mediante registro de IP, carimbo de tempo (timestamp) e resumo criptográfico SHA-256.

## CLÁUSULA 12 — DO FORO
12.1. Fica eleito o Foro da Comarca de São Paulo/SP para dirimir eventuais controvérsias decorrentes deste contrato, renunciando a qualquer outro por mais privilegiado que seja.

**Data de emissão:** {{data_emissao}}`;

/**
 * Minimiza e gera hash criptográfico do endereço IP para fins probatórios em conformidade com a LGPD.
 * Evita armazenar IP bruto (dado pessoal) em texto puro na base de dados.
 */
export function anonymizeIpForAudit(ip: string): string {
  const clean = ip?.trim() || '127.0.0.1';
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') {
    return '127.0.0.1';
  }
  return crypto.createHash('sha256').update(clean, 'utf8').digest('hex');
}

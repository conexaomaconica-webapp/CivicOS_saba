# Especificação Funcional v1.1 — Conexão Maçônica

**Versão:** 1.1.0  
**Status:** Em revisão final — candidata a Source of Truth  
**Data:** 2026-07-25  
**Produto:** Conexão Maçônica  
**Plataforma:** CivicOS (`foundation-v1.0`)  
**Branch:** `product/conexao-maconica-v1`

---

## Controle de Versão e Governança Documental

### Histórico de Revisões

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0.0 | 2026-07-25 | Engenharia de Produto | Versão inicial consolidada |
| 1.1.0 | 2026-07-25 | Engenharia de Produto | Revisão final do arquiteto-chefe (divisão do MVP em 1A/1B, separação absoluta de CRMs, política de selos, white label, LGPD estrita, novos papéis conceituais, mapas e importação detalhados) |

### Governança

- A **Especificação Funcional** é a fonte oficial dos requisitos (Source of Truth).
- A **Arquitetura Técnica** é derivada desta especificação.
- O **Schema SQL** é derivado da arquitetura e da especificação.
- A **Matriz RBAC** é derivada dos perfis, módulos e fluxos.
- Qualquer alteração funcional deverá primeiro atualizar esta especificação antes de refletir em código.

---

## 1. Visão do Produto

A **Conexão Maçônica** é o primeiro produto construído sobre a plataforma CivicOS. Trata-se de uma **plataforma de descoberta, geração de negócios e relacionamento comercial**, com possibilidade de replicação para outras comunidades. 

O sistema vai muito além de um simples guia de empresas: ele conecta a comunidade maçônica — irmãos, organizações institucionais e empresários maçons — através de inteligência de busca, gestão de oportunidades (leads) e benefícios exclusivos, operando em um modelo white label.

### 1.1 Propósito

Criar a maior rede de negócios e serviços entre maçons do Brasil, oferecendo:

- **Para o irmão maçom:** Uma plataforma para descoberta de empresas de proprietários maçons, com descontos exclusivos (cupons) e a segurança de negociar com irmãos verificados.
- **Para o empresário maçom (anunciante):** Visibilidade qualificada, geração de leads e orçamentos dentro de uma comunidade de alto poder aquisitivo e valores compartilhados.
- **Para as organizações maçônicas (Lojas, Potências):** Uma ferramenta institucional moderna de comunicação.
- **Para a equipe comercial da plataforma:** Um CRM interno para prospecção, vendas de planos e gestão de assinaturas.
- **Para o administrador da plataforma:** Um sistema multi-tenant white label escalável.

### 1.2 Slogan

> _"Apoie um irmão. Fortaleça a corrente."_

### 1.3 Diferencial Competitivo

| Diferencial | Descrição |
|---|---|
| **Confiança verificada** | Selos independentes atestam a regularidade maçônica do anunciante |
| **Plataforma de Descoberta** | Ferramentas como IA, geolocalização e recomendações para conectar demandas a fornecedores |
| **Multi-tenant White Label** | Cada cidade/região opera como tenant independente com identidade visual customizada |
| **Monetização simplificada** | Modelo de assinatura com planos anuais de renovação simplificada |

---

## 2. Objetivos Estratégicos

### 2.1 MVP (Ondas 1A e 1B)

O MVP foi dividido em duas ondas para reduzir o risco de entrega, colocando o sistema no ar rapidamente e adicionando camadas comerciais na sequência.

**MVP 1A — Fundação Operacional (Curto Prazo)**
Colocar o sistema em funcionamento, permitindo cadastrar empresas, cobrar assinaturas anuais e publicar os primeiros anunciantes.

**MVP 1B — Ativação Comercial (Curto-Médio Prazo)**
Adicionar ferramentas de conversão, inteligência e geração de negócios (cupons, CRM, IA, automações) sobre a base do 1A.

### 2.2 Longo Prazo

1. Expansão para novas capitais e regiões.
2. Integrações via SDK com sistemas de Potências Maçônicas.
3. Replicação do modelo para outras associações (cooperativas, conselhos).

---

## 3. Escopo

O escopo detalhado de cada funcionalidade está listado na seção **18. MVP — Definição**.

### 3.1 Fora do Escopo da v1 (Pós-MVP)

- Comunicação interna de loja (atas, votações secretas, tesouraria).
- Chat instantâneo nativo (integração via WhatsApp suprirá a necessidade no MVP).
- Marketplace de terceiros com gateway de pagamento intermediado (split de pagamentos).
- Aplicativo mobile nativo. O sistema funcionará nos modos **Web e App (Android e iOS)**. Contudo, o sistema será inicialmente desenvolvido via **PWA responsivo** no MVP. Contratos de API e serviços deverão ser estruturados prevendo o consumo futuro pelos aplicativos móveis nativos (Android e iOS), sem exigir que uma API pública completa seja entregue no MVP.

---

## 4. Personas

### 4.1 Irmão Carlos — O Consumidor
- **Necessidade:** Encontrar serviços de qualidade entre irmãos de confiança.
- **Objetivo:** Descobrir negócios locais, solicitar orçamentos e resgatar benefícios.

### 4.2 Irmão Roberto — O Empresário Anunciante
- **Necessidade:** Visibilidade qualificada e ferramentas para converter leads.
- **Objetivo:** Receber solicitações de orçamento, assinar planos anuais de destaque.

### 4.3 Equipe Conexão Maçônica — Operação e Comercial
- **Necessidade:** Prospecção, controle de vendas, aprovação de cadastros.
- **Objetivo:** Escalar a base de assinantes monitorando churn e inadimplência.

### 4.4 Eduardo — O Superadministrador (Master)
- **Necessidade:** Painel centralizado (Control Tower).
- **Objetivo:** Gerenciar tenants, provisionar novos ambientes white label.

---

## 5. Perfis de Usuário e Papéis

O domínio prevê 9 perfis que devem ser tratados como **papéis conceituais iniciais**, não como uma lista permanentemente codificada ou permissões rígidas. A arquitetura e a Matriz RBAC deverão deixar espaço para papéis personalizados, múltiplos papéis por usuário, permissões por capacidade, e escopos por tenant ou por recurso. 

Para o **MVP 1A**, apenas quatro estarão ativos inicialmente.

### 5.1 Perfis do Sistema

| # | Perfil | Descrição | Ativação |
|---|---|---|---|
| 1 | **Superadministrador** (`master`) | Acesso total cross-tenant via Control Tower | **MVP 1A** |
| 2 | **Administrador da Operação** | Gestão completa de um tenant específico | **MVP 1A** |
| 3 | **Moderador** | Aprova/rejeita selos, avaliações e cadastros | Pós-1A |
| 4 | **Financeiro** | Focado em faturamento, estornos e notas fiscais | Pós-1A |
| 5 | **Comercial** | Vendedores da plataforma prospectando anunciantes | Pós-1A |
| 6 | **Suporte** | Atendimento a chamados e dúvidas de uso | Pós-1A |
| 7 | **Editor** | Gestão de banners, pop-ups, artigos e eventos | Pós-1A |
| 8 | **Anunciante** | O empresário que gerencia sua página e leads | **MVP 1A** |
| 9 | **Usuário Comum** | O maçom consumidor e buscador de serviços | **MVP 1A** |

*(Nota: O papel genérico `socio_admin` foi descontinuado em favor da segregação acima.)*

---

## 6. Modelo Conceitual do Domínio

As principais entidades que regem a plataforma. A separação explícita entre elas é fundamental para a correta modelagem técnica.

- **Tenant:** Unidade isolada de dados, geralmente representando uma região (ex: Curitiba).
- **Identidade Visual (White Label):** Configurações de marca atreladas a um tenant.
- **Usuário:** Conta global autenticada.
- **Papel:** Nível de autorização do usuário dentro de um tenant específico.
- **Organização Maçônica (Institucional):** Lojas Simbólicas ou Potências. Possui identidade institucional, localização, membros/responsáveis e potência vinculada. É distinta das empresas anunciantes.
- **Empresa / Anunciante (Comercial):** O negócio cadastrado no guia que paga plano e recebe leads (pode ser um negócio geral, serviço profissional ou, também, uma loja de produtos maçônicos).
- **Categoria:** Classificação mercadológica da empresa.
- **Localização:** Coordenadas e endereço para busca geográfica.
- **Plano / Assinatura:** Contrato comercial anual do anunciante.
- **Contrato:** Termo de adesão assinado pelo anunciante.
- **Condição de Fundador:** Um status histórico e comercial independente da vigência da assinatura.
- **Verificação (Selo):** Estado independente que comprova a regularidade maçônica.
- **Benefício:** Cupons e campanhas (status de benefício independente do plano atual).
- **Conteúdo:** Artigos, Eventos, Banners, Pop-ups.
- **Lead / Orçamento:** Intenção de negócio enviada por um usuário a um anunciante.
- **Oportunidade Comercial:** Negociação da equipe da plataforma com um potencial anunciante.
- **Notificação:** Mensagens via e-mail, in-app ou push.
- **Auditoria & Analytics:** Registro estruturado de ações e eventos.

---

## 7. Requisitos Funcionais

### RF-001: Autenticação e Onboarding
- Cadastro via e-mail e senha.
- Onboarding guiado para coleta de dados complementares de perfil.

### RF-002: Identidade White Label (Tenant Configuration)
- O Administrador pode configurar por tenant:
  - Nome do produto, logotipo, favicon, cores.
  - Textos institucionais e tela de splash.
  - Informações de contato e redes sociais.
  - Domínio ou subdomínio personalizado.
  - Links para termos e política de privacidade.
  - Configurações básicas de SEO.

### RF-003: Diferenciação de Entidades e Tipos de Negócio
Deve haver clara e inegociável separação conceitual entre **Organização maçônica institucional** e **Empresa/anunciante comercial**. Elas não são resolvidas apenas por um tipo enumerado; são entidades distintas, onde a Loja Institucional foca na gestão organizacional e a Empresa foca em leads e planos.

No escopo da **Empresa/anunciante comercial**, o sistema utilizará um **tipo enumerado** (atributo de classificação) chamado `company_type` para classificar o negócio, incluindo no mínimo:
- Negócio geral
- Loja de artigos maçônicos
- Serviço profissional
- Organização sem fins lucrativos
- Fornecedor de eventos
- Serviço educacional

### RF-004: Cadastro de Empresa, Categorias e Importação
- Formulário de cadastro de empresa com nome, tipo, categoria, endereço, descrição.
- Submissão sujeita a aprovação (se configurado no tenant).
- **Importação por planilha (MVP 1A):**
  - Deverá existir um modelo (template) oficial de planilha.
  - Validação rigorosa dos dados e pré-visualização antes da efetivação da importação.
  - Geração de relatório de erros em caso de falhas nas linhas.
  - Deduplicação para evitar cadastros repetidos.
  - Associação obrigatória e estrita ao tenant que está importando.
  - Criação ou validação prévia de categorias necessárias.
  - Registro (auditoria) de quem importou.
  - Geocodificação (pode ser feita assincronamente ou posterior à importação).
  - Possibilidade de reprocessamento seguro.

### RF-005: Planos de Assinatura e Política de Upgrade/Downgrade
- Planos definidos: Bronze, Prata, Ouro, Fundador.
- **Política Comercial (Sem pro-rata automático):**
  - Contratos obrigatoriamente **anuais**.
  - **Upgrade:** Aplicação **imediata**, iniciando uma **nova vigência anual** a partir do momento do upgrade. **Sem cálculo automático de pro-rata.** Eventual crédito compensatório ocorrerá somente por decisão administrativa/manual excepcional.
  - **Downgrade:** O downgrade deve ser solicitado durante a vigência atual, mas só será **efetivado na próxima renovação**. Não haverá remoção antecipada automática dos benefícios já contratados para o ciclo pago.
  - Integração inicial: PIX (API Bancária).

### RF-006: Contratos e Aceites
- O sistema deve registrar formalmente o aceite do anunciante para: Termo de Adesão, Política Comercial, Política de Cancelamento, Termos de Uso e Política de Privacidade.
- Metadados obrigatórios do registro: versão do documento, data/hora, usuário logado, tenant associado, e evidência técnica (identificador de sessão compatível com a política de privacidade).

### RF-007: Selos e Estados Independentes
Os conceitos de condição de Fundador, assinatura, plano, vigência, status de benefício e verificação maçônica são **inteiramente independentes**.

Os estados abaixo deverão ser representados de forma independente no modelo de domínio e na persistência, sem agregação em um único estado composto:
- `verification_status` (verificação de regularidade)
- `commercial_plan` (plano atual assinado)
- `is_founder` (condição histórica/comercial)
- `founder_benefit_status` (vigência do benefício)
- `featured_status` (destaque)
- `sponsorship_status` (patrocínio)

*Nota: A forma exata de implementação (colunas, tabelas, enums, etc.) será decidida na Arquitetura Técnica e Schema SQL.*

### RF-008: Busca Estruturada e IA
- **MVP 1A:** Busca textual por categoria, nome, e filtros de localização (cidade, estado).
- **MVP 1B:** Busca assistida por Inteligência Artificial (linguagem natural), restrita aos dados aprovados das empresas.

### RF-009: Geolocalização e Estratégia de Mapas
A estratégia de mapas difere funcionalmente entre as ondas do MVP.
- **MVP 1A (Mapa Simples):**
  - Aparece exclusivamente na página pública da empresa.
  - Exibe somente a localização exata daquela empresa específica.
  - Utiliza coordenadas geradas pela geocodificação do endereço.
  - Pode permitir abrir a rota em um serviço externo (Google Maps / Waze).
  - **Não** inclui exploração geral de empresas, agrupamento de marcadores (clustering) ou busca/refresh ao movimentar o mapa.
  - Permite ordenação de resultados em lista por distância quando o usuário autorizar sua localização via navegador.
- **MVP 1B (Mapa Interativo Geral):**
  - Mapa interativo de exploração com navegação visual.
  - Agrupamento de marcadores (clusters).
  - Busca refinada automaticamente ao movimentar/navegar pelo mapa e aplicação de filtros avançados visuais.

### RF-010: Página Pública da Empresa
- Exibição de dados consolidados, selos independentes ativos, horário de funcionamento, e mapa simples (1A).

### RF-011: Módulo 1 — CRM Comercial da Plataforma (Interno)
Fronteira absoluta e intransponível: este módulo é de uso exclusivo da equipe da plataforma. Um usuário anunciante jamais deverá visualizar dados deste módulo.
- **Tenant Operacional:** Equipe da Conexão Maçônica.
- **Objeto Principal:** Prospect / Anunciante potencial.
- **Objetivo:** Vender e renovar planos.
- **Funcionalidades:** Prospecção, controle de contatos, emissão de propostas, controle de negociação, gestão de contratos, controle de pagamentos, acompanhamento de renovações, registro de inadimplência e histórico comercial de perdas/ganhos.

### RF-012: Módulo 2 — Gestão de Leads do Anunciante
Fronteira absoluta: este módulo pertence estritamente ao anunciante.
- **Tenant e Empresa:** Anunciante / Empresa assinante.
- **Objeto Principal:** Consumidor interessado (usuário maçom).
- **Objetivo:** Gerar atendimento, solicitar orçamentos e converter leads.
- **Funcionalidades:** Caixa de entrada de contatos e orçamentos recebidos, registro de origem do lead, classificação do status da oportunidade pelo anunciante, envio de respostas, marcação de conversões e histórico de atendimento do cliente final.

### RF-013: Páginas de Venda
- Página comercial demonstrando os planos, diferenciais, depoimentos e call-to-action de venda, desenhada para convencer potenciais anunciantes (MVP 1A).

### RF-014: Comunicação e Benefícios
- Cupons de desconto e controle de resgates.
- Eventos e artigos (calendário de atividades do tenant e blog).
- Banners publicitários em áreas nobres.
- Pop-ups promocionais configuráveis pelo Editor (ex: campanhas temporárias).

### RF-015: Automações e Notificações (Multicanal)
- Eventos de negócio geram notificações via E-mail e In-App (1A) e Push Notifications (1B).
- Fluxos de automação de comunicação (ex: lembrete de abandono, aviso de cupom vencendo, fluxo de boas-vindas).

### RF-016: Painéis (Dashboards) e Control Tower
- **Painel do Anunciante:** Métricas de visualização, leads e cliques (respeitando rigorosamente a política de LGPD).
- **Painel da Administração Local:** Acompanhamento de empresas e faturamento do tenant.
- **Control Tower:** Visão consolidada do superadministrador (saúde global dos tenants, configurações).

---

## 8. Requisitos Não Funcionais (Arquitetura & Stack)

- **Mobile Strategy:** O sistema suportará Web, Android e iOS. No lançamento do MVP, utilizará PWA responsivo. A API e os contratos de backend devem ser estruturados já prevendo o consumo futuro pelos aplicativos móveis nativos.

- **Performance:** Tempo de carregamento da home < 2s (LCP).
- **Segurança:** Isolamento estrito de Tenant via RLS do PostgreSQL. Autenticação via JWT.

---

## 9. Política de Métricas, Privacidade e LGPD

A coleta e exibição de dados analíticos devem obedecer a regras rígidas de proteção, com precisão técnica nos conceitos de anonimização e pseudonimização.

### 9.1 Tratamento de Visitantes e IPs
- **Diferenciação e Identificação:** O sistema deve diferenciar o visitante anônimo do autenticado. O identificador de visitante não-autenticado deve ser **pseudonimizado**. (Nota: técnicas exatas como hash de propriedades do dispositivo com salt são apenas exemplos não vinculantes; a estratégia concreta e segura de pseudonimização será definida na Arquitetura Técnica). 
- **Tratamento de Endereços IP:** É estritamente **proibido** o armazenamento permanente do endereço IP integral sem justificativa legal ou técnica definida. Quando estritamente necessário para segurança, prevenção a fraudes ou rate limiting, o tratamento possuirá finalidade definida, retenção curta limitada e controle de acesso severo. 
- Métricas de produto deverão sempre utilizar identificadores pseudônimos ou dados agregados.

### 9.2 Exclusão e Preservação de Dados
- **Retenção Curta vs Longa:** Eventos individuais (ex: clique isolado) possuem retenção curta. Métricas agregadas (ex: total de views do mês) possuem retenção longa.
- Exclusão de conta pelo usuário apaga dados sensíveis. Contudo, dados históricos analíticos já agregados serão preservados ("usuário removido") para manter a integridade dos painéis de performance e consolidações financeiras.

### 9.3 Níveis de Visualização e Exportação
- O Anunciante vê apenas dados agregados de tráfego. Dados pessoais de leads serão exibidos **apenas se** o usuário consentir explicitamente no envio do formulário de orçamento.
- Anunciantes podem exportar suas métricas (leads e campanhas), garantindo que dados exportados reflitam apenas o que foi autorizado.

---

## 10. MVP — Definição do Escopo Fatiado

O plano de lançamento está subdividido em duas ondas complementares, ambas pertencentes à versão 1 do sistema.

### MVP 1A — Fundação Operacional
_O mínimo necessário para existir, vender assinaturas, cobrar e operar de forma segura._

- [x] Identidade visual básica e white label por tenant
- [x] Autenticação e Onboarding
- [x] Usuários e papéis conceituais essenciais
- [x] Cadastro de empresas e Catálogo de categorias
- [x] Aprovação e verificação com estados independentes
- [x] Planos e cobrança anual (upgrade imediato, nova vigência anual, s/ pro-rata automático)
- [x] Contratos e termos de adesão versionados com aceite
- [x] Página pública da empresa
- [x] Busca estruturada (texto e filtros)
- [x] Geolocalização básica e mapa simples (apenas na página da empresa)
- [x] Painel do Anunciante e Painel Administrativo
- [x] Importação detalhada por planilha e Página comercial dos planos
- [x] Control Tower (Superadministrador)
- [x] Estrutura de LGPD estrita, métricas essenciais e auditoria

### MVP 1B — Ativação Comercial
_A camada de inteligência e valor agregado._

- [ ] Busca assistida por Inteligência Artificial (IA)
- [ ] Mapa interativo dinâmico de exploração geral
- [ ] Gestão de Cupons
- [ ] Eventos e Artigos
- [ ] Banners e Pop-ups configuráveis
- [ ] Push notifications
- [ ] CRM Comercial interno da plataforma
- [ ] Gestão de Leads e Orçamentos do anunciante
- [ ] Automações de comunicação e Campanhas
- [ ] Recursos específicos adicionais para lojas de artigos maçônicos
- [ ] Métricas avançadas de analytics

---

## 12. Política de Vínculo de Empresas e Concorrência Ética (Masonic Business Link & Fair Competition Policy)

Esta política estabelece os critérios funcionais para declaração, verificação, exibição e governança dos vínculos maçônicos das empresas cadastradas na plataforma Conexão Maçônica, assim como as garantias de livre concorrência e ética comercial.

### 12.1 Modalidades de Vínculo
Uma empresa cadastrada pode possuir um ou mais vínculos maçônicos caracterizados pelas seguintes categorias:
1. **Proprietário / Sócio Maçom (`owner_partner`):** Empresa cujo controle societário ou propriedade direta pertence a um membro verificado da ordem.
2. **Empresa da Família Maçônica (`family_member`):** Empresa pertencente a cônjuge, filho(a) ou dependente direto de um irmão verificado.
3. **Empresa Representada por Irmão (`brother_representative`):** Empresa onde um irmão verificado atua como executivo principal, diretor ou representante legal autorizado.
4. **Parceiro Institucional (`institutional_partner`):** Empresa sem sócio maçom direto, mas formalmente conveniada com Lojas ou Potências para concessão de benefícios à comunidade.

### 12.2 Múltiplos Vínculos e Vínculo Principal
- Uma empresa pode ter múltiplos vínculos registrados (ex: dois sócios de Lojas distintas).
- Deve ser obrigatoriamente designado um **Vínculo Principal (`primary_link`)** para fins de exibição nos cards e destaque institucional padrão.
- Cada vínculo é registrado de forma individualizada com seu próprio ciclo de vida, status de verificação e histórico.

### 12.3 Consentimento, Evidências e Autorização Comercial
- **Evidências por Tipo (`link_evidence`):** A declaração exige comprovação proporcional (documento de regularidade/capitulação, contrato social, declaração de representação ou convênio assinado).
- **Autorização Comercial (`business_authorization`):** Exigência de consentimento formal da empresa autorizando a vinculação do seu nome comercial à comunidade.
- **Consentimento de Exposição Pública (`public_consent`):** O irmão declarante e a empresa devem consentir explicitamente com o nível de visibilidade pública do vínculo (público geral vs. exclusivo para membros autenticados).
- **Validade e Revogação:** Todo vínculo possui prazo de validade configurável (renovação anual/periódica) e pode ser revogado por iniciativa da empresa, do declarante ou por moderação institucional.

### 12.4 Concorrência Ética e Livre Mercado
- **Ausência de Exclusividade:** A plataforma não concede exclusividade territorial ou por categoria de mercado a qualquer empresa.
- **Ranking Transparente:**
  - **Ranking Orgânico:** Ordenado estritamente por critérios de relevância, geolocalização, completude do perfil e avaliações legítimas.
  - **Ranking Patrocinado:** Destaques pagos exibidos de forma claramente identificada ("Patrocinado"), sem adulterar os resultados orgânicos.
- **Contestação e Sanções:** Qualquer descumprimento, declaração falsa de vínculo ou fraude sujeita o cadastro à suspensão imediata e denúncia às instâncias de moderação.
- **Proteção Anticoncorrencial:** Avaliações, denúncias ou ações deliberadas de concorrentes visando prejudicar um estabelecimento serão monitoradas, exigirão fundamentação e estarão sujeitas a sanções por abuso de plataforma.

---

## 13. Conclusão

Esta especificação revisada **v1.1 (com Adendo de Política de Vínculo)** é o artefato mandatário que pauta as próximas fases: Modelagem Técnica, Schema SQL, RBAC e planejamento das Sprints, garantindo alinhamento total com as exigências de negócio e operacionais estabelecidas pelo arquiteto-chefe.

